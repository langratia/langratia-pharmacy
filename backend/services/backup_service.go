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

// RestoreDatabase safely closes the active database pool, overwrites the DB file, and re-initializes the pool.
func (s *BackupService) RestoreDatabase(sourceBackupPath string, userID int64, username string) error {
	if sourceBackupPath == "" {
		return errors.New("source backup path is required")
	}

	srcFile, err := os.Open(sourceBackupPath)
	if err != nil {
		return fmt.Errorf("failed to open backup file: %w", err)
	}
	defer srcFile.Close()

	// 1. Flush WAL logs
	if _, err := s.db.Exec("PRAGMA wal_checkpoint(FULL);"); err != nil {
		// Ignore error if checkpoint fails, attempt close anyway
	}

	// 2. Close active connection pool to release OS file locks
	if err := s.db.Close(); err != nil {
		return fmt.Errorf("failed to close active database connection: %w", err)
	}

	// 3. Overwrite database file
	destFile, err := os.Create(s.dbPath)
	if err != nil {
		return fmt.Errorf("failed to open target db for overwrite: %w", err)
	}

	if _, err := io.Copy(destFile, srcFile); err != nil {
		destFile.Close()
		return fmt.Errorf("failed to write restored database: %w", err)
	}
	destFile.Close()

	// 4. Re-open SQLite connection pool
	newSqlDB, err := sql.Open("sqlite", s.dbPath)
	if err != nil {
		return fmt.Errorf("failed to re-open restored database: %w", err)
	}

	// Re-enable WAL & Foreign Keys
	if _, err := newSqlDB.Exec("PRAGMA journal_mode = WAL;"); err != nil {
		return fmt.Errorf("failed to set WAL mode on restored db: %w", err)
	}
	if _, err := newSqlDB.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return fmt.Errorf("failed to enable foreign keys on restored db: %w", err)
	}

	// Mutate underlying *sql.DB in the shared *db.DB reference
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

	return logs, nil
}

func (s *BackupService) logAction(userID int64, username, action, details string) {
	_, _ = s.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}
