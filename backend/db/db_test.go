package db

import (
	"os"
	"path/filepath"
	"testing"

	"golang.org/x/crypto/bcrypt"
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

	// Verify Admin User Seeded
	var username, role, passwordHash string
	err = database.QueryRow("SELECT username, role, password_hash FROM users WHERE username = ?", "admin").Scan(&username, &role, &passwordHash)
	if err != nil {
		t.Fatalf("failed to query seeded admin user: %v", err)
	}

	if username != "admin" || role != "admin" {
		t.Errorf("expected username admin and role admin, got %s, %s", username, role)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte("admin123")); err != nil {
		t.Errorf("admin password hash verification failed: %v", err)
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
