# Data Flow and Subsystem Analysis

This document traces the flow of data through the primary backend subsystems of the Langratia Pharmacy POS. It documents responsibilities, inter-dependencies, and potential risks for future modifications.

## 1. Sales & POS Subsystem (`sales_service.go`)

*   **Purpose & Responsibilities:** Handles the core Point-Of-Sale logic. Processes cart checkouts, applies discounts, links to till shifts, and generates invoices.
*   **Dependencies:** Tightly coupled with the `BatchService` for inventory deduction.
*   **Data Flow:**
    1.  Receives an array of `CartItemInput` alongside payment, discount, and shift details.
    2.  Initiates an overarching SQL transaction (`tx.Begin`).
    3.  Calculates gross and net totals.
    4.  Inserts the parent `sales` record.
    5.  Loops through the cart items:
        *   If a `prescription_id` is present, it updates the prescription status to 'Dispensed'.
        *   Calls `BatchService.DeductStockFEFO(tx, ...)` to determine which inventory batches to deduct from based on the requested base quantity (quantity * conversion factor).
        *   Iterates through the deductions returned by the batch service, inserting a `sale_items` record for *each* batch touched. This ensures perfect financial traceability (cost of goods sold) per batch.
    6.  Commits the transaction.
*   **Potential Problems:** Any error during the FEFO deduction (e.g., insufficient stock) will instantly roll back the entire sale. The calculation of subtotals per batch proportion can result in floating-point rounding errors if not carefully managed.
*   **Modification Risks:** Altering the unit conversion logic (e.g., selling strips vs. boxes) requires careful handling of the `conversion_factor` multiplier to ensure the correct number of base units is passed to the batch service.

## 2. Inventory & Batch Subsystem (`batch_service.go`, `medicine_service.go`)

*   **Purpose & Responsibilities:** Manages stock levels, batch lifecycles, expiries, and stock adjustments (damages/losses).
*   **Dependencies:** Standalone, but actively called by `SalesService` and `PurchaseService`.
*   **Data Flow (FEFO Deduction):**
    1.  Accepts a transaction object (`*sql.Tx`) from the caller to participate in an atomic operation.
    2.  Queries all non-expired batches for the medicine, ordered by `expiry_date ASC` (First-Expiry-First-Out).
    3.  Iterates through the batches, deducting stock from the oldest batches first until the requested quantity is fulfilled.
    4.  Triggers a recalculation of the master `medicines.current_stock` column via `updateMedicineStockTx`.
*   **Potential Problems:** The recalculation of `current_stock` relies on summing `batches.quantity_remaining`. While theoretically sound, it means the `medicines` table is denormalized for read performance.
*   **Modification Risks:** If a new feature (like inventory auditing or syncing) updates a batch directly without using `AdjustStock` or calling the recalculation helper, the UI will show incorrect total stock levels.

## 3. Shift Management (`shift_service.go`)

*   **Purpose & Responsibilities:** Manages cashier till sessions. Tracks opening cash, expected cash (based on sales), and actual closing cash to calculate variance.
*   **Data Flow:** 
    1.  A user opens a shift with a starting float (`opening_cash`).
    2.  Sales are tagged with the active `shift_id`.
    3.  Upon closing, the system calculates the sum of cash sales linked to the shift, adds the float, and compares it to the declared `actual_cash`.
*   **Potential Problems:** If a sale is refunded or voided after a shift is closed, the historical shift reports will no longer mathematically balance unless handled by a robust voiding workflow.

## 4. Prescriptions Subsystem (`prescription_service.go`)

*   **Purpose & Responsibilities:** Digitzes doctor prescriptions to be filled by the pharmacy.
*   **Dependencies:** Read by `SalesService` during checkout.
*   **Data Flow:** 
    1. Pharmacist logs patient details and required medications.
    2. When the customer pays at the POS, the `SalesService` updates the `quantity_dispensed` on the prescription item and flips the overall status.
*   **Modification Risks:** Currently, partial dispensing isn't fully robust in the state machine (a prescription is marked 'Dispensed' as long as it's passed in the cart). Enhancing this to support complex partial fills will require significant changes to the `SalesService` loop.

## 5. Backup & Recovery Subsystem (`backup_service.go`)

*   **Purpose & Responsibilities:** Safely extracts and restores the SQLite database file while the application is running.
*   **Data Flow (Restore):** 
    1. Verifies the uploaded file is a valid SQLite DB.
    2. Takes a global application Mutex lock.
    3. Checkpoints WAL logs to disk.
    4. Closes the application's connection pool.
    5. Overwrites the file on disk.
    6. Re-opens the connection, applies PRAGMAs, and swaps the internal `*sql.DB` pointer.
*   **Potential Problems:** This is a blocking operation. High concurrency traffic arriving during the split-second restore window will block on the Mutex.
*   **Modification Risks:** Any changes to `db.go` initialization PRAGMAs or connection limits must be manually mirrored in `RestoreDatabase`, or the system will operate with degraded performance/safety after a restore.

## General Architectural Observations

*   **Audit Trail:** Every service writes to `audit_logs` using a shared helper. Data flows consistently from the user action down to the database record.
*   **Service Layer Isolation:** The architecture strictly uses Services to interact with the Database, keeping handlers/API controllers clean. 
*   **Error Handling:** Standard Go error bubbling is used. Database errors are wrapped and returned up the chain, preventing silent failures.
