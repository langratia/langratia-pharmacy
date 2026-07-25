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
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {pur.invoice_number}
        </span>
      )
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      width: '30%',
      accessor: (pur) => (
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
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
        <span style={{ fontWeight: 700, color: 'var(--color-text-accent)' }}>
          {formatCurrency(pur.total_amount)}
        </span>
      )
    },
    {
      key: 'purchase_date',
      header: 'Received Date',
      width: '20%',
      accessor: (pur) => (
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
          {new Date(pur.purchase_date).toLocaleDateString()}
        </span>
      )
    }
  ];

  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '0', backgroundColor: 'var(--color-bg-base)' }}>
      <Panel noPadding style={{ padding: '0 16px', height: '44px', minHeight: '44px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            Procurement & Purchase Orders
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleStartCreatingPO}
              className="desktop-btn-primary"
              style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 14px', borderRadius: '0px' }}
            >
              <Plus size={14} />
              <span>New Purchase Order</span>
            </button>
          </div>
        </div>
      </Panel>

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
        maxHeight="calc(100vh - 130px)"
        style={{ flex: 1 }}
      />
    </div>
  );

  const inspectorContent = (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      {isCreatingPO ? (
        <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
            NEW PURCHASE ORDER ENTRY
          </div>
          {error && <div style={{ color: 'var(--color-danger-text)', fontSize: '12px' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input placeholder="Invoice Number *" value={invoiceNumber} onChange={e => { setInvoiceNumber(e.target.value); clearError(); }} required style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
            <select value={supplierId} onChange={e => { setSupplierId(Number(e.target.value)); clearError(); }} required style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }}>
              <option value="">Select Supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
            <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ height: '28px', padding: '4px 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', resize: 'none' }} />
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>ADD BATCH ITEM</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select value={selectedMedId} onChange={e => { setSelectedMedId(Number(e.target.value)); clearError(); }} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }}>
              <option value="">Select Medicine...</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <input placeholder="Batch #" value={batchNum} onChange={e => setBatchNum(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
              <input type="number" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value ? Number(e.target.value) : '')} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
              <input type="date" placeholder="Mfg" value={mfgDate} onChange={e => setMfgDate(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input type="number" step="0.01" placeholder="Buy Price" value={buyPrice} onChange={e => setBuyPrice(e.target.value ? Number(e.target.value) : '')} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
              <input type="date" placeholder="Expiry" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
            </div>
            <button type="button" onClick={handleAddItem} className="desktop-btn-secondary" style={{ height: '28px', fontSize: '12px', borderRadius: '0px' }}>Add Line Item</button>
          </div>

          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Items: {items.length} | Total: {formatCurrency(totalPreview)}
          </div>

          <div style={{ flex: 1, maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--color-border-default)', padding: '6px', borderRadius: '0px', backgroundColor: 'var(--color-bg-panel)' }}>
            {items.map((it, idx) => (
              <div key={`${it.medicine_id}-${it.batch_number}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px', borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}>
                <span>{it.medicine_name} (Batch: {it.batch_number}) x{it.quantity}</span>
                <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', color: 'var(--color-danger-text)', background: 'transparent', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
            <button type="button" onClick={handleCancel} className="desktop-btn-secondary" style={{ height: '28px', padding: '0 14px', borderRadius: '0px' }} disabled={submitting}>Cancel</button>
            <button type="submit" className="desktop-btn-primary" style={{ height: '28px', padding: '0 14px', borderRadius: '0px' }} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </form>
      ) : !selectedPurchase ? (
        <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
          <Truck size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          Select a purchase order to inspect invoice breakdown.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
            INVOICE #{selectedPurchase.invoice_number}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Supplier: <strong style={{ color: 'var(--color-text-primary)' }}>{selectedPurchase.supplier_name || 'Generic Supplier'}</strong></div>
            <div>Date Received: {new Date(selectedPurchase.purchase_date).toLocaleDateString()}</div>
            <div>Total Cost: <strong style={{ color: 'var(--color-text-accent)' }}>UGX {formatCurrency(selectedPurchase.total_amount)}</strong></div>
          </div>
          {selectedPurchase.notes && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-base)', padding: '6px', border: '1px solid var(--color-border-subtle)' }}>
              Notes: {selectedPurchase.notes}
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            LINE ITEMS ({selectedItems.length})
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {isLoadingItems ? (
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', padding: '8px' }}>Loading items...</div>
            ) : selectedItems.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', padding: '8px' }}>No line items.</div>
            ) : selectedItems.map(item => (
              <div key={item.id} style={{ fontSize: '11px', padding: '6px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-base)' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.medicine_name || `Medicine #${item.medicine_id}`}</div>
                <div style={{ color: 'var(--color-text-secondary)' }}>
                  Batch: {item.batch_number || 'N/A'} | Qty: {item.quantity} | Unit: {formatCurrency(item.buying_price)} | Subtotal: {formatCurrency(item.buying_price * item.quantity)}
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
      inspectorTitle={isCreatingPO ? 'CREATE PURCHASE ORDER' : 'PROCUREMENT INSPECTOR'}
      inspectorWidth="340px"
    />
  );
};
