package models

import "time"

type User struct {
	ID                 int64      `json:"id"`
	Username           string     `json:"username"`
	PasswordHash       string     `json:"-"`
	Role               string     `json:"role"` // "admin" or "cashier"
	FullName           string     `json:"full_name"`
	Phone              string     `json:"phone"`
	Email              string     `json:"email"`
	Branch             string     `json:"branch"`
	Active             bool       `json:"active"`
	LastLoginAt        *time.Time `json:"last_login_at,omitempty"`
	LastLogoutAt       *time.Time `json:"last_logout_at,omitempty"`
	LastWorkstation    string     `json:"last_workstation,omitempty"`
	FailedLoginAttempts int       `json:"failed_login_attempts,omitempty"`
	LockedUntil        *time.Time `json:"locked_until,omitempty"`
	PasswordChangedAt  *time.Time `json:"password_changed_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
}

type Supplier struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	ContactPerson string    `json:"contact_person"`
	Phone         string    `json:"phone"`
	Email         string    `json:"email"`
	Address       string    `json:"address"`
	IsArchived    bool      `json:"is_archived"`
	CreatedAt     time.Time `json:"created_at"`
}

type Medicine struct {
	ID                  int64     `json:"id"`
	Name                string    `json:"name"`
	GenericName         string    `json:"generic_name"`
	BrandName           string    `json:"brand_name"`
	Category            string    `json:"category"`
	DosageStrength      string    `json:"dosage_strength"`
	MedicineForm        string    `json:"medicine_form"`
	PackSize            string    `json:"pack_size"`
	BuyingPrice         float64   `json:"buying_price"`
	SellingPrice        float64   `json:"selling_price"`
	CurrentStock        int       `json:"current_stock"`
	ReorderLevel        int       `json:"reorder_level"`
	Manufacturer        string    `json:"manufacturer"`
	SupplierID          *int64    `json:"supplier_id,omitempty"`
	SupplierName        string    `json:"supplier_name,omitempty"`
	Description         string    `json:"description"`
	TaxRate             float64   `json:"tax_rate"`
	RequiresPrescription bool     `json:"requires_prescription"`
	ProductStatus       string    `json:"product_status"`
	IsArchived          bool      `json:"is_archived"`
	CreatedAt           time.Time `json:"created_at"`
	Units               []MedicineUnit `json:"units,omitempty"`
}

type MedicineUnit struct {
	ID               int64   `json:"id"`
	MedicineID       int64   `json:"medicine_id"`
	UnitName         string  `json:"unit_name"`
	ConversionFactor int     `json:"conversion_factor"`
	Price            float64 `json:"price"`
	IsBaseUnit       bool    `json:"is_base_unit"`
}

type Batch struct {
	ID                int64     `json:"id"`
	BatchNumber       string    `json:"batch_number"`
	MedicineID        int64     `json:"medicine_id"`
	MedicineName      string    `json:"medicine_name,omitempty"`
	SupplierID        *int64    `json:"supplier_id,omitempty"`
	SupplierName      string    `json:"supplier_name,omitempty"`
	QuantityReceived  int       `json:"quantity_received"`
	QuantityRemaining int       `json:"quantity_remaining"`
	BuyingPrice       float64   `json:"buying_price"`
	MfgDate           string    `json:"mfg_date"`
	ExpiryDate        string    `json:"expiry_date"`
	DateReceived      time.Time `json:"date_received"`
}

type Purchase struct {
	ID            int64          `json:"id"`
	InvoiceNumber string         `json:"invoice_number"`
	SupplierID    *int64         `json:"supplier_id,omitempty"`
	SupplierName  string         `json:"supplier_name,omitempty"`
	PurchaseDate  time.Time      `json:"purchase_date"`
	TotalAmount   float64        `json:"total_amount"`
	Notes         string         `json:"notes"`
	Items         []PurchaseItem `json:"items,omitempty"`
}

type PurchaseItem struct {
	ID           int64   `json:"id"`
	PurchaseID   int64   `json:"purchase_id"`
	MedicineID   int64   `json:"medicine_id"`
	MedicineName string  `json:"medicine_name,omitempty"`
	BatchID      *int64  `json:"batch_id,omitempty"`
	BatchNumber  string  `json:"batch_number,omitempty"`
	Quantity     int     `json:"quantity"`
	BuyingPrice  float64 `json:"buying_price"`
}

type Sale struct {
	ID            int64      `json:"id"`
	InvoiceNumber string     `json:"invoice_number"`
	UserID        *int64     `json:"user_id,omitempty"`
	Username      string     `json:"username,omitempty"`
	SaleDate      time.Time  `json:"sale_date"`
	TotalAmount   float64    `json:"total_amount"`
	DiscountAmount float64   `json:"discount_amount"`
	DiscountType   string    `json:"discount_type"` // "percent" or "fixed"
	ShiftID        *int64    `json:"shift_id,omitempty"`
	PaymentMethod string     `json:"payment_method"`
	Items         []SaleItem `json:"items,omitempty"`
}

type SaleItem struct {
	ID           int64   `json:"id"`
	SaleID       int64   `json:"sale_id"`
	MedicineID   int64   `json:"medicine_id"`
	MedicineName string  `json:"medicine_name,omitempty"`
	BatchID      int64   `json:"batch_id"`
	BatchNumber      string  `json:"batch_number,omitempty"`
	UnitName         string  `json:"unit_name,omitempty"`
	ConversionFactor int     `json:"conversion_factor,omitempty"`
	Quantity         int     `json:"quantity"`
	UnitPrice        float64 `json:"unit_price"`
	Subtotal         float64 `json:"subtotal"`
}

type StockAdjustment struct {
	ID               int64     `json:"id"`
	MedicineID       int64     `json:"medicine_id"`
	MedicineName     string    `json:"medicine_name,omitempty"`
	BatchID          *int64    `json:"batch_id,omitempty"`
	BatchNumber      string    `json:"batch_number,omitempty"`
	UserID           *int64    `json:"user_id,omitempty"`
	Username         string    `json:"username,omitempty"`
	QuantityAdjusted int       `json:"quantity_adjusted"`
	Reason           string    `json:"reason"`
	Notes            string    `json:"notes"`
	CreatedAt        time.Time `json:"created_at"`
}

type AuditLog struct {
	ID        int64     `json:"id"`
	UserID    *int64    `json:"user_id,omitempty"`
	Username  string    `json:"username"`
	Action    string    `json:"action"`
	Details   string    `json:"details"`
	Timestamp time.Time `json:"timestamp"`
}

type PaginatedMedicines struct {
	Items      []Medicine `json:"items"`
	TotalCount int        `json:"total_count"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
}

type PaginatedPurchases struct {
	Items      []Purchase `json:"items"`
	TotalCount int        `json:"total_count"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
}

type PrescriptionItem struct {
	ID                 int64   `json:"id"`
	PrescriptionID     int64   `json:"prescription_id"`
	MedicineID         int64   `json:"medicine_id"`
	MedicineName       string  `json:"medicine_name,omitempty"`
	MedicinePrice      float64 `json:"medicine_price,omitempty"`
	CurrentStock       int     `json:"current_stock,omitempty"`
	Dosage             string  `json:"dosage"`
	Frequency          string  `json:"frequency"`
	DurationDays       int     `json:"duration_days"`
	QuantityPrescribed int     `json:"quantity_prescribed"`
	QuantityDispensed  int     `json:"quantity_dispensed"`
}

type Prescription struct {
	ID                 int64              `json:"id"`
	PrescriptionNumber string             `json:"prescription_number"`
	PatientName        string             `json:"patient_name"`
	PatientAge         int                `json:"patient_age"`
	PatientPhone       string             `json:"patient_phone"`
	DoctorName         string             `json:"doctor_name"`
	DoctorContact      string             `json:"doctor_contact"`
	Status             string             `json:"status"` // "Pending", "Dispensed", "Cancelled"
	Notes              string             `json:"notes"`
	CreatedBy          *int64             `json:"created_by,omitempty"`
	CreatedByName      string             `json:"created_by_name,omitempty"`
	CreatedAt          time.Time          `json:"created_at"`
	Items              []PrescriptionItem `json:"items,omitempty"`
}

type NotificationItem struct {
	ID       string `json:"id"`
	Type     string `json:"type"` // "low_stock", "expiring_batch"
	Title    string `json:"title"`
	Message  string `json:"message"`
	Severity string `json:"severity"` // "warning", "danger"
	Target   string `json:"target"`   // "inventory", "pos"
}

type NotificationSummary struct {
	TotalCount    int                `json:"total_count"`
	LowStockCount int                `json:"low_stock_count"`
	ExpiringCount int                `json:"expiring_count"`
	Items         []NotificationItem `json:"items"`
}

type SearchResultItem struct {
	ID         int64  `json:"id"`
	Category   string `json:"category"` // "Medicine", "Sale", "Prescription", "Supplier"
	Title      string `json:"title"`
	Subtitle   string `json:"subtitle"`
	TargetView string `json:"target_view"`
}

type SystemConfig struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type LoginHistory struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	Username    string    `json:"username"`
	Action      string    `json:"action"` // "login", "logout", "force_logout"
	Workstation string    `json:"workstation"`
	CreatedAt   time.Time `json:"created_at"`
}

type RolePermission struct {
	Role       string `json:"role"`
	Permission string `json:"permission"`
}

type PermissionInfo struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

// AllPermissions defines every granular permission in the system.
var AllPermissions = []PermissionInfo{
	{Key: "view_dashboard", Label: "View Dashboard", Description: "Access the main dashboard overview"},
	{Key: "create_sale", Label: "Create Sale", Description: "Process POS transactions"},
	{Key: "edit_sale", Label: "Edit Sale", Description: "Modify existing sales records"},
	{Key: "void_sale", Label: "Void Sale", Description: "Cancel and void a sale"},
	{Key: "refund_sale", Label: "Process Refund", Description: "Issue refunds to customers"},
	{Key: "apply_discount", Label: "Apply Discount", Description: "Apply discounts to sales"},
	{Key: "view_inventory", Label: "View Inventory", Description: "Browse medicine stock"},
	{Key: "edit_inventory", Label: "Edit Inventory", Description: "Change prices and adjust stock"},
	{Key: "stock_receiving", Label: "Stock Receiving", Description: "Record purchase orders and receive stock"},
	{Key: "view_reports", Label: "View Reports", Description: "Access sales and performance reports"},
	{Key: "export_data", Label: "Export Data", Description: "Export database backups"},
	{Key: "print_receipt", Label: "Print Receipt", Description: "Print sales receipts"},
	{Key: "manage_users", Label: "Manage Users", Description: "Create, edit, deactivate users"},
	{Key: "manage_suppliers", Label: "Manage Suppliers", Description: "Add, edit, archive suppliers"},
	{Key: "manage_prescriptions", Label: "Manage Prescriptions", Description: "Create and manage prescriptions"},
	{Key: "dispense_prescription", Label: "Dispense Prescription", Description: "Dispense prescribed medicines"},
	{Key: "approve_transactions", Label: "Approve Transactions", Description: "Approve pending transactions"},
	{Key: "view_audit_logs", Label: "View Audit Logs", Description: "Access system audit trail"},
	{Key: "manage_settings", Label: "Manage Pharmacy Settings", Description: "Configure pharmacy-wide settings (name, tax, currency etc.)"},
	{Key: "access_settings", Label: "Access Settings", Description: "Access system settings panel"},
}

type PharmacyConfig struct {
	PharmacyName       string  `json:"pharmacy_name"`
	Logo               string  `json:"logo"`
	Address            string  `json:"address"`
	Phone              string  `json:"phone"`
	Email              string  `json:"email"`
	LicenseNumber      string  `json:"license_number"`
	RegistrationNumber string  `json:"registration_number"`
	TaxNumber          string  `json:"tax_number"`
	OperatingHours     string  `json:"operating_hours"`
	Currency           string  `json:"currency"`
	DateFormat         string  `json:"date_format"`
	TimeFormat         string  `json:"time_format"`
	ReceiptFormat      string  `json:"receipt_format"`
	InvoiceFormat      string  `json:"invoice_format"`
	DefaultTax         float64 `json:"default_tax"`
	DefaultDiscount    float64 `json:"default_discount"`
	LowStockThreshold  int     `json:"low_stock_threshold"`
	ExpiryWarningDays  int     `json:"expiry_warning_days"`
	ReturnRules        string  `json:"return_rules"`
	NumberingFormats   string  `json:"numbering_formats"`
}

type AuthConfig struct {
	MaxFailedAttempts       int  `json:"max_failed_attempts"`
	LockoutDurationMinutes  int  `json:"lockout_duration_minutes"`
	SessionIdleTimeoutMinutes int `json:"session_idle_timeout_minutes"`
	RequireReauthForSensitive bool `json:"require_reauth_for_sensitive"`
}

type Shift struct {
	ID               int64      `json:"id"`
	UserID           int64      `json:"user_id"`
	Username         string     `json:"username"`
	StartedAt        time.Time  `json:"started_at"`
	EndedAt          *time.Time `json:"ended_at,omitempty"`
	OpeningCash      float64    `json:"opening_cash"`
	ExpectedCash     float64    `json:"expected_cash"`
	ActualCash       float64    `json:"actual_cash"`
	CashVariance     float64    `json:"cash_variance"`
	TotalSalesCount  int        `json:"total_sales_count"`
	TotalSalesAmount float64    `json:"total_sales_amount"`
	Status           string     `json:"status"` // "open" or "closed"
	Notes            string     `json:"notes"`
}

type ShiftZReport struct {
	Shift           Shift     `json:"shift"`
	CashSalesTotal  float64   `json:"cash_sales_total"`
	GrossSalesTotal float64   `json:"gross_sales_total"`
	TotalDiscounts  float64   `json:"total_discounts"`
	NetSalesTotal   float64   `json:"net_sales_total"`
	ExpectedDrawer  float64   `json:"expected_drawer"`
	ActualDrawer    float64   `json:"actual_drawer"`
	CashVariance    float64   `json:"cash_variance"`
	PrintedAt       time.Time `json:"printed_at"`
}


