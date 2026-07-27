package services

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"app/backend/db"
	"app/backend/models"
)

func TestStressSuite(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping stress test in short mode")
	}

	tempDir, err := os.MkdirTemp("", "langratia_stress_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "pharmacy_stress.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer database.Close()

	authService := NewAuthService(database)
	medService := NewMedicineService(database)
	batchService := NewBatchService(database)
	salesService := NewSalesService(database, batchService)
	reportService := NewReportService(database)
	searchService := NewSearchService(database)

	// Admin Setup
	adminUser, err := authService.CompleteFirstTimeSetup("Langratia Enterprise Pharmacy", "Admin Lead", "admin", "admin123")
	if err != nil {
		t.Fatalf("CompleteFirstTimeSetup failed: %v", err)
	}

	fmt.Println("\n================================================================================")
	fmt.Println("             LANGRATIA PHARMACY POS - SYSTEM STRESS & BENCHMARK SUITE           ")
	fmt.Println("================================================================================")

	// -------------------------------------------------------------------------
	// STAGE 1: High-Volume Catalog Ingestion (5,000 Catalog Items)
	// -------------------------------------------------------------------------
	fmt.Println("\n>>> STAGE 1: Ingesting 5,000 Catalog Medicine Records with Batches...")
	startCatalog := time.Now()
	totalItems := 5000
	var createdMedIDs []int64

	for i := 1; i <= totalItems; i++ {
		med := models.Medicine{
			Name:           fmt.Sprintf("Medicine Category Item %d", i),
			GenericName:    fmt.Sprintf("Generic Compound %d", i%100),
			BrandName:      fmt.Sprintf("Brand %d", i%50),
			Category:       "General Pharma",
			BuyingPrice:    100.0 + float64(i%50)*10.0,
			SellingPrice:   200.0 + float64(i%50)*15.0,
			CurrentStock:   500,
			ReorderLevel:   50,
			Manufacturer:   "Langratia Pharma Labs",
			ProductStatus:  "active",
		}
		res, err := medService.AddMedicine(med, adminUser.ID, "admin")
		if err != nil {
			t.Fatalf("Failed to add medicine at index %d: %v", i, err)
		}
		createdMedIDs = append(createdMedIDs, res.ID)
	}

	catalogDuration := time.Since(startCatalog)
	itemsPerSec := float64(totalItems) / catalogDuration.Seconds()
	fmt.Printf("✓ Ingested %d medicines in %v (%.2f items/sec)\n", totalItems, catalogDuration, itemsPerSec)

	// -------------------------------------------------------------------------
	// STAGE 2: High-Concurrency POS Sales Checkout (1,000 Sales across 20 Goroutines)
	// -------------------------------------------------------------------------
	fmt.Println("\n>>> STAGE 2: Running 20 Concurrent Cashier Workers (1,000 Sales Transactions)...")

	concurrentWorkers := 20
	salesPerWorker := 50
	totalTargetSales := concurrentWorkers * salesPerWorker

	var successSales int64
	var failedSales int64
	var totalLatencyMicro int64

	var latencies []time.Duration
	var latMu sync.Mutex

	var wg sync.WaitGroup
	startSales := time.Now()

	for worker := 0; worker < concurrentWorkers; worker++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for s := 0; s < salesPerWorker; s++ {
				// Pick 2 medicines from catalog
				med1 := createdMedIDs[(workerID*salesPerWorker+s)%len(createdMedIDs)]
				med2 := createdMedIDs[(workerID*salesPerWorker+s+1)%len(createdMedIDs)]

				cart := []CartItemInput{
					{MedicineID: med1, Quantity: 2, UnitPrice: 250.0},
					{MedicineID: med2, Quantity: 1, UnitPrice: 350.0},
				}

				t0 := time.Now()
				_, err := salesService.ProcessSale(adminUser.ID, "cashier_stress", cart, "Cash", 0, "fixed", nil)
				elapsed := time.Since(t0)

				if err != nil {
					atomic.AddInt64(&failedSales, 1)
					if atomic.LoadInt64(&failedSales) <= 5 {
						fmt.Printf("   [Sale Error Sample]: %v\n", err)
					}
				} else {
					atomic.AddInt64(&successSales, 1)
					atomic.AddInt64(&totalLatencyMicro, elapsed.Microseconds())

					latMu.Lock()
					latencies = append(latencies, elapsed)
					latMu.Unlock()
				}
			}
		}(worker)
	}

	wg.Wait()
	salesDuration := time.Since(startSales)

	tps := float64(successSales) / salesDuration.Seconds()
	avgLatencyMs := float64(totalLatencyMicro) / float64(successSales) / 1000.0

	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	var p95LatencyMs float64
	if len(latencies) > 0 {
		p95Idx := int(float64(len(latencies)) * 0.95)
		if p95Idx >= len(latencies) {
			p95Idx = len(latencies) - 1
		}
		p95LatencyMs = float64(latencies[p95Idx].Microseconds()) / 1000.0
	}

	fmt.Printf("✓ Executed %d sales (%d successful, %d failed) in %v\n", totalTargetSales, successSales, failedSales, salesDuration)
	fmt.Printf("  • Throughput:   %.2f Transactions Per Second (TPS)\n", tps)
	fmt.Printf("  • Avg Latency:  %.2f ms\n", avgLatencyMs)
	fmt.Printf("  • P95 Latency:  %.2f ms\n", p95LatencyMs)

	// -------------------------------------------------------------------------
	// STAGE 3: Read-While-Write WAL Concurrency Stress
	// -------------------------------------------------------------------------
	fmt.Println("\n>>> STAGE 3: Testing Read-While-Write (Reports during active Sales Writes)...")

	var reportSuccess int64
	var reportFailures int64
	var writeSuccess int64
	var writeFailures int64

	stopCh := make(chan struct{})
	var rwWg sync.WaitGroup

	// Reader goroutines (Reports)
	for r := 0; r < 5; r++ {
		rwWg.Add(1)
		go func() {
			defer rwWg.Done()
			for {
				select {
				case <-stopCh:
					return
				default:
					_, err1 := reportService.GetSalesSummary()
					_, err2 := reportService.GetDashboardSummary()
					if err1 != nil || err2 != nil {
						atomic.AddInt64(&reportFailures, 1)
					} else {
						atomic.AddInt64(&reportSuccess, 1)
					}
					time.Sleep(5 * time.Millisecond)
				}
			}
		}()
	}

	// Writer goroutines (Sales)
	startRW := time.Now()
	for w := 0; w < 5; w++ {
		rwWg.Add(1)
		go func(wID int) {
			defer rwWg.Done()
			for i := 0; i < 30; i++ {
				medID := createdMedIDs[(wID*30+i)%len(createdMedIDs)]
				cart := []CartItemInput{{MedicineID: medID, Quantity: 1, UnitPrice: 200.0}}
				_, err := salesService.ProcessSale(adminUser.ID, "cashier_rw", cart, "Card", 0, "fixed", nil)
				if err != nil {
					atomic.AddInt64(&writeFailures, 1)
					if atomic.LoadInt64(&writeFailures) <= 3 {
						fmt.Printf("   [RW Write Error Sample]: %v\n", err)
					}
				} else {
					atomic.AddInt64(&writeSuccess, 1)
				}
			}
		}(w)
	}

	// Wait for writers to finish
	time.Sleep(1 * time.Second)
	close(stopCh)
	rwWg.Wait()
	rwDuration := time.Since(startRW)

	fmt.Printf("✓ Read-While-Write Test Completed in %v\n", rwDuration)
	fmt.Printf("  • Reports Read Queries:  %d successful, %d failed\n", reportSuccess, reportFailures)
	fmt.Printf("  • Sales Write Queries:   %d successful, %d failed\n", writeSuccess, writeFailures)

	// -------------------------------------------------------------------------
	// STAGE 4: Catalog Search Index Benchmark
	// -------------------------------------------------------------------------
	fmt.Println("\n>>> STAGE 4: Full-Text Catalog Search Benchmark (500 Concurrent Searches)...")

	startSearch := time.Now()
	var searchSuccess int64
	var searchWg sync.WaitGroup

	for s := 0; s < 10; s++ {
		searchWg.Add(1)
		go func(sID int) {
			defer searchWg.Done()
			for k := 0; k < 50; k++ {
				queryStr := fmt.Sprintf("Item %d", (sID*50+k)%500)
				res, err := searchService.GlobalSearch(queryStr, "admin")
				if err == nil && len(res) >= 0 {
					atomic.AddInt64(&searchSuccess, 1)
				}
			}
		}(s)
	}

	searchWg.Wait()
	searchDuration := time.Since(startSearch)
	qps := float64(searchSuccess) / searchDuration.Seconds()

	fmt.Printf("✓ Executed %d search queries across 5,000 catalog items in %v (%.2f QPS)\n", searchSuccess, searchDuration, qps)

	// -------------------------------------------------------------------------
	// FINAL SUMMARY REPORT
	// -------------------------------------------------------------------------
	fmt.Println("\n================================================================================")
	fmt.Println("                        STRESS TEST SUMMARY RESULTS                             ")
	fmt.Println("================================================================================")
	fmt.Printf(" Database Engine:          SQLite (WAL Mode enabled, 64MB Cache)\n")
	fmt.Printf(" Catalog Storage Scale:    %d active medicines & inventory batches\n", totalItems)
	fmt.Printf(" Peak POS Sales TPS:       %.2f Transactions/sec\n", tps)
	fmt.Printf(" Average Sale Latency:     %.2f ms\n", avgLatencyMs)
	fmt.Printf(" P95 Sale Latency:         %.2f ms\n", p95LatencyMs)
	fmt.Printf(" Search Throughput:        %.2f Queries/sec\n", qps)
	fmt.Printf(" Sales Transaction Errors: %d\n", failedSales+writeFailures)
	fmt.Printf(" Report Read Errors:       %d\n", reportFailures)
	fmt.Println("================================================================================")

	if failedSales > 0 || writeFailures > 0 || reportFailures > 0 {
		t.Errorf("Stress test encountered failures: failedSales=%d, writeFailures=%d, reportFailures=%d", failedSales, writeFailures, reportFailures)
	}
}
