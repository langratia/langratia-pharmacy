package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"app/backend/db"
	"app/backend/models"
)

type BatchService struct {
	db *db.DB
}

type BatchDeduction struct {
	BatchID          int64   `json:"batch_id"`
	BatchNumber      string  `json:"batch_number"`
	QuantityDeducted int     `json:"quantity_deducted"`
	BuyingPrice      float64 `json:"buying_price"`
	ExpiryDate       string  `json:"expiry_date"`
}

func NewBatchService(database *db.DB) *BatchService {
	return &BatchService{db: database}
}

// AddBatch creates a new inventory batch and updates the overall medicine stock.
func (s *BatchService) AddBatch(batch models.Batch, userID int64, username string) (*models.Batch, error) {
	if batch.BatchNumber == "" || batch.MedicineID <= 0 || batch.QuantityReceived <= 0 || batch.ExpiryDate == "" {
		return nil, errors.New("invalid batch details: batch number, medicine, quantity, and expiry date are required")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	batch.QuantityRemaining = batch.QuantityReceived

	query := `
		INSERT INTO batches (batch_number, medicine_id, supplier_id, quantity_received, quantity_remaining, buying_price, mfg_date, expiry_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	res, err := tx.Exec(query,
		batch.BatchNumber, batch.MedicineID, batch.SupplierID,
		batch.QuantityReceived, batch.QuantityRemaining, batch.BuyingPrice,
		batch.MfgDate, batch.ExpiryDate,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert batch: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	batch.ID = id

	// Recalculate and update current_stock in medicines table
	if err := s.updateMedicineStockTx(tx, batch.MedicineID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.logAction(userID, username, "ADD_BATCH", fmt.Sprintf("Added batch %s for medicine ID %d (Qty: %d)", batch.BatchNumber, batch.MedicineID, batch.QuantityReceived))
	return &batch, nil
}

// GetBatchesByMedicine retrieves all batches for a medicine, ordered by expiry date (FEFO).
func (s *BatchService) GetBatchesByMedicine(medicineID int64) ([]models.Batch, error) {
	query := `
		SELECT b.id, b.batch_number, b.medicine_id, m.name, b.supplier_id, COALESCE(sup.name, ''),
		       b.quantity_received, b.quantity_remaining, b.buying_price, b.mfg_date, b.expiry_date, b.date_received
		FROM batches b
		JOIN medicines m ON b.medicine_id = m.id
		LEFT JOIN suppliers sup ON b.supplier_id = sup.id
		WHERE b.medicine_id = ?
		ORDER BY b.expiry_date ASC`

	rows, err := s.db.Query(query, medicineID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var batches []models.Batch
	for rows.Next() {
		var b models.Batch
		var supplierID sql.NullInt64
		err := rows.Scan(
			&b.ID, &b.BatchNumber, &b.MedicineID, &b.MedicineName, &supplierID, &b.SupplierName,
			&b.QuantityReceived, &b.QuantityRemaining, &b.BuyingPrice, &b.MfgDate, &b.ExpiryDate, &b.DateReceived,
		)
		if err != nil {
			return nil, err
		}
		if supplierID.Valid {
			b.SupplierID = &supplierID.Int64
		}
		batches = append(batches, b)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return batches, nil
}

// DeductStockFEFO deducts requested quantity using First Expiry First Out (FEFO) principle within a transaction.
func (s *BatchService) DeductStockFEFO(tx *sql.Tx, medicineID int64, quantityToDeduct int) ([]BatchDeduction, error) {
	if quantityToDeduct <= 0 {
		return nil, errors.New("quantity to deduct must be greater than zero")
	}

	todayStr := time.Now().Format("2006-01-02")

	// Query available non-expired batches ordered by earliest expiry date (FEFO)
	query := `
		SELECT id, batch_number, quantity_remaining, buying_price, expiry_date
		FROM batches
		WHERE medicine_id = ? AND quantity_remaining > 0 AND expiry_date >= ?
		ORDER BY expiry_date ASC`

	rows, err := tx.Query(query, medicineID, todayStr)
	if err != nil {
		return nil, fmt.Errorf("failed to query batches for FEFO deduction: %w", err)
	}

	type AvailableBatch struct {
		ID                int64
		BatchNumber       string
		QuantityRemaining int
		BuyingPrice       float64
		ExpiryDate        string
	}
	var availables []AvailableBatch

	for rows.Next() {
		var ab AvailableBatch
		if err := rows.Scan(&ab.ID, &ab.BatchNumber, &ab.QuantityRemaining, &ab.BuyingPrice, &ab.ExpiryDate); err != nil {
			rows.Close()
			return nil, err
		}
		availables = append(availables, ab)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	// Calculate total stock available in non-expired batches
	totalAvail := 0
	for _, b := range availables {
		totalAvail += b.QuantityRemaining
	}

	if totalAvail < quantityToDeduct {
		return nil, fmt.Errorf("insufficient stock: requested %d, available non-expired stock is %d", quantityToDeduct, totalAvail)
	}

	var deductions []BatchDeduction
	remainingToDeduct := quantityToDeduct

	for _, b := range availables {
		if remainingToDeduct <= 0 {
			break
		}

		deduct := b.QuantityRemaining
		if remainingToDeduct < deduct {
			deduct = remainingToDeduct
		}

		// Update batch quantity_remaining
		_, err := tx.Exec(`UPDATE batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?`, deduct, b.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to deduct batch stock: %w", err)
		}

		deductions = append(deductions, BatchDeduction{
			BatchID:          b.ID,
			BatchNumber:      b.BatchNumber,
			QuantityDeducted: deduct,
			BuyingPrice:      b.BuyingPrice,
			ExpiryDate:       b.ExpiryDate,
		})

		remainingToDeduct -= deduct
	}

	// Update current_stock in medicines table
	if err := s.updateMedicineStockTx(tx, medicineID); err != nil {
		return nil, err
	}

	return deductions, nil
}

// AdjustStock handles manual stock adjustments (Damaged, Expired, Lost, Counting Error, Customer Return).
func (s *BatchService) AdjustStock(medicineID int64, batchID *int64, userID int64, username string, qtyAdjusted int, reason, notes string) error {
	if medicineID <= 0 || qtyAdjusted == 0 || reason == "" {
		return errors.New("medicine ID, non-zero adjusted quantity, and reason are required")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// If batchID specified, adjust batch stock directly
	if batchID != nil && *batchID > 0 {
		_, err := tx.Exec(`UPDATE batches SET quantity_remaining = quantity_remaining + ? WHERE id = ?`, qtyAdjusted, *batchID)
		if err != nil {
			return fmt.Errorf("failed to update batch stock: %w", err)
		}
	} else {
		// If no batch is specified, adjust batch stock on the most recent batch or create/update active batch
		var latestBatchID int64
		err := tx.QueryRow(`SELECT id FROM batches WHERE medicine_id = ? ORDER BY expiry_date DESC LIMIT 1`, medicineID).Scan(&latestBatchID)
		if err == nil {
			_, err = tx.Exec(`UPDATE batches SET quantity_remaining = quantity_remaining + ? WHERE id = ?`, qtyAdjusted, latestBatchID)
			if err != nil {
				return fmt.Errorf("failed to update batch stock: %w", err)
			}
			batchID = &latestBatchID
		} else {
			// If no batch exists at all, insert a default adjustment batch
			batchNum := fmt.Sprintf("BATCH-ADJ-%d-%d", medicineID, time.Now().Unix())
			expDate := time.Now().AddDate(1, 0, 0).Format("2006-01-02")
			res, err := tx.Exec(`INSERT INTO batches (batch_number, medicine_id, quantity_received, quantity_remaining, buying_price, expiry_date) VALUES (?, ?, ?, ?, 0.0, ?)`,
				batchNum, medicineID, qtyAdjusted, qtyAdjusted, expDate)
			if err != nil {
				return fmt.Errorf("failed to create batch for stock adjustment: %w", err)
			}
			newID, _ := res.LastInsertId()
			batchID = &newID
		}
	}

	// Record Stock Adjustment
	_, err = tx.Exec(
		`INSERT INTO stock_adjustments (medicine_id, batch_id, user_id, quantity_adjusted, reason, notes) VALUES (?, ?, ?, ?, ?, ?)`,
		medicineID, batchID, userID, qtyAdjusted, reason, notes,
	)
	if err != nil {
		return fmt.Errorf("failed to record stock adjustment: %w", err)
	}

	// Update medicine overall stock
	if err := s.updateMedicineStockTx(tx, medicineID); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	s.logAction(userID, username, "STOCK_ADJUSTMENT", fmt.Sprintf("Adjusted stock by %d for medicine ID %d (Reason: %s)", qtyAdjusted, medicineID, reason))
	return nil
}

// GetExpiringBatches returns batches expiring within given number of days.
func (s *BatchService) GetExpiringBatches(withinDays int) ([]models.Batch, error) {
	todayStr := time.Now().Format("2006-01-02")
	targetDateStr := time.Now().AddDate(0, 0, withinDays).Format("2006-01-02")

	query := `
		SELECT b.id, b.batch_number, b.medicine_id, m.name, b.supplier_id, COALESCE(sup.name, ''),
		       b.quantity_received, b.quantity_remaining, b.buying_price, b.mfg_date, b.expiry_date, b.date_received
		FROM batches b
		JOIN medicines m ON b.medicine_id = m.id
		LEFT JOIN suppliers sup ON b.supplier_id = sup.id
		WHERE b.quantity_remaining > 0 AND b.expiry_date >= ? AND b.expiry_date <= ?
		ORDER BY b.expiry_date ASC`

	rows, err := s.db.Query(query, todayStr, targetDateStr)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var batches []models.Batch
	for rows.Next() {
		var b models.Batch
		var supplierID sql.NullInt64
		err := rows.Scan(
			&b.ID, &b.BatchNumber, &b.MedicineID, &b.MedicineName, &supplierID, &b.SupplierName,
			&b.QuantityReceived, &b.QuantityRemaining, &b.BuyingPrice, &b.MfgDate, &b.ExpiryDate, &b.DateReceived,
		)
		if err != nil {
			return nil, err
		}
		if supplierID.Valid {
			b.SupplierID = &supplierID.Int64
		}
		batches = append(batches, b)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return batches, nil
}

func (s *BatchService) updateMedicineStockTx(tx *sql.Tx, medicineID int64) error {
	var totalStock int
	err := tx.QueryRow(`SELECT COALESCE(SUM(quantity_remaining), 0) FROM batches WHERE medicine_id = ?`, medicineID).Scan(&totalStock)
	if err != nil {
		return fmt.Errorf("failed to sum batch stock: %w", err)
	}

	_, err = tx.Exec(`UPDATE medicines SET current_stock = ? WHERE id = ?`, totalStock, medicineID)
	if err != nil {
		return fmt.Errorf("failed to update medicine current stock: %w", err)
	}
	return nil
}

func (s *BatchService) logAction(userID int64, username, action, details string) {
	_, _ = s.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}
