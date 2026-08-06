# Network & RPC Architecture

## Subsystem Overview
The Langratia Pharmacy POS system employs a decentralized, peer-to-peer style Host/Client architecture for multi-workstation setups. Instead of relying on a dedicated cloud server, one terminal acts as the "Host" (running the centralized database and backend services), while other terminals act as "Clients" connecting to the Host over the local area network (LAN).

### Purpose
To allow multiple physical point-of-sale terminals to operate on a single, synchronized database without requiring internet access or external cloud infrastructure.

### Responsibilities
- **Host**: Runs the SQLite database, exposes an HTTP-based RPC server on port `45556`, and listens for UDP broadcast discovery requests on port `45555`.
- **Client**: Discovers the Host on the LAN, proxies all backend method calls over HTTP RPC to the Host, and operates statelessly.

---

## 1. Discovery Mechanism
Clients dynamically find the Host without requiring manual IP configuration.
- **Protocol**: UDP Broadcast.
- **Port**: `45555`.
- **Data Flow**:
  1. The Client broadcasts a UDP packet containing the magic string `LANGRATIA_DISCOVER` to `255.255.255.255`.
  2. The Host's UDP listener (`backend/network/discovery.go`) receives this request and replies with `LANGRATIA_SERVER|<HOSTNAME>|http://<HOST_IP>:45556`.
  3. The Client parses this response and sets its internal `apiURL` for subsequent RPC calls.

## 2. RPC Protocol
The system uses a custom JSON-over-HTTP RPC implementation (`backend/api/rpc.go`).
- **Data Flow**: 
  1. The Client packages the method name and arguments into a JSON payload (`RPCRequest`).
  2. A POST request is sent to `http://<HOST_IP>:45556/rpc`.
  3. The Host unmarshals the JSON and uses Go's `reflect` package to dynamically invoke the corresponding method on the `*App` struct (`app.go`).
  4. The result (or error) is serialized into an `RPCResponse` and sent back.

## 3. Authentication Between Clients and Host
**Current Implementation**: 
- There is **no authentication at the network/RPC layer**. The RPC endpoint (`/rpc`) is completely open to anyone on the LAN.
- Business logic relies entirely on a trusted `userID` integer passed in the RPC payload (e.g., `GetUser(targetID int64, userID int64)`).
- The Host's backend functions (like `a.requireAdmin(userID)`) look up this integer in the database to verify permissions, assuming the client has authentically verified the user.

## 4. Data Synchronization
Because the architecture is strictly Host/Client (thin clients), there is no true "data synchronization" or conflict resolution required at the edge. 
- All data resides on the Host's SQLite database.
- Clients do not cache writable business data locally. 
- Every read and write is a synchronous RPC call to the Host.

## 5. Concurrent Writes & Conflict Handling
Multiple clients can ring up sales simultaneously.
- **Handling Strategy**: The system relies on centralized locking on the Host.
- SQLite is configured with `PRAGMA journal_mode = WAL` and a `busy_timeout = 5000` to handle standard concurrent reads alongside a single write.
- For complex, multi-table transactions (like creating a sale and deducting batch stock in `sales_service.go`), the system uses a global application-level mutex (`s.db.Lock()`). This serializes critical writes to prevent the SQLite `database is locked` error under high contention.

---

## Potential Problems & Vulnerabilities

1. **Severe Security Flaw (Auth Bypass)**: Because the RPC server trusts the `userID` passed in the payload without requiring a cryptographic session token (like a JWT), any machine on the LAN can send an HTTP POST request to `/rpc` with `userID: 1` (the admin ID) and execute privileged commands.
2. **Network Failures & Timeouts**: The `CallRPC` function uses the default `http.Post` which lacks a timeout. If the Host silently drops off the network, the Client's HTTP request will hang indefinitely, freezing the UI.
3. **Global Lock Bottleneck**: The use of a global `sync.Mutex` (`s.db.Lock()`) for sales and shifts means that if one terminal takes 2 seconds to process a massive invoice, all other terminals are completely blocked from making sales during that time.
4. **No TLS (Encryption)**: RPC traffic is sent via plain HTTP. Passwords, patient data, and sales figures can be intercepted by anyone sniffing the LAN.

## Future Modification Risks
- **Adding Session Tokens**: Fixing the authentication bypass will require rewriting the signature of almost every method in `app.go` to accept and validate a secure token instead of a raw `userID`.
- **Scaling the Mutex**: As the pharmacy adds more terminals, the global database lock will cause noticeable UI stuttering on clients. Transitioning to row-level locking or relying entirely on SQLite's internal WAL locks will require careful removal of `s.db.Lock()` and extensive stress testing.
