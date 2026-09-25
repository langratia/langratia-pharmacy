# Security Policy

## Supported Versions

We provide security updates and patches for the following versions of **Langratia Pharmacy POS**:

| Version | Supported          |
| ------- | ------------------ |
| 2.7.x   | :white_check_mark: |
| < 2.7   | :x:                |

---

## Reporting a Vulnerability

The security of pharmaceutical operations, patient dispensing records, and financial transaction integrity is paramount. If you discover a security vulnerability or potential threat within Langratia Pharmacy POS, please report it responsibly.

### How to Report
- **Do not open a public GitHub issue** for undisclosed security vulnerabilities.
- Submit a security advisory via [GitHub Security Advisories](https://github.com/allaninfo-comp/langratia-pharmacy/security/advisories/new).
- Alternatively, email details directly to: `allan.info.comp@gmail.com` with the subject tag `[SECURITY] Langratia POS`.

### What to Include in Your Report
1. A detailed description of the vulnerability.
2. Steps to reproduce the vulnerability (proof of concept or script).
3. The affected component (`backend/api`, `services/auth_service.go`, network RPC, etc.).
4. Any potential mitigations you may have identified.

### Response Timeline
- **Initial Acknowledgement**: Within 48 hours.
- **Triage & Verification**: Within 5 business days.
- **Patch & Advisory Release**: Coordinated with the reporter prior to public disclosure.

---

## Network & Local Deployment Security Notes

- **Host/Client LAN Communication**: When running in Host mode on local area networks, ensure your Wi-Fi or Ethernet switches use trusted WPA3/WPA2 Enterprise or segmented VLAN networks to protect JSON-RPC traffic.
- **Database Storage**: The SQLite database file resides locally in the application data directory. Ensure file-level operating system permissions restrict unauthorized user account access.
