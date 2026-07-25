package services

import (
	"os"
	"path/filepath"
	"testing"

	"app/backend/db"
)

func TestAuthService(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_auth_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_auth.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	authService := NewAuthService(database)

	// Test default admin login
	adminUser, err := authService.Login("admin", "admin123", "test-workstation")
	if err != nil {
		t.Fatalf("expected successful admin login, got error: %v", err)
	}
	if adminUser.Role != "admin" {
		t.Errorf("expected role admin, got %s", adminUser.Role)
	}
	if adminUser.LastWorkstation != "test-workstation" {
		t.Errorf("expected workstation 'test-workstation', got '%s'", adminUser.LastWorkstation)
	}

	// Test invalid password
	_, err = authService.Login("admin", "wrongpassword", "test-workstation")
	if err == nil {
		t.Error("expected error for wrong password, got nil")
	}

	// Test creating a new cashier user
	cashierUser, err := authService.CreateUser("cashier1", "cashier123", "cashier", "John Doe")
	if err != nil {
		t.Fatalf("failed to create cashier user: %v", err)
	}

	if cashierUser.Username != "cashier1" || cashierUser.Role != "cashier" {
		t.Errorf("unexpected user details: %+v", cashierUser)
	}

	// Test cashier login
	loggedInCashier, err := authService.Login("cashier1", "cashier123", "test-workstation")
	if err != nil {
		t.Fatalf("failed cashier login: %v", err)
	}
	if loggedInCashier.FullName != "John Doe" {
		t.Errorf("expected FullName John Doe, got %s", loggedInCashier.FullName)
	}

	// Test logout tracking
	if err := authService.Logout(adminUser.ID); err != nil {
		t.Fatalf("failed to logout: %v", err)
	}

	// Test listing users
	users, err := authService.ListUsers()
	if err != nil {
		t.Fatalf("failed to list users: %v", err)
	}
	if len(users) != 2 {
		t.Errorf("expected 2 users, got %d", len(users))
	}
}
