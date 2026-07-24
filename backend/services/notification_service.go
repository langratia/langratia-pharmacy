package services

import (
	"fmt"

	"app/backend/db"
	"app/backend/models"
)

type NotificationService struct {
	db *db.DB
}

func NewNotificationService(database *db.DB) *NotificationService {
	return &NotificationService{db: database}
}

// GetNotificationsSummary fetches low stock medicines and expiring batches
func (n *NotificationService) GetNotificationsSummary() (*models.NotificationSummary, error) {
	summary := &models.NotificationSummary{
		Items: []models.NotificationItem{},
	}

	// 1. Low stock medicines
	lowStockQuery := `
		SELECT id, name, current_stock, reorder_level 
		FROM medicines 
		WHERE is_archived = 0 AND current_stock <= reorder_level
		ORDER BY current_stock ASC 
		LIMIT 10`

	rows, err := n.db.Query(lowStockQuery)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id int64
			var name string
			var stock, reorder int
			if err := rows.Scan(&id, &name, &stock, &reorder); err == nil {
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
	}

	// 2. Expiring batches (expiring within 60 days)
	expiringQuery := `
		SELECT b.id, b.batch_number, m.name, b.expiry_date, b.quantity_remaining
		FROM batches b
		JOIN medicines m ON b.medicine_id = m.id
		WHERE b.quantity_remaining > 0 
		  AND DATE(b.expiry_date) <= DATE('now', '+60 days')
		ORDER BY b.expiry_date ASC
		LIMIT 10`

	expRows, err := n.db.Query(expiringQuery)
	if err == nil {
		defer expRows.Close()
		for expRows.Next() {
			var id int64
			var batchNum, medName, expDate string
			var qty int
			if err := expRows.Scan(&id, &batchNum, &medName, &expDate, &qty); err == nil {
				summary.ExpiringCount++
				summary.Items = append(summary.Items, models.NotificationItem{
					ID:       fmt.Sprintf("expiring_%d", id),
					Type:     "expiring_batch",
					Title:    "Expiring Batch",
					Message:  fmt.Sprintf("Batch %s of %s (%d units) expires on %s", batchNum, medName, qty, expDate),
					Severity: "danger",
					Target:   "inventory",
				})
			}
		}
	}

	summary.TotalCount = summary.LowStockCount + summary.ExpiringCount
	return summary, nil
}
