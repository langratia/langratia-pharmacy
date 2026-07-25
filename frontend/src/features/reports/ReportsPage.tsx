import React, { useState, useEffect } from 'react';
import { Printer, BarChart2, AlertCircle, Package, Clock, Download } from 'lucide-react';
import { Medicine, Batch } from '../../types';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'expiry'>('inventory');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        const [meds, exp] = await Promise.all([
          wailsApp.ListMedicines?.('', '', false) || [],
          wailsApp.GetExpiringBatches?.(90) || []
        ]);
        setMedicines(meds || []);
        setExpiringBatches(exp || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const inventoryColumns: Column<Medicine>[] = [
    {
      key: 'name',
      header: 'Medicine Name',
      width: '30%',
      accessor: (m) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>{m.name}</span>
          <span style={{ fontSize: '10px', color: '#64748B', marginLeft: '6px' }}>({m.dosage_strength || m.medicine_form})</span>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      width: '15%',
      accessor: (m) => <span style={{ fontSize: '11px', color: '#334155' }}>{m.category}</span>
    },
    {
      key: 'buying_price',
      header: 'Buying Price (UGX)',
      width: '15%',
      align: 'right' as const,
      accessor: (m) => <span style={{ color: '#64748B' }}>{m.buying_price.toLocaleString()}</span>
    },
    {
      key: 'selling_price',
      header: 'Selling Price (UGX)',
      width: '15%',
      align: 'right' as const,
      accessor: (m) => <span style={{ color: '#334155' }}>{m.selling_price.toLocaleString()}</span>
    },
    {
      key: 'current_stock',
      header: 'Stock Qty',
      width: '10%',
      align: 'center' as const,
      accessor: (m) => <span style={{ fontWeight: 700, color: '#0F172A' }}>{m.current_stock}</span>
    },
    {
      key: 'valuation',
      header: 'Stock Valuation (UGX)',
      width: '15%',
      align: 'right' as const,
      accessor: (m) => (
        <span style={{ fontWeight: 700, color: '#0F8A6A' }}>
          {(m.current_stock * m.selling_price).toLocaleString()}
        </span>
      )
    }
  ];

  const expiryColumns: Column<Batch>[] = [
    {
      key: 'batch_number',
      header: 'Batch Number',
      width: '25%',
      accessor: (b) => <span style={{ fontWeight: 700, color: '#0F172A' }}>{b.batch_number}</span>
    },
    {
      key: 'medicine_name',
      header: 'Pharmaceutical Item',
      width: '35%',
      accessor: (b) => <span style={{ color: '#334155' }}>{b.medicine_name || `Item #${b.medicine_id}`}</span>
    },
    {
      key: 'quantity_remaining',
      header: 'Qty at Risk',
      width: '15%',
      align: 'center' as const,
      accessor: (b) => <span style={{ fontWeight: 700, color: '#EF4444' }}>{b.quantity_remaining}</span>
    },
    {
      key: 'expiry_date',
      header: 'Expiry Date',
      width: '25%',
      align: 'right' as const,
      accessor: (b) => (
        <span style={{ fontWeight: 700, color: '#D97706' }}>
          {new Date(b.expiry_date).toLocaleDateString()}
        </span>
      )
    }
  ];

  const totalValuation = medicines.reduce((acc, m) => acc + (m.current_stock * m.selling_price), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', padding: '24px', backgroundColor: 'var(--color-desktop-bg)' }}>
      {/* 1-Line Compact Application Command Toolbar */}
      <Panel noPadding style={{ padding: '0 24px', height: '64px', minHeight: '64px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              Analytics & Financial Reports
            </div>
            <div style={{ display: 'flex', gap: '12px', marginLeft: '16px' }}>
              <button
                onClick={() => setActiveTab('inventory')}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: activeTab === 'inventory' ? 'var(--color-accent-light)' : 'var(--color-panel-bg)',
                  borderColor: activeTab === 'inventory' ? 'var(--color-accent)' : 'var(--color-border)',
                  color: activeTab === 'inventory' ? '#065F46' : 'var(--color-text-primary)'
                }}
              >
                <Package size={16} /> Inventory ({medicines.length})
              </button>
              <button
                onClick={() => setActiveTab('expiry')}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: activeTab === 'expiry' ? '#FEF3C7' : 'var(--color-panel-bg)',
                  borderColor: activeTab === 'expiry' ? '#F59E0B' : 'var(--color-border)',
                  color: activeTab === 'expiry' ? '#B45309' : 'var(--color-text-primary)'
                }}
              >
                <Clock size={16} /> Expiry Tracking ({expiringBatches.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Stock Value: <span style={{ color: '#0F8A6A' }}>UGX {totalValuation.toLocaleString()}</span>
            </div>
            <button
              onClick={() => {}}
              className="desktop-btn-primary"
              style={{ height: '40px', fontSize: '14px', gap: '8px', padding: '0 20px', borderRadius: '20px' }}
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </Panel>

      {/* DataGrid View */}
      {activeTab === 'inventory' ? (
        <DataGrid
          columns={inventoryColumns}
          data={medicines}
          keyExtractor={(m) => m.id}
          isLoading={isLoading}
          emptyMessage="No inventory records found."
          compactRows={true}
          zebraStriping={true}
          maxHeight="calc(100vh - 130px)"
          style={{ flex: 1 }}
        />
      ) : (
        <DataGrid
          columns={expiryColumns}
          data={expiringBatches}
          keyExtractor={(b) => b.id}
          isLoading={isLoading}
          emptyMessage="No batches expiring within 90 days."
          compactRows={true}
          zebraStriping={true}
          maxHeight="calc(100vh - 130px)"
          style={{ flex: 1 }}
        />
      )}
    </div>
  );
};
