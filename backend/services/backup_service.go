package services

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"app/backend/db"
	"app/backend/models"
)

type BackupService struct {
	db     *db.DB
	dbPath string
}

func NewBackupService(database *db.DB, dbPath string) *BackupService {
	return &BackupService{db: database, dbPath: dbPath}
}

// ExportDatabase checkpoints WAL and copies SQLite database file to destination path.
func (s *BackupService) ExportDatabase(destPath string, userID int64, username string) error {
	if destPath == "" {
		return errors.New("destination path is required")
	}

	// Resolve relative paths to the database directory
	if !filepath.IsAbs(destPath) {
		destPath = filepath.Join(filepath.Dir(s.dbPath), destPath)
	}

	s.db.Lock()
	defer s.db.Unlock()

	// 1. Flush WAL logs into main database file
	if _, err := s.db.Exec("PRAGMA wal_checkpoint(FULL);"); err != nil {
		return fmt.Errorf("failed to checkpoint WAL: %w", err)
	}

	// 2. Copy file
	srcFile, err := os.Open(s.dbPath)
	if err != nil {
		return fmt.Errorf("failed to open source database file: %w", err)
	}
	defer srcFile.Close()

	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	destFile, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("failed to create destination backup file: %w", err)
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, srcFile); err != nil {
		return fmt.Errorf("failed to copy database contents: %w", err)
	}

	s.logAction(userID, username, "DATABASE_EXPORT", fmt.Sprintf("Exported database backup to %s", destPath))
	return nil
}

// RestoreDatabase safely replaces the active database with a backup copy.
// It creates the new connection first, then atomically swaps the pointer
// under the mutex before closing the old connection.
func (s *BackupService) RestoreDatabase(sourceBackupPath string, userID int64, username string) error {
	if sourceBackupPath == "" {
		return errors.New("source backup path is required")
	}

	// 1. Verify backup file is readable before taking any locks
	srcFile, err := os.Open(sourceBackupPath)
	if err != nil {
		return fmt.Errorf("failed to open backup file: %w", err)
	}
	defer srcFile.Close()

	// 2. Create a new SQLite connection to the backup file to verify it's valid
	backupConn, err := sql.Open("sqlite", sourceBackupPath)
	if err != nil {
		return fmt.Errorf("failed to validate backup file: %w", err)
	}
	if err := backupConn.Ping(); err != nil {
		backupConn.Close()
		return fmt.Errorf("backup file is not a valid database: %w", err)
	}
	backupConn.Close()

	s.db.Lock()
	defer s.db.Unlock()

	// 3. Flush WAL logs to ensure all data is in the main db file
	if _, err := s.db.Exec("PRAGMA wal_checkpoint(FULL);"); err != nil {
		return fmt.Errorf("failed to checkpoint WAL: %w", err)
	}

	// 4. Close current connection pool before overwriting the file on disk (Windows safety)
	if err := s.db.DB.Close(); err != nil {
		return fmt.Errorf("failed to close database before restore: %w", err)
	}

	// 5. Overwrite database file on disk
	destFile, err := os.Create(s.dbPath)
	if err != nil {
		return fmt.Errorf("failed to open target db for overwrite: %w", err)
	}

	// Re-open source file (it was already opened above, but io.Copy works)
	srcFile.Seek(0, 0)
	if _, err := io.Copy(destFile, srcFile); err != nil {
		destFile.Close()
		return fmt.Errorf("failed to write restored database: %w", err)
	}
	destFile.Close()

	// 5. Open new connection to the restored database
	newSqlDB, err := sql.Open("sqlite", s.dbPath)
	if err != nil {
		return fmt.Errorf("failed to re-open restored database: %w", err)
	}

	// Re-enable all PRAGMAs that InitDB sets on a fresh connection
	pragmas := []string{
		"PRAGMA journal_mode = WAL;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA temp_store = MEMORY;",
		"PRAGMA cache_size = -64000;",
		"PRAGMA foreign_keys = ON;",
		"PRAGMA busy_timeout = 5000;",
	}
	for _, p := range pragmas {
		if _, err := newSqlDB.Exec(p); err != nil {
			newSqlDB.Close()
			return fmt.Errorf("failed to set PRAGMA on restored db (%s): %w", p, err)
		}
	}

	// Re-apply connection pool limits
	newSqlDB.SetMaxOpenConns(10)
	newSqlDB.SetMaxIdleConns(5)

	// 6. Atomically swap the underlying *sql.DB — all services share the *db.DB pointer
	//    so this swap is immediately visible to every service.
	s.db.DB = newSqlDB

	s.logAction(userID, username, "DATABASE_RESTORE", fmt.Sprintf("Restored database from %s", sourceBackupPath))
	return nil
}


// ListAuditLogs retrieves audit trail entries.
func (s *BackupService) ListAuditLogs(limit int) ([]models.AuditLog, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, user_id, username, action, COALESCE(details, ''), timestamp
		FROM audit_logs
		ORDER BY timestamp DESC
		LIMIT ?`

	rows, err := s.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuditLog
	for rows.Next() {
		var log models.AuditLog
		var uid sql.NullInt64
		if err := rows.Scan(&log.ID, &uid, &log.Username, &log.Action, &log.Details, &log.Timestamp); err != nil {
			return nil, err
		}
		if uid.Valid {
			log.UserID = &uid.Int64
		}
		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return logs, nil
}

func (s *BackupService) logAction(userID int64, username, action, details string) {
	logAudit(s.db, userID, username, action, details)
}
