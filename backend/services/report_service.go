package services

import (
	"fmt"
	"log"
	"time"

	"app/backend/db"
	"app/backend/models"
)

type ReportService struct {
	db *db.DB
}

type ExpiringItemSummary struct {
	ID                int64  `json:"id"`
	MedicineName      string `json:"medicine_name"`
	BatchNumber       string `json:"batch_number"`
	ExpiryDate        string `json:"expiry_date"`
	DaysUntilExpiry   int    `json:"days_until_expiry"`
	QuantityRemaining int    `json:"quantity_remaining"`
}

type LowStockItemSummary struct {
	ID           int64  `json:"id"`
	MedicineName string `json:"medicine_name"`
	CurrentStock int    `json:"current_stock"`
	ReorderLevel int    `json:"reorder_level"`
}

type SalesTrendPoint struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
}

type PaymentMethodSummary struct {
	Method string  `json:"method"`
	Count  int     `json:"count"`
	Total  float64 `json:"total"`
}

type SalesSummary struct {
	TodayTotal      float64               `json:"today_total"`
	WeekTotal       float64               `json:"week_total"`
	MonthTotal      float64               `json:"month_total"`
	TotalSales      int                   `json:"total_sales"`
	ByMethod        []PaymentMethodSummary `json:"by_method"`
	TopProducts     []TopProductSummary   `json:"top_products"`
}

type TopProductSummary struct {
	MedicineID   int64  `json:"medicine_id"`
	MedicineName string `json:"medicine_name"`
	QuantitySold int    `json:"quantity_sold"`
	Revenue      float64 `json:"revenue"`
}

type DashboardSummary struct {
	SalesToday        float64               `json:"sales_today"`
	TotalMedicines    int                   `json:"total_medicines"`
	StockValuation    float64               `json:"stock_valuation"`
	LowStockCount     int                   `json:"low_stock_count"`
	OutOfStockCount   int                   `json:"out_of_stock_count"`
	ExpiringSoonCount int                   `json:"expiring_soon_count"`
	RecentSales       []models.Sale         `json:"recent_sales"`
	RecentPurchases   []models.Purchase     `json:"recent_purchases"`
	ExpiringItems     []ExpiringItemSummary `json:"expiring_items"`
	LowStockItems     []LowStockItemSummary `json:"low_stock_items"`
	SalesTrend        []SalesTrendPoint     `json:"sales_trend"`
}

func NewReportService(database *db.DB) *ReportService {
	return &ReportService{db: database}
}

// GetDashboardSummary returns operational statistics for the main dashboard.
func (s *ReportService) GetDashboardSummary() (*DashboardSummary, error) {
	todayStr := time.Now().Format("2006-01-02")
	ninetyDaysStr := time.Now().AddDate(0, 0, 90).Format("2006-01-02")

	summary := &DashboardSummary{
		RecentSales:     []models.Sale{},
		RecentPurchases: []models.Purchase{},
		ExpiringItems:   []ExpiringItemSummary{},
		LowStockItems:   []LowStockItemSummary{},
		SalesTrend:      []SalesTrendPoint{},
	}

	// 1. Sales Today (UGX)
	salesQuery := `SELECT COALESCE(SUM(total_amount), 0.0) FROM sales WHERE date(sale_date) = date(?)`
	if err := s.db.QueryRow(salesQuery, todayStr).Scan(&summary.SalesToday); err != nil {
		return nil, fmt.Errorf("failed to query sales today: %w", err)
	}

	// 2. Total active medicines
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM medicines WHERE is_archived = 0`).Scan(&summary.TotalMedicines); err != nil {
		return nil, err
	}

	// Stock Valuation (buying price * current stock)
	_ = s.db.QueryRow(`SELECT COALESCE(SUM(current_stock * buying_price), 0.0) FROM medicines WHERE is_archived = 0`).Scan(&summary.StockValuation)

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
			if err := salesRows.Scan(&sl.ID, &sl.InvoiceNumber, &sl.Username, &sl.SaleDate, &sl.TotalAmount, &sl.PaymentMethod); err != nil {
				log.Printf("dashboard: failed to scan recent sale row: %v", err)
				continue
			}
			summary.RecentSales = append(summary.RecentSales, sl)
		}
		if err := salesRows.Err(); err != nil {
			log.Printf("dashboard: error in recent sales iteration: %v", err)
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
			if err := purRows.Scan(&pur.ID, &pur.InvoiceNumber, &pur.SupplierName, &pur.PurchaseDate, &pur.TotalAmount, &pur.Notes); err != nil {
				log.Printf("dashboard: failed to scan recent purchase row: %v", err)
				continue
			}
			summary.RecentPurchases = append(summary.RecentPurchases, pur)
		}
		if err := purRows.Err(); err != nil {
			log.Printf("dashboard: error in recent purchases iteration: %v", err)
		}
	}

	// 8. Detailed Expiring Items (Top 10)
	expRows, err := s.db.Query(`
		SELECT b.id, m.name, b.batch_number, b.expiry_date, b.quantity_remaining,
		       CAST(julianday(b.expiry_date) - julianday('now', 'start of day') AS INTEGER)
		FROM batches b
		JOIN medicines m ON b.medicine_id = m.id
		WHERE b.quantity_remaining > 0 AND b.expiry_date >= ? AND b.expiry_date <= ?
		ORDER BY b.expiry_date ASC LIMIT 10`, todayStr, ninetyDaysStr)
	if err == nil {
		defer expRows.Close()
		for expRows.Next() {
			var item ExpiringItemSummary
			if err := expRows.Scan(&item.ID, &item.MedicineName, &item.BatchNumber, &item.ExpiryDate, &item.QuantityRemaining, &item.DaysUntilExpiry); err != nil {
				log.Printf("dashboard: failed to scan expiring item row: %v", err)
				continue
			}
			summary.ExpiringItems = append(summary.ExpiringItems, item)
		}
		if err := expRows.Err(); err != nil {
			log.Printf("dashboard: error in expiring items iteration: %v", err)
		}
	}

	// 9. Detailed Low Stock Items (Top 10)
	lowRows, err := s.db.Query(`
		SELECT id, name, current_stock, reorder_level
		FROM medicines
		WHERE is_archived = 0 AND current_stock > 0 AND current_stock <= reorder_level
		ORDER BY current_stock ASC LIMIT 10`)
	if err == nil {
		defer lowRows.Close()
		for lowRows.Next() {
			var item LowStockItemSummary
			if err := lowRows.Scan(&item.ID, &item.MedicineName, &item.CurrentStock, &item.ReorderLevel); err != nil {
				log.Printf("dashboard: failed to scan low stock item row: %v", err)
				continue
			}
			summary.LowStockItems = append(summary.LowStockItems, item)
		}
		if err := lowRows.Err(); err != nil {
			log.Printf("dashboard: error in low stock items iteration: %v", err)
		}
	}

	// 10. 7-Day Sales Trend — single query instead of 7 individual queries
	trendRows, err := s.db.Query(`
		SELECT date(sale_date, 'localtime') as day, COALESCE(SUM(total_amount), 0.0)
		FROM sales
		WHERE date(sale_date, 'localtime') >= date('now', '-6 days', 'localtime')
		GROUP BY date(sale_date, 'localtime')
		ORDER BY day ASC`)
	if err == nil {
		defer trendRows.Close()
		// Build a map of existing data
		trendMap := make(map[string]float64)
		for trendRows.Next() {
			var day string
			var amt float64
			if trendRows.Scan(&day, &amt) == nil {
				trendMap[day] = amt
			}
		}
		if err := trendRows.Err(); err != nil {
			log.Printf("dashboard: error in sales trend iteration: %v", err)
		}
		// Fill in all 7 days (including 0 for missing days)
		for i := 6; i >= 0; i-- {
			dStr := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
			summary.SalesTrend = append(summary.SalesTrend, SalesTrendPoint{
				Date:   dStr,
				Amount: trendMap[dStr],
			})
		}
	} else {
		log.Printf("dashboard: failed to query sales trend: %v", err)
	}

	return summary, nil
}

// GetSalesSummary returns aggregated sales data for reports.
func (s *ReportService) GetSalesSummary() (*SalesSummary, error) {
	todayStr := time.Now().Format("2006-01-02")
	weekAgoStr := time.Now().AddDate(0, 0, -6).Format("2006-01-02")
	monthStart := time.Now().AddDate(0, 0, -(time.Now().Day()-1)).Format("2006-01-02")

	ss := &SalesSummary{
		ByMethod:    []PaymentMethodSummary{},
		TopProducts: []TopProductSummary{},
	}

	// Today total
	s.db.QueryRow(`SELECT COALESCE(SUM(total_amount),0.0) FROM sales WHERE date(sale_date)=date(?)`, todayStr).Scan(&ss.TodayTotal)

	// Week total
	s.db.QueryRow(`SELECT COALESCE(SUM(total_amount),0.0) FROM sales WHERE date(sale_date)>=date(?)`, weekAgoStr).Scan(&ss.WeekTotal)

	// Month total
	s.db.QueryRow(`SELECT COALESCE(SUM(total_amount),0.0) FROM sales WHERE date(sale_date)>=date(?)`, monthStart).Scan(&ss.MonthTotal)

	// Total sales count
	s.db.QueryRow(`SELECT COUNT(*) FROM sales`).Scan(&ss.TotalSales)

	// By payment method — group by actual payment_method column
	rows, err := s.db.Query(`
		SELECT payment_method, COUNT(*), COALESCE(SUM(total_amount), 0.0)
		FROM sales
		GROUP BY payment_method
		ORDER BY payment_method`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p PaymentMethodSummary
			if rows.Scan(&p.Method, &p.Count, &p.Total) == nil {
				if p.Count > 0 {
					ss.ByMethod = append(ss.ByMethod, p)
				}
			}
		}
		if err := rows.Err(); err != nil {
			log.Printf("reports: error in payment method iteration: %v", err)
		}
	}

	// Top 10 products by quantity sold
	prodRows, err := s.db.Query(`
		SELECT si.medicine_id, COALESCE(m.name,'Unknown'), SUM(si.quantity), COALESCE(SUM(si.subtotal),0.0)
		FROM sale_items si
		JOIN medicines m ON si.medicine_id = m.id
		GROUP BY si.medicine_id
		ORDER BY SUM(si.quantity) DESC
		LIMIT 10`)
	if err == nil {
		defer prodRows.Close()
		for prodRows.Next() {
			var tp TopProductSummary
			if prodRows.Scan(&tp.MedicineID, &tp.MedicineName, &tp.QuantitySold, &tp.Revenue) == nil {
				ss.TopProducts = append(ss.TopProducts, tp)
			}
		}
		if err := prodRows.Err(); err != nil {
			log.Printf("reports: error in top products iteration: %v", err)
		}
	}

	return ss, nil
}
