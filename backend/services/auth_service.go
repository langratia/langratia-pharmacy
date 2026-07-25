package services

import (
	"errors"
	"fmt"

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

// Login authenticates user credentials and returns user details.
func (s *AuthService) Login(username, password string) (*models.User, error) {
	var user models.User
	var passwordHash string

	query := `SELECT id, username, password_hash, role, full_name, created_at FROM users WHERE active = 1 AND username = ?`
	err := s.db.QueryRow(query, username).Scan(
		&user.ID, &user.Username, &passwordHash, &user.Role, &user.FullName, &user.CreatedAt,
	)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	// Record Audit Log
	s.logAction(user.ID, user.Username, "USER_LOGIN", fmt.Sprintf("User %s logged in successfully", username))

	return &user, nil
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

