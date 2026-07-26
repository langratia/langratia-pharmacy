package services

import (
	"fmt"
	"strings"

	"app/backend/db"
	"app/backend/models"
)

type SearchService struct {
	db *db.DB
}

func NewSearchService(database *db.DB) *SearchService {
	return &SearchService{db: database}
}

func EscapeLike(s string) string {
	return strings.NewReplacer(`%`, `\%`, `_`, `\_`, `\`, `\\`).Replace(s)
}

func (s *SearchService) GlobalSearch(query string, userRole string) ([]models.SearchResultItem, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []models.SearchResultItem{}, nil
	}

	searchTerm := "%" + EscapeLike(query) + "%"
	var results []models.SearchResultItem

	// 1. Search Medicines (Available to all roles)
	medQuery := `
		SELECT id, name, generic_name, current_stock, selling_price 
		FROM medicines 
		WHERE is_archived = 0 AND (name LIKE ? OR generic_name LIKE ? OR category LIKE ?)
		LIMIT 5`
	rows, err := s.db.Query(medQuery, searchTerm, searchTerm, searchTerm)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id int64
			var name, genName string
			var stock int
			var price float64
			if err := rows.Scan(&id, &name, &genName, &stock, &price); err == nil {
				subtitle := fmt.Sprintf("Stock: %d | UGX %.2f", stock, price)
				if genName != "" {
					subtitle = fmt.Sprintf("%s | Stock: %d | UGX %.2f", genName, stock, price)
				}
				results = append(results, models.SearchResultItem{
					ID:         id,
					Category:   "Medicine",
					Title:      name,
					Subtitle:   subtitle,
					TargetView: "inventory",
				})
			}
		}
	}

	// 2. Search Prescriptions (Available to all roles)
	rxQuery := `
		SELECT id, prescription_number, patient_name, doctor_name, status 
		FROM prescriptions 
		WHERE prescription_number LIKE ? OR patient_name LIKE ? OR doctor_name LIKE ?
		LIMIT 5`
	rxRows, err := s.db.Query(rxQuery, searchTerm, searchTerm, searchTerm)
	if err == nil {
		defer rxRows.Close()
		for rxRows.Next() {
			var id int64
			var rxNum, patient, doctor, status string
			if err := rxRows.Scan(&id, &rxNum, &patient, &doctor, &status); err == nil {
				results = append(results, models.SearchResultItem{
					ID:         id,
					Category:   "Prescription",
					Title:      fmt.Sprintf("%s - %s", rxNum, patient),
					Subtitle:   fmt.Sprintf("Dr. %s | Status: %s", doctor, status),
					TargetView: "prescriptions",
				})
			}
		}
	}

	// 3. Search Sales Invoices (Available to all roles)
	saleQuery := `
		SELECT id, invoice_number, total_amount, payment_method, sale_date 
		FROM sales 
		WHERE invoice_number LIKE ?
		LIMIT 5`
	saleRows, err := s.db.Query(saleQuery, searchTerm)
	if err == nil {
		defer saleRows.Close()
		for saleRows.Next() {
			var id int64
			var invNum, payMethod, saleDate string
			var total float64
			if err := saleRows.Scan(&id, &invNum, &total, &payMethod, &saleDate); err == nil {
				results = append(results, models.SearchResultItem{
					ID:         id,
					Category:   "Sale Invoice",
					Title:      invNum,
					Subtitle:   fmt.Sprintf("UGX %.2f (%s) - %s", total, payMethod, saleDate),
					TargetView: "pos",
				})
			}
		}
	}

	// 4. Search Suppliers (Admin only)
	if strings.ToLower(userRole) == "admin" {
		supQuery := `
			SELECT id, name, contact_person, phone 
			FROM suppliers 
			WHERE name LIKE ? OR contact_person LIKE ? OR phone LIKE ?
			LIMIT 5`
		supRows, err := s.db.Query(supQuery, searchTerm, searchTerm, searchTerm)
		if err == nil {
			defer supRows.Close()
			for supRows.Next() {
				var id int64
				var name, contact, phone string
				if err := supRows.Scan(&id, &name, &contact, &phone); err == nil {
					results = append(results, models.SearchResultItem{
						ID:         id,
						Category:   "Supplier",
						Title:      name,
						Subtitle:   fmt.Sprintf("Contact: %s (%s)", contact, phone),
						TargetView: "suppliers",
					})
				}
			}
		}
	}

	return results, nil
}
