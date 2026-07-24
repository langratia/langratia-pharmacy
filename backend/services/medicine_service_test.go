package services

import (
	"os"
	"path/filepath"
	"testing"

	"app/backend/db"
	"app/backend/models"
)

func TestMedicineService(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_med_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_med.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	medService := NewMedicineService(database)

	// Add Medicine
	newMed := models.Medicine{
		Name:           "Paracetamol",
		GenericName:    "Acetaminophen",
		BrandName:      "Panadol",
		Category:       "Analgesics",
		DosageStrength: "500mg",
		MedicineForm:   "Tablet",
		PackSize:       "100s",
		BuyingPrice:    5000.0,
		SellingPrice:   10000.0,
		CurrentStock:   50,
		ReorderLevel:   10,
		Manufacturer:   "GSK",
		Description:    "Pain reliever and fever reducer",
	}

	created, err := medService.AddMedicine(newMed, 1, "admin")
	if err != nil {
		t.Fatalf("AddMedicine failed: %v", err)
	}
	if created.ID <= 0 {
		t.Errorf("expected valid medicine ID, got %d", created.ID)
	}

	// Update Medicine
	created.SellingPrice = 12000.0
	err = medService.UpdateMedicine(*created, 1, "admin")
	if err != nil {
		t.Fatalf("UpdateMedicine failed: %v", err)
	}

	fetched, err := medService.GetMedicineByID(created.ID)
	if err != nil {
		t.Fatalf("GetMedicineByID failed: %v", err)
	}
	if fetched.SellingPrice != 12000.0 {
		t.Errorf("expected selling price 12000, got %f", fetched.SellingPrice)
	}

	// List Medicines
	list, err := medService.ListMedicines("Para", "Analgesics", false)
	if err != nil {
		t.Fatalf("ListMedicines failed: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 medicine in list, got %d", len(list))
	}

	// Archive Medicine
	err = medService.ArchiveMedicine(created.ID, true, 1, "admin")
	if err != nil {
		t.Fatalf("ArchiveMedicine failed: %v", err)
	}

	// List non-archived should return 0
	listActive, err := medService.ListMedicines("", "", false)
	if err != nil {
		t.Fatalf("ListMedicines failed: %v", err)
	}
	if len(listActive) != 0 {
		t.Errorf("expected 0 active medicines, got %d", len(listActive))
	}
}
