package services

import (
	"app/backend/db"
	"app/backend/models"
)

type ConfigService struct {
	db *db.DB
}

func NewConfigService(database *db.DB) *ConfigService {
	return &ConfigService{db: database}
}

func (s *ConfigService) GetConfig() (*models.PharmacyConfig, error) {
	cfg := &models.PharmacyConfig{}
	err := s.db.QueryRow(`
		SELECT pharmacy_name, logo, address, phone, email,
		       license_number, registration_number, tax_number,
		       operating_hours, currency, date_format, time_format,
		       receipt_format, invoice_format,
		       default_tax, default_discount,
		       low_stock_threshold, expiry_warning_days,
		       return_rules, numbering_formats
		FROM pharmacy_config WHERE id = 1
	`).Scan(
		&cfg.PharmacyName, &cfg.Logo, &cfg.Address, &cfg.Phone, &cfg.Email,
		&cfg.LicenseNumber, &cfg.RegistrationNumber, &cfg.TaxNumber,
		&cfg.OperatingHours, &cfg.Currency, &cfg.DateFormat, &cfg.TimeFormat,
		&cfg.ReceiptFormat, &cfg.InvoiceFormat,
		&cfg.DefaultTax, &cfg.DefaultDiscount,
		&cfg.LowStockThreshold, &cfg.ExpiryWarningDays,
		&cfg.ReturnRules, &cfg.NumberingFormats,
	)
	if err != nil {
		return nil, err
	}
	return cfg, nil
}

func (s *ConfigService) UpdateConfig(cfg *models.PharmacyConfig) error {
	_, err := s.db.Exec(`
		UPDATE pharmacy_config SET
			pharmacy_name = ?, logo = ?, address = ?, phone = ?, email = ?,
			license_number = ?, registration_number = ?, tax_number = ?,
			operating_hours = ?, currency = ?, date_format = ?, time_format = ?,
			receipt_format = ?, invoice_format = ?,
			default_tax = ?, default_discount = ?,
			low_stock_threshold = ?, expiry_warning_days = ?,
			return_rules = ?, numbering_formats = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = 1
	`,
		cfg.PharmacyName, cfg.Logo, cfg.Address, cfg.Phone, cfg.Email,
		cfg.LicenseNumber, cfg.RegistrationNumber, cfg.TaxNumber,
		cfg.OperatingHours, cfg.Currency, cfg.DateFormat, cfg.TimeFormat,
		cfg.ReceiptFormat, cfg.InvoiceFormat,
		cfg.DefaultTax, cfg.DefaultDiscount,
		cfg.LowStockThreshold, cfg.ExpiryWarningDays,
		cfg.ReturnRules, cfg.NumberingFormats,
	)
	return err
}
