# 20. Technical Debt & Recommendations

## 1. Frontend Vulnerabilities & Debt
- **Lack of Automated Testing:** As identified in the Testing Strategy, the frontend has zero automated tests (Vitest/Jest). Complex state management (cart logic, discounts, checkout) is prone to regressions.
- **Type Safety Gap:** Wails typically generates TypeScript definitions for Go structs in the `frontend/wailsjs` directory. However, if the frontend doesn't strictly adhere to these interfaces, runtime errors could occur.

## 2. Backend & Architecture
- **Caching Strategy:** The absolute disabling of all caching via middleware in `main.go` (`no-cache, no-store`) is a heavy-handed approach to solving upgrade caching bugs. It wastes CPU cycles parsing static JS/CSS on every reload.
  - **Recommendation:** Implement content hashing (which Vite does by default) and allow long-lived caching of bundled assets.
- **Scalability Limit of SQLite:** The application enables Host/Client networking where multiple POS terminals hit a single SQLite database over HTTP/RPC. While `WAL` mode and a 5-second `busy_timeout` are configured, scaling beyond 10-20 concurrent active cashier nodes will inevitably cause `SQLITE_BUSY` (database is locked) errors due to the single-writer nature of SQLite.
  - **Recommendation:** If the system is targeted at large enterprise deployments, an abstraction layer allowing PostgreSQL as an alternative to SQLite should be considered.
- **Backup Strategy:** Backups are written to the local disk every 12 hours in the same directory structure. If the hard drive fails, backups are lost.
  - **Recommendation:** Implement an offsite/cloud sync feature or allow users to configure network-attached storage (NAS) paths for automated backups.

## 3. Refactoring Opportunities
- **Service Registration (app.go):** The `App` struct in `app.go` has heavily coupled service dependencies (`authService`, `medicineService`, etc.). Every time a new entity is created, `app.go` grows linearly.
  - **Recommendation:** Move service initialization into a dedicated Dependency Injection container or a `service.Registry` struct to keep `app.go` clean and manageable.
- **Test Mode Injection:** `SetDatabaseForTest` manually re-initializes all 14 services. This is brittle; adding a 15th service will break tests if the developer forgets to update this function.
