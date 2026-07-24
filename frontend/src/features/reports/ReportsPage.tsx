import React, { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Medicine, Batch } from '../../types';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DesktopButton } from '../../components/ui/DesktopButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataGrid, Column } from '../../components/ui/DataGrid';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'expiry'>('inventory');
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
      accessor: (m) => (
        <div>
          <span style={{ fontWeight: 600, color: '#111827' }}>{m.name}</span>
          <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '6px' }}>({m.dosage_strength})</span>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (m) => <span style={{ color: '#374151' }}>{m.category}</span>
    },
    {
      key: 'buying_price',
      header: 'Buying Price',
      align: 'right',
      accessor: (m) => <span style={{ color: '#6B7280' }}>UGX {m.buying_price.toLocaleString()}</span>
    },
    {
      key: 'selling_price',
      header: 'Selling Price',
      align: 'right',
      accessor: (m) => <span style={{ color: '#374151' }}>UGX {m.selling_price.toLocaleString()}</span>
    },
    {
      key: 'current_stock',
      header: 'Stock Qty',
      align: 'right',
      accessor: (m) => <span style={{ fontWeight: 600, color: '#111827' }}>{m.current_stock}</span>
    },
    {
      key: 'valuation',
      header: 'Total Valuation',
      align: 'right',
      accessor: (m) => (
        <span style={{ fontWeight: 600, color: '#0F8A6A' }}>
          UGX {(m.current_stock * m.selling_price).toLocaleString()}
        </span>
      )
    }
  ];

  const expiryColumns: Column<Batch>[] = [
    {
      key: 'batch_number',
      header: 'Batch #',
      accessor: (b) => <span style={{ fontWeight: 600, color: '#111827' }}>{b.batch_number}</span>
    },
    {
      key: 'medicine_name',
      header: 'Medicine',
      accessor: (b) => <span style={{ color: '#374151' }}>{b.medicine_name || `Medicine #${b.medicine_id}`}</span>
    },
    {
      key: 'quantity_remaining',
      header: 'Remaining Qty',
      align: 'right',
      accessor: (b) => <span style={{ fontWeight: 600, color: '#111827' }}>{b.quantity_remaining}</span>
    },
    {
      key: 'expiry_date',
      header: 'Expiry Date',
      accessor: (b) => <span style={{ fontWeight: 600, color: '#EF4444' }}>{b.expiry_date}</span>
    },
    {
      key: 'status',
      header: 'FEFO Alert',
      accessor: () => <StatusBadge status="expired" label="Expiring Soon" />
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader
        title="Reports & Analytics"
        subtitle="Exportable inventory valuation summaries, sales analytics, and FEFO expiry tracking."
        actions={
          <DesktopButton
            variant="primary"
            size="md"
            icon={<Printer size={15} />}
            onClick={handlePrint}
          >
            Print / Export PDF
          </DesktopButton>
        }
      />

      <Panel noPadding style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'inventory', label: 'Inventory Valuation' },
            { key: 'expiry', label: 'Batch Expiry (90 Days)' },
            { key: 'sales', label: 'Sales Audit Sheet' }
          ].map((tab) => (
            <DesktopButton
              key={tab.key}
              variant={activeTab === tab.key ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </DesktopButton>
          ))}
        </div>
      </Panel>

      <Panel id="printable-report" noPadding style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>LANGRATIA PHARMACY</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
            Official Audit Report • Generated on {new Date().toLocaleDateString()}
          </p>
        </div>

        {activeTab === 'inventory' && (
          <DataGrid
            columns={inventoryColumns}
            data={medicines}
            keyExtractor={(m) => m.id}
            isLoading={isLoading}
            emptyMessage="No medicines registered in stock."
            compactRows={true}
            zebraStriping={true}
            maxHeight="calc(100vh - 300px)"
          />
        )}

        {activeTab === 'expiry' && (
          <DataGrid
            columns={expiryColumns}
            data={expiringBatches}
            keyExtractor={(b) => b.id}
            isLoading={isLoading}
            emptyMessage="No stock batches expiring within the next 90 days."
            compactRows={true}
            zebraStriping={true}
            maxHeight="calc(100vh - 300px)"
          />
        )}

        {activeTab === 'sales' && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280', fontSize: '13px' }}>
            Select date range criteria and click "Print / Export PDF" to generate certified Sales Audit Sheets.
          </div>
        )}
      </Panel>
    </div>
  );
};
