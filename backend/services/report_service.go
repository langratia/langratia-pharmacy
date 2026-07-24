package services

import (
	"fmt"
	"time"

	"app/backend/db"
	"app/backend/models"
)

type ReportService struct {
	db *db.DB
}

type DashboardSummary struct {
	SalesToday        float64           `json:"sales_today"`
	TotalMedicines    int               `json:"total_medicines"`
	LowStockCount     int               `json:"low_stock_count"`
	OutOfStockCount   int               `json:"out_of_stock_count"`
	ExpiringSoonCount int               `json:"expiring_soon_count"`
	RecentSales       []models.Sale     `json:"recent_sales"`
	RecentPurchases   []models.Purchase `json:"recent_purchases"`
}

func NewReportService(database *db.DB) *ReportService {
	return &ReportService{db: database}
}

// GetDashboardSummary returns operational statistics for the main dashboard.
func (s *ReportService) GetDashboardSummary() (*DashboardSummary, error) {
	todayStr := time.Now().Format("2006-01-02")
	ninetyDaysStr := time.Now().AddDate(0, 0, 90).Format("2006-01-02")

	summary := &DashboardSummary{}

	// 1. Sales Today (UGX)
	salesQuery := `SELECT COALESCE(SUM(total_amount), 0.0) FROM sales WHERE date(sale_date) = date(?)`
	if err := s.db.QueryRow(salesQuery, todayStr).Scan(&summary.SalesToday); err != nil {
		return nil, fmt.Errorf("failed to query sales today: %w", err)
	}

	// 2. Total active medicines
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM medicines WHERE is_archived = 0`).Scan(&summary.TotalMedicines); err != nil {
		return nil, err
	}

	// 3. Low stock count (current_stock > 0 AND current_stock <= reorder_level)
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM medicines WHERE is_archived = 0 AND current_stock > 0 AND current_stock <= reorder_level`).Scan(&summary.LowStockCount); err != nil {
		return nil, err
	}

	// 4. Out of stock count (current_stock = 0)
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM medicines WHERE is_archived = 0 AND current_stock = 0`).Scan(&summary.OutOfStockCount); err != nil {
		return nil, err
	}

	// 5. Expiring soon count (batches with quantity > 0 and expiry_date <= 90 days from now)
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM batches WHERE quantity_remaining > 0 AND expiry_date >= ? AND expiry_date <= ?`, todayStr, ninetyDaysStr).Scan(&summary.ExpiringSoonCount); err != nil {
		return nil, err
	}

	// 6. Recent Sales (Top 5)
	salesRows, err := s.db.Query(`
		SELECT s.id, s.invoice_number, COALESCE(u.username, 'System'), s.sale_date, s.total_amount, s.payment_method
		FROM sales s
		LEFT JOIN users u ON s.user_id = u.id
		ORDER BY s.sale_date DESC LIMIT 5`)
	if err == nil {
		defer salesRows.Close()
		for salesRows.Next() {
			var sl models.Sale
			_ = salesRows.Scan(&sl.ID, &sl.InvoiceNumber, &sl.Username, &sl.SaleDate, &sl.TotalAmount, &sl.PaymentMethod)
			summary.RecentSales = append(summary.RecentSales, sl)
		}
	}

	// 7. Recent Purchases (Top 5)
	purRows, err := s.db.Query(`
		SELECT p.id, p.invoice_number, COALESCE(sup.name, 'Direct'), p.purchase_date, p.total_amount, COALESCE(p.notes, '')
		FROM purchases p
		LEFT JOIN suppliers sup ON p.supplier_id = sup.id
		ORDER BY p.purchase_date DESC LIMIT 5`)
	if err == nil {
		defer purRows.Close()
		for purRows.Next() {
			var pur models.Purchase
			_ = purRows.Scan(&pur.ID, &pur.InvoiceNumber, &pur.SupplierName, &pur.PurchaseDate, &pur.TotalAmount, &pur.Notes)
			summary.RecentPurchases = append(summary.RecentPurchases, pur)
		}
	}

	return summary, nil
}
