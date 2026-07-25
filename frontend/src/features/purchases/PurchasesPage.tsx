import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Medicine, Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';
import { formatCurrency } from '../../utils/formatters';

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

  // Inspector Create PO Form State
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<StockItemInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New Item Input inside Inspector
  const [selectedMedId, setSelectedMedId] = useState<number | ''>('');
  const [batchNum, setBatchNum] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [expiry, setExpiry] = useState('');

  const fetchInitialData = async () => {
    setIsLoading(true);
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

        if (purList && purList.length > 0 && !selectedPurchase) {
          setSelectedPurchase(purList[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load purchase history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

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
        mfg_date: new Date().toISOString().split('T')[0],
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

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !supplierId || items.length === 0) {
      setError('Invoice Number, Supplier, and line items are required.');
      return;
    }

    try {
      const totalAmount = items.reduce((acc, i) => acc + (i.buying_price * i.quantity), 0);
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        const supId = supplierId === '' ? null : Number(supplierId);
        await wailsApp.RecordPurchase(
          invoiceNumber,
          supId,
          items,
          notes,
          user?.id || 1,
          user?.username || 'admin'
        );
        toast.success('Procurement Purchase Order Created!');
        setIsCreatingPO(false);
        fetchInitialData();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to record purchase.');
    }
  };

  const columns: Column<any>[] = [
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

  // Primary Workspace Pane
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '0', backgroundColor: 'var(--color-bg-base)' }}>
      {/* 1-Line Compact Application Command Toolbar */}
      <Panel noPadding style={{ padding: '0 16px', height: '44px', minHeight: '44px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            Procurement & Purchase Orders
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                setIsCreatingPO(true);
                setSelectedPurchase(null);
                setItems([]);
                setInvoiceNumber(`PO-${Date.now().toString().slice(-6)}`);
              }}
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
        }}
        compactRows={true}
        zebraStriping={true}
        maxHeight="calc(100vh - 130px)"
        style={{ flex: 1 }}
      />
    </div>
  );

  // Inspector Pane Content
  const inspectorContent = (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      {isCreatingPO ? (
        <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
            NEW PURCHASE ORDER ENTRY
          </div>
          {error && <div style={{ color: 'var(--color-danger-text)', fontSize: '12px' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input placeholder="Invoice Number *" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
            <select value={supplierId} onChange={e => setSupplierId(Number(e.target.value))} required style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }}>
              <option value="">Select Supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>ADD BATCH ITEM</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select value={selectedMedId} onChange={e => setSelectedMedId(Number(e.target.value))} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }}>
              <option value="">Select Medicine...</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <input placeholder="Batch #" value={batchNum} onChange={e => setBatchNum(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
              <input type="number" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value ? Number(e.target.value) : '')} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
            </div>
            <button type="button" onClick={handleAddItem} className="desktop-btn-secondary" style={{ height: '28px', fontSize: '12px', borderRadius: '0px' }}>Add Line Item</button>
          </div>

          <div style={{ flex: 1, maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-border-default)', padding: '6px', borderRadius: '0px', backgroundColor: 'var(--color-bg-panel)' }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px', borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}>
                <span>{it.medicine_name} (Batch: {it.batch_number}) x{it.quantity}</span>
                <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', color: 'var(--color-danger-text)', background: 'transparent', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
            <button type="button" onClick={() => setIsCreatingPO(false)} className="desktop-btn-secondary" style={{ height: '28px', padding: '0 14px', borderRadius: '0px' }}>Cancel</button>
            <button type="submit" className="desktop-btn-primary" style={{ height: '28px', padding: '0 14px', borderRadius: '0px' }}>Save Order</button>
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
