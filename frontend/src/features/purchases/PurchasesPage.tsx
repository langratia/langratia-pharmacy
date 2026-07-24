import React, { useState, useEffect } from 'react';
import { Truck, Plus, PackageCheck, Calendar, DollarSign, X, CheckCircle } from 'lucide-react';
import { Medicine, Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface StockItemInput {
  medicine_id: number;
  medicine_name: string;
  batch_number: string;
  quantity: number;
  buying_price: number;
  mfg_date: string;
  expiry_date: string;
}

export const PurchasesPage: React.FC = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<StockItemInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New Item Input
  const [selectedMedId, setSelectedMedId] = useState<number | ''>('');
  const [batchNum, setBatchNum] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [expiry, setExpiry] = useState('');

  const fetchInitialData = async () => {
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        const [purList, medList, supList] = await Promise.all([
          wailsApp.ListPurchases?.() || [],
          wailsApp.ListMedicines?.('', '', false) || [],
          wailsApp.ListSuppliers?.() || []
        ]);
        setPurchases(purList || []);
        setMedicines(medList || []);
        setSuppliers(supList || []);
      } else {
        setMedicines([
          { id: 1, name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin', brand_name: 'Amoxil', category: 'Antibiotics', dosage_strength: '500mg', medicine_form: 'Capsule', pack_size: '10x10', buying_price: 15000, selling_price: 25000, current_stock: 45, reorder_level: 20, manufacturer: 'GSK', description: '', is_archived: false, created_at: '' }
        ]);
        setSuppliers([
          { id: 1, name: 'Quality Chemicals Uganda', contact_person: 'Alice N', phone: '', email: '', address: '', created_at: '' }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleAddItem = () => {
    if (!selectedMedId || !batchNum.trim() || !qty || !expiry) {
      setError('Please select a medicine, batch number, quantity, and expiry date.');
      return;
    }

    const med = medicines.find(m => m.id === Number(selectedMedId));
    if (!med) return;

    setItems(prev => [
      ...prev,
      {
        medicine_id: med.id,
        medicine_name: med.name,
        batch_number: batchNum.trim(),
        quantity: Number(qty),
        buying_price: buyPrice ? Number(buyPrice) : med.buying_price,
        mfg_date: '',
        expiry_date: expiry
      }
    ]);

    setSelectedMedId('');
    setBatchNum('');
    setQty('');
    setBuyPrice('');
    setExpiry('');
    setError(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Please add at least one medicine batch item to the shipment.');
      return;
    }

    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp && typeof wailsApp.RecordPurchase === 'function') {
        await wailsApp.RecordPurchase(
          invoiceNumber.trim() || `PUR-${Date.now()}`,
          supplierId ? Number(supplierId) : null,
          items,
          notes,
          user?.id || 1,
          user?.username || 'admin'
        );
      }
      setIsModalOpen(false);
      setItems([]);
      setInvoiceNumber('');
      setSupplierId('');
      setNotes('');
      fetchInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to record purchase shipment');
    }
  };

  const totalInvoiceAmount = items.reduce((sum, item) => sum + (item.buying_price * item.quantity), 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-charcoal-navy)', marginBottom: '4px' }}>
            Stock Receiving & Purchases
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Record incoming supplier shipments, generate stock batches, and update inventory counts.
          </p>
        </div>
        <button
          onClick={() => { setIsModalOpen(true); setError(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: 'var(--color-primary-teal)', color: '#fff', borderRadius: '10px', fontWeight: 600, fontSize: '14px', border: 'none' }}
        >
          <Plus size={18} />
          <span>Record New Shipment</span>
        </button>
      </div>

      {/* History Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px' }}>Invoice #</th>
              <th style={{ padding: '14px 16px' }}>Supplier</th>
              <th style={{ padding: '14px 16px' }}>Purchase Date</th>
              <th style={{ padding: '14px 16px' }}>Total Amount (UGX)</th>
              <th style={{ padding: '14px 16px' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No stock receiving invoices recorded yet. Click "Record New Shipment" to log incoming stock.
                </td>
              </tr>
            ) : (
              purchases.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--color-charcoal-navy)' }}>{p.invoice_number}</td>
                  <td style={{ padding: '16px' }}>{p.supplier_name || 'Direct Procurement'}</td>
                  <td style={{ padding: '16px', color: 'var(--color-text-muted)' }}>{new Date(p.purchase_date).toLocaleDateString()}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--color-primary-teal)' }}>UGX {p.total_amount.toLocaleString()}</td>
                  <td style={{ padding: '16px', color: 'var(--color-text-muted)' }}>{p.notes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Record Incoming Stock Shipment</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            {error && <div style={{ padding: '10px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleSavePurchase}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Invoice / Reference Number</label>
                  <input type="text" placeholder="e.g. INV-2026-99" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Supplier</label>
                  <select value={supplierId} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Add Item Row */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border-subtle)', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal-navy)', marginBottom: '10px' }}>Add Medicine Batch Item</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr auto', gap: '10px', alignItems: 'center' }}>
                  <select value={selectedMedId} onChange={(e) => setSelectedMedId(e.target.value ? Number(e.target.value) : '')} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)', fontSize: '13px' }}>
                    <option value="">Select Medicine...</option>
                    {medicines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.dosage_strength})</option>)}
                  </select>
                  <input type="text" placeholder="Batch #" value={batchNum} onChange={(e) => setBatchNum(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)', fontSize: '13px' }} />
                  <input type="number" min="1" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value ? Number(e.target.value) : '')} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)', fontSize: '13px' }} />
                  <input type="number" min="0" placeholder="Buy Price" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value ? Number(e.target.value) : '')} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)', fontSize: '13px' }} />
                  <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)', fontSize: '13px' }} />
                  <button type="button" onClick={handleAddItem} style={{ padding: '8px 12px', backgroundColor: 'var(--color-primary-teal)', color: '#fff', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Add</button>
                </div>
              </div>

              {/* Items Table */}
              {items.length > 0 && (
                <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#F1F5F9' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Medicine</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Batch #</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Buy Price</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Expiry</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Subtotal</th>
                        <th style={{ padding: '8px 12px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                          <td style={{ padding: '8px 12px' }}>{it.medicine_name}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.batch_number}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>{it.quantity}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>UGX {it.buying_price.toLocaleString()}</td>
                          <td style={{ padding: '8px 12px' }}>{it.expiry_date}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>UGX {(it.buying_price * it.quantity).toLocaleString()}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button type="button" onClick={() => handleRemoveItem(idx)} style={{ color: '#EF4444' }}><X size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', textAlign: 'right', fontWeight: 700, fontSize: '14px', color: 'var(--color-primary-teal)' }}>
                    Total Invoice Amount: UGX {totalInvoiceAmount.toLocaleString()}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: '#fff' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary-teal)', color: '#fff', fontWeight: 600 }}>Save Shipment & Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
