package db

import (
	"os"
	"path/filepath"
	"testing"
)

func TestInitDBAndSchema(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_test.db")

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	// Verify Fresh DB starts with 1 default admin user
	var count int
	err = database.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		t.Fatalf("failed to query users count: %v", err)
	}

	if count != 1 {
		t.Errorf("expected 1 default admin user on fresh DB initialization, got %d", count)
	}
}

func TestMedicineAndBatchSchema(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_test.db")
	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	// Insert Medicine
	res, err := database.Exec(
		`INSERT INTO medicines (name, generic_name, brand_name, category, dosage_strength, medicine_form, pack_size, buying_price, selling_price, current_stock, reorder_level, manufacturer, description)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"Amoxicillin", "Amoxicillin Trihydrate", "Amoxil", "Antibiotics", "500mg", "Capsule", "10x10", 15000.0, 25000.0, 100, 20, "GSK", "Broad spectrum antibiotic",
	)
	if err != nil {
		t.Fatalf("failed to insert medicine: %v", err)
	}

	medID, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("failed to get last insert id: %v", err)
	}

	// Insert Batch
	_, err = database.Exec(
		`INSERT INTO batches (batch_number, medicine_id, quantity_received, quantity_remaining, buying_price, expiry_date)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		"BATCH-2026-001", medID, 100, 100, 15000.0, "2026-12-31",
	)
	if err != nil {
		t.Fatalf("failed to insert batch: %v", err)
	}

	// Query Medicine stock
	var stock int
	err = database.QueryRow("SELECT current_stock FROM medicines WHERE id = ?", medID).Scan(&stock)
	if err != nil {
		t.Fatalf("failed to query stock: %v", err)
	}
	if stock != 100 {
		t.Errorf("expected stock 100, got %d", stock)
	}
}

func TestSchemaMigrations(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "langratia_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_test.db")
	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	// Verify schema_migrations table exists
	var count int
	err = database.QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&count)
	if err != nil {
		t.Fatalf("failed to query schema_migrations table: %v", err)
	}
}

