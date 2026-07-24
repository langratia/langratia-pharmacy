package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
	"golang.org/x/crypto/bcrypt"
)

type DB struct {
	*sql.DB
}

// InitDB initializes the SQLite database at the specified path and runs migrations.
func InitDB(dbPath string) (*DB, error) {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	sqlDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// Enable WAL mode & foreign keys for performance and integrity
	if _, err := sqlDB.Exec("PRAGMA journal_mode = WAL;"); err != nil {
		return nil, fmt.Errorf("failed to set WAL mode: %w", err)
	}
	if _, err := sqlDB.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	db := &DB{sqlDB}

	// Run Schema Migrations
	if err := db.Migrate(); err != nil {
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	// Seed Default Admin User if no users exist
	if err := db.seedDefaultAdmin(); err != nil {
		return nil, fmt.Errorf("failed to seed default admin: %w", err)
	}

	return db, nil
}

// Migrate executes base schema creation scripts and applies versioned incremental migrations.
func (db *DB) Migrate() error {
	if _, err := db.Exec(Schema); err != nil {
		return fmt.Errorf("failed to execute base schema: %w", err)
	}

	for _, m := range Migrations {
		var count int
		err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE version = ?", m.Version).Scan(&count)
		if err != nil {
			return fmt.Errorf("failed to check migration version %d: %w", m.Version, err)
		}

		if count == 0 {
			tx, err := db.Begin()
			if err != nil {
				return err
			}

			if _, err := tx.Exec(m.Script); err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to apply migration %d (%s): %w", m.Version, m.Description, err)
			}

			if _, err := tx.Exec("INSERT INTO schema_migrations (version) VALUES (?)", m.Version); err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to record migration version %d: %w", m.Version, err)
			}

			if err := tx.Commit(); err != nil {
				return err
			}
		}
	}

	return nil
}

// seedDefaultAdmin checks if the users table is empty and creates an admin user (admin / admin123).
func (db *DB) seedDefaultAdmin() error {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		_, err = db.Exec(
			"INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
			"admin", string(hashedPassword), "admin", "System Administrator",
		)
		if err != nil {
			return err
		}
	}

	return nil
}
