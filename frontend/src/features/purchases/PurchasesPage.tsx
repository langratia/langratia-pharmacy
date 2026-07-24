import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Medicine, Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DesktopButton } from '../../components/ui/DesktopButton';
import { DataGrid, Column } from '../../components/ui/DataGrid';

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
      setError('Select a medicine, batch number, quantity, and expiry date.');
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
        toast.success('Stock receiving shipment saved and stock updated!');
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

  const columns: Column<any>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      accessor: (p) => (
        <span style={{ fontWeight: 600, color: '#111827' }}>
          {p.invoice_number}
        </span>
      )
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      accessor: (p) => (
        <span style={{ color: '#374151' }}>
          {p.supplier_name || 'Direct Procurement'}
        </span>
      )
    },
    {
      key: 'purchase_date',
      header: 'Purchase Date',
      accessor: (p) => (
        <span style={{ color: '#6B7280' }}>
          {new Date(p.purchase_date).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'total_amount',
      header: 'Total Amount',
      accessor: (p) => (
        <span style={{ fontWeight: 600, color: '#0F8A6A' }}>
          UGX {p.total_amount.toLocaleString()}
        </span>
      )
    },
    {
      key: 'notes',
      header: 'Notes',
      accessor: (p) => (
        <span style={{ color: '#6B7280' }}>
          {p.notes || '-'}
        </span>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader
        title="Stock Receiving & Purchases"
        subtitle="Log incoming supplier shipments, generate FEFO stock batches, and update inventory counts."
        actions={
          <DesktopButton
            variant="primary"
            size="md"
            icon={<Plus size={15} />}
            onClick={() => { setIsModalOpen(true); setError(null); }}
          >
            Record New Shipment
          </DesktopButton>
        }
      />

      <DataGrid
        columns={columns}
        data={purchases}
        keyExtractor={(row) => row.id || row.invoice_number}
        isLoading={isLoading}
        emptyMessage="No stock receiving invoices recorded yet."
        compactRows={true}
        zebraStriping={true}
        maxHeight="calc(100vh - 180px)"
      />

      {/* Shipment Modal */}
      {isModalOpen && (
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
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F9FAFB'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                Record Incoming Stock Shipment
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '18px' }}>
              {error && (
                <div style={{ padding: '8px 12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '6px', fontSize: '12px', marginBottom: '14px' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSavePurchase}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Invoice / Ref Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-99"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Supplier
                    </label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    >
                      <option value="">Select Supplier...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Add Item Row Panel */}
                <div style={{ backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB', marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827', display: 'block', marginBottom: '8px' }}>
                    Add Medicine Batch Item
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr auto', gap: '6px', alignItems: 'center' }}>
                    <select
                      value={selectedMedId}
                      onChange={(e) => setSelectedMedId(e.target.value ? Number(e.target.value) : '')}
                      style={{ padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                    >
                      <option value="">Select Medicine...</option>
                      {medicines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.dosage_strength})</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="Batch #"
                      value={batchNum}
                      onChange={(e) => setBatchNum(e.target.value)}
                      style={{ padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={qty}
                      onChange={(e) => setQty(e.target.value ? Number(e.target.value) : '')}
                      style={{ padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Buy Price"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value ? Number(e.target.value) : '')}
                      style={{ padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                    />
                    <input
                      type="date"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      style={{ padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                    />
                    <DesktopButton type="button" variant="primary" size="sm" onClick={handleAddItem}>
                      Add
                    </DesktopButton>
                  </div>
                </div>

                {/* Items Table */}
                {items.length > 0 && (
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ backgroundColor: '#F9FAFB' }}>
                        <tr>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Medicine</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Batch #</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Buy Price</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Expiry</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Subtotal</th>
                          <th style={{ padding: '6px 10px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '6px 10px' }}>{it.medicine_name}</td>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{it.batch_number}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>{it.quantity}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>UGX {it.buying_price.toLocaleString()}</td>
                            <td style={{ padding: '6px 10px' }}>{it.expiry_date}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>UGX {(it.buying_price * it.quantity).toLocaleString()}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <button type="button" onClick={() => handleRemoveItem(idx)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding: '8px 12px', backgroundColor: '#F9FAFB', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#0F8A6A' }}>
                      Total Invoice Amount: UGX {totalInvoiceAmount.toLocaleString()}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <DesktopButton
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </DesktopButton>
                  <DesktopButton
                    type="submit"
                    variant="primary"
                  >
                    Save Shipment & Update Stock
                  </DesktopButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
