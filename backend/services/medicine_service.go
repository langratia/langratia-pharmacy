package services

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"app/backend/db"
	"app/backend/models"
)

type MedicineService struct {
	db *db.DB
}

func NewMedicineService(database *db.DB) *MedicineService {
	return &MedicineService{db: database}
}

const medicineCols = `m.id, m.name, m.generic_name, m.brand_name,
	m.category, m.dosage_strength, m.medicine_form, m.pack_size,
	m.buying_price, m.selling_price, m.current_stock, m.reorder_level,
	m.manufacturer, m.supplier_id, m.description,
	m.tax_rate, m.requires_prescription, m.product_status,
	m.is_archived, m.created_at`

const medicineJoin = `FROM medicines m LEFT JOIN suppliers s ON m.supplier_id = s.id`

// AddMedicine creates a new medicine entry.
func (s *MedicineService) AddMedicine(med models.Medicine, userID int64, username string) (*models.Medicine, error) {
	if med.Name == "" {
		return nil, errors.New("medicine name is required")
	}

	// Check for existing active medicine with the same name to prevent duplicates
	var existingID int64
	var existingStock int
	err := s.db.QueryRow(`SELECT id, current_stock FROM medicines WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND is_archived = 0`, med.Name).Scan(&existingID, &existingStock)
	if err == nil {
		return nil, fmt.Errorf("a medicine named '%s' already exists (ID: %d, Current Stock: %d). Please update the existing medicine's stock instead of creating a duplicate entry", med.Name, existingID, existingStock)
	}

	query := `
		INSERT INTO medicines (
			name, generic_name, brand_name, category, dosage_strength,
			medicine_form, pack_size, buying_price, selling_price,
			current_stock, reorder_level, manufacturer, supplier_id, description,
			tax_rate, requires_prescription, product_status, is_archived
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`

	res, err := s.db.Exec(query,
		med.Name, med.GenericName, med.BrandName, med.Category, med.DosageStrength,
		med.MedicineForm, med.PackSize, med.BuyingPrice, med.SellingPrice,
		med.CurrentStock, med.ReorderLevel, med.Manufacturer, med.SupplierID, med.Description,
		med.TaxRate, boolToInt(med.RequiresPrescription), med.ProductStatus,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to add medicine: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	med.ID = id

	// If initial stock is provided, create an initial batch so FEFO POS stock deduction functions seamlessly
	if med.CurrentStock > 0 {
		batchNum := fmt.Sprintf("BATCH-INIT-%d", med.ID)
		expiryDate := time.Now().AddDate(1, 0, 0).Format("2006-01-02")
		_, _ = s.db.Exec(`
			INSERT INTO batches (batch_number, medicine_id, supplier_id, quantity_received, quantity_remaining, buying_price, expiry_date)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			batchNum, med.ID, med.SupplierID, med.CurrentStock, med.CurrentStock, med.BuyingPrice, expiryDate,
		)
	}

	if err := s.syncMedicineUnits(id, med.Units); err != nil {
		s.logAction(userID, username, "ADD_MEDICINE_WARNING", fmt.Sprintf("Added medicine %s but failed to sync units: %v", med.Name, err))
	}

	s.logAction(userID, username, "ADD_MEDICINE", fmt.Sprintf("Added medicine %s (ID: %d)", med.Name, med.ID))
	return &med, nil
}

// UpdateMedicine updates an existing medicine entry with field-level audit.
func (s *MedicineService) UpdateMedicine(med models.Medicine, userID int64, username string) error {
	if med.ID <= 0 || med.Name == "" {
		return errors.New("valid medicine ID and name are required")
	}

	old, err := s.GetMedicineByID(med.ID)
	if err != nil {
		return fmt.Errorf("failed to fetch current medicine state: %w", err)
	}

	query := `
		UPDATE medicines SET
			name = ?, generic_name = ?, brand_name = ?,
			category = ?, dosage_strength = ?, medicine_form = ?, pack_size = ?,
			buying_price = ?, selling_price = ?,
			current_stock = ?, reorder_level = ?,
			manufacturer = ?, supplier_id = ?, description = ?,
			tax_rate = ?, requires_prescription = ?, product_status = ?
		WHERE id = ?`

	res, err := s.db.Exec(query,
		med.Name, med.GenericName, med.BrandName,
		med.Category, med.DosageStrength, med.MedicineForm, med.PackSize,
		med.BuyingPrice, med.SellingPrice,
		med.CurrentStock, med.ReorderLevel,
		med.Manufacturer, med.SupplierID, med.Description,
		med.TaxRate, boolToInt(med.RequiresPrescription), med.ProductStatus,
		med.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update medicine: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return errors.New("medicine not found")
	}

	// Field-level audit diff
	var changes []string
	checkChange(&changes, "name", old.Name, med.Name)
	checkChange(&changes, "generic_name", old.GenericName, med.GenericName)
	checkChange(&changes, "brand_name", old.BrandName, med.BrandName)
	checkChange(&changes, "category", old.Category, med.Category)
	checkChange(&changes, "dosage_strength", old.DosageStrength, med.DosageStrength)
	checkChange(&changes, "medicine_form", old.MedicineForm, med.MedicineForm)
	checkChange(&changes, "pack_size", old.PackSize, med.PackSize)
	checkChangeFloat(&changes, "buying_price", old.BuyingPrice, med.BuyingPrice)
	checkChangeFloat(&changes, "selling_price", old.SellingPrice, med.SellingPrice)
	checkChangeInt(&changes, "current_stock", old.CurrentStock, med.CurrentStock)
	checkChangeInt(&changes, "reorder_level", old.ReorderLevel, med.ReorderLevel)
	checkChange(&changes, "manufacturer", old.Manufacturer, med.Manufacturer)
	checkChangeSupplier(&changes, "supplier", old.SupplierID, old.SupplierName, med.SupplierID)
	checkChangeFloat(&changes, "tax_rate", old.TaxRate, med.TaxRate)
	checkChangeBool(&changes, "requires_prescription", old.RequiresPrescription, med.RequiresPrescription)
	checkChange(&changes, "product_status", old.ProductStatus, med.ProductStatus)

	if len(changes) > 0 {
		s.logAction(userID, username, "UPDATE_MEDICINE",
			fmt.Sprintf("Updated medicine %s (ID: %d): %s", med.Name, med.ID, strings.Join(changes, "; ")))
	} else {
		s.logAction(userID, username, "UPDATE_MEDICINE",
			fmt.Sprintf("Updated medicine %s (ID: %d) — no field changes", med.Name, med.ID))
	}

	// Always sync units, since we don't track field-level changes for nested arrays easily yet
	if err := s.syncMedicineUnits(med.ID, med.Units); err != nil {
		s.logAction(userID, username, "UPDATE_MEDICINE_WARNING", fmt.Sprintf("Failed to sync units for %s: %v", med.Name, err))
	}

	return nil
}

// ArchiveMedicine toggles the archive status of a medicine.
func (s *MedicineService) ArchiveMedicine(id int64, archive bool, userID int64, username string) error {
	archivedVal := 0
	if archive {
		archivedVal = 1
	}

	res, err := s.db.Exec(`UPDATE medicines SET is_archived = ? WHERE id = ?`, archivedVal, id)
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
	query := `SELECT ` + medicineCols + `, s.name as supplier_name ` + medicineJoin + ` WHERE 1=1`
	var args []interface{}

	if !includeArchived {
		query += ` AND m.is_archived = 0`
	}
	if category != "" && category != "All" {
		query += ` AND m.category = ?`
		args = append(args, category)
	}
	if search != "" {
		query += ` AND (m.name LIKE ? OR m.generic_name LIKE ? OR m.brand_name LIKE ?)`
		pattern := "%" + EscapeLike(search) + "%"
		args = append(args, pattern, pattern, pattern)
	}

	query += ` ORDER BY m.name ASC`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query medicines: %w", err)
	}
	defer rows.Close()

	var medicines []models.Medicine
	for rows.Next() {
		var m models.Medicine
		var supName sql.NullString
		var isArchivedInt int
		var reqRxInt int
		err := rows.Scan(
			&m.ID, &m.Name, &m.GenericName, &m.BrandName,
			&m.Category, &m.DosageStrength, &m.MedicineForm, &m.PackSize,
			&m.BuyingPrice, &m.SellingPrice, &m.CurrentStock, &m.ReorderLevel,
			&m.Manufacturer, &m.SupplierID, &m.Description,
			&m.TaxRate, &reqRxInt, &m.ProductStatus,
			&isArchivedInt, &m.CreatedAt, &supName,
		)
		if err != nil {
			return nil, err
		}
		m.IsArchived = isArchivedInt == 1
		m.RequiresPrescription = reqRxInt == 1
		if supName.Valid {
			m.SupplierName = supName.String
		}
		medicines = append(medicines, m)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return s.populateUnits(medicines)
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
		baseWhere += ` AND m.is_archived = 0`
	}
	if category != "" && category != "All" {
		baseWhere += ` AND m.category = ?`
		args = append(args, category)
	}
	if search != "" {
		baseWhere += ` AND (m.name LIKE ? OR m.generic_name LIKE ? OR m.brand_name LIKE ?)`
		pattern := "%" + EscapeLike(search) + "%"
		args = append(args, pattern, pattern, pattern)
	}

	countQuery := `SELECT COUNT(*) ` + medicineJoin + baseWhere
	var totalCount int
	if err := s.db.QueryRow(countQuery, args...).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("failed to count medicines: %w", err)
	}

	query := `SELECT ` + medicineCols + `, s.name as supplier_name ` + medicineJoin + baseWhere + ` ORDER BY m.name ASC LIMIT ? OFFSET ?`
	queryArgs := append(args, pageSize, offset)

	rows, err := s.db.Query(query, queryArgs...)
	if err != nil {
		return nil, fmt.Errorf("failed to query medicines: %w", err)
	}
	defer rows.Close()

	var medicines []models.Medicine
	for rows.Next() {
		var m models.Medicine
		var supName sql.NullString
		var isArchivedInt int
		var reqRxInt int
		err := rows.Scan(
			&m.ID, &m.Name, &m.GenericName, &m.BrandName,
			&m.Category, &m.DosageStrength, &m.MedicineForm, &m.PackSize,
			&m.BuyingPrice, &m.SellingPrice, &m.CurrentStock, &m.ReorderLevel,
			&m.Manufacturer, &m.SupplierID, &m.Description,
			&m.TaxRate, &reqRxInt, &m.ProductStatus,
			&isArchivedInt, &m.CreatedAt, &supName,
		)
		if err != nil {
			return nil, err
		}
		m.IsArchived = isArchivedInt == 1
		m.RequiresPrescription = reqRxInt == 1
		if supName.Valid {
			m.SupplierName = supName.String
		}
		medicines = append(medicines, m)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	medicines, _ = s.populateUnits(medicines)

	return &models.PaginatedMedicines{
		Items:      medicines,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

// GetMedicineByID fetches a single medicine by ID.
func (s *MedicineService) GetMedicineByID(id int64) (*models.Medicine, error) {
	query := `SELECT ` + medicineCols + `, s.name as supplier_name ` + medicineJoin + ` WHERE m.id = ?`
	var m models.Medicine
	var supName sql.NullString
	var isArchivedInt int
	var reqRxInt int
	err := s.db.QueryRow(query, id).Scan(
		&m.ID, &m.Name, &m.GenericName, &m.BrandName,
		&m.Category, &m.DosageStrength, &m.MedicineForm, &m.PackSize,
		&m.BuyingPrice, &m.SellingPrice, &m.CurrentStock, &m.ReorderLevel,
		&m.Manufacturer, &m.SupplierID, &m.Description,
		&m.TaxRate, &reqRxInt, &m.ProductStatus,
		&isArchivedInt, &m.CreatedAt, &supName,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("medicine not found")
		}
		return nil, err
	}
	
	meds, _ := s.populateUnits([]models.Medicine{m})
	if len(meds) > 0 {
		return &meds[0], nil
	}
	
	m.IsArchived = isArchivedInt == 1
	m.RequiresPrescription = reqRxInt == 1
	if supName.Valid {
		m.SupplierName = supName.String
	}
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
			current_stock, reorder_level, manufacturer, supplier_id, description,
			tax_rate, requires_prescription, product_status, is_archived
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
	if err != nil {
		return 0, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	importedCount := 0
	for _, med := range medicines {
		if med.Name == "" {
			continue
		}

		// Check if medicine already exists by name
		var existingID int64
		err := tx.QueryRow(`SELECT id FROM medicines WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND is_archived = 0`, med.Name).Scan(&existingID)
		if err == nil {
			// Update stock and price of existing medicine instead of creating duplicate
			_, err = tx.Exec(`UPDATE medicines SET current_stock = current_stock + ?, buying_price = ?, selling_price = ? WHERE id = ?`,
				med.CurrentStock, med.BuyingPrice, med.SellingPrice, existingID)
			if err != nil {
				return 0, fmt.Errorf("failed to update existing medicine %s: %w", med.Name, err)
			}
		} else {
			// Insert new medicine
			_, err = stmt.Exec(
				med.Name, med.GenericName, med.BrandName, med.Category, med.DosageStrength,
				med.MedicineForm, med.PackSize, med.BuyingPrice, med.SellingPrice,
				med.CurrentStock, med.ReorderLevel, med.Manufacturer, med.SupplierID, med.Description,
				med.TaxRate, boolToInt(med.RequiresPrescription), med.ProductStatus,
			)
			if err != nil {
				return 0, fmt.Errorf("failed to insert medicine %s: %w", med.Name, err)
			}
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
	logAudit(s.db, userID, username, action, details)
}

// --- helpers ---

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func checkChange(changes *[]string, field, old, new string) {
	if old != new {
		*changes = append(*changes, fmt.Sprintf("%s: '%s' -> '%s'", field, old, new))
	}
}

func checkChangeInt(changes *[]string, field string, old, new int) {
	if old != new {
		*changes = append(*changes, fmt.Sprintf("%s: %d -> %d", field, old, new))
	}
}

func checkChangeFloat(changes *[]string, field string, old, new float64) {
	if old != new {
		*changes = append(*changes, fmt.Sprintf("%s: %.2f -> %.2f", field, old, new))
	}
}

func checkChangeBool(changes *[]string, field string, old, new bool) {
	if old != new {
		*changes = append(*changes, fmt.Sprintf("%s: %t -> %t", field, old, new))
	}
}

func checkChangeSupplier(changes *[]string, field string, oldID *int64, oldName string, newID *int64) {
	oldStr := "(none)"
	if oldID != nil {
		oldStr = fmt.Sprintf("%s (ID %d)", oldName, *oldID)
	}
	newStr := "(none)"
	if newID != nil {
		newStr = fmt.Sprintf("(ID %d)", *newID)
	}
	if (oldID == nil && newID != nil) || (oldID != nil && newID == nil) || (oldID != nil && newID != nil && *oldID != *newID) {
		*changes = append(*changes, fmt.Sprintf("%s: %s -> %s", field, oldStr, newStr))
	}
}

func (s *MedicineService) syncMedicineUnits(medID int64, units []models.MedicineUnit) error {
	// Simple approach: delete existing and insert new ones
	if _, err := s.db.Exec(`DELETE FROM medicine_units WHERE medicine_id = ?`, medID); err != nil {
		return err
	}
	
	if len(units) == 0 {
		return nil
	}
	
	for _, u := range units {
		isBase := 0
		if u.IsBaseUnit {
			isBase = 1
		}
		if _, err := s.db.Exec(`INSERT INTO medicine_units (medicine_id, unit_name, conversion_factor, price, is_base_unit) VALUES (?, ?, ?, ?, ?)`,
			medID, u.UnitName, u.ConversionFactor, u.Price, isBase); err != nil {
			return err
		}
	}
	return nil
}

func (s *MedicineService) populateUnits(medicines []models.Medicine) ([]models.Medicine, error) {
	if len(medicines) == 0 {
		return medicines, nil
	}
	
	rows, err := s.db.Query(`SELECT id, medicine_id, unit_name, conversion_factor, price, is_base_unit FROM medicine_units`)
	if err != nil {
		return medicines, nil
	}
	defer rows.Close()

	unitMap := make(map[int64][]models.MedicineUnit)
	for rows.Next() {
		var u models.MedicineUnit
		var isBase int
		if err := rows.Scan(&u.ID, &u.MedicineID, &u.UnitName, &u.ConversionFactor, &u.Price, &isBase); err == nil {
			u.IsBaseUnit = isBase == 1
			unitMap[u.MedicineID] = append(unitMap[u.MedicineID], u)
		}
	}
	if err := rows.Err(); err != nil {
		log.Printf("medicine_service: error iterating units: %v", err)
	}

	for i := range medicines {
		if units, ok := unitMap[medicines[i].ID]; ok && len(units) > 0 {
			medicines[i].Units = units
		} else {
			medicines[i].Units = []models.MedicineUnit{
				{MedicineID: medicines[i].ID, UnitName: "Tablet/Item", ConversionFactor: 1, Price: medicines[i].SellingPrice, IsBaseUnit: true},
			}
		}
	}

	return medicines, nil
}
