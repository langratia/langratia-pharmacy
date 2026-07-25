package db

const Schema = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    full_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    generic_name TEXT,
    brand_name TEXT,
    category TEXT,
    dosage_strength TEXT,
    medicine_form TEXT,
    pack_size TEXT,
    buying_price REAL NOT NULL DEFAULT 0.0,
    selling_price REAL NOT NULL DEFAULT 0.0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    manufacturer TEXT,
    description TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT NOT NULL,
    medicine_id INTEGER NOT NULL,
    supplier_id INTEGER,
    quantity_received INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    buying_price REAL NOT NULL,
    mfg_date TEXT,
    expiry_date TEXT NOT NULL,
    date_received DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL,
    supplier_id INTEGER,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    medicine_id INTEGER NOT NULL,
    batch_id INTEGER,
    quantity INTEGER NOT NULL,
    buying_price REAL NOT NULL,
    FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id),
    FOREIGN KEY(batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'Cash',
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    medicine_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id),
    FOREIGN KEY(batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    batch_id INTEGER,
    user_id INTEGER,
    quantity_adjusted INTEGER NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id),
    FOREIGN KEY(batch_id) REFERENCES batches(id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_number TEXT UNIQUE NOT NULL,
    patient_name TEXT NOT NULL,
    patient_age INTEGER,
    patient_phone TEXT,
    doctor_name TEXT NOT NULL,
    doctor_contact TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS prescription_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER NOT NULL,
    medicine_id INTEGER NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 1,
    quantity_prescribed INTEGER NOT NULL,
    quantity_dispensed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

type Migration struct {
	Version     int
	Description string
	Script      string
}

// Migrations contains incremental versioned database upgrades
var Migrations = []Migration{
	{
		Version:     1,
		Description: "Add active column to users for soft-delete",
		Script:      "ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1;",
	},
	{
		Version:     2,
		Description: "Add is_archived column to suppliers for soft-delete",
		Script:      "ALTER TABLE suppliers ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;",
	},
	{
		Version:     3,
		Description: "Add session tracking, lockout, and system_config",
		Script: `
			ALTER TABLE users ADD COLUMN last_login_at DATETIME;
			ALTER TABLE users ADD COLUMN last_logout_at DATETIME;
			ALTER TABLE users ADD COLUMN last_workstation TEXT;
			ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE users ADD COLUMN locked_until DATETIME;
			ALTER TABLE users ADD COLUMN password_changed_at DATETIME;

			CREATE TABLE IF NOT EXISTS system_config (
			    key TEXT PRIMARY KEY,
			    value TEXT NOT NULL
			);

			INSERT OR IGNORE INTO system_config (key, value) VALUES ('max_failed_attempts', '5');
			INSERT OR IGNORE INTO system_config (key, value) VALUES ('lockout_duration_minutes', '30');
			INSERT OR IGNORE INTO system_config (key, value) VALUES ('session_idle_timeout_minutes', '15');
			INSERT OR IGNORE INTO system_config (key, value) VALUES ('require_reauth_for_sensitive', 'false');
		`,
	},
	{
		Version:     4,
		Description: "Add phone/email/branch to users + login_history table",
		Script: `
			ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';
			ALTER TABLE users ADD COLUMN email TEXT DEFAULT '';
			ALTER TABLE users ADD COLUMN branch TEXT DEFAULT '';

			CREATE TABLE IF NOT EXISTS login_history (
			    id INTEGER PRIMARY KEY AUTOINCREMENT,
			    user_id INTEGER NOT NULL,
			    username TEXT NOT NULL,
			    action TEXT NOT NULL,
			    workstation TEXT DEFAULT '',
			    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
			);
		`,
	},
}

