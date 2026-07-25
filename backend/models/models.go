package models

import "time"

type User struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"` // "admin" or "cashier"
	FullName     string    `json:"full_name"`
	CreatedAt    time.Time `json:"created_at"`
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
	ID             int64     `json:"id"`
	Name           string    `json:"name"`
	GenericName    string    `json:"generic_name"`
	BrandName      string    `json:"brand_name"`
	Category       string    `json:"category"`
	DosageStrength string    `json:"dosage_strength"`
	MedicineForm   string    `json:"medicine_form"`
	PackSize       string    `json:"pack_size"`
	BuyingPrice    float64   `json:"buying_price"`
	SellingPrice   float64   `json:"selling_price"`
	CurrentStock   int       `json:"current_stock"`
	ReorderLevel   int       `json:"reorder_level"`
	Manufacturer   string    `json:"manufacturer"`
	Description    string    `json:"description"`
	IsArchived     bool      `json:"is_archived"`
	CreatedAt      time.Time `json:"created_at"`
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
	ID          int64   `json:"id"`
	PurchaseID  int64   `json:"purchase_id"`
	MedicineID  int64   `json:"medicine_id"`
	BatchID     *int64  `json:"batch_id,omitempty"`
	Quantity    int     `json:"quantity"`
	BuyingPrice float64 `json:"buying_price"`
}

type Sale struct {
	ID            int64      `json:"id"`
	InvoiceNumber string     `json:"invoice_number"`
	UserID        *int64     `json:"user_id,omitempty"`
	Username      string     `json:"username,omitempty"`
	SaleDate      time.Time  `json:"sale_date"`
	TotalAmount   float64    `json:"total_amount"`
	PaymentMethod string     `json:"payment_method"`
	Items         []SaleItem `json:"items,omitempty"`
}

type SaleItem struct {
	ID           int64   `json:"id"`
	SaleID       int64   `json:"sale_id"`
	MedicineID   int64   `json:"medicine_id"`
	MedicineName string  `json:"medicine_name,omitempty"`
	BatchID      int64   `json:"batch_id"`
	BatchNumber  string  `json:"batch_number,omitempty"`
	Quantity     int     `json:"quantity"`
	UnitPrice    float64 `json:"unit_price"`
	Subtotal     float64 `json:"subtotal"`
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


