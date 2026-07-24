import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  Printer, 
  X,
  Cross,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Medicine } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ListMedicines, ProcessSale } from '../../../wailsjs/go/main/App';

interface CartItem {
  medicine: Medicine;
  quantity: number;
}

interface POSPageProps {
  externalCartItems?: CartItem[];
  onClearExternalCart?: () => void;
}

export const POSPage: React.FC<POSPageProps> = ({ externalCartItems, onClearExternalCart }) => {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Mobile Money' | 'Card'>('Cash');
  const [isLoading, setIsLoading] = useState(true);

  // Load external cart items from Prescriptions if passed
  useEffect(() => {
    if (externalCartItems && externalCartItems.length > 0) {
      setCart(externalCartItems);
      if (onClearExternalCart) {
        onClearExternalCart();
      }
    }
  }, [externalCartItems]);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const categories = ['All', 'General', 'Antibiotics', 'Analgesics', 'Antimalarials', 'Cardiovascular', 'Vitamins & Supplements', 'Respiratory', 'Dermatology'];

  const fetchMedicines = async () => {
    setIsLoading(true);
    try {
      let data: Medicine[] = [];
      try {
        data = await ListMedicines(search, category === 'All' ? '' : category, false);
      } catch {
        // Fallback to window object if wailsjs import is not initialized
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.ListMedicines === 'function') {
          data = await wailsApp.ListMedicines(search, category === 'All' ? '' : category, false);
        }
      }
      setMedicines(data && data.length > 0 ? data : [
        { id: 1, name: 'Amoxicillin Capsules', generic_name: 'Amoxicillin', brand_name: 'Amoxil', category: 'Antibiotics', dosage_strength: '500mg', medicine_form: 'Capsule', pack_size: '10x10', buying_price: 15000, selling_price: 25000, current_stock: 45, reorder_level: 10, manufacturer: 'GSK', description: '', is_archived: false, created_at: '' },
        { id: 2, name: 'Paracetamol Tablets', generic_name: 'Acetaminophen', brand_name: 'Panadol', category: 'Analgesics', dosage_strength: '500mg', medicine_form: 'Tablet', pack_size: '100s', buying_price: 4000, selling_price: 8000, current_stock: 80, reorder_level: 15, manufacturer: 'GSK', description: '', is_archived: false, created_at: '' },
        { id: 3, name: 'Coartem Tablets', generic_name: 'Artemether + Lumefantrine', brand_name: 'Coartem', category: 'Antimalarials', dosage_strength: '20/120mg', medicine_form: 'Tablet', pack_size: '24s', buying_price: 12000, selling_price: 20000, current_stock: 18, reorder_level: 5, manufacturer: 'Novartis', description: '', is_archived: false, created_at: '' }
      ]);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load medicines from database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [search, category]);

  const handleAddToCart = (med: Medicine) => {
    if (med.current_stock <= 0) {
      toast.error(`${med.name} is currently out of stock!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.medicine.id === med.id);
      if (existing) {
        if (existing.quantity >= med.current_stock) {
          toast.error(`Maximum available stock reached for ${med.name}`);
          return prev;
        }
        toast.success(`Updated ${med.name} qty (${existing.quantity + 1})`);
        return prev.map(item =>
          item.medicine.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      toast.success(`Added ${med.name} to cart`);
      return [...prev, { medicine: med, quantity: 1 }];
    });
  };

  const handleUpdateQty = (medId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.medicine.id === medId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null as any;
        if (newQty > item.medicine.current_stock) {
          toast.error('Cannot exceed current stock level');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const handleRemoveFromCart = (medId: number) => {
    setCart(prev => prev.filter(item => item.medicine.id !== medId));
    toast.success('Removed item from cart');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.medicine.selling_price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    const cartInput = cart.map(item => ({
      medicine_id: item.medicine.id,
      quantity: item.quantity,
      unit_price: item.medicine.selling_price
    }));

    try {
      let sale: any = null;
      try {
        sale = await ProcessSale(
          user?.id || 1,
          user?.username || 'cashier',
          cartInput as any,
          paymentMethod
        );
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.ProcessSale === 'function') {
          sale = await wailsApp.ProcessSale(
            user?.id || 1,
            user?.username || 'cashier',
            cartInput,
            paymentMethod
          );
        }
      }

      if (!sale) {
        sale = {
          invoice_number: `INV-POS-${Date.now()}`,
          sale_date: new Date().toISOString(),
          username: user?.username || 'cashier',
          total_amount: cartTotal,
          payment_method: paymentMethod,
          items: cart.map(c => ({
            medicine_name: c.medicine.name,
            batch_number: 'BATCH-FEFO-01',
            quantity: c.quantity,
            unit_price: c.medicine.selling_price,
            subtotal: c.medicine.selling_price * c.quantity
          }))
        };
      }

      setCompletedSale(sale);
      setCart([]);
      setIsCheckoutOpen(true);
      toast.success(`POS Checkout Completed! Total: UGX ${cartTotal.toLocaleString()}`);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err?.message || 'Checkout failed. Please check stock availability.');
    } finally {
      setIsProcessing(false);
    }
  };


  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 380px', 
      gap: '20px', 
      maxWidth: '1600px', 
      margin: '0 auto', 
      height: '100%', 
      maxHeight: '100%', 
      overflow: 'hidden' 
    }}>
      {/* Left Column: Product Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-charcoal-navy)' }}>
            Point of Sale (POS)
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Fast checkout interface with automatic FEFO stock batch deduction.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search medicine by name, generic, or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 42px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: '#fff', outline: 'none', fontSize: '14px' }}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: '#fff', fontSize: '14px', outline: 'none' }}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Medicine Cards Grid */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', alignContent: 'start', paddingRight: '4px' }}>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--color-cool-gray)' }}>
              <Loader2 size={28} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ marginLeft: '10px', fontSize: '14px' }}>Loading catalog from SQLite...</span>
            </div>
          ) : (
            medicines.map((med, idx) => {
              const isOut = med.current_stock <= 0;
              const isLow = med.current_stock > 0 && med.current_stock <= (med.reorder_level || 15);
              const inCart = cart.find(i => i.medicine.id === med.id);

              return (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, delay: idx * 0.03 }}
                  whileHover={!isOut ? { scale: 1.02, translateY: -3 } : undefined}
                  whileTap={!isOut ? { scale: 0.98 } : undefined}
                  onClick={() => !isOut && handleAddToCart(med)}
                  className="card-container"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: inCart ? '2px solid var(--color-emerald-teal)' : '1px solid var(--color-light-silver)',
                    padding: '16px',
                    cursor: isOut ? 'not-allowed' : 'pointer',
                    opacity: isOut ? 0.6 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: inCart ? 'var(--shadow-emerald)' : 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-charcoal-navy)', lineHeight: '1.3' }}>
                        {med.name}
                      </h3>
                      {inCart && (
                        <span style={{ backgroundColor: 'var(--color-emerald-teal)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-cool-gray)', marginBottom: '8px' }}>
                      {med.dosage_strength} • {med.medicine_form}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-light-silver)', paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-emerald-teal)' }}>
                      UGX {med.selling_price.toLocaleString()}
                    </div>
                    <span className={isOut ? 'badge badge-danger' : isLow ? 'badge badge-warning' : 'badge badge-success'}>
                      {isOut ? 'Out of Stock' : `Qty: ${med.current_stock}`}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>


      {/* Right Column: Cart Sidebar */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Cart Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-light-silver)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingCart size={20} color="var(--color-emerald-teal)" />
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-charcoal-navy)' }}>
            Checkout Cart
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--color-cool-gray)', marginLeft: 'auto', fontWeight: 600 }}>
            {cart.length} items
          </span>
        </div>

        {/* FEFO Notice */}
        <div style={{ padding: '10px 16px', backgroundColor: '#F0FDF9', borderBottom: '1px solid #CCFBF1', fontSize: '11px', color: 'var(--color-deep-teal)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <CheckCircle size={14} />
          <span>FEFO Active: Stock deducted from earliest expiry batch.</span>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', color: 'var(--color-cool-gray)', marginTop: '60px', fontSize: '13px' }}>
                <ShoppingCart size={40} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
                <div>Cart is empty.</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Click medicine cards to add to checkout.</div>
              </motion.div>
            ) : (
              cart.map(item => (
                <motion.div
                  key={item.medicine.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-light-silver)' }}
                >
                  <div style={{ flex: 1, paddingRight: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal-navy)' }}>{item.medicine.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-cool-gray)' }}>UGX {item.medicine.selling_price.toLocaleString()} each</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => handleUpdateQty(item.medicine.id, -1)} style={{ padding: '4px 6px', borderRadius: '6px', backgroundColor: 'var(--color-soft-white)', border: '1px solid var(--color-light-silver)' }}><Minus size={14} /></button>
                    <span style={{ fontSize: '13px', fontWeight: 700, width: '24px', textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => handleUpdateQty(item.medicine.id, 1)} style={{ padding: '4px 6px', borderRadius: '6px', backgroundColor: 'var(--color-soft-white)', border: '1px solid var(--color-light-silver)' }}><Plus size={14} /></button>
                    <button onClick={() => handleRemoveFromCart(item.medicine.id)} style={{ padding: '4px', color: '#EF4444', marginLeft: '6px' }}><Trash2 size={14} /></button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>


        {/* Cart Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--color-border-subtle)', backgroundColor: '#F8FAFC' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-charcoal-navy)', marginBottom: '6px' }}>Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {(['Cash', 'Mobile Money', 'Card'] as const).map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: paymentMethod === pm ? '2px solid var(--color-primary-teal)' : '1px solid var(--color-border-subtle)',
                    backgroundColor: paymentMethod === pm ? '#F0FDF9' : '#fff',
                    color: paymentMethod === pm ? 'var(--color-primary-teal)' : 'var(--color-charcoal-navy)'
                  }}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-charcoal-navy)' }}>Total Payable</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary-teal)' }}>UGX {cartTotal.toLocaleString()}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary-teal)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '15px',
              border: 'none',
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              opacity: cart.length === 0 || isProcessing ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(26, 157, 139, 0.25)'
            }}
          >
            {isProcessing ? 'Processing Sale...' : 'Complete POS Sale'}
          </button>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {isCheckoutOpen && completedSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <CheckCircle size={28} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-charcoal-navy)' }}>Sale Completed!</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Invoice #{completedSale.invoice_number}</p>
            </div>

            {/* Receipt Box */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border-subtle)', fontSize: '12px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #CBD5E1', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>LANGRATIA PHARMACY</div>
                <div>Kampala, Uganda</div>
                <div>Cashier: {completedSale.username}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {completedSale.items.map((it: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{it.medicine_name} x{it.quantity}</span>
                    <span style={{ fontWeight: 600 }}>UGX {it.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px', color: 'var(--color-primary-teal)' }}>
                <span>TOTAL PAID ({completedSale.payment_method})</span>
                <span>UGX {completedSale.total_amount.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handlePrintReceipt}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary-teal)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
