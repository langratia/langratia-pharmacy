# Offline Pharmacy Management System

We are developing an offline desktop-based pharmacy management system focused on inventory management and medicine sales for pharmacies in Uganda. Our system operates entirely offline, ensuring fast startup and data safety during power outages.

---

## ⚙️ Software Requirements Specification (SRS)

### 1. Dashboard
We provide a visual overview of the pharmacy's operational status.
*   **Sales Today**: Total monetary value of transactions completed today.
*   **Total Medicines in Stock**: Total active medicines in the system.
*   **Low Stock Medicines**: Total medicines with stock at or below their reorder level.
*   **Out of Stock Medicines**: Total medicines with zero stock.
*   **Medicines Expiring Soon**: Total medicines expiring within the next 90 days.
*   **Recent Sales**: List of recent sales transactions.
*   **Recent Purchases**: List of recent incoming stock purchases.

### 2. Medicine Management
We maintain a registry of all pharmaceutical products stocked by the pharmacy.
*   **Stored Fields**:
    *   Medicine Name
    *   Generic Name
    *   Brand Name
    *   Category
    *   Dosage/Strength
    *   Medicine Form
    *   Pack Size
    *   Buying Price
    *   Selling Price
    *   Current Stock
    *   Reorder Level
    *   Manufacturer
    *   Description
*   **Required Functions**:
    *   Add medicine records.
    *   Edit medicine records.
    *   Archive medicine records instead of deleting to preserve sales history.
    *   View medicine details.
    *   Search medicines by name, generic name, or brand name.

### 3. Batch Management
We track medicine quantities at the batch level to ensure accurate pricing and expiry tracking.
*   **Stored Fields**:
    *   Batch Number
    *   Medicine
    *   Quantity Received
    *   Buying Price
    *   Manufacturing Date
    *   Expiry Date
    *   Supplier
    *   Date Received
*   **System Behaviour**:
    *   Maintain stock levels automatically per batch.
    *   Deduct stock from the batch with the earliest expiry date first (First Expiry First Out - FEFO).
    *   Display all available batches for each medicine.

### 4. Supplier Management
We manage supplier contact information for inventory purchasing.
*   **Stored Fields**:
    *   Supplier Name
    *   Contact Person
    *   Phone Number
    *   Email Address
    *   Physical Address
*   **Required Functions**:
    *   Add suppliers.
    *   Edit suppliers.
    *   View purchase history for each supplier.

### 5. Stock Receiving (Purchases)
We record incoming stock shipments to update our inventory.
*   **Stored Fields**:
    *   Purchase Date
    *   Supplier
    *   Invoice Number
    *   Medicine
    *   Batch Number
    *   Quantity
    *   Buying Price
    *   Manufacturing Date
    *   Expiry Date
*   **System Behaviour**:
    *   Increase medicine stock levels automatically.
    *   Create a new batch record.
    *   Update the overall medicine stock count.

### 6. Stock Adjustment
We enable manual correction of stock quantities to resolve inventory discrepancies.
*   **Standard Reasons**: Damaged Medicines, Expired Medicines, Lost Medicines, Counting Errors.
*   **Stored Fields**:
    *   Medicine
    *   Batch
    *   Quantity Adjusted
    *   Reason
    *   Date
    *   Notes
*   **System Behaviour**:
    *   Record every stock adjustment to maintain audit logs.

### 7. Point of Sale (POS)
We provide a checkout interface to record sales transactions.
*   **Required Functions**:
    *   Search medicines by name.
    *   Select medicine for purchase.
    *   Enter quantity to sell.
    *   Calculate total price automatically.
    *   Complete sale transaction.
    *   Deduct batch stock using the earliest expiry date first.
*   **Sales Record Fields**:
    *   Invoice Number
    *   Date
    *   Medicine Sold
    *   Quantity
    *   Selling Price
    *   Total Amount
    *   User Who Made the Sale

### 8. Low Stock Monitoring
We continuously track inventory quantities to prevent stockouts.
*   **Required Functions**:
    *   Highlight medicines that are below their reorder level.
    *   List out-of-stock medicines.
    *   Display stock warnings on the dashboard.

### 9. Expiry Monitoring
We monitor medicine expiration dates to prevent the sale of expired products.
*   **Required Tiers**:
    *   Medicines expiring within 90 days.
    *   Medicines expiring within 60 days.
    *   Medicines expiring within 30 days.
    *   Expired medicines.
*   **System Behaviour**:
    *   Highlight expired medicines in red.
    *   Block sales of expired medicine batches.

### 10. Reports
We generate printable reports for inventory and sales analysis.
*   **Sales Reports**: Daily Sales, Weekly Sales, Monthly Sales, Sales by Medicine.
*   **Inventory Reports**: Current Stock Report, Low Stock Report, Out-of-Stock Report, Expiry Report, Batch Report.
*   **Purchase Reports**: Purchase History, Purchases by Supplier.

### 11. User Management & Permissions
We support two user profiles to control system access:

| Feature / Permission | Admin or Manager | Cashier |
| :--- | :---: | :---: |
| Full system settings & user configuration | ✅ | ❌ |
| View sales, inventory, and purchase reports | ✅ | ❌ |
| Manage medicines, suppliers, and batches | ✅ | ❌ |
| Record purchases & perform stock adjustments | ✅ | ❌ |
| Access POS interface and check stock | ✅ | ✅ |
| Search medicines and record sales | ✅ | ✅ |

### 12. Audit Log
We track modifications in the system to maintain security and accountability.
*   **Tracked Actions**: Medicine added, Medicine edited, Stock adjustment, Purchase recorded, Sale completed.
*   **Logged Fields**:
    *   User
    *   Action
    *   Date
    *   Time

### 13. Offline Database
We run the system entirely locally.
*   **Requirements**:
    *   Local database stored on the host computer.
    *   No internet connection required.
    *   Fast startup and operation.
    *   Immediate data persistence to prevent loss during power outages.

### 14. Backup & Restore
We provide recovery mechanisms for offline data.
*   **Required Functions**:
    *   Manual database backup.
    *   Database restoration from a backup file.
    *   Backup to a selected local folder or external drive.

---

## 🏗️ Technology Stack
*   **Desktop Framework:** Wails (compiles to a single lightweight desktop executable).
*   **Backend / Core Logic:** Go (Golang).
*   **Frontend UI:** React.
*   **Database:** SQLite (local database file).

---

## 🧠 System Edge Cases & Solutions
To ensure the system remains simple, robust, and tailored for our use case, we have defined optimal solutions for the following:
*   **Authentication & Login:** The system uses a simple local login screen. Passwords are securely hashed. A default Admin user is created on the first launch, and a local reset script/flag is provided in case the Admin forgets their password offline.
*   **Pricing Logic (Batch vs. Selling Price):** The "Selling Price" is set manually by the Manager. If a new batch arrives with a higher "Buying Price", the system does not auto-change the selling price; instead, it creates a Dashboard notification alerting the Manager to review and adjust it manually.
*   **Currency Formatting:** Since the target market is exclusively Uganda, the system formats all monetary values as UGX directly in the frontend to keep V1.0 simple.
*   **Returns & Refunds:** Direct POS refunds are excluded from V1.0 to keep the checkout fast. If a customer returns medicine, the Manager will use the **Stock Adjustment** module with the reason "Customer Return".
*   **Reports Export Format:** The system uses native browser Print-to-PDF capabilities to generate reports, allowing the user to print directly or save as a PDF instantly.

---

## 🎨 Brand Guidelines & UI
To ensure a professional, medical feel that is warm and not overly bright or dark, we will use the following color palette for the frontend UI:
*   **Primary:** `#1A9D8B` (Emerald Teal)
*   **Secondary:** `#0F766E` (Deep Teal)
*   **Accent:** `#21B39B` (Mint Teal)
*   **Dark (Text/Icons):** `#1E293B` (Charcoal Navy)
*   **Background:** `#F8FAFC` (Soft White)

---

## 🛠️ Project Phase & Next Steps
1.  **Initialize Project:** Run `wails init` to scaffold the Go and React application.
2.  **Database Design**: Model database schemas for `users`, `medicines`, `batches`, `suppliers`, `sales`, `purchases`, `adjustments`, and `audit_logs`.
3.  **UI Mockups**: Outline the main navigation views (Dashboard, Inventory, POS, Suppliers, Reports, Admin Panel).
