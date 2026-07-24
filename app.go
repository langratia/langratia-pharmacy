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
	ctx         context.Context
	database    *db.DB
	authService *services.AuthService
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
	a.authService = services.NewAuthService(database)
}

// Login authenticates a user
func (a *App) Login(username, password string) (*models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("auth service not initialized")
	}
	return a.authService.Login(username, password)
}

// CreateUser registers a new user (Admin access required)
func (a *App) CreateUser(username, password, role, fullName string) (*models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("auth service not initialized")
	}
	return a.authService.CreateUser(username, password, role, fullName)
}

// ListUsers retrieves all registered users
func (a *App) ListUsers() ([]models.User, error) {
	if a.authService == nil {
		return nil, fmt.Errorf("auth service not initialized")
	}
	return a.authService.ListUsers()
}
