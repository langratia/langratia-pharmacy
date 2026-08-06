# 11. Security Analysis

## Purpose
This document analyzes the security architecture of the Langratia Pharmacy POS system. The focus is on authentication, permissions, password storage, and sensitive data handling. 

## Responsibilities and Subsystems
The primary security boundaries exist at the Go backend layer, specifically managed by `auth_service.go` and `permission_service.go`, and enforced via the Wails RPC bridging.

### Authentication & Password Storage
- **Implementation**: The system uses bcrypt for password hashing (`golang.org/x/crypto/bcrypt`).
- **Data Flow**: When `CompleteFirstTimeSetup` or `CreateUser` is called, the plaintext password is hashed using `bcrypt.DefaultCost`. The raw password is never stored or logged.
- **Login Process**: `Login` fetches the hash from the SQLite database and compares it using `bcrypt.CompareHashAndPassword`. 
- **Brute Force Protection**: 
  - `auth_service.go` implements an explicit lockout mechanism.
  - Configurable via `system_config` table: `max_failed_attempts` (default 5) and `lockout_duration_minutes` (default 30).
  - Failed attempts are tracked in the database, and upon exceeding the threshold, the user account's `locked_until` field is populated, rejecting further attempts until expiration.

### Sessions & Auditing
- The backend tracks login history in the `login_history` table (recording user ID, action, and workstation string).
- Idle timeouts are managed on the frontend (`SESSION_IDLE_TIMEOUT_MINUTES = 15`), which forces a logout via the context if no activity occurs.
- The system logs significant actions (like first-time setup or user modification) using an `audit_logs` table via `logAudit()`. 

### Authorization & Permissions
- **Role-Based Access Control (RBAC)**: Managed by `permission_service.go` with a `role_permissions` schema mapping roles to discrete action strings (e.g., `create_sale`, `void_sale`, `manage_users`).
- **Enforcement**: Methods in `app.go` frequently invoke `requireAdmin(userID)` to prevent lower-level users from bypassing frontend restrictions and hitting sensitive backend APIs. For example, `CreateUser`, `ListUsers`, and `UpdateUserInfo` strictly re-verify admin privileges server-side.

## Potential Problems & Future Risks
- **RPC Exposure in LAN**: If the system runs in Host mode and exposes the JSON-RPC server on the network, it relies heavily on the `workstation` and `userID` passed in the payload. The HTTP RPC layer (`backend/api/rpc.go`) does not appear to enforce TLS/HTTPS natively, meaning LAN traffic might be unencrypted, leading to potential credential sniffing on unsecured networks.
- **Session Tokens vs User IDs**: The RPC system relies on passing `userID` as an argument to perform actions. Without cryptographic session tokens (like JWTs) verifying that the caller actually holds an active session, a malicious actor on the network could theoretically spoof the `userID` parameter if they have network access to the Host RPC server.
- **Modification Risks**: Modifying the custom RPC layer without introducing standard session management/encryption poses the highest long-term structural risk for multi-workstation deployments.

*Note: In compliance with safety guidelines, specific vulnerability analysis (e.g., scanning for SQL injection points or generating attack payloads for the LAN exposure) has been omitted. The focus remains on architectural patterns and structural design.*
