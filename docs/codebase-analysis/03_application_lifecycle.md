# Application Lifecycle

This document describes the high-level lifecycle of the Langratia Pharmacy POS application, detailing how the native OS, Go Backend, and React Frontend interact during the application's lifespan.

## 1. Process Launch (Native OS)
- **Execution**: The user launches the compiled binary (e.g., `LangratiaPharmacyPOS.exe`).
- **OS Integration**: The Go runtime initializes and calls the `main()` function in `main.go`.
- **Wails Configuration**: `main.go` configures the Wails application options, including window dimensions, title, asset server (disabling WebView caching to prevent upgrade bugs), and registers the `App` struct for bindings.

## 2. Wails Runtime Initialization
- **`wails.Run`**: Initializes the underlying platform-specific WebView (WebView2 on Windows, WebKit on macOS/Linux).
- **Asset Server**: Mounts the embedded React frontend (`//go:embed all:frontend/dist`) so it can be served to the WebView.
- **IPC Bridge**: Establishes the Inter-Process Communication bridge that allows Javascript to call Go functions and vice versa.

## 3. Backend Startup Hook (`app.startup`)
Before the window is fully displayed and the frontend loads, Wails triggers the `OnStartup` hook mapped to `app.startup(ctx)`.
- **Context**: The Wails context is stored (`a.ctx`), allowing the backend to control the window (e.g., emit events, close the app).
- **Subsystem Initialization**: 
  - Logger setup.
  - Database initialization (`pharmacy.db`).
  - Instantiation of all business logic services (`services.NewAuthService()`, etc.).
  - Network mode evaluation (Host vs Client) via `config.json`.
  - Spawning background tasks (e.g., automated backups).

## 4. Frontend Initialization (WebView)
Once the backend startup completes, the WebView navigates to `index.html`.
- **React Bootstrapping**: `main.tsx` renders the application tree.
- **Context Providers**: `App.tsx` wraps the application in multiple providers (`ThemeProvider`, `PharmacyProvider`, `AuthProvider`, `PermissionProvider`).
- **Authentication Check**: If no active user session exists, the `LoginPage` is rendered.
- **Lazy Loading**: Major feature modules (`POSPage`, `InventoryPage`) are lazy-loaded via React `Suspense` to improve time-to-interactive.

## 5. Active Event Loop & IPC
During active usage, the application operates in an event loop mediated by Wails:
- **User Action**: The user clicks a button in the React UI (e.g., "Add Medicine").
- **IPC Call**: The frontend calls the generated TypeScript binding function (e.g., `AddMedicine()`).
- **Go Execution**: Wails routes the call to the bound `AddMedicine` method on the `App` struct.
- **Service Layer**: The `App` method delegates to `medicineService.AddMedicine()`, which interacts with the SQLite database.
- **Response**: The result (or error) is serialized back to JSON and returned to the React promise.

### Background Tasks
- **Automated Backups**: A goroutine started during initialization (`startBackupScheduler`) runs periodically (every 12 hours) to create SQLite database snapshots.
- **Idle Timer**: The frontend monitors user activity (`IdleTimer`). After 15 minutes of inactivity, it automatically triggers a logout to secure the POS terminal.

## 6. Shutdown Hook (`app.shutdown`)
- **Trigger**: The user closes the application window, or the OS sends a termination signal.
- **Wails Teardown**: Wails captures the close event and fires the `OnShutdown` hook.
- **Resource Cleanup**: The backend flushes logs, closes the SQLite database connection gracefully, and terminates background goroutines via context cancellation.
- **Process Exit**: The native OS process terminates.
