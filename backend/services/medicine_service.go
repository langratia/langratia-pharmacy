package services

import (
	"database/sql"
	"errors"
	"fmt"

	"app/backend/db"
	"app/backend/models"
)

type MedicineService struct {
	db *db.DB
}

func NewMedicineService(database *db.DB) *MedicineService {
	return &MedicineService{db: database}
}

// AddMedicine creates a new medicine entry.
func (s *MedicineService) AddMedicine(med models.Medicine, userID int64, username string) (*models.Medicine, error) {
	if med.Name == "" {
		return nil, errors.New("medicine name is required")
	}

	query := `
		INSERT INTO medicines (
			name, generic_name, brand_name, category, dosage_strength,
			medicine_form, pack_size, buying_price, selling_price,
			current_stock, reorder_level, manufacturer, description, is_archived
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`

	res, err := s.db.Exec(query,
		med.Name, med.GenericName, med.BrandName, med.Category, med.DosageStrength,
		med.MedicineForm, med.PackSize, med.BuyingPrice, med.SellingPrice,
		med.CurrentStock, med.ReorderLevel, med.Manufacturer, med.Description,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to add medicine: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	med.ID = id

	// Audit Log
	s.logAction(userID, username, "ADD_MEDICINE", fmt.Sprintf("Added medicine %s (ID: %d)", med.Name, med.ID))

	return &med, nil
}

// UpdateMedicine updates an existing medicine entry.
func (s *MedicineService) UpdateMedicine(med models.Medicine, userID int64, username string) error {
	if med.ID <= 0 || med.Name == "" {
		return errors.New("valid medicine ID and name are required")
	}

	query := `
		UPDATE medicines SET
			name = ?, generic_name = ?, brand_name = ?, category = ?, dosage_strength = ?,
			medicine_form = ?, pack_size = ?, buying_price = ?, selling_price = ?,
			reorder_level = ?, manufacturer = ?, description = ?
		WHERE id = ?`

	res, err := s.db.Exec(query,
		med.Name, med.GenericName, med.BrandName, med.Category, med.DosageStrength,
		med.MedicineForm, med.PackSize, med.BuyingPrice, med.SellingPrice,
		med.ReorderLevel, med.Manufacturer, med.Description, med.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update medicine: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return errors.New("medicine not found")
	}

	s.logAction(userID, username, "UPDATE_MEDICINE", fmt.Sprintf("Updated medicine %s (ID: %d)", med.Name, med.ID))
	return nil
}

// ArchiveMedicine toggles the archive status of a medicine.
func (s *MedicineService) ArchiveMedicine(id int64, archive bool, userID int64, username string) error {
	archivedVal := 0
	if archive {
		archivedVal = 1
	}

	query := `UPDATE medicines SET is_archived = ? WHERE id = ?`
	res, err := s.db.Exec(query, archivedVal, id)
	if err != nil {
		return fmt.Errorf("failed to update archive status: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return errors.New("medicine not found")
	}

	action := "ARCHIVE_MEDICINE"
	if !archive {
		action = "UNARCHIVE_MEDICINE"
	}
	s.logAction(userID, username, action, fmt.Sprintf("Medicine ID %d archive status set to %t", id, archive))
	return nil
}

// ListMedicines retrieves medicines based on search term, category, and archived state.
func (s *MedicineService) ListMedicines(search, category string, includeArchived bool) ([]models.Medicine, error) {
	query := `
		SELECT id, name, generic_name, brand_name, category, dosage_strength,
		       medicine_form, pack_size, buying_price, selling_price, current_stock,
		       reorder_level, manufacturer, description, is_archived, created_at
		FROM medicines
		WHERE 1=1`

	var args []interface{}

	if !includeArchived {
		query += ` AND is_archived = 0`
	}
	if category != "" && category != "All" {
		query += ` AND category = ?`
		args = append(args, category)
	}
	if search != "" {
		query += ` AND (name LIKE ? OR generic_name LIKE ? OR brand_name LIKE ?)`
		pattern := "%" + search + "%"
		args = append(args, pattern, pattern, pattern)
	}

	query += ` ORDER BY name ASC`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query medicines: %w", err)
	}
	defer rows.Close()

	var medicines []models.Medicine
	for rows.Next() {
		var m models.Medicine
		var isArchivedInt int
		err := rows.Scan(
			&m.ID, &m.Name, &m.GenericName, &m.BrandName, &m.Category, &m.DosageStrength,
			&m.MedicineForm, &m.PackSize, &m.BuyingPrice, &m.SellingPrice, &m.CurrentStock,
			&m.ReorderLevel, &m.Manufacturer, &m.Description, &isArchivedInt, &m.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		m.IsArchived = isArchivedInt == 1
		medicines = append(medicines, m)
	}

	return medicines, nil
}

// ListMedicinesPaginated retrieves medicines with pagination support.
func (s *MedicineService) ListMedicinesPaginated(search, category string, includeArchived bool, page, pageSize int) (*models.PaginatedMedicines, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	baseWhere := ` WHERE 1=1`
	var args []interface{}

	if !includeArchived {
		baseWhere += ` AND is_archived = 0`
	}
	if category != "" && category != "All" {
		baseWhere += ` AND category = ?`
		args = append(args, category)
	}
	if search != "" {
		baseWhere += ` AND (name LIKE ? OR generic_name LIKE ? OR brand_name LIKE ?)`
		pattern := "%" + search + "%"
		args = append(args, pattern, pattern, pattern)
	}

	// 1. Get total count
	countQuery := `SELECT COUNT(*) FROM medicines` + baseWhere
	var totalCount int
	if err := s.db.QueryRow(countQuery, args...).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("failed to count medicines: %w", err)
	}

	// 2. Query paginated records
	query := `
		SELECT id, name, generic_name, brand_name, category, dosage_strength,
		       medicine_form, pack_size, buying_price, selling_price, current_stock,
		       reorder_level, manufacturer, description, is_archived, created_at
		FROM medicines` + baseWhere + ` ORDER BY name ASC LIMIT ? OFFSET ?`

	queryArgs := append(args, pageSize, offset)

	rows, err := s.db.Query(query, queryArgs...)
	if err != nil {
		return nil, fmt.Errorf("failed to query medicines: %w", err)
	}
	defer rows.Close()

	var medicines []models.Medicine
	for rows.Next() {
		var m models.Medicine
		var isArchivedInt int
		err := rows.Scan(
			&m.ID, &m.Name, &m.GenericName, &m.BrandName, &m.Category, &m.DosageStrength,
			&m.MedicineForm, &m.PackSize, &m.BuyingPrice, &m.SellingPrice, &m.CurrentStock,
			&m.ReorderLevel, &m.Manufacturer, &m.Description, &isArchivedInt, &m.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		m.IsArchived = isArchivedInt == 1
		medicines = append(medicines, m)
	}

	return &models.PaginatedMedicines{
		Items:      medicines,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}


// GetMedicineByID fetches a single medicine by ID.
func (s *MedicineService) GetMedicineByID(id int64) (*models.Medicine, error) {
	query := `
		SELECT id, name, generic_name, brand_name, category, dosage_strength,
		       medicine_form, pack_size, buying_price, selling_price, current_stock,
		       reorder_level, manufacturer, description, is_archived, created_at
		FROM medicines WHERE id = ?`

	var m models.Medicine
	var isArchivedInt int
	err := s.db.QueryRow(query, id).Scan(
		&m.ID, &m.Name, &m.GenericName, &m.BrandName, &m.Category, &m.DosageStrength,
		&m.MedicineForm, &m.PackSize, &m.BuyingPrice, &m.SellingPrice, &m.CurrentStock,
		&m.ReorderLevel, &m.Manufacturer, &m.Description, &isArchivedInt, &m.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("medicine not found")
	}
	if err != nil {
		return nil, err
	}
	m.IsArchived = isArchivedInt == 1
	return &m, nil
}

// BulkImportMedicines imports multiple medicines within a single transaction.
func (s *MedicineService) BulkImportMedicines(medicines []models.Medicine, userID int64, username string) (int, error) {
	if len(medicines) == 0 {
		return 0, nil
	}

	tx, err := s.db.Begin()
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO medicines (
			name, generic_name, brand_name, category, dosage_strength,
			medicine_form, pack_size, buying_price, selling_price,
			current_stock, reorder_level, manufacturer, description, is_archived
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
	if err != nil {
		return 0, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	importedCount := 0
	for _, med := range medicines {
		if med.Name == "" {
			continue
		}
		_, err := stmt.Exec(
			med.Name, med.GenericName, med.BrandName, med.Category, med.DosageStrength,
			med.MedicineForm, med.PackSize, med.BuyingPrice, med.SellingPrice,
			med.CurrentStock, med.ReorderLevel, med.Manufacturer, med.Description,
		)
		if err != nil {
			return 0, fmt.Errorf("failed to insert medicine %s: %w", med.Name, err)
		}
		importedCount++
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	s.logAction(userID, username, "BULK_IMPORT_MEDICINES", fmt.Sprintf("Bulk imported %d medicines", importedCount))
	return importedCount, nil
}

func (s *MedicineService) logAction(userID int64, username, action, details string) {
	_, _ = s.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}

