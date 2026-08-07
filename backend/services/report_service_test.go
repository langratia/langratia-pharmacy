package services

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"app/backend/db"
	"app/backend/models"
)

func TestReportService(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_rpt_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_rpt.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	medService := NewMedicineService(database)
	batchService := NewBatchService(database)
	salesService := NewSalesService(database, batchService)
	reportService := NewReportService(database)

	// Add test medicine & batch expiring in 45 days
	med, err := medService.AddMedicine(models.Medicine{
		Name:         "Ibuprofen 400mg",
		Category:     "Analgesics",
		SellingPrice: 1000.0,
		BuyingPrice:  600.0,
		ReorderLevel: 10,
	}, 1, "admin")
	if err != nil {
		t.Fatalf("AddMedicine failed: %v", err)
	}

	expiry := time.Now().AddDate(0, 0, 45).Format("2006-01-02")
	_, err = batchService.AddBatch(models.Batch{
		BatchNumber:      "IBU-45",
		MedicineID:       med.ID,
		QuantityReceived: 50,
		BuyingPrice:      600.0,
		ExpiryDate:       expiry,
	}, 1, "admin")
	if err != nil {
		t.Fatalf("AddBatch failed: %v", err)
	}

	// Make a sale today
	_, err = salesService.ProcessSale(
		1,
		"admin",
		[]CartItemInput{
			{
				MedicineID: med.ID,
				Quantity:   3,
				UnitPrice:  1000.0,
			},
		},
		"cash",
		0,
		"",
		nil,
	)
	if err != nil {
		t.Fatalf("ProcessSale failed: %v", err)
	}

	// 1. Test "today"
	summary, err := reportService.GetDashboardSummary("today")
	if err != nil {
		t.Fatalf("GetDashboardSummary failed: %v", err)
	}

	if summary.TotalMedicines != 1 {
		t.Errorf("expected total medicines 1, got %d", summary.TotalMedicines)
	}

	if summary.SalesToday != 3000.0 {
		t.Errorf("expected sales 3000, got %f", summary.SalesToday)
	}

	if summary.TotalItemsSold != 3 {
		t.Errorf("expected 3 items sold, got %d", summary.TotalItemsSold)
	}

	if summary.TotalProfit != 1200.0 { // (3 * 1000) - (3 * 600) = 3000 - 1800 = 1200
		t.Errorf("expected total profit 1200.0, got %f", summary.TotalProfit)
	}

	if len(summary.WhoSold) != 1 || summary.WhoSold[0].TotalRevenue != 3000.0 {
		t.Errorf("expected WhoSold to contain 1 cashier with 3000 rev, got %+v", summary.WhoSold)
	}

	// 2. Test specific date (today's exact date string YYYY-MM-DD)
	todayStr := time.Now().Format("2006-01-02")
	summarySpecific, err := reportService.GetDashboardSummary(todayStr)
	if err != nil {
		t.Fatalf("GetDashboardSummary specific date failed: %v", err)
	}
	if summarySpecific.SalesToday != 3000.0 {
		t.Errorf("expected specific date sales 3000, got %f", summarySpecific.SalesToday)
	}

	// 3. Test SalesSummary with specific date
	salesSum, err := reportService.GetSalesSummary(todayStr)
	if err != nil {
		t.Fatalf("GetSalesSummary failed: %v", err)
	}
	if salesSum.PeriodRevenue != 3000.0 || salesSum.TotalItemsSold != 3 {
		t.Errorf("expected salesSum revenue 3000 and 3 items, got rev %f items %d", salesSum.PeriodRevenue, salesSum.TotalItemsSold)
	}
	if len(salesSum.TopProducts) != 1 || salesSum.TopProducts[0].Profit != 1200.0 {
		t.Errorf("expected top products to have 1 item with profit 1200, got %+v", salesSum.TopProducts)
	}
}

func TestGetDateRange(t *testing.T) {
	s1, e1, l1 := GetDateRange("today")
	today := time.Now().Format("2006-01-02")
	if s1 != today || e1 != today {
		t.Errorf("expected today %s, got %s - %s (label: %s)", today, s1, e1, l1)
	}

	s2, e2, _ := GetDateRange("yesterday")
	yest := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	if s2 != yest || e2 != yest {
		t.Errorf("expected yesterday %s, got %s - %s", yest, s2, e2)
	}

	s3, e3, l3 := GetDateRange("2026-07-17")
	if s3 != "2026-07-17" || e3 != "2026-07-17" || l3 != "17 Jul 2026" {
		t.Errorf("expected 2026-07-17, got %s - %s (label: %s)", s3, e3, l3)
	}

	s4, e4, _ := GetDateRange("custom:2026-07-01:2026-07-17")
	if s4 != "2026-07-01" || e4 != "2026-07-17" {
		t.Errorf("expected custom 2026-07-01 to 2026-07-17, got %s - %s", s4, e4)
	}
}
