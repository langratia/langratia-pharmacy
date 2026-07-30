import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';
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

      if (purList && purList.length > 0 && !selectedPurchase) {
        setSelectedPurchase(purList[0]);
      }
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
    if (!selectedPurchase || isCreatingPO) {
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
  }, [selectedPurchase, isCreatingPO]);

  const totalPreview = items.reduce((acc, i) => acc + (i.buying_price * i.quantity), 0);

  const handleAddItem = () => {
    if (!selectedMedId || !batchNum.trim() || !qty || !expiry) {
      setError('Select medicine, batch, quantity, and expiry.');
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
      toast.success('Procurement Purchase Order Created!');
      setIsCreatingPO(false);
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
        <span style={{ fontWeight: 700, color: 'var(--blue)' }}>
          {formatCurrency(pur.total_amount)}
        </span>
      )
    },
    {
      key: 'purchase_date',
      header: 'Received Date',
      width: '20%',
      accessor: (pur) => (
        <span style={{ fontSize: '10px', color: 'var(--muted-dark)' }}>
          {new Date(pur.purchase_date).toLocaleDateString()}
        </span>
      )
    }
  ];

  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Purchases</div>
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
          setIsCreatingPO(false);
          setError(null);
        }}
        compactRows={true}
        zebraStriping={true}
        style={{ flex: 1 }}
      />
    </div>
  );

  const inspectorContent = (
    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      {isCreatingPO ? (
        <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', borderBottom: '1px solid var(--line)', paddingBottom: '10px', margin: 0 }}>New Purchase Order</h3>
          {error && <div style={{ color: 'var(--red)', fontSize: '13px', padding: '8px 12px', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: '8px' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input placeholder="Invoice Number *" value={invoiceNumber} onChange={e => { setInvoiceNumber(e.target.value); clearError(); }} required style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
            <select value={supplierId} onChange={e => { setSupplierId(Number(e.target.value)); clearError(); }} required style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }}>
              <option value="">Select Supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
            <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ height: '28px', padding: '4px 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', resize: 'none' }} />
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Add Batch Item</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select value={selectedMedId} onChange={e => { setSelectedMedId(Number(e.target.value)); clearError(); }} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }}>
              <option value="">Select Medicine...</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <input placeholder="Batch #" value={batchNum} onChange={e => setBatchNum(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
              <input type="number" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value ? Number(e.target.value) : '')} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
              <input type="date" placeholder="Mfg" value={mfgDate} onChange={e => setMfgDate(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input type="number" step="0.01" placeholder="Buy Price" value={buyPrice} onChange={e => setBuyPrice(e.target.value ? Number(e.target.value) : '')} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
              <input type="date" placeholder="Expiry" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
            </div>
            <button type="button" onClick={handleAddItem} className="desktop-btn-secondary" style={{ height: '28px', fontSize: '12px', borderRadius: '0px' }}>Add Line Item</button>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
            {items.length} items · Total: <strong style={{ color: 'var(--blue)' }}>UGX {formatCurrency(totalPreview)}</strong>
          </div>

          <div style={{ flex: 1, maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--line)', padding: '6px', borderRadius: '8px', background: 'var(--surface)' }}>
            {items.map((it, idx) => (
              <div key={`${it.medicine_id}-${it.batch_number}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px', borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}>
                <span>{it.medicine_name} (Batch: {it.batch_number}) ×{it.quantity}</span>
                <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', color: 'var(--red)', background: 'transparent', cursor: 'pointer', minHeight: 'unset', padding: '0' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto', paddingTop: '4px' }}>
            <button type="button" onClick={handleCancel} className="btn" disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ gap: '6px' }}>
              {submitting ? 'Saving…' : 'Save Order'}
            </button>
          </div>
        </form>
      ) : !selectedPurchase ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Truck size={40} style={{ opacity: 0.25 }} />
          <div style={{ fontSize: '14px' }}>Select a purchase order to inspect</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', borderBottom: '1px solid var(--line)', paddingBottom: '10px', margin: 0 }}>
            #{selectedPurchase.invoice_number}
          </h3>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>Supplier: <strong style={{ color: 'var(--ink)' }}>{selectedPurchase.supplier_name || 'Generic Supplier'}</strong></div>
            <div style={{ color: 'var(--muted)' }}>Date: {new Date(selectedPurchase.purchase_date).toLocaleDateString()}</div>
            <div>Total Cost: <strong style={{ color: 'var(--blue)' }}>UGX {formatCurrency(selectedPurchase.total_amount)}</strong></div>
          </div>
          {selectedPurchase.notes && (
            <div style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--surface)', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
              {selectedPurchase.notes}
            </div>
          )}
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Line Items ({selectedItems.length})</div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {isLoadingItems ? (
              <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '8px' }}>Loading items…</div>
            ) : selectedItems.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '8px' }}>No line items.</div>
            ) : selectedItems.map(item => (
              <div key={item.id} style={{ fontSize: '13px', padding: '10px 12px', border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>{item.medicine_name || `Medicine #${item.medicine_id}`}</div>
                <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                  Batch: {item.batch_number || 'N/A'} · Qty: {item.quantity} · Unit: {formatCurrency(item.buying_price)} · Sub: {formatCurrency(item.buying_price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <SplitPane
      primaryPane={primaryContent}
      inspectorPane={inspectorContent}
      inspectorTitle={isCreatingPO ? 'New Purchase Order' : 'Procurement Inspector'}
      inspectorWidth="340px"
    />
  );
};
