# Langratia Pharmacy POS

Offline-first pharmacy management system built with [Wails v2](https://wails.io) (Go 1.25 + React 19).

## Bug Fixes

### Critical
- **CreatePrescription argument order mismatch** — Frontend was passing `patientName, patientPhone, patientAge, doctorName...` instead of the Go binding's expected order `userID, username, patientName, patientAge, patientPhone, doctorName, doctorContact, notes, items`. Caused runtime failures with wrong userID and misplaced data.
- **AddStockPurchase → RecordPurchase** — Purchases page called a non-existent Wails binding `AddStockPurchase`. The actual Go binding is `RecordPurchase` with a different argument order (`invoiceNumber, supplierID, items, notes, userID, username`). Caused silent failures or crashes when creating purchase orders.

### High
- **Google Fonts network dependency** — `index.css` imported Inter font via `@import url(...)` from Google Fonts, which fails when offline. Replaced with `@fontsource/inter` self-hosted package bundled by Vite.
- **Remote avatar API dependency** — `getUserAvatarUrl()` hit `ui-avatars.com` for user initials avatars. Replaced with inline SVG data URI generation that runs entirely offline.
- **POS payment method hardcoded to Cash** — `paymentMethod` state variable was declared (supporting `cash`, `card`, `momo`) but never wired into the `ProcessSale` call — `'Cash'` was always hardcoded. Added payment selector UI and wired state to the sale.
- **User hard-delete** — `DeactivateUser` ran `DELETE FROM users` which destroyed referential integrity for related sales, prescriptions, etc. Changed to soft-delete (`SET active = 0`) with migration v1 adding the column, and updated login/list queries to filter active users only.

### Medium
- **Low stock notification includes zero-stock items** — Notification query used `current_stock <= reorder_level` without excluding items at zero stock. Added `AND current_stock > 0`.
- **OOS items added via card click in POS** — The product card wrapper `onClick` was not gated by `isOutOfStock`, allowing users to add out-of-stock items by clicking the card body even though the ADD button was disabled.
- **'Expiring Batches' filter meaningless** — The inventory filter just checked `current_stock > 0` which had nothing to do with expiry. Now uses `GetExpiringBatches(60)` backend API to filter medicines with batches expiring within 60 days.

### Low
- **Unused imports** — Removed 7 unused imports across 5 frontend files.
