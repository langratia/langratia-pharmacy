package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"app/backend/db"
	"app/backend/models"
	"app/backend/network"
	"app/backend/services"
)

// App struct
type App struct {
	ctx                 context.Context
	database            *db.DB
	dbPath              string
	authService         *services.AuthService
	medicineService     *services.MedicineService
	batchService        *services.BatchService
	supplierService     *services.SupplierService
	purchaseService     *services.PurchaseService
	salesService        *services.SalesService
	reportService       *services.ReportService
	backupService       *services.BackupService
	prescriptionService *services.PrescriptionService
	notificationService *services.NotificationService
	searchService       *services.SearchService
}

// Config represents the local application configuration
type Config struct {
	DBPath string `json:"db_path"`
}

type NetworkStatus struct {
	IsHost bool   `json:"is_host"`
	DBPath string `json:"db_path"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// requireAdmin checks that the user with the given ID has admin role.
// This prevents frontend-level role bypass by re-verifying on the backend.
func (a *App) requireAdmin(userID int64) error {
	if a.database == nil {
		return fmt.Errorf("database not initialized")
	}
	var role string
	err := a.database.QueryRow("SELECT role FROM users WHERE id = ? AND active = 1", userID).Scan(&role)
	if err != nil {
		return fmt.Errorf("user not found or inactive")
	}
	if role != "admin" {
		return fmt.Errorf("admin privileges required")
	}
	return nil
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// 1. Try to load custom configuration for LAN setup
	var customConfig Config
	configData, err := os.ReadFile("config.json")
	if err == nil {
		_ = json.Unmarshal(configData, &customConfig)
	}

	// 2. Locate data directory (use custom if available)
	var dbPath string
	if customConfig.DBPath != "" {
		dbPath = customConfig.DBPath
	} else {
		userConfigDir, err := os.UserConfigDir()
		if err != nil {
			dbPath = filepath.Join(".", "data", "pharmacy.db")
		} else {
			dbPath = filepath.Join(userConfigDir, "LangratiaPharmacy", "pharmacy.db")
		}
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
	a.prescriptionService = services.NewPrescriptionService(database)
	a.notificationService = services.NewNotificationService(database)
	a.searchService = services.NewSearchService(database)

	// If running in Host mode, start UDP Discovery Listener
	if customConfig.DBPath == "" {
		go network.StartServerListener("LangratiaData$")
	}
}

// Auth API Bindings
func (a *App) Login(username, password, workstation string) (*models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.authService.Login(username, password, workstation)
}

func (a *App) Logout(userID int64) error {
	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.authService.Logout(userID)
}

func (a *App) CreateUser(username, password, role, fullName string, userID int64) (*models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.authService.CreateUser(username, password, role, fullName)
}

func (a *App) ListUsers(userID int64) ([]models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.authService.ListUsers()
}

func (a *App) UpdateUser(id int64, role, fullName string, userID int64) error {
	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.authService.UpdateUser(id, role, fullName)
}

func (a *App) UnlockUser(adminID int64, targetUserID int64) error {
	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(adminID); err != nil {
		return err
	}
	return a.authService.UnlockUser(targetUserID)
}

func (a *App) VerifyPassword(userID int64, password string) bool {
	if a.authService == nil {
		return false
	}
	return a.authService.VerifyPassword(userID, password)
}

func (a *App) ChangePassword(userID int64, oldPassword, newPassword string) error {
	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.authService.ChangePassword(userID, oldPassword, newPassword)
}

func (a *App) AdminResetPassword(adminID int64, targetUserID int64, newPassword string) error {
	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(adminID); err != nil {
		return err
	}
	return a.authService.AdminResetPassword(adminID, targetUserID, newPassword)
}

func (a *App) DeactivateUser(id int64, userID int64) error {
	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.authService.DeactivateUser(id)
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

func (a *App) ListMedicinesPaginated(search, category string, includeArchived bool, page, pageSize int) (*models.PaginatedMedicines, error) {
	if a.medicineService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.medicineService.ListMedicinesPaginated(search, category, includeArchived, page, pageSize)
}

func (a *App) BulkImportMedicines(medicines []models.Medicine, userID int64, username string) (int, error) {
	if a.medicineService == nil {
		return 0, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return 0, err
	}
	return a.medicineService.BulkImportMedicines(medicines, userID, username)
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
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.supplierService.AddSupplier(sup, userID, username)
}

func (a *App) UpdateSupplier(sup models.Supplier, userID int64, username string) error {
	if a.supplierService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.supplierService.UpdateSupplier(sup, userID, username)
}

func (a *App) ListSuppliers(includeArchived bool) ([]models.Supplier, error) {
	if a.supplierService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.supplierService.ListSuppliers(includeArchived)
}

func (a *App) ArchiveSupplier(id int64, archive bool, userID int64, username string) error {
	if a.supplierService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.supplierService.ArchiveSupplier(id, archive, userID, username)
}

// Purchase / Stock Receiving API Bindings
func (a *App) RecordPurchase(invoiceNumber string, supplierID *int64, items []services.IncomingStockItem, notes string, userID int64, username string) (*models.Purchase, error) {
	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.purchaseService.RecordPurchase(invoiceNumber, supplierID, items, notes, userID, username)
}

func (a *App) ListPurchases() ([]models.Purchase, error) {
	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.purchaseService.ListPurchases()
}

func (a *App) ListPurchaseItems(purchaseID int64) ([]models.PurchaseItem, error) {
	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.purchaseService.ListPurchaseItems(purchaseID)
}

func (a *App) ListPurchasesPaginated(page, pageSize int) (*models.PaginatedPurchases, error) {
	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.purchaseService.ListPurchasesPaginated(page, pageSize)
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

func (a *App) GetSalesSummary() (*services.SalesSummary, error) {
	if a.reportService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.reportService.GetSalesSummary()
}

// Backup & Audit Log API Bindings
func (a *App) ExportDatabase(destPath string, userID int64, username string) error {
	if a.backupService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.backupService.ExportDatabase(destPath, userID, username)
}

func (a *App) RestoreDatabase(sourceBackupPath string, userID int64, username string) error {
	if a.backupService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.backupService.RestoreDatabase(sourceBackupPath, userID, username)
}

func (a *App) ListAuditLogs(limit int, userID int64) ([]models.AuditLog, error) {
	if a.backupService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.backupService.ListAuditLogs(limit)
}

// ResetAndSeedDatabase drops all table contents and seeds realistic testing records.
func (a *App) ResetAndSeedDatabase(userID int64) error {
	if a.database == nil {
		return fmt.Errorf("database not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.database.SeedDatabase()
}

// User Daily Sales API Binding
func (a *App) GetUserTodaySalesTotal(userID int64) (float64, error) {
	if a.salesService == nil {
		return 0.0, fmt.Errorf("service not initialized")
	}
	return a.salesService.GetUserTodaySalesTotal(userID)
}

func (a *App) GetCashierPerformance(userID int64) (*services.CashierPerformance, error) {
	if a.salesService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.salesService.GetCashierPerformance(userID)
}

// Notification API Binding
func (a *App) GetNotificationsSummary() (*models.NotificationSummary, error) {
	if a.notificationService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.notificationService.GetNotificationsSummary()
}

// Global Search API Binding
func (a *App) GlobalSearch(query string, userRole string) ([]models.SearchResultItem, error) {
	if a.searchService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.searchService.GlobalSearch(query, userRole)
}

// Prescription API Bindings
func (a *App) CreatePrescription(userID int64, username string, patientName string, patientAge int, patientPhone string, doctorName string, doctorContact string, notes string, items []services.PrescriptionItemInput) (*models.Prescription, error) {
	if a.prescriptionService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.prescriptionService.CreatePrescription(userID, username, patientName, patientAge, patientPhone, doctorName, doctorContact, notes, items)
}

func (a *App) ListPrescriptions(status string, search string, limit int) ([]models.Prescription, error) {
	if a.prescriptionService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.prescriptionService.ListPrescriptions(status, search, limit)
}

func (a *App) GetPrescriptionDetails(prescriptionID int64) (*models.Prescription, error) {
	if a.prescriptionService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.prescriptionService.GetPrescriptionDetails(prescriptionID)
}

func (a *App) UpdatePrescriptionStatus(userID int64, username string, prescriptionID int64, status string) error {
	if a.prescriptionService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.prescriptionService.UpdatePrescriptionStatus(userID, username, prescriptionID, status)
}

// Network Config API Bindings
func (a *App) GetNetworkStatus() NetworkStatus {
	isHost := true
	if strings.HasPrefix(a.dbPath, "\\\\") || strings.HasPrefix(a.dbPath, "//") {
		isHost = false
	}
	return NetworkStatus{
		IsHost: isHost,
		DBPath: a.dbPath,
	}
}

func (a *App) UpdateDatabaseConfig(newPath string) error {
	if newPath == "" || len(newPath) > 512 {
		return fmt.Errorf("invalid database path")
	}

	config := Config{DBPath: newPath}
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	// Write to config.json in the executable's directory with user-only permissions
	if err := os.WriteFile("config.json", data, 0600); err != nil {
		return fmt.Errorf("failed to save configuration: %w", err)
	}
	return nil
}

// EnableMainServerMode automatically configures Windows to share the DB folder
func (a *App) EnableMainServerMode(userID int64) error {
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	if runtime.GOOS != "windows" {
		return fmt.Errorf("auto-sharing is only supported on Windows")
	}

	dbDir := filepath.Dir(a.dbPath)
	shareName := "LangratiaData$"

	// 'net share' command to create the hidden share
	cmdStr := fmt.Sprintf("net share %s=\"%s\" /grant:Everyone,FULL", shareName, dbDir)

	cmd := exec.Command("powershell", "-Command", "Start-Process", "cmd", "-ArgumentList", fmt.Sprintf("'/c %s'", cmdStr), "-Verb", "RunAs", "-WindowStyle", "Hidden")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to enable main server mode: %v", err)
	}
	return nil
}

// AutoDiscoverServer scans the network and automatically updates config
func (a *App) AutoDiscoverServer() (string, error) {
	path, err := network.DiscoverServer()
	if err != nil {
		return "", err
	}

	err = a.UpdateDatabaseConfig(path)
	if err != nil {
		return "", fmt.Errorf("discovered server but failed to save config: %v", err)
	}

	return path, nil
}
