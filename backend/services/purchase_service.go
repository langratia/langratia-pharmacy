package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"app/backend/db"
	"app/backend/models"
)

type PurchaseService struct {
	db           *db.DB
	batchService *BatchService
}

type IncomingStockItem struct {
	MedicineID   int64   `json:"medicine_id"`
	BatchNumber  string  `json:"batch_number"`
	Quantity     int     `json:"quantity"`
	BuyingPrice  float64 `json:"buying_price"`
	MfgDate      string  `json:"mfg_date"`
	ExpiryDate   string  `json:"expiry_date"`
}

func NewPurchaseService(database *db.DB, batchService *BatchService) *PurchaseService {
	return &PurchaseService{db: database, batchService: batchService}
}

// RecordPurchase handles incoming stock shipments, creates invoice items, and generates batches.
func (s *PurchaseService) RecordPurchase(invoiceNumber string, supplierID *int64, items []IncomingStockItem, notes string, userID int64, username string) (*models.Purchase, error) {
	if len(items) == 0 {
		return nil, errors.New("purchase must contain at least one medicine item")
	}
	if invoiceNumber == "" {
		invoiceNumber = fmt.Sprintf("INV-PUR-%d", time.Now().Unix())
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	totalAmount := 0.0
	for _, item := range items {
		totalAmount += item.BuyingPrice * float64(item.Quantity)
	}

	// 1. Insert Purchase Invoice
	res, err := tx.Exec(
		`INSERT INTO purchases (invoice_number, supplier_id, total_amount, notes) VALUES (?, ?, ?, ?)`,
		invoiceNumber, supplierID, totalAmount, notes,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert purchase record: %w", err)
	}

	purchaseID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	// 2. Process Items & Batches
	for _, item := range items {
		if item.MedicineID <= 0 || item.Quantity <= 0 || item.BatchNumber == "" || item.ExpiryDate == "" {
			return nil, errors.New("item requires valid medicine ID, positive quantity, batch number, and expiry date")
		}

		// Insert Batch
		batchRes, err := tx.Exec(
			`INSERT INTO batches (batch_number, medicine_id, supplier_id, quantity_received, quantity_remaining, buying_price, mfg_date, expiry_date)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			item.BatchNumber, item.MedicineID, supplierID, item.Quantity, item.Quantity, item.BuyingPrice, item.MfgDate, item.ExpiryDate,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create batch for medicine ID %d: %w", item.MedicineID, err)
		}

		batchID, err := batchRes.LastInsertId()
		if err != nil {
			return nil, err
		}

		// Insert Purchase Item
		_, err = tx.Exec(
			`INSERT INTO purchase_items (purchase_id, medicine_id, batch_id, quantity, buying_price) VALUES (?, ?, ?, ?, ?)`,
			purchaseID, item.MedicineID, batchID, item.Quantity, item.BuyingPrice,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to insert purchase item: %w", err)
		}

		// Recalculate medicine stock
		var totalStock int
		err = tx.QueryRow(`SELECT COALESCE(SUM(quantity_remaining), 0) FROM batches WHERE medicine_id = ?`, item.MedicineID).Scan(&totalStock)
		if err != nil {
			return nil, err
		}
		_, err = tx.Exec(`UPDATE medicines SET current_stock = ? WHERE id = ?`, totalStock, item.MedicineID)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.logAction(userID, username, "RECORD_PURCHASE", fmt.Sprintf("Recorded stock purchase invoice %s (Total: UGX %.2f)", invoiceNumber, totalAmount))

	return &models.Purchase{
		ID:            purchaseID,
		InvoiceNumber: invoiceNumber,
		SupplierID:    supplierID,
		PurchaseDate:  time.Now(),
		TotalAmount:   totalAmount,
		Notes:         notes,
	}, nil
}

// ListPurchases retrieves past purchase invoices.
func (s *PurchaseService) ListPurchases() ([]models.Purchase, error) {
	query := `
		SELECT p.id, p.invoice_number, p.supplier_id, COALESCE(sup.name, ''), p.purchase_date, p.total_amount, COALESCE(p.notes, '')
		FROM purchases p
		LEFT JOIN suppliers sup ON p.supplier_id = sup.id
		ORDER BY p.purchase_date DESC`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var purchases []models.Purchase
	for rows.Next() {
		var p models.Purchase
		var supplierID sql.NullInt64
		err := rows.Scan(&p.ID, &p.InvoiceNumber, &supplierID, &p.SupplierName, &p.PurchaseDate, &p.TotalAmount, &p.Notes)
		if err != nil {
			return nil, err
		}
		if supplierID.Valid {
			p.SupplierID = &supplierID.Int64
		}
		purchases = append(purchases, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return purchases, nil
}

// ListPurchasesPaginated retrieves past purchase invoices with pagination support.
func (s *PurchaseService) ListPurchasesPaginated(page, pageSize int) (*models.PaginatedPurchases, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	var totalCount int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM purchases`).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("failed to count purchases: %w", err)
	}

	query := `
		SELECT p.id, p.invoice_number, p.supplier_id, COALESCE(sup.name, ''), p.purchase_date, p.total_amount, COALESCE(p.notes, '')
		FROM purchases p
		LEFT JOIN suppliers sup ON p.supplier_id = sup.id
		ORDER BY p.purchase_date DESC
		LIMIT ? OFFSET ?`

	rows, err := s.db.Query(query, pageSize, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var purchases []models.Purchase
	for rows.Next() {
		var p models.Purchase
		var supplierID sql.NullInt64
		err := rows.Scan(&p.ID, &p.InvoiceNumber, &supplierID, &p.SupplierName, &p.PurchaseDate, &p.TotalAmount, &p.Notes)
		if err != nil {
			return nil, err
		}
		if supplierID.Valid {
			p.SupplierID = &supplierID.Int64
		}
		purchases = append(purchases, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &models.PaginatedPurchases{
		Items:      purchases,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}


// ListPurchaseItems retrieves line items for a purchase invoice with medicine names.
func (s *PurchaseService) ListPurchaseItems(purchaseID int64) ([]models.PurchaseItem, error) {
	query := `
		SELECT pi.id, pi.purchase_id, pi.medicine_id, pi.batch_id, pi.quantity, pi.buying_price,
		       COALESCE(m.name, ''), COALESCE(b.batch_number, '')
		FROM purchase_items pi
		LEFT JOIN medicines m ON pi.medicine_id = m.id
		LEFT JOIN batches b ON pi.batch_id = b.id
		WHERE pi.purchase_id = ?`

	rows, err := s.db.Query(query, purchaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.PurchaseItem
	for rows.Next() {
		var item models.PurchaseItem
		var batchID sql.NullInt64
		err := rows.Scan(&item.ID, &item.PurchaseID, &item.MedicineID, &batchID, &item.Quantity, &item.BuyingPrice, &item.MedicineName, &item.BatchNumber)
		if err != nil {
			return nil, err
		}
		if batchID.Valid {
			item.BatchID = &batchID.Int64
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (s *PurchaseService) logAction(userID int64, username, action, details string) {
	_, _ = s.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}
