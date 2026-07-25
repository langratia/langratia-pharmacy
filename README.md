# Langratia Pharmacy POS — Code Audit

**Date:** 2026-07-25
**Scope:** Full-stack review — Go backend (Wails v2), React/TypeScript frontend, SQLite database.

---

## Critical / Security

| # | Issue | File(s) |
|---|-------|---------|
| 1 | **No server-side authorization.** Wails IPC methods accept `userID`/`username` as parameters but never verify the caller. Any frontend JS can invoke admin APIs. `ResetAndSeedDatabase()` has zero access control. | `app.go`, all services |
| 2 | **Hardcoded default password `admin123`** printed in the login page UI and hardcoded in 3 Go files. No password change flow exists. | `LoginPage.tsx`, `db.go`, `seeder.go` |
| 3 | **Sensitive user data in localStorage.** Full user object (role, id) stored in plaintext. | `AuthContext.tsx` |
| 4 | **Path traversal in `ExportDatabase`.** `destPath` is user-supplied with no sanitization. | `backup_service.go` |
| 5 | **Dev-mode auth bypass.** Hardcoded admin/cashier fallback in `AuthContext.tsx` lets anyone log in when Wails IPC is unavailable. | `AuthContext.tsx:37-60` |

## Data Integrity & Logic

| # | Issue | File(s) |
|---|-------|---------|
| 6 | **`UpdateMedicine` omits `current_stock`.** The SQL UPDATE only changes metadata fields, but the frontend form lets users edit stock directly — changes silently lost. | `medicine_service.go`, `InventoryPage.tsx` |
| 7 | **`RecordPurchase` overwrites `buying_price`** on the medicine record globally on every purchase, even when batches arrive at different prices. | `purchase_service.go:130` |
| 8 | **`AdjustStock` sign convention is ambiguous.** Positive `qtyAdjusted` adds stock even for "Damaged"/"Expired" reasons. No validation enforces sign correctness. | `batch_service.go` |
| 9 | **Backup/Restore not thread-safe.** `RestoreDatabase` replaces `s.db.DB` with no mutex — other goroutines hold stale references. | `backup_service.go` |
| 10 | **`rows.Err()` never checked** after any `rows.Next()` loop across the entire backend. | All services |

## Code Quality

| # | Issue | File(s) |
|---|-------|---------|
| 11 | **`logAction()` duplicated** in every service (8 identical copies). | All services |
| 12 | **`(window as any)?.go?.main?.App` fallback repeated** in every feature page. | All feature pages |
| 13 | **No typed Wails bindings used consistently.** Generated `wailsjs/go/main/App` imports exist but are mixed with raw `window.go` casts. | Frontend |
| 14 | **`ResetAndSeedDatabase` disables foreign keys** during truncation — partial seed failure leaves inconsistent data. | `seeder.go` |
| 15 | **DIY CSV parser** uses `split(',')` — breaks on quoted commas, no malformed row handling. | `InventoryPage.tsx` |

## Inconsistencies

| # | Issue | File(s) |
|---|-------|---------|
| 16 | **Date handling mismatch.** `notification_service` uses `DATE('now', '+60 days')` (SQLite UTC) while `report_service` and `batch_service` use `time.Now().AddDate()` (Go local time). | `notification_service.go`, `report_service.go`, `batch_service.go` |
| 17 | **Two different "low stock" definitions.** `report_service.go` excludes zero-stock items (`> 0`); `notification_service.go` includes them (`<=`). | `report_service.go`, `notification_service.go` |

## Frontend-Specific

| # | Issue | File(s) |
|---|-------|---------|
| 18 | **No lint/typecheck scripts** in frontend `package.json`. Errors surface only at build time. | `package.json` |
| 19 | **Inline styles with JS event handlers** for focus/blur border color — should be CSS. | `LoginPage.tsx` |
| 20 | **Avatar utility makes external network call** to `ui-avatars.com` on every render. | `avatar.ts` |

## Test Gaps

| # | Issue |
|---|-------|
| 21 | No tests for `prescription_service.go`, `search_service.go`, `notification_service.go` |
| 22 | `seedBatchesAndPurchases` uses `rand.Intn` — non-deterministic test data. |

---

*Audit performed via manual codebase review on 2026-07-25.*
