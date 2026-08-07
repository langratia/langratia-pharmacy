export type UserRole = 'admin' | 'cashier';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  is_archived: boolean;
  created_at: string;
}

export interface Medicine {
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
  supplier_id?: number;
  supplier_name?: string;
  description: string;
  tax_rate: number;
  requires_prescription: boolean;
  product_status: string;
  barcode?: string;
  is_archived: boolean;
  created_at: string;
  units?: MedicineUnit[];
}

export interface MedicineUnit {
  id: number;
  medicine_id: number;
  unit_name: string;
  conversion_factor: number;
  price: number;
  is_base_unit: boolean;
}

export interface Batch {
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
  date_received: string;
}

export interface Shift {
  id: number;
  user_id: number;
  username: string;
  started_at: string;
  ended_at?: string;
  opening_cash: number;
  expected_cash: number;
  actual_cash: number;
  cash_variance: number;
  total_sales_count: number;
  total_sales_amount: number;
  status: string;
  notes: string;
}

export interface ShiftZReport {
  shift: Shift;
  cash_sales_total: number;
  gross_sales_total: number;
  total_discounts: number;
  net_sales_total: number;
  expected_drawer: number;
  actual_drawer: number;
  cash_variance: number;
  printed_at: string;
}

export interface CashierSalesSummary {
  user_id: number;
  username: string;
  full_name: string;
  role: string;
  invoices_count: number;
  items_sold: number;
  total_revenue: number;
}

export interface TopProductSummary {
  medicine_id: number;
  medicine_name: string;
  category: string;
  dosage: string;
  quantity_sold: number;
  unit_price: number;
  catalog_price?: number;
  price_variance?: number;
  buying_price: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface PaymentMethodSummary {
  method: string;
  count: number;
  total: number;
}

export interface SalesTrendPoint {
  date: string;
  amount: number;
}

export interface ExpiringItemSummary {
  id: number;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  days_until_expiry: number;
  quantity_remaining: number;
}

export interface LowStockItemSummary {
  id: number;
  medicine_name: string;
  current_stock: number;
  reorder_level: number;
}

export interface DashboardSummaryData {
  sales_today: number;
  total_orders: number;
  total_items_sold: number;
  total_profit: number;
  profit_margin: number;
  period_label: string;
  start_date: string;
  end_date: string;
  total_medicines: number;
  stock_valuation: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  recent_sales: any[];
  recent_purchases: any[];
  expiring_items: ExpiringItemSummary[];
  low_stock_items: LowStockItemSummary[];
  sales_trend: SalesTrendPoint[];
  who_sold: CashierSalesSummary[];
  top_products: TopProductSummary[];
}

export interface DetailedSaleItem {
  sale_id: number;
  invoice_number: string;
  sale_date: string;
  cashier_name: string;
  medicine_id: number;
  medicine_name: string;
  dosage: string;
  quantity_sold: number;
  unit_name: string;
  unit_price: number;
  catalog_price?: number;
  price_variance?: number;
  buying_price: number;
  subtotal: number;
  gross_profit: number;
  payment_method: string;
}

export interface SalesSummaryData {
  today_total: number;
  week_total: number;
  month_total: number;
  period_revenue: number;
  total_sales: number;
  total_items_sold: number;
  total_profit: number;
  total_discounts?: number;
  avg_discount_pct?: number;
  profit_margin: number;
  period_label: string;
  start_date: string;
  end_date: string;
  by_method: PaymentMethodSummary[];
  top_products: TopProductSummary[];
  detailed_sales?: DetailedSaleItem[];
  who_sold: CashierSalesSummary[];
}
