package services

import (
	"app/backend/db"
	"app/backend/logger"
)

// logAudit writes a structured entry to the audit_logs table.
// This is the single, shared implementation used by all services —
// previously each service had an identical copy that silently swallowed errors.
// Errors are now logged to the application logger rather than discarded.
func logAudit(database *db.DB, userID int64, username, action, details string) {
	if _, err := database.Exec(
		`INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)`,
		userID, username, action, details,
	); err != nil {
		logger.Error("audit log write failed [action=%s user=%s]: %v", action, username, err)
	}
}
