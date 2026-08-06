# 12. Error Handling

## Purpose
This document explains the error handling strategy employed across the Langratia Pharmacy POS system, bridging the Go backend and React frontend.

## Responsibilities and Subsystems
Error handling is distributed between Go's explicit error returning and React's Promise-based asynchronous handling, specifically relying on Wails' inter-process communication bridge.

### Backend Error Strategy
- **Go Pattern**: The backend heavily relies on idiomatic Go error handling (`if err != nil { return err }`).
- **Service Layer Propagation**: Errors generated at the database level (SQLite errors, row not found) bubble up to the Service layer (e.g., `services/auth_service.go`). 
- **Contextual Wrapping**: The services often wrap errors using `fmt.Errorf` to add context before returning them to `app.go` (the Wails bridge). For example: `return nil, fmt.Errorf("failed to hash password: %w", err)`.
- **RPC Error Handling**: The `backend/api/rpc.go` module intercepts errors returned by invoked methods via reflection. It parses the returned `error` interface and maps it into the `RPCResponse{Error: string}` JSON payload, ensuring clients receive actionable text instead of HTTP 500 crashes.

### Frontend Error Strategy
- **Wails Bridge Promises**: Go methods bound to the frontend return Promises. If the Go method returns a non-nil `error`, the JavaScript Promise is rejected with the string value of the Go error.
- **Catching**: The React frontend wraps Wails calls in `try...catch` blocks.
- **User Feedback**: The application uses `react-hot-toast` (configured in `App.tsx`) to display error messages to the user. For instance, catching a rejected promise will often trigger a `toast.error(err.message || "An error occurred")`.
- **Error Boundaries**: `App.tsx` wraps the `MainApp` component in an `<ErrorBoundary>` to catch unhandled rendering exceptions, preventing white-screen crashes.

## Potential Problems & Future Risks
- **Error String Fragility**: Because the backend returns raw error strings, the frontend relies on string matching or generic displays. This makes internationalization (i18n) difficult because the UI layer cannot easily translate "failed to hash password" if it isn't an error code.
- **Silent Failures**: If a `try...catch` block swallows an error without toasting or logging it, the application state could drift from the backend state.
- **Database Connection Failures**: In `app.go`, if the database fails to initialize during startup, the app gracefully traps it in a boolean (`a.dbConnectionFailed = true`) rather than panicking, allowing the UI to render an error state rather than crashing immediately. This is a good practice but must be respected by all subsequent service calls.
