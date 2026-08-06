# Langratia Pharmacy POS: Service Layer

## Overview
The Service Layer encapsulates all the business logic and database interactions for the application. It resides within the `backend/services/` directory and follows a direct database access pattern, avoiding the complexity and overhead of an Object-Relational Mapper (ORM).

## Service Layer Pattern

### Structure
- Each entity or business domain has a dedicated service struct (e.g., `AuthService`, `MedicineService`, `SalesService`).
- A service struct holds a reference to the centralized database wrapper instance (`*db.DB`).
  ```go
  type MedicineService struct {
      db *db.DB
  }
  ```
- Services are instantiated during application startup in `app.go` and injected with the active database connection.

### Data Access Strategy
- **Raw SQL**: Services execute raw SQL queries using the standard `database/sql` library methods (`Query`, `QueryRow`, `Exec`).
- **No ORM**: By avoiding an ORM (like GORM), the application minimizes reflection overhead and maintains precise control over SQLite execution plans. This is a deliberate choice optimized for POS systems that might run on low-end hardware.
- **Transactions**: For complex operations that modify multiple tables simultaneously (e.g., `ProcessSale`), services utilize SQL transactions (`tx, err := s.db.Begin()`) to guarantee atomicity and data integrity.

## Subsystems & Dependencies

### 1. Autonomous Services
Many services operate independently and only require the base `db.DB` dependency to function.
- **`AuthService`**: Manages user authentication, password hashing, active sessions, and role-based access control.
- **`MedicineService`**: Handles the drug catalog, categories, and master data (CRUD operations).
- **`SupplierService`**: Manages vendor information.
- **`ReportService`**: Executes complex read-only analytical queries for sales, inventory, and expiry reports.

### 2. Composed Services
Certain complex business workflows require cross-service coordination. The pattern employed is constructor injection within `app.go`.
- **`PurchaseService`**: Requires `BatchService`. When receiving new inventory from a supplier, it must create a purchase record and concurrently generate new inventory batches.
  ```go
  a.purchaseService = services.NewPurchaseService(a.database, a.batchService)
  ```
- **`SalesService`**: Requires `BatchService`. When processing a customer sale, it relies on the batch service to automatically deduct stock from specific inventory batches using FIFO (First-In-First-Out) logic.

## Data Flow
1. The `App` boundary (in `app.go`) receives parameters from the React frontend (locally or via RPC).
2. The `App` method calls the corresponding method on the specific Service.
3. The Service enforces business rules (e.g., validating sufficient stock, checking user permissions).
4. The Service constructs and executes the raw SQL query.
5. The Service maps the `sql.Rows` output directly into strongly-typed Go structs defined in `backend/models/`.
6. The Service returns the domain model back to the `App` layer, which serializes it to JSON for the frontend.

## Potential Problems & Future Modification Risks

1. **Query Maintainability**: As the application grows, raw SQL queries embedded as string constants can become difficult to manage. Complex multi-line joins and dynamic query building (e.g., filtering search results by multiple optional parameters) can lead to verbose and repetitive boilerplate code.
2. **Circular Dependencies**: The architecture currently permits services to depend on one another. If, for example, `BatchService` eventually needs to invoke `SalesService` (perhaps for an automated refund logic), it will create a circular import or initialization loop in Go.
3. **Hardcoded Schema Definitions**: Any changes to the database schema (adding/removing columns) require manual, meticulous updates to the `SELECT` statements and `Scan` variable lists in every corresponding service method. Omitting a column in a `Scan` call will lead to runtime errors or silent data loss.
4. **Testing Complexity**: Thoroughly testing the service layer requires an actual SQLite database (either in-memory or on-disk). The lack of interfaces for the database or dependent services makes pure unit testing (using mocks) difficult. The existing `_test.go` files perform integration testing against a live database instance.
