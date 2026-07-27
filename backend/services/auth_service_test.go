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

	// Test first-time setup check on fresh database
	isFirst, err := authService.IsFirstTimeSetup()
	if err != nil || !isFirst {
		t.Fatalf("expected IsFirstTimeSetup true on fresh DB, got %v, err: %v", isFirst, err)
	}

	// Completing first-time setup
	adminUser, err := authService.CompleteFirstTimeSetup("Langratia Test Pharmacy", "Admin User", "admin", "admin123")
	if err != nil {
		t.Fatalf("CompleteFirstTimeSetup failed: %v", err)
	}

	// Verify IsFirstTimeSetup is now false
	isFirst, err = authService.IsFirstTimeSetup()
	if err != nil || isFirst {
		t.Fatalf("expected IsFirstTimeSetup false after setup, got %v, err: %v", isFirst, err)
	}

	// Test login with newly configured admin account
	adminUser, err = authService.Login("admin", "admin123", "test-workstation")
	if err != nil {
		t.Fatalf("expected successful admin login after setup, got error: %v", err)
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
	cashierUser, err := authService.CreateUser("cashier1", "cashier123", "cashier", "John Doe", "", "", "")
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

	// Test password change
	err = authService.ChangePassword(adminUser.ID, "admin123", "newAdmin456")
	if err != nil {
		t.Fatalf("failed to change password: %v", err)
	}

	// Login with new password
	_, err = authService.Login("admin", "newAdmin456", "test-workstation")
	if err != nil {
		t.Fatalf("expected login with new password, got: %v", err)
	}

	// Old password should no longer work
	_, err = authService.Login("admin", "admin123", "test-workstation")
	if err == nil {
		t.Error("expected error with old password, got nil")
	}

	// Test admin reset password
	err = authService.AdminResetPassword(adminUser.ID, cashierUser.ID, "resetPass789")
	if err != nil {
		t.Fatalf("admin reset password failed: %v", err)
	}

	// Cashier logs in with new password
	_, err = authService.Login("cashier1", "resetPass789", "test-workstation")
	if err != nil {
		t.Fatalf("expected login after admin reset, got: %v", err)
	}
}

func TestAccountLockout(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_lockout_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_lockout.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	authService := NewAuthService(database)
	_, _ = authService.CompleteFirstTimeSetup("Test Pharmacy", "Admin User", "admin", "admin123")

	// Set low lockout threshold for testing (2 attempts)
	database.Exec("UPDATE system_config SET value = '2' WHERE key = 'max_failed_attempts'")
	database.Exec("UPDATE system_config SET value = '1' WHERE key = 'lockout_duration_minutes'")

	// First login succeeds
	_, err = authService.Login("admin", "admin123", "test")
	if err != nil {
		t.Fatalf("expected successful login, got: %v", err)
	}

	// First wrong attempt - should show 1 remaining
	_, err = authService.Login("admin", "wrong1", "test")
	if err == nil {
		t.Fatal("expected error for wrong password")
	}

	// Second wrong attempt - should lock
	_, err = authService.Login("admin", "wrong2", "test")
	if err == nil {
		t.Fatal("expected error for wrong password")
	}

	// Third wrong attempt - should be locked (hits lock check before password verify)
	_, err = authService.Login("admin", "wrong3", "test")
	if err == nil {
		t.Fatal("expected account locked error")
	}

	// Test unlock by admin
	err = authService.UnlockUser(1)
	if err != nil {
		t.Fatalf("failed to unlock user: %v", err)
	}

	// After unlock, login should work
	_, err = authService.Login("admin", "admin123", "test")
	if err != nil {
		t.Fatalf("expected successful login after unlock, got: %v", err)
	}
}
