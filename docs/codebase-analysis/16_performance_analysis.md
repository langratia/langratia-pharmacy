# 16. Performance Analysis

## 1. Startup and Initialization
- **Fast Startup:** The application leverages Wails to embed the React 19 frontend into a single binary via Go's `embed.FS`. This eliminates disk I/O latency when serving the frontend.
- **Service Initialization:** The Go backend sequentially initializes services (`AuthService`, `MedicineService`, etc.) upon successful connection to the SQLite database.
- **Frontend Caching:** In `main.go`, the asset server is configured with middleware that completely disables caching (`Cache-Control: no-cache, no-store, must-revalidate`). While this ensures versioning issues are avoided during upgrades, it forces the WebView to reload all assets from memory on every refresh. Since it's a local application, network latency is non-existent, but large asset decoding could cause minor UI hitches on low-end hardware.

## 2. Database (SQLite) Performance
The application uses SQLite as its primary database. It is highly optimized for concurrent access:
- **WAL Mode:** `PRAGMA journal_mode = WAL;` allows concurrent readers and writers, which is critical for the POS system where multiple API clients might be hitting the Host machine.
- **Synchronous Normal:** `PRAGMA synchronous = NORMAL;` trades some crash-safety for significantly faster write speeds compared to `FULL`.
- **In-Memory Temporary Tables:** `PRAGMA temp_store = MEMORY;` speeds up complex queries (e.g., sorting, grouping) by avoiding disk I/O.
- **Cache Size:** `PRAGMA cache_size = -64000;` limits the cache to 64MB, preventing unbounded memory growth.
- **Connection Pooling:** `db.go` limits connections via `SetMaxOpenConns(10)` and `SetMaxIdleConns(5)`. This prevents SQLite from locking up under high load, as managed by the `busy_timeout = 5000` (5 seconds).

## 3. Memory Usage Risks
- **Go Garbage Collection:** The Go backend is highly efficient, but unbounded queries (e.g., loading all historical sales into memory without pagination) could spike memory usage.
- **WebView Overhead:** The Wails frontend runs in a Chromium-based WebView (WebView2 on Windows). This usually requires 150-300MB of RAM at baseline, which might be a constraint on older POS hardware (e.g., low-RAM Windows machines).
- **Automated Backups:** The background goroutine taking snapshots every 12 hours (`performAutomatedBackup`) could briefly spike memory/CPU as the database is cloned.

## 4. Concurrency Risks
- **API Proxy Mode:** When running in Host/Client mode, the SQLite database is accessed by remote clients via JSON-RPC. While WAL mode helps, sustained heavy writes (e.g., importing massive batches of medicines while processing sales) could still hit `database is locked` errors if transactions take longer than 5 seconds.
