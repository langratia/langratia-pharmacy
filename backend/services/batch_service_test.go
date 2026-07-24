package services

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"app/backend/db"
	"app/backend/models"
)

func TestBatchServiceAndFEFO(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_batch_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_batch.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	medService := NewMedicineService(database)
	batchService := NewBatchService(database)

	// Add test medicine
	med, err := medService.AddMedicine(models.Medicine{
		Name:         "Amoxicillin 500mg",
		Category:     "Antibiotics",
		SellingPrice: 20000.0,
		ReorderLevel: 10,
	}, 1, "admin")
	if err != nil {
		t.Fatalf("failed to add medicine: %v", err)
	}

	// Add Batch 1 (expires in 60 days, Qty: 30)
	expiry1 := time.Now().AddDate(0, 0, 60).Format("2006-01-02")
	_, err = batchService.AddBatch(models.Batch{
		BatchNumber:      "BATCH-001",
		MedicineID:       med.ID,
		QuantityReceived: 30,
		BuyingPrice:      10000.0,
		ExpiryDate:       expiry1,
	}, 1, "admin")
	if err != nil {
		t.Fatalf("failed to add batch 1: %v", err)
	}

	// Add Batch 2 (expires in 30 days - EARLIER EXPIRY, Qty: 20)
	expiry2 := time.Now().AddDate(0, 0, 30).Format("2006-01-02")
	_, err = batchService.AddBatch(models.Batch{
		BatchNumber:      "BATCH-002",
		MedicineID:       med.ID,
		QuantityReceived: 20,
		BuyingPrice:      10000.0,
		ExpiryDate:       expiry2,
	}, 1, "admin")
	if err != nil {
		t.Fatalf("failed to add batch 2: %v", err)
	}

	// Verify total stock updated in medicine table (30 + 20 = 50)
	updatedMed, err := medService.GetMedicineByID(med.ID)
	if err != nil {
		t.Fatalf("failed to fetch medicine: %v", err)
	}
	if updatedMed.CurrentStock != 50 {
		t.Errorf("expected current stock 50, got %d", updatedMed.CurrentStock)
	}

	// Perform FEFO deduction of 25 units
	tx, err := database.Begin()
	if err != nil {
		t.Fatalf("failed to begin tx: %v", err)
	}

	deductions, err := batchService.DeductStockFEFO(tx, med.ID, 25)
	if err != nil {
		tx.Rollback()
		t.Fatalf("DeductStockFEFO failed: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("failed to commit tx: %v", err)
	}

	// Assert FEFO logic:
	// All 20 units of BATCH-002 (earliest expiry) should be deducted
	// 5 units of BATCH-001 should be deducted
	if len(deductions) != 2 {
		t.Fatalf("expected 2 batch deductions, got %d", len(deductions))
	}

	if deductions[0].BatchNumber != "BATCH-002" || deductions[0].QuantityDeducted != 20 {
		t.Errorf("expected first deduction to be 20 units from BATCH-002, got %s: %d", deductions[0].BatchNumber, deductions[0].QuantityDeducted)
	}

	if deductions[1].BatchNumber != "BATCH-001" || deductions[1].QuantityDeducted != 5 {
		t.Errorf("expected second deduction to be 5 units from BATCH-001, got %s: %d", deductions[1].BatchNumber, deductions[1].QuantityDeducted)
	}

	// Verify medicine stock updated (50 - 25 = 25)
	finalMed, err := medService.GetMedicineByID(med.ID)
	if err != nil {
		t.Fatalf("failed to fetch final med: %v", err)
	}
	if finalMed.CurrentStock != 25 {
		t.Errorf("expected final stock 25, got %d", finalMed.CurrentStock)
	}
}
