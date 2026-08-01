import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  CheckCircle,
  Loader,
  Printer,
  Search,
  Banknote,
  Smartphone,
  AlertCircle,
  List,
} from 'lucide-react';
import { Medicine } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ListMedicines, ProcessSale } from '../../../wailsjs/go/main/App';
import { formatCurrency } from '../../utils/formatters';
import { usePharmacy } from '../../context/PharmacyContext';
import { Modal } from '../../components/ui/Modal';

interface CartItem { medicine: Medicine; quantity: number; }
interface POSPageProps { externalCartItems?: CartItem[]; onClearExternalCart?: () => void; }

type PaymentMethod = 'Cash' | 'MobileMoney';

const modalTitle = (text: string) => (
  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px', letterSpacing: '-0.2px' }}>{text}</h2>
);
const modalSub = (text: string) => (
  <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>{text}</p>
);
const modalInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    style={{ width: '100%', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--ink)', outline: 'none', minHeight: 'unset', boxSizing: 'border-box', ...props.style }}
    onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(18,108,255,0.2)'; props.onFocus?.(e); }}
    onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; props.onBlur?.(e); }}
  />
);

export const POSPage: React.FC<POSPageProps> = ({ externalCartItems, onClearExternalCart }) => {
  const { user } = useAuth();
  const { pharmacyName } = usePharmacy();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isTenderOpen, setIsTenderOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [catalogView, setCatalogView] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('pos_catalog_view') as 'grid' | 'table') || 'grid';
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  /* ── Debounce search ─────────────────────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── Dynamic Category Extraction (UX-2) ───────────────────────────── */
  useEffect(() => {
    if (medicines.length > 0) {
      const extracted = Array.from(new Set(medicines.map(m => m.category).filter(Boolean)));
      setCategories(['All', ...extracted.sort()]);
    }
  }, [medicines]);

  /* ── Keyboard shortcuts ──────────────────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
      else if (e.key === 'F4') { e.preventDefault(); setIsDiscountModalOpen(prev => !prev); }
      else if (e.key === 'F10' || e.key === 'F12') { e.preventDefault(); if (!isProcessing && cart.length > 0) openTender(); }
      else if (e.key === 'Escape') { setIsDiscountModalOpen(false); setIsReceiptOpen(false); setIsTenderOpen(false); setIsClearConfirmOpen(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, cart.length]);

  /* ── External cart (from prescriptions) ─────────────────────────── */
  useEffect(() => {
    if (externalCartItems && externalCartItems.length > 0) {
      setCart(externalCartItems);
      onClearExternalCart?.();
    }
  }, [externalCartItems]);

  /* ── Fetch medicines (uses debouncedSearch — fix #18) ────────────── */
  const fetchMedicines = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: Medicine[] = [];
      try { data = await ListMedicines(debouncedSearch, category === 'All' ? '' : category, false); }
      catch { const w = (window as any)?.go?.main?.App; if (w?.ListMedicines) data = await w.ListMedicines(debouncedSearch, category === 'All' ? '' : category, false); }
      setMedicines(data?.length > 0 ? data : []);
    } catch (err: any) { console.error(err); toast.error('Failed to load medicines'); }
    finally { setIsLoading(false); }
  }, [debouncedSearch, category]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  /* ── Cart operations ─────────────────────────────────────────────── */
  const handleAddToCart = (med: Medicine) => {
    if (med.current_stock <= 0) { toast.error(`${med.name} is out of stock!`); return; }
    setCart(prev => {
      const existing = prev.find(i => i.medicine.id === med.id);
      if (existing) {
        if (existing.quantity >= med.current_stock) { toast.error(`Maximum stock reached for ${med.name}`); return prev; }
        return prev.map(i => i.medicine.id === med.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { medicine: med, quantity: 1 }];
    });
  };

  const handleUpdateQty = (medId: number, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.medicine.id === medId);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) { toast.success(`${item.medicine.name} removed`); return prev.filter(i => i.medicine.id !== medId); }
      if (newQty > item.medicine.current_stock) { toast.error('Stock limit reached'); return prev; }
      return prev.map(i => i.medicine.id === medId ? { ...i, quantity: newQty } : i);
    });
  };

  const handleRemoveFromCart = (medId: number) => setCart(prev => prev.filter(i => i.medicine.id !== medId));

  /* ── Totals ──────────────────────────────────────────────────────── */
  const grossTotal = cart.reduce((sum, item) => sum + (item.medicine.selling_price * item.quantity), 0);
  let calculatedDiscount = 0;
  if (discountAmount > 0) {
    calculatedDiscount = discountType === 'percent' ? grossTotal * (discountAmount / 100) : discountAmount;
    if (calculatedDiscount > grossTotal) calculatedDiscount = grossTotal;
  }
  const netTotal = Math.max(0, grossTotal - calculatedDiscount);
  const tendered = parseFloat(tenderedAmount) || 0;
  const change = Math.max(0, tendered - netTotal);

  /* ── Open tender / checkout modal ───────────────────────────────── */
  const openTender = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    setTenderedAmount(String(netTotal));
    setIsTenderOpen(true);
  };

  /* ── Process sale (UX-3 Tender Validation) ────────────────────────── */
  const handleConfirmSale = async () => {
    if (paymentMethod === 'Cash' && tendered < netTotal) {
      toast.error(`Tendered amount (${tendered}) is less than total payable (${netTotal})`);
      return;
    }

    setIsProcessing(true);
    const cartInput = cart.map(item => ({ medicine_id: item.medicine.id, quantity: item.quantity, unit_price: item.medicine.selling_price, prescription_id: (item as any).prescription_id || undefined }));
    try {
      let sale: any = null;
      try { sale = await ProcessSale(user?.id || 1, user?.username || 'cashier', cartInput as any, paymentMethod, discountAmount, discountType, null); }
      catch { const w = (window as any)?.go?.main?.App; if (w?.ProcessSale) sale = await w.ProcessSale(user?.id || 1, user?.username || 'cashier', cartInput, paymentMethod, discountAmount, discountType, null); }
      if (!sale) throw new Error('Sale processing returned no result.');
      setCompletedSale({ ...sale, tendered, change, paymentMethod });
      setCart([]); setDiscountAmount(0); setIsTenderOpen(false); setIsReceiptOpen(true);
      fetchMedicines();
    } catch (err: any) { toast.error(err?.message || 'Checkout failed.'); }
    finally { setIsProcessing(false); }
  };

  /* ── Print helper (UX-6 Safe iframe print) ─────────────────────────── */
  const printIframe = (ref: React.RefObject<HTMLDivElement | null>, title: string) => {
    const contents = ref.current?.innerHTML;
    if (!contents) return;
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'absolute', width: '0', height: '0', border: 'none' });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title.replace(/</g, '&lt;')}</title><style>@page{size:80mm auto;margin:0}body{font-family:'Courier New',monospace;font-size:11px;width:72mm;margin:0 auto;padding:10px 0;color:#000}.text-center{text-align:center}.text-right{text-align:right}.bold{font-weight:bold}.divider{border-top:1px dashed #000;margin:6px 0}table{width:100%;border-collapse:collapse;margin:6px 0}th,td{padding:2px 0;font-size:10px}</style></head><body>${contents}</body></html>`);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  /* ── RENDER ─────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, height: '100%', maxHeight: '100%', overflow: 'hidden', gap: '0' }}>

      {/* ── LEFT: Catalog ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden', marginRight: '16px' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', flexShrink: 0 }}>

          {/* Row 1: Search + Toggle (same flex line) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>

            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: '160px', maxWidth: '320px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-dark)', display: 'flex', pointerEvents: 'none' }}>
                <Search size={15} />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicines… [F2]"
                style={{ width: '100%', height: '40px', padding: '0 12px 0 38px', fontSize: '14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', minHeight: 'unset' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(18,108,255,0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* View Toggle — immediately right of search */}
            <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', padding: '3px', gap: '2px', flexShrink: 0 }}>
              <button
                title="Grid view"
                onClick={() => { setCatalogView('grid'); localStorage.setItem('pos_catalog_view', 'grid'); }}
                style={{
                  width: '34px', height: '34px', padding: '0',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: catalogView === 'grid' ? 'var(--blue)' : 'transparent',
                  color: catalogView === 'grid' ? '#fff' : 'var(--muted)',
                  transition: 'all 0.15s ease', minHeight: 'unset', transform: 'none',
                  boxShadow: 'none', overflow: 'visible', flexShrink: 0,
                }}
              >
                {/* Grid icon — inline SVG avoids any lucide rendering issues */}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              </button>
              <button
                title="Table view"
                onClick={() => { setCatalogView('table'); localStorage.setItem('pos_catalog_view', 'table'); }}
                style={{
                  width: '34px', height: '34px', padding: '0',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: catalogView === 'table' ? 'var(--blue)' : 'transparent',
                  color: catalogView === 'table' ? '#fff' : 'var(--muted)',
                  transition: 'all 0.15s ease', minHeight: 'unset', transform: 'none',
                  boxShadow: 'none', overflow: 'visible', flexShrink: 0,
                }}
              >
                {/* List icon — inline SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="18" r="1" fill="currentColor" stroke="none"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Category chips — own full-width row below search+toggle */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flexBasis: '100%', width: '100%', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '0 12px', height: '36px', fontSize: '12px', fontWeight: 600,
                  background: category === cat ? 'var(--blue)' : 'var(--surface)',
                  color: category === cat ? '#fff' : 'var(--muted)',
                  border: category === cat ? '1px solid var(--blue)' : '1px solid var(--line)',
                  borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease', minHeight: 'unset',
                  transform: 'none', boxShadow: 'none', flexShrink: 0,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Product Catalog — Grid or Table */}
        {catalogView === 'grid' ? (
          /* ── Grid View ── */
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '14px', alignContent: 'start', paddingBottom: '24px' }}>
              {isLoading ? (
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '14px', color: 'var(--muted)' }}>
                  <Loader size={28} className="animate-spin" style={{ color: 'var(--blue)' }} />
                  <span style={{ fontSize: '14px' }}>Loading catalog…</span>
                </div>
              ) : medicines.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1/-1', border: 'none', background: 'transparent', boxShadow: 'none', padding: '80px 20px' }}>
                  <Search size={40} />
                  <h3>No medicines found</h3>
                  <p>Try a different search term or category.</p>
                </div>
              ) : (
                medicines.map(med => {
                  const isOutOfStock = med.current_stock <= 0;
                  const isLowStock = !isOutOfStock && med.current_stock <= med.reorder_level;
                  const inCart = cart.find(c => c.medicine.id === med.id);

                  return (
                    <div
                      key={med.id}
                      onClick={() => !isOutOfStock && handleAddToCart(med)}
                      className={isLowStock ? 'product-card low-stock' : inCart ? 'product-card selected' : 'product-card'}
                      style={{ opacity: isOutOfStock ? 0.45 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                    >
                      {/* Badges row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '6px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          {med.medicine_form || 'Tablet'}
                        </span>
                        {isOutOfStock ? (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--red)', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', padding: '3px 8px', borderRadius: '6px' }}>OUT</span>
                        ) : isLowStock ? (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--yellow)', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', padding: '3px 8px', borderRadius: '6px' }}>LOW·{med.current_stock}</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--muted-dark)' }}>×{med.current_stock}</span>
                        )}
                      </div>

                      {/* Name — clamped to 2 lines */}
                      <div style={{ width: '100%', textAlign: 'center', minHeight: '42px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {med.name}
                        </div>
                        {med.generic_name && (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {med.generic_name}{med.dosage_strength ? ` (${med.dosage_strength})` : ''}
                          </div>
                        )}
                      </div>

                      {/* Price + Add button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--blue)' }}>
                          {formatCurrency(med.selling_price)}
                        </span>
                        <button
                          disabled={isOutOfStock}
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(med); }}
                          style={{
                            height: '30px', padding: '0 12px', fontSize: '12px', fontWeight: 700,
                            borderRadius: '8px', border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                            background: inCart ? 'var(--blue)' : 'var(--surface-soft)',
                            color: inCart ? '#fff' : 'var(--ink)',
                            transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                            minHeight: 'unset', transform: 'none', boxShadow: 'none',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {inCart ? `+${inCart.quantity}` : '+ Add'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* ── Table View ── */
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '14px', color: 'var(--muted)' }}>
                <Loader size={28} className="animate-spin" style={{ color: 'var(--blue)' }} />
                <span style={{ fontSize: '14px' }}>Loading catalog…</span>
              </div>
            ) : medicines.length === 0 ? (
              <div className="empty-state" style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '80px 20px' }}>
                <Search size={40} />
                <h3>No medicines found</h3>
                <p>Try a different search term or category.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-soft)', zIndex: 1, borderBottom: '1px solid var(--line-strong)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name & generic</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Form & Category</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map(med => {
                    const isOutOfStock = med.current_stock <= 0;
                    const isLowStock = !isOutOfStock && med.current_stock <= med.reorder_level;
                    const inCart = cart.find(c => c.medicine.id === med.id);

                    return (
                      <tr
                        key={med.id}
                        onClick={() => !isOutOfStock && handleAddToCart(med)}
                        style={{
                          borderBottom: '1px solid var(--line)',
                          background: inCart ? 'var(--overlay-active)' : 'transparent',
                          opacity: isOutOfStock ? 0.45 : 1,
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => { if (!inCart && !isOutOfStock) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                        onMouseLeave={(e) => { if (!inCart && !isOutOfStock) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>{med.name}</div>
                          {med.generic_name && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{med.generic_name} {med.dosage_strength}</div>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '12px', padding: '2px 8px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '6px', color: 'var(--muted)' }}>
                            {med.medicine_form || 'Tablet'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {isOutOfStock ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--red)' }}>OUT OF STOCK</span>
                          ) : isLowStock ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--yellow)' }}>LOW ({med.current_stock})</span>
                          ) : (
                            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{med.current_stock}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 800, color: 'var(--blue)' }}>
                          {formatCurrency(med.selling_price)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            disabled={isOutOfStock}
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(med); }}
                            style={{
                              height: '30px', padding: '0 12px', fontSize: '12px', fontWeight: 700,
                              borderRadius: '8px', border: '1px solid var(--line)', cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                              background: inCart ? 'var(--blue)' : 'var(--surface)',
                              color: inCart ? '#fff' : 'var(--ink)',
                              display: 'inline-flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            {inCart ? (
                              <><Plus size={12} />{inCart.quantity} in cart</>
                            ) : (
                              <><Plus size={12} />Add</>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Cart & Checkout Dock ───────────────────────────────── */}
      <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>

        {/* Cart Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-soft)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={18} style={{ color: 'var(--blue)' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>Current Order</span>
            {cart.length > 0 && (
              <span style={{ fontSize: '12px', padding: '2px 8px', background: 'rgba(18,108,255,0.12)', border: '1px solid rgba(18,108,255,0.25)', color: 'var(--blue)', borderRadius: '20px', fontWeight: 700 }}>
                {cart.length}
              </span>
            )}
          </div>
          {/* Actions: View All & Clear */}
          {cart.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={openTender}
                style={{ fontSize: '12px', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, minHeight: 'unset', height: 'auto', padding: '4px 0', transform: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="View full cart list"
              >
                <List size={14} /> View
              </button>
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                style={{ fontSize: '12px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, minHeight: 'unset', height: 'auto', padding: '4px 0', transform: 'none', boxShadow: 'none' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            // Empty state — uses .empty-state class (fix #14)
            <div className="empty-state" style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '48px 16px' }}>
              <ShoppingCart size={40} />
              <h3>Cart is empty</h3>
              <p>Click any medicine card to add it here.</p>
            </div>
          ) : (
            cart.map(item => {
              const subtotal = item.medicine.selling_price * item.quantity;
              return (
                <div
                  key={item.medicine.id}
                  style={{ background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '10px', padding: '12px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', flex: 1, paddingRight: '8px', lineHeight: 1.3 }}>{item.medicine.name}</div>
                    <button
                      onClick={() => handleRemoveFromCart(item.medicine.id)}
                      style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', minHeight: 'unset', height: 'auto', transform: 'none', boxShadow: 'none', flexShrink: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>UGX {formatCurrency(item.medicine.selling_price)}</span>

                    {/* Qty controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: '8px', padding: '3px' }}>
                      <button
                        title="Reduce quantity"
                        onClick={() => handleUpdateQty(item.medicine.id, -1)}
                        style={{
                          width: '32px', height: '32px', border: '1px solid var(--line)', background: 'var(--surface-soft)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--ink)', borderRadius: '6px', minHeight: 'unset', transform: 'none', boxShadow: 'none',
                          transition: 'all 0.15s ease', padding: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--overlay-active)'; e.currentTarget.style.borderColor = 'var(--blue)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-soft)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: 700, width: '28px', textAlign: 'center', color: 'var(--ink)' }}>{item.quantity}</span>
                      <button
                        title="Increase quantity"
                        onClick={() => handleUpdateQty(item.medicine.id, 1)}
                        style={{
                          width: '32px', height: '32px', border: '1px solid var(--line)', background: 'var(--surface-soft)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--ink)', borderRadius: '6px', minHeight: 'unset', transform: 'none', boxShadow: 'none',
                          transition: 'all 0.15s ease', padding: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--overlay-active)'; e.currentTarget.style.borderColor = 'var(--blue)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-soft)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>

                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>UGX {formatCurrency(subtotal)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Financial Summary & Checkout */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '18px 20px', background: 'var(--surface-soft)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
              <span>Subtotal</span>
              <span>UGX {formatCurrency(grossTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: calculatedDiscount > 0 ? 'var(--green)' : 'var(--muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Discount</span>
                <button
                  onClick={() => setIsDiscountModalOpen(true)}
                  style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', cursor: 'pointer', color: 'var(--muted)', fontWeight: 600, minHeight: 'unset', height: 'auto', transform: 'none', boxShadow: 'none' }}
                >
                  F4 Edit
                </button>
              </div>
              <span>- UGX {formatCurrency(calculatedDiscount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 800, color: 'var(--ink)', paddingTop: '10px', borderTop: '1px solid var(--line)', letterSpacing: '-0.3px' }}>
              <span>Total</span>
              <span style={{ color: 'var(--blue)' }}>UGX {formatCurrency(netTotal)}</span>
            </div>
          </div>

          <button
            disabled={cart.length === 0 || isProcessing}
            onClick={openTender}
            style={{ width: '100%', height: '50px', background: cart.length === 0 ? 'var(--surface-soft)' : 'var(--blue)', color: cart.length === 0 ? 'var(--muted)' : '#fff', border: cart.length === 0 ? '1px solid var(--line)' : 'none', borderRadius: 'var(--r)', fontSize: '15px', fontWeight: 800, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
            onMouseEnter={(e) => { if (cart.length > 0 && !isProcessing) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-blue)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <CheckCircle size={18} /> Checkout (F10)
          </button>
        </div>
      </div>

      {/* ── MODAL: Clear Cart Confirmation (fix #8) ───────────────────── */}
      {isClearConfirmOpen && (
        <Modal onClose={() => setIsClearConfirmOpen(false)} width={360}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={26} style={{ color: 'var(--red)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>Clear cart?</h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>This will remove all {cart.length} item{cart.length > 1 ? 's' : ''} from the current order. This cannot be undone.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setIsClearConfirmOpen(false)} className="btn" style={{ flex: 1, height: '44px' }}>Cancel</button>
            <button
              onClick={() => { setCart([]); setDiscountAmount(0); setIsClearConfirmOpen(false); toast.success('Cart cleared'); }}
              className="btn btn-danger"
              style={{ flex: 1, height: '44px', fontWeight: 700 }}
            >
              Clear Cart
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Discount Editor [F4] ───────────────────────────────── */}
      {isDiscountModalOpen && (
        <Modal onClose={() => setIsDiscountModalOpen(false)} width={360}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            {modalTitle('Cart Discount')}
            <button onClick={() => setIsDiscountModalOpen(false)} className="win-btn"><X size={16} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {(['fixed', 'percent'] as const).map(type => (
              <button
                key={type}
                onClick={() => { setDiscountType(type); setDiscountError(''); setDiscountAmount(0); }}
                style={{ padding: '10px', fontSize: '13px', fontWeight: 700, background: discountType === type ? 'var(--blue)' : 'var(--surface-soft)', color: discountType === type ? '#fff' : 'var(--muted)', border: discountType === type ? '1px solid var(--blue)' : '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', minHeight: 'unset', height: 'auto', transform: 'none', boxShadow: 'none' }}
              >
                {type === 'fixed' ? 'Fixed UGX' : 'Percentage %'}
              </button>
            ))}
          </div>

          {/* Discount input with validation (fix #9) */}
          <div style={{ marginBottom: '8px' }}>
            {modalInput({
              type: 'number',
              value: discountAmount,
              min: 0,
              max: discountType === 'percent' ? 100 : undefined,
              onChange: (e) => {
                const val = parseFloat(e.target.value) || 0;
                if (discountType === 'percent' && val > 100) {
                  setDiscountError('Percentage cannot exceed 100%');
                  setDiscountAmount(100);
                } else if (val < 0) {
                  setDiscountError('Cannot be negative');
                  setDiscountAmount(0);
                } else {
                  setDiscountError('');
                  setDiscountAmount(val);
                }
              },
              placeholder: discountType === 'percent' ? 'Enter % off (0–100)…' : 'Enter amount in UGX…',
              autoFocus: true,
              style: { fontSize: '16px', fontWeight: 700, borderColor: discountError ? 'var(--red)' : undefined },
            })}
          </div>
          {discountError && (
            <p style={{ fontSize: '12px', color: 'var(--red)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={13} /> {discountError}
            </p>
          )}
          {discountAmount > 0 && !discountError && (
            <p style={{ fontSize: '12px', color: 'var(--green)', marginBottom: '12px' }}>
              Saves UGX {formatCurrency(discountType === 'percent' ? grossTotal * (discountAmount / 100) : discountAmount)}
            </p>
          )}

          <button
            onClick={() => setIsDiscountModalOpen(false)}
            style={{ width: '100%', height: '44px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease', marginTop: discountError ? '0' : '12px' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-blue)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            Apply Discount
          </button>
        </Modal>
      )}

      {/* ── MODAL: Tender / Checkout Confirmation ────────── */}
      {isTenderOpen && (
        <Modal onClose={() => !isProcessing && setIsTenderOpen(false)} width={600}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            {modalTitle('Order & Payment Confirmation')}
            {!isProcessing && <button onClick={() => setIsTenderOpen(false)} className="win-btn"><X size={16} /></button>}
          </div>
          {modalSub('Review items being purchased and confirm sale.')}

          {/* Itemized Cart List Preview */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '16px',
            maxHeight: '400px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Item Description ({cart.length})</span>
              <span>Subtotal</span>
            </div>
            {cart.map((item, idx) => {
              const itemTotal = item.medicine.selling_price * item.quantity;
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: idx < cart.length - 1 ? '1px dashed var(--line)' : 'none', paddingBottom: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{item.medicine.name}</span>
                    <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {item.quantity} × UGX {formatCurrency(item.medicine.selling_price)}
                    </span>
                  </div>
                  <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    UGX {formatCurrency(itemTotal)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Order financial totals summary */}
          <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '10px', padding: '14px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
              <span>Subtotal</span><span className="tabular-nums">UGX {formatCurrency(grossTotal)}</span>
            </div>
            {calculatedDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)' }}>
                <span>Discount</span><span className="tabular-nums">- UGX {formatCurrency(calculatedDiscount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', color: 'var(--ink)', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
              <span>Total Payable</span><span className="tabular-nums" style={{ color: 'var(--blue)' }}>UGX {formatCurrency(netTotal)}</span>
            </div>
          </div>

          <button
            disabled={isProcessing}
            onClick={handleConfirmSale}
            style={{ width: '100%', height: '50px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: '15px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => { if (!isProcessing) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-blue)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {isProcessing ? <><Loader size={18} className="animate-spin" /> Processing…</> : <><CheckCircle size={18} /> Confirm & Complete Sale</>}
          </button>
        </Modal>
      )}

      {/* ── MODAL: Sale Complete + Receipt ───────────────────────────── */}
      {isReceiptOpen && completedSale && (
        <Modal onClose={() => setIsReceiptOpen(false)} width={400}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <CheckCircle size={52} style={{ color: 'var(--green)', margin: '0 auto 12px', animation: 'successPop 0.3s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>Transaction Complete</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>{completedSale.invoice_number}</p>
          </div>

          {/* Summary panel visible in modal */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '14px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
              <span>Payment</span><span style={{ fontWeight: 600, color: 'var(--ink)' }}>{completedSale.paymentMethod === 'MobileMoney' ? 'Mobile Money' : 'Cash'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px', color: 'var(--ink)', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
              <span>Total Paid</span><span style={{ color: 'var(--green)' }}>UGX {formatCurrency(completedSale.total_amount)}</span>
            </div>
            {completedSale.paymentMethod === 'Cash' && completedSale.change > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--blue)' }}>
                <span>Change Given</span><span>UGX {formatCurrency(completedSale.change)}</span>
              </div>
            )}
          </div>

          {/* Hidden printable receipt */}
          <div style={{ display: 'none' }}>
            <div ref={receiptRef}>
              <div className="text-center bold">{pharmacyName || 'LANGRATIA PHARMACY'}</div>
              <div className="text-center">Official Sales Receipt</div>
              <div className="divider" />
              <div>Invoice: {completedSale.invoice_number}</div>
              <div>Date: {new Date().toLocaleString()}</div>
              <div>Cashier: {completedSale.username || user?.username}</div>
              <div>Payment: {completedSale.paymentMethod === 'MobileMoney' ? 'Mobile Money' : 'Cash'}</div>
              <div className="divider" />
              <table>
                <thead><tr><th style={{ textAlign: 'left' }}>Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {completedSale.items?.map((item: any, idx: number) => (
                    <tr key={idx}><td>{item.medicine_name}</td><td style={{ textAlign: 'center' }}>{item.quantity}</td><td style={{ textAlign: 'right' }}>{formatCurrency(item.subtotal)}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="divider" />
              {completedSale.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount:</span><span>- UGX {formatCurrency(completedSale.discount_amount)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span>NET TOTAL:</span><span>UGX {formatCurrency(completedSale.total_amount)}</span></div>
              {completedSale.paymentMethod === 'Cash' && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tendered:</span><span>UGX {formatCurrency(completedSale.tendered)}</span></div>}
              {completedSale.change > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Change:</span><span>UGX {formatCurrency(completedSale.change)}</span></div>}
              <div className="divider" />
              <div className="text-center">Thank you for visiting!</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              onClick={() => printIframe(receiptRef, 'Thermal Receipt')}
              className="btn btn-primary"
              style={{ flex: 1, height: '46px', fontSize: '14px', borderRadius: 'var(--r)' }}
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={() => setIsReceiptOpen(false)}
              className="btn"
              style={{ height: '46px', padding: '0 20px', borderRadius: 'var(--r)', fontSize: '14px' }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
};
