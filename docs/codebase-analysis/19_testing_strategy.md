# 19. Testing Strategy

## 1. Backend Testing
The backend utilizes Go's native `testing` package with a mix of unit, integration, and stress tests.

- **API & Integration Tests:** Files like `api_test.go` and `db_test.go` suggest standard testing of RPC endpoints and database queries.
- **Stress Testing (`app_stress_test.go`):** 
  - Contains an extensive `TestAPIStressSuite` that verifies the performance and reliability of the POS in a multi-node/API proxy setup.
  - **Setup:** It spins up a "Host" app bound to `:45556` with an in-memory temp SQLite DB, and a "Client" app that acts as an API proxy.
  - **Stage 1 (Catalog Ingestion):** Tests rapid addition of 500 catalog items via JSON-RPC.
  - **Stage 2 (Concurrent Sales):** Spawns 10 concurrent worker goroutines (simulating 10 cashiers) processing 50 sales each (500 total).
  - **Goal:** Ensures that SQLite lock contention, API rate limits, and network proxies do not drop transactions under heavy, realistic load.

## 2. Frontend Testing
- **Current State:** The `frontend/package.json` relies solely on `tsc` (TypeScript compiler) for static type checking.
- **Missing Tools:** There are no testing frameworks (like Jest, Vitest, or React Testing Library) configured. There are also no E2E testing tools (like Cypress or Playwright) visible in the immediate configuration.

## 3. Risks & Gaps
- **UI Logic Regressions:** Because the frontend lacks automated testing, complex UI state (like managing the active shopping cart, applying discounts, or handling network failures gracefully) must be manually tested.
- **E2E Validation:** While `app_stress_test.go` exercises the backend through the RPC layer, it bypasses the Wails bindings and the WebView entirely. True E2E tests validating the Wails + React integration are absent.
