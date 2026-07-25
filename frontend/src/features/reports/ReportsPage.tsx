import React, { useState, useEffect } from 'react';
import { Package, Clock, Download } from 'lucide-react';
import { Medicine, Batch } from '../../types';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { formatCurrency } from '../../utils/formatters';
import { ListMedicines, GetExpiringBatches } from '../../../wailsjs/go/main/App';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'expiry'>('inventory');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      let meds: Medicine[] = [];
      let exp: Batch[] = [];

      try {
        const [mRes, eRes] = await Promise.all([
          ListMedicines('', '', false),
          GetExpiringBatches(90)
        ]);
        meds = mRes || [];
        exp = eRes || [];
      } catch (e) {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp) {
          const [mRes, eRes] = await Promise.all([
            wailsApp.ListMedicines?.('', '', false) || [],
            wailsApp.GetExpiringBatches?.(90) || []
          ]);
          meds = mRes || [];
          exp = eRes || [];
        }
      }

      setMedicines(meds || []);
      setExpiringBatches(exp || []);
    } catch (err) {
      console.error('Failed to fetch reports data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const inventoryColumns: Column<Medicine>[] = [
    {
      key: 'name',
      header: 'Medicine Name',
      width: '30%',
      accessor: (m) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.name}</span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>({m.dosage_strength || m.medicine_form})</span>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      width: '15%',
      accessor: (m) => <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{m.category}</span>
    },
    {
      key: 'buying_price',
      header: 'Buying Price (UGX)',
      width: '15%',
      align: 'right' as const,
      accessor: (m) => <span style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(m.buying_price)}</span>
    },
    {
      key: 'selling_price',
      header: 'Selling Price (UGX)',
      width: '15%',
      align: 'right' as const,
      accessor: (m) => <span style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(m.selling_price)}</span>
    },
    {
      key: 'current_stock',
      header: 'Stock Qty',
      width: '10%',
      align: 'center' as const,
      accessor: (m) => <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.current_stock}</span>
    },
    {
      key: 'valuation',
      header: 'Stock Valuation (UGX)',
      width: '15%',
      align: 'right' as const,
      accessor: (m) => (
        <span style={{ fontWeight: 700, color: 'var(--color-text-accent)' }}>
          {formatCurrency(m.current_stock * m.selling_price)}
        </span>
      )
    }
  ];

  const expiryColumns: Column<Batch>[] = [
    {
      key: 'batch_number',
      header: 'Batch Number',
      width: '25%',
      accessor: (b) => <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{b.batch_number}</span>
    },
    {
      key: 'medicine_name',
      header: 'Pharmaceutical Item',
      width: '35%',
      accessor: (b) => <span style={{ color: 'var(--color-text-secondary)' }}>{b.medicine_name || `Item #${b.medicine_id}`}</span>
    },
    {
      key: 'quantity_remaining',
      header: 'Qty at Risk',
      width: '15%',
      align: 'center' as const,
      accessor: (b) => <span style={{ fontWeight: 700, color: 'var(--color-danger-text)' }}>{b.quantity_remaining}</span>
    },
    {
      key: 'expiry_date',
      header: 'Expiry Date',
      width: '25%',
      align: 'right' as const,
      accessor: (b) => (
        <span style={{ fontWeight: 700, color: 'var(--color-warning-text)' }}>
          {new Date(b.expiry_date).toLocaleDateString()}
        </span>
      )
    }
  ];

  const totalValuation = medicines.reduce((acc, m) => acc + (m.current_stock * m.selling_price), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '0', backgroundColor: 'var(--color-bg-base)' }}>
      {/* 1-Line Compact Application Command Toolbar */}
      <Panel noPadding style={{ padding: '0 16px', height: '44px', minHeight: '44px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              Analytics & Financial Reports
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
              <button
                onClick={() => setActiveTab('inventory')}
                style={{
                  height: '28px',
                  padding: '0 12px',
                  borderRadius: '0px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: activeTab === 'inventory' ? 'var(--color-accent-subtle)' : 'var(--color-bg-panel)',
                  borderColor: activeTab === 'inventory' ? 'var(--color-accent-base)' : 'var(--color-border-default)',
                  color: activeTab === 'inventory' ? 'var(--color-accent-base)' : 'var(--color-text-primary)'
                }}
              >
                <Package size={14} /> Inventory ({medicines.length})
              </button>
              <button
                onClick={() => setActiveTab('expiry')}
                style={{
                  height: '28px',
                  padding: '0 12px',
                  borderRadius: '0px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: activeTab === 'expiry' ? 'var(--color-warning-bg)' : 'var(--color-bg-panel)',
                  borderColor: activeTab === 'expiry' ? 'var(--color-warning-border)' : 'var(--color-border-default)',
                  color: activeTab === 'expiry' ? 'var(--color-warning-text)' : 'var(--color-text-primary)'
                }}
              >
                <Clock size={14} /> Expiry Tracking ({expiringBatches.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Stock Value: <span style={{ color: 'var(--color-text-accent)' }}>UGX {formatCurrency(totalValuation)}</span>
            </div>
            <button
              onClick={() => {}}
              className="desktop-btn-primary"
              style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 14px', borderRadius: '0px' }}
            >
              <Download size={14} />
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
