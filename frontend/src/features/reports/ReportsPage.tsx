import React, { useState, useEffect, useRef } from 'react';
import { Package, Clock, Download, Search } from 'lucide-react';
import { Medicine, Batch } from '../../types';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { formatCurrency } from '../../utils/formatters';
import { ListMedicines, GetExpiringBatches } from '../../../wailsjs/go/main/App';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'expiry'>('inventory');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const abortRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchReportsData = async () => {
    setIsLoading(true);
    setFetchError(null);
    abortRef.current = false;
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
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp) {
          meds = (await wailsApp.ListMedicines?.('', '', false)) || [];
          exp = (await wailsApp.GetExpiringBatches?.(90)) || [];
        }
      }

      if (abortRef.current) return;
      setMedicines(meds);
      setExpiringBatches(exp);
    } catch (err: unknown) {
      if (abortRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load reports data';
      setFetchError(msg);
      console.error('Failed to load reports data:', err);
    } finally {
      if (!abortRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
    return () => { abortRef.current = true; };
  }, []);

  const filteredMedicines = medicines.filter(m => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return m.name.toLowerCase().includes(q)
      || (m.category || '').toLowerCase().includes(q)
      || (m.generic_name || '').toLowerCase().includes(q);
  });

  const filteredBatches = expiringBatches.filter(b => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (b.batch_number || '').toLowerCase().includes(q)
      || (b.medicine_name || '').toLowerCase().includes(q);
  });

  const inventoryColumns: Column<Medicine>[] = [
    {
      key: 'name',
      header: 'Medicine Name',
      width: '25%',
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
      width: '12%',
      accessor: (m) => <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{m.category}</span>
    },
    {
      key: 'buying_price',
      header: 'Buy (UGX)',
      width: '10%',
      align: 'right' as const,
      accessor: (m) => <span style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(m.buying_price)}</span>
    },
    {
      key: 'selling_price',
      header: 'Sell (UGX)',
      width: '10%',
      align: 'right' as const,
      accessor: (m) => <span style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(m.selling_price)}</span>
    },
    {
      key: 'current_stock',
      header: 'Stock',
      width: '8%',
      align: 'center' as const,
      accessor: (m) => <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.current_stock}</span>
    },
    {
      key: 'valuation',
      header: 'Val. (UGX)',
      width: '12%',
      align: 'right' as const,
      accessor: (m) => (
        <span style={{ fontWeight: 700, color: 'var(--color-text-accent)' }}>
          {formatCurrency(m.current_stock * m.buying_price)}
        </span>
      )
    }
  ];

  const expiryColumns: Column<Batch>[] = [
    {
      key: 'batch_number',
      header: 'Batch',
      width: '20%',
      accessor: (b) => <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{b.batch_number}</span>
    },
    {
      key: 'medicine_name',
      header: 'Item',
      width: '30%',
      accessor: (b) => <span style={{ color: 'var(--color-text-secondary)' }}>{b.medicine_name || `Item #${b.medicine_id}`}</span>
    },
    {
      key: 'quantity_remaining',
      header: 'Qty at Risk',
      width: '10%',
      align: 'center' as const,
      accessor: (b) => <span style={{ fontWeight: 700, color: 'var(--color-danger-text)' }}>{b.quantity_remaining}</span>
    },
    {
      key: 'days_until_expiry',
      header: 'Days Left',
      width: '15%',
      align: 'center' as const,
      accessor: (b) => {
        const days = daysUntil(b.expiry_date);
        let color = 'var(--color-text-secondary)';
        if (days <= 0) color = 'var(--color-danger-text)';
        else if (days <= 30) color = 'var(--color-danger-text)';
        else if (days <= 60) color = 'var(--color-warning-text)';
        return (
          <span style={{ fontWeight: 700, color }}>
            {days <= 0 ? 'EXPIRED' : `${days}d`}
          </span>
        );
      }
    },
    {
      key: 'expiry_date',
      header: 'Expiry Date',
      width: '25%',
      align: 'right' as const,
      accessor: (b) => (
        <span style={{ fontWeight: 700, color: 'var(--color-warning-text)' }}>
          {formatDate(b.expiry_date)}
        </span>
      )
    }
  ];

  const totalValuation = filteredMedicines.reduce((acc, m) => acc + (m.current_stock * m.buying_price), 0);

  const handleExportCSV = () => {
    setExportLoading(true);
    try {
      if (activeTab === 'inventory') {
        const rows = [
          ['Medicine Name', 'Category', 'Buying Price (UGX)', 'Selling Price (UGX)', 'Stock Qty', 'Valuation (UGX)'],
          ...filteredMedicines.map(m => [
            m.name, m.category || '', String(m.buying_price), String(m.selling_price),
            String(m.current_stock), String(m.current_stock * m.buying_price)
          ])
        ];
        downloadCSV(`inventory_report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      } else {
        const rows = [
          ['Batch Number', 'Item', 'Qty at Risk', 'Days Until Expiry', 'Expiry Date'],
          ...filteredBatches.map(b => {
            const days = daysUntil(b.expiry_date);
            return [
              b.batch_number, b.medicine_name || '', String(b.quantity_remaining),
              days <= 0 ? 'EXPIRED' : String(days), formatDate(b.expiry_date)
            ];
          })
        ];
        downloadCSV(`expiry_report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      }
    } catch {
      // download failures are silent (blob URL failures are extremely rare)
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '0', backgroundColor: 'var(--color-bg-base)' }}>
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
                  height: '28px', padding: '0 12px', borderRadius: '0px', fontSize: '12px', fontWeight: 600,
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
                  height: '28px', padding: '0 12px', borderRadius: '0px', fontSize: '12px', fontWeight: 600,
                  backgroundColor: activeTab === 'expiry' ? 'var(--color-warning-bg)' : 'var(--color-bg-panel)',
                  borderColor: activeTab === 'expiry' ? 'var(--color-warning-border)' : 'var(--color-border-default)',
                  color: activeTab === 'expiry' ? 'var(--color-warning-text)' : 'var(--color-text-primary)'
                }}
              >
                <Clock size={14} /> Expiry Tracking ({expiringBatches.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={activeTab === 'inventory' ? 'Search medicines...' : 'Search batches...'}
                style={{ height: '28px', width: '200px', padding: '0 8px 0 28px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', outline: 'none', fontSize: '12px' }}
              />
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
              Stock Value: <span style={{ color: 'var(--color-text-accent)' }}>UGX {formatCurrency(totalValuation)}</span>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={exportLoading || isLoading}
              className="desktop-btn-primary"
              style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 14px', borderRadius: '0px', opacity: (exportLoading || isLoading) ? 0.6 : 1 }}
            >
              <Download size={14} />
              <span>{exportLoading ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </Panel>

      {fetchError && (
        <div style={{ margin: '0 16px', padding: '8px 12px', fontSize: '12px', color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{fetchError}</span>
          <button onClick={fetchReportsData} style={{ fontSize: '11px', cursor: 'pointer', background: 'none', border: '1px solid var(--color-danger-border)', padding: '2px 8px', borderRadius: '0px', color: 'var(--color-danger-text)' }}>
            Retry
          </button>
        </div>
      )}

      {activeTab === 'inventory' ? (
        <DataGrid
          columns={inventoryColumns}
          data={filteredMedicines}
          keyExtractor={(m) => m.id}
          isLoading={isLoading}
          emptyMessage={debouncedSearch ? 'No medicines match your search.' : 'No inventory records found.'}
          compactRows={true}
          zebraStriping={true}
          maxHeight="calc(100vh - 130px)"
          style={{ flex: 1 }}
        />
      ) : (
        <DataGrid
          columns={expiryColumns}
          data={filteredBatches}
          keyExtractor={(b) => b.id}
          isLoading={isLoading}
          emptyMessage={debouncedSearch ? 'No batches match your search.' : 'No batches expiring within 90 days.'}
          compactRows={true}
          zebraStriping={true}
          maxHeight="calc(100vh - 130px)"
          style={{ flex: 1 }}
        />
      )}
    </div>
  );
};