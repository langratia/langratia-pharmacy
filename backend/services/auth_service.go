package services

import (
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"time"

	"app/backend/db"
	"app/backend/models"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	mu sync.Mutex
	db *db.DB
}

func NewAuthService(database *db.DB) *AuthService {
	return &AuthService{db: database}
}

func (s *AuthService) getConfig(key, fallback string) string {
	var val string
	err := s.db.QueryRow("SELECT value FROM system_config WHERE key = ?", key).Scan(&val)
	if err != nil {
		return fallback
	}
	return val
}

func (s *AuthService) logAction(userID int64, username, action, details string) {
	_, _ = s.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}

// IsFirstTimeSetup checks if initial onboarding setup is required.
func (s *AuthService) IsFirstTimeSetup() (bool, error) {
	var configuredCount int
	err := s.db.QueryRow("SELECT COUNT(*) FROM users WHERE password_changed_at IS NOT NULL").Scan(&configuredCount)
	if err != nil {
		return false, err
	}
	return configuredCount == 0, nil
}

// CompleteFirstTimeSetup configures company name and admin credentials on first launch.
func (s *AuthService) CompleteFirstTimeSetup(pharmacyName, fullName, username, password string) (*models.User, error) {
	if username == "" || password == "" || fullName == "" {
		return nil, errors.New("admin full name, username, and password are required")
	}
	if len(password) < 4 {
		return nil, errors.New("password must be at least 4 characters long")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	now := time.Now()

	if pharmacyName != "" {
		_, _ = s.db.Exec("UPDATE pharmacy_config SET pharmacy_name = ?, updated_at = ? WHERE id = 1", pharmacyName, now)
	}

	var existingID int64
	err = s.db.QueryRow("SELECT id FROM users ORDER BY id ASC LIMIT 1").Scan(&existingID)
	if err == nil {
		_, err = s.db.Exec("UPDATE users SET username = ?, password_hash = ?, role = 'admin', full_name = ?, password_changed_at = ?, active = 1, failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
			username, string(hashedPassword), fullName, now, existingID)
		if err != nil {
			return nil, fmt.Errorf("failed to update admin account: %w", err)
		}
		return s.GetUser(existingID)
	}

	res, err := s.db.Exec(`INSERT INTO users (username, password_hash, role, full_name, password_changed_at, active, failed_login_attempts) VALUES (?, ?, 'admin', ?, ?, 1, 0)`,
		username, string(hashedPassword), fullName, now)
	if err != nil {
		return nil, fmt.Errorf("failed to create admin account: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	user, err := s.GetUser(id)
	if err == nil && user != nil {
		s.logAction(user.ID, user.Username, "FIRST_TIME_SETUP", fmt.Sprintf("Completed initial system setup for pharmacy '%s'", pharmacyName))
		s.recordLoginHistory(user.ID, user.Username, "system_setup", "")
	}
	return user, err
}

func (s *AuthService) recordLoginHistory(userID int64, username, action, workstation string) {
	_, _ = s.db.Exec(
		`INSERT INTO login_history (user_id, username, action, workstation) VALUES (?, ?, ?, ?)`,
		userID, username, action, workstation,
	)
}

// GetUser returns a single user with all fields (no password hash).
func (s *AuthService) GetUser(id int64) (*models.User, error) {
	var u models.User
	var lastLoginAt, lastLogoutAt, lockedUntil, pwdChangedAt sql.NullTime
	err := s.db.QueryRow(`
		SELECT id, username, role, full_name, COALESCE(phone, ''), COALESCE(email, ''),
		       COALESCE(branch, ''), active, last_login_at, last_logout_at,
		       COALESCE(last_workstation, ''), COALESCE(failed_login_attempts, 0),
		       locked_until, password_changed_at, created_at
		FROM users WHERE id = ?`, id).Scan(
		&u.ID, &u.Username, &u.Role, &u.FullName,
		&u.Phone, &u.Email, &u.Branch,
		&u.Active, &lastLoginAt, &lastLogoutAt,
		&u.LastWorkstation, &u.FailedLoginAttempts,
		&lockedUntil, &pwdChangedAt, &u.CreatedAt,
	)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if lastLoginAt.Valid { u.LastLoginAt = &lastLoginAt.Time }
	if lastLogoutAt.Valid { u.LastLogoutAt = &lastLogoutAt.Time }
	if lockedUntil.Valid { u.LockedUntil = &lockedUntil.Time }
	if pwdChangedAt.Valid { u.PasswordChangedAt = &pwdChangedAt.Time }
	return &u, nil
}

// Login authenticates user credentials and returns user details.
func (s *AuthService) Login(username, password, workstation string) (*models.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var user models.User
	var passwordHash string
	var failedAttempts int
	var lastLoginAt, lastLogoutAt, lockedUntil, pwdChangedAt sql.NullTime

	query := `SELECT id, username, password_hash, role, full_name,
		COALESCE(phone, ''), COALESCE(email, ''), COALESCE(branch, ''),
		active, last_login_at, last_logout_at,
		COALESCE(last_workstation, ''), COALESCE(failed_login_attempts, 0),
		locked_until, password_changed_at, created_at FROM users WHERE username = ?`
	err := s.db.QueryRow(query, username).Scan(
		&user.ID, &user.Username, &passwordHash, &user.Role, &user.FullName,
		&user.Phone, &user.Email, &user.Branch,
		&user.Active,
		&lastLoginAt, &lastLogoutAt, &user.LastWorkstation,
		&failedAttempts, &lockedUntil, &pwdChangedAt, &user.CreatedAt,
	)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}
	if lastLoginAt.Valid { user.LastLoginAt = &lastLoginAt.Time }
	if lastLogoutAt.Valid { user.LastLogoutAt = &lastLogoutAt.Time }
	if lockedUntil.Valid { user.LockedUntil = &lockedUntil.Time }
	if pwdChangedAt.Valid { user.PasswordChangedAt = &pwdChangedAt.Time }

	if !user.Active {
		return nil, errors.New("account is disabled")
	}

	if lockedUntil.Valid && time.Now().Before(lockedUntil.Time) {
		return nil, fmt.Errorf("account is locked until %s", lockedUntil.Time.Format("2006-01-02 15:04"))
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		s.db.Exec("UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1 WHERE id = ?", user.ID)

		var attemptCount int
		s.db.QueryRow("SELECT COALESCE(failed_login_attempts, 0) FROM users WHERE id = ?", user.ID).Scan(&attemptCount)

		maxAttemptsStr := s.getConfig("max_failed_attempts", "5")
		var maxAttempts int
		fmt.Sscanf(maxAttemptsStr, "%d", &maxAttempts)
		if maxAttempts <= 0 {
			maxAttempts = 5
		}

		if attemptCount >= maxAttempts {
			durationStr := s.getConfig("lockout_duration_minutes", "30")
			var durationMinutes int
			fmt.Sscanf(durationStr, "%d", &durationMinutes)
			if durationMinutes <= 0 {
				durationMinutes = 30
			}
			lockedUntil := time.Now().Add(time.Duration(durationMinutes) * time.Minute)
			s.db.Exec("UPDATE users SET locked_until = ? WHERE id = ?", lockedUntil, user.ID)
			return nil, fmt.Errorf("account locked due to %d failed attempts. Try again after %s", attemptCount, lockedUntil.Format("15:04"))
		}

		remaining := maxAttempts - attemptCount
		return nil, fmt.Errorf("invalid username or password (%d attempt(s) remaining)", remaining)
	}

	now := time.Now()
	s.db.Exec("UPDATE users SET failed_login_attempts = 0, last_login_at = ?, last_workstation = ? WHERE id = ?", now, workstation, user.ID)

	user.FailedLoginAttempts = 0
	user.LastLoginAt = &now
	user.LastWorkstation = workstation

	s.logAction(user.ID, user.Username, "USER_LOGIN", fmt.Sprintf("User %s logged in from %s", username, workstation))
	s.recordLoginHistory(user.ID, user.Username, "login", workstation)

	return &user, nil
}

// Logout records the logout timestamp and login_history entry.
func (s *AuthService) Logout(userID int64) error {
	now := time.Now()
	_, err := s.db.Exec("UPDATE users SET last_logout_at = ? WHERE id = ?", now, userID)
	if err != nil {
		return err
	}

	var username string
	s.db.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)
	s.recordLoginHistory(userID, username, "logout", "")
	return nil
}

// ForceLogout records a force_logout event in login_history (admin action).
func (s *AuthService) ForceLogout(userID int64, adminID int64) error {
	var username, adminUser string
	s.db.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)
	s.db.QueryRow("SELECT username FROM users WHERE id = ?", adminID).Scan(&adminUser)

	s.recordLoginHistory(userID, username, "force_logout", "")
	s.logAction(adminID, adminUser, "FORCE_LOGOUT", fmt.Sprintf("Admin force-logged out user %s", username))
	return nil
}

// CreateUser registers a new user.
func (s *AuthService) CreateUser(username, password, role, fullName, phone, email, branch string) (*models.User, error) {
	if username == "" || password == "" || role == "" || fullName == "" {
		return nil, errors.New("all required user fields must be filled")
	}

	if role != "admin" && role != "cashier" {
		return nil, errors.New("role must be admin or cashier")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	query := `INSERT INTO users (username, password_hash, role, full_name, phone, email, branch) VALUES (?, ?, ?, ?, ?, ?, ?)`
	res, err := s.db.Exec(query, username, string(hashedPassword), role, fullName, phone, email, branch)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.User{
		ID:       id,
		Username: username,
		Role:     role,
		FullName: fullName,
		Phone:    phone,
		Email:    email,
		Branch:   branch,
	}, nil
}

// ListUsers retrieves all users including inactive (for management UI).
func (s *AuthService) ListUsers() ([]models.User, error) {
	rows, err := s.db.Query(`
		SELECT id, username, role, full_name, COALESCE(phone, ''), COALESCE(email, ''),
		       COALESCE(branch, ''), active, last_login_at, last_logout_at,
		       COALESCE(last_workstation, ''), COALESCE(failed_login_attempts, 0),
		       locked_until, password_changed_at, created_at
		FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		var lastLoginAt, lastLogoutAt, lockedUntil, pwdChangedAt sql.NullTime
		if err := rows.Scan(
			&u.ID, &u.Username, &u.Role, &u.FullName,
			&u.Phone, &u.Email, &u.Branch,
			&u.Active, &lastLoginAt, &lastLogoutAt,
			&u.LastWorkstation, &u.FailedLoginAttempts,
			&lockedUntil, &pwdChangedAt, &u.CreatedAt,
		); err != nil {
			return nil, err
		}
		if lastLoginAt.Valid { u.LastLoginAt = &lastLoginAt.Time }
		if lastLogoutAt.Valid { u.LastLogoutAt = &lastLogoutAt.Time }
		if lockedUntil.Valid { u.LockedUntil = &lockedUntil.Time }
		if pwdChangedAt.Valid { u.PasswordChangedAt = &pwdChangedAt.Time }
		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

// UpdateUserInfo updates user details (full_name, phone, email, branch, role).
func (s *AuthService) UpdateUserInfo(id int64, role, fullName, phone, email, branch string) error {
	if id <= 0 || role == "" || fullName == "" {
		return errors.New("invalid parameters for user update")
	}
	if role != "admin" && role != "cashier" {
		return errors.New("role must be admin or cashier")
	}
	query := `UPDATE users SET role = ?, full_name = ?, phone = ?, email = ?, branch = ? WHERE id = ?`
	res, err := s.db.Exec(query, role, fullName, phone, email, branch, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}
	return nil
}

// ReactivateUser sets active = 1 for a deactivated user.
func (s *AuthService) ReactivateUser(id int64) error {
	if id <= 0 {
		return errors.New("invalid user ID")
	}
	res, err := s.db.Exec("UPDATE users SET active = 1 WHERE id = ?", id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}
	return nil
}

// DeactivateUser deactivates a user (soft-delete).
func (s *AuthService) DeactivateUser(id int64) error {
	if id <= 0 {
		return errors.New("invalid user ID")
	}
	res, err := s.db.Exec("UPDATE users SET active = 0 WHERE id = ?", id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}
	return nil
}

// LockUser manually locks a user account (sets locked_until far in future).
func (s *AuthService) LockUser(id int64) error {
	if id <= 0 {
		return errors.New("invalid user ID")
	}
	lockedUntil := time.Now().Add(100 * 365 * 24 * time.Hour)
	res, err := s.db.Exec("UPDATE users SET locked_until = ?, failed_login_attempts = COALESCE(failed_login_attempts, 0) WHERE id = ?", lockedUntil, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}
	return nil
}

// UnlockUser clears lockout and failed attempts.
func (s *AuthService) UnlockUser(targetUserID int64) error {
	res, err := s.db.Exec("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?", targetUserID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}
	return nil
}

// VerifyPassword checks if the given password matches the user's current password.
func (s *AuthService) VerifyPassword(userID int64, password string) bool {
	var currentHash string
	err := s.db.QueryRow("SELECT password_hash FROM users WHERE id = ? AND active = 1", userID).Scan(&currentHash)
	if err != nil {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(password)) == nil
}

// ChangePassword allows a user to change their own password after verifying the old one.
func (s *AuthService) ChangePassword(userID int64, oldPassword, newPassword string) error {
	if oldPassword == "" || newPassword == "" {
		return errors.New("both old and new passwords are required")
	}
	if len(newPassword) < 4 {
		return errors.New("new password must be at least 4 characters")
	}

	var currentHash string
	err := s.db.QueryRow("SELECT password_hash FROM users WHERE id = ? AND active = 1", userID).Scan(&currentHash)
	if err != nil {
		return errors.New("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(oldPassword)); err != nil {
		return errors.New("current password is incorrect")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	now := time.Now()
	_, err = s.db.Exec("UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?", string(newHash), now, userID)
	if err != nil {
		return err
	}

	var username string
	s.db.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)
	s.logAction(userID, username, "CHANGE_PASSWORD", "User changed their own password")
	return nil
}

// AdminResetPassword allows an admin to reset any user's password.
func (s *AuthService) AdminResetPassword(adminID int64, targetUserID int64, newPassword string) error {
	if newPassword == "" {
		return errors.New("new password is required")
	}
	if len(newPassword) < 4 {
		return errors.New("password must be at least 4 characters")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	now := time.Now()
	res, err := s.db.Exec("UPDATE users SET password_hash = ?, password_changed_at = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?", string(newHash), now, targetUserID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}

	var adminUser, targetUser string
	s.db.QueryRow("SELECT username FROM users WHERE id = ?", adminID).Scan(&adminUser)
	s.db.QueryRow("SELECT username FROM users WHERE id = ?", targetUserID).Scan(&targetUser)
	s.logAction(adminID, adminUser, "ADMIN_RESET_PASSWORD", fmt.Sprintf("Admin reset password for user %s", targetUser))
	return nil
}

// GetLoginHistory returns login/logout events for a specific user.
func (s *AuthService) GetLoginHistory(userID int64) ([]models.LoginHistory, error) {
	rows, err := s.db.Query(`
		SELECT id, user_id, username, action, COALESCE(workstation, ''), created_at
		FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []models.LoginHistory
	for rows.Next() {
		var h models.LoginHistory
		if err := rows.Scan(&h.ID, &h.UserID, &h.Username, &h.Action, &h.Workstation, &h.CreatedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return history, nil
}

// GetUserActivity returns audit log entries for a specific user.
func (s *AuthService) GetUserActivity(userID int64, limit int) ([]models.AuditLog, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.Query(`
		SELECT id, user_id, username, action, COALESCE(details, ''), timestamp
		FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuditLog
	for rows.Next() {
		var l models.AuditLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.Username, &l.Action, &l.Details, &l.Timestamp); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return logs, nil
}
