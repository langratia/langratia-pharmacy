import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Truck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Medicine, Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';

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
        await wailsApp.AddStockPurchase(
          supplierId,
          invoiceNumber,
          totalAmount,
          notes,
          user?.id || 1,
          user?.username || 'admin',
          items
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
        <span style={{ fontWeight: 600, color: '#0F172A' }}>
          {pur.invoice_number}
        </span>
      )
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      width: '30%',
      accessor: (pur) => (
        <span style={{ fontSize: '11px', color: '#334155' }}>
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
        <span style={{ fontWeight: 700, color: '#0F8A6A' }}>
          {pur.total_amount?.toLocaleString()}
        </span>
      )
    },
    {
      key: 'purchase_date',
      header: 'Received Date',
      width: '20%',
      accessor: (pur) => (
        <span style={{ fontSize: '10px', color: '#64748B' }}>
          {new Date(pur.purchase_date).toLocaleDateString()}
        </span>
      )
    }
  ];

  // Primary Workspace Pane
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '100%' }}>
      <SectionHeader
        title="Procurement Workspace"
        subtitle="Manage supplier invoices, purchase orders, and stock batch receiving logs"
        actions={
          <button
            onClick={() => {
              setIsCreatingPO(true);
              setSelectedPurchase(null);
              setItems([]);
              setInvoiceNumber(`PO-${Date.now().toString().slice(-6)}`);
            }}
            className="desktop-btn-primary"
            style={{ height: '24px', fontSize: '11px', gap: '4px' }}
          >
            <Plus size={12} />
            <span>New Purchase Order</span>
          </button>
        }
      />

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
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', boxSizing: 'border-box' }}>
      {isCreatingPO ? (
        <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #CBD5E1', paddingBottom: '4px' }}>
            NEW PURCHASE ORDER ENTRY
          </div>
          {error && <div style={{ color: '#EF4444', fontSize: '10px' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <input placeholder="Invoice Number *" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required />
            <select value={supplierId} onChange={e => setSupplierId(Number(e.target.value))} required>
              <option value="">Select Supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '4px', fontSize: '10px', fontWeight: 700 }}>ADD BATCH ITEM</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <select value={selectedMedId} onChange={e => setSelectedMedId(Number(e.target.value))}>
              <option value="">Select Medicine...</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              <input placeholder="Batch #" value={batchNum} onChange={e => setBatchNum(e.target.value)} />
              <input type="number" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value ? Number(e.target.value) : '')} />
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
            </div>
            <button type="button" onClick={handleAddItem} className="desktop-btn-secondary" style={{ height: '24px', fontSize: '10px' }}>Add Line Item</button>
          </div>

          <div style={{ flex: 1, maxHeight: '120px', overflowY: 'auto', border: '1px solid #E2E8F0', padding: '4px' }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 4px' }}>
                <span>{it.medicine_name} (Batch: {it.batch_number}) x{it.quantity}</span>
                <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', color: '#EF4444' }}><Trash2 size={10} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: 'auto' }}>
            <button type="button" onClick={() => setIsCreatingPO(false)} className="desktop-btn-secondary">Cancel</button>
            <button type="submit" className="desktop-btn-primary">Save Order</button>
          </div>
        </form>
      ) : !selectedPurchase ? (
        <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
          <Truck size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          Select a purchase order to inspect invoice breakdown.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #CBD5E1', paddingBottom: '4px' }}>
            INVOICE #{selectedPurchase.invoice_number}
          </div>
          <div style={{ fontSize: '11px', color: '#334155' }}>
            <div>Supplier: <strong>{selectedPurchase.supplier_name || 'Generic Supplier'}</strong></div>
            <div>Date Received: {new Date(selectedPurchase.purchase_date).toLocaleDateString()}</div>
            <div>Total Cost: <strong style={{ color: '#0F8A6A' }}>UGX {selectedPurchase.total_amount?.toLocaleString()}</strong></div>
          </div>
          {selectedPurchase.notes && (
            <div style={{ fontSize: '10px', color: '#64748B', backgroundColor: '#F8FAFC', padding: '6px', border: '1px solid #E2E8F0' }}>
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
