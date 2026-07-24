package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"app/backend/db"
	"app/backend/models"
	"app/backend/services"
)

// App struct
type App struct {
	ctx             context.Context
	database        *db.DB
	dbPath          string
	authService     *services.AuthService
	medicineService *services.MedicineService
	batchService    *services.BatchService
	supplierService *services.SupplierService
	purchaseService *services.PurchaseService
	salesService    *services.SalesService
	reportService   *services.ReportService
	backupService   *services.BackupService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Locate data directory
	userConfigDir, err := os.UserConfigDir()
	var dbPath string
	if err != nil {
		dbPath = filepath.Join(".", "data", "pharmacy.db")
	} else {
		dbPath = filepath.Join(userConfigDir, "LangratiaPharmacy", "pharmacy.db")
	}

	database, err := db.InitDB(dbPath)
	if err != nil {
		fmt.Printf("Error initializing SQLite database at %s: %v\n", dbPath, err)
		// Fallback to local execution directory
		dbPath = filepath.Join(".", "pharmacy.db")
		database, err = db.InitDB(dbPath)
		if err != nil {
			panic(fmt.Sprintf("Critical failure: cannot initialize database: %v", err))
		}
	}

	a.database = database
	a.dbPath = dbPath
	a.authService = services.NewAuthService(database)
	a.medicineService = services.NewMedicineService(database)
	a.batchService = services.NewBatchService(database)
	a.supplierService = services.NewSupplierService(database)
	a.purchaseService = services.NewPurchaseService(database, a.batchService)
	a.salesService = services.NewSalesService(database, a.batchService)
	a.reportService = services.NewReportService(database)
	a.backupService = services.NewBackupService(database, dbPath)
}

// Auth API Bindings
func (a *App) Login(username, password string) (*models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.authService.Login(username, password)
}

func (a *App) CreateUser(username, password, role, fullName string) (*models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.authService.CreateUser(username, password, role, fullName)
}

func (a *App) ListUsers() ([]models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.authService.ListUsers()
}

// Medicine API Bindings
func (a *App) AddMedicine(med models.Medicine, userID int64, username string) (*models.Medicine, error) {
	if a.medicineService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.medicineService.AddMedicine(med, userID, username)
}

func (a *App) UpdateMedicine(med models.Medicine, userID int64, username string) error {
	if a.medicineService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.medicineService.UpdateMedicine(med, userID, username)
}

func (a *App) ArchiveMedicine(id int64, archive bool, userID int64, username string) error {
	if a.medicineService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.medicineService.ArchiveMedicine(id, archive, userID, username)
}

func (a *App) ListMedicines(search, category string, includeArchived bool) ([]models.Medicine, error) {
	if a.medicineService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.medicineService.ListMedicines(search, category, includeArchived)
}

// Batch & FEFO API Bindings
func (a *App) AddBatch(batch models.Batch, userID int64, username string) (*models.Batch, error) {
	if a.batchService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.batchService.AddBatch(batch, userID, username)
}

func (a *App) GetBatchesByMedicine(medicineID int64) ([]models.Batch, error) {
	if a.batchService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.batchService.GetBatchesByMedicine(medicineID)
}

func (a *App) GetExpiringBatches(withinDays int) ([]models.Batch, error) {
	if a.batchService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.batchService.GetExpiringBatches(withinDays)
}

func (a *App) AdjustStock(medicineID int64, batchID *int64, userID int64, username string, qtyAdjusted int, reason, notes string) error {
	if a.batchService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.batchService.AdjustStock(medicineID, batchID, userID, username, qtyAdjusted, reason, notes)
}

// Supplier API Bindings
func (a *App) AddSupplier(sup models.Supplier, userID int64, username string) (*models.Supplier, error) {
	if a.supplierService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.supplierService.AddSupplier(sup, userID, username)
}

func (a *App) UpdateSupplier(sup models.Supplier, userID int64, username string) error {
	if a.supplierService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.supplierService.UpdateSupplier(sup, userID, username)
}

func (a *App) ListSuppliers() ([]models.Supplier, error) {
	if a.supplierService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.supplierService.ListSuppliers()
}

// Purchase / Stock Receiving API Bindings
func (a *App) RecordPurchase(invoiceNumber string, supplierID *int64, items []services.IncomingStockItem, notes string, userID int64, username string) (*models.Purchase, error) {
	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.purchaseService.RecordPurchase(invoiceNumber, supplierID, items, notes, userID, username)
}

func (a *App) ListPurchases() ([]models.Purchase, error) {
	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.purchaseService.ListPurchases()
}

// Sales / POS API Bindings
func (a *App) ProcessSale(userID int64, username string, items []services.CartItemInput, paymentMethod string) (*models.Sale, error) {
	if a.salesService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.salesService.ProcessSale(userID, username, items, paymentMethod)
}

func (a *App) ListRecentSales(limit int) ([]models.Sale, error) {
	if a.salesService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.salesService.ListRecentSales(limit)
}

// Report & Dashboard API Bindings
func (a *App) GetDashboardSummary() (*services.DashboardSummary, error) {
	if a.reportService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.reportService.GetDashboardSummary()
}

// Backup & Audit Log API Bindings
func (a *App) ExportDatabase(destPath string, userID int64, username string) error {
	if a.backupService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.backupService.ExportDatabase(destPath, userID, username)
}

func (a *App) RestoreDatabase(sourceBackupPath string, userID int64, username string) error {
	if a.backupService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.backupService.RestoreDatabase(sourceBackupPath, userID, username)
}

func (a *App) ListAuditLogs(limit int) ([]models.AuditLog, error) {
	if a.backupService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.backupService.ListAuditLogs(limit)
}
