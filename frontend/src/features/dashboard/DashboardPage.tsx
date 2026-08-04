import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { GetDashboardSummary, GetSalesSummary } from '../../../wailsjs/go/main/App';
import { formatCurrency } from '../../utils/formatters';
import { NavItemKey } from '../../components/layout/Sidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface DashboardPageProps {
  onSelectView?: (view: NavItemKey, filter?: string) => void;
}

/* ── Mini Sparkline graph with connected dots for tiles ─────────────── */
const TileTrendGraph: React.FC<{ data: any[]; color: string }> = ({ data, color }) => {
  if (!data || data.length === 0) return null;

  // Use provided sales trend points or generate smooth curve points
  const pointsData = data.length >= 2 ? data : [
    { amount: 10 }, { amount: 25 }, { amount: 18 }, { amount: 40 }, { amount: 35 }, { amount: 55 }, { amount: 70 }
  ];

  const max = Math.max(...pointsData.map(d => d.amount), 1);
  const min = Math.min(...pointsData.map(d => d.amount), 0);
  const range = max - min || 1;

  const width = 110;
  const height = 34;

  const points = pointsData.map((d, i) => {
    const x = (i / (pointsData.length - 1)) * (width - 12) + 6;
    const y = height - ((d.amount - min) / range) * (height - 12) - 6;
    return { x, y, amount: d.amount };
  });

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Connecting Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylineStr}
          style={{ opacity: 0.8 }}
        />
        {/* Graph Dots */}
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={idx === points.length - 1 ? 3.5 : 2}
            fill={color}
            stroke="var(--surface)"
            strokeWidth={idx === points.length - 1 ? 1.5 : 1}
          />
        ))}
      </svg>
      <span style={{ fontSize: '9px', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        ▲ Trend
      </span>
    </div>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectView }) => {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [alertTab, setAlertTab] = useState<'low' | 'expiring'>('low');

  const [summary, setSummary] = useState<any>({
    sales_today: 0, total_medicines: 0,
    low_stock_count: 0, out_of_stock_count: 0, expiring_soon_count: 0,
    recent_sales: [], recent_purchases: [], expiring_items: [], low_stock_items: [], sales_trend: [],
  });
  const [salesSummary, setSalesSummary] = useState<any>({
    today_total: 0, week_total: 0, month_total: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true); setHasError(false);
    try {
      const callWails = async (fn: any, key: string) => {
        try { return await fn(); }
        catch { const w = (window as any)?.go?.main?.App; if (w?.[key]) return await w[key](); return null; }
      };
      const [dash, sales] = await Promise.all([
        callWails(GetDashboardSummary, 'GetDashboardSummary'),
        callWails(GetSalesSummary, 'GetSalesSummary'),
      ]);
      if (!dash) { setHasError(true); toast.error('Failed to load dashboard'); }
      else { setSummary(dash); if (sales) setSalesSummary(sales); }
    } catch { setHasError(true); toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const ri = setInterval(fetchData, 30000);
    return () => clearInterval(ri);
  }, [fetchData]);

  const PayBadge: React.FC<{ method: string }> = ({ method }) => {
    const isMobile = (method || '').toLowerCase().includes('mobile');
    return (
      <span style={{
        fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
        background: isMobile ? 'rgba(167,139,250,0.15)' : 'rgba(16,185,129,0.12)',
        color: isMobile ? '#a78bfa' : '#10b981',
        border: `1px solid ${isMobile ? 'rgba(167,139,250,0.3)' : 'rgba(16,185,129,0.25)'}`,
        textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap',
      }}>
        {isMobile ? 'Mobile' : 'Cash'}
      </span>
    );
  };

  const StockBar: React.FC<{ current: number; reorder: number }> = ({ current, reorder }) => {
    const pct = reorder > 0 ? Math.min((current / reorder) * 100, 100) : 0;
    const color = pct <= 25 ? 'var(--red)' : pct <= 60 ? 'var(--yellow)' : 'var(--green)';
    return (
      <div style={{ height: '4px', background: 'var(--line)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px' }} />
      </div>
    );
  };

  const viewLink = (label: string, view: NavItemKey, filter?: string) => (
    <button onClick={() => onSelectView?.(view, filter)} style={{
      background: 'none', border: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 600,
      cursor: 'pointer', padding: 0, minHeight: 'unset', height: 'auto', transform: 'none', boxShadow: 'none',
    }}>{label} →</button>
  );

  const C = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 'var(--r2)', padding: '20px', boxShadow: 'var(--shadow)', ...extra,
  });

  const Skeleton = ({ h = 48 }: { h?: number }) => (
    <div style={{ height: `${h}px`, background: 'var(--surface-soft)', borderRadius: '8px', animation: 'pulse-glow 1.5s infinite' }} />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '16px' }}>

      {/* ── Top Header Strip with Stock Valuation Pill ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.3px' }}>Dashboard Overview</h1>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Real-time pharmacy metrics & inventory performance</div>
        </div>

        {/* Business Stock Valuation Pill */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '24px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)' }} />
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Business Stock Valuation:</span>
          <span className="tabular-nums" style={{ color: 'var(--blue)', fontWeight: 800, fontSize: '14px' }}>
            {loading ? '—' : `UGX ${formatCurrency(summary.stock_valuation || 0)}`}
          </span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {hasError && !loading && (
        <div style={{ padding: '12px 16px', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--red)', fontWeight: 600 }}>
          <AlertTriangle size={15} />
          <span>Could not load dashboard data.</span>
          <button onClick={fetchData} className="btn btn-danger" style={{ marginLeft: 'auto', padding: '5px 12px', minHeight: 'unset', height: 'auto', fontSize: '12px' }}>Retry</button>
        </div>
      )}

      {/* ── ROW 1: Revenue tiles with dotted trend graphs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>

        {/* Today's Revenue */}
        <div style={C({ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Today's Revenue</div>
              <div style={{ fontSize: loading ? '22px' : '26px', fontWeight: 800, color: 'var(--blue)', letterSpacing: '-0.8px', lineHeight: 1 }}>
                {loading ? '—' : `UGX ${formatCurrency(summary.sales_today || 0)}`}
              </div>
            </div>
            <TileTrendGraph data={summary.sales_trend || []} color="var(--blue)" />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px' }}>POS Terminal Sales</div>
        </div>

        {/* This Week */}
        <div style={C({ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>This Week</div>
              <div style={{ fontSize: loading ? '22px' : '26px', fontWeight: 800, color: '#06b6d4', letterSpacing: '-0.8px', lineHeight: 1 }}>
                {loading ? '—' : `UGX ${formatCurrency(salesSummary.week_total || 0)}`}
              </div>
            </div>
            <TileTrendGraph data={summary.sales_trend || []} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px' }}>Last 7 days</div>
        </div>

        {/* This Month */}
        <div style={C({ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>This Month</div>
              <div style={{ fontSize: loading ? '22px' : '26px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.8px', lineHeight: 1 }}>
                {loading ? '—' : `UGX ${formatCurrency(salesSummary.month_total || 0)}`}
              </div>
            </div>
            <TileTrendGraph data={summary.sales_trend || []} color="#10b981" />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px' }}>{new Date().toLocaleString('default', { month: 'long' })}</div>
        </div>
      </div>

      {/* ── ROW 2: 3 compact inventory alert tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>

        {[
          {
            count: summary.low_stock_count, label: 'Low Stock Items', color: '#eab308',
            bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)',
            view: 'inventory' as NavItemKey, filter: 'low_stock',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          },
          {
            count: summary.out_of_stock_count, label: 'Out of Stock', color: '#ef4444',
            bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)',
            view: 'inventory' as NavItemKey, filter: 'out_of_stock',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          },
          {
            count: summary.expiring_soon_count, label: 'Expiring (90d)', color: '#f97316',
            bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)',
            view: 'reports' as NavItemKey, filter: 'expiring',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          },
        ].map((tile) => (
          <div
            key={tile.label}
            onClick={() => onSelectView?.(tile.view, tile.filter)}
            style={{ ...C({ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s ease' }) }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.borderColor = tile.color; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.borderColor = 'var(--line)'; }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: tile.bg, border: `1px solid ${tile.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {tile.icon}
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: tile.color, lineHeight: 1 }}>{loading ? '—' : tile.count}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px', fontWeight: 600 }}>{tile.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW: Advanced Analytics (Recharts) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Sales Trend Chart */}
        <div style={C({ display: 'flex', flexDirection: 'column', minHeight: '300px' })}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '16px' }}>7-Day Revenue Trend</div>
          <div style={{ flex: 1, width: '100%' }}>
            {loading ? <Skeleton h={240} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.sales_trend || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--muted)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString(undefined, { weekday: 'short' });
                    }} 
                  />
                  <YAxis 
                    stroke="var(--muted)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `UGX ${(val/1000)}k`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '8px', boxShadow: 'var(--shadow)', fontSize: '12px' }}
                    itemStyle={{ color: 'var(--blue)', fontWeight: 700 }}
                    formatter={(value: any) => [`UGX ${formatCurrency(value)}`, 'Revenue']}
                    labelStyle={{ color: 'var(--muted)', marginBottom: '4px' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="var(--blue)" strokeWidth={3} dot={{ r: 4, fill: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products Bar Chart */}
        <div style={C({ display: 'flex', flexDirection: 'column', minHeight: '300px' })}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '16px' }}>Top Selling Products</div>
          <div style={{ flex: 1, width: '100%' }}>
            {loading ? <Skeleton h={240} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(salesSummary?.top_products || []).slice(0, 5)} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="medicine_name" type="category" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} width={100} tickFormatter={(val) => val.length > 12 ? val.substring(0, 12) + '...' : val} />
                  <Tooltip 
                    cursor={{ fill: 'var(--surface-soft)' }}
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '8px', boxShadow: 'var(--shadow)', fontSize: '12px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 700 }}
                    formatter={(value: any) => [value, 'Qty Sold']}
                  />
                  <Bar dataKey="quantity_sold" radius={[0, 4, 4, 0]}>
                    {((salesSummary?.top_products || []).slice(0, 5)).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#006FEE', '#06B6D4', '#10B981', '#F5A524', '#F31260'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Activity feed (60%) + Alerts panel (40%) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>

        {/* LEFT: Recent Transactions feed — Now points to POS view */}
        <div style={C({ display: 'flex', flexDirection: 'column', minHeight: '320px' })}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Recent Transactions</span>
            {viewLink('Open POS', 'pos')}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {loading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} h={52} />)
            ) : (summary.recent_sales || []).length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', gap: '8px', padding: '32px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span style={{ fontSize: '13px' }}>No transactions today</span>
              </div>
            ) : (
              (summary.recent_sales || []).map((sale: any, i: number) => (
                <div
                  key={sale.id ?? i}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', borderBottom: i < (summary.recent_sales.length - 1) ? '1px solid var(--line)' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue) 0%, rgba(18,108,255,0.5) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{(sale.username || 'U').charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.invoice_number}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{sale.username}</div>
                  </div>
                  <PayBadge method={sale.payment_method} />
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--blue)', whiteSpace: 'nowrap' }}>
                    UGX {formatCurrency(sale.total_amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Tabbed alerts */}
        <div style={C({ display: 'flex', flexDirection: 'column', minHeight: '320px' })}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', background: 'var(--surface-soft)', borderRadius: '8px', padding: '3px' }}>
            {[
              { key: 'low', label: '⚠ Low Stock', count: summary.low_stock_count, activeColor: '#eab308' },
              { key: 'expiring', label: '⏱ Expiring', count: summary.expiring_soon_count, activeColor: '#f97316' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setAlertTab(tab.key as any)}
                style={{
                  flex: 1, height: '30px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                  background: alertTab === tab.key ? 'var(--surface)' : 'transparent',
                  color: alertTab === tab.key ? tab.activeColor : 'var(--muted)',
                  boxShadow: alertTab === tab.key ? 'var(--shadow)' : 'none',
                  transition: 'all 0.15s', minHeight: 'unset', transform: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{ background: alertTab === tab.key ? tab.activeColor : 'var(--muted)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '20px' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Items */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {loading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} h={56} />)
            ) : alertTab === 'low' ? (
              (summary.low_stock_items || []).length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>All items well stocked ✓</div>
              ) : (
                (summary.low_stock_items || []).map((item: any) => (
                  <div key={item.id} style={{ padding: '10px 12px', background: 'var(--surface-soft)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>{item.medicine_name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#eab308', whiteSpace: 'nowrap' }}>{item.current_stock} / {item.reorder_level}</span>
                    </div>
                    <StockBar current={item.current_stock} reorder={item.reorder_level} />
                  </div>
                ))
              )
            ) : (
              (summary.expiring_items || []).length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>No batches expiring soon ✓</div>
              ) : (
                (summary.expiring_items || []).map((item: any) => {
                  const expired = item.days_until_expiry < 0;
                  const urgent = !expired && item.days_until_expiry <= 30;
                  const alertColor = expired ? '#ef4444' : urgent ? '#f97316' : '#eab308';
                  return (
                    <div key={item.id} style={{ padding: '10px 12px', background: expired ? 'rgba(239,68,68,0.06)' : urgent ? 'rgba(249,115,22,0.06)' : 'var(--surface-soft)', borderRadius: '8px', border: `1px solid ${expired ? 'rgba(239,68,68,0.2)' : urgent ? 'rgba(249,115,22,0.2)' : 'var(--line)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>{item.medicine_name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: alertColor, background: `${alertColor}18`, padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                          {expired ? 'EXPIRED' : `${item.days_until_expiry}d left`}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>Batch {item.batch_number} · Qty: {item.quantity_remaining}</div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
