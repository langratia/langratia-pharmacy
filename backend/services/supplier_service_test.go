package services_test

import (
	"path/filepath"
	"testing"

	"app/backend/db"
	"app/backend/models"
	"app/backend/services"
)

func setupTestSupplierService(t *testing.T) (*services.SupplierService, func()) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_supplier.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize test DB: %v", err)
	}

	supplierSvc := services.NewSupplierService(database)
	cleanup := func() {
		database.Close()
	}

	return supplierSvc, cleanup
}

func TestAddAndListSuppliers(t *testing.T) {
	supplierSvc, cleanup := setupTestSupplierService(t)
	defer cleanup()

	sup, err := supplierSvc.AddSupplier(models.Supplier{
		Name:          "Abacus Pharma",
		ContactPerson: "John Doe",
		Phone:         "+256700000000",
		Email:         "info@abacuspharma.com",
		Address:       "Kampala, Uganda",
	}, 1, "admin")

	if err != nil {
		t.Fatalf("AddSupplier failed: %v", err)
	}

	if sup.ID == 0 {
		t.Errorf("Expected supplier ID > 0, got %d", sup.ID)
	}

	list, err := supplierSvc.ListSuppliers(false)
	if err != nil {
		t.Fatalf("ListSuppliers failed: %v", err)
	}

	if len(list) != 1 {
		t.Fatalf("Expected 1 supplier, got %d", len(list))
	}

	if list[0].Name != "Abacus Pharma" {
		t.Errorf("Expected supplier name Abacus Pharma, got %s", list[0].Name)
	}
}

func TestSupplierArchive(t *testing.T) {
	supplierSvc, cleanup := setupTestSupplierService(t)
	defer cleanup()

	sup, err := supplierSvc.AddSupplier(models.Supplier{
		Name:          "Test Supplier",
		ContactPerson: "Alice",
		Phone:         "123",
		Email:         "a@test.com",
		Address:       "Addr",
	}, 1, "admin")
	if err != nil {
		t.Fatalf("AddSupplier failed: %v", err)
	}

	err = supplierSvc.ArchiveSupplier(sup.ID, true, 1, "admin")
	if err != nil {
		t.Fatalf("ArchiveSupplier failed: %v", err)
	}

	// Should not appear in non-archived list
	list, err := supplierSvc.ListSuppliers(false)
	if err != nil {
		t.Fatalf("ListSuppliers failed: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("Expected 0 suppliers, got %d", len(list))
	}

	// Should appear in archived list
	archived, err := supplierSvc.ListSuppliers(true)
	if err != nil {
		t.Fatalf("ListSuppliers failed: %v", err)
	}
	if len(archived) != 1 {
		t.Errorf("Expected 1 archived supplier, got %d", len(archived))
	}

	// Restore
	err = supplierSvc.ArchiveSupplier(sup.ID, false, 1, "admin")
	if err != nil {
		t.Fatalf("ArchiveSupplier (restore) failed: %v", err)
	}

	list, err = supplierSvc.ListSuppliers(false)
	if err != nil {
		t.Fatalf("ListSuppliers failed: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("Expected 1 supplier after restore, got %d", len(list))
	}
}

func TestSupplierDuplicateName(t *testing.T) {
	supplierSvc, cleanup := setupTestSupplierService(t)
	defer cleanup()

	_, err := supplierSvc.AddSupplier(models.Supplier{Name: "Dup"}, 1, "admin")
	if err != nil {
		t.Fatalf("AddSupplier failed: %v", err)
	}

	_, err = supplierSvc.AddSupplier(models.Supplier{Name: "Dup"}, 1, "admin")
	if err == nil {
		t.Fatal("Expected error for duplicate name, got nil")
	}
}

func TestUpdateSupplier(t *testing.T) {
	supplierSvc, cleanup := setupTestSupplierService(t)
	defer cleanup()

	sup, err := supplierSvc.AddSupplier(models.Supplier{
		Name:          "Original Supplier",
		ContactPerson: "Alice",
		Phone:         "123",
		Email:         "alice@test.com",
		Address:       "City A",
	}, 1, "admin")

	if err != nil {
		t.Fatalf("AddSupplier failed: %v", err)
	}

	sup.Name = "Updated Supplier Name"
	sup.Phone = "999"

	err = supplierSvc.UpdateSupplier(*sup, 1, "admin")
	if err != nil {
		t.Fatalf("UpdateSupplier failed: %v", err)
	}

	res, err := supplierSvc.ListSuppliers(false)
	if err != nil {
		t.Fatalf("ListSuppliers failed: %v", err)
	}

	if res[0].Name != "Updated Supplier Name" || res[0].Phone != "999" {
		t.Errorf("Update missing or unexpected data: %+v", res[0])
	}
}
