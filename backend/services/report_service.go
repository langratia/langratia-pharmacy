package services

import (
	"fmt"
	"log"
	"strings"
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

type CashierSalesSummary struct {
	UserID        int64   `json:"user_id"`
	Username      string  `json:"username"`
	FullName      string  `json:"full_name"`
	Role          string  `json:"role"`
	InvoicesCount int     `json:"invoices_count"`
	ItemsSold     int     `json:"items_sold"`
	TotalRevenue  float64 `json:"total_revenue"`
}

type TopProductSummary struct {
	MedicineID    int64   `json:"medicine_id"`
	MedicineName  string  `json:"medicine_name"`
	Category      string  `json:"category"`
	Dosage        string  `json:"dosage"`
	QuantitySold  int     `json:"quantity_sold"`
	UnitPrice     float64 `json:"unit_price"`
	CatalogPrice  float64 `json:"catalog_price"`
	PriceVariance float64 `json:"price_variance"`
	BuyingPrice   float64 `json:"buying_price"`
	Revenue       float64 `json:"revenue"`
	Cost          float64 `json:"cost"`
	Profit        float64 `json:"profit"`
}

type SalesSummary struct {
	TodayTotal     float64                `json:"today_total"`
	WeekTotal      float64                `json:"week_total"`
	MonthTotal     float64                `json:"month_total"`
	PeriodRevenue  float64                `json:"period_revenue"`
	TotalSales     int                    `json:"total_sales"`
	TotalItemsSold int                    `json:"total_items_sold"`
	TotalProfit    float64                `json:"total_profit"`
	TotalDiscounts float64                `json:"total_discounts"`
	AvgDiscountPct float64                `json:"avg_discount_pct"`
	ProfitMargin   float64                `json:"profit_margin"`
	PeriodLabel    string                 `json:"period_label"`
	StartDate      string                 `json:"start_date"`
	EndDate        string                 `json:"end_date"`
	ByMethod       []PaymentMethodSummary `json:"by_method"`
	TopProducts    []TopProductSummary    `json:"top_products"`
	WhoSold        []CashierSalesSummary  `json:"who_sold"`
}

type DashboardSummary struct {
	SalesToday        float64               `json:"sales_today"`
	TotalOrders       int                   `json:"total_orders"`
	TotalItemsSold    int                   `json:"total_items_sold"`
	TotalProfit       float64               `json:"total_profit"`
	ProfitMargin      float64               `json:"profit_margin"`
	PeriodLabel       string                `json:"period_label"`
	StartDate         string                `json:"start_date"`
	EndDate           string                `json:"end_date"`
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
	WhoSold           []CashierSalesSummary `json:"who_sold"`
	TopProducts       []TopProductSummary   `json:"top_products"`
}

func NewReportService(database *db.DB) *ReportService {
	return &ReportService{db: database}
}

// GetDateRange returns the start date, end date (YYYY-MM-DD), and human-readable label for a given period or exact date.
func GetDateRange(period string) (string, string, string) {
	now := time.Now()
	cleanPeriod := strings.TrimSpace(period)

	switch cleanPeriod {
	case "yesterday":
		y := now.AddDate(0, 0, -1)
		dStr := y.Format("2006-01-02")
		return dStr, dStr, fmt.Sprintf("Yesterday (%s)", y.Format("02 Jan"))
	case "this_week":
		offset := int(time.Monday - now.Weekday())
		if offset > 0 {
			offset = -6
		}
		startDate := now.AddDate(0, 0, offset)
		endDate := startDate.AddDate(0, 0, 6)
		return startDate.Format("2006-01-02"), endDate.Format("2006-01-02"), fmt.Sprintf("This Week (%s - %s)", startDate.Format("02 Jan"), endDate.Format("02 Jan"))
	case "last_week":
		offset := int(time.Monday - now.Weekday())
		if offset > 0 {
			offset = -6
		}
		thisWeekStart := now.AddDate(0, 0, offset)
		lastWeekStart := thisWeekStart.AddDate(0, 0, -7)
		lastWeekEnd := thisWeekStart.AddDate(0, 0, -1)
		return lastWeekStart.Format("2006-01-02"), lastWeekEnd.Format("2006-01-02"), fmt.Sprintf("Last Week (%s - %s)", lastWeekStart.Format("02 Jan"), lastWeekEnd.Format("02 Jan"))
	case "this_month":
		startDate := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate := startDate.AddDate(0, 1, -1)
		return startDate.Format("2006-01-02"), endDate.Format("2006-01-02"), now.Format("January 2006")
	case "last_month":
		startDate := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location())
		endDate := startDate.AddDate(0, 1, -1)
		return startDate.Format("2006-01-02"), endDate.Format("2006-01-02"), startDate.Format("January 2006")
	case "this_year":
		startDate := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		endDate := time.Date(now.Year(), 12, 31, 0, 0, 0, 0, now.Location())
		return startDate.Format("2006-01-02"), endDate.Format("2006-01-02"), fmt.Sprintf("This Year (%d)", now.Year())
	case "today", "":
		todayStr := now.Format("2006-01-02")
		return todayStr, todayStr, fmt.Sprintf("Today (%s)", now.Format("02 Jan"))
	default:
		// Check custom range: "custom:YYYY-MM-DD:YYYY-MM-DD"
		if strings.HasPrefix(cleanPeriod, "custom:") {
			parts := strings.Split(strings.TrimPrefix(cleanPeriod, "custom:"), ":")
			if len(parts) == 2 {
				sT, err1 := time.Parse("2006-01-02", parts[0])
				eT, err2 := time.Parse("2006-01-02", parts[1])
				if err1 == nil && err2 == nil {
					return sT.Format("2006-01-02"), eT.Format("2006-01-02"), fmt.Sprintf("%s - %s", sT.Format("02 Jan 2006"), eT.Format("02 Jan 2006"))
				}
			}
		}

		// Check single date "YYYY-MM-DD" or "date:YYYY-MM-DD"
		dateStr := strings.TrimPrefix(cleanPeriod, "date:")
		if parsed, err := time.Parse("2006-01-02", dateStr); err == nil {
			formatted := parsed.Format("2006-01-02")
			return formatted, formatted, parsed.Format("02 Jan 2006")
		}

		// Fallback to today
		todayStr := now.Format("2006-01-02")
		return todayStr, todayStr, fmt.Sprintf("Today (%s)", now.Format("02 Jan"))
	}
}

// GetDashboardSummary returns operational statistics for the main dashboard.
func (s *ReportService) GetDashboardSummary(period string) (*DashboardSummary, error) {
	startDateStr, endDateStr, periodLabel := GetDateRange(period)
	todayStr := time.Now().Format("2006-01-02")
	ninetyDaysStr := time.Now().AddDate(0, 0, 90).Format("2006-01-02")

	summary := &DashboardSummary{
		PeriodLabel:     periodLabel,
		StartDate:       startDateStr,
		EndDate:         endDateStr,
		RecentSales:     []models.Sale{},
		RecentPurchases: []models.Purchase{},
		ExpiringItems:   []ExpiringItemSummary{},
		LowStockItems:   []LowStockItemSummary{},
		SalesTrend:      []SalesTrendPoint{},
		WhoSold:         []CashierSalesSummary{},
		TopProducts:     []TopProductSummary{},
	}

	// 1. Sales & Orders in period (UGX)
	salesQuery := `SELECT COALESCE(SUM(total_amount), 0.0), COUNT(*) FROM sales WHERE date(sale_date, 'localtime') >= date(?) AND date(sale_date, 'localtime') <= date(?)`
	if err := s.db.QueryRow(salesQuery, startDateStr, endDateStr).Scan(&summary.SalesToday, &summary.TotalOrders); err != nil {
		return nil, fmt.Errorf("failed to query sales for period: %w", err)
	}

	// 2. Items Sold & Profit in period
	profitQuery := `
		SELECT 
			COALESCE(SUM(si.quantity), 0),
			COALESCE(SUM(si.subtotal), 0.0),
			COALESCE(SUM(si.quantity * COALESCE(m.buying_price, 0.0)), 0.0)
		FROM sale_items si
		JOIN sales s ON si.sale_id = s.id
		LEFT JOIN medicines m ON si.medicine_id = m.id
		WHERE date(s.sale_date, 'localtime') >= date(?) AND date(s.sale_date, 'localtime') <= date(?)`
	var itemsSold int
	var subtotalRev, totalCost float64
	if err := s.db.QueryRow(profitQuery, startDateStr, endDateStr).Scan(&itemsSold, &subtotalRev, &totalCost); err == nil {
		summary.TotalItemsSold = itemsSold
		summary.TotalProfit = subtotalRev - totalCost
		if subtotalRev > 0 {
			summary.ProfitMargin = (summary.TotalProfit / subtotalRev) * 100
		}
	}

	// 3. Total active medicines
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM medicines WHERE is_archived = 0`).Scan(&summary.TotalMedicines); err != nil {
		return nil, err
	}

	// Stock Valuation (buying price * current stock)
	_ = s.db.QueryRow(`SELECT COALESCE(SUM(current_stock * buying_price), 0.0) FROM medicines WHERE is_archived = 0`).Scan(&summary.StockValuation)

	// 4. Low stock count (current_stock > 0 AND current_stock <= reorder_level)
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM medicines WHERE is_archived = 0 AND current_stock > 0 AND current_stock <= reorder_level`).Scan(&summary.LowStockCount); err != nil {
		return nil, err
	}

	// 5. Out of stock count (current_stock = 0)
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM medicines WHERE is_archived = 0 AND current_stock = 0`).Scan(&summary.OutOfStockCount); err != nil {
		return nil, err
	}

	// 6. Expiring soon count (batches with quantity > 0 and expiry_date <= 90 days from now)
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM batches WHERE quantity_remaining > 0 AND expiry_date >= ? AND expiry_date <= ?`, todayStr, ninetyDaysStr).Scan(&summary.ExpiringSoonCount); err != nil {
		return nil, err
	}

	// 7. Recent Sales for the period (Top 10)
	salesRows, err := s.db.Query(`
		SELECT s.id, s.invoice_number, COALESCE(u.username, 'System'), s.sale_date, s.total_amount, s.payment_method
		FROM sales s
		LEFT JOIN users u ON s.user_id = u.id
		WHERE date(s.sale_date, 'localtime') >= date(?) AND date(s.sale_date, 'localtime') <= date(?)
		ORDER BY s.sale_date DESC LIMIT 10`, startDateStr, endDateStr)
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

	// 8. Recent Purchases in period
	purRows, err := s.db.Query(`
		SELECT p.id, p.invoice_number, COALESCE(sup.name, 'Direct'), p.purchase_date, p.total_amount, COALESCE(p.notes, '')
		FROM purchases p
		LEFT JOIN suppliers sup ON p.supplier_id = sup.id
		WHERE date(p.purchase_date, 'localtime') >= date(?) AND date(p.purchase_date, 'localtime') <= date(?)
		ORDER BY p.purchase_date DESC LIMIT 5`, startDateStr, endDateStr)
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

	// 9. Detailed Expiring Items (Top 10)
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

	// 10. Detailed Low Stock Items (Top 10)
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

	// 11. Who Sold (Cashier / Staff Sales Breakdown for the period)
	whoRows, err := s.db.Query(`
		SELECT 
			COALESCE(s.user_id, 0), 
			COALESCE(u.username, 'Staff'), 
			COALESCE(NULLIF(u.full_name, ''), u.username, 'Staff'), 
			COALESCE(u.role, 'cashier'),
			COUNT(DISTINCT s.id),
			COALESCE((
				SELECT SUM(si.quantity)
				FROM sale_items si
				JOIN sales s2 ON si.sale_id = s2.id
				WHERE COALESCE(s2.user_id, 0) = COALESCE(s.user_id, 0)
				  AND date(s2.sale_date, 'localtime') >= date(?)
				  AND date(s2.sale_date, 'localtime') <= date(?)
			), 0),
			COALESCE(SUM(s.total_amount), 0.0)
		FROM sales s
		LEFT JOIN users u ON s.user_id = u.id
		WHERE date(s.sale_date, 'localtime') >= date(?) AND date(s.sale_date, 'localtime') <= date(?)
		GROUP BY s.user_id
		ORDER BY COALESCE(SUM(s.total_amount), 0.0) DESC`, startDateStr, endDateStr, startDateStr, endDateStr)
	if err == nil {
		defer whoRows.Close()
		for whoRows.Next() {
			var cs CashierSalesSummary
			if err := whoRows.Scan(&cs.UserID, &cs.Username, &cs.FullName, &cs.Role, &cs.InvoicesCount, &cs.ItemsSold, &cs.TotalRevenue); err == nil {
				summary.WhoSold = append(summary.WhoSold, cs)
			}
		}
	}

	// 12. Top Products Sold in period (with buying cost & profit)
	prodRows, err := s.db.Query(`
		SELECT 
			si.medicine_id, 
			COALESCE(m.name, 'Unknown'), 
			COALESCE(m.category, 'General'), 
			COALESCE(m.dosage_strength, ''), 
			SUM(si.quantity), 
			COALESCE(AVG(si.unit_price), 0.0), 
			COALESCE(m.selling_price, 0.0),
			COALESCE(m.buying_price, 0.0), 
			COALESCE(SUM(si.subtotal), 0.0), 
			COALESCE(SUM(si.quantity * COALESCE(m.buying_price, 0.0)), 0.0),
			COALESCE(SUM(si.subtotal) - SUM(si.quantity * COALESCE(m.buying_price, 0.0)), 0.0)
		FROM sale_items si
		JOIN sales s ON si.sale_id = s.id
		LEFT JOIN medicines m ON si.medicine_id = m.id
		WHERE date(s.sale_date, 'localtime') >= date(?) AND date(s.sale_date, 'localtime') <= date(?)
		GROUP BY si.medicine_id
		ORDER BY SUM(si.quantity) DESC
		LIMIT 10`, startDateStr, endDateStr)
	if err == nil {
		defer prodRows.Close()
		for prodRows.Next() {
			var tp TopProductSummary
			if prodRows.Scan(&tp.MedicineID, &tp.MedicineName, &tp.Category, &tp.Dosage, &tp.QuantitySold, &tp.UnitPrice, &tp.CatalogPrice, &tp.BuyingPrice, &tp.Revenue, &tp.Cost, &tp.Profit) == nil {
				if tp.CatalogPrice > 0 {
					tp.PriceVariance = ((tp.UnitPrice - tp.CatalogPrice) / tp.CatalogPrice) * 100.0
				}
				summary.TopProducts = append(summary.TopProducts, tp)
			}
		}
	}

	// 13. Sales Trend:
	cleanPeriod := strings.TrimSpace(period)
	if startDateStr == endDateStr {
		// Single day (today, yesterday, or specific date): hourly trend 08:00 - 21:00
		hourlyRows, err := s.db.Query(`
			SELECT strftime('%H:00', sale_date, 'localtime') as hour_slot, COALESCE(SUM(total_amount), 0.0)
			FROM sales
			WHERE date(sale_date, 'localtime') = date(?)
			GROUP BY hour_slot
			ORDER BY hour_slot ASC`, startDateStr)
		hourlyMap := make(map[string]float64)
		if err == nil {
			defer hourlyRows.Close()
			for hourlyRows.Next() {
				var hr string
				var amt float64
				if hourlyRows.Scan(&hr, &amt) == nil {
					hourlyMap[hr] = amt
				}
			}
		}

		// Generate timeline from 08:00 to 21:00
		for h := 8; h <= 21; h++ {
			hStr := fmt.Sprintf("%02d:00", h)
			summary.SalesTrend = append(summary.SalesTrend, SalesTrendPoint{
				Date:   hStr,
				Amount: hourlyMap[hStr],
			})
		}
	} else if cleanPeriod == "this_year" {
		// Year: aggregate into 12 months (Jan..Dec)
		yearStr := startDateStr[:4]
		monthRows, err := s.db.Query(`
			SELECT strftime('%Y-%m', sale_date, 'localtime') as month_slot, COALESCE(SUM(total_amount), 0.0)
			FROM sales
			WHERE strftime('%Y', sale_date, 'localtime') = ?
			GROUP BY month_slot
			ORDER BY month_slot ASC`, yearStr)
		monthMap := make(map[string]float64)
		if err == nil {
			defer monthRows.Close()
			for monthRows.Next() {
				var mSlot string
				var amt float64
				if monthRows.Scan(&mSlot, &amt) == nil {
					monthMap[mSlot] = amt
				}
			}
		}

		for m := 1; m <= 12; m++ {
			mStr := fmt.Sprintf("%s-%02d", yearStr, m)
			summary.SalesTrend = append(summary.SalesTrend, SalesTrendPoint{
				Date:   mStr,
				Amount: monthMap[mStr],
			})
		}
	} else {
		// Multi-day range (week, month, custom): generate daily points
		trendRows, err := s.db.Query(`
			SELECT date(sale_date, 'localtime') as day, COALESCE(SUM(total_amount), 0.0)
			FROM sales
			WHERE date(sale_date, 'localtime') >= date(?) AND date(sale_date, 'localtime') <= date(?)
			GROUP BY date(sale_date, 'localtime')
			ORDER BY day ASC`, startDateStr, endDateStr)
		trendMap := make(map[string]float64)
		if err == nil {
			defer trendRows.Close()
			for trendRows.Next() {
				var day string
				var amt float64
				if trendRows.Scan(&day, &amt) == nil {
					trendMap[day] = amt
				}
			}
		}
		startT, _ := time.Parse("2006-01-02", startDateStr)
		endT, _ := time.Parse("2006-01-02", endDateStr)
		for d := startT; !d.After(endT); d = d.AddDate(0, 0, 1) {
			dStr := d.Format("2006-01-02")
			summary.SalesTrend = append(summary.SalesTrend, SalesTrendPoint{
				Date:   dStr,
				Amount: trendMap[dStr],
			})
		}
	}

	return summary, nil
}

// GetSalesSummary returns aggregated sales data for reports.
func (s *ReportService) GetSalesSummary(period string) (*SalesSummary, error) {
	startDateStr, endDateStr, periodLabel := GetDateRange(period)
	todayStr := time.Now().Format("2006-01-02")
	weekAgoStr := time.Now().AddDate(0, 0, -6).Format("2006-01-02")
	monthStart := time.Now().AddDate(0, 0, -(time.Now().Day() - 1)).Format("2006-01-02")

	ss := &SalesSummary{
		PeriodLabel: periodLabel,
		StartDate:   startDateStr,
		EndDate:     endDateStr,
		ByMethod:    []PaymentMethodSummary{},
		TopProducts: []TopProductSummary{},
		WhoSold:     []CashierSalesSummary{},
	}

	// Quick totals for KPI comparisons
	_ = s.db.QueryRow(`SELECT COALESCE(SUM(total_amount),0.0) FROM sales WHERE date(sale_date, 'localtime')=date(?)`, todayStr).Scan(&ss.TodayTotal)
	_ = s.db.QueryRow(`SELECT COALESCE(SUM(total_amount),0.0) FROM sales WHERE date(sale_date, 'localtime')>=date(?)`, weekAgoStr).Scan(&ss.WeekTotal)
	_ = s.db.QueryRow(`SELECT COALESCE(SUM(total_amount),0.0) FROM sales WHERE date(sale_date, 'localtime')>=date(?)`, monthStart).Scan(&ss.MonthTotal)

	// Period totals
	_ = s.db.QueryRow(`SELECT COALESCE(SUM(total_amount), 0.0), COUNT(*) FROM sales WHERE date(sale_date, 'localtime') >= date(?) AND date(sale_date, 'localtime') <= date(?)`, startDateStr, endDateStr).Scan(&ss.PeriodRevenue, &ss.TotalSales)

	// Items sold & Profit for the period
	profitQuery := `
		SELECT 
			COALESCE(SUM(si.quantity), 0),
			COALESCE(SUM(si.subtotal), 0.0),
			COALESCE(SUM(si.quantity * COALESCE(m.buying_price, 0.0)), 0.0)
		FROM sale_items si
		JOIN sales s ON si.sale_id = s.id
		LEFT JOIN medicines m ON si.medicine_id = m.id
		WHERE date(s.sale_date, 'localtime') >= date(?) AND date(s.sale_date, 'localtime') <= date(?)`
	var itemsSold int
	var subtotalRev, totalCost float64
	if err := s.db.QueryRow(profitQuery, startDateStr, endDateStr).Scan(&itemsSold, &subtotalRev, &totalCost); err == nil {
		ss.TotalItemsSold = itemsSold
		ss.TotalProfit = subtotalRev - totalCost
		if subtotalRev > 0 {
			ss.ProfitMargin = (ss.TotalProfit / subtotalRev) * 100
		}
	}

	// Total discounts for period
	_ = s.db.QueryRow(`SELECT COALESCE(SUM(discount_amount), 0.0) FROM sales WHERE date(sale_date, 'localtime') >= date(?) AND date(sale_date, 'localtime') <= date(?)`, startDateStr, endDateStr).Scan(&ss.TotalDiscounts)
	if (ss.PeriodRevenue + ss.TotalDiscounts) > 0 {
		ss.AvgDiscountPct = (ss.TotalDiscounts / (ss.PeriodRevenue + ss.TotalDiscounts)) * 100.0
	}

	// By payment method
	rows, err := s.db.Query(`
		SELECT payment_method, COUNT(*), COALESCE(SUM(total_amount), 0.0)
		FROM sales
		WHERE date(sale_date, 'localtime') >= date(?) AND date(sale_date, 'localtime') <= date(?)
		GROUP BY payment_method
		ORDER BY payment_method`, startDateStr, endDateStr)
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

	// Top products sold in period
	prodRows, err := s.db.Query(`
		SELECT 
			si.medicine_id, 
			COALESCE(m.name, 'Unknown'), 
			COALESCE(m.category, 'General'), 
			COALESCE(m.dosage_strength, ''), 
			SUM(si.quantity), 
			COALESCE(AVG(si.unit_price), 0.0), 
			COALESCE(m.selling_price, 0.0),
			COALESCE(m.buying_price, 0.0), 
			COALESCE(SUM(si.subtotal), 0.0), 
			COALESCE(SUM(si.quantity * COALESCE(m.buying_price, 0.0)), 0.0),
			COALESCE(SUM(si.subtotal) - SUM(si.quantity * COALESCE(m.buying_price, 0.0)), 0.0)
		FROM sale_items si
		JOIN sales s ON si.sale_id = s.id
		LEFT JOIN medicines m ON si.medicine_id = m.id
		WHERE date(s.sale_date, 'localtime') >= date(?) AND date(s.sale_date, 'localtime') <= date(?)
		GROUP BY si.medicine_id
		ORDER BY SUM(si.quantity) DESC
		LIMIT 50`, startDateStr, endDateStr)
	if err == nil {
		defer prodRows.Close()
		for prodRows.Next() {
			var tp TopProductSummary
			if prodRows.Scan(&tp.MedicineID, &tp.MedicineName, &tp.Category, &tp.Dosage, &tp.QuantitySold, &tp.UnitPrice, &tp.CatalogPrice, &tp.BuyingPrice, &tp.Revenue, &tp.Cost, &tp.Profit) == nil {
				if tp.CatalogPrice > 0 {
					tp.PriceVariance = ((tp.UnitPrice - tp.CatalogPrice) / tp.CatalogPrice) * 100.0
				}
				ss.TopProducts = append(ss.TopProducts, tp)
			}
		}
		if err := prodRows.Err(); err != nil {
			log.Printf("reports: error in top products iteration: %v", err)
		}
	}

	// Who Sold (Cashier / Staff Sales breakdown for the period)
	whoRows, err := s.db.Query(`
		SELECT 
			COALESCE(s.user_id, 0), 
			COALESCE(u.username, 'Staff'), 
			COALESCE(NULLIF(u.full_name, ''), u.username, 'Staff'), 
			COALESCE(u.role, 'cashier'),
			COUNT(DISTINCT s.id),
			COALESCE((
				SELECT SUM(si.quantity)
				FROM sale_items si
				JOIN sales s2 ON si.sale_id = s2.id
				WHERE COALESCE(s2.user_id, 0) = COALESCE(s.user_id, 0)
				  AND date(s2.sale_date, 'localtime') >= date(?)
				  AND date(s2.sale_date, 'localtime') <= date(?)
			), 0),
			COALESCE(SUM(s.total_amount), 0.0)
		FROM sales s
		LEFT JOIN users u ON s.user_id = u.id
		WHERE date(s.sale_date, 'localtime') >= date(?) AND date(s.sale_date, 'localtime') <= date(?)
		GROUP BY s.user_id
		ORDER BY COALESCE(SUM(s.total_amount), 0.0) DESC`, startDateStr, endDateStr, startDateStr, endDateStr)
	if err == nil {
		defer whoRows.Close()
		for whoRows.Next() {
			var cs CashierSalesSummary
			if err := whoRows.Scan(&cs.UserID, &cs.Username, &cs.FullName, &cs.Role, &cs.InvoicesCount, &cs.ItemsSold, &cs.TotalRevenue); err == nil {
				ss.WhoSold = append(ss.WhoSold, cs)
			}
		}
	}

	return ss, nil
}
