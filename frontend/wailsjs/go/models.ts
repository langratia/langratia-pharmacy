export namespace main {
	
	export class NetworkStatus {
	    is_host: boolean;
	    db_path: string;
	
	    static createFrom(source: any = {}) {
	        return new NetworkStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.is_host = source["is_host"];
	        this.db_path = source["db_path"];
	    }
	}

}

export namespace models {
	
	export class AuditLog {
	    id: number;
	    user_id?: number;
	    username: string;
	    action: string;
	    details: string;
	    // Go type: time
	    timestamp: any;
	
	    static createFrom(source: any = {}) {
	        return new AuditLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.user_id = source["user_id"];
	        this.username = source["username"];
	        this.action = source["action"];
	        this.details = source["details"];
	        this.timestamp = this.convertValues(source["timestamp"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Batch {
	    id: number;
	    batch_number: string;
	    medicine_id: number;
	    medicine_name?: string;
	    supplier_id?: number;
	    supplier_name?: string;
	    quantity_received: number;
	    quantity_remaining: number;
	    buying_price: number;
	    mfg_date: string;
	    expiry_date: string;
	    // Go type: time
	    date_received: any;
	
	    static createFrom(source: any = {}) {
	        return new Batch(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.batch_number = source["batch_number"];
	        this.medicine_id = source["medicine_id"];
	        this.medicine_name = source["medicine_name"];
	        this.supplier_id = source["supplier_id"];
	        this.supplier_name = source["supplier_name"];
	        this.quantity_received = source["quantity_received"];
	        this.quantity_remaining = source["quantity_remaining"];
	        this.buying_price = source["buying_price"];
	        this.mfg_date = source["mfg_date"];
	        this.expiry_date = source["expiry_date"];
	        this.date_received = this.convertValues(source["date_received"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LoginHistory {
	    id: number;
	    user_id: number;
	    username: string;
	    action: string;
	    workstation: string;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new LoginHistory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.user_id = source["user_id"];
	        this.username = source["username"];
	        this.action = source["action"];
	        this.workstation = source["workstation"];
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Medicine {
	    id: number;
	    name: string;
	    generic_name: string;
	    brand_name: string;
	    barcode: string;
	    category: string;
	    dosage_strength: string;
	    medicine_form: string;
	    pack_size: string;
	    buying_price: number;
	    selling_price: number;
	    current_stock: number;
	    reorder_level: number;
	    manufacturer: string;
	    supplier_id?: number;
	    supplier_name?: string;
	    description: string;
	    tax_rate: number;
	    requires_prescription: boolean;
	    product_status: string;
	    is_archived: boolean;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Medicine(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.generic_name = source["generic_name"];
	        this.brand_name = source["brand_name"];
	        this.barcode = source["barcode"];
	        this.category = source["category"];
	        this.dosage_strength = source["dosage_strength"];
	        this.medicine_form = source["medicine_form"];
	        this.pack_size = source["pack_size"];
	        this.buying_price = source["buying_price"];
	        this.selling_price = source["selling_price"];
	        this.current_stock = source["current_stock"];
	        this.reorder_level = source["reorder_level"];
	        this.manufacturer = source["manufacturer"];
	        this.supplier_id = source["supplier_id"];
	        this.supplier_name = source["supplier_name"];
	        this.description = source["description"];
	        this.tax_rate = source["tax_rate"];
	        this.requires_prescription = source["requires_prescription"];
	        this.product_status = source["product_status"];
	        this.is_archived = source["is_archived"];
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class NotificationItem {
	    id: string;
	    type: string;
	    title: string;
	    message: string;
	    severity: string;
	    target: string;
	
	    static createFrom(source: any = {}) {
	        return new NotificationItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.title = source["title"];
	        this.message = source["message"];
	        this.severity = source["severity"];
	        this.target = source["target"];
	    }
	}
	export class NotificationSummary {
	    total_count: number;
	    low_stock_count: number;
	    expiring_count: number;
	    items: NotificationItem[];
	
	    static createFrom(source: any = {}) {
	        return new NotificationSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_count = source["total_count"];
	        this.low_stock_count = source["low_stock_count"];
	        this.expiring_count = source["expiring_count"];
	        this.items = this.convertValues(source["items"], NotificationItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PaginatedMedicines {
	    items: Medicine[];
	    total_count: number;
	    page: number;
	    page_size: number;
	
	    static createFrom(source: any = {}) {
	        return new PaginatedMedicines(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], Medicine);
	        this.total_count = source["total_count"];
	        this.page = source["page"];
	        this.page_size = source["page_size"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PurchaseItem {
	    id: number;
	    purchase_id: number;
	    medicine_id: number;
	    medicine_name?: string;
	    batch_id?: number;
	    batch_number?: string;
	    quantity: number;
	    buying_price: number;
	
	    static createFrom(source: any = {}) {
	        return new PurchaseItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.purchase_id = source["purchase_id"];
	        this.medicine_id = source["medicine_id"];
	        this.medicine_name = source["medicine_name"];
	        this.batch_id = source["batch_id"];
	        this.batch_number = source["batch_number"];
	        this.quantity = source["quantity"];
	        this.buying_price = source["buying_price"];
	    }
	}
	export class Purchase {
	    id: number;
	    invoice_number: string;
	    supplier_id?: number;
	    supplier_name?: string;
	    // Go type: time
	    purchase_date: any;
	    total_amount: number;
	    notes: string;
	    items?: PurchaseItem[];
	
	    static createFrom(source: any = {}) {
	        return new Purchase(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.invoice_number = source["invoice_number"];
	        this.supplier_id = source["supplier_id"];
	        this.supplier_name = source["supplier_name"];
	        this.purchase_date = this.convertValues(source["purchase_date"], null);
	        this.total_amount = source["total_amount"];
	        this.notes = source["notes"];
	        this.items = this.convertValues(source["items"], PurchaseItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PaginatedPurchases {
	    items: Purchase[];
	    total_count: number;
	    page: number;
	    page_size: number;
	
	    static createFrom(source: any = {}) {
	        return new PaginatedPurchases(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], Purchase);
	        this.total_count = source["total_count"];
	        this.page = source["page"];
	        this.page_size = source["page_size"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PermissionInfo {
	    key: string;
	    label: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new PermissionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.label = source["label"];
	        this.description = source["description"];
	    }
	}
	export class PharmacyConfig {
	    pharmacy_name: string;
	    logo: string;
	    address: string;
	    phone: string;
	    email: string;
	    license_number: string;
	    registration_number: string;
	    tax_number: string;
	    operating_hours: string;
	    currency: string;
	    date_format: string;
	    time_format: string;
	    receipt_format: string;
	    invoice_format: string;
	    default_tax: number;
	    default_discount: number;
	    low_stock_threshold: number;
	    expiry_warning_days: number;
	    return_rules: string;
	    numbering_formats: string;
	
	    static createFrom(source: any = {}) {
	        return new PharmacyConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pharmacy_name = source["pharmacy_name"];
	        this.logo = source["logo"];
	        this.address = source["address"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	        this.license_number = source["license_number"];
	        this.registration_number = source["registration_number"];
	        this.tax_number = source["tax_number"];
	        this.operating_hours = source["operating_hours"];
	        this.currency = source["currency"];
	        this.date_format = source["date_format"];
	        this.time_format = source["time_format"];
	        this.receipt_format = source["receipt_format"];
	        this.invoice_format = source["invoice_format"];
	        this.default_tax = source["default_tax"];
	        this.default_discount = source["default_discount"];
	        this.low_stock_threshold = source["low_stock_threshold"];
	        this.expiry_warning_days = source["expiry_warning_days"];
	        this.return_rules = source["return_rules"];
	        this.numbering_formats = source["numbering_formats"];
	    }
	}
	export class PrescriptionItem {
	    id: number;
	    prescription_id: number;
	    medicine_id: number;
	    medicine_name?: string;
	    medicine_price?: number;
	    current_stock?: number;
	    dosage: string;
	    frequency: string;
	    duration_days: number;
	    quantity_prescribed: number;
	    quantity_dispensed: number;
	
	    static createFrom(source: any = {}) {
	        return new PrescriptionItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.prescription_id = source["prescription_id"];
	        this.medicine_id = source["medicine_id"];
	        this.medicine_name = source["medicine_name"];
	        this.medicine_price = source["medicine_price"];
	        this.current_stock = source["current_stock"];
	        this.dosage = source["dosage"];
	        this.frequency = source["frequency"];
	        this.duration_days = source["duration_days"];
	        this.quantity_prescribed = source["quantity_prescribed"];
	        this.quantity_dispensed = source["quantity_dispensed"];
	    }
	}
	export class Prescription {
	    id: number;
	    prescription_number: string;
	    patient_name: string;
	    patient_age: number;
	    patient_phone: string;
	    doctor_name: string;
	    doctor_contact: string;
	    status: string;
	    notes: string;
	    created_by?: number;
	    created_by_name?: string;
	    // Go type: time
	    created_at: any;
	    items?: PrescriptionItem[];
	
	    static createFrom(source: any = {}) {
	        return new Prescription(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.prescription_number = source["prescription_number"];
	        this.patient_name = source["patient_name"];
	        this.patient_age = source["patient_age"];
	        this.patient_phone = source["patient_phone"];
	        this.doctor_name = source["doctor_name"];
	        this.doctor_contact = source["doctor_contact"];
	        this.status = source["status"];
	        this.notes = source["notes"];
	        this.created_by = source["created_by"];
	        this.created_by_name = source["created_by_name"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.items = this.convertValues(source["items"], PrescriptionItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	export class SaleItem {
	    id: number;
	    sale_id: number;
	    medicine_id: number;
	    medicine_name?: string;
	    batch_id: number;
	    batch_number?: string;
	    quantity: number;
	    unit_price: number;
	    subtotal: number;
	
	    static createFrom(source: any = {}) {
	        return new SaleItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sale_id = source["sale_id"];
	        this.medicine_id = source["medicine_id"];
	        this.medicine_name = source["medicine_name"];
	        this.batch_id = source["batch_id"];
	        this.batch_number = source["batch_number"];
	        this.quantity = source["quantity"];
	        this.unit_price = source["unit_price"];
	        this.subtotal = source["subtotal"];
	    }
	}
	export class Sale {
	    id: number;
	    invoice_number: string;
	    user_id?: number;
	    username?: string;
	    // Go type: time
	    sale_date: any;
	    total_amount: number;
	    payment_method: string;
	    items?: SaleItem[];
	
	    static createFrom(source: any = {}) {
	        return new Sale(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.invoice_number = source["invoice_number"];
	        this.user_id = source["user_id"];
	        this.username = source["username"];
	        this.sale_date = this.convertValues(source["sale_date"], null);
	        this.total_amount = source["total_amount"];
	        this.payment_method = source["payment_method"];
	        this.items = this.convertValues(source["items"], SaleItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class SearchResultItem {
	    id: number;
	    category: string;
	    title: string;
	    subtitle: string;
	    target_view: string;
	
	    static createFrom(source: any = {}) {
	        return new SearchResultItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.category = source["category"];
	        this.title = source["title"];
	        this.subtitle = source["subtitle"];
	        this.target_view = source["target_view"];
	    }
	}
	export class Supplier {
	    id: number;
	    name: string;
	    contact_person: string;
	    phone: string;
	    email: string;
	    address: string;
	    is_archived: boolean;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Supplier(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.contact_person = source["contact_person"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	        this.address = source["address"];
	        this.is_archived = source["is_archived"];
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class User {
	    id: number;
	    username: string;
	    role: string;
	    full_name: string;
	    phone: string;
	    email: string;
	    branch: string;
	    active: boolean;
	    // Go type: time
	    last_login_at?: any;
	    // Go type: time
	    last_logout_at?: any;
	    last_workstation?: string;
	    failed_login_attempts?: number;
	    // Go type: time
	    locked_until?: any;
	    // Go type: time
	    password_changed_at?: any;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.username = source["username"];
	        this.role = source["role"];
	        this.full_name = source["full_name"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	        this.branch = source["branch"];
	        this.active = source["active"];
	        this.last_login_at = this.convertValues(source["last_login_at"], null);
	        this.last_logout_at = this.convertValues(source["last_logout_at"], null);
	        this.last_workstation = source["last_workstation"];
	        this.failed_login_attempts = source["failed_login_attempts"];
	        this.locked_until = this.convertValues(source["locked_until"], null);
	        this.password_changed_at = this.convertValues(source["password_changed_at"], null);
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace services {
	
	export class CartItemInput {
	    medicine_id: number;
	    quantity: number;
	    unit_price: number;
	
	    static createFrom(source: any = {}) {
	        return new CartItemInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.medicine_id = source["medicine_id"];
	        this.quantity = source["quantity"];
	        this.unit_price = source["unit_price"];
	    }
	}
	export class CashierPerformanceMetrics {
	    total_sales: number;
	    items_sold: number;
	    total_revenue: number;
	
	    static createFrom(source: any = {}) {
	        return new CashierPerformanceMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_sales = source["total_sales"];
	        this.items_sold = source["items_sold"];
	        this.total_revenue = source["total_revenue"];
	    }
	}
	export class CashierPerformance {
	    user_id: number;
	    today: CashierPerformanceMetrics;
	    this_week: CashierPerformanceMetrics;
	    this_month: CashierPerformanceMetrics;
	
	    static createFrom(source: any = {}) {
	        return new CashierPerformance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.user_id = source["user_id"];
	        this.today = this.convertValues(source["today"], CashierPerformanceMetrics);
	        this.this_week = this.convertValues(source["this_week"], CashierPerformanceMetrics);
	        this.this_month = this.convertValues(source["this_month"], CashierPerformanceMetrics);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class SalesTrendPoint {
	    date: string;
	    amount: number;
	
	    static createFrom(source: any = {}) {
	        return new SalesTrendPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.amount = source["amount"];
	    }
	}
	export class LowStockItemSummary {
	    id: number;
	    medicine_name: string;
	    current_stock: number;
	    reorder_level: number;
	
	    static createFrom(source: any = {}) {
	        return new LowStockItemSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.medicine_name = source["medicine_name"];
	        this.current_stock = source["current_stock"];
	        this.reorder_level = source["reorder_level"];
	    }
	}
	export class ExpiringItemSummary {
	    id: number;
	    medicine_name: string;
	    batch_number: string;
	    expiry_date: string;
	    days_until_expiry: number;
	    quantity_remaining: number;
	
	    static createFrom(source: any = {}) {
	        return new ExpiringItemSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.medicine_name = source["medicine_name"];
	        this.batch_number = source["batch_number"];
	        this.expiry_date = source["expiry_date"];
	        this.days_until_expiry = source["days_until_expiry"];
	        this.quantity_remaining = source["quantity_remaining"];
	    }
	}
	export class DashboardSummary {
	    sales_today: number;
	    total_medicines: number;
	    low_stock_count: number;
	    out_of_stock_count: number;
	    expiring_soon_count: number;
	    recent_sales: models.Sale[];
	    recent_purchases: models.Purchase[];
	    expiring_items: ExpiringItemSummary[];
	    low_stock_items: LowStockItemSummary[];
	    sales_trend: SalesTrendPoint[];
	
	    static createFrom(source: any = {}) {
	        return new DashboardSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sales_today = source["sales_today"];
	        this.total_medicines = source["total_medicines"];
	        this.low_stock_count = source["low_stock_count"];
	        this.out_of_stock_count = source["out_of_stock_count"];
	        this.expiring_soon_count = source["expiring_soon_count"];
	        this.recent_sales = this.convertValues(source["recent_sales"], models.Sale);
	        this.recent_purchases = this.convertValues(source["recent_purchases"], models.Purchase);
	        this.expiring_items = this.convertValues(source["expiring_items"], ExpiringItemSummary);
	        this.low_stock_items = this.convertValues(source["low_stock_items"], LowStockItemSummary);
	        this.sales_trend = this.convertValues(source["sales_trend"], SalesTrendPoint);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class IncomingStockItem {
	    medicine_id: number;
	    batch_number: string;
	    quantity: number;
	    buying_price: number;
	    mfg_date: string;
	    expiry_date: string;
	
	    static createFrom(source: any = {}) {
	        return new IncomingStockItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.medicine_id = source["medicine_id"];
	        this.batch_number = source["batch_number"];
	        this.quantity = source["quantity"];
	        this.buying_price = source["buying_price"];
	        this.mfg_date = source["mfg_date"];
	        this.expiry_date = source["expiry_date"];
	    }
	}
	
	export class PaymentMethodSummary {
	    method: string;
	    count: number;
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new PaymentMethodSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.method = source["method"];
	        this.count = source["count"];
	        this.total = source["total"];
	    }
	}
	export class PrescriptionItemInput {
	    medicine_id: number;
	    dosage: string;
	    frequency: string;
	    duration_days: number;
	    quantity_prescribed: number;
	
	    static createFrom(source: any = {}) {
	        return new PrescriptionItemInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.medicine_id = source["medicine_id"];
	        this.dosage = source["dosage"];
	        this.frequency = source["frequency"];
	        this.duration_days = source["duration_days"];
	        this.quantity_prescribed = source["quantity_prescribed"];
	    }
	}
	export class TopProductSummary {
	    medicine_id: number;
	    medicine_name: string;
	    quantity_sold: number;
	    revenue: number;
	
	    static createFrom(source: any = {}) {
	        return new TopProductSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.medicine_id = source["medicine_id"];
	        this.medicine_name = source["medicine_name"];
	        this.quantity_sold = source["quantity_sold"];
	        this.revenue = source["revenue"];
	    }
	}
	export class SalesSummary {
	    today_total: number;
	    week_total: number;
	    month_total: number;
	    total_sales: number;
	    by_method: PaymentMethodSummary[];
	    top_products: TopProductSummary[];
	
	    static createFrom(source: any = {}) {
	        return new SalesSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.today_total = source["today_total"];
	        this.week_total = source["week_total"];
	        this.month_total = source["month_total"];
	        this.total_sales = source["total_sales"];
	        this.by_method = this.convertValues(source["by_method"], PaymentMethodSummary);
	        this.top_products = this.convertValues(source["top_products"], TopProductSummary);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

