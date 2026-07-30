import React, { useState, useEffect, useRef } from 'react';
import { Package, Clock, Download, Users, Shield, BarChart3, Search } from 'lucide-react';
import { Medicine, Batch } from '../../types';
import { models, services } from '../../../wailsjs/go/models';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { formatCurrency } from '../../utils/formatters';
import { ListMedicines, GetExpiringBatches, GetSalesSummary, ListUsers, GetCashierPerformance, ListAuditLogs } from '../../../wailsjs/go/main/App';
import { useAuth } from '../../context/AuthContext';

type TabKey = 'inventory' | 'expiry' | 'performance' | 'sales' | 'audit';

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
      }

      if (tab === 'audit') {
        const logs = await tryLoad(() => ListAuditLogs(200, user!.id), () => (window as any)?.go?.main?.App?.ListAuditLogs?.(200, user!.id));
        if (abortRef.current) return;
        setAuditLogs(logs || []);
      }
    } catch (err: unknown) {
      if (abortRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load report data';
      setFetchError(msg);
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
    { key: 'name', header: 'Medicine', width: '30%', accessor: (m) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.name} <span style={{ fontSize: '11px', color: 'var(--muted)' }}>({m.dosage_strength || m.medicine_form})</span></span> },
    { key: 'category', header: 'Category', width: '15%', accessor: (m) => <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{m.category || 'General'}</span> },
    { key: 'buying_price', header: 'Buying Price (UGX)', width: '15%', align: 'right' as const, accessor: (m) => <span className="tabular-nums">{formatCurrency(m.buying_price)}</span> },
    { key: 'selling_price', header: 'Selling Price (UGX)', width: '15%', align: 'right' as const, accessor: (m) => <span className="tabular-nums" style={{ color: 'var(--blue)' }}>{formatCurrency(m.selling_price)}</span> },
    { key: 'current_stock', header: 'In Stock', width: '10%', align: 'center' as const, accessor: (m) => <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{m.current_stock}</span> },
    { key: 'valuation', header: 'Valuation (UGX)', width: '15%', align: 'right' as const, accessor: (m) => <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--green)' }}>{formatCurrency(m.current_stock * m.buying_price)}</span> },
  ];

  const expiryColumns: Column<Batch>[] = [
    { key: 'batch_number', header: 'Batch #', width: '20%', accessor: (b) => <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{b.batch_number}</span> },
    { key: 'medicine_name', header: 'Medicine Item', width: '35%', accessor: (b) => <span style={{ color: 'var(--ink)' }}>{b.medicine_name || `#${b.medicine_id}`}</span> },
    { key: 'quantity_remaining', header: 'Qty at Risk', width: '15%', align: 'center' as const, accessor: (b) => <span style={{ fontWeight: 700, color: 'var(--red)' }}>{b.quantity_remaining}</span> },
    {
      key: 'days_until_expiry', header: 'Days Left', width: '15%', align: 'center' as const,
      accessor: (b) => {
        const days = daysUntil(b.expiry_date);
        const color = days <= 0 ? 'var(--red)' : days <= 30 ? 'var(--red)' : days <= 60 ? 'var(--yellow)' : 'var(--muted)';
        return <span style={{ fontWeight: 700, color }}>{days <= 0 ? 'EXPIRED' : `${days} days`}</span>;
      }
    },
    { key: 'expiry_date', header: 'Expiry Date', width: '15%', align: 'right' as const, accessor: (b) => <span style={{ fontWeight: 600, color: 'var(--muted-dark)' }}>{formatDate(b.expiry_date)}</span> },
  ];

  const performanceColumns: Column<models.User>[] = [
    { key: 'username', header: 'Username', width: '20%', accessor: (u) => <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{u.username}</span> },
    { key: 'full_name', header: 'Staff Name', width: '25%', accessor: (u) => <span style={{ fontSize: '12px', color: 'var(--ink)' }}>{u.full_name || '—'}</span> },
    { key: 'role', header: 'Role Privilege', width: '15%', accessor: (u) => <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)' }}>{u.role}</span> },
    {
      key: 'today', header: 'Today Sales', width: '20%',
      accessor: (u) => {
        const p = cashierPerf.get(u.id);
        return <div style={{ fontSize: '12px' }}><strong>{p?.today?.total_sales || 0} orders</strong> · <span className="tabular-nums" style={{ color: 'var(--blue)', fontWeight: 700 }}>UGX {formatCurrency(p?.today?.total_revenue || 0)}</span></div>;
      }
    },
    {
      key: 'month', header: 'This Month', width: '20%',
      accessor: (u) => {
        const p = cashierPerf.get(u.id);
        return <div style={{ fontSize: '12px' }}><strong>{p?.this_month?.total_sales || 0} orders</strong> · <span className="tabular-nums" style={{ color: 'var(--green)', fontWeight: 700 }}>UGX {formatCurrency(p?.this_month?.total_revenue || 0)}</span></div>;
      }
    },
  ];

  const auditColumns: Column<models.AuditLog>[] = [
    { key: 'timestamp', header: 'Time', width: '20%', accessor: (log) => <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(log.timestamp).toLocaleString()}</span> },
    { key: 'username', header: 'Operator', width: '15%', accessor: (log) => <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{log.username}</span> },
    { key: 'action', header: 'System Action', width: '20%', accessor: (log) => <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{log.action}</span> },
    { key: 'details', header: 'Details', width: '45%', accessor: (log) => <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{log.details}</span> },
  ];

  const handleExportCSV = () => {
    try {
      if (activeTab === 'inventory') {
        const rows = [
          ['Medicine Name', 'Category', 'Buying Price', 'Selling Price', 'Stock Qty', 'Valuation'],
          ...filteredMedicines.map(m => [m.name, m.category || '', String(m.buying_price), String(m.selling_price), String(m.current_stock), String(m.current_stock * m.buying_price)])
        ];
        downloadCSV(`inventory_report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      } else if (activeTab === 'expiry') {
        const rows = [
          ['Batch Number', 'Item', 'Qty at Risk', 'Days Until Expiry', 'Expiry Date'],
          ...filteredBatches.map(b => [b.batch_number, b.medicine_name || '', String(b.quantity_remaining), String(daysUntil(b.expiry_date)), formatDate(b.expiry_date)])
        ];
        downloadCSV(`expiry_report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      } else if (activeTab === 'audit') {
        const rows = [
          ['Timestamp', 'User', 'Action', 'Details'],
          ...filteredLogs.map(log => [new Date(log.timestamp).toISOString(), log.username, log.action, log.details])
        ];
        downloadCSV(`audit_trail_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      } else if (activeTab === 'performance') {
        const rows = [
          ['Username', 'Name', 'Role', 'Today Sales', 'Today Revenue', 'Month Sales', 'Month Revenue'],
          ...allUsers.map(u => {
            const p = cashierPerf.get(u.id);
            return [u.username, u.full_name, u.role, String(p?.today?.total_sales || 0), String(p?.today?.total_revenue || 0), String(p?.this_month?.total_sales || 0), String(p?.this_month?.total_revenue || 0)];
          })
        ];
        downloadCSV(`staff_performance_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      }
    } catch { /* export safeguard */ }
  };

  const totalValuation = filteredMedicines.reduce((acc, m) => acc + (m.current_stock * m.buying_price), 0);

  const tabBtn = (key: TabKey, label: string, icon: React.ReactNode, count?: number) => (
    <button
      type="button"
      onClick={() => setActiveTab(key)}
      style={{
        height: '36px',
        padding: '0 16px',
        fontSize: '13px',
        fontWeight: 600,
        borderRadius: 'var(--r)',
        background: activeTab === key ? 'var(--surface)' : 'transparent',
        color: activeTab === key ? 'var(--blue)' : 'var(--muted)',
        border: activeTab === key ? '1px solid var(--line-strong)' : '1px solid transparent',
        boxShadow: activeTab === key ? 'var(--shadow-btn)' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: '10px',
          background: activeTab === key ? 'rgba(18,108,255,0.12)' : 'var(--surface-soft)',
          color: activeTab === key ? 'var(--blue)' : 'var(--muted)'
        }}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', minHeight: 0, width: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      
      {/* ── Top Header Strip & Navigation Pills ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-soft)', padding: '4px', borderRadius: 'var(--r2)', border: '1px solid var(--line)' }}>
          {tabBtn('inventory', 'Inventory Stock', <Package size={14} />, medicines.length)}
          {tabBtn('expiry', 'Expiry Risk (90d)', <Clock size={14} />, expiringBatches.length)}
          {tabBtn('sales', 'Sales Reports', <BarChart3 size={14} />)}
          {tabBtn('performance', 'Staff Performance', <Users size={14} />)}
          {tabBtn('audit', 'Audit Logs', <Shield size={14} />, auditLogs.length)}
        </div>

        {activeTab !== 'sales' && (
          <button onClick={handleExportCSV} disabled={isLoading} className="btn btn-primary" style={{ gap: '6px' }}>
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* ── Main Scrollable Body ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* Search bar & stock valuation strip */}
        {activeTab !== 'sales' && activeTab !== 'performance' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexShrink: 0 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${activeTab} records…`}
                style={{ width: '100%', paddingLeft: '36px', height: '38px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            {activeTab === 'inventory' && (
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginLeft: 'auto' }}>
                Total Stock Valuation: <strong className="tabular-nums" style={{ color: 'var(--blue)', fontSize: '14px' }}>UGX {formatCurrency(totalValuation)}</strong>
              </div>
            )}
          </div>
        )}

        {fetchError && (
          <div style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--red)', background: 'rgba(255,56,96,0.1)', border: '1px solid var(--red)', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{fetchError}</span>
            <button onClick={() => loadTabData(activeTab)} className="btn" style={{ fontSize: '12px' }}>Retry</button>
          </div>
        )}

        {/* ── TAB CONTENT VIEWS ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          
          {activeTab === 'inventory' && (
            <DataGrid
              columns={inventoryColumns}
              data={filteredMedicines}
              keyExtractor={(m) => m.id}
              isLoading={isLoading}
              emptyMessage={debouncedSearch ? 'No medicines match search term.' : 'No inventory records found.'}
              compactRows={true}
              zebraStriping={true}
              style={{ flex: 1 }}
            />
          )}

          {activeTab === 'expiry' && (
            <DataGrid
              columns={expiryColumns}
              data={filteredBatches}
              keyExtractor={(b) => b.id}
              isLoading={isLoading}
              emptyMessage={debouncedSearch ? 'No expiring batches match search.' : 'No stock expiring within 90 days.'}
              compactRows={true}
              zebraStriping={true}
              style={{ flex: 1 }}
            />
          )}

          {activeTab === 'performance' && (
            <DataGrid
              columns={performanceColumns}
              data={allUsers}
              keyExtractor={(u) => u.id}
              isLoading={isLoading}
              emptyMessage="No staff members registered."
              compactRows={true}
              zebraStriping={true}
              style={{ flex: 1 }}
            />
          )}

          {activeTab === 'audit' && (
            <DataGrid
              columns={auditColumns}
              data={filteredLogs}
              keyExtractor={(log) => log.id}
              isLoading={isLoading}
              emptyMessage={debouncedSearch ? 'No audit logs match search.' : 'No audit logs recorded.'}
              compactRows={true}
              zebraStriping={true}
              style={{ flex: 1 }}
            />
          )}

          {activeTab === 'sales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* Sales Metric KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <Panel style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Today's Revenue</div>
                  <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--blue)' }}>
                    UGX {formatCurrency(salesSummary?.today_total || 0)}
                  </div>
                </Panel>

                <Panel style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>7-Day Revenue</div>
                  <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--blue)' }}>
                    UGX {formatCurrency(salesSummary?.week_total || 0)}
                  </div>
                </Panel>

                <Panel style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Monthly Revenue</div>
                  <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--green)' }}>
                    UGX {formatCurrency(salesSummary?.month_total || 0)}
                  </div>
                </Panel>

                <Panel style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Completed Orders</div>
                  <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)' }}>
                    {salesSummary?.total_sales || 0}
                  </div>
                </Panel>
              </div>

              {/* Payment Methods & Top Selling Products */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <Panel noPadding>
                  <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', borderBottom: '1px solid var(--line)' }}>Payment Methods</div>
                  {!salesSummary || salesSummary.by_method.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>No sales transactions yet.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-soft)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Method</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)' }}>Orders</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)' }}>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesSummary.by_method.map(m => (
                          <tr key={m.method} style={{ borderTop: '1px solid var(--line)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--ink)' }}>💵 {m.method}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--muted)' }}>{m.count}</td>
                            <td className="tabular-nums" style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>UGX {formatCurrency(m.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Panel>

                <Panel noPadding>
                  <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', borderBottom: '1px solid var(--line)' }}>Top Selling Medicines</div>
                  {!salesSummary || salesSummary.top_products.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>No sales transactions yet.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-soft)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Medicine Item</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)' }}>Units Sold</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)' }}>Total Revenue (UGX)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesSummary.top_products.map(p => (
                          <tr key={p.medicine_id} style={{ borderTop: '1px solid var(--line)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--ink)' }}>{p.medicine_name}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--muted)' }}>{p.quantity_sold}</td>
                            <td className="tabular-nums" style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{formatCurrency(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Panel>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};