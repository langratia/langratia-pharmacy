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
  description: string;
  is_archived: boolean;
  created_at: string;
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
