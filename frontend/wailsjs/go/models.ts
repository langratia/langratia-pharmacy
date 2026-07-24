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
	export class Medicine {
	    id: number;
	    name: string;
	    generic_name: string;
	    brand_name: string;
	    category: string;
	    dosage_strength: string;
	    medicine_form: string;
	    pack_size: string;
	    buying_price: number;
	    selling_price: number;
	    current_stock: number;
	    reorder_level: number;
	    manufacturer: string;
	    description: string;
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
	        this.category = source["category"];
	        this.dosage_strength = source["dosage_strength"];
	        this.medicine_form = source["medicine_form"];
	        this.pack_size = source["pack_size"];
	        this.buying_price = source["buying_price"];
	        this.selling_price = source["selling_price"];
	        this.current_stock = source["current_stock"];
	        this.reorder_level = source["reorder_level"];
	        this.manufacturer = source["manufacturer"];
	        this.description = source["description"];
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
	export class PurchaseItem {
	    id: number;
	    purchase_id: number;
	    medicine_id: number;
	    batch_id?: number;
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
	        this.batch_id = source["batch_id"];
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
	
	export class Supplier {
	    id: number;
	    name: string;
	    contact_person: string;
	    phone: string;
	    email: string;
	    address: string;
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
	export class DashboardSummary {
	    sales_today: number;
	    total_medicines: number;
	    low_stock_count: number;
	    out_of_stock_count: number;
	    expiring_soon_count: number;
	    recent_sales: models.Sale[];
	    recent_purchases: models.Purchase[];
	
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

}

