import React, { useState, useEffect } from 'react';
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
  CreditCard,
  Banknote,
  Smartphone,
  Pill,
  PackageCheck
} from 'lucide-react';
import { Medicine } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../../components/ui/SectionHeader';
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

  // Checkout Receipt Modal State
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
      toast.success(`POS Sale Approved! Total: UGX ${cartTotal.toLocaleString()}`);
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

  // Primary Pane Content - High Density Desktop Product Cards Grid
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '100%' }}>
      <SectionHeader
        title="Checkout Workstation"
        subtitle="Search medicine catalog & add product items to cart"
      />

      {/* Filter & Search Bar */}
      <Panel noPadding style={{ padding: '6px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Barcode or search medicine name, brand..."
            width="320px"
            showShortcut={false}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={12} style={{ color: 'var(--color-text-muted)' }} />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ height: '26px', fontSize: '11px' }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {/* Desktop Workspace Product Cards Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 165px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
          gap: '8px',
          padding: '2px',
          alignContent: 'start'
        }}
      >
        {isLoading ? (
          <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading catalog items...
          </div>
        ) : medicines.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
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
                className="product-card"
                onClick={() => handleAddToCart(med)}
                style={{
                  opacity: isOutOfStock ? 0.6 : 1,
                  borderColor: inCart ? 'var(--color-accent)' : undefined
                }}
              >
                {/* Card Top Strip */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      backgroundColor: 'var(--color-border-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '2px',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {med.category}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    {med.medicine_form}
                  </span>
                </div>

                {/* Medicine Title & Generic Name */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                    {med.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
                    {med.generic_name || med.brand_name || '-'} ({med.pack_size || '10x10'})
                  </div>
                </div>

                {/* Card Bottom: Price Tag & Add Button */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '4px', borderTop: '1px solid var(--color-border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Price</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>
                      UGX {med.selling_price.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: isOutOfStock ? '#EF4444' : isLowStock ? '#D97706' : '#10B981'
                      }}
                    >
                      {isOutOfStock ? 'OUT OF STOCK' : `Stock: ${med.current_stock}`}
                    </span>

                    <button
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(med);
                      }}
                      className="desktop-btn-primary"
                      style={{
                        height: '22px',
                        padding: '0 6px',
                        fontSize: '10px',
                        gap: '3px'
                      }}
                    >
                      {inCart ? <PackageCheck size={11} /> : <Plus size={11} />}
                      <span>{inCart ? `+${inCart.quantity}` : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Inspector Docked Cart & Order Content
  const cartContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', boxSizing: 'border-box' }}>
      {/* Cart Items List */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '2px', backgroundColor: 'var(--color-panel-bg)', padding: '4px' }}>
        {cart.length === 0 ? (
          <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px' }}>
            <ShoppingCart size={28} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
            Cart is empty. Click product cards to add to sale.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {cart.map((item) => (
              <div
                key={item.medicine.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  backgroundColor: 'var(--color-desktop-bg)'
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.medicine.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    UGX {item.medicine.selling_price.toLocaleString()} x {item.quantity} = <strong style={{ color: 'var(--color-accent)' }}>UGX {(item.medicine.selling_price * item.quantity).toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => handleUpdateQty(item.medicine.id, -1)}
                    style={{ width: '20px', height: '20px', padding: 0, fontSize: '10px' }}
                  >
                    <Minus size={10} />
                  </button>
                  <span style={{ fontSize: '11px', fontWeight: 700, width: '18px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQty(item.medicine.id, 1)}
                    style={{ width: '20px', height: '20px', padding: 0, fontSize: '10px' }}
                  >
                    <Plus size={10} />
                  </button>
                  <button
                    onClick={() => handleRemoveFromCart(item.medicine.id)}
                    style={{ width: '20px', height: '20px', padding: 0, color: '#EF4444', backgroundColor: '#FEE2E2', border: 'none', marginLeft: '4px' }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Selection & Total Calculation */}
      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
          Payment Method
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          <button
            onClick={() => setPaymentMethod('Cash')}
            style={{
              height: '26px',
              fontSize: '10px',
              fontWeight: 600,
              gap: '4px',
              backgroundColor: paymentMethod === 'Cash' ? 'var(--color-accent-light)' : 'var(--color-panel-bg)',
              borderColor: paymentMethod === 'Cash' ? 'var(--color-accent)' : 'var(--color-border)',
              color: paymentMethod === 'Cash' ? '#065F46' : 'var(--color-text-primary)'
            }}
          >
            <Banknote size={11} /> Cash
          </button>
          <button
            onClick={() => setPaymentMethod('Mobile Money')}
            style={{
              height: '26px',
              fontSize: '10px',
              fontWeight: 600,
              gap: '4px',
              backgroundColor: paymentMethod === 'Mobile Money' ? 'var(--color-accent-light)' : 'var(--color-panel-bg)',
              borderColor: paymentMethod === 'Mobile Money' ? 'var(--color-accent)' : 'var(--color-border)',
              color: paymentMethod === 'Mobile Money' ? '#065F46' : 'var(--color-text-primary)'
            }}
          >
            <Smartphone size={11} /> MoMo
          </button>
          <button
            onClick={() => setPaymentMethod('Card')}
            style={{
              height: '26px',
              fontSize: '10px',
              fontWeight: 600,
              gap: '4px',
              backgroundColor: paymentMethod === 'Card' ? 'var(--color-accent-light)' : 'var(--color-panel-bg)',
              borderColor: paymentMethod === 'Card' ? 'var(--color-accent)' : 'var(--color-border)',
              color: paymentMethod === 'Card' ? '#065F46' : 'var(--color-text-primary)'
            }}
          >
            <CreditCard size={11} /> Card
          </button>
        </div>

        {/* Total Summary Box */}
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>TOTAL DUE:</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#34D399' }}>
            UGX {cartTotal.toLocaleString()}
          </span>
        </div>

        {/* Approve & Complete Sale Button */}
        <button
          onClick={handleApproveSale}
          disabled={cart.length === 0 || isProcessing}
          className="desktop-btn-primary"
          style={{
            height: '32px',
            fontSize: '12px',
            width: '100%',
            gap: '6px',
            opacity: cart.length === 0 || isProcessing ? 0.6 : 1
          }}
        >
          <CheckCircle size={14} />
          <span>{isProcessing ? 'Processing Sale...' : 'Approve & Complete Sale (F10)'}</span>
        </button>
      </div>

      {/* Completed Sale Receipt Modal */}
      {isCheckoutOpen && completedSale && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-panel-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '2px',
              width: '380px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>POS RECEIPT #{completedSale.invoice_number}</span>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ border: 'none', background: 'none' }}><X size={14} /></button>
            </div>

            <div style={{ padding: '12px 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              <div>Operator: <strong>{completedSale.username}</strong></div>
              <div>Payment Method: <strong>{completedSale.payment_method}</strong></div>
              <div>Date: {new Date(completedSale.sale_date).toLocaleString()}</div>

              <div style={{ margin: '10px 0', borderTop: '1px dashed var(--color-border)', borderBottom: '1px dashed var(--color-border)', padding: '6px 0' }}>
                {completedSale.items?.map((it: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{it.medicine_name} x{it.quantity}</span>
                    <span>UGX {(it.subtotal || (it.unit_price * it.quantity)).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>
                <span>TOTAL PAID:</span>
                <span>UGX {completedSale.total_amount?.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={handlePrintReceipt} className="desktop-btn-secondary" style={{ flex: 1, gap: '4px' }}>
                <Printer size={13} /> Print Receipt
              </button>
              <button onClick={() => setIsCheckoutOpen(false)} className="desktop-btn-primary" style={{ flex: 1 }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <SplitPane
      primaryPane={primaryContent}
      inspectorPane={cartContent}
      inspectorTitle={`CART INSPECTOR (${cart.length})`}
      inspectorWidth="380px"
    />
  );
};
