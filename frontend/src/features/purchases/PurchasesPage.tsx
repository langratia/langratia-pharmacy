import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Truck, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { formatCurrency } from '../../utils/formatters';
import { ListPurchases, RecordPurchase, ListMedicines, ListSuppliers, ListPurchaseItems } from '../../../wailsjs/go/main/App';
import { services, models } from '../../../wailsjs/go/models';

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
  const [purchases, setPurchases] = useState<models.Purchase[]>([]);
  const [medicines, setMedicines] = useState<models.Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<models.Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<models.Purchase | null>(null);
  const [selectedItems, setSelectedItems] = useState<models.PurchaseItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [items, setItems] = useState<StockItemInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedMedId, setSelectedMedId] = useState<number | ''>('');
  const [batchNum, setBatchNum] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiry, setExpiry] = useState('');

  const clearError = useCallback(() => setError(null), []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [purList, medList, supList] = await Promise.all([
        ListPurchases(),
        ListMedicines('', '', false),
        ListSuppliers(false)
      ]);
      setPurchases(purList || []);
      setMedicines(medList || []);
      setSuppliers(supList || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load purchase history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedPurchase) {
      setSelectedItems([]);
      return;
    }
    let cancelled = false;
    setIsLoadingItems(true);
    ListPurchaseItems(selectedPurchase.id).then(items => {
      if (!cancelled) setSelectedItems(items || []);
    }).catch(() => {
      if (!cancelled) toast.error('Failed to load purchase items');
    }).finally(() => {
      if (!cancelled) setIsLoadingItems(false);
    });
    return () => { cancelled = true; };
  }, [selectedPurchase]);

  const totalPreview = items.reduce((acc, i) => acc + (i.buying_price * i.quantity), 0);

  const handleAddItem = () => {
    if (!selectedMedId || !batchNum.trim() || !qty || !expiry) {
      setError('Select medicine, batch, quantity, and expiry date.');
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
        buying_price: Number(buyPrice) || med.buying_price,
        mfg_date: mfgDate || new Date().toISOString().split('T')[0],
        expiry_date: expiry
      }
    ]);

    setSelectedMedId('');
    setBatchNum('');
    setQty('');
    setBuyPrice('');
    setMfgDate('');
    setExpiry('');
    setError(null);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !supplierId || items.length === 0) {
      setError('Invoice Number, Supplier, and line items are required.');
      return;
    }

    setSubmitting(true);
    try {
      const stockItems = items.map(i => {
        const si = new services.IncomingStockItem();
        si.medicine_id = i.medicine_id;
        si.batch_number = i.batch_number;
        si.quantity = i.quantity;
        si.buying_price = i.buying_price;
        si.mfg_date = i.mfg_date;
        si.expiry_date = i.expiry_date;
        return si;
      });

      await RecordPurchase(
        invoiceNumber,
        Number(supplierId),
        stockItems,
        notes,
        user?.id || 1,
        user?.username || 'admin'
      );
      setIsCreatingPO(false);
      setSuccessMessage(`Purchase order "${invoiceNumber}" recorded successfully!`);
      setShowSuccessModal(true);
      fetchInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to record purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (items.length > 0) {
      if (!window.confirm('Discard current purchase order? Unsaved items will be lost.')) return;
    }
    setIsCreatingPO(false);
    setError(null);
    setItems([]);
  };

  const handleStartCreatingPO = () => {
    setIsCreatingPO(true);
    setSelectedPurchase(null);
    setItems([]);
    setError(null);
    setInvoiceNumber(`PO-${Date.now().toString().slice(-6)}`);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
  };

  const columns: Column<models.Purchase>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      width: '25%',
      accessor: (pur) => (
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
          {pur.invoice_number}
        </span>
      )
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      width: '30%',
      accessor: (pur) => (
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
          {pur.supplier_name || 'Generic Supplier'}
        </span>
      )
    },
    {
      key: 'total_amount',
      header: 'Total Cost (UGX)',
      width: '25%',
      align: 'right' as const,
      accessor: (pur) => (
        <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--blue)' }}>
          {formatCurrency(pur.total_amount)}
        </span>
      )
    },
    {
      key: 'purchase_date',
      header: 'Received Date',
      width: '20%',
      accessor: (pur) => (
        <span style={{ fontSize: '11px', color: 'var(--muted-dark)' }}>
          {new Date(pur.purchase_date).toLocaleDateString()}
        </span>
      )
    }
  ];

  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', minHeight: 0, width: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Purchases & Stock Receiving</div>
        <button onClick={handleStartCreatingPO} className="btn btn-primary" style={{ marginLeft: 'auto', gap: '6px' }}>
          <Plus size={14} /> New Purchase Order
        </button>
      </div>

      <DataGrid
        columns={columns}
        data={purchases}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No purchase orders registered."
        selectedKey={selectedPurchase ? selectedPurchase.id : null}
        onRowClick={(pur) => {
          setSelectedPurchase(pur);
          setIsViewModalOpen(true);
        }}
        compactRows={true}
        zebraStriping={true}
        style={{ flex: 1 }}
      />
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {primaryContent}

      {/* ── MODAL: New Purchase Order ───────────────────────────── */}
      {isCreatingPO && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r2)',
              width: '620px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>New Purchase Order</h2>
              <button onClick={handleCancel} className="btn" style={{ padding: '4px 8px', minHeight: 'unset' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Receive incoming inventory stock from a supplier.</p>

            {error && (
              <div style={{ color: 'var(--red)', fontSize: '13px', padding: '10px 14px', background: 'rgba(255, 56, 96, 0.1)', border: '1px solid var(--red)', borderRadius: '8px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Invoice Number *</label>
                  <input
                    placeholder="e.g. PO-98402"
                    value={invoiceNumber}
                    onChange={e => { setInvoiceNumber(e.target.value); clearError(); }}
                    required
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={e => { setSupplierId(Number(e.target.value)); clearError(); }}
                    required
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Received Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Notes</label>
                  <input
                    placeholder="Optional details..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Add Incoming Batch Item</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Medicine SKU</label>
                  <select
                    value={selectedMedId}
                    onChange={e => { setSelectedMedId(Number(e.target.value)); clearError(); }}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                  >
                    <option value="">Select Medicine...</option>
                    {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Batch #</label>
                    <input
                      placeholder="e.g. BATCH-01"
                      value={batchNum}
                      onChange={e => setBatchNum(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Qty</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={qty}
                      onChange={e => setQty(e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Buy Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="UGX 0"
                      value={buyPrice}
                      onChange={e => setBuyPrice(e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Mfg Date</label>
                    <input
                      type="date"
                      value={mfgDate}
                      onChange={e => setMfgDate(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Expiry Date *</label>
                    <input
                      type="date"
                      value={expiry}
                      onChange={e => setExpiry(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <button type="button" onClick={handleAddItem} className="btn" style={{ height: '36px', marginTop: '4px', gap: '6px' }}>
                  <Plus size={14} /> Add Line Item
                </button>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Line Items Added: <strong>{items.length}</strong></span>
                <span>Total PO Cost: <strong className="tabular-nums" style={{ color: 'var(--blue)', fontSize: '15px' }}>UGX {formatCurrency(totalPreview)}</strong></span>
              </div>

              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--line)', padding: '6px', borderRadius: '8px', background: 'var(--surface)' }}>
                {items.map((it, idx) => (
                  <div key={`${it.medicine_id}-${it.batch_number}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '8px 10px', borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}>
                    <div>
                      <strong>{it.medicine_name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '8px' }}>(Batch: {it.batch_number} · Exp: {it.expiry_date})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="tabular-nums">Qty: {it.quantity} × {formatCurrency(it.buying_price)}</span>
                      <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', color: 'var(--red)', background: 'transparent', cursor: 'pointer', minHeight: 'unset', padding: '0' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={handleCancel} className="btn" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ gap: '6px' }}>
                  {submitting ? 'Saving…' : 'Record Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Inspect Purchase Order Details ──────────────── */}
      {isViewModalOpen && selectedPurchase && (
        <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r2)',
              width: '540px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(18,108,255,0.12)', border: '1px solid rgba(18,108,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
                  <Truck size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                    PO #{selectedPurchase.invoice_number}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Supplier: {selectedPurchase.supplier_name || 'Generic Supplier'}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="btn" style={{ padding: '4px 8px', minHeight: 'unset' }}><X size={16} /></button>
            </div>

            <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '10px', padding: '14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <div>Received Date: <strong style={{ color: 'var(--ink)' }}>{new Date(selectedPurchase.purchase_date).toLocaleDateString()}</strong></div>
              <div>Total Invoice Value: <strong className="tabular-nums" style={{ color: 'var(--blue)', fontSize: '15px' }}>UGX {formatCurrency(selectedPurchase.total_amount)}</strong></div>
              {selectedPurchase.notes && <div>Notes: <span style={{ color: 'var(--muted)' }}>{selectedPurchase.notes}</span></div>}
            </div>

            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Line Items ({selectedItems.length})</div>
            
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {isLoadingItems ? (
                <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '12px', textAlign: 'center' }}>Loading line items…</div>
              ) : selectedItems.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '12px', textAlign: 'center' }}>No line items recorded.</div>
              ) : selectedItems.map(item => (
                <div key={item.id} style={{ fontSize: '13px', padding: '10px 12px', border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.medicine_name || `Medicine #${item.medicine_id}`}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '2px' }}>
                      Batch: {item.batch_number || 'N/A'} · Qty: {item.quantity} · Unit Price: {formatCurrency(item.buying_price)}
                    </div>
                  </div>
                  <div className="tabular-nums" style={{ fontWeight: 700, color: 'var(--blue)' }}>
                    UGX {formatCurrency(item.buying_price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setIsViewModalOpen(false)} className="btn btn-primary" style={{ width: '100%', height: '40px', marginTop: '16px' }}>
              Close Order Details
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: Action Success Confirmation Alert ────────────── */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r2)',
              width: '420px',
              padding: '28px',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px'
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(20, 240, 109, 0.12)', border: '1px solid rgba(20, 240, 109, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Purchase Order Saved</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              {successMessage}
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', height: '40px', marginTop: '8px' }}
            >
              Done / Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
