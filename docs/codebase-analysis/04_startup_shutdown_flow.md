# Startup & Shutdown Flow

This document provides a deep dive into the specific technical steps executed during the application's startup and shutdown phases, primarily focusing on `app.go`.

## 1. Pre-Startup Initialization
Before the Wails runtime even invokes the application hooks, Go executes package `init()` functions.
- **`execDir` Cache**: In `app.go`, an `init()` function retrieves and caches the directory of the running executable. This is crucial for resolving relative paths for logs, configuration, and portable database files.

## 2. Startup Flow (`app.startup`)
Triggered by Wails via the `OnStartup` configuration option.

### Step 2.1: Context Binding & Logging
- **Store Context**: The Wails context (`ctx`) is saved to the `App` struct. This is required for interacting with the window or triggering dialogs later.
- **Initialize Logger**: The logger is configured to write to `<execDir>/logs`.

### Step 2.2: Configuration Resolution
- **Load `config.json`**: The app attempts to read a local configuration file. This file primarily determines the `db_path` for LAN networking.

### Step 2.3: Database Connection
- **Path Resolution**: 
  - If a custom `DBPath` exists in `config.json`, it is used.
  - Otherwise, it defaults to the OS's User Config Directory (e.g., `~/.config/LangratiaPharmacy/pharmacy.db` or `%AppData%\LangratiaPharmacy\pharmacy.db`).
- **Connection**: `db.InitDB(dbPath)` is called.
- **Fallback Logic**: If the database fails to initialize, the behavior depends on the configuration:
  - If a custom network path was configured, it sets connection failure flags but does *not* panic (the frontend can handle the error state).
  - If it was a default local path, it attempts a fallback to `<execDir>/pharmacy.db`. If that fails, the application **panics**, as it cannot function without a local database.

### Step 2.4: Dependency Injection
If the database connection is successful, the service layer is initialized.
- Instances of all services (Auth, Medicine, Batch, Sales, etc.) are created and injected with the `*db.DB` connection pointer.
- These services are attached to the `App` struct.

### Step 2.5: Network Architecture (Host/Client Mode)
The application evaluates the `DBPath` to determine its role in a LAN setup:
- **Client Mode**: If `DBPath` starts with `http://`, the app runs as a Client. It sets `a.apiURL`. Bound methods will now proxy their requests via HTTP RPC to the Host instead of executing local service logic.
- **Host Mode**: If no custom URL is provided, the app acts as the Host.
  - It spins up a goroutine running the HTTP RPC Server (`api.StartServer`) to handle incoming Client requests.
  - It spins up another goroutine running the UDP Discovery Listener (`network.StartServerListener`) to allow Clients to auto-discover the Host's IP.

### Step 2.6: Background Services
- **Automated Backups**: `a.startBackupScheduler()` is called. It immediately executes one backup to ensure a snapshot is taken on launch, and then creates a ticker to run every 12 hours. It also handles cleanup of old backups (keeping the last 14).

## 3. Shutdown Flow (`app.shutdown`)
Triggered by Wails via the `OnShutdown` configuration option when the application window is closed.

- **Logging**: Records the shutdown event.
- **Database Cleanup**: Ensures that `a.database.Close()` is called to flush any pending SQLite transactions, close open file handles, and release locks. This prevents database corruption.
- **Process Termination**: Wails gracefully terminates the Go process following this hook.
