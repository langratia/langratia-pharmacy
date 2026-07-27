import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  CheckCircle,
  Loader,
  Clock,
  AlertTriangle,
  Receipt,
  Printer
} from 'lucide-react';
import { Medicine, Shift, ShiftZReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ListMedicines, ProcessSale, GetActiveShift, OpenShift, CloseShift } from '../../../wailsjs/go/main/App';
import { formatCurrency } from '../../utils/formatters';
import { usePharmacy } from '../../context/PharmacyContext';

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
  const { pharmacyName } = usePharmacy();
  const categories = ['All', 'General', 'Antibiotics', 'Analgesics', 'Antimalarials', 'Cardiovascular', 'Vitamins & Supplements', 'Respiratory', 'Dermatology'];
  
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Discount state
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  // Shift & Till Reconciliation state
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState<string>('50000');
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [shiftNotes, setShiftNotes] = useState<string>('');
  const [zReport, setZReport] = useState<ShiftZReport | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const zReportRef = useRef<HTMLDivElement>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Active Shift on mount
  const checkActiveShift = async () => {
    if (!user) return;
    try {
      let shift: Shift | null = null;
      try {
        shift = await GetActiveShift(user.id);
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp?.GetActiveShift) {
          shift = await wailsApp.GetActiveShift(user.id);
        }
      }
      setActiveShift(shift);
      if (!shift) {
        setIsOpenShiftModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to query shift:', err);
    }
  };

  useEffect(() => {
    checkActiveShift();
  }, [user]);

  // Global Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsDiscountModalOpen(prev => !prev);
      } else if (e.key === 'F10' || e.key === 'F12') {
        e.preventDefault();
        if (!isProcessing && cart.length > 0) {
          handleApproveSale();
        }
      } else if (e.key === 'Escape') {
        setIsDiscountModalOpen(false);
        setIsCheckoutOpen(false);
        setIsCloseShiftModalOpen(false);
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

  // Cart financial computations
  const grossTotal = cart.reduce((sum, item) => sum + (item.medicine.selling_price * item.quantity), 0);
  
  let calculatedDiscount = 0;
  if (discountAmount > 0) {
    if (discountType === 'percent') {
      calculatedDiscount = grossTotal * (discountAmount / 100);
    } else {
      calculatedDiscount = discountAmount;
    }
    if (calculatedDiscount > grossTotal) calculatedDiscount = grossTotal;
  }

  const netTotal = Math.max(0, grossTotal - calculatedDiscount);

  // Shift Management Handlers
  const handleOpenShift = async () => {
    const cash = parseFloat(openingCashInput) || 0;
    try {
      let shift: Shift | null = null;
      try {
        shift = await OpenShift(user?.id || 1, user?.username || 'cashier', cash);
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp?.OpenShift) {
          shift = await wailsApp.OpenShift(user?.id || 1, user?.username || 'cashier', cash);
        }
      }
      setActiveShift(shift);
      setIsOpenShiftModalOpen(false);
      toast.success(`Till Shift #${shift?.id || ''} opened successfully!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open shift');
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    const actual = parseFloat(actualCashInput) || 0;
    try {
      let report: ShiftZReport | null = null;
      try {
        report = await CloseShift(activeShift.id, actual, shiftNotes);
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp?.CloseShift) {
          report = await wailsApp.CloseShift(activeShift.id, actual, shiftNotes);
        }
      }
      setZReport(report);
      setActiveShift(null);
      setIsCloseShiftModalOpen(false);
      toast.success('Till Shift closed. Z-Report generated!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to close shift');
    }
  };

  const handleApproveSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!activeShift) {
      toast.error('Please open a Till Shift before processing sales');
      setIsOpenShiftModalOpen(true);
      return;
    }

    setIsProcessing(true);

    const cartInput = cart.map(item => ({
      medicine_id: item.medicine.id,
      quantity: item.quantity,
      unit_price: item.medicine.selling_price,
      prescription_id: (item as any).prescription_id || undefined
    }));

    try {
      let sale: any = null;
      try {
        sale = await ProcessSale(
          user?.id || 1,
          user?.username || 'cashier',
          cartInput as any,
          'Cash',
          discountAmount,
          discountType,
          activeShift?.id || null
        );
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.ProcessSale === 'function') {
          sale = await wailsApp.ProcessSale(
            user?.id || 1,
            user?.username || 'cashier',
            cartInput,
            'Cash',
            discountAmount,
            discountType,
            activeShift?.id || null
          );
        }
      }

      if (!sale) {
        throw new Error('Sale processing returned no result. Please try again.');
      }

      setCompletedSale(sale);
      setCart([]);
      setDiscountAmount(0);
      setIsCheckoutOpen(true);

      // Refresh medicines stock and active shift totals
      fetchMedicines();
      checkActiveShift();
    } catch (err: any) {
      toast.error(err?.message || 'Checkout failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Thermal 80mm Receipt Print Handler
  const handlePrintReceipt = () => {
    const printContents = receiptRef.current?.innerHTML;
    if (!printContents) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`
      <html><head><title>Thermal Receipt</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 11px; width: 72mm; margin: 0 auto; padding: 10px 0; color: #000; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0; }
        th, td { padding: 2px 0; font-size: 10px; }
      </style></head><body>${printContents}</body></html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  const handlePrintZReport = () => {
    const printContents = zReportRef.current?.innerHTML;
    if (!printContents) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`
      <html><head><title>Shift Z-Report</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 11px; width: 72mm; margin: 0 auto; padding: 10px 0; color: #000; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0; }
        th, td { padding: 2px 0; font-size: 10px; }
      </style></head><body>${printContents}</body></html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--color-bg-base)', overflow: 'hidden' }}>
      
      {/* LEFT MAIN PANEL: Catalog & Toolbar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Contextual Command Toolbar with Shift Status */}
        <div style={{ borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-panel)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicine by name or category... [F2]"
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 12px',
                  fontSize: '12px',
                  backgroundColor: 'var(--color-bg-input)',
                  border: '1px solid var(--color-border-default)',
                  color: 'var(--color-text-primary)',
                  outline: 'none'
                }}
              />
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {categories.slice(0, 5).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    height: '28px',
                    padding: '0 10px',
                    fontSize: '11px',
                    fontWeight: category === cat ? 700 : 500,
                    backgroundColor: category === cat ? 'var(--color-accent-solid)' : 'var(--color-bg-elevated)',
                    color: category === cat ? '#ffffff' : 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-default)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Till Shift Indicator & Close Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeShift ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', fontSize: '11px', color: 'var(--color-success-text)', fontWeight: 600 }}>
                <Clock size={13} />
                <span>SHIFT #{activeShift.id} OPEN</span>
                <span style={{ opacity: 0.7 }}>• Expected Drawer: UGX {formatCurrency(activeShift.expected_cash || activeShift.opening_cash)}</span>
                <button
                  onClick={() => {
                    setActualCashInput(activeShift.expected_cash?.toString() || '0');
                    setIsCloseShiftModalOpen(true);
                  }}
                  style={{
                    marginLeft: '6px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: 'var(--color-danger-bg)',
                    color: 'var(--color-danger-text)',
                    border: '1px solid var(--color-danger-border)',
                    cursor: 'pointer'
                  }}
                >
                  CLOSE SHIFT (Z-REPORT)
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsOpenShiftModalOpen(true)}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-warning-bg)',
                  color: 'var(--color-warning-text)',
                  border: '1px solid var(--color-warning-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <AlertTriangle size={13} />
                <span>OPEN TILL SHIFT</span>
              </button>
            )}
          </div>

        </div>

        {/* Product Catalog Grid / List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '14px',
            padding: '16px',
            alignContent: 'start'
          }}
        >
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <Loader size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--color-accent-base)' }} />
              <span>Loading catalog...</span>
            </div>
          ) : medicines.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              No medicines matching query.
            </div>
          ) : (
            medicines.map((med) => {
              const isOutOfStock = med.current_stock <= 0;
              const isLowStock = !isOutOfStock && med.current_stock <= med.reorder_level;
              const inCart = cart.find(c => c.medicine.id === med.id);

              return (
                <div
                  key={med.id}
                  onClick={() => !isOutOfStock && handleAddToCart(med)}
                  style={{
                    backgroundColor: 'var(--color-bg-panel)',
                    border: inCart ? '2px solid var(--color-accent-solid)' : '1px solid var(--color-border-default)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    opacity: isOutOfStock ? 0.5 : 1,
                    position: 'relative',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Top Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      {med.medicine_form || 'Tablet'}
                    </span>
                    {isOutOfStock ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-bg)', padding: '2px 6px' }}>OUT OF STOCK</span>
                    ) : isLowStock ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-warning-text)', backgroundColor: 'var(--color-warning-bg)', padding: '2px 6px' }}>LOW STOCK ({med.current_stock})</span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Stock: {med.current_stock}</span>
                    )}
                  </div>

                  {/* Title & Generic Name */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3, marginBottom: '2px' }}>
                      {med.name}
                    </div>
                    {med.generic_name && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        {med.generic_name} {med.dosage_strength ? `(${med.dosage_strength})` : ''}
                      </div>
                    )}
                  </div>

                  {/* Price & Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px', borderTop: '1px dashed var(--color-border-subtle)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-accent-solid)' }}>
                      UGX {formatCurrency(med.selling_price)}
                    </div>
                    <button
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(med);
                      }}
                      style={{
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: inCart ? 'var(--color-accent-solid)' : 'var(--color-bg-base)',
                        color: inCart ? '#ffffff' : 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-default)',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {inCart ? `ADD (${inCart.quantity})` : '+ ADD'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* RIGHT PANEL: Cart & Checkout Dock */}
      <div style={{ width: '380px', backgroundColor: 'var(--color-bg-panel)', borderLeft: '1px solid var(--color-border-default)', display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Cart Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-bg-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <ShoppingCart size={16} style={{ color: 'var(--color-accent-solid)' }} />
            <span>Current Order</span>
            {cart.length > 0 && (
              <span style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent-solid)', fontWeight: 700 }}>
                {cart.length} items
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              style={{ fontSize: '11px', color: 'var(--color-danger-text)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              <ShoppingCart size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>Cart is empty</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Click any drug card to add to order</div>
            </div>
          ) : (
            cart.map((item) => {
              const itemSubtotal = item.medicine.selling_price * item.quantity;
              return (
                <div
                  key={item.medicine.id}
                  style={{
                    backgroundColor: 'var(--color-bg-base)',
                    border: '1px solid var(--color-border-subtle)',
                    padding: '10px 12px',
                    marginBottom: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', flex: 1, paddingRight: '8px' }}>
                      {item.medicine.name}
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.medicine.id)}
                      style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      UGX {formatCurrency(item.medicine.selling_price)}
                    </div>
                    
                    {/* Qty Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handleUpdateQty(item.medicine.id, -1)}
                        style={{ width: '22px', height: '22px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: 700, width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.medicine.id, 1)}
                        style={{ width: '22px', height: '22px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      UGX {formatCurrency(itemSubtotal)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Financial Summary & Checkout */}
        <div style={{ borderTop: '1px solid var(--color-border-default)', padding: '16px', backgroundColor: 'var(--color-bg-elevated)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
              <span>Subtotal Gross</span>
              <span>UGX {formatCurrency(grossTotal)}</span>
            </div>

            {/* Discount Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: calculatedDiscount > 0 ? 'var(--color-success-text)' : 'var(--color-text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Discount</span>
                <button
                  onClick={() => setIsDiscountModalOpen(true)}
                  style={{ fontSize: '10px', padding: '1px 5px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border-default)', cursor: 'pointer', fontWeight: 600 }}
                >
                  [F4] EDIT
                </button>
              </div>
              <span>- UGX {formatCurrency(calculatedDiscount)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', paddingTop: '6px', borderTop: '1px dashed var(--color-border-subtle)' }}>
              <span>NET TOTAL (CASH)</span>
              <span style={{ color: 'var(--color-accent-solid)' }}>UGX {formatCurrency(netTotal)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            disabled={cart.length === 0 || isProcessing}
            onClick={handleApproveSale}
            style={{
              width: '100%',
              height: '42px',
              backgroundColor: cart.length === 0 ? 'var(--color-bg-hover)' : 'var(--color-accent-solid)',
              color: cart.length === 0 ? 'var(--color-text-muted)' : '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 800,
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isProcessing ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <>
                <CheckCircle size={16} />
                <span>APPROVE SALE (F10)</span>
              </>
            )}
          </button>

        </div>

      </div>

      {/* MODAL: OPEN SHIFT (Starting Float Cash) */}
      {isOpenShiftModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '380px', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', padding: '24px', boxShadow: 'var(--shadow-dropdown)' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Open Till Shift
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Enter your starting drawer float cash to begin processing cash sales for this shift.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                STARTING CASH FLOAT (UGX)
              </label>
              <input
                type="number"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                style={{ width: '100%', height: '36px', padding: '0 12px', fontSize: '14px', fontWeight: 700, backgroundColor: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', outline: 'none' }}
              />
            </div>

            <button
              onClick={handleOpenShift}
              style={{ width: '100%', height: '38px', backgroundColor: 'var(--color-accent-solid)', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
            >
              START SHIFT & BEGIN SALES
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CLOSE SHIFT (Z-REPORT) */}
      {isCloseShiftModalOpen && activeShift && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '420px', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', padding: '24px', boxShadow: 'var(--shadow-dropdown)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Close Till Shift #{activeShift.id}
              </div>
              <button onClick={() => setIsCloseShiftModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <div style={{ fontSize: '12px', backgroundColor: 'var(--color-bg-base)', padding: '10px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Opening Float:</strong> UGX {formatCurrency(activeShift.opening_cash)}</div>
              <div><strong>Expected Cash in Till:</strong> UGX {formatCurrency(activeShift.expected_cash || activeShift.opening_cash)}</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                ACTUAL CASH COUNTED IN DRAWER (UGX)
              </label>
              <input
                type="number"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                placeholder="Enter physical cash counted..."
                style={{ width: '100%', height: '36px', padding: '0 12px', fontSize: '14px', fontWeight: 700, backgroundColor: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                SHIFT NOTES / VARIANCE REASON (OPTIONAL)
              </label>
              <input
                type="text"
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="e.g., Minor change discrepancy"
                style={{ width: '100%', height: '32px', padding: '0 10px', fontSize: '12px', backgroundColor: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', outline: 'none' }}
              />
            </div>

            <button
              onClick={handleCloseShift}
              style={{ width: '100%', height: '38px', backgroundColor: 'var(--color-danger-text)', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
            >
              CLOSE SHIFT & PRINT Z-REPORT
            </button>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DISCOUNT [F4] */}
      {isDiscountModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '340px', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', padding: '20px', boxShadow: 'var(--shadow-dropdown)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Cart Discount Adjustment
              </div>
              <button onClick={() => setIsDiscountModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            {/* Discount Type Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => setDiscountType('fixed')}
                style={{ padding: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: discountType === 'fixed' ? 'var(--color-accent-solid)' : 'var(--color-bg-base)', color: discountType === 'fixed' ? '#ffffff' : 'var(--color-text-primary)', border: '1px solid var(--color-border-default)', cursor: 'pointer' }}
              >
                Fixed UGX
              </button>
              <button
                onClick={() => setDiscountType('percent')}
                style={{ padding: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: discountType === 'percent' ? 'var(--color-accent-solid)' : 'var(--color-bg-base)', color: discountType === 'percent' ? '#ffffff' : 'var(--color-text-primary)', border: '1px solid var(--color-border-default)', cursor: 'pointer' }}
              >
                Percentage (%)
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder={discountType === 'percent' ? 'Enter % off...' : 'Enter amount in UGX...'}
                style={{ width: '100%', height: '36px', padding: '0 12px', fontSize: '14px', fontWeight: 700, backgroundColor: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', outline: 'none' }}
              />
            </div>

            <button
              onClick={() => setIsDiscountModalOpen(false)}
              style={{ width: '100%', height: '36px', backgroundColor: 'var(--color-accent-solid)', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
            >
              APPLY DISCOUNT
            </button>
          </div>
        </div>
      )}

      {/* MODAL: COMPLETED SALE & THERMAL RECEIPT */}
      {isCheckoutOpen && completedSale && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '380px', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', padding: '24px', boxShadow: 'var(--shadow-dropdown)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <CheckCircle size={40} style={{ color: 'var(--color-success-text)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Transaction Complete</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{completedSale.invoice_number}</div>
            </div>

            {/* Hidden Printable Thermal Receipt Template (80mm) */}
            <div style={{ display: 'none' }}>
              <div ref={receiptRef}>
                <div className="text-center bold">{pharmacyName || 'LANGRATIA PHARMACY'}</div>
                <div className="text-center">Official Sales Receipt</div>
                <div className="divider"></div>
                <div>Invoice: {completedSale.invoice_number}</div>
                <div>Date: {new Date().toLocaleString()}</div>
                <div>Cashier: {completedSale.username || user?.username}</div>
                <div>Payment Method: Cash</div>
                <div className="divider"></div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Item</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedSale.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{item.medicine_name}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="divider"></div>
                {completedSale.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discount:</span>
                    <span>- UGX {formatCurrency(completedSale.discount_amount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '4px' }}>
                  <span>NET TOTAL (CASH):</span>
                  <span>UGX {formatCurrency(completedSale.total_amount)}</span>
                </div>
                <div className="divider"></div>
                <div className="text-center" style={{ marginTop: '8px' }}>Thank you for visiting!</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={handlePrintReceipt}
                style={{ flex: 1, height: '38px', backgroundColor: 'var(--color-accent-solid)', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>PRINT RECEIPT (80mm)</span>
              </button>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                style={{ height: '38px', padding: '0 16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border-default)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
              >
                CLOSE
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Z-REPORT DISPLAY */}
      {zReport && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '400px', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', padding: '24px', boxShadow: 'var(--shadow-dropdown)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Receipt size={36} style={{ color: 'var(--color-accent-solid)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Shift Z-Report Summary</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Shift #{zReport.shift.id} • Cashier: {zReport.shift.username}</div>
            </div>

            {/* Hidden Printable Z-Report Template (80mm) */}
            <div style={{ display: 'none' }}>
              <div ref={zReportRef}>
                <div className="text-center bold">{pharmacyName || 'LANGRATIA PHARMACY'}</div>
                <div className="text-center bold">Z-REPORT SHIFT RECONCILIATION</div>
                <div className="divider"></div>
                <div>Shift ID: #{zReport.shift.id}</div>
                <div>Cashier: {zReport.shift.username}</div>
                <div>Opened: {new Date(zReport.shift.started_at).toLocaleString()}</div>
                <div>Closed: {zReport.shift.ended_at ? new Date(zReport.shift.ended_at).toLocaleString() : ''}</div>
                <div className="divider"></div>
                <div>Opening Float: UGX {formatCurrency(zReport.shift.opening_cash)}</div>
                <div>Cash Sales: UGX {formatCurrency(zReport.cash_sales_total)}</div>
                <div className="divider"></div>
                <div>Gross Sales: UGX {formatCurrency(zReport.gross_sales_total)}</div>
                <div>Discounts: UGX {formatCurrency(zReport.total_discounts)}</div>
                <div>NET SALES: UGX {formatCurrency(zReport.net_sales_total)}</div>
                <div className="divider"></div>
                <div>Expected Cash in Drawer: UGX {formatCurrency(zReport.expected_drawer)}</div>
                <div>Actual Cash Counted: UGX {formatCurrency(zReport.actual_drawer)}</div>
                <div style={{ fontWeight: 'bold' }}>CASH VARIANCE: UGX {formatCurrency(zReport.cash_variance)}</div>
                <div className="divider"></div>
                <div className="text-center">End of Shift Reconciliation</div>
              </div>
            </div>

            <div style={{ fontSize: '12px', backgroundColor: 'var(--color-bg-base)', padding: '12px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Opening Cash Float:</span> <strong>UGX {formatCurrency(zReport.shift.opening_cash)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Net Cash Sales:</span> <strong>UGX {formatCurrency(zReport.net_sales_total)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Expected Drawer:</span> <strong>UGX {formatCurrency(zReport.expected_drawer)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Actual Counted:</span> <strong>UGX {formatCurrency(zReport.actual_drawer)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: zReport.cash_variance < 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)', fontWeight: 800, borderTop: '1px dashed var(--color-border-subtle)', paddingTop: '4px' }}>
                <span>CASH VARIANCE:</span>
                <span>UGX {formatCurrency(zReport.cash_variance)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handlePrintZReport}
                style={{ flex: 1, height: '38px', backgroundColor: 'var(--color-accent-solid)', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>PRINT Z-REPORT</span>
              </button>
              <button
                onClick={() => setZReport(null)}
                style={{ height: '38px', padding: '0 16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border-default)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
              >
                CLOSE
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
