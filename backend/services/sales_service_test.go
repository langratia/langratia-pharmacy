package services

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"app/backend/db"
	"app/backend/models"
)

func TestSalesServicePOS(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_pos_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_pos.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	medService := NewMedicineService(database)
	batchService := NewBatchService(database)
	salesService := NewSalesService(database, batchService)

	// Add medicine
	med, err := medService.AddMedicine(models.Medicine{
		Name:         "Panadol Extra",
		Category:     "Analgesics",
		SellingPrice: 500.0,
		ReorderLevel: 10,
	}, 1, "admin")
	if err != nil {
		t.Fatalf("AddMedicine failed: %v", err)
	}

	// Add batch of 50 units expiring next year
	expiry := time.Now().AddDate(1, 0, 0).Format("2006-01-02")
	_, err = batchService.AddBatch(models.Batch{
		BatchNumber:      "PAN-2026-A",
		MedicineID:       med.ID,
		QuantityReceived: 50,
		BuyingPrice:      200.0,
		ExpiryDate:       expiry,
	}, 1, "admin")
	if err != nil {
		t.Fatalf("AddBatch failed: %v", err)
	}

	// Process Sale of 10 tablets
	cartItem := CartItemInput{
		MedicineID: med.ID,
		Quantity:   10,
		UnitPrice:  500.0,
	}

	sale, err := salesService.ProcessSale(1, "cashier1", []CartItemInput{cartItem}, "Cash")
	if err != nil {
		t.Fatalf("ProcessSale failed: %v", err)
	}

	if sale.TotalAmount != 5000.0 {
		t.Errorf("expected total amount 5000, got %f", sale.TotalAmount)
	}

	// Verify medicine current stock reduced (50 - 10 = 40)
	updatedMed, err := medService.GetMedicineByID(med.ID)
	if err != nil {
		t.Fatalf("GetMedicineByID failed: %v", err)
	}
	if updatedMed.CurrentStock != 40 {
		t.Errorf("expected stock 40, got %d", updatedMed.CurrentStock)
	}

	// List recent sales
	salesList, err := salesService.ListRecentSales(10)
	if err != nil {
		t.Fatalf("ListRecentSales failed: %v", err)
	}
	if len(salesList) != 1 {
		t.Errorf("expected 1 sale, got %d", len(salesList))
	}
}
