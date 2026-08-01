package services

import (
	"database/sql"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"app/backend/db"
	"app/backend/models"
)

var invoiceSeq int64

type CashierPerformanceMetrics struct {
	TotalSales   int     `json:"total_sales"`
	ItemsSold    int     `json:"items_sold"`
	TotalRevenue float64 `json:"total_revenue"`
}

type CashierPerformance struct {
	UserID    int64                     `json:"user_id"`
	Today     CashierPerformanceMetrics `json:"today"`
	ThisWeek  CashierPerformanceMetrics `json:"this_week"`
	ThisMonth CashierPerformanceMetrics `json:"this_month"`
}

type SalesService struct {
	db           *db.DB
	batchService *BatchService
}

func NewSalesService(database *db.DB, batchService *BatchService) *SalesService {
	svc := &SalesService{db: database, batchService: batchService}
	// Seed the invoice counter from the current sale count so restarts don't reset to 0
	var count int64
	_ = database.QueryRow(`SELECT COUNT(*) FROM sales`).Scan(&count)
	atomic.StoreInt64(&invoiceSeq, count)
	return svc
}


type CartItemInput struct {
	MedicineID     int64   `json:"medicine_id"`
	Quantity       int     `json:"quantity"`
	UnitPrice      float64 `json:"unit_price"`
	PrescriptionID *int64  `json:"prescription_id,omitempty"`
}



// ProcessSale completes a POS transaction by deducting stock via FEFO and creating a sale invoice.
func (s *SalesService) ProcessSale(userID int64, username string, items []CartItemInput, paymentMethod string, discountAmount float64, discountType string, shiftID *int64) (*models.Sale, error) {
	if len(items) == 0 {
		return nil, errors.New("cart cannot be empty")
	}
	if paymentMethod == "" {
		paymentMethod = "Cash"
	}
	if discountType == "" {
		discountType = "fixed"
	}

	// Server-side input validation
	for i, item := range items {
		if item.MedicineID <= 0 {
			return nil, fmt.Errorf("item %d: invalid medicine ID", i)
		}
		if item.Quantity <= 0 {
			return nil, fmt.Errorf("item %d: quantity must be greater than zero", i)
		}
		if item.UnitPrice < 0 {
			return nil, fmt.Errorf("item %d: unit price cannot be negative", i)
		}
	}

	s.db.Lock()
	defer s.db.Unlock()

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	seq := atomic.AddInt64(&invoiceSeq, 1)
	invoiceNumber := fmt.Sprintf("INV-POS-%s-%06d-%d", time.Now().Format("20060102150405"), seq%1000000, time.Now().UnixNano()%100000)

	grossAmount := 0.0
	for _, item := range items {
		grossAmount += item.UnitPrice * float64(item.Quantity)
	}

	// Calculate net amount after discount
	netAmount := grossAmount
	if discountAmount > 0 {
		if discountType == "percent" {
			netAmount = grossAmount - (grossAmount * (discountAmount / 100.0))
		} else {
			netAmount = grossAmount - discountAmount
		}
		if netAmount < 0 {
			netAmount = 0
		}
	}

	// 1. Insert Sale record
	res, err := tx.Exec(
		`INSERT INTO sales (invoice_number, user_id, total_amount, payment_method, discount_amount, discount_type, shift_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		invoiceNumber, userID, netAmount, paymentMethod, discountAmount, discountType, shiftID,
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
		// If cart item is associated with a prescription, mark prescription as Dispensed
		if cartItem.PrescriptionID != nil && *cartItem.PrescriptionID > 0 {
			_, _ = tx.Exec(`UPDATE prescriptions SET status = 'Dispensed' WHERE id = ?`, *cartItem.PrescriptionID)
			_, _ = tx.Exec(`UPDATE prescription_items SET quantity_dispensed = quantity_prescribed WHERE prescription_id = ? AND medicine_id = ?`, *cartItem.PrescriptionID, cartItem.MedicineID)
		}

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

	s.logAction(userID, username, "POS_SALE", fmt.Sprintf("Completed sale %s for %.2f", invoiceNumber, netAmount))

	return &models.Sale{
		ID:             saleID,
		InvoiceNumber:  invoiceNumber,
		UserID:         &userID,
		Username:       username,
		SaleDate:       time.Now(),
		TotalAmount:    netAmount,
		DiscountAmount: discountAmount,
		DiscountType:   discountType,
		ShiftID:        shiftID,
		PaymentMethod:  paymentMethod,
		Items:          saleItems,
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

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return sales, nil
}

// GetUserTodaySalesTotal retrieves the sum of total_amount for sales made by the user today.
func (s *SalesService) GetUserTodaySalesTotal(userID int64) (float64, error) {
	var total sql.NullFloat64
	query := `
		SELECT SUM(total_amount) 
		FROM sales 
		WHERE user_id = ? AND DATE(sale_date, 'localtime') = DATE('now', 'localtime')`
	
	err := s.db.QueryRow(query, userID).Scan(&total)
	if err != nil && err != sql.ErrNoRows {
		return 0.0, err
	}
	if !total.Valid {
		return 0.0, nil
	}
	return total.Float64, nil
}

// GetCashierPerformance retrieves aggregated sales metrics for a specific user.
func (s *SalesService) GetCashierPerformance(userID int64) (*CashierPerformance, error) {
	query := `
		SELECT
			COALESCE(SUM(CASE WHEN DATE(s.sale_date, 'localtime') = DATE('now', 'localtime') THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN DATE(s.sale_date, 'localtime') = DATE('now', 'localtime') THEN si.quantity ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN DATE(s.sale_date, 'localtime') = DATE('now', 'localtime') THEN si.subtotal ELSE 0.0 END), 0.0),
			COALESCE(SUM(CASE WHEN DATE(s.sale_date, 'localtime') >= DATE('now', '-7 days', 'localtime') THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN DATE(s.sale_date, 'localtime') >= DATE('now', '-7 days', 'localtime') THEN si.quantity ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN DATE(s.sale_date, 'localtime') >= DATE('now', '-7 days', 'localtime') THEN si.subtotal ELSE 0.0 END), 0.0),
			COALESCE(SUM(CASE WHEN strftime('%Y-%m', s.sale_date, 'localtime') = strftime('%Y-%m', 'now', 'localtime') THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN strftime('%Y-%m', s.sale_date, 'localtime') = strftime('%Y-%m', 'now', 'localtime') THEN si.quantity ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN strftime('%Y-%m', s.sale_date, 'localtime') = strftime('%Y-%m', 'now', 'localtime') THEN si.subtotal ELSE 0.0 END), 0.0)
		FROM sales s
		LEFT JOIN sale_items si ON s.id = si.sale_id
		WHERE s.user_id = ?`

	perf := &CashierPerformance{UserID: userID}
	err := s.db.QueryRow(query, userID).Scan(
		&perf.Today.TotalSales, &perf.Today.ItemsSold, &perf.Today.TotalRevenue,
		&perf.ThisWeek.TotalSales, &perf.ThisWeek.ItemsSold, &perf.ThisWeek.TotalRevenue,
		&perf.ThisMonth.TotalSales, &perf.ThisMonth.ItemsSold, &perf.ThisMonth.TotalRevenue,
	)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	return perf, nil
}

func (s *SalesService) logAction(userID int64, username, action, details string) {
	logAudit(s.db, userID, username, action, details)
}

