package services

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"app/backend/db"
	"app/backend/models"
)

func TestSupplierAndPurchaseService(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_pur_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_pur.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	supplierService := NewSupplierService(database)
	batchService := NewBatchService(database)
	medService := NewMedicineService(database)
	purchaseService := NewPurchaseService(database, batchService)

	// Add Supplier
	sup, err := supplierService.AddSupplier(models.Supplier{
		Name:          "Quality Chemicals Uganda",
		ContactPerson: "Alice N",
		Phone:         "+256700000000",
		Email:         "info@qcil.co.ug",
		Address:       "Kampala, Uganda",
	}, 1, "admin")
	if err != nil {
		t.Fatalf("AddSupplier failed: %v", err)
	}

	// Add Medicine
	med, err := medService.AddMedicine(models.Medicine{
		Name:         "Ciprofloxacin 500mg",
		Category:     "Antibiotics",
		SellingPrice: 15000,
		ReorderLevel: 10,
	}, 1, "admin")
	if err != nil {
		t.Fatalf("AddMedicine failed: %v", err)
	}

	// Record Purchase Shipment
	expiry := time.Now().AddDate(1, 0, 0).Format("2006-01-02")
	purItem := IncomingStockItem{
		MedicineID:  med.ID,
		BatchNumber: "CIP-2026-X",
		Quantity:    100,
		BuyingPrice: 8000,
		ExpiryDate:  expiry,
	}

	pur, err := purchaseService.RecordPurchase("INV-SUP-101", &sup.ID, []IncomingStockItem{purItem}, "First stock order", 1, "admin")
	if err != nil {
		t.Fatalf("RecordPurchase failed: %v", err)
	}
	if pur.TotalAmount != 800000 {
		t.Errorf("expected total amount 800000, got %f", pur.TotalAmount)
	}

	// Check that medicine stock updated to 100
	updatedMed, err := medService.GetMedicineByID(med.ID)
	if err != nil {
		t.Fatalf("GetMedicineByID failed: %v", err)
	}
	if updatedMed.CurrentStock != 100 {
		t.Errorf("expected stock 100, got %d", updatedMed.CurrentStock)
	}

	// List Purchases
	purchases, err := purchaseService.ListPurchases()
	if err != nil {
		t.Fatalf("ListPurchases failed: %v", err)
	}
	if len(purchases) != 1 {
		t.Errorf("expected 1 purchase, got %d", len(purchases))
	}
}
