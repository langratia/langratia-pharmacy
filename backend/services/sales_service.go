package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"app/backend/db"
	"app/backend/models"
)

type SalesService struct {
	db           *db.DB
	batchService *BatchService
}

type CartItemInput struct {
	MedicineID int64   `json:"medicine_id"`
	Quantity   int     `json:"quantity"`
	UnitPrice  float64 `json:"unit_price"`
}

func NewSalesService(database *db.DB, batchService *BatchService) *SalesService {
	return &SalesService{db: database, batchService: batchService}
}

// ProcessSale completes a POS transaction by deducting stock via FEFO and creating a sale invoice.
func (s *SalesService) ProcessSale(userID int64, username string, items []CartItemInput, paymentMethod string) (*models.Sale, error) {
	if len(items) == 0 {
		return nil, errors.New("cart cannot be empty")
	}
	if paymentMethod == "" {
		paymentMethod = "Cash"
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	invoiceNumber := fmt.Sprintf("INV-POS-%s-%d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)

	totalAmount := 0.0
	for _, item := range items {
		if item.Quantity <= 0 {
			return nil, errors.New("item quantity must be greater than zero")
		}
		totalAmount += item.UnitPrice * float64(item.Quantity)
	}

	// 1. Insert Sale record
	res, err := tx.Exec(
		`INSERT INTO sales (invoice_number, user_id, total_amount, payment_method) VALUES (?, ?, ?, ?)`,
		invoiceNumber, userID, totalAmount, paymentMethod,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create sale invoice: %w", err)
	}

	saleID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	var saleItems []models.SaleItem

	// 2. For each item, perform FEFO stock deduction and insert sale items per batch deducted
	for _, cartItem := range items {
		// Deduct stock using FEFO
		deductions, err := s.batchService.DeductStockFEFO(tx, cartItem.MedicineID, cartItem.Quantity)
		if err != nil {
			return nil, fmt.Errorf("failed FEFO stock deduction for medicine ID %d: %w", cartItem.MedicineID, err)
		}

		// Fetch medicine name
		var medName string
		err = tx.QueryRow(`SELECT name FROM medicines WHERE id = ?`, cartItem.MedicineID).Scan(&medName)
		if err != nil {
			return nil, err
		}

		for _, d := range deductions {
			subtotal := cartItem.UnitPrice * float64(d.QuantityDeducted)

			itemRes, err := tx.Exec(
				`INSERT INTO sale_items (sale_id, medicine_id, batch_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
				saleID, cartItem.MedicineID, d.BatchID, d.QuantityDeducted, cartItem.UnitPrice, subtotal,
			)
			if err != nil {
				return nil, fmt.Errorf("failed to record sale item: %w", err)
			}

			itemID, _ := itemRes.LastInsertId()

			saleItems = append(saleItems, models.SaleItem{
				ID:           itemID,
				SaleID:       saleID,
				MedicineID:   cartItem.MedicineID,
				MedicineName: medName,
				BatchID:      d.BatchID,
				BatchNumber:  d.BatchNumber,
				Quantity:     d.QuantityDeducted,
				UnitPrice:    cartItem.UnitPrice,
				Subtotal:     subtotal,
			})
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	s.logAction(userID, username, "POS_SALE", fmt.Sprintf("Completed sale %s for UGX %.2f", invoiceNumber, totalAmount))

	return &models.Sale{
		ID:            saleID,
		InvoiceNumber: invoiceNumber,
		UserID:        &userID,
		Username:      username,
		SaleDate:      time.Now(),
		TotalAmount:   totalAmount,
		PaymentMethod: paymentMethod,
		Items:         saleItems,
	}, nil
}

// ListRecentSales retrieves the latest sales transactions for the POS / Dashboard.
func (s *SalesService) ListRecentSales(limit int) ([]models.Sale, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT s.id, s.invoice_number, s.user_id, COALESCE(u.username, 'System'), s.sale_date, s.total_amount, s.payment_method
		FROM sales s
		LEFT JOIN users u ON s.user_id = u.id
		ORDER BY s.sale_date DESC
		LIMIT ?`

	rows, err := s.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sales []models.Sale
	for rows.Next() {
		var sl models.Sale
		var uid sql.NullInt64
		err := rows.Scan(&sl.ID, &sl.InvoiceNumber, &uid, &sl.Username, &sl.SaleDate, &sl.TotalAmount, &sl.PaymentMethod)
		if err != nil {
			return nil, err
		}
		if uid.Valid {
			sl.UserID = &uid.Int64
		}
		sales = append(sales, sl)
	}

	return sales, nil
}

func (s *SalesService) logAction(userID int64, username, action, details string) {
	_, _ = s.db.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	)
}
