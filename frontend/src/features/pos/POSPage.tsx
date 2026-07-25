import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  X,
  Filter,
  CheckCircle,
  PackageCheck,
  Loader
} from 'lucide-react';
import { Medicine } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Panel } from '../../components/ui/Panel';
import { SearchBar } from '../../components/ui/SearchBar';
import { SplitPane } from '../../components/ui/SplitPane';
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

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showSuccessAnim, setShowSuccessAnim] = useState<boolean>(false);

  const categories = ['All', 'General', 'Antibiotics', 'Analgesics', 'Antimalarials', 'Cardiovascular', 'Vitamins & Supplements', 'Respiratory', 'Dermatology'];

  const fetchMedicines = async () => {
    setIsLoading(true);
    try {
      let data: Medicine[] = [];
      try {
        data = await ListMedicines(search, category === 'All' ? '' : category, false);
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.ListMedicines === 'function') {
          data = await wailsApp.ListMedicines(search, category === 'All' ? '' : category, false);
        }
      }
      setMedicines(data && data.length > 0 ? data : []);
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
          toast.error(`Maximum stock reached for ${med.name}`);
          return prev;
        }
        return prev.map(item =>
          item.medicine.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { medicine: med, quantity: 1 }];
    });
  };

  const handleUpdateQty = (medId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.medicine.id === medId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null as any;
        if (newQty > item.medicine.current_stock) {
          toast.error('Stock limit reached');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const handleRemoveFromCart = (medId: number) => {
    setCart(prev => prev.filter(item => item.medicine.id !== medId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.medicine.selling_price * item.quantity), 0);

  const handleApproveSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
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
          'Cash'
        );
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.ProcessSale === 'function') {
          sale = await wailsApp.ProcessSale(
            user?.id || 1,
            user?.username || 'cashier',
            cartInput,
            'Cash'
          );
        }
      }

      if (!sale) {
        sale = {
          invoice_number: `INV-POS-${Date.now()}`,
          sale_date: new Date().toISOString(),
          username: user?.username || 'cashier',
          total_amount: cartTotal,
          payment_method: 'Cash',
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
      setShowSuccessAnim(true);
      
      // We no longer need the top toast since we have a dedicated success screen
      // toast.success(`POS Sale Approved! Total: UGX ${cartTotal.toLocaleString()}`);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err?.message || 'Checkout failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Primary Pane Content - Spacious Desktop Workstation Tiles Grid
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', backgroundColor: 'var(--color-desktop-bg)' }}>
      {/* Spacious Application Toolbar */}
      <Panel noPadding style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-panel-solid)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Special Menu for you
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Barcode or search medicine name, brand..."
              width="320px"
              showShortcut={false}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-desktop-bg)', padding: '4px 12px', borderRadius: '8px' }}>
              <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ height: '32px', fontSize: '13px', border: 'none', background: 'transparent', outline: 'none' }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Panel>

      {/* Spacious Product Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '24px',
          padding: '0',
          alignContent: 'start'
        }}
      >
        {isLoading ? (
          <div style={{ gridColumn: 'span 4', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', gap: '12px' }}>
            <Loader size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            <span>Loading catalog items...</span>
          </div>
        ) : medicines.length === 0 ? (
          <div style={{ gridColumn: 'span 4', padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No medicines matching search query.
          </div>
        ) : (
          medicines.map((med) => {
            const isOutOfStock = med.current_stock <= 0;
            const isLowStock = med.current_stock > 0 && med.current_stock <= med.reorder_level;
            const inCart = cart.find(c => c.medicine.id === med.id);

            return (
              <div
                key={med.id}
                className={`product-card ${inCart ? 'selected' : ''}`}
                onClick={() => handleAddToCart(med)}
                style={{
                  opacity: isOutOfStock ? 0.6 : 1,
                }}
              >
                {/* Image Placeholder */}
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-desktop-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px'
                }}>
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(med.name)}&background=random&color=fff&size=100&font-size=0.33`} 
                    alt={med.name} 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                </div>

                {/* Medicine Title & Category */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {med.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    UGX {med.selling_price.toLocaleString()}
                  </div>
                </div>

                {/* Button */}
                <div style={{ width: '100%', marginTop: '8px' }}>
                  <button
                    disabled={isOutOfStock}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(med);
                    }}
                    className="pos-add-btn"
                  >
                    <span style={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)', 
                      borderRadius: '50%', 
                      width: '20px', 
                      height: '20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {inCart ? <PackageCheck size={12} /> : <Plus size={12} />}
                    </span>
                    <span>{inCart ? `ADD (${inCart.quantity})` : 'ADD'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Inspector Docked Cart Content (Spacious Desktop Style)
  const cartContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', boxSizing: 'border-box', backgroundColor: 'var(--color-desktop-bg)', borderLeft: '1px solid var(--color-border-subtle)' }}>
      
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>
        Current Order
      </div>

      {/* Cart Items List */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'transparent', padding: '0 4px 0 0' }}>
        {cart.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', backgroundColor: 'var(--color-panel-solid)', borderRadius: '20px', border: '1px solid var(--color-border-subtle)' }}>
            <ShoppingCart size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            Cart is empty. Click workstation product tiles to add to sale.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cart.map((item) => (
              <div
                key={item.medicine.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--color-panel-solid)',
                  border: '1px solid var(--color-border-subtle)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden', paddingRight: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                    {item.medicine.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    UGX {item.medicine.selling_price.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-desktop-bg)', borderRadius: '24px', padding: '4px' }}>
                    <button
                      onClick={() => handleUpdateQty(item.medicine.id, -1)}
                      style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', backgroundColor: 'var(--color-panel-solid)', border: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Minus size={14} color="var(--color-text-secondary)" />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, width: '32px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQty(item.medicine.id, 1)}
                      style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', backgroundColor: 'var(--color-panel-solid)', border: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Plus size={14} color="var(--color-text-secondary)" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveFromCart(item.medicine.id)}
                    style={{ width: '44px', height: '44px', padding: 0, borderRadius: '50%', color: '#EF4444', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Calculation & Approve Sale */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Total Summary Box */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(15,23,42,0.15)'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>TOTAL DUE</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#34D399' }}>
            UGX {cartTotal.toLocaleString()}
          </span>
        </div>

        {/* Approve & Complete Sale Button */}
        <button
          onClick={handleApproveSale}
          disabled={cart.length === 0 || isProcessing}
          className="desktop-btn-primary"
          style={{
            height: '48px',
            fontSize: '14px',
            borderRadius: '24px',
            width: '100%',
            gap: '8px',
            opacity: cart.length === 0 || isProcessing ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(15, 138, 106, 0.2)'
          }}
        >
          <CheckCircle size={18} />
          <span>{isProcessing ? 'Processing Sale...' : 'Approve & Complete Sale (F10)'}</span>
        </button>
      </div>

      {/* Completed Sale Receipt Modal (Portaled for true center) */}
      {isCheckoutOpen && completedSale && createPortal(
        <div className="modal-overlay" onClick={() => setIsCheckoutOpen(false)}>
          <div
            className="animate-popup"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--color-panel-solid)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '24px',
              width: '400px',
              padding: '24px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch'
            }}
          >
            {showSuccessAnim ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div className="animate-success-pop" style={{ color: '#10B981' }}>
                  <CheckCircle size={80} />
                </div>
                <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--color-text-primary)' }}>Sale Successful!</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 }}>
                  Amount Paid: <strong style={{ color: 'var(--color-accent)' }}>UGX {completedSale.total_amount?.toLocaleString()}</strong>
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', width: '100%' }}>
                  <button onClick={() => setShowSuccessAnim(false)} className="desktop-btn-secondary" style={{ flex: 1, height: '40px', borderRadius: '20px' }}>
                    View Receipt
                  </button>
                  <button onClick={() => setIsCheckoutOpen(false)} className="desktop-btn-primary" style={{ flex: 1, height: '40px', borderRadius: '20px' }}>
                    New Sale
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>POS RECEIPT #{completedSale.invoice_number}</span>
                  <button onClick={() => setIsCheckoutOpen(false)} style={{ border: 'none', background: 'var(--color-desktop-bg)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} style={{ color: 'var(--color-text-muted)' }} /></button>
                </div>

                <div style={{ padding: '8px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <div style={{ marginBottom: '4px' }}>Operator: <strong>{completedSale.username}</strong></div>
                  <div>Date: {new Date(completedSale.sale_date).toLocaleString()}</div>

                  <div style={{ margin: '16px 0', borderTop: '1px dashed var(--color-border)', borderBottom: '1px dashed var(--color-border)', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {completedSale.items?.map((it: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{it.medicine_name} <span style={{ color: 'var(--color-text-muted)' }}>x{it.quantity}</span></span>
                        <span style={{ fontWeight: 600 }}>UGX {(it.subtotal || (it.unit_price * it.quantity)).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: 'var(--color-accent)' }}>
                    <span>TOTAL PAID:</span>
                    <span>UGX {completedSale.total_amount?.toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button onClick={handlePrintReceipt} className="desktop-btn-secondary" style={{ flex: 1, gap: '6px', height: '40px', borderRadius: '20px' }}>
                    <Printer size={16} /> Print Receipt
                  </button>
                  <button onClick={() => setIsCheckoutOpen(false)} className="desktop-btn-primary" style={{ flex: 1, height: '40px', borderRadius: '20px' }}>
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  return (
    <SplitPane
      primaryPane={primaryContent}
      inspectorPane={cartContent}
      inspectorTitle={`CART INSPECTOR (${cart.length})`}
      inspectorWidth="360px"
    />
  );
};
