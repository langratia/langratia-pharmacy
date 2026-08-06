# Langratia Pharmacy POS: Backend Architecture

## Overview
The Langratia Pharmacy POS backend is built in Go and utilizes the Wails framework to bridge the gap between the React frontend and the native Go logic. It acts as a desktop application with built-in networking capabilities to support a Multi-Terminal Local Area Network (LAN) deployment without requiring a centralized cloud server.

## Core Components

### 1. The Wails Application Boundary (`app.go`)
- **Purpose**: Acts as the main entry point and boundary layer for the application.
- **Responsibilities**:
  - Initializes the Wails window and embeds the compiled frontend assets.
  - Handles application startup and shutdown lifecycles (`startup`, `shutdown`).
  - Sets up the SQLite database connection and instantiates all service layer components.
  - Disables WebView caching to prevent versioning issues during application upgrades.
  - Exposes all backend functionalities to the frontend via Wails "bound methods" (e.g., `AddMedicine`, `ProcessSale`).
  - **API Proxy Router**: Checks if the application is configured to run in "Client" mode (via `apiURL`). If so, it routes requests over the network via RPC; otherwise, it executes them locally as the "Host".
- **Dependencies**: Depends heavily on all modules in the `backend/` directory, acting as the central orchestrator.

### 2. Network & Discovery Subsystems (`backend/network/`, `backend/api/`)
- **Purpose**: Enables the LAN Multi-Terminal feature, allowing one instance to act as a Host (Database Server) and others as thin Clients.
- **Responsibilities**:
  - **Discovery (`backend/network/discovery.go`)**: Implements a custom UDP broadcasting mechanism on port `45555`. A Client sends a `LANGRATIA_DISCOVER` packet across the subnet, and the Host replies with its hostname and IP address.
  - **API Server (`backend/api/server.go`)**: Starts an HTTP server on port `45556` for the Host instance.
  - **RPC Handler (`backend/api/rpc.go`)**: Implements a custom JSON-RPC mechanism. It uses Go's `reflect` package to dynamically invoke methods on the `App` struct based on the incoming request's method string.
- **Potential Problems & Risks**:
  - **Reflection Safety**: The RPC mechanism relies on string-based method names and reflection (`methodValue.Call(in)`). This lacks compile-time safety across the network boundary. Modifying method signatures in `app.go` (e.g., adding a parameter) requires strict testing to ensure the reflection parser correctly deserializes JSON arguments and handles errors without panicking.
  - **Network Isolation**: The UDP discovery uses a simple broadcast mechanism which might be blocked by aggressive local Windows firewalls or isolated subnets (e.g., AP isolation on Wi-Fi routers).

### 3. Database Subsystem (`backend/db/`)
- **Purpose**: Manages connections, configuration, and migrations for the embedded SQLite database.
- **Responsibilities**:
  - Initializes the SQLite connection using `modernc.org/sqlite` (a pure Go, CGO-free SQLite driver, simplifying cross-compilation).
  - Optimizes SQLite performance by configuring pragmas: `journal_mode = WAL` (Write-Ahead Logging), `synchronous = NORMAL`, `temp_store = MEMORY`, `cache_size = -64000` (64MB), and `busy_timeout = 5000` (to handle concurrent reads/writes in Host mode).
  - Manages schema creation (`schema.go`) and executes versioned incremental migrations.
- **Dependencies**: Relies on the local filesystem to store the `.db` file, defaulting to the OS-specific user configuration directory (e.g., `AppData/Roaming` on Windows).

### 4. Background Tasks
- **Responsibilities**: 
  - **Automated Backups**: `startBackupScheduler` in `app.go` spins up a goroutine that periodically copies the database file to a `backups/` folder to prevent data loss. It also prunes old backups based on a retention policy.

## Frontend / Backend Communication Flow

The data flow depends on whether the terminal is the Host or a Client:

1. **Local (Host) Mode**: 
   React UI -> `window.go.main.App.MethodName()` -> Wails IPC -> Go `App.MethodName()` -> `Service.MethodName()` -> SQLite Database.

2. **Network (Client) Mode**: 
   React UI -> `window.go.main.App.MethodName()` -> Wails IPC -> Go `App.MethodName()` -> Detects `apiURL` -> Calls `api.CallRPC()` -> HTTP POST to Host's port `45556` -> Host's `server.go` -> Host's `rpc.go` (Reflection) -> Host's `App.MethodName()` -> Host's Service -> Host's SQLite Database.
