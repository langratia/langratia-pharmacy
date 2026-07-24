package services

import (
	"database/sql"
	"fmt"
	"time"

	"app/backend/db"
	"app/backend/models"
)

type PrescriptionService struct {
	db *db.DB
}

func NewPrescriptionService(database *db.DB) *PrescriptionService {
	return &PrescriptionService{db: database}
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
	if doctorName == "" {
		return nil, fmt.Errorf("doctor name is required")
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("at least one medicine item is required")
	}

	tx, err := p.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	rxNumber := fmt.Sprintf("RX-%s-%d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)

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

		itemID, _ := itemRes.LastInsertId()
		var medName string
		_ = tx.QueryRow(`SELECT name FROM medicines WHERE id = ?`, item.MedicineID).Scan(&medName)

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

// ListPrescriptions fetches prescriptions with optional status filtering.
func (p *PrescriptionService) ListPrescriptions(status string, limit int) ([]models.Prescription, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT p.id, p.prescription_number, p.patient_name, p.patient_age, p.patient_phone, p.doctor_name, p.doctor_contact, p.status, p.notes, p.created_by, COALESCE(u.username, 'System'), p.created_at
		FROM prescriptions p
		LEFT JOIN users u ON p.created_by = u.id`
	
	args := []interface{}{}
	if status != "" && status != "All" {
		query += ` WHERE p.status = ?`
		args = append(args, status)
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
		return nil, err
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
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var pi models.PrescriptionItem
			err := rows.Scan(
				&pi.ID, &pi.PrescriptionID, &pi.MedicineID, &pi.MedicineName, &pi.MedicinePrice, &pi.CurrentStock,
				&pi.Dosage, &pi.Frequency, &pi.DurationDays, &pi.QuantityPrescribed, &pi.QuantityDispensed,
			)
			if err == nil {
				rx.Items = append(rx.Items, pi)
			}
		}
	}

	return &rx, nil
}

// UpdatePrescriptionStatus updates status ('Pending', 'Dispensed', 'Cancelled')
func (p *PrescriptionService) UpdatePrescriptionStatus(userID int64, username string, prescriptionID int64, status string) error {
	_, err := p.db.Exec(`UPDATE prescriptions SET status = ? WHERE id = ?`, status, prescriptionID)
	if err != nil {
		return err
	}

	p.logAction(userID, username, "UPDATE_PRESCRIPTION_STATUS", fmt.Sprintf("Updated prescription ID %d status to %s", prescriptionID, status))
	return nil
}

func (p *PrescriptionService) logAction(userID int64, username, action, details string) {
	_, _ = p.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}
