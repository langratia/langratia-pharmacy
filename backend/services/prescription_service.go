package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"app/backend/db"
	"app/backend/models"
)

type PrescriptionService struct {
	db           *db.DB
	batchService *BatchService
}

func NewPrescriptionService(database *db.DB, batchService ...*BatchService) *PrescriptionService {
	var bs *BatchService
	if len(batchService) > 0 && batchService[0] != nil {
		bs = batchService[0]
	} else {
		bs = NewBatchService(database)
	}
	return &PrescriptionService{db: database, batchService: bs}
}

type PrescriptionItemInput struct {
	MedicineID         int64  `json:"medicine_id"`
	Dosage             string `json:"dosage"`
	Frequency          string `json:"frequency"`
	DurationDays       int    `json:"duration_days"`
	QuantityPrescribed int    `json:"quantity_prescribed"`
}

// CreatePrescription creates a new patient prescription.
func (p *PrescriptionService) CreatePrescription(userID int64, username string, patientName string, patientAge int, patientPhone string, doctorName string, doctorContact string, notes string, items []PrescriptionItemInput) (*models.Prescription, error) {
	if patientName == "" {
		return nil, fmt.Errorf("patient name is required")
	}
	if patientAge <= 0 {
		return nil, fmt.Errorf("patient age must be positive")
	}
	if doctorName == "" {
		return nil, fmt.Errorf("doctor name is required")
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("at least one medicine item is required")
	}
	for i, item := range items {
		if item.MedicineID <= 0 {
			return nil, fmt.Errorf("item %d: invalid medicine", i)
		}
		if item.Dosage == "" {
			return nil, fmt.Errorf("item %d: dosage is required", i)
		}
		if item.Frequency == "" {
			return nil, fmt.Errorf("item %d: frequency is required", i)
		}
		if item.DurationDays <= 0 {
			return nil, fmt.Errorf("item %d: duration must be positive", i)
		}
		if item.QuantityPrescribed <= 0 {
			return nil, fmt.Errorf("item %d: quantity must be positive", i)
		}
	}

	tx, err := p.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	b := make([]byte, 4)
	rand.Read(b)
	rxNumber := fmt.Sprintf("RX-%s-%s", time.Now().Format("20060102"), hex.EncodeToString(b))

	res, err := tx.Exec(`
		INSERT INTO prescriptions (prescription_number, patient_name, patient_age, patient_phone, doctor_name, doctor_contact, status, notes, created_by)
		VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
		rxNumber, patientName, patientAge, patientPhone, doctorName, doctorContact, notes, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert prescription: %w", err)
	}

	prescriptionID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	var rxItems []models.PrescriptionItem
	for _, item := range items {
		itemRes, err := tx.Exec(`
			INSERT INTO prescription_items (prescription_id, medicine_id, dosage, frequency, duration_days, quantity_prescribed, quantity_dispensed)
			VALUES (?, ?, ?, ?, ?, ?, 0)`,
			prescriptionID, item.MedicineID, item.Dosage, item.Frequency, item.DurationDays, item.QuantityPrescribed,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to insert prescription item: %w", err)
		}

		itemID, err := itemRes.LastInsertId()
		if err != nil {
			return nil, fmt.Errorf("failed to get insert id for prescription item: %w", err)
		}
		var medName string
		if err := tx.QueryRow(`SELECT name FROM medicines WHERE id = ?`, item.MedicineID).Scan(&medName); err != nil {
			medName = ""
		}

		rxItems = append(rxItems, models.PrescriptionItem{
			ID:                 itemID,
			PrescriptionID:     prescriptionID,
			MedicineID:         item.MedicineID,
			MedicineName:       medName,
			Dosage:             item.Dosage,
			Frequency:          item.Frequency,
			DurationDays:       item.DurationDays,
			QuantityPrescribed: item.QuantityPrescribed,
			QuantityDispensed:  0,
		})
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	p.logAction(userID, username, "CREATE_PRESCRIPTION", fmt.Sprintf("Created prescription %s for %s", rxNumber, patientName))

	return &models.Prescription{
		ID:                 prescriptionID,
		PrescriptionNumber: rxNumber,
		PatientName:        patientName,
		PatientAge:         patientAge,
		PatientPhone:       patientPhone,
		DoctorName:         doctorName,
		DoctorContact:      doctorContact,
		Status:             "Pending",
		Notes:              notes,
		CreatedBy:          &userID,
		CreatedByName:      username,
		CreatedAt:          time.Now(),
		Items:              rxItems,
	}, nil
}

// ListPrescriptions fetches prescriptions with optional status and search filtering.
func (p *PrescriptionService) ListPrescriptions(status string, search string, limit int) ([]models.Prescription, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT p.id, p.prescription_number, p.patient_name, p.patient_age, p.patient_phone, p.doctor_name, p.doctor_contact, p.status, p.notes, p.created_by, COALESCE(u.username, 'System'), p.created_at
		FROM prescriptions p
		LEFT JOIN users u ON p.created_by = u.id WHERE 1=1`
	
	args := []interface{}{}
	if status != "" && status != "All" {
		query += ` AND p.status = ?`
		args = append(args, status)
	}
	if search != "" {
		query += ` AND (p.prescription_number LIKE ? OR p.patient_name LIKE ? OR p.doctor_name LIKE ?)`
		searchPattern := "%" + EscapeLike(search) + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
	}

	query += ` ORDER BY p.created_at DESC LIMIT ?`
	args = append(args, limit)

	rows, err := p.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Prescription
	for rows.Next() {
		var rx models.Prescription
		var uid sql.NullInt64
		err := rows.Scan(
			&rx.ID, &rx.PrescriptionNumber, &rx.PatientName, &rx.PatientAge, &rx.PatientPhone,
			&rx.DoctorName, &rx.DoctorContact, &rx.Status, &rx.Notes, &uid, &rx.CreatedByName, &rx.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		if uid.Valid {
			rx.CreatedBy = &uid.Int64
		}
		list = append(list, rx)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return list, nil
}

// GetPrescriptionDetails retrieves full details of a prescription including its items.
func (p *PrescriptionService) GetPrescriptionDetails(prescriptionID int64) (*models.Prescription, error) {
	query := `
		SELECT p.id, p.prescription_number, p.patient_name, p.patient_age, p.patient_phone, p.doctor_name, p.doctor_contact, p.status, p.notes, p.created_by, COALESCE(u.username, 'System'), p.created_at
		FROM prescriptions p
		LEFT JOIN users u ON p.created_by = u.id
		WHERE p.id = ?`

	var rx models.Prescription
	var uid sql.NullInt64
	err := p.db.QueryRow(query, prescriptionID).Scan(
		&rx.ID, &rx.PrescriptionNumber, &rx.PatientName, &rx.PatientAge, &rx.PatientPhone,
		&rx.DoctorName, &rx.DoctorContact, &rx.Status, &rx.Notes, &uid, &rx.CreatedByName, &rx.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("prescription not found: %w", err)
	}
	if uid.Valid {
		rx.CreatedBy = &uid.Int64
	}

	// Fetch Items
	itemQuery := `
		SELECT pi.id, pi.prescription_id, pi.medicine_id, m.name, m.selling_price, m.current_stock, pi.dosage, pi.frequency, pi.duration_days, pi.quantity_prescribed, pi.quantity_dispensed
		FROM prescription_items pi
		JOIN medicines m ON pi.medicine_id = m.id
		WHERE pi.prescription_id = ?`

	rows, err := p.db.Query(itemQuery, prescriptionID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch prescription items: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var pi models.PrescriptionItem
		if err := rows.Scan(
			&pi.ID, &pi.PrescriptionID, &pi.MedicineID, &pi.MedicineName, &pi.MedicinePrice, &pi.CurrentStock,
			&pi.Dosage, &pi.Frequency, &pi.DurationDays, &pi.QuantityPrescribed, &pi.QuantityDispensed,
		); err != nil {
			return nil, fmt.Errorf("failed to scan prescription item: %w", err)
		}
		rx.Items = append(rx.Items, pi)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating prescription items: %w", err)
	}

	return &rx, nil
}

// UpdatePrescriptionStatus updates status ('Pending', 'Dispensed', 'Cancelled')
func (p *PrescriptionService) UpdatePrescriptionStatus(userID int64, username string, prescriptionID int64, status string) error {
	validStatuses := map[string]bool{"Pending": true, "Dispensed": true, "Cancelled": true}
	if !validStatuses[status] {
		return fmt.Errorf("invalid status: %s (must be Pending, Dispensed, or Cancelled)", status)
	}

	tx, err := p.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if status == "Dispensed" {
		rows, err := tx.Query(`SELECT medicine_id, quantity_prescribed, quantity_dispensed FROM prescription_items WHERE prescription_id = ?`, prescriptionID)
		if err != nil {
			return fmt.Errorf("failed to query prescription items: %w", err)
		}

		type dispenseItem struct {
			medicineID int64
			qty        int
		}
		var itemsToDeduct []dispenseItem

		for rows.Next() {
			var medID int64
			var qPrescribed, qDispensed int
			if err := rows.Scan(&medID, &qPrescribed, &qDispensed); err == nil {
				needed := qPrescribed - qDispensed
				if needed > 0 {
					itemsToDeduct = append(itemsToDeduct, dispenseItem{medicineID: medID, qty: needed})
				}
			}
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return err
		}
		rows.Close()

		for _, item := range itemsToDeduct {
			if p.batchService != nil {
				if _, err := p.batchService.DeductStockFEFO(tx, item.medicineID, item.qty); err != nil {
					return fmt.Errorf("failed FEFO stock deduction for medicine ID %d: %w", item.medicineID, err)
				}
			}
			_, _ = tx.Exec(`UPDATE prescription_items SET quantity_dispensed = quantity_prescribed WHERE prescription_id = ? AND medicine_id = ?`, prescriptionID, item.medicineID)
		}
	}

	_, err = tx.Exec(`UPDATE prescriptions SET status = ? WHERE id = ?`, status, prescriptionID)
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	p.logAction(userID, username, "UPDATE_PRESCRIPTION_STATUS", fmt.Sprintf("Updated prescription ID %d status to %s", prescriptionID, status))
	return nil
}

func (p *PrescriptionService) logAction(userID int64, username, action, details string) {
	logAudit(p.db, userID, username, action, details)
}
