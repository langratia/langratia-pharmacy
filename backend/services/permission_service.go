package services

import (
	"app/backend/db"
	"app/backend/models"
)

type PermissionService struct {
	db *db.DB
}

func NewPermissionService(database *db.DB) *PermissionService {
	return &PermissionService{db: database}
}

// HasPermission checks if a user's role has the given permission.
func (s *PermissionService) HasPermission(userID int64, permission string) (bool, error) {
	var role string
	err := s.db.QueryRow("SELECT role FROM users WHERE id = ? AND active = 1", userID).Scan(&role)
	if err != nil {
		return false, nil
	}

	var count int
	err = s.db.QueryRow("SELECT COUNT(*) FROM role_permissions WHERE role = ? AND permission = ?", role, permission).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// HasAnyPermission checks if a user has at least one of the given permissions.
func (s *PermissionService) HasAnyPermission(userID int64, permissions ...string) (bool, error) {
	for _, p := range permissions {
		ok, err := s.HasPermission(userID, p)
		if err != nil {
			return false, err
		}
		if ok {
			return true, nil
		}
	}
	return false, nil
}

// GetRolePermissions returns all permissions for a given role.
func (s *PermissionService) GetRolePermissions(role string) ([]string, error) {
	rows, err := s.db.Query("SELECT permission FROM role_permissions WHERE role = ?", role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

// SetRolePermissions replaces all permissions for a role.
func (s *PermissionService) SetRolePermissions(role string, permissions []string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM role_permissions WHERE role = ?", role)
	if err != nil {
		return err
	}

	for _, p := range permissions {
		_, err = tx.Exec("INSERT INTO role_permissions (role, permission) VALUES (?, ?)", role, p)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// GetAllPermissionDefs returns all known permission definitions.
func (s *PermissionService) GetAllPermissionDefs() []models.PermissionInfo {
	return models.AllPermissions
}
