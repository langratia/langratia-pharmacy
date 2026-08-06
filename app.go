package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"

	"app/backend/api"
	"app/backend/db"
	"app/backend/logger"
	"app/backend/models"
	"app/backend/network"
	"app/backend/services"
	"net"
)

// App struct
type App struct {
	ctx			context.Context
	database		*db.DB
	dbPath			string
	dbConnectionFailed	bool
	dbConnectionError	string
	authService		*services.AuthService
	medicineService		*services.MedicineService
	batchService		*services.BatchService
	supplierService		*services.SupplierService
	purchaseService		*services.PurchaseService
	salesService		*services.SalesService
	reportService		*services.ReportService
	backupService		*services.BackupService
	prescriptionService	*services.PrescriptionService
	notificationService	*services.NotificationService
	searchService		*services.SearchService
	permissionService	*services.PermissionService
	configService		*services.ConfigService
	shiftService		*services.ShiftService
	licenseService		*services.LicenseService
	apiURL			string
}

// Config represents the local application configuration
type Config struct {
	DBPath string `json:"db_path"`
}

type NetworkStatus struct {
	IsHost	bool	`json:"is_host"`
	DBPath	string	`json:"db_path"`
}

type LicenseStatusResponse struct {
	IsLocked  bool   `json:"is_locked"`
	MachineID string `json:"machine_id"`
	Reason    string `json:"reason"`
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

// execDir caches the executable's directory at startup.
var execDir string

func init() {
	exe, err := os.Executable()
	if err == nil {
		execDir = filepath.Dir(exe)
	}
}

// platformFileMode returns the appropriate file permission mode for the platform.
// On Windows, Unix permission bits are ignored but we use 0644 for readability;
// on Unix, we use 0600 for user-only access to config with potential secrets.
func platformFileMode() fs.FileMode {
	if runtime.GOOS == "windows" {
		return 0644
	}
	return 0600
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize logging to executable directory
	logDir := filepath.Join(execDir, "logs")
	if err := logger.Init(logDir); err != nil {
		fmt.Printf("Warning: failed to initialize log file: %v\n", err)
	}
	logger.Info("Langratia Pharmacy POS starting up...")

	// 1. Try to load custom configuration for LAN setup
	var customConfig Config
	configPath := filepath.Join(execDir, "config.json")
	configData, err := os.ReadFile(configPath)
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
			dbPath = filepath.Join(execDir, "data", "pharmacy.db")
		} else {
			dbPath = filepath.Join(userConfigDir, "LangratiaPharmacy", "pharmacy.db")
		}
	}

	database, err := db.InitDB(dbPath)
	if err != nil {
		logger.Error("Error initializing SQLite database at %s: %v", dbPath, err)
		if customConfig.DBPath != "" {
			// If a custom network database path is explicitly configured, DO NOT silently fall back to local database.
			a.dbConnectionFailed = true
			a.dbConnectionError = err.Error()
			a.dbPath = dbPath
			a.database = nil
		} else {
			// Fallback to local executable directory
			dbPath = filepath.Join(execDir, "pharmacy.db")
			database, err = db.InitDB(dbPath)
			if err != nil {
				logger.Error("Critical failure: cannot initialize database: %v", err)
				panic(fmt.Sprintf("Critical failure: cannot initialize database: %v", err))
			}
			a.database = database
			a.dbPath = dbPath
		}
	} else {
		a.database = database
		a.dbPath = dbPath
	}

	// Only initialize services if we have a valid database connection
	if a.database != nil {
		a.authService = services.NewAuthService(a.database)
		a.medicineService = services.NewMedicineService(a.database)
		a.batchService = services.NewBatchService(a.database)
		a.supplierService = services.NewSupplierService(a.database)
		a.purchaseService = services.NewPurchaseService(a.database, a.batchService)
		a.salesService = services.NewSalesService(a.database, a.batchService)
		a.reportService = services.NewReportService(a.database)
		a.backupService = services.NewBackupService(a.database, a.dbPath)
		a.prescriptionService = services.NewPrescriptionService(a.database)
		a.notificationService = services.NewNotificationService(a.database)
		a.searchService = services.NewSearchService(a.database)
		a.permissionService = services.NewPermissionService(a.database)
		a.configService = services.NewConfigService(a.database)
		a.shiftService = services.NewShiftService(a.database)
		a.licenseService = services.NewLicenseService(a.database)

		// Network / Proxy Initialization
		if customConfig.DBPath != "" && strings.HasPrefix(customConfig.DBPath, "http://") {
			// Client mode: set the API URL so proxies take over
			a.apiURL = customConfig.DBPath
			logger.Info("Starting in CLIENT mode connecting to API: %s", a.apiURL)
		} else if customConfig.DBPath == "" {
			// Host mode: Start the RPC Server to serve clients, and start UDP discovery
			logger.Info("Starting in HOST mode")
			go api.StartServer(a)
			go network.StartServerListener()
		}

		// Start Automated Backup Scheduler
		a.startBackupScheduler()
	} else {
		logger.Warn("Services initialization skipped due to missing database connection.")
	}
}

// shutdown is called when the app is terminating.
func (a *App) shutdown(ctx context.Context) {
	logger.Info("Shutting down Langratia Pharmacy POS...")
	if a.database != nil {
		if err := a.database.Close(); err != nil {
			logger.Error("Error closing database: %v", err)
		}
	}
	logger.Info("Shutdown complete.")
}

// startBackupScheduler initiates a background goroutine that performs periodic SQLite backups.
func (a *App) startBackupScheduler() {
	go func() {
		// Run a backup once on startup to ensure we always get a snapshot if the app is opened
		a.performAutomatedBackup()

		// Then run every 12 hours
		ticker := time.NewTicker(12 * time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-a.ctx.Done():
				return
			case <-ticker.C:
				a.performAutomatedBackup()
			}
		}
	}()
}

func (a *App) performAutomatedBackup() {
	backupDir := filepath.Join(filepath.Dir(a.dbPath), "backups")
	if err := os.MkdirAll(backupDir, platformFileMode()); err != nil {
		logger.Error("Failed to create backup directory: %v", err)
		return
	}

	// Create backup filename with timestamp
	fileName := fmt.Sprintf("pharmacy_backup_%s.db", time.Now().Format("20060102_150405"))
	destPath := filepath.Join(backupDir, fileName)

	// Call ExportDatabase with system user ID (0)
	if err := a.backupService.ExportDatabase(destPath, 0, "SYSTEM_AUTOMATED_BACKUP"); err != nil {
		logger.Error("Automated backup failed: %v", err)
		return
	}
	logger.Info("Automated backup completed successfully: %s", fileName)

	// Cleanup old backups (keep last 14 backups - approx 7 days)
	a.cleanupOldBackups(backupDir, 14)
}

func (a *App) cleanupOldBackups(backupDir string, keepCount int) {
	entries, err := os.ReadDir(backupDir)
	if err != nil {
		return
	}

	var backupFiles []string
	for _, f := range entries {
		if !f.IsDir() && strings.HasPrefix(f.Name(), "pharmacy_backup_") && strings.HasSuffix(f.Name(), ".db") {
			backupFiles = append(backupFiles, filepath.Join(backupDir, f.Name()))
		}
	}

	if len(backupFiles) <= keepCount {
		return
	}

	sort.Slice(backupFiles, func(i, j int) bool {
		infoI, errI := os.Stat(backupFiles[i])
		infoJ, errJ := os.Stat(backupFiles[j])
		if errI != nil || errJ != nil {
			return backupFiles[i] < backupFiles[j]
		}
		return infoI.ModTime().Before(infoJ.ModTime())
	})

	// Delete the oldest ones
	for i := 0; i < len(backupFiles)-keepCount; i++ {
		err := os.Remove(backupFiles[i])
		if err != nil {
			logger.Error("Failed to delete old backup %s: %v", backupFiles[i], err)
		} else {
			logger.Info("Deleted old backup: %s", backupFiles[i])
		}
	}
}

// SetDatabaseForTest allows injecting a mock or in-memory DB for testing.
func (a *App) SetDatabaseForTest(database *db.DB) {
	a.database = database
	
	// Re-initialize services with the new DB
	a.authService = services.NewAuthService(database)
	a.medicineService = services.NewMedicineService(database)
	a.batchService = services.NewBatchService(database)
	a.supplierService = services.NewSupplierService(database)
	a.purchaseService = services.NewPurchaseService(database, a.batchService)
	a.salesService = services.NewSalesService(database, a.batchService)
	a.reportService = services.NewReportService(database)
	a.backupService = services.NewBackupService(database, a.dbPath)
	a.prescriptionService = services.NewPrescriptionService(database)
	a.notificationService = services.NewNotificationService(database)
	a.searchService = services.NewSearchService(database)
	a.permissionService = services.NewPermissionService(database)
	a.configService = services.NewConfigService(database)
	a.shiftService = services.NewShiftService(database)
	a.licenseService = services.NewLicenseService(database)
}

// SetAPIURLForTest allows forcing the App into client mode for testing.
func (a *App) SetAPIURLForTest(url string) {
	a.apiURL = url
}

// IsFirstTimeSetup checks if the admin user exists
func (a *App) IsFirstTimeSetup() (bool, error) {
	if a.authService == nil {
		return false, fmt.Errorf("service not initialized")
	}
	return a.authService.IsFirstTimeSetup()
}

func (a *App) CompleteFirstTimeSetup(pharmacyName, fullName, username, password string) (*models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.authService.CompleteFirstTimeSetup(pharmacyName, fullName, username, password)
}

// DRM / Licensing API Bindings
func (a *App) GetLicenseStatus() LicenseStatusResponse {
	if a.licenseService == nil {
		return LicenseStatusResponse{IsLocked: true, MachineID: "", Reason: "Service not initialized"}
	}
	err := a.licenseService.VerifyLicense()
	isLocked := err != nil
	
	machineID, _ := a.licenseService.GetMachineID()
	var reason string
	if err != nil {
		reason = err.Error()
	}
	return LicenseStatusResponse{IsLocked: isLocked, MachineID: machineID, Reason: reason}
}

func (a *App) ActivateLicense(key string) error {
	if a.licenseService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.licenseService.ActivateLicense(key)
}

func (a *App) Login(username, password, workstation string) (*models.User, error) {
	if a.
		apiURL != "" {
		var reply *models.
			User
		err := api.
			CallRPC(a.apiURL,
				"Login",
				&reply,
				username,
				password,

				workstation)
		return reply, err
	}

	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.authService.Login(username, password, workstation)
}

func (a *App) Logout(userID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"Logout",
			nil, userID,
		)
	}

	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.authService.Logout(userID)
}

func (a *App) ValidateSession(userID int64) (*models.User, error) {
	if a.
		apiURL != "" {
		var reply *models.
			User
		err := api.
			CallRPC(a.apiURL,
				"ValidateSession",

				&reply,
				userID)

		return reply, err
	}

	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	user, err := a.authService.GetUser(userID)
	if err != nil {
		return nil, err
	}
	if !user.Active {
		return nil, fmt.Errorf("account is disabled")
	}
	if user.PasswordChangedAt == nil {
		return nil, fmt.Errorf("initial setup required")
	}
	return user, nil
}

func (a *App) CreateUser(username, password, role, fullName, phone, email, branch string, userID int64) (*models.User, error) {
	if a.
		apiURL != "" {
		var reply *models.
			User
		err := api.
			CallRPC(a.apiURL,
				"CreateUser",
				&reply, username,
				password,

				role, fullName,
				phone, email,
				branch, userID)
		return reply, err
	}

	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.authService.CreateUser(username, password, role, fullName, phone, email, branch, userID)
}

func (a *App) ListUsers(userID int64) ([]models.User, error) {
	if a.
		apiURL != "" {
		var reply []models.
			User
		err :=
			api.CallRPC(a.apiURL,
				"ListUsers",
				&reply, userID,
			)
		return reply, err
	}

	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.authService.ListUsers()
}

func (a *App) GetUser(targetID int64, userID int64) (*models.User, error) {
	if a.
		apiURL != "" {
		var reply *models.
			User
		err := api.
			CallRPC(a.apiURL,
				"GetUser",
				&reply,
				targetID,
				userID,
			)
		return reply, err
	}

	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.authService.GetUser(targetID)
}

func (a *App) UpdateUserInfo(id int64, role, fullName, phone, email, branch string, userID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"UpdateUserInfo",
			nil,
			id, role,
			fullName,
			phone, email,
			branch,

			userID)
	}

	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.authService.UpdateUserInfo(id, role, fullName, phone, email, branch)
}

func (a *App) ReactivateUser(id int64, userID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"ReactivateUser",
			nil,
			id, userID,
		)
	}

	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.authService.ReactivateUser(id)
}

func (a *App) DeactivateUser(id int64, userID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"DeactivateUser",
			nil,
			id, userID,
		)
	}

	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.authService.DeactivateUser(id)
}

func (a *App) LockUser(targetID int64, userID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"LockUser",
			nil, targetID,
			userID,
		)
	}

	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.authService.LockUser(targetID)
}

func (a *App) UnlockUser(adminID int64, targetUserID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"UnlockUser",
			nil, adminID,
			targetUserID,
		)
	}

	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(adminID); err != nil {
		return err
	}
	return a.authService.UnlockUser(targetUserID)
}

func (a *App) ForceLogout(targetID int64, userID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"ForceLogout",
			nil, targetID,
			userID,
		)
	}

	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.authService.ForceLogout(targetID, userID)
}

func (a *App) VerifyPassword(userID int64, password string) bool {
	if a.
		apiURL != "" {
		var reply bool
		_ = api.
			CallRPC(
				a.apiURL, "VerifyPassword",

				&reply,
				userID, password,
			)

		return reply
	}

	if a.authService == nil {
		return false
	}
	return a.authService.VerifyPassword(userID, password)
}

func (a *App) ChangePassword(userID int64, oldPassword, newPassword string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"ChangePassword",
			nil,
			userID, oldPassword,

			newPassword,
		)
	}

	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.authService.ChangePassword(userID, oldPassword, newPassword)
}

func (a *App) AdminResetPassword(adminID int64, targetUserID int64, newPassword string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"AdminResetPassword",

			nil, adminID,
			targetUserID,
			newPassword,
		)
	}

	if a.authService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(adminID); err != nil {
		return err
	}
	return a.authService.AdminResetPassword(adminID, targetUserID, newPassword)
}

func (a *App) GetLoginHistory(targetID int64, userID int64) ([]models.LoginHistory, error) {
	if a.
		apiURL != "" {
		var reply []models.
			LoginHistory

		err := api.CallRPC(a.apiURL,
			"GetLoginHistory",

			&reply,

			targetID, userID)
		return reply, err
	}

	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.authService.GetLoginHistory(targetID)
}

func (a *App) GetUserActivity(targetID int64, limit int, userID int64) ([]models.AuditLog, error) {
	if a.
		apiURL != "" {
		var reply []models.
			AuditLog
		err := api.CallRPC(a.
			apiURL, "GetUserActivity",

			&reply,
			targetID,

			limit, userID,
		)
		return reply,
			err
	}

	if a.authService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.authService.GetUserActivity(targetID, limit)
}

// Permission API Bindings
func (a *App) HasPermission(userID int64, permission string) (bool, error) {
	if a.
		apiURL != "" {
		var reply bool
		err :=
			api.CallRPC(a.apiURL, "HasPermission",

				&reply,
				userID, permission,
			)
		return reply, err
	}

	if a.permissionService == nil {
		return false, fmt.Errorf("service not initialized")
	}
	return a.permissionService.HasPermission(userID, permission)
}

func (a *App) GetRolePermissions(role string) ([]string, error) {
	if a.
		apiURL != "" {
		var reply []string
		err := api.CallRPC(a.apiURL,
			"GetRolePermissions",

			&reply,
			role)
		return reply, err
	}

	if a.permissionService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.permissionService.GetRolePermissions(role)
}

func (a *App) SetRolePermissions(role string, permissions []string, adminID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"SetRolePermissions",

			nil, role,
			permissions,
			adminID,
		)
	}

	if a.permissionService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(adminID); err != nil {
		return err
	}
	return a.permissionService.SetRolePermissions(role, permissions)
}

func (a *App) GetAllPermissionDefs() ([]models.PermissionInfo, error) {
	if a.
		apiURL != "" {
		var reply []models.
			PermissionInfo

		err := api.CallRPC(a.apiURL,
			"GetAllPermissionDefs",

			&reply)
		return reply,
			err
	}

	if a.permissionService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.permissionService.GetAllPermissionDefs(), nil
}

// Medicine API Bindings
func (a *App) AddMedicine(med models.Medicine, userID int64, username string) (*models.Medicine, error) {
	if a.
		apiURL != "" {
		var reply *models.
			Medicine
		err := api.CallRPC(a.
			apiURL, "AddMedicine",

			&reply,
			med, userID,

			username)
		return reply, err
	}

	if a.medicineService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.medicineService.AddMedicine(med, userID, username)
}

func (a *App) UpdateMedicine(med models.Medicine, userID int64, username string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"UpdateMedicine",
			nil,
			med, userID,
			username,
		)
	}

	if a.medicineService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.medicineService.UpdateMedicine(med, userID, username)
}

func (a *App) ArchiveMedicine(id int64, archive bool, userID int64, username string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"ArchiveMedicine",
			nil,
			id, archive,
			userID,
			username,
		)
	}

	if a.medicineService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.medicineService.ArchiveMedicine(id, archive, userID, username)
}

func (a *App) ListMedicines(search, category string, includeArchived bool) ([]models.Medicine, error) {
	if a.
		apiURL != "" {
		var reply []models.
			Medicine
		err := api.CallRPC(a.
			apiURL, "ListMedicines",

			&reply,
			search,

			category, includeArchived,
		)
		return reply, err
	}

	if a.medicineService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.medicineService.ListMedicines(search, category, includeArchived)
}

func (a *App) ListMedicinesPaginated(search, category string, includeArchived bool, page, pageSize int) (*models.PaginatedMedicines, error) {
	if a.
		apiURL != "" {
		var reply *models.
			PaginatedMedicines

		err := api.
			CallRPC(a.apiURL,
				"ListMedicinesPaginated",

				&reply, search,
				category, includeArchived,
				page, pageSize,
			)
		return reply, err
	}

	if a.medicineService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.medicineService.ListMedicinesPaginated(search, category, includeArchived, page, pageSize)
}

func (a *App) BulkImportMedicines(medicines []models.Medicine, userID int64, username string) (int, error) {
	if a.
		apiURL != "" {
		var reply int
		err :=
			api.CallRPC(a.apiURL, "BulkImportMedicines",

				&reply, medicines,
				userID,

				username)
		return reply, err
	}

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
	if a.
		apiURL != "" {
		var reply *models.
			Batch
		err :=
			api.CallRPC(a.apiURL,
				"AddBatch",
				&reply,
				batch,
				userID,

				username)
		return reply, err
	}

	if a.batchService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.batchService.AddBatch(batch, userID, username)
}

func (a *App) GetBatchesByMedicine(medicineID int64) ([]models.Batch, error) {
	if a.
		apiURL != "" {
		var reply []models.
			Batch
		err :=
			api.CallRPC(a.apiURL,
				"GetBatchesByMedicine",

				&reply,
				medicineID,
			)
		return reply, err
	}

	if a.batchService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.batchService.GetBatchesByMedicine(medicineID)
}

func (a *App) GetExpiringBatches(withinDays int) ([]models.Batch, error) {
	if a.
		apiURL != "" {
		var reply []models.
			Batch
		err :=
			api.CallRPC(a.apiURL,
				"GetExpiringBatches",

				&reply,
				withinDays,
			)
		return reply,
			err
	}

	if a.batchService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.batchService.GetExpiringBatches(withinDays)
}

func (a *App) AdjustStock(medicineID int64, batchID *int64, userID int64, username string, qtyAdjusted int, reason, notes string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"AdjustStock",
			nil, medicineID,

			batchID,
			userID, username,

			qtyAdjusted,
			reason,
			notes)
	}

	if a.batchService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.batchService.AdjustStock(medicineID, batchID, userID, username, qtyAdjusted, reason, notes)
}

// Supplier API Bindings
func (a *App) AddSupplier(sup models.Supplier, userID int64, username string) (*models.Supplier, error) {
	if a.
		apiURL != "" {
		var reply *models.
			Supplier
		err := api.CallRPC(a.
			apiURL, "AddSupplier",

			&reply,
			sup, userID,

			username)
		return reply, err
	}

	if a.supplierService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.supplierService.AddSupplier(sup, userID, username)
}

func (a *App) UpdateSupplier(sup models.Supplier, userID int64, username string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"UpdateSupplier",
			nil,
			sup, userID,
			username,
		)
	}

	if a.supplierService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.supplierService.UpdateSupplier(sup, userID, username)
}

func (a *App) ListSuppliers(includeArchived bool) ([]models.Supplier, error) {
	if a.
		apiURL != "" {
		var reply []models.
			Supplier
		err := api.CallRPC(a.
			apiURL, "ListSuppliers",

			&reply,
			includeArchived,
		)
		return reply, err
	}

	if a.supplierService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.supplierService.ListSuppliers(includeArchived)
}

func (a *App) ArchiveSupplier(id int64, archive bool, userID int64, username string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"ArchiveSupplier",
			nil,
			id, archive,
			userID,
			username,
		)
	}

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
	if a.
		apiURL != "" {
		var reply *models.
			Purchase
		err := api.CallRPC(a.
			apiURL, "RecordPurchase",

			&reply,
			invoiceNumber,

			supplierID,
			items, notes, userID,
			username)
		return reply, err
	}

	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.purchaseService.RecordPurchase(invoiceNumber, supplierID, items, notes, userID, username)
}

func (a *App) ListPurchases() ([]models.Purchase, error) {
	if a.
		apiURL != "" {
		var reply []models.
			Purchase
		err := api.CallRPC(a.
			apiURL, "ListPurchases",

			&reply,
		)
		return reply, err
	}

	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.purchaseService.ListPurchases()
}

func (a *App) ListPurchaseItems(purchaseID int64) ([]models.PurchaseItem, error) {
	if a.
		apiURL != "" {
		var reply []models.
			PurchaseItem

		err := api.CallRPC(a.apiURL,
			"ListPurchaseItems",

			&reply,

			purchaseID)
		return reply, err
	}

	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.purchaseService.ListPurchaseItems(purchaseID)
}

func (a *App) ListPurchasesPaginated(page, pageSize int) (*models.PaginatedPurchases, error) {
	if a.
		apiURL != "" {
		var reply *models.
			PaginatedPurchases

		err := api.
			CallRPC(a.apiURL,
				"ListPurchasesPaginated",

				&reply, page,
				pageSize)
		return reply, err
	}

	if a.purchaseService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.purchaseService.ListPurchasesPaginated(page, pageSize)
}

// Sales / POS API Bindings
func (a *App) ProcessSale(userID int64, username string, items []services.CartItemInput, paymentMethod string, discountAmount float64, discountType string, shiftID *int64) (*models.Sale, error) {
	if a.
		apiURL != "" {
		var reply *models.
			Sale
		err := api.
			CallRPC(a.apiURL,
				"ProcessSale",

				&reply, userID,
				username,

				items, paymentMethod,
				discountAmount,
				discountType, shiftID,
			)
		return reply,
			err
	}

	if a.dbConnectionFailed || a.database == nil {
		return nil, fmt.Errorf("Cannot complete sale: Connection to the main computer is currently offline. Please check your network cables or make sure the main computer is powered on.")
	}
	if a.salesService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.salesService.ProcessSale(userID, username, items, paymentMethod, discountAmount, discountType, shiftID)
}

func (a *App) ListRecentSales(limit int) ([]models.Sale, error) {
	if a.
		apiURL != "" {
		var reply []models.
			Sale
		err :=
			api.CallRPC(a.apiURL,
				"ListRecentSales",

				&reply,
				limit)

		return reply, err
	}

	if a.salesService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.salesService.ListRecentSales(limit)
}

// Till Shift Reconciliation Bindings
func (a *App) GetActiveShift(userID int64) (*models.Shift, error) {
	if a.
		apiURL != "" {
		var reply *models.
			Shift
		err :=
			api.CallRPC(a.apiURL,
				"GetActiveShift",

				&reply,
				userID)

		return reply, err
	}

	if a.shiftService == nil {
		return nil, fmt.Errorf("shift service not initialized")
	}
	return a.shiftService.GetActiveShift(userID)
}

func (a *App) OpenShift(userID int64, username string, openingCash float64) (*models.Shift, error) {
	if a.
		apiURL != "" {
		var reply *models.
			Shift
		err :=
			api.CallRPC(a.apiURL,
				"OpenShift",
				&reply, userID,
				username,

				openingCash)
		return reply, err
	}

	if a.shiftService == nil {
		return nil, fmt.Errorf("shift service not initialized")
	}
	return a.shiftService.OpenShift(userID, username, openingCash)
}

func (a *App) CloseShift(shiftID int64, actualCash float64, notes string) (*models.ShiftZReport, error) {
	if a.
		apiURL != "" {
		var reply *models.
			ShiftZReport

		err := api.CallRPC(a.apiURL,
			"CloseShift",
			&reply,
			shiftID,

			actualCash, notes,
		)
		return reply,
			err
	}

	if a.shiftService == nil {
		return nil, fmt.Errorf("shift service not initialized")
	}
	return a.shiftService.CloseShift(shiftID, actualCash, notes)
}

func (a *App) GetShiftZReport(shiftID int64) (*models.ShiftZReport, error) {
	if a.
		apiURL != "" {
		var reply *models.
			ShiftZReport

		err := api.CallRPC(a.apiURL,
			"GetShiftZReport",

			&reply,

			shiftID)
		return reply,
			err
	}

	if a.shiftService == nil {
		return nil, fmt.Errorf("shift service not initialized")
	}
	return a.shiftService.GetShiftZReport(shiftID)
}

// Report & Dashboard API Bindings
func (a *App) GetDashboardSummary(period string) (*services.DashboardSummary, error) {
	if a.
		apiURL != "" {
		var reply *services.
			DashboardSummary

		err := api.
			CallRPC(a.apiURL,
				"GetDashboardSummary",

				&reply, period)
		return reply, err
	}

	if a.reportService == nil {
		return nil, fmt.Errorf("report service not initialized")
	}
	return a.reportService.GetDashboardSummary(period)
}

func (a *App) GetSalesSummary(period string) (*services.SalesSummary, error) {
	if a.
		apiURL != "" {
		var reply *services.
			SalesSummary

		err := api.CallRPC(a.apiURL,
			"GetSalesSummary",

			&reply,
			period,
		)
		return reply, err
	}

	if a.reportService == nil {
		return nil, fmt.Errorf("report service not initialized")
	}
	return a.reportService.GetSalesSummary(period)
}

// Backup & Audit Log API Bindings
func (a *App) ExportDatabase(destPath string, userID int64, username string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"ExportDatabase",
			nil,
			destPath,
			userID,
			username)
	}

	if a.backupService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.backupService.ExportDatabase(destPath, userID, username)
}

func (a *App) RestoreDatabase(sourceBackupPath string, userID int64, username string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"RestoreDatabase",
			nil,
			sourceBackupPath,

			userID, username,
		)

	}

	if a.backupService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.backupService.RestoreDatabase(sourceBackupPath, userID, username)
}

func (a *App) ListAuditLogs(limit int, userID int64) ([]models.AuditLog, error) {
	if a.
		apiURL != "" {
		var reply []models.
			AuditLog
		err := api.CallRPC(a.
			apiURL, "ListAuditLogs",

			&reply,
			limit,

			userID)
		return reply, err
	}

	if a.backupService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.backupService.ListAuditLogs(limit)
}

// ResetAndSeedDatabase drops all table contents and seeds realistic testing records.
func (a *App) ClearSampleData(userID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"ClearSampleData",
			nil,
			userID)
	}

	if a.database == nil {
		return fmt.Errorf("database not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.database.ClearSampleData()
}

func (a *App) ResetAndSeedDatabase(userID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"ResetAndSeedDatabase",

			nil, userID,
		)
	}

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
	if a.
		apiURL != "" {
		var reply float64
		err := api.CallRPC(a.apiURL, "GetUserTodaySalesTotal",

			&reply,
			userID,
		)
		return reply, err
	}

	if a.salesService == nil {
		return 0.0, fmt.Errorf("service not initialized")
	}
	return a.salesService.GetUserTodaySalesTotal(userID)
}

func (a *App) GetCashierPerformance(userID int64) (*services.CashierPerformance, error) {
	if a.
		apiURL != "" {
		var reply *services.
			CashierPerformance

		err := api.
			CallRPC(a.
				apiURL,
				"GetCashierPerformance",

				&reply, userID,
			)
		return reply,
			err
	}

	if a.salesService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.salesService.GetCashierPerformance(userID)
}

// Notification API Binding
func (a *App) GetNotificationsSummary() (*models.NotificationSummary, error) {
	if a.
		apiURL != "" {
		var reply *models.
			NotificationSummary

		err := api.
			CallRPC(a.
				apiURL,
				"GetNotificationsSummary",

				&reply)
		return reply, err
	}

	if a.notificationService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.notificationService.GetNotificationsSummary()
}

// Global Search API Binding
func (a *App) GlobalSearch(query string, userRole string) ([]models.SearchResultItem, error) {
	if a.
		apiURL != "" {
		var reply []models.
			SearchResultItem

		err := api.CallRPC(a.apiURL,
			"GlobalSearch",

			&reply,

			query, userRole)
		return reply, err
	}

	if a.searchService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.searchService.GlobalSearch(query, userRole)
}

// Prescription API Bindings
func (a *App) CreatePrescription(userID int64, username string, patientName string, patientAge int, patientPhone string, doctorName string, doctorContact string, notes string, items []services.PrescriptionItemInput) (*models.Prescription, error) {
	if a.
		apiURL != "" {
		var reply *models.
			Prescription

		err := api.CallRPC(a.apiURL,
			"CreatePrescription",

			&reply,

			userID, username,
			patientName, patientAge,
			patientPhone,
			doctorName, doctorContact,
			notes, items)
		return reply, err
	}

	if a.prescriptionService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.prescriptionService.CreatePrescription(userID, username, patientName, patientAge, patientPhone, doctorName, doctorContact, notes, items)
}

func (a *App) ListPrescriptions(status string, search string, limit int) ([]models.Prescription, error) {
	if a.
		apiURL != "" {
		var reply []models.
			Prescription

		err := api.CallRPC(a.apiURL,
			"ListPrescriptions",

			&reply,

			status, search,
			limit)
		return reply,
			err
	}

	if a.prescriptionService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.prescriptionService.ListPrescriptions(status, search, limit)
}

func (a *App) GetPrescriptionDetails(prescriptionID int64) (*models.Prescription, error) {
	if a.
		apiURL != "" {
		var reply *models.
			Prescription

		err := api.CallRPC(a.apiURL,
			"GetPrescriptionDetails",

			&reply, prescriptionID,
		)
		return reply,
			err
	}

	if a.prescriptionService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	return a.prescriptionService.GetPrescriptionDetails(prescriptionID)
}

func (a *App) UpdatePrescriptionStatus(userID int64, username string, prescriptionID int64, status string) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"UpdatePrescriptionStatus",

			nil,
			userID,
			username,
			prescriptionID,

			status)
	}

	if a.prescriptionService == nil {
		return fmt.Errorf("service not initialized")
	}
	return a.prescriptionService.UpdatePrescriptionStatus(userID, username, prescriptionID, status)
}

// GetCurrencySymbol returns the configured currency symbol for display formatting.
func (a *App) GetCurrencySymbol() (string, error) {
	if a.
		apiURL != "" {
		var reply string
		err := api.CallRPC(a.apiURL, "GetCurrencySymbol",

			&reply)
		return reply,

			err
	}

	if a.configService == nil {
		return "", fmt.Errorf("service not initialized")
	}
	cfg, err := a.configService.GetConfig()
	if err != nil {
		return "UGX", nil
	}
	return cfg.Currency, nil
}

// Pharmacy Config API Bindings
func (a *App) GetPharmacyConfig(userID int64) (*models.PharmacyConfig, error) {
	if a.
		apiURL != "" {
		var reply *models.
			PharmacyConfig

		err := api.CallRPC(a.apiURL,
			"GetPharmacyConfig",

			&reply,

			userID)
		return reply, err
	}

	if a.configService == nil {
		return nil, fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return nil, err
	}
	return a.configService.GetConfig()
}

func (a *App) UpdatePharmacyConfig(cfg *models.PharmacyConfig, userID int64) error {
	if a.
		apiURL != "" {
		return api.CallRPC(a.apiURL,
			"UpdatePharmacyConfig",

			nil, cfg,
			userID,
		)
	}

	if a.configService == nil {
		return fmt.Errorf("service not initialized")
	}
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	return a.configService.UpdateConfig(cfg)
}

// GetWorkstationName returns the machine hostname for session tracking.
func (a *App) GetWorkstationName() string {
	if a.
		apiURL != "" {
		var reply string
		_ =
			api.CallRPC(a.apiURL, "GetWorkstationName",

				&reply,
			)
		return reply

	}

	hostname, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return hostname
}

func (a *App) isHostMode() bool {
	configPath := filepath.Join(execDir, "config.json")
	if _, err := os.Stat(configPath); err == nil {
		if strings.HasPrefix(a.dbPath, "\\\\") || strings.HasPrefix(a.dbPath, "//") {
			return false
		}
	}
	if strings.HasPrefix(a.dbPath, "\\\\") || strings.HasPrefix(a.dbPath, "//") {
		return false
	}
	return true
}

// Network Config API Bindings
func (a *App) GetNetworkStatus() NetworkStatus {
	if a.
		apiURL != "" {
		var reply NetworkStatus

		_ = api.
			CallRPC(a.apiURL,
				"GetNetworkStatus",

				&reply)
		return reply
	}

	isHost := a.isHostMode()
	return NetworkStatus{
		IsHost:	isHost,
		DBPath:	a.dbPath,
	}
}

type ConnectionStatus struct {
	ConfiguredPath	string	`json:"configured_path"`
	ActivePath	string	`json:"active_path"`
	IsConnected	bool	`json:"is_connected"`
	IsHost		bool	`json:"is_host"`
	FriendlyMessage	string	`json:"friendly_message"`
}

func (a *App) GetDBConnectionStatus() ConnectionStatus {
	if a.
		apiURL != "" {
		var reply ConnectionStatus

		_ =
			api.CallRPC(a.apiURL,
				"GetDBConnectionStatus",

				&reply)

		return reply
	}

	isHost := a.isHostMode()
	isConnected := !a.dbConnectionFailed && a.database != nil

	var friendlyMsg string
	if isHost {
		friendlyMsg = "Running as Main Server"
	} else if isConnected {
		friendlyMsg = "Connected to Main Computer"
	} else {
		friendlyMsg = "Main Computer Offline (Sales Disabled)"
	}

	return ConnectionStatus{
		ConfiguredPath:		a.dbPath,
		ActivePath:		a.dbPath,
		IsConnected:		isConnected,
		IsHost:			isHost,
		FriendlyMessage:	friendlyMsg,
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

	configPath := filepath.Join(execDir, "config.json")
	if err := os.WriteFile(configPath, data, platformFileMode()); err != nil {
		return fmt.Errorf("failed to save configuration at %s: %w", configPath, err)
	}
	return nil
}

// GetLocalIP returns the primary local IP address of this machine.
func (a *App) GetLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err == nil {
		for _, address := range addrs {
			if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "127.0.0.1"
}

// EnableMainServerMode clears DBPath so that this instance acts as Host.
func (a *App) EnableMainServerMode(userID int64) error {
	if err := a.requireAdmin(userID); err != nil {
		return err
	}
	if runtime.GOOS != "windows" {
		return fmt.Errorf("auto-sharing is only supported on Windows")
	}

	dbDir, err := filepath.Abs(filepath.Dir(a.dbPath))
	if err != nil || strings.Contains(dbDir, "\"") || strings.Contains(dbDir, "`") {
		return fmt.Errorf("invalid or unsanitized database directory path")
	}
	shareName := "LangratiaData$"

	logger.Info("Enabling main server mode: sharing %s as %s", dbDir, shareName)

	// Quote dbDir safely for cmd /c net share execution
	cmdStr := fmt.Sprintf("net share %s=\"%s\" /grant:Everyone,FULL", shareName, dbDir)

	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", "Start-Process", "cmd", "-ArgumentList", fmt.Sprintf("'/c %s'", strings.ReplaceAll(cmdStr, "'", "''")), "-Verb", "RunAs", "-WindowStyle", "Hidden")
	output, err := cmd.CombinedOutput()
	if err != nil {
		logger.Error("Failed to enable main server mode: %v | Output: %s", err, string(output))
		return fmt.Errorf("failed to enable sharing. If a UAC prompt appeared, please accept it. Error: %v", err)
	}
	logger.Info("Main server mode enabled successfully: %s shared as %s", dbDir, shareName)
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
