package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"app/backend/db"
)

// The embedded SECRET KEY used to verify licenses symmetrically.
const secretKey = "LANGRATIA_OFFLINE_SECRET_KEY_V1_2026"

type LicenseService struct {
	db *db.DB
}

func NewLicenseService(database *db.DB) *LicenseService {
	return &LicenseService{
		db: database,
	}
}

// GetMachineID retrieves a hardware-bound unique identifier.
func (s *LicenseService) GetMachineID() (string, error) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		// wmic is deprecated in newer Windows 11, but PowerShell CIM is reliable
		cmd = exec.Command("powershell", "-Command", "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID")
	case "linux":
		cmd = exec.Command("cat", "/etc/machine-id")
	case "darwin":
		cmd = exec.Command("sh", "-c", "ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID")
	default:
		return "", fmt.Errorf("unsupported platform")
	}

	hideWindow(cmd)

	out, err := cmd.Output()
	if err != nil {
		if runtime.GOOS == "linux" {
			out, err = exec.Command("cat", "/var/lib/dbus/machine-id").Output()
			if err != nil {
				return "", fmt.Errorf("failed to get machine id: %w", err)
			}
		} else {
			return "", fmt.Errorf("failed to get machine id: %w", err)
		}
	}

	id := strings.TrimSpace(string(out))
	if runtime.GOOS == "darwin" {
		parts := strings.Split(id, "\" = \"")
		if len(parts) == 2 {
			id = strings.Trim(parts[1], "\"")
		}
	}

	if id == "" {
		return "", errors.New("empty machine ID returned from OS")
	}

	return id, nil
}

// GenerateLicense deterministically generates the 16-character license key for a given Machine ID.
func (s *LicenseService) GenerateLicense(machineID string) string {
	mac := hmac.New(sha256.New, []byte(secretKey))
	mac.Write([]byte(machineID))
	hashBytes := mac.Sum(nil)
	hashHex := strings.ToUpper(hex.EncodeToString(hashBytes))
	
	// Take first 16 characters and format as XXXX-XXXX-XXXX-XXXX
	clean := hashHex[:16]
	return fmt.Sprintf("%s-%s-%s-%s", clean[0:4], clean[4:8], clean[8:12], clean[12:16])
}

// ActivateLicense takes the 16-character key, verifies it, and saves it.
func (s *LicenseService) ActivateLicense(licenseKey string) error {
	err := s.verifyStrict(licenseKey)
	if err != nil {
		return fmt.Errorf("invalid license: %w", err)
	}

	s.db.Lock()
	defer s.db.Unlock()
	_, err = s.db.Exec("INSERT INTO system_config (key, value) VALUES ('license_key', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", licenseKey)
	if err != nil {
		return fmt.Errorf("failed to save license: %w", err)
	}

	return nil
}

// VerifyLicense checks if the stored license matches the hardware.
func (s *LicenseService) VerifyLicense() error {
	var licenseKey string
	err := s.db.QueryRow("SELECT value FROM system_config WHERE key = 'license_key'").Scan(&licenseKey)
	if err != nil {
		return errors.New("no license key found. Application is locked.")
	}

	return s.verifyStrict(licenseKey)
}

func (s *LicenseService) verifyStrict(licenseKey string) error {
	actualID, err := s.GetMachineID()
	if err != nil {
		return fmt.Errorf("could not verify hardware: %w", err)
	}

	expectedKey := s.GenerateLicense(actualID)
	
	// Ensure comparison is clean of spaces
	cleanInput := strings.ReplaceAll(strings.TrimSpace(strings.ToUpper(licenseKey)), " ", "")
	
	// They could paste it with or without dashes, let's normalize both to without dashes for comparison
	expectedClean := strings.ReplaceAll(expectedKey, "-", "")
	inputClean := strings.ReplaceAll(cleanInput, "-", "")

	if inputClean != expectedClean {
		return errors.New("cryptographic verification failed: key does not match hardware")
	}

	return nil
}
