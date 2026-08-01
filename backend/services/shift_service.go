package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"app/backend/db"
	"app/backend/models"
)

type ShiftService struct {
	db *db.DB
}

func NewShiftService(database *db.DB) *ShiftService {
	return &ShiftService{db: database}
}

// GetActiveShift returns the current open shift for a user, or nil if no shift is open.
func (s *ShiftService) GetActiveShift(userID int64) (*models.Shift, error) {
	query := `
		SELECT id, user_id, username, started_at, ended_at, opening_cash, expected_cash,
		       actual_cash, cash_variance, total_sales_count, total_sales_amount,
		       status, COALESCE(notes, '')
		FROM shifts
		WHERE user_id = ? AND status = 'open'
		ORDER BY id DESC LIMIT 1
	`
	row := s.db.QueryRow(query, userID)

	var shift models.Shift
	var endedAt sql.NullTime

	err := row.Scan(
		&shift.ID, &shift.UserID, &shift.Username, &shift.StartedAt, &endedAt,
		&shift.OpeningCash, &shift.ExpectedCash, &shift.ActualCash, &shift.CashVariance,
		&shift.TotalSalesCount, &shift.TotalSalesAmount, &shift.Status, &shift.Notes,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query active shift: %w", err)
	}

	if endedAt.Valid {
		shift.EndedAt = &endedAt.Time
	}

	// Compute live totals for this open shift from sales
	s.updateShiftTotals(&shift)

	return &shift, nil
}

// OpenShift starts a new till shift with starting float cash.
func (s *ShiftService) OpenShift(userID int64, username string, openingCash float64) (*models.Shift, error) {
	if openingCash < 0 {
		return nil, errors.New("opening cash float cannot be negative")
	}

	// Check if already open
	existing, err := s.GetActiveShift(userID)
	if err == nil && existing != nil {
		return existing, nil
	}

	s.db.Lock()
	defer s.db.Unlock()

	res, err := s.db.Exec(
		`INSERT INTO shifts (user_id, username, started_at, opening_cash, status) VALUES (?, ?, ?, ?, 'open')`,
		userID, username, time.Now(), openingCash,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create shift: %w", err)
	}

	_ = res
	return s.GetActiveShift(userID)
}

// updateShiftTotals recalculates total sales count and cash totals for an open shift.
// ExpectedCash only counts Cash payment sales, since Mobile Money doesn't go into the physical till.
func (s *ShiftService) updateShiftTotals(shift *models.Shift) {
	query := `
		SELECT
			COALESCE(SUM(CASE WHEN payment_method = 'Cash' THEN total_amount ELSE 0 END), 0) as cash_sum,
			COUNT(id) as sales_count,
			COALESCE(SUM(total_amount), 0) as gross_total
		FROM sales
		WHERE shift_id = ?
	`
	var cashSum, grossTotal float64
	var count int

	err := s.db.QueryRow(query, shift.ID).Scan(&cashSum, &count, &grossTotal)
	if err == nil {
		shift.TotalSalesCount = count
		shift.TotalSalesAmount = grossTotal
		// ExpectedCash = opening float + only the cash sales received
		shift.ExpectedCash = shift.OpeningCash + cashSum
	}
}

// CloseShift closes the active shift, calculates variance, and generates a Z-Report summary.
func (s *ShiftService) CloseShift(shiftID int64, actualCash float64, notes string) (*models.ShiftZReport, error) {
	s.db.Lock()
	defer s.db.Unlock()

	// Get shift
	var shift models.Shift
	var endedAt sql.NullTime
	err := s.db.QueryRow(`
		SELECT id, user_id, username, started_at, ended_at, opening_cash, expected_cash,
		       actual_cash, cash_variance, total_sales_count, total_sales_amount,
		       status, COALESCE(notes, '')
		FROM shifts WHERE id = ?
	`, shiftID).Scan(
		&shift.ID, &shift.UserID, &shift.Username, &shift.StartedAt, &endedAt,
		&shift.OpeningCash, &shift.ExpectedCash, &shift.ActualCash, &shift.CashVariance,
		&shift.TotalSalesCount, &shift.TotalSalesAmount, &shift.Status, &shift.Notes,
	)

	if err != nil {
		return nil, fmt.Errorf("shift not found: %w", err)
	}

	if shift.Status == "closed" {
		return s.GetShiftZReport(shiftID)
	}

	// Compute totals from sales table
	s.updateShiftTotals(&shift)

	variance := actualCash - shift.ExpectedCash
	now := time.Now()

	_, err = s.db.Exec(`
		UPDATE shifts 
		SET ended_at = ?, expected_cash = ?, actual_cash = ?, cash_variance = ?,
		    total_sales_count = ?, total_sales_amount = ?, status = 'closed', notes = ?
		WHERE id = ?
	`, now, shift.ExpectedCash, actualCash, variance,
		shift.TotalSalesCount, shift.TotalSalesAmount, notes, shiftID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to close shift: %w", err)
	}

	shift.EndedAt = &now
	shift.ActualCash = actualCash
	shift.CashVariance = variance
	shift.Status = "closed"
	shift.Notes = notes

	return s.GetShiftZReport(shiftID)
}

// GetShiftZReport returns the Z-Report breakdown for a shift.
func (s *ShiftService) GetShiftZReport(shiftID int64) (*models.ShiftZReport, error) {
	var shift models.Shift
	var endedAt sql.NullTime
	err := s.db.QueryRow(`
		SELECT id, user_id, username, started_at, ended_at, opening_cash, expected_cash,
		       actual_cash, cash_variance, total_sales_count, total_sales_amount,
		       status, COALESCE(notes, '')
		FROM shifts WHERE id = ?
	`, shiftID).Scan(
		&shift.ID, &shift.UserID, &shift.Username, &shift.StartedAt, &endedAt,
		&shift.OpeningCash, &shift.ExpectedCash, &shift.ActualCash, &shift.CashVariance,
		&shift.TotalSalesCount, &shift.TotalSalesAmount, &shift.Status, &shift.Notes,
	)
	if err != nil {
		return nil, fmt.Errorf("shift not found: %w", err)
	}

	if endedAt.Valid {
		shift.EndedAt = &endedAt.Time
	}

	var cashSales, mobileMoneySales, totalDiscounts float64
	query := `
		SELECT
			COALESCE(SUM(CASE WHEN payment_method = 'Cash' THEN total_amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN payment_method != 'Cash' THEN total_amount ELSE 0 END), 0),
			COALESCE(SUM(discount_amount), 0)
		FROM sales
		WHERE shift_id = ?
	`
	_ = s.db.QueryRow(query, shiftID).Scan(&cashSales, &mobileMoneySales, &totalDiscounts)

	grossSales := cashSales + mobileMoneySales
	expectedDrawer := shift.OpeningCash + cashSales

	return &models.ShiftZReport{
		Shift:           shift,
		CashSalesTotal:  cashSales,
		GrossSalesTotal: grossSales,
		TotalDiscounts:  totalDiscounts,
		NetSalesTotal:   grossSales,
		ExpectedDrawer:  expectedDrawer,
		ActualDrawer:    shift.ActualCash,
		CashVariance:    shift.CashVariance,
		PrintedAt:       time.Now(),
	}, nil
}
