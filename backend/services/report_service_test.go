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
	reportService := NewReportService(database)

	// Add test medicine & batch expiring in 45 days
	med, _ := medService.AddMedicine(models.Medicine{
		Name:         "Ibuprofen 400mg",
		Category:     "Analgesics",
		SellingPrice: 1000.0,
		ReorderLevel: 10,
	}, 1, "admin")

	expiry := time.Now().AddDate(0, 0, 45).Format("2006-01-02")
	_, _ = batchService.AddBatch(models.Batch{
		BatchNumber:      "IBU-45",
		MedicineID:       med.ID,
		QuantityReceived: 5,
		BuyingPrice:      500.0,
		ExpiryDate:       expiry,
	}, 1, "admin")

	summary, err := reportService.GetDashboardSummary("today")
	if err != nil {
		t.Fatalf("GetDashboardSummary failed: %v", err)
	}

	if summary.TotalMedicines != 1 {
		t.Errorf("expected total medicines 1, got %d", summary.TotalMedicines)
	}

	if summary.LowStockCount != 1 {
		t.Errorf("expected low stock count 1 (stock 5 <= reorder 10), got %d", summary.LowStockCount)
	}

	if summary.ExpiringSoonCount != 1 {
		t.Errorf("expected expiring soon count 1, got %d", summary.ExpiringSoonCount)
	}
}
