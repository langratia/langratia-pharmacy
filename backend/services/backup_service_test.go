package services

import (
	"os"
	"path/filepath"
	"testing"

	"app/backend/db"
)

func TestBackupService(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_bk_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_orig.db")
	destPath := filepath.Join(tempDir, "backups", "pharmacy_export.db")

	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	backupService := NewBackupService(database, dbPath)
	authService := NewAuthService(database)
	_, _ = authService.CompleteFirstTimeSetup("Test Pharmacy", "Admin User", "admin", "admin123")

	// Test Export
	if err := backupService.ExportDatabase(destPath, 1, "admin"); err != nil {
		t.Fatalf("ExportDatabase failed: %v", err)
	}

	if _, err := os.Stat(destPath); os.IsNotExist(err) {
		t.Errorf("expected backup file to exist at %s", destPath)
	}

	// Test Audit Logs
	logs, err := backupService.ListAuditLogs(10)
	if err != nil {
		t.Fatalf("ListAuditLogs failed: %v", err)
	}
	if len(logs) == 0 {
		t.Error("expected audit logs to be recorded, got 0")
	}
}
