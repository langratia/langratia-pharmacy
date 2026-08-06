# 13. Logging Strategy

## Purpose
This document outlines the logging strategy used by the Langratia Pharmacy POS system to track application behavior, debug issues, and audit system events.

## Responsibilities and Subsystems
Logging in the application is split into two primary paradigms: System Application Logging (for debugging and technical operations) and Business Audit Logging (for user accountability).

### System Application Logging
- **Implementation**: The application uses a custom wrapper around the standard Go `log` package located in `backend/logger/logger.go`.
- **File System Usage**: 
  - On startup (`app.go`), the application initializes the logger to write to a `logs` directory alongside the executable (`filepath.Join(execDir, "logs")`).
  - It creates daily rotating log files with the format `langratia-YYYY-MM-DD.log`.
- **Concurrency**: The logger uses a `sync.Mutex` (`mu.Lock()`) around writes to ensure thread-safe concurrent logging from multiple background tasks or HTTP requests.
- **Output**: Logs are duplicated. `io.MultiWriter(os.Stderr, f)` ensures that logs are visible in the terminal (if run via CLI) and appended to the daily file.
- **Levels**: Exposes three primary severity functions: `Info()`, `Warn()`, and `Error()`.

### Business Audit Logging
- **Implementation**: Separate from system logs, the database schema includes an `audit_logs` table.
- **Data Flow**: Key business services (like `AuthService` in `auth_service.go`) call a `logAction` function, which inserts records mapping a `user_id`, `action` string, and contextual `details` into the database.
- **Purpose**: This ensures non-repudiation for critical actions (e.g., voiding a sale, changing permissions, first-time setup).

## Potential Problems & Future Risks
- **Log File Bloat**: `backend/logger/logger.go` creates daily log files but does not implement automatic log rotation or cleanup of historical files. Over years of operation, the `logs/` directory could consume significant disk space.
- **Structured Logging**: The current system uses standard string formatting (`fmt.Sprintf("[INFO] "+format, v...)`). As the system scales, migrating to structured JSON logging (e.g., `zap` or `logrus`) would make parsing logs in aggregate systems (like ELK) much easier.
- **Frontend Logging**: There is no explicit mechanism sending frontend client-side errors back to the Go logger. UI exceptions caught by the `<ErrorBoundary>` might only exist in the browser/webview console, making remote troubleshooting of UI crashes difficult.
