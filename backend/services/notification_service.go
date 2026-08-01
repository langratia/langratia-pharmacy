package services

import (
	"fmt"

	"app/backend/db"
	"app/backend/logger"
	"app/backend/models"
)

type NotificationService struct {
	db *db.DB
}

func NewNotificationService(database *db.DB) *NotificationService {
	return &NotificationService{db: database}
}

// GetNotificationsSummary fetches low stock medicines and expiring batches.
// Each query result set is closed explicitly (not via defer) to avoid holding
// multiple open result sets simultaneously — the prior defer-inside-if pattern
// kept all 4 result sets open until the function returned.
func (n *NotificationService) GetNotificationsSummary() (*models.NotificationSummary, error) {
	summary := &models.NotificationSummary{
		Items: []models.NotificationItem{},
	}

	// 1. Out of stock medicines
	rows, err := n.db.Query(`
		SELECT id, name, current_stock, reorder_level
		FROM medicines
		WHERE is_archived = 0 AND current_stock = 0
		ORDER BY name ASC
		LIMIT 50`)
	if err == nil {
		for rows.Next() {
			var id int64
			var name string
			var stock, reorder int
			if err := rows.Scan(&id, &name, &stock, &reorder); err == nil {
				summary.LowStockCount++
				summary.Items = append(summary.Items, models.NotificationItem{
					ID:       fmt.Sprintf("out_of_stock_%d", id),
					Type:     "out_of_stock",
					Title:    "Out of Stock Alert",
					Message:  fmt.Sprintf("%s is completely out of stock!", name),
					Severity: "danger",
					Target:   "inventory",
				})
			}
		}
		if err := rows.Err(); err != nil {
			logger.Error("Error iterating out of stock medicines: %v", err)
		}
		rows.Close()
	}

	// 2. Low stock medicines
	rowsLow, err := n.db.Query(`
		SELECT id, name, current_stock, reorder_level
		FROM medicines
		WHERE is_archived = 0 AND current_stock > 0 AND current_stock <= reorder_level
		ORDER BY current_stock ASC
		LIMIT 50`)
	if err == nil {
		for rowsLow.Next() {
			var id int64
			var name string
			var stock, reorder int
			if err := rowsLow.Scan(&id, &name, &stock, &reorder); err == nil {
				summary.LowStockCount++
				summary.Items = append(summary.Items, models.NotificationItem{
					ID:       fmt.Sprintf("low_stock_%d", id),
					Type:     "low_stock",
					Title:    "Low Stock Alert",
					Message:  fmt.Sprintf("%s stock is down to %d (Reorder level: %d)", name, stock, reorder),
					Severity: "warning",
					Target:   "inventory",
				})
			}
		}
		if err := rowsLow.Err(); err != nil {
			logger.Error("Error iterating low stock medicines: %v", err)
		}
		rowsLow.Close()
	}

	// 3. Already expired batches (still have quantity remaining)
	expRows, err := n.db.Query(`
		SELECT b.id, b.batch_number, m.name, b.expiry_date, b.quantity_remaining
		FROM batches b
		JOIN medicines m ON b.medicine_id = m.id
		WHERE b.quantity_remaining > 0
		  AND DATE(b.expiry_date) < DATE('now')
		ORDER BY b.expiry_date ASC
		LIMIT 50`)
	if err == nil {
		for expRows.Next() {
			var id int64
			var batchNum, medName, expDate string
			var qty int
			if err := expRows.Scan(&id, &batchNum, &medName, &expDate, &qty); err == nil {
				summary.ExpiringCount++
				summary.Items = append(summary.Items, models.NotificationItem{
					ID:       fmt.Sprintf("expired_%d", id),
					Type:     "expired_batch",
					Title:    "Expired Batch",
					Message:  fmt.Sprintf("Batch %s of %s (%d units) EXPIRED on %s!", batchNum, medName, qty, expDate),
					Severity: "danger",
					Target:   "inventory",
				})
			}
		}
		if err := expRows.Err(); err != nil {
			logger.Error("Error iterating expired batches: %v", err)
		}
		expRows.Close()
	}

	// 4. Expiring batches (within 60 days)
	expiringRows, err := n.db.Query(`
		SELECT b.id, b.batch_number, m.name, b.expiry_date, b.quantity_remaining
		FROM batches b
		JOIN medicines m ON b.medicine_id = m.id
		WHERE b.quantity_remaining > 0
		  AND DATE(b.expiry_date) >= DATE('now')
		  AND DATE(b.expiry_date) <= DATE('now', '+60 days')
		ORDER BY b.expiry_date ASC
		LIMIT 50`)
	if err == nil {
		for expiringRows.Next() {
			var id int64
			var batchNum, medName, expDate string
			var qty int
			if err := expiringRows.Scan(&id, &batchNum, &medName, &expDate, &qty); err == nil {
				summary.ExpiringCount++
				summary.Items = append(summary.Items, models.NotificationItem{
					ID:       fmt.Sprintf("expiring_%d", id),
					Type:     "expiring_batch",
					Title:    "Expiring Batch",
					Message:  fmt.Sprintf("Batch %s of %s (%d units) expires on %s", batchNum, medName, qty, expDate),
					Severity: "warning",
					Target:   "inventory",
				})
			}
		}
		if err := expiringRows.Err(); err != nil {
			logger.Error("Error iterating expiring batches: %v", err)
		}
		expiringRows.Close()
	}

	summary.TotalCount = summary.LowStockCount + summary.ExpiringCount
	return summary, nil
}
