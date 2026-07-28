package db

import (
	"database/sql"
	"fmt"
	"math/rand"
	"time"

	"golang.org/x/crypto/bcrypt"
)


// SeedDatabase wipes all tables and populates them with ~100 realistic records each.
func (db *DB) SeedDatabase() error {
	fmt.Println("Starting full database reset and seed...")

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 1. Wipe all existing data (disable foreign keys temporarily to truncate)
	if _, err := tx.Exec("PRAGMA foreign_keys = OFF;"); err != nil {
		return err
	}
	tables := []string{
		"audit_logs", "stock_adjustments", "sale_items", "sales",
		"purchase_items", "purchases", "batches", "medicines", "suppliers", "users",
	}
	for _, table := range tables {
		if _, err := tx.Exec(fmt.Sprintf("DELETE FROM %s", table)); err != nil {
			return fmt.Errorf("failed to truncate %s: %w", table, err)
		}
		// Reset sqlite sequence
		tx.Exec("DELETE FROM sqlite_sequence WHERE name=?", table)
	}
	if _, err := tx.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return err
	}

	// 2. Seed Users
	fmt.Println("Seeding users...")
	if err := db.seedUsersTx(tx); err != nil {
		return err
	}

	// 3. Seed Suppliers
	fmt.Println("Seeding suppliers...")
	if err := db.seedSuppliersTx(tx); err != nil {
		return err
	}

	// 4. Seed Medicines
	fmt.Println("Seeding medicines...")
	if err := db.seedMedicinesTx(tx); err != nil {
		return err
	}

	// 5. Seed Batches & Purchases
	fmt.Println("Seeding batches and purchases...")
	if err := db.seedBatchesAndPurchasesTx(tx); err != nil {
		return err
	}

	// 6. Seed Sales & Audit Logs
	fmt.Println("Seeding sales and audit logs...")
	if err := db.seedSalesAndLogsTx(tx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit seed transaction: %w", err)
	}

	fmt.Println("Database reset and seed completed successfully!")
	return nil
}

// ClearSampleData wipes all operational inventory, sales, purchases, batches, and prescriptions while preserving users and pharmacy configuration.
func (db *DB) ClearSampleData() error {
	fmt.Println("Wiping all sample medicines, inventory, sales, and transaction data...")
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec("PRAGMA foreign_keys = OFF;"); err != nil {
		return err
	}

	tables := []string{
		"audit_logs", "stock_adjustments", "sale_items", "sales",
		"purchase_items", "purchases", "batches", "medicines", "suppliers",
		"shifts", "prescription_items", "prescriptions", "login_history",
	}

	for _, table := range tables {
		if _, err := tx.Exec(fmt.Sprintf("DELETE FROM %s", table)); err != nil {
			return fmt.Errorf("failed to clear %s: %w", table, err)
		}
		tx.Exec("DELETE FROM sqlite_sequence WHERE name=?", table)
	}

	if _, err := tx.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit wipe transaction: %w", err)
	}

	fmt.Println("All sample data cleared successfully. System ready for production data!")
	return nil
}

func (db *DB) seedUsersTx(tx *sql.Tx) error {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	users := []struct {
		username string
		role     string
		fullName string
	}{
		{"admin", "admin", "System Administrator"},
		{"manager", "admin", "Pharmacy Manager"},
		{"cashier1", "cashier", "Alice Johnson"},
		{"cashier2", "cashier", "Bob Smith"},
		{"cashier3", "cashier", "Charlie Davis"},
	}

	for _, u := range users {
		_, err := tx.Exec(
			"INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
			u.username, string(hashedPassword), u.role, u.fullName,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (db *DB) seedSuppliersTx(tx *sql.Tx) error {
	companies := []string{"Abacus Pharma", "Quality Chemicals", "Medreich", "Cipla", "GSK Uganda", "Rene Industries", "AstraZeneca", "Sanofi", "Pfizer Local", "J&J Distributors"}
	for i := 1; i <= 100; i++ {
		name := companies[i%len(companies)] + fmt.Sprintf(" Branch %d", i)
		_, err := tx.Exec(
			"INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)",
			name, fmt.Sprintf("Contact Person %d", i), fmt.Sprintf("+256700000%03d", i), fmt.Sprintf("supplier%d@example.com", i), fmt.Sprintf("Plot %d, Industrial Area, Kampala", i),
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (db *DB) seedMedicinesTx(tx *sql.Tx) error {
	categories := []string{"Antibiotics", "Analgesics", "Antimalarials", "Cardiovascular", "Vitamins & Supplements", "Respiratory", "Dermatology", "General"}
	forms := []string{"Tablet", "Capsule", "Syrup / Suspension", "Injection", "Ointment / Cream"}
	manufacturers := []string{"Cipla", "GSK", "Pfizer", "Sanofi", "Medreich"}

	baseNames := []string{"Amoxicillin", "Paracetamol", "Artemether", "Lumefantrine", "Aspirin", "Ibuprofen", "Ciprofloxacin", "Metformin", "Amlodipine", "Omeprazole"}

	for i := 1; i <= 100; i++ {
		base := baseNames[i%len(baseNames)]
		name := fmt.Sprintf("%s %d", base, i)
		buyingPrice := float64(rand.Intn(20000) + 1000)
		sellingPrice := buyingPrice * (1.2 + rand.Float64()*0.8) // 20% to 100% markup

		_, err := tx.Exec(
			`INSERT INTO medicines (name, generic_name, brand_name, category, dosage_strength, medicine_form, pack_size, buying_price, selling_price, current_stock, reorder_level, manufacturer, description) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			name, base+" Generic", base+" Brand", categories[i%len(categories)], fmt.Sprintf("%dmg", (i%10+1)*50), forms[i%len(forms)], "10x10", buyingPrice, sellingPrice, 0, 20, manufacturers[i%len(manufacturers)], "Seeded realistic medicine description for "+name,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (db *DB) seedBatchesAndPurchasesTx(tx *sql.Tx) error {
	now := time.Now()
	for i := 1; i <= 100; i++ {
		medID := (i % 100) + 1
		if medID == 0 {
			medID = 1
		}
		supplierID := (i % 100) + 1
		if supplierID == 0 {
			supplierID = 1
		}
		
		var buyingPrice float64
		err := tx.QueryRow("SELECT buying_price FROM medicines WHERE id = ?", medID).Scan(&buyingPrice)
		if err != nil {
			return err
		}

		qty := rand.Intn(400) + 50
		expiry := now.AddDate(0, rand.Intn(24)+1, 0).Format("2006-01-02") // 1 to 24 months in future
		batchNum := fmt.Sprintf("B%d-%s", time.Now().Year(), fmt.Sprintf("%04d", i))

		// 1. Insert Batch
		res, err := tx.Exec(
			`INSERT INTO batches (batch_number, medicine_id, supplier_id, quantity_received, quantity_remaining, buying_price, expiry_date, date_received)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			batchNum, medID, supplierID, qty, qty, buyingPrice, expiry, now.AddDate(0, -rand.Intn(3), -rand.Intn(28)).Format(time.RFC3339),
		)
		if err != nil {
			return err
		}
		batchID, _ := res.LastInsertId()

		// 2. Insert Purchase
		totalAmt := buyingPrice * float64(qty)
		pRes, err := tx.Exec(
			"INSERT INTO purchases (invoice_number, supplier_id, purchase_date, total_amount, notes) VALUES (?, ?, ?, ?, ?)",
			fmt.Sprintf("INV-SUP-%d", i+1000), supplierID, now.AddDate(0, -rand.Intn(3), -rand.Intn(28)).Format(time.RFC3339), totalAmt, "Seeded restock",
		)
		if err != nil {
			return err
		}
		purchaseID, _ := pRes.LastInsertId()

		// 3. Insert Purchase Item
		_, err = tx.Exec(
			"INSERT INTO purchase_items (purchase_id, medicine_id, batch_id, quantity, buying_price) VALUES (?, ?, ?, ?, ?)",
			purchaseID, medID, batchID, qty, buyingPrice,
		)
		if err != nil {
			return err
		}

		// 4. Update Medicine Current Stock
		_, err = tx.Exec("UPDATE medicines SET current_stock = current_stock + ? WHERE id = ?", qty, medID)
		if err != nil {
			return err
		}
	}
	return nil
}

func (db *DB) seedSalesAndLogsTx(tx *sql.Tx) error {
	now := time.Now()
	paymentMethods := []string{"Cash", "Mobile Money", "Card"}

	for i := 1; i <= 100; i++ {
		medID := (i % 100) + 1
		if medID == 0 {
			medID = 1
		}

		var sellingPrice float64
		err := tx.QueryRow("SELECT selling_price FROM medicines WHERE id = ?", medID).Scan(&sellingPrice)
		if err != nil {
			return err
		}

		var batchID int
		err = tx.QueryRow("SELECT id FROM batches WHERE medicine_id = ? AND quantity_remaining > 0 ORDER BY expiry_date ASC LIMIT 1", medID).Scan(&batchID)
		if err != nil {
			if err == sql.ErrNoRows {
				continue // Skip if no stock
			}
			return err
		}

		qty := rand.Intn(5) + 1
		subtotal := sellingPrice * float64(qty)

		// Create Sale
		res, err := tx.Exec(
			"INSERT INTO sales (invoice_number, user_id, sale_date, total_amount, payment_method) VALUES (?, ?, ?, ?, ?)",
			fmt.Sprintf("INV-POS-%d", i+5000), 1, now.AddDate(0, 0, -rand.Intn(30)).Format(time.RFC3339), subtotal, paymentMethods[i%len(paymentMethods)],
		)
		if err != nil {
			return err
		}
		saleID, _ := res.LastInsertId()

		// Create Sale Item
		_, err = tx.Exec(
			"INSERT INTO sale_items (sale_id, medicine_id, batch_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
			saleID, medID, batchID, qty, sellingPrice, subtotal,
		)
		if err != nil {
			return err
		}

		// Deduct from batch and medicine
		tx.Exec("UPDATE batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?", qty, batchID)
		tx.Exec("UPDATE medicines SET current_stock = current_stock - ? WHERE id = ?", qty, medID)

		// Create Audit Log
		tx.Exec(
			"INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)",
			1, "admin", "Process Sale", fmt.Sprintf("Completed sale %s for UGX %.2f", fmt.Sprintf("INV-POS-%d", i+5000), subtotal),
		)
	}

	return nil
}
