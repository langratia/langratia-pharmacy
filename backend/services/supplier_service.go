package services

import (
	"errors"
	"fmt"

	"app/backend/db"
	"app/backend/models"
)

type SupplierService struct {
	db *db.DB
}

func NewSupplierService(database *db.DB) *SupplierService {
	return &SupplierService{db: database}
}

// AddSupplier registers a new supplier.
func (s *SupplierService) AddSupplier(sup models.Supplier, userID int64, username string) (*models.Supplier, error) {
	if sup.Name == "" {
		return nil, errors.New("supplier name is required")
	}

	// Check for duplicate name
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM suppliers WHERE name = ?", sup.Name).Scan(&count)
	if err == nil && count > 0 {
		return nil, errors.New("a supplier with this name already exists")
	}

	query := `INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)`
	res, err := s.db.Exec(query, sup.Name, sup.ContactPerson, sup.Phone, sup.Email, sup.Address)
	if err != nil {
		return nil, fmt.Errorf("failed to add supplier: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	sup.ID = id

	s.logAction(userID, username, "ADD_SUPPLIER", fmt.Sprintf("Added supplier %s (ID: %d)", sup.Name, sup.ID))
	return &sup, nil
}

// UpdateSupplier updates existing supplier contact info.
func (s *SupplierService) UpdateSupplier(sup models.Supplier, userID int64, username string) error {
	if sup.ID <= 0 || sup.Name == "" {
		return errors.New("valid supplier ID and name are required")
	}

	// Check for duplicate name excluding current supplier
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM suppliers WHERE name = ? AND id != ?", sup.Name, sup.ID).Scan(&count)
	if err == nil && count > 0 {
		return errors.New("a supplier with this name already exists")
	}

	query := `UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ? AND is_archived = 0`
	res, err := s.db.Exec(query, sup.Name, sup.ContactPerson, sup.Phone, sup.Email, sup.Address, sup.ID)
	if err != nil {
		return fmt.Errorf("failed to update supplier: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return errors.New("supplier not found")
	}

	s.logAction(userID, username, "UPDATE_SUPPLIER", fmt.Sprintf("Updated supplier %s (ID: %d)", sup.Name, sup.ID))
	return nil
}

// ListSuppliers returns suppliers sorted by name.
func (s *SupplierService) ListSuppliers(includeArchived bool) ([]models.Supplier, error) {
	query := `SELECT id, name, contact_person, phone, email, address, is_archived, created_at FROM suppliers`
	if !includeArchived {
		query += ` WHERE is_archived = 0`
	}
	query += ` ORDER BY name ASC`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var suppliers []models.Supplier
	for rows.Next() {
		var sup models.Supplier
		if err := rows.Scan(&sup.ID, &sup.Name, &sup.ContactPerson, &sup.Phone, &sup.Email, &sup.Address, &sup.IsArchived, &sup.CreatedAt); err != nil {
			return nil, err
		}
		suppliers = append(suppliers, sup)
	}

	return suppliers, nil
}

// ArchiveSupplier toggles the is_archived flag on a supplier.
func (s *SupplierService) ArchiveSupplier(id int64, archive bool, userID int64, username string) error {
	query := `UPDATE suppliers SET is_archived = ? WHERE id = ?`
	res, err := s.db.Exec(query, archive, id)
	if err != nil {
		return fmt.Errorf("failed to archive supplier: %w", err)
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return errors.New("supplier not found")
	}
	action := "ARCHIVE_SUPPLIER"
	if !archive {
		action = "RESTORE_SUPPLIER"
	}
	s.logAction(userID, username, action, fmt.Sprintf("Supplier ID: %d, archived: %v", id, archive))
	return nil
}

func (s *SupplierService) logAction(userID int64, username, action, details string) {
	_, _ = s.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}
