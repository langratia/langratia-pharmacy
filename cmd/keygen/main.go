package main

import (
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"os"
)

// Sample/Demo Private Key for development and local testing.
// In production deployments, provide your own private key via the LANGRATIA_LICENSE_PRIVATE_KEY
// environment variable or pass a path to a PEM key file.
const samplePrivateKeyPEM = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIHoIiOROCslFbcxv/GCJaLsb9sRE7ewUj6NsEAKXJoUcoAoGCCqGSM49
AwEHoUQDQgAEpg5rCaweIpTDA9f99kuecSr/A90RSdd0zihmLsX9sMvWSo+MNgkf
exh2uHfjQ98ynFFot38PFcI+IPA/Q0JjBA==
-----END EC PRIVATE KEY-----`

type LicensePayload struct {
	MachineID string `json:"machine_id"`
	Signature string `json:"signature"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <Customer-Machine-ID> [optional-path-to-private-key.pem]")
		os.Exit(1)
	}

	customerMachineID := os.Args[1]

	// 1. Load Private Key (from file argument, environment variable, or fallback sample)
	pemData := []byte(samplePrivateKeyPEM)
	if len(os.Args) >= 3 {
		fileBytes, err := os.ReadFile(os.Args[2])
		if err != nil {
			fmt.Printf("Error reading key file %s: %v\n", os.Args[2], err)
			os.Exit(1)
		}
		pemData = fileBytes
	} else if envKey := os.Getenv("LANGRATIA_LICENSE_PRIVATE_KEY"); envKey != "" {
		pemData = []byte(envKey)
	}

	block, _ := pem.Decode(pemData)
	if block == nil {
		panic("failed to parse PEM block containing the private key")
	}
	privKey, err := x509.ParseECPrivateKey(block.Bytes)
	if err != nil {
		panic("failed to parse DER encoded private key: " + err.Error())
	}

	// 2. Hash the Machine ID
	hash := sha256.Sum256([]byte(customerMachineID))

	// 3. Sign the Hash
	sigBytes, err := ecdsa.SignASN1(rand.Reader, privKey, hash[:])
	if err != nil {
		panic("failed to sign data: " + err.Error())
	}

	// 4. Construct Payload
	payload := LicensePayload{
		MachineID: customerMachineID,
		Signature: base64.StdEncoding.EncodeToString(sigBytes),
	}

	// 5. JSON encode and base64 for final License Key
	payloadJSON, _ := json.Marshal(payload)
	finalLicenseKey := base64.StdEncoding.EncodeToString(payloadJSON)

	fmt.Println("=======================================================")
	fmt.Println(finalLicenseKey)
	fmt.Println("=======================================================")
}
