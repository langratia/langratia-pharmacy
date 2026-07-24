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

	query := `UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ?`
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

// ListSuppliers returns all suppliers sorted by name.
func (s *SupplierService) ListSuppliers() ([]models.Supplier, error) {
	query := `SELECT id, name, contact_person, phone, email, address, created_at FROM suppliers ORDER BY name ASC`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var suppliers []models.Supplier
	for rows.Next() {
		var sup models.Supplier
		if err := rows.Scan(&sup.ID, &sup.Name, &sup.ContactPerson, &sup.Phone, &sup.Email, &sup.Address, &sup.CreatedAt); err != nil {
			return nil, err
		}
		suppliers = append(suppliers, sup)
	}

	return suppliers, nil
}

func (s *SupplierService) logAction(userID int64, username, action, details string) {
	_, _ = s.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}
