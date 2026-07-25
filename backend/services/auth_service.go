package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"app/backend/db"
	"app/backend/models"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	db *db.DB
}

func NewAuthService(database *db.DB) *AuthService {
	return &AuthService{db: database}
}

// getConfig retrieves a system_config value with a fallback default.
func (s *AuthService) getConfig(key, fallback string) string {
	var val string
	err := s.db.QueryRow("SELECT value FROM system_config WHERE key = ?", key).Scan(&val)
	if err != nil {
		return fallback
	}
	return val
}

// Login authenticates user credentials and returns user details.
func (s *AuthService) Login(username, password, workstation string) (*models.User, error) {
	var user models.User
	var passwordHash string
	var failedAttempts int
	var lockedUntil sql.NullTime

	query := `SELECT id, username, password_hash, role, full_name, active, last_login_at, last_logout_at, COALESCE(last_workstation, ''), COALESCE(failed_login_attempts, 0), locked_until, password_changed_at, created_at FROM users WHERE username = ?`
	err := s.db.QueryRow(query, username).Scan(
		&user.ID, &user.Username, &passwordHash, &user.Role, &user.FullName, &user.Active,
		&user.LastLoginAt, &user.LastLogoutAt, &user.LastWorkstation,
		&failedAttempts, &lockedUntil, &user.PasswordChangedAt, &user.CreatedAt,
	)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if !user.Active {
		return nil, errors.New("account is disabled")
	}

	// Check if account is temporarily locked
	if lockedUntil.Valid && time.Now().Before(lockedUntil.Time) {
		return nil, fmt.Errorf("account is locked until %s", lockedUntil.Time.Format("2006-01-02 15:04"))
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		// Increment failed attempts
		s.db.Exec("UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1 WHERE id = ?", user.ID)
		return nil, errors.New("invalid username or password")
	}

	now := time.Now()

	// On success: reset failed attempts, update login timestamp, record workstation
	s.db.Exec("UPDATE users SET failed_login_attempts = 0, last_login_at = ?, last_workstation = ? WHERE id = ?", now, workstation, user.ID)

	user.FailedLoginAttempts = 0
	user.LastLoginAt = &now
	user.LastWorkstation = workstation

	// Record Audit Log
	s.logAction(user.ID, user.Username, "USER_LOGIN", fmt.Sprintf("User %s logged in from %s", username, workstation))

	return &user, nil
}

// Logout records the logout timestamp for a user.
func (s *AuthService) Logout(userID int64) error {
	now := time.Now()
	_, err := s.db.Exec("UPDATE users SET last_logout_at = ? WHERE id = ?", now, userID)
	if err != nil {
		return err
	}
	return nil
}

// CreateUser registers a new user (Admin only operation).
func (s *AuthService) CreateUser(username, password, role, fullName string) (*models.User, error) {
	if username == "" || password == "" || role == "" || fullName == "" {
		return nil, errors.New("all user fields are required")
	}

	if role != "admin" && role != "cashier" {
		return nil, errors.New("role must be admin or cashier")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	query := `INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)`
	res, err := s.db.Exec(query, username, string(hashedPassword), role, fullName)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	user := &models.User{
		ID:       id,
		Username: username,
		Role:     role,
		FullName: fullName,
	}

	return user, nil
}

// ListUsers retrieves all registered users.
func (s *AuthService) ListUsers() ([]models.User, error) {
	query := `SELECT id, username, role, full_name, created_at FROM users WHERE active = 1 ORDER BY created_at DESC`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.FullName, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	return users, nil
}

// UpdateUser updates user details.
func (s *AuthService) UpdateUser(id int64, role, fullName string) error {
	if id <= 0 || role == "" || fullName == "" {
		return errors.New("invalid parameters for user update")
	}
	query := `UPDATE users SET role = ?, full_name = ? WHERE id = ? AND active = 1`
	res, err := s.db.Exec(query, role, fullName, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found or inactive")
	}
	return nil
}

// DeactivateUser deactivates a user (soft-delete).
func (s *AuthService) DeactivateUser(id int64) error {
	if id <= 0 {
		return errors.New("invalid user ID")
	}
	query := `UPDATE users SET active = 0 WHERE id = ?`
	_, err := s.db.Exec(query, id)
	return err
}

func (s *AuthService) logAction(userID int64, username, action, details string) {
	_, _ = s.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}

