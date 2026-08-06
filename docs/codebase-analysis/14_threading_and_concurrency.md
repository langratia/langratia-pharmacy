# Threading and Concurrency Model

## Subsystem Overview
The system leverages Go's native goroutines to achieve concurrent execution for network listeners, RPC requests, and scheduled background tasks. Concurrency control primarily revolves around ensuring the integrity of the single centralized SQLite database when multiple Host and Client workstations attempt to read and write simultaneously.

### Purpose
To efficiently handle multiple concurrent users and background tasks (like backups) without data corruption or crashes, while keeping the application responsive.

### Responsibilities
- **Go Runtime**: Schedules goroutines multiplexed across system threads for non-blocking I/O (e.g., HTTP requests).
- **SQLite Database (`backend/db/db.go`)**: Manages file-level concurrent access locks and transactional integrity.
- **Application Level (`sync.Mutex`)**: Manages global application state locks to prevent SQLite from being overwhelmed by simultaneous complex write transactions.

---

## 1. Threading Model
- **Request Handling**: Every incoming HTTP RPC request on the Host is automatically handled in a new, separate goroutine spun up by Go's standard `net/http` package.
- **Background Processes**: The system manually spins up isolated goroutines via `go func()` in `app.go` during startup:
  - `go api.StartServer(a)`: The RPC API listener.
  - `go network.StartServerListener()`: The UDP Discovery listener.
  - `go func()` (inside `startBackupScheduler`): The cron-style backup loop.

## 2. Concurrency Control Mechanisms
To manage simultaneous data access across these goroutines, the system uses two layers of concurrency control:

### A. Database-Level (SQLite WAL)
- The database is initialized with `PRAGMA journal_mode = WAL;` (Write-Ahead Logging).
- **Data Flow**: WAL allows simultaneous readers and a single writer without blocking each other. Reads do not block writes, and writes do not block reads.
- `PRAGMA busy_timeout = 5000;` instructs SQLite to wait up to 5 seconds for a lock to release before throwing a `database is locked` error.

### B. Application-Level (`db.Lock()`)
- The `DB` struct embeds a `sync.Mutex` (`db.mu`).
- Certain high-stakes, multi-table transactions use a global lock pattern:
  ```go
  s.db.Lock()
  defer s.db.Unlock()
  ```
- **Dependencies**: Used in `sales_service.go` (processing a sale), `shift_service.go` (opening/closing shifts), and `backup_service.go` (exporting the DB).

---

## Potential Problems

1. **Global Lock Contention**: The `s.db.Lock()` is a sledgehammer approach. It serializes *all* sales and shifts globally. If the pharmacy scales to many terminals, or if the host is running on slow hardware, terminals will experience unexplainable freezing (latency spikes) waiting for the global mutex to unlock.
2. **Missing Timeouts**: There are no context timeouts applied to database transactions. A deadlocked query could technically hold the global `s.db.Lock()` forever, requiring a hard restart of the Host app.

## Future Modification Risks
- **Removing the Global Lock**: If a developer decides to remove `s.db.Lock()` to improve concurrency, they risk encountering frequent `database is locked` errors from SQLite under heavy load. The codebase would first need a robust retry mechanism (e.g., exponential backoff for transactions) implemented across all services.
- **Connection Pooling Limits**: The database enforces a `MaxOpenConns = 10`. If the number of concurrent users exceeds this, queries will queue up. Increasing this number without understanding SQLite's file-lock limitations could cause I/O bottlenecks on the Host machine.
