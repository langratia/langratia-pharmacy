# Database Architecture and Schema Analysis

This document provides an in-depth architectural analysis of the SQLite database layer in the Langratia Pharmacy POS system.

## 1. Core Schema and Relationships

The system uses a relational SQLite database with the following core entities:

*   **Users & Auth:**
    *   `users`: Stores staff credentials, roles, and profiles. Uses soft deletes (`active` column added in migration V1).
    *   `role_permissions`: Maps roles to specific granular permissions (e.g., `admin`, `cashier`).
    *   `login_history`: Tracks user login sessions.
*   **Inventory Management:**
    *   `medicines`: Core product catalog. Uses soft deletes (`is_archived`). Maintains an aggregated `current_stock` column.
    *   `medicine_units`: Supports multi-unit selling (e.g., selling by strip or box) by defining conversion factors linked to a base unit.
    *   `batches`: Tracks individual shipments of medicines. Crucial for First-Expiry-First-Out (FEFO) dispensing. Links to `medicines` (`ON DELETE CASCADE`) and `suppliers` (`ON DELETE SET NULL`).
    *   `stock_adjustments`: Audit trail for manual changes to batch inventory (e.g., damages, counting errors).
*   **Procurement:**
    *   `suppliers`: Supplier directory. Uses soft deletes (`is_archived`).
    *   `purchases` & `purchase_items`: Records incoming stock acquisitions.
*   **Sales & POS:**
    *   `sales` & `sale_items`: Records customer transactions. Links to specific batches to maintain traceability.
    *   `shifts`: Used for cash reconciliation (till management). Sales are associated with a `shift_id`.
*   **Clinical:**
    *   `prescriptions` & `prescription_items`: Manages patient prescriptions. Items are updated to "Dispensed" during the POS flow.
*   **System & Auditing:**
    *   `system_config` & `pharmacy_config`: Key-value and structured system-wide settings.
    *   `audit_logs`: Application-level tracking of critical actions.

### Foreign Keys and Constraints
*   Foreign keys are strictly enforced using `PRAGMA foreign_keys = ON;`.
*   Most dependencies on "Actor" or "Meta" tables (like `users` or `suppliers`) use `ON DELETE SET NULL` to preserve historical transaction records if an entity is hard-deleted.
*   Parent-child relationships (e.g., `purchases` -> `purchase_items`, `medicines` -> `batches`) use `ON DELETE CASCADE` to ensure orphaned records don't linger.

## 2. Migration Strategy

The system utilizes an in-house schema migration engine in Go:
*   A base schema is executed first.
*   Incremental schema changes are defined in a `Migrations` slice (structs with `Version`, `Description`, and `Script`).
*   A `schema_migrations` table tracks the highest applied version.
*   The `InitDB` function loops through the migrations array and executes any scripts with a version greater than those present in `schema_migrations`, wrapping each step in a transaction.

## 3. Soft Delete Implementation

Soft deletes are employed to maintain historical integrity:
*   `users.active`: Defaults to `1`. Used to lock out terminated employees without deleting their sales history.
*   `suppliers.is_archived`: Defaults to `0`. 
*   `medicines.is_archived`: Defaults to `0`. 

**Data Integrity Risk:** Soft deletes require all application queries to explicitly filter by the active status (e.g., `WHERE is_archived = 0`). If a service forgets this clause, archived data will leak into UI lists or reports.

## 4. Audit System

The `audit_logs` table provides a robust paper trail.
*   Services inherit a `logAction(userID, username, action, details)` helper that inserts into this table.
*   It captures the user ID, string username (in case the user is deleted), action string (e.g., "DATABASE_EXPORT", "POS_SALE"), and human-readable details.
*   Because `user_id` uses `ON DELETE SET NULL`, the `username` text field guarantees the actor can still be identified even if their user account is purged.

## 5. SQLite Performance Tuning

The `db.go` initialization applies aggressive Pragmas to optimize SQLite for a high-concurrency POS environment:
*   `PRAGMA journal_mode = WAL;`: Enables Write-Ahead Logging, allowing concurrent readers and writers.
*   `PRAGMA synchronous = NORMAL;`: Reduces disk I/O fsyncs, vastly improving write speeds while maintaining safety in WAL mode.
*   `PRAGMA temp_store = MEMORY;`: Keeps temporary tables and indices in RAM.
*   `PRAGMA cache_size = -64000;`: Allocates 64MB of RAM for the SQLite page cache.
*   `PRAGMA busy_timeout = 5000;`: Waits up to 5 seconds for a lock before failing, reducing `database is locked` errors during parallel requests.
*   **Connection Pooling:** Go's `database/sql` is explicitly tuned to `SetMaxOpenConns(10)` and `SetMaxIdleConns(5)`.

**Indexes:** High-traffic queries are supported by specific indexes (added in Migration V9):
*   `batches(medicine_id, expiry_date)` and `batches(quantity_remaining)`: Optimizes FEFO inventory deductions.
*   `sales(sale_date)` and `sales(user_id, sale_date)`: Accelerates dashboard reporting and cashier performance metrics.

## 6. Database Corruption and Backup Safety

The `BackupService` (`backend/services/backup_service.go`) employs highly safe techniques for interacting with the live DB file:

*   **Exporting:** 
    *   Locks the application-level Database Mutex (`s.db.Lock()`).
    *   Executes `PRAGMA wal_checkpoint(FULL);` to flush the WAL file into the main `.db` file, ensuring the copied file is complete.
    *   Uses `io.Copy` to duplicate the file safely.
*   **Restoring:**
    *   Validates the uploaded backup by opening a temporary SQL connection to it and pinging it *before* halting the active system.
    *   Locks the Mutex, flushes the current WAL, and gracefully closes the active connection pool.
    *   Overwrites the local file.
    *   Re-opens the connection, re-applies all PRAGMAs, and atomically swaps the underlying `*sql.DB` pointer. This allows hot-swapping the database without crashing or restarting the Go backend process.

## 7. Data Integrity Risks & Vulnerabilities

1.  **Redundant Stock State:** The system maintains both `medicines.current_stock` and the aggregate of `batches.quantity_remaining`. The `BatchService` handles keeping these in sync within a single SQL transaction. However, if a developer manually edits the database or adds a new service that modifies `batches` without invoking the recalculation trigger, the total stock in `medicines` will drift from reality. 
2.  **Concurrency on Stock Deductions:** While `DeductStockFEFO` uses an SQL transaction, it fetches current quantities into memory, calculates deductions, and then runs `UPDATE` queries. If two transactions run concurrently for the same medicine, there's a theoretical risk of a race condition depending on the SQLite isolation level (SQLite usually locks the whole DB for writes, but in WAL mode, read-modify-write patterns can sometimes trigger busy errors or unexpected behaviors if not strictly serialized).
