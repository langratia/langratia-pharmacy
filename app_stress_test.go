package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"app/backend/api"
	"app/backend/db"
	"app/backend/models"
	"app/backend/services"
)

func TestAPIStressSuite(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping stress test in short mode")
	}

	tempDir, err := os.MkdirTemp("", "langratia_api_stress_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_api_stress.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	// 1. Initialize the Host Server App
	hostApp := NewApp()
	hostApp.SetDatabaseForTest(database) // Inject db

	// Run the setup
	adminUser, err := hostApp.CompleteFirstTimeSetup("Test Pharma API", "Admin API", "admin_api", "admin123")
	if err != nil {
		t.Fatalf("CompleteFirstTimeSetup failed: %v", err)
	}

	// 2. Start the API Server
	server := &http.Server{Addr: ":45556"}
	
	// Create a new ServeMux for this test so it doesn't conflict with other tests using DefaultServeMux
	mux := http.NewServeMux()
	mux.HandleFunc("/rpc", func(w http.ResponseWriter, r *http.Request) {
		api.HandleRPC(hostApp, w, r)
	})
	server.Handler = mux
	
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("HTTP server ListenAndServe: %v\n", err)
		}
	}()

	// Wait for server to be ready
	time.Sleep(200 * time.Millisecond)
	defer server.Shutdown(context.Background())

	// 3. Initialize the Client App
	clientApp := NewApp()
	// Fake client mode by explicitly setting apiURL
	clientApp.SetAPIURLForTest("http://127.0.0.1:45556")

	fmt.Println("\n================================================================================")
	fmt.Println("             LANGRATIA PHARMACY POS - API PROXY STRESS SUITE                    ")
	fmt.Println("================================================================================")

	// STAGE 1: High-Volume Catalog Ingestion via API
	fmt.Println("\n>>> STAGE 1: Ingesting 500 Catalog items via JSON-RPC API...")
	startCatalog := time.Now()
	totalItems := 500
	var createdMedIDs []int64

	for i := 1; i <= totalItems; i++ {
		med := models.Medicine{
			Name:           fmt.Sprintf("API Med %d", i),
			GenericName:    fmt.Sprintf("API Gen %d", i%100),
			Category:       "General Pharma",
			BuyingPrice:    10.0,
			SellingPrice:   20.0,
			CurrentStock:   500,
			ProductStatus:  "active",
		}
		res, err := clientApp.AddMedicine(med, adminUser.ID, "admin_api")
		if err != nil {
			t.Fatalf("Failed to add medicine at index %d via API: %v", i, err)
		}
		createdMedIDs = append(createdMedIDs, res.ID)
	}

	catalogDuration := time.Since(startCatalog)
	fmt.Printf("✓ Ingested %d medicines over API in %v (%.2f items/sec)\n", totalItems, catalogDuration, float64(totalItems)/catalogDuration.Seconds())

	// STAGE 2: Concurrent API Sales
	fmt.Println("\n>>> STAGE 2: Running 10 Concurrent Cashier API Workers (500 Sales)...")

	concurrentWorkers := 10
	salesPerWorker := 50
	totalTargetSales := concurrentWorkers * salesPerWorker

	var successSales int64
	var failedSales int64

	var wg sync.WaitGroup
	startSales := time.Now()

	for worker := 0; worker < concurrentWorkers; worker++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for s := 0; s < salesPerWorker; s++ {
				med1 := createdMedIDs[(workerID*salesPerWorker+s)%len(createdMedIDs)]
				
				cart := []services.CartItemInput{
					{MedicineID: med1, Quantity: 1, UnitPrice: 20.0},
				}

				_, err := clientApp.ProcessSale(adminUser.ID, "admin_api", cart, "Cash", 0, "fixed", nil)
				
				if err != nil {
					atomic.AddInt64(&failedSales, 1)
				} else {
					atomic.AddInt64(&successSales, 1)
				}
			}
		}(worker)
	}

	wg.Wait()
	salesDuration := time.Since(startSales)
	tps := float64(successSales) / salesDuration.Seconds()

	fmt.Printf("✓ Executed %d API sales (%d successful, %d failed) in %v\n", totalTargetSales, successSales, failedSales, salesDuration)
	fmt.Printf("  • API Throughput:   %.2f TPS\n", tps)

	if failedSales > 0 {
		t.Errorf("API Stress test encountered failures: %d failed sales", failedSales)
	}
}
