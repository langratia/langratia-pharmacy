# Background Tasks

## Subsystem Overview
The system relies on background tasks to perform asynchronous operations that are essential for the Host mode of the POS, such as scheduled automated backups, network discovery broadcasting, and RPC server hosting. These tasks run silently alongside the main Wails desktop GUI loop.

### Purpose
To offload blocking, continuous, or scheduled operations from the main UI thread, ensuring the application remains responsive while providing enterprise features (like high availability across the LAN and disaster recovery).

---

## 1. Automated Backup Scheduler (`startBackupScheduler`)
- **Responsibilities**: Creates a snapshot of the SQLite database every 12 hours and cleans up old backups (retaining only the last 14).
- **Dependencies**: Depends on the Wails Application Context (`a.ctx`), `BackupService`, and access to the file system (`/backups/` directory).
- **Data Flow**: 
  1. Triggered on app startup, then waits on a `time.Ticker`.
  2. Acquires the global database lock (`s.db.Lock()`) via `BackupService`.
  3. Writes an exact binary copy of the `.db` file to disk.
  4. Scans the directory and deletes files older than the retention threshold.

## 2. RPC HTTP Listener (`api.StartServer`)
- **Responsibilities**: Listens indefinitely on TCP port `45556` for incoming JSON-over-HTTP requests from Client workstations.
- **Dependencies**: Depends on the `net/http` package and a valid reference to the `*App` target for reflection.
- **Data Flow**: Deserializes JSON, invokes the requested Go method, and serializes the return values back to the TCP socket.

## 3. UDP Discovery Listener (`network.StartServerListener`)
- **Responsibilities**: Listens continuously on UDP port `45555` for LAN broadcast packets to help Clients auto-discover the Host IP.
- **Dependencies**: `net` package, OS hostname retrieval, and local IP resolution.
- **Data Flow**: Reads UDP byte stream, checks for magic string, formats the response with the Host's local IP address, and writes back to the broadcast sender.

---

## Potential Problems

1. **Silent Failures on Backup**: The backup scheduler runs in a detached goroutine. If it fails (e.g., due to insufficient disk space or permission errors), it only logs the error to the file system using `logger.Error`. The end-user at the GUI level is completely unaware that backups have stopped working.
2. **No Graceful Shutdown for Network Listeners**: While the backup scheduler listens for `a.ctx.Done()` to cleanly stop its ticker, the `api.StartServer` (`http.ListenAndServe`) and `network.StartServerListener` do not have context cancellation or graceful shutdown logic implemented. When the app closes, these goroutines are aggressively killed by the OS, which could abruptly terminate an in-flight RPC request from a Client.
3. **UDP Port Conflicts**: The hardcoded UDP port `45555` could be blocked by a strict Windows Firewall or occupied by another application, causing the background task to fail on startup.

## Future Modification Risks
- **Adding More Scheduled Tasks**: There is no centralized job queue or cron manager. Adding more background tasks (like daily sales report emails, or automatic update checks) will clutter `app.go` with multiple unmanaged `go func()` blocks. Transitioning to a proper job scheduler library (like `robfig/cron`) would be safer.
- **Memory Leaks**: Modifying the `Ticker` implementation without properly calling `ticker.Stop()` (or relying solely on context cancellation) can easily introduce memory leaks in Go if the loops are not managed correctly.
