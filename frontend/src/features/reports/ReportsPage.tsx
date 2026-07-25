import React, { useState, useEffect, useRef } from 'react';
import { Package, Clock, Download, Users, Shield, BarChart3, Search } from 'lucide-react';
import { Medicine, Batch } from '../../types';
import { models, services } from '../../../wailsjs/go/models';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { formatCurrency } from '../../utils/formatters';
import { ListMedicines, GetExpiringBatches, GetSalesSummary, ListUsers, GetCashierPerformance, ListAuditLogs } from '../../../wailsjs/go/main/App';
import { useAuth } from '../../context/AuthContext';

type TabKey = 'inventory' | 'expiry' | 'performance' | 'audit' | 'sales';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function tryLoad<T>(fn: () => Promise<T>, fb: () => Promise<T | undefined>): Promise<T | undefined> {
  try { return await fn(); } catch (e) {
    console.warn('Primary call failed, trying fallback...', e);
    try { return await fb(); } catch (e2) { console.error('Fallback also failed:', e2); }
  }
  return undefined;
}

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('inventory');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<Batch[]>([]);
  const [salesSummary, setSalesSummary] = useState<services.SalesSummary | null>(null);
  const [allUsers, setAllUsers] = useState<models.User[]>([]);
  const [cashierPerf, setCashierPerf] = useState<Map<number, services.CashierPerformance>>(new Map());
  const [auditLogs, setAuditLogs] = useState<models.AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const abortRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadTabData = async (tab: TabKey) => {
    setIsLoading(true);
    setFetchError(null);
    abortRef.current = false;

    try {
      if (tab === 'inventory' || tab === 'expiry') {
        const [meds, exp] = await Promise.all([
          tryLoad(() => ListMedicines('', '', false), () => (window as any)?.go?.main?.App?.ListMedicines?.('', '', false)),
          tryLoad(() => GetExpiringBatches(90), () => (window as any)?.go?.main?.App?.GetExpiringBatches?.(90))
        ]);
        if (abortRef.current) return;
        setMedicines(meds || []);
        setExpiringBatches(exp || []);
        if ((!meds || meds.length === 0) && (!exp || exp.length === 0)) setFetchError('Failed to load reports data from backend.');
      }

      if (tab === 'performance') {
        const users = await tryLoad(() => ListUsers(user!.id), () => (window as any)?.go?.main?.App?.ListUsers?.(user!.id));
        if (abortRef.current) return;
        setAllUsers(users || []);
        const perfMap = new Map<number, services.CashierPerformance>();
        for (const u of (users || [])) {
          const perf = await tryLoad(() => GetCashierPerformance(u.id), () => (window as any)?.go?.main?.App?.GetCashierPerformance?.(u.id));
          if (perf) perfMap.set(u.id, perf);
        }
        setCashierPerf(perfMap);
      }

      if (tab === 'sales') {
        const summary = await tryLoad(() => GetSalesSummary(), () => (window as any)?.go?.main?.App?.GetSalesSummary?.());
        if (abortRef.current) return;
        if (summary) setSalesSummary(summary);
        else setFetchError('Failed to load sales summary.');
      }

      if (tab === 'audit') {
        const logs = await tryLoad(() => ListAuditLogs(200, user!.id), () => (window as any)?.go?.main?.App?.ListAuditLogs?.(200, user!.id));
        if (abortRef.current) return;
        setAuditLogs(logs || []);
      }
    } catch (err: unknown) {
      if (abortRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setFetchError(msg);
      console.error('Failed to load tab data:', err);
    } finally {
      if (!abortRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTabData(activeTab);
    return () => { abortRef.current = true; };
  }, [activeTab]);

  const filteredMedicines = medicines.filter(m => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q);
  });

  const filteredBatches = expiringBatches.filter(b => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (b.batch_number || '').toLowerCase().includes(q) || (b.medicine_name || '').toLowerCase().includes(q);
  });

  const filteredLogs = auditLogs.filter(log => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return log.username.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || log.details.toLowerCase().includes(q);
  });

  const inventoryColumns: Column<Medicine>[] = [
    { key: 'name', header: 'Medicine', width: '25%', accessor: (m) => <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.name} <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>({m.dosage_strength || m.medicine_form})</span></span> },
    { key: 'category', header: 'Category', width: '12%', accessor: (m) => <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{m.category}</span> },
    { key: 'buying_price', header: 'Buy (UGX)', width: '10%', align: 'right' as const, accessor: (m) => <span style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(m.buying_price)}</span> },
    { key: 'selling_price', header: 'Sell (UGX)', width: '10%', align: 'right' as const, accessor: (m) => <span style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(m.selling_price)}</span> },
    { key: 'current_stock', header: 'Stock', width: '8%', align: 'center' as const, accessor: (m) => <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.current_stock}</span> },
    { key: 'valuation', header: 'Value (UGX)', width: '12%', align: 'right' as const, accessor: (m) => <span style={{ fontWeight: 700, color: 'var(--color-text-accent)' }}>{formatCurrency(m.current_stock * m.buying_price)}</span> },
  ];

  const expiryColumns: Column<Batch>[] = [
    { key: 'batch_number', header: 'Batch', width: '20%', accessor: (b) => <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{b.batch_number}</span> },
    { key: 'medicine_name', header: 'Item', width: '30%', accessor: (b) => <span style={{ color: 'var(--color-text-secondary)' }}>{b.medicine_name || `#${b.medicine_id}`}</span> },
    { key: 'quantity_remaining', header: 'At Risk', width: '10%', align: 'center' as const, accessor: (b) => <span style={{ fontWeight: 700, color: 'var(--color-danger-text)' }}>{b.quantity_remaining}</span> },
    {
      key: 'days_until_expiry', header: 'Days Left', width: '15%', align: 'center' as const,
      accessor: (b) => {
        const days = daysUntil(b.expiry_date);
        const color = days <= 0 ? 'var(--color-danger-text)' : days <= 30 ? 'var(--color-danger-text)' : days <= 60 ? 'var(--color-warning-text)' : 'var(--color-text-secondary)';
        return <span style={{ fontWeight: 700, color }}>{days <= 0 ? 'EXPIRED' : `${days}d`}</span>;
      }
    },
    { key: 'expiry_date', header: 'Expiry Date', width: '25%', align: 'right' as const, accessor: (b) => <span style={{ fontWeight: 700, color: 'var(--color-warning-text)' }}>{formatDate(b.expiry_date)}</span> },
  ];

  const performanceColumns: Column<models.User>[] = [
    { key: 'username', header: 'Username', width: '15%', accessor: (u) => <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.username}</span> },
    { key: 'full_name', header: 'Name', width: '20%', accessor: (u) => <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{u.full_name}</span> },
    { key: 'role', header: 'Role', width: '10%', accessor: (u) => <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{u.role}</span> },
    {
      key: 'today', header: 'Today', width: '18%',
      accessor: (u) => {
        const p = cashierPerf.get(u.id);
        return <div style={{ fontSize: '11px', lineHeight: '1.6' }}><span style={{ color: 'var(--color-text-secondary)' }}>Sales: </span><strong>{p?.today?.total_sales || 0}</strong><br /><span style={{ color: 'var(--color-text-secondary)' }}>Rev: </span><strong>{formatCurrency(p?.today?.total_revenue || 0)}</strong></div>;
      }
    },
    {
      key: 'week', header: 'This Week', width: '18%',
      accessor: (u) => {
        const p = cashierPerf.get(u.id);
        return <div style={{ fontSize: '11px', lineHeight: '1.6' }}><span style={{ color: 'var(--color-text-secondary)' }}>Sales: </span><strong>{p?.this_week?.total_sales || 0}</strong><br /><span style={{ color: 'var(--color-text-secondary)' }}>Rev: </span><strong>{formatCurrency(p?.this_week?.total_revenue || 0)}</strong></div>;
      }
    },
    {
      key: 'month', header: 'This Month', width: '19%',
      accessor: (u) => {
        const p = cashierPerf.get(u.id);
        return <div style={{ fontSize: '11px', lineHeight: '1.6' }}><span style={{ color: 'var(--color-text-secondary)' }}>Sales: </span><strong>{p?.this_month?.total_sales || 0}</strong><br /><span style={{ color: 'var(--color-text-secondary)' }}>Rev: </span><strong>{formatCurrency(p?.this_month?.total_revenue || 0)}</strong></div>;
      }
    },
  ];

  const auditColumns: Column<models.AuditLog>[] = [
    { key: 'timestamp', header: 'Time', width: '20%', accessor: (log) => <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span> },
    { key: 'username', header: 'User', width: '15%', accessor: (log) => <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{log.username}</span> },
    { key: 'action', header: 'Action', width: '20%', accessor: (log) => <span style={{ fontWeight: 600, color: 'var(--color-text-accent)' }}>{log.action}</span> },
    { key: 'details', header: 'Details', width: '45%', accessor: (log) => <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{log.details}</span> },
  ];

  const handleExportCSV = () => {
    try {
      if (activeTab === 'inventory') {
        const rows = [
          ['Medicine Name', 'Category', 'Buying Price', 'Selling Price', 'Stock Qty', 'Valuation'],
          ...filteredMedicines.map(m => [m.name, m.category || '', String(m.buying_price), String(m.selling_price), String(m.current_stock), String(m.current_stock * m.buying_price)])
        ];
        downloadCSV(`inventory_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      } else if (activeTab === 'expiry') {
        const rows = [
          ['Batch Number', 'Item', 'Qty at Risk', 'Days Until Expiry', 'Expiry Date'],
          ...filteredBatches.map(b => [b.batch_number, b.medicine_name || '', String(b.quantity_remaining), String(daysUntil(b.expiry_date)), formatDate(b.expiry_date)])
        ];
        downloadCSV(`expiry_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      } else if (activeTab === 'audit') {
        const rows = [
          ['Timestamp', 'User', 'Action', 'Details'],
          ...filteredLogs.map(log => [new Date(log.timestamp).toISOString(), log.username, log.action, log.details])
        ];
        downloadCSV(`audit_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      } else if (activeTab === 'performance') {
        const rows = [
          ['Username', 'Name', 'Role', 'Today Sales', 'Today Revenue', 'Week Sales', 'Week Revenue', 'Month Sales', 'Month Revenue'],
          ...allUsers.map(u => {
            const p = cashierPerf.get(u.id);
            return [u.username, u.full_name, u.role, String(p?.today?.total_sales || 0), String(p?.today?.total_revenue || 0), String(p?.this_week?.total_sales || 0), String(p?.this_week?.total_revenue || 0), String(p?.this_month?.total_sales || 0), String(p?.this_month?.total_revenue || 0)];
          })
        ];
        downloadCSV(`performance_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      }
    } catch { /* csv download errors are rare */ }
  };

  const totalValuation = filteredMedicines.reduce((acc, m) => acc + (m.current_stock * m.buying_price), 0);

  const tabMeta: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'inventory', label: 'Inventory', icon: <Package size={14} />, count: medicines.length },
    { key: 'expiry', label: 'Expiry', icon: <Clock size={14} />, count: expiringBatches.length },
    { key: 'performance', label: 'Performance', icon: <Users size={14} /> },
    { key: 'sales', label: 'Sales Summary', icon: <BarChart3 size={14} /> },
    { key: 'audit', label: 'Audit Trail', icon: <Shield size={14} />, count: auditLogs.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '0', backgroundColor: 'var(--color-bg-base)' }}>
      <Panel noPadding style={{ padding: '0 16px', height: '44px', minHeight: '44px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Reports & Analytics
          </div>
        </div>
      </Panel>

      <div style={{ display: 'flex', gap: '12px', flex: 1, overflow: 'hidden' }}>
        {/* Left Navigation */}
        <Panel noPadding style={{ width: '220px', height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px' }}>
            {tabMeta.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{
                  height: '36px', fontSize: '12px', fontWeight: 600, justifyContent: 'flex-start', gap: '8px',
                  padding: '0 12px', borderRadius: '0px',
                  backgroundColor: activeTab === t.key ? 'var(--color-accent-subtle)' : 'transparent',
                  border: activeTab === t.key ? '1px solid var(--color-accent-base)' : '1px solid transparent',
                  color: activeTab === t.key ? 'var(--color-accent-base)' : 'var(--color-text-secondary)'
                }}
              >{t.icon} {t.label}{t.count !== undefined ? ` (${t.count})` : ''}</button>
            ))}
          </div>
        </Panel>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Toolbar inside content area */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '0 16px 12px', minHeight: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              {activeTab !== 'sales' && activeTab !== 'performance' && (
                <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={`Search ${activeTab}...`}
                    style={{ width: '100%', height: '28px', padding: '0 8px 0 28px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', outline: 'none', fontSize: '12px' }} />
                </div>
              )}
              {activeTab === 'inventory' && (
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                  Stock Value: <span style={{ color: 'var(--color-text-accent)' }}>UGX {formatCurrency(totalValuation)}</span>
                </div>
              )}
            </div>
            {activeTab !== 'sales' && (
              <button onClick={handleExportCSV} disabled={isLoading} className="desktop-btn-primary"
                style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 14px', borderRadius: '0px', opacity: isLoading ? 0.6 : 1 }}>
                <Download size={14} /> Export CSV
              </button>
            )}
          </div>

          {fetchError && (
            <div style={{ margin: '0 16px 12px', padding: '8px 12px', fontSize: '12px', color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{fetchError}</span>
              <button onClick={() => loadTabData(activeTab)} style={{ fontSize: '11px', cursor: 'pointer', background: 'none', border: '1px solid var(--color-danger-border)', padding: '2px 8px', borderRadius: '0px', color: 'var(--color-danger-text)' }}>Retry</button>
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeTab === 'inventory' && (
              <DataGrid columns={inventoryColumns} data={filteredMedicines} keyExtractor={(m) => m.id}
                isLoading={isLoading} emptyMessage={debouncedSearch ? 'No medicines match search.' : 'No inventory records.'}
                compactRows={true} zebraStriping={true} maxHeight="calc(100vh - 205px)" style={{ flex: 1 }} />
            )}

            {activeTab === 'expiry' && (
              <DataGrid columns={expiryColumns} data={filteredBatches} keyExtractor={(b) => b.id}
                isLoading={isLoading} emptyMessage={debouncedSearch ? 'No batches match search.' : 'No batches expiring within 90 days.'}
                compactRows={true} zebraStriping={true} maxHeight="calc(100vh - 205px)" style={{ flex: 1 }} />
            )}

            {activeTab === 'performance' && (
              <DataGrid columns={performanceColumns} data={allUsers} keyExtractor={(u) => u.id}
                isLoading={isLoading} emptyMessage="No users found."
                compactRows={true} zebraStriping={true} maxHeight="calc(100vh - 205px)" style={{ flex: 1 }} />
            )}

            {activeTab === 'audit' && (
              <DataGrid columns={auditColumns} data={filteredLogs} keyExtractor={(log) => log.id}
                isLoading={isLoading} emptyMessage={debouncedSearch ? 'No audit logs match search.' : 'No audit logs found.'}
                compactRows={true} zebraStriping={true} maxHeight="calc(100vh - 205px)" style={{ flex: 1 }} />
            )}

            {activeTab === 'sales' && salesSummary && (
              <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '16px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-panel)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Today</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent-base)' }}>UGX {formatCurrency(salesSummary.today_total)}</div>
                  </div>
                  <div style={{ padding: '16px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-panel)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>This Week</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent-base)' }}>UGX {formatCurrency(salesSummary.week_total)}</div>
                  </div>
                  <div style={{ padding: '16px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-panel)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>This Month</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent-base)' }}>UGX {formatCurrency(salesSummary.month_total)}</div>
                  </div>
                  <div style={{ padding: '16px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-panel)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Transactions</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{salesSummary.total_sales}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ border: '1px solid var(--color-border-default)' }}>
                    <div style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-panel)' }}>Revenue by Payment Method</div>
                    {salesSummary.by_method.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>No sales data yet.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead><tr style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Method</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Count</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Total (UGX)</th>
                        </tr></thead>
                        <tbody>
                          {salesSummary.by_method.map(m => (
                            <tr key={m.method} style={{ borderTop: '1px solid var(--color-border-default)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>{m.method}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>{m.count}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-accent)' }}>{formatCurrency(m.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div style={{ border: '1px solid var(--color-border-default)' }}>
                    <div style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-panel)' }}>Top Selling Products</div>
                    {salesSummary.top_products.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>No sales data yet.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead><tr style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Product</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Qty Sold</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Revenue (UGX)</th>
                        </tr></thead>
                        <tbody>
                          {salesSummary.top_products.map(p => (
                            <tr key={p.medicine_id} style={{ borderTop: '1px solid var(--color-border-default)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.medicine_name}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>{p.quantity_sold}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-accent)' }}>{formatCurrency(p.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};