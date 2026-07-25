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
  CheckCircle,
  PackageCheck,
  Loader,
  PauseCircle,
  Pill
} from 'lucide-react';
import { Medicine } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SplitPane } from '../../components/ui/SplitPane';
import { ContextualToolbar } from '../../components/ui/ContextualToolbar';
import { ListMedicines, ProcessSale } from '../../../wailsjs/go/main/App';
import { formatCurrency } from '../../utils/formatters';

type PaymentMethod = 'cash' | 'momo';
const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: 'Cash', momo: 'Mobile Money' };

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
  const categories = ['All', 'General', 'Antibiotics', 'Analgesics', 'Antimalarials', 'Cardiovascular', 'Vitamins & Supplements', 'Respiratory', 'Dermatology'];
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'momo'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // F10 keyboard shortcut for Approve Sale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        if (!isProcessing && cart.length > 0) {
          handleApproveSale();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, cart.length]);

  // Load external cart items from Prescriptions if passed
  useEffect(() => {
    if (externalCartItems && externalCartItems.length > 0) {
      setCart(externalCartItems);
      if (onClearExternalCart) {
        onClearExternalCart();
      }
    }
  }, [externalCartItems]);

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
  }, [debouncedSearch, category]);

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
    setCart(prev => {
      const item = prev.find(i => i.medicine.id === medId);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        toast.success(`${item.medicine.name} removed from cart`);
        return prev.filter(i => i.medicine.id !== medId);
      }
      if (newQty > item.medicine.current_stock) {
        toast.error('Stock limit reached');
        return prev;
      }
      return prev.map(i =>
        i.medicine.id === medId ? { ...i, quantity: newQty } : i
      );
    });
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

      const PM = PAYMENT_LABELS[paymentMethod];
      try {
        let sale: any = null;
        try {
          sale = await ProcessSale(
            user?.id || 1,
            user?.username || 'cashier',
            cartInput as any,
            PM
          );
        } catch {
          const wailsApp = (window as any)?.go?.main?.App;
          if (wailsApp && typeof wailsApp.ProcessSale === 'function') {
            sale = await wailsApp.ProcessSale(
              user?.id || 1,
              user?.username || 'cashier',
              cartInput,
              PM
            );
          }
        }

        if (!sale) {
          throw new Error('Sale processing returned no result. Please try again.');
        }

      setCompletedSale(sale);
      setCart([]);
      setIsCheckoutOpen(true);
      setShowSuccessAnim(true);

      fetchMedicines();
    } catch (err: any) {
      toast.error(err?.message || 'Checkout failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const receiptRef = React.createRef<HTMLDivElement>();

  const handlePrintReceipt = () => {
    const printContents = receiptRef.current?.innerHTML;
    if (!printContents) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>POS Receipt</title>
      <style>
        body { font-family: 'Inter', sans-serif; font-size: 12px; padding: 20px; color: #000; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 8px; text-align: left; border-bottom: 1px solid #ccc; }
      </style></head><body>${printContents}</body></html>
    `);
    win.document.close();
    win.print();
  };

  // Primary Pane Content - Spacious Desktop Workstation Tiles Grid
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', backgroundColor: 'var(--color-bg-base)' }}>
      {/* Contextual Command Toolbar */}
      <ContextualToolbar
        title="PRODUCT CATALOG"
        subtitle="Point of Sale Workstation"
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Type medicine name or brand..."
        categories={categories}
        selectedCategory={category}
        onCategorySelect={setCategory}
        categoryMode="chips"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        actions={
          <button
            type="button"
            onClick={() => toast('Held Sales Queue: 0 sales currently held')}
            style={{
              height: '28px',
              padding: '0 10px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
              borderRadius: '0px',
              cursor: 'pointer'
            }}
          >
            <PauseCircle size={14} style={{ color: 'var(--color-accent-base)' }} />
            <span>HELD SALES (0)</span>
          </button>
        }
      />

      {/* Product Catalog Grid / List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: viewMode === 'grid' ? 'grid' : 'flex',
          flexDirection: viewMode === 'grid' ? undefined : 'column',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(180px, 1fr))' : undefined,
          gap: viewMode === 'grid' ? '16px' : '8px',
          padding: '0 16px 16px',
          alignContent: 'start'
        }}
      >
        {isLoading ? (
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', gap: '12px' }}>
            <Loader size={24} className="animate-spin" style={{ color: 'var(--color-accent-base)' }} />
            <span>Loading catalog items...</span>
          </div>
        ) : medicines.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No medicines matching search query.
          </div>
        ) : (
          medicines.map((med) => {
            const isOutOfStock = med.current_stock <= 0;
            const isLowStock = !isOutOfStock && med.current_stock <= med.reorder_level;
            const inCart = cart.find(c => c.medicine.id === med.id);

            return (
              <div
                key={med.id}
                className={`product-card ${inCart ? 'selected' : ''} ${isLowStock ? 'low-stock' : ''}`}
                onClick={() => !isOutOfStock && handleAddToCart(med)}
                style={{
                  opacity: isOutOfStock ? 0.6 : 1,
                  display: 'flex',
                  flexDirection: viewMode === 'grid' ? 'column' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: viewMode === 'grid' ? '16px' : '10px 16px'
                }}
              >
                {/* Neutral Monogram Avatar Icon */}
                <div style={{
                  width: viewMode === 'grid' ? '56px' : '36px',
                  height: viewMode === 'grid' ? '56px' : '36px',
                  borderRadius: '0px',
                  backgroundColor: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: viewMode === 'grid' ? '10px' : '0',
                  flexShrink: 0
                }}>
                  <Pill size={viewMode === 'grid' ? 20 : 16} style={{ color: 'var(--color-accent-base)' }} />
                  {viewMode === 'grid' && (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginTop: '2px' }}>
                      {med.name.substring(0, 3)}
                    </span>
                  )}
                </div>

                {/* Title & Price */}
                <div style={{ textAlign: viewMode === 'grid' ? 'center' : 'left', flex: 1, marginLeft: viewMode === 'grid' ? '0' : '16px', marginRight: viewMode === 'grid' ? '0' : '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: viewMode === 'grid' ? 'normal' : 'nowrap' }}>
                    {med.name}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-accent)' }}>
                    UGX {formatCurrency(med.selling_price)}
                  </div>
                </div>

                {/* Add Button */}
                <div style={{ width: viewMode === 'grid' ? '100%' : 'auto', marginTop: viewMode === 'grid' ? '10px' : '0' }}>
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
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {inCart ? <PackageCheck size={11} /> : <Plus size={11} />}
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
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', border: '1px solid var(--color-border-subtle)' }}>
            <ShoppingCart size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            Cart is empty. Click workstation product tiles to add to sale.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cart.map((item) => (
              <div
                key={item.medicine.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: '1px solid var(--color-border-subtle)'
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden', paddingRight: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                    {item.medicine.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    UGX {formatCurrency(item.medicine.selling_price)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border-default)' }}>
                    <button
                      onClick={() => handleUpdateQty(item.medicine.id, -1)}
                      style={{ width: '28px', height: '28px', padding: 0, border: 'none', borderRight: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Minus size={12} color="var(--color-text-secondary)" />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, width: '28px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQty(item.medicine.id, 1)}
                      style={{ width: '28px', height: '28px', padding: 0, border: 'none', borderLeft: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Plus size={12} color="var(--color-text-secondary)" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveFromCart(item.medicine.id)}
                    style={{ width: '28px', height: '28px', padding: 0, borderRadius: '0px', color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Calculation & Approve Sale */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Total Summary Box */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: '0px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'none'
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>TOTAL DUE</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-accent)' }}>
            UGX {formatCurrency(cartTotal)}
          </span>
        </div>

        {/* Payment Method Selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(Object.keys(PAYMENT_LABELS) as Array<keyof typeof PAYMENT_LABELS>).map(key => (
            <button
              key={key}
              type="button"
              disabled={isProcessing}
              onClick={() => setPaymentMethod(key)}
              style={{
                flex: 1,
                height: '28px',
                fontSize: '11px',
                fontWeight: paymentMethod === key ? 700 : 500,
                backgroundColor: paymentMethod === key ? 'var(--color-accent-solid)' : 'var(--color-bg-panel)',
                color: paymentMethod === key ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: paymentMethod === key ? '1px solid var(--color-accent-solid-hover)' : '1px solid var(--color-border-default)',
                borderRadius: '0px',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              {PAYMENT_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Approve & Complete Sale Button */}
        <button
          onClick={handleApproveSale}
          disabled={cart.length === 0 || isProcessing}
          className="desktop-btn-primary"
          style={{
            height: '36px',
            fontSize: '13px',
            borderRadius: '0px',
            width: '100%',
            gap: '6px',
            opacity: cart.length === 0 || isProcessing ? 0.6 : 1,
            boxShadow: 'none'
          }}
        >
          <CheckCircle size={16} />
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
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0px',
              width: '400px',
              padding: '20px',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch'
            }}
          >
            {showSuccessAnim ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div className="animate-success-pop" style={{ color: 'var(--color-success-text)' }}>
                  <CheckCircle size={64} />
                </div>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text-primary)' }}>Sale Successful!</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: 0 }}>
                  Amount Paid: <strong style={{ color: 'var(--color-text-accent)' }}>UGX {formatCurrency(completedSale.total_amount)}</strong>
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%' }}>
                  <button onClick={() => setShowSuccessAnim(false)} className="desktop-btn-secondary" style={{ flex: 1, height: '32px', borderRadius: '0px' }}>
                    View Receipt
                  </button>
                  <button onClick={() => setIsCheckoutOpen(false)} className="desktop-btn-primary" style={{ flex: 1, height: '32px', borderRadius: '0px' }}>
                    New Sale
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>POS RECEIPT #{completedSale.invoice_number}</span>
                  <button onClick={() => setIsCheckoutOpen(false)} style={{ border: 'none', backgroundColor: 'transparent', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} style={{ color: 'var(--color-text-muted)' }} /></button>
                </div>

                <div ref={receiptRef} style={{ padding: '8px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <div style={{ marginBottom: '4px' }}>Operator: <strong>{completedSale.username}</strong></div>
                  <div>Date: {new Date(completedSale.sale_date).toLocaleString()}</div>

                  <div style={{ margin: '16px 0', borderTop: '1px dashed var(--color-border-subtle)', borderBottom: '1px dashed var(--color-border-subtle)', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {completedSale.items?.map((it: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{it.medicine_name} <span style={{ color: 'var(--color-text-muted)' }}>x{it.quantity}</span></span>
                        <span style={{ fontWeight: 600 }}>UGX {formatCurrency(it.subtotal || (it.unit_price * it.quantity))}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: 'var(--color-accent-base)' }}>
                    <span>TOTAL PAID:</span>
                    <span>UGX {formatCurrency(completedSale.total_amount)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button onClick={handlePrintReceipt} className="desktop-btn-secondary" style={{ flex: 1, gap: '6px', height: '40px', borderRadius: '0px' }}>
                    <Printer size={16} /> Print Receipt
                  </button>
                  <button onClick={() => setIsCheckoutOpen(false)} className="desktop-btn-primary" style={{ flex: 1, height: '40px', borderRadius: '0px' }}>
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
