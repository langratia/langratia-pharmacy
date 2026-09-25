package services

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"app/backend/db"
)

// Default embedded SECRET KEY used for offline license verification demonstration.
// Override in production via the LANGRATIA_LICENSE_SECRET_KEY environment variable.
const defaultSecretKey = "LANGRATIA_OFFLINE_SECRET_KEY_V1_2026"

func getSecretKey() string {
	if k := os.Getenv("LANGRATIA_LICENSE_SECRET_KEY"); k != "" {
		return k
	}
	return defaultSecretKey
}

type LicenseService struct {
	db *db.DB
}

func NewLicenseService(database *db.DB) *LicenseService {
	return &LicenseService{
		db: database,
	}
}

// getWindowsMachineID tries Windows Registry MachineGuid -> WMIC -> PowerShell CIM
func getWindowsMachineID() string {
	// Method 1: Windows Registry MachineGuid (Works on 99.9% of Windows 10, 11, 7, 8, Server)
	cmd := exec.Command("reg", "query", `HKLM\SOFTWARE\Microsoft\Cryptography`, "/v", "MachineGuid")
	hideWindow(cmd)
	out, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if strings.Contains(line, "MachineGuid") {
				parts := strings.Fields(line)
				if len(parts) >= 3 {
					guid := strings.TrimSpace(parts[len(parts)-1])
					if len(guid) >= 10 {
						return guid
					}
				}
			}
		}
	}

	// Method 2: WMIC csproduct
	cmd = exec.Command("cmd", "/c", "wmic csproduct get uuid")
	hideWindow(cmd)
	out, err = cmd.Output()
	if err == nil {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed != "" && !strings.EqualFold(trimmed, "uuid") {
				return trimmed
			}
		}
	}

	// Method 3: PowerShell CIM
	cmd = exec.Command("powershell", "-Command", "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID")
	hideWindow(cmd)
	out, err = cmd.Output()
	if err == nil {
		trimmed := strings.TrimSpace(string(out))
		if trimmed != "" {
			return trimmed
		}
	}

	return ""
}

func generateFallbackMachineID() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return "LANG-FALLBACK-8899-7766-5544"
	}
	h := sha256.Sum256(b)
	hexStr := strings.ToUpper(hex.EncodeToString(h[:]))
	return fmt.Sprintf("LANG-%s-%s-%s", hexStr[:4], hexStr[4:8], hexStr[8:12])
}

// GetMachineID retrieves a hardware-bound unique identifier with robust multi-platform fallbacks.
func (s *LicenseService) GetMachineID() (string, error) {
	var id string
	switch runtime.GOOS {
	case "windows":
		id = getWindowsMachineID()
	case "linux":
		cmd := exec.Command("cat", "/etc/machine-id")
		hideWindow(cmd)
		out, err := cmd.Output()
		if err != nil {
			cmd = exec.Command("cat", "/var/lib/dbus/machine-id")
			hideWindow(cmd)
			out, _ = cmd.Output()
		}
		id = strings.TrimSpace(string(out))
	case "darwin":
		cmd := exec.Command("sh", "-c", "ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID")
		hideWindow(cmd)
		out, err := cmd.Output()
		if err == nil {
			parts := strings.Split(strings.TrimSpace(string(out)), "\" = \"")
			if len(parts) == 2 {
				id = strings.Trim(parts[1], "\"")
			}
		}
	}

	// Validate hardware ID
	cleanID := strings.TrimSpace(id)
	if cleanID != "" && 
		cleanID != "00000000-0000-0000-0000-000000000000" && 
		cleanID != "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF" {
		return cleanID, nil
	}

	// Ultimate Fallback: Persistent UUID stored in system_config
	if s.db != nil {
		var fallbackID string
		err := s.db.QueryRow("SELECT value FROM system_config WHERE key = 'fallback_machine_id'").Scan(&fallbackID)
		if err == nil && strings.TrimSpace(fallbackID) != "" {
			return strings.TrimSpace(fallbackID), nil
		}

		newID := generateFallbackMachineID()
		s.db.Lock()
		s.db.Exec("INSERT INTO system_config (key, value) VALUES ('fallback_machine_id', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", newID)
		s.db.Unlock()
		return newID, nil
	}

	return "", errors.New("failed to retrieve or generate unique machine ID")
}

// GenerateLicense deterministically generates the 16-character license key for a given Machine ID.
func (s *LicenseService) GenerateLicense(machineID string) string {
	mac := hmac.New(sha256.New, []byte(getSecretKey()))
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
	
	// They could paste it with or without dashes, let me normalize both to without dashes for comparison
	expectedClean := strings.ReplaceAll(expectedKey, "-", "")
	inputClean := strings.ReplaceAll(cleanInput, "-", "")

	if inputClean != expectedClean {
		return errors.New("cryptographic verification failed: key does not match hardware")
	}

	return nil
}
