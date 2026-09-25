# Langratia Pharmacy POS — Developer Documentation

Welcome to the internal engineering and architectural documentation for **Langratia Pharmacy POS**. This directory contains detailed guides covering every tier of the application, from low-level SQLite concurrency to React 19 UI patterns and LAN JSON-RPC networking.

---

## 📑 Documentation Index

### Core Architecture & Lifecycle
1. [**Project Architecture Summary**](codebase-analysis/PROJECT_ARCHITECTURE_SUMMARY.md) — Executive architectural summary, high-level decisions, and non-negotiable developer rules.
2. [**01. Architecture Overview**](codebase-analysis/01_architecture_overview.md) — System topology, Wails integration, and high-level component diagrams.
3. [**02. Folder Structure**](codebase-analysis/02_folder_structure.md) — Comprehensive breakdown of every directory and file in the codebase.
4. [**03. Application Lifecycle**](codebase-analysis/03_application_lifecycle.md) — Wails lifecycle hooks (`startup`, `shutdown`, context binding).
5. [**04. Startup & Shutdown Flow**](codebase-analysis/04_startup_shutdown_flow.md) — Step-by-step sequence diagram for initialization and graceful teardown.

### Frontend Layer
6. [**05. Frontend Architecture**](codebase-analysis/05_frontend_architecture.md) — React 19 component structure, state management via React Context, styling tokens, and Wails JS bindings.
7. [**17. UI / UX Analysis**](codebase-analysis/17_ui_ux_analysis.md) — Design system, keyboard navigation in POS, theme tokens, and accessibility considerations.

### Backend & Service Layer
8. [**06. Backend Architecture**](codebase-analysis/06_backend_architecture.md) — Go backend architecture and service encapsulation patterns.
9. [**07. Service Layer**](codebase-analysis/07_service_layer.md) — Deep dive into domain services (`AuthService`, `MedicineService`, `BatchService`, `SalesService`, `ReportService`, `BackupService`).
10. [**08. Database Schema & Migrations**](codebase-analysis/08_database_schema.md) — SQLite schema design, relational models, indexing, and migration runner.
11. [**09. Data Flow**](codebase-analysis/09_data_flow.md) — End-to-end data lifecycle from UI event $\rightarrow$ IPC $\rightarrow$ Service $\rightarrow$ SQLite.

### Networking & Distributed Multi-Till
12. [**10. Network & RPC Architecture**](codebase-analysis/10_network_rpc_architecture.md) — Host/Client LAN communication, UDP auto-discovery beacons, and reflection-based JSON-RPC engine.

### Security, Reliability & Performance
13. [**11. Security Analysis**](codebase-analysis/11_security_analysis.md) — RBAC enforcement, password hashing with bcrypt, input sanitization, and hardware licensing.
14. [**12. Error Handling**](codebase-analysis/12_error_handling.md) — Structured error wrapping, error propagation over IPC, and frontend toast notifications.
15. [**13. Logging Strategy**](codebase-analysis/13_logging_strategy.md) — Application log formatting, audit logging tables, and file rotation.
16. [**14. Threading & Concurrency**](codebase-analysis/14_threading_and_concurrency.md) — Mutex locks, goroutine safety, and SQLite WAL concurrency control.
17. [**15. Background Tasks**](codebase-analysis/15_background_tasks.md) — Periodic auto-backups, UDP beacon broadcasting, and background worker threads.
18. [**16. Performance Analysis**](codebase-analysis/16_performance_analysis.md) — Memory footprint, startup latency, query optimization, and IPC benchmark metrics.

### Operations, Testing & Roadmap
19. [**18. Deployment & Packaging**](codebase-analysis/18_deployment_packaging.md) — Packaging native Windows executables, NSIS setup wizards, and GitHub Actions release pipelines.
20. [**19. Testing Strategy**](codebase-analysis/19_testing_strategy.md) — Unit testing, concurrency stress testing, and frontend testing best practices.
21. [**20. Technical Debt & Recommendations**](codebase-analysis/20_technical_debt_and_recommendations.md) — Known bottlenecks, security hardening suggestions, and future roadmap items.

---

## 🛠️ Key Architectural Invariants

When contributing code to Langratia Pharmacy POS, remember these core rules:
- **Never bypass the Service layer**: `app.go` methods must delegate to domain services in `backend/services/`.
- **Maintain LAN RPC parity**: Every IPC method exposed to the frontend in `app.go` must handle remote client redirection when `a.apiURL != ""`.
- **Atomic Database Operations**: Use transactions (`tx.Begin()`) when mutating multiple relational tables (e.g., checkout deducting batches and creating sale receipts).
