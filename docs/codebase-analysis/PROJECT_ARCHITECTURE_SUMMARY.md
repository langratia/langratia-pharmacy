# Project Architecture Summary: Langratia Pharmacy POS

## 1. How the Entire System Works
Langratia Pharmacy POS is a desktop application built using the **Wails framework**. It combines a high-performance **Go backend** with a modern **React frontend** into a single, unified binary. 

When the application launches, the Wails runtime boots a hidden webview and initializes the Go backend. The backend checks for a SQLite database (handling first-time setup or schema migrations if needed). The frontend renders the UI and communicates with the backend via asynchronous Promise-based IPC (Inter-Process Communication). 

Crucially, the system supports a **Host/Client Network Architecture**. A central "Host" workstation runs the SQLite database and exposes a custom JSON-RPC API over HTTP on the local network (alongside UDP discovery broadcasts). "Client" workstations connect to this Host API, routing their backend calls over the LAN rather than accessing a local database.

## 2. Most Important Architectural Decisions
- **Wails over Electron**: Choosing Go/Wails instead of Node/Electron drastically reduces memory footprint, startup time, and binary size while providing a strongly-typed, fast backend layer.
- **Embedded Frontend**: The React frontend (`dist/`) is embedded directly into the Go binary at compile time via `//go:embed`. This guarantees version alignment and eliminates caching issues.
- **Service Layer Pattern**: The Go backend is strictly divided. `app.go` handles lifecycle and routing, while dedicated services (`auth_service.go`, `medicine_service.go`, etc.) handle business logic. This separation is vital for testability and maintainability.
- **Custom JSON-RPC**: Instead of using standard REST or gRPC for network clients, the system implements a lightweight, reflection-based JSON-RPC server (`backend/api/rpc.go`). This allows the exact same service method signatures to be invoked either locally (via Wails IPC) or remotely (via HTTP POST).
- **Soft Deletes**: The database schema heavily utilizes soft deletes (`is_archived`, `active`) rather than hard `DELETE` commands, ensuring audit trails and relational integrity are preserved.

## 3. Rules Future Developers Must Follow
1. **Never Bypass the Service Layer**: Frontend components must always call bound Wails methods in `app.go`, which in turn call the appropriate Service. Direct database access from outside a Service is strictly prohibited.
2. **Handle Both Network Modes**: When modifying or adding a method in `app.go`, you must account for the `apiURL` check. If the app is in client mode (`apiURL != ""`), the method must proxy the request via `api.CallRPC` rather than calling the local service.
3. **Respect Role-Based Permissions (RBAC)**: Frontend UI hiding is not enough. Any sensitive action (creating users, voiding sales) must re-verify permissions on the backend using `requireAdmin(userID)` or the `permissionService`.
4. **Use Structured Error Wrapping**: Go backend errors should be wrapped (`fmt.Errorf("failed to do X: %w", err)`) before returning to the frontend to ensure meaningful toast notifications in React.
5. **No Long-Running Synchronous Wails Calls**: Bound methods in `app.go` execute synchronously relative to the calling Promise. Heavy operations (like backups) must be offloaded to Goroutines to prevent UI freezing.

## 4. Areas Where Changes are Dangerous
- **`backend/api/rpc.go`**: The reflection logic here dynamically maps JSON payloads to Go method signatures. Changing how arguments are parsed or modifying the reflection bounds can instantly break all Client workstations.
- **Database Migrations (`schema.go`)**: Modifying historical migrations or altering column types without a new sequential migration script will cause database initialization failures or data corruption.
- **`app.go` Startup Sequence**: The order of operations—logging initialization, config loading, database connection, and service instantiation—is brittle. Initializing a service before the database is ready will cause nil pointer panics.
- **Shift & Till Reconciliation (`shifts` and `sales` tables)**: The financial logic binding sales to an open shift for cash expectation calculating is complex. Altering how discounts or unit conversions (`sale_items`) are calculated risks severe financial reporting discrepancies.

## 5. Recommended Improvement Roadmap
1. **RPC Security (High Priority)**: The current LAN RPC mechanism communicates over unencrypted HTTP and relies on passing unverified `userID` parameters. Implementing HTTPS (TLS) and cryptographic JWT session tokens is critical for network security.
2. **Structured Logging**: Migrate from `fmt.Sprintf` custom file logging to a structured logger like `zap`. This will allow easier parsing of log files for operational debugging.
3. **Automated Database Backups Strategy**: While the app backs up the SQLite file locally, adding an integration (e.g., AWS S3, Google Drive, or SFTP) for off-site backup would protect against total workstation hardware failure.
4. **Frontend State Management**: As the application grows, relying heavily on React Context for complex, deeply nested state might cause rendering bottlenecks. Investigating lightweight state stores (like Zustand or Jotai) for high-frequency data (like POS cart items) is recommended.
5. **Pagination for Large Datasets**: Ensure all list-fetching endpoints (e.g., `ListMedicines`, `GetSalesHistory`) enforce pagination. Returning thousands of rows over Wails IPC or RPC will eventually degrade UI performance.
