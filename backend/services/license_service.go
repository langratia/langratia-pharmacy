package services

import (
	"crypto/ecdsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"app/backend/db"
)

// The embedded PUBLIC KEY used to verify licenses mathematically.
// The private key is strictly kept off the customer's machine.
const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEpg5rCaweIpTDA9f99kuecSr/A90R
Sdd0zihmLsX9sMvWSo+MNgkfexh2uHfjQ98ynFFot38PFcI+IPA/Q0JjBA==
-----END PUBLIC KEY-----`

type LicensePayload struct {
	MachineID string `json:"machine_id"`
	Signature string `json:"signature"`
}

type LicenseService struct {
	db *db.DB
	publicKey *ecdsa.PublicKey
}

func NewLicenseService(database *db.DB) *LicenseService {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		panic("failed to parse PEM block containing the public key")
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		panic("failed to parse DER encoded public key: " + err.Error())
	}
	ecdsaPub, ok := pub.(*ecdsa.PublicKey)
	if !ok {
		panic("public key is not ECDSA")
	}

	return &LicenseService{
		db: database,
		publicKey: ecdsaPub,
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
		// Fallback for Linux if /etc/machine-id isn't present
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
		// Clean up macOS output to just the UUID string
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

// ActivateLicense takes the base64 JSON payload, verifies it, and saves it.
func (s *LicenseService) ActivateLicense(licenseKey string) error {
	err := s.verifyStrict(licenseKey)
	if err != nil {
		return fmt.Errorf("invalid license: %w", err)
	}

	// Save to database
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
	// 1. Decode base64
	decodedBytes, err := base64.StdEncoding.DecodeString(licenseKey)
	if err != nil {
		return errors.New("malformed license format")
	}

	// 2. Parse JSON
	var payload LicensePayload
	if err := json.Unmarshal(decodedBytes, &payload); err != nil {
		return errors.New("invalid license payload")
	}

	// 3. Verify hardware match
	actualID, err := s.GetMachineID()
	if err != nil {
		return fmt.Errorf("could not verify hardware: %w", err)
	}
	if payload.MachineID != actualID {
		return errors.New("machine ID mismatch. This license is tied to different hardware.")
	}

	// 4. Verify Signature
	sigBytes, err := base64.StdEncoding.DecodeString(payload.Signature)
	if err != nil {
		return errors.New("invalid signature format")
	}

	hash := sha256.Sum256([]byte(payload.MachineID))
	valid := ecdsa.VerifyASN1(s.publicKey, hash[:], sigBytes)
	if !valid {
		return errors.New("cryptographic signature verification failed")
	}

	return nil
}
