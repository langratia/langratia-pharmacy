# Architecture Overview

## 1. High-Level Architecture
Langratia Pharmacy POS is a desktop application built using the **Wails (v2)** framework. Wails provides a bridge between a native OS webview (frontend) and a Go application (backend).
- **Backend:** Go (Golang) handling business logic, database management (SQLite), file I/O, network services (Host/Client LAN architecture), and background tasks (scheduled backups).
- **Frontend:** React (TypeScript, Vite) handling the UI, state management, and user interactions.

## 2. Wails Desktop Architecture

### Go Backend
The Go backend runs as a native OS process. It encapsulates all heavy lifting:
- **`App` Struct (`app.go`)**: Acts as the central controller for the backend. It holds references to the database connection (`*db.DB`) and various domain-specific services (`AuthService`, `SalesService`, etc.).
- **Bound Methods**: Wails allows exposing Go methods to the Javascript runtime. In this application, the `App` struct is bound to the frontend (`wails.Run` in `main.go`). All public methods of `App` (e.g., `Login`, `AddMedicine`, `GetSales`) become accessible in the frontend via generated TypeScript bindings (`wailsjs/`).
- **Native OS Integration**: 
  - File System: Local configuration (`config.json`), SQLite database (`pharmacy.db`), and logs are stored either in the user's config directory (e.g., `AppData/Roaming/LangratiaPharmacy` on Windows) or the executable's directory.
  - Network: Custom UDP-based discovery and HTTP RPC for LAN multi-terminal setups.

### Frontend (WebView)
The frontend runs within a platform-specific WebView (e.g., WebView2 on Windows, WebKit on macOS/Linux).
- Communicates with the backend exclusively through the Wails IPC (Inter-Process Communication) bridge.
- React Router (or state-based routing) handles navigation without page reloads.

## 3. Subsystem Breakdown

### 3.1 Data Access & Storage Layer
- **Purpose**: Persist application data.
- **Responsibilities**: Manage the SQLite database connection, execute queries, and handle migrations/schema (`backend/db/`).
- **Dependencies**: Go `database/sql` and `go-sqlite3` driver.
- **Potential Problems**: SQLite concurrency is limited; concurrent heavy writes from multiple networked clients could lead to "database is locked" errors.
- **Future Modification Risks**: Schema changes require careful migration scripts to avoid breaking existing offline installations.

### 3.2 Service Layer (`backend/services/`)
- **Purpose**: Encapsulate business logic.
- **Responsibilities**: Provide domain-specific operations (e.g., calculating sale totals, validating permissions, managing inventory batches).
- **Dependencies**: Data access layer.
- **Data Flow**: Frontend -> Wails IPC -> Bound `App` method -> Specific Service -> DB -> Service -> Wails IPC -> Frontend.

### 3.3 Network Layer (Host/Client Mode)
- **Purpose**: Enable multi-terminal usage on a LAN without a centralized cloud server.
- **Responsibilities**: 
  - UDP Discovery (`backend/network/discovery.go`) allows clients to find the Host terminal.
  - HTTP RPC Server (`backend/api/server.go` & `rpc.go`) exposes the `App` bound methods over HTTP.
- **Data Flow (Client Mode)**: Instead of calling the local DB service, a bound method checks `a.apiURL`. If set, it marshals the request via HTTP to the Host's RPC server.
- **Potential Problems**: UDP broadcast might be blocked by local firewalls or distinct subnets, causing discovery failure.
- **Future Modification Risks**: Changing the signature of bound methods requires updating the generic HTTP RPC dispatcher (`HandleRPC`) which relies heavily on reflection.

### 4. Unknowns / Further Inspection Required
- **Frontend State Management**: It is unclear from the backend architecture alone if the frontend uses Context API heavily or external libraries like Redux/Zustand. (Inspection of `frontend/src/context/` is needed).
- **Update Mechanism**: Unknown how the app handles version updates.
