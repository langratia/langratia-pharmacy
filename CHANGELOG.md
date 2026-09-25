# Changelog

All notable changes to the **Langratia Pharmacy POS** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.9.0] - 2026-08-08

### Added
- **Itemized Sales Audit Log**: Dedicated sales audit view showing independent sale transactions with cashier identity, catalog vs actual sold prices, and price variances.
- **Price Variance Monitoring**: Visual badges and reporting metrics for premium (+20%) and discounted transactions in Sales Reports.
- **Visual Discount Tags**: Strike-through regular pricing and discount percentage tags on POS checkout items.
- **Custom Unit Price Override**: Granular per-item price modification capability with role-based audit tracking.
- **Medicine Deletion & Archival**: Safe soft-deletion for discontinued pharmaceutical items with full audit trail.
- **CSV Template Download**: One-click download for batch medicine import spreadsheets.

---

## [2.8.0] - 2026-08-07

### Added
- **Fail-Proof Machine ID Resolution**: Multi-tiered Windows hardware UUID extraction with persistent fallback for virtualized environments.
- **Glowing Segmented License UI**: Visual feedback and animated glowing indicator for license verification.
- **Production Clean Install Mode**: "Wipe Sample Data" utility in Settings to reset inventory and transactions while preserving company config.

---

## [2.7.0] - 2026-08-07

### Added
- **Global Search Enhancements**: Enlarged global search modal with enhanced keyboard navigation (`Up`/`Down`/`Enter`), backdrop blur, and visual result indicators.
- **Enhanced POS Search**: Faster item selection with instant price and batch availability tooltips.
- **Date Filtering**: Custom date range picker for financial reports, sales histories, and purchase tracking.

### Changed
- Refactored pharmacy setup tab to streamline onboarding by removing redundant input fields.
- Shortened generated invoice identifiers for thermal paper receipt compatibility.

### Fixed
- Fixed JSX tag syntax in Header navigation component.
- Corrected numeric input clamping for discount values and tender cash math.

---

## [2.6.0] - 2026-08-05

### Added
- **Segmented Hardware License UI**: Redesigned 16-character hardware activation dialog with auto-tabbing between 4-character input segments.
- **Automatic Text Capitalization**: Enforced auto-capitalization on batch numbers and patient prescription codes.
- **Line Total Calculations**: Real-time line item total feedback with discounts and unit factor conversions in the POS cart.

---

## [2.5.0] - 2026-08-04

### Added
- **Silent Hardware Detection**: Suppressed temporary PowerShell console popups during hardware UUID query on Windows 10/11.
- **Pre-seeded Admin Credential Initialization**: Added automated first-time setup detection and admin bootstrapping.

---

## [2.4.0] - 2026-07-26

### Added
- **Automated CI/CD Workflow**: GitHub Actions integration for compiling Windows native binaries and NSIS installers.
- **Multi-Workstation LAN Host/Client**: Reflection-based JSON-RPC server and UDP discovery engine for multi-till pharmacy operations.
- **Audit Logging**: Structured security event recording in SQLite with user attribution.
- **Prescription Tracking**: Patient and physician dispensing tracking module.

---

## [1.0.0] - Initial Release

- Initial release of Wails-powered Go + React Pharmacy Point of Sale.
- Core inventory management, SQLite database layer, and thermal receipt printing support.
