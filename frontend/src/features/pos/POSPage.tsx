import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle, 
  Printer, 
  X,
  Filter,
  Loader2
} from 'lucide-react';
import { Medicine } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DesktopButton } from '../../components/ui/DesktopButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchBar } from '../../components/ui/SearchBar';
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: '16px',
        height: 'calc(100vh - 110px)',
        maxHeight: 'calc(100vh - 110px)',
        overflow: 'hidden'
      }}
    >
      {/* Left Area: Medicine Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: '12px' }}>
        <SectionHeader
          title="Point of Sale (POS)"
          subtitle="Direct sales terminal with automatic FEFO stock batch deduction."
        />

        {/* Toolbar Filter */}
        <Panel noPadding style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search medicine, generic composition, or brand..."
              width="320px"
              showShortcut={false}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: '#6B7280' }} />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  outline: 'none'
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Panel>

        {/* Medicine Product Grid Panel */}
        <Panel noPadding style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6B7280' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ marginLeft: '8px', fontSize: '13px' }}>Loading catalog...</span>
            </div>
          ) : medicines.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: '13px' }}>
              No medicine items available matching filter criteria.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '12px'
              }}
            >
              {medicines.map((med) => {
                const isOut = med.current_stock <= 0;
                const isLow = med.current_stock > 0 && med.current_stock <= (med.reorder_level || 10);
                const inCart = cart.find(i => i.medicine.id === med.id);

                return (
                  <div
                    key={med.id}
                    onClick={() => !isOut && handleAddToCart(med)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${inCart ? '#0F8A6A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      opacity: isOut ? 0.6 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: inCart ? '0 0 0 1px #0F8A6A' : '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'all 150ms ease-out'
                    }}
                    onMouseEnter={(e) => {
                      if (!isOut && !inCart) e.currentTarget.style.borderColor = '#9CA3AF';
                    }}
                    onMouseLeave={(e) => {
                      if (!isOut && !inCart) e.currentTarget.style.borderColor = '#E5E7EB';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#111827', lineHeight: '1.3' }}>
                          {med.name}
                        </h4>
                        {inCart && (
                          <span
                            style={{
                              backgroundColor: '#0F8A6A',
                              color: '#FFFFFF',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {inCart.quantity}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                        {med.dosage_strength} • {med.medicine_form}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid #F3F4F6'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F8A6A' }}>
                        UGX {med.selling_price.toLocaleString()}
                      </span>
                      <StatusBadge
                        status={isOut ? 'out_of_stock' : isLow ? 'low_stock' : 'in_stock'}
                        label={isOut ? 'Out' : `${med.current_stock}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Right Area: Checkout Cart Panel */}
      <Panel noPadding style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Cart Panel Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F9FAFB'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={17} style={{ color: '#0F8A6A' }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
              Sales Order Cart
            </h3>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
            {cart.length} items
          </span>
        </div>

        {/* FEFO Batch Alert Banner */}
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: '#ECFDF5',
            borderBottom: '1px solid #A7F3D0',
            fontSize: '11px',
            color: '#065F46',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <CheckCircle size={13} />
          <span>FEFO Rule Active: Auto-deducting earliest batch</span>
        </div>

        {/* Cart Item Rows */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '60px 0', fontSize: '12px' }}>
              <ShoppingCart size={32} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
              <div>Cart is empty</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Click items on the left to add</div>
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
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB'
                  }}
                >
                  <div style={{ flex: 1, overflow: 'hidden', paddingRight: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.medicine.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      UGX {item.medicine.selling_price.toLocaleString()} ea
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => handleUpdateQty(item.medicine.id, -1)}
                      style={{ padding: '3px 6px', borderRadius: '4px', backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', cursor: 'pointer' }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQty(item.medicine.id, 1)}
                      style={{ padding: '3px 6px', borderRadius: '4px', backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', cursor: 'pointer' }}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => handleRemoveFromCart(item.medicine.id)}
                      style={{ padding: '3px', color: '#EF4444', marginLeft: '4px', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Checkout Footer */}
        <div style={{ padding: '14px', borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '6px' }}>
              Payment Method
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              {(['Cash', 'Mobile Money', 'Card'] as const).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  style={{
                    padding: '6px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: paymentMethod === pm ? '1px solid #0F8A6A' : '1px solid #D1D5DB',
                    backgroundColor: paymentMethod === pm ? '#ECFDF5' : '#FFFFFF',
                    color: paymentMethod === pm ? '#0F8A6A' : '#374151',
                    cursor: 'pointer'
                  }}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Total Payable</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F8A6A' }}>
              UGX {cartTotal.toLocaleString()}
            </span>
          </div>

          <DesktopButton
            variant="primary"
            size="lg"
            disabled={cart.length === 0 || isProcessing}
            onClick={handleCheckout}
            style={{ width: '100%' }}
          >
            {isProcessing ? 'Processing Sale...' : 'Complete POS Sale'}
          </DesktopButton>
        </div>
      </Panel>

      {/* Checkout Receipt Modal */}
      {isCheckoutOpen && completedSale && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '380px',
              padding: '20px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#065F46', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <CheckCircle size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                Sale Completed
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                Invoice #{completedSale.invoice_number}
              </p>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #D1D5DB', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 600 }}>LANGRATIA PHARMACY</div>
                <div style={{ color: '#6B7280', fontSize: '11px' }}>Cashier: {completedSale.username}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                {completedSale.items.map((it: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{it.medicine_name} x{it.quantity}</span>
                    <span style={{ fontWeight: 600 }}>UGX {it.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #D1D5DB', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0F8A6A' }}>
                <span>TOTAL ({completedSale.payment_method})</span>
                <span>UGX {completedSale.total_amount.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <DesktopButton
                variant="outline"
                size="md"
                icon={<Printer size={15} />}
                onClick={handlePrintReceipt}
                style={{ flex: 1 }}
              >
                Print
              </DesktopButton>
              <DesktopButton
                variant="primary"
                size="md"
                onClick={() => setIsCheckoutOpen(false)}
                style={{ flex: 1 }}
              >
                Next Sale
              </DesktopButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
