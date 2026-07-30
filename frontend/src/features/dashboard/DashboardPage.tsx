import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  Pill,
  AlertTriangle,
  Clock,
  ShieldAlert,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { GetDashboardSummary } from '../../../wailsjs/go/main/App';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { NavItemKey } from '../../components/layout/Sidebar';

interface DashboardPageProps {
  onSelectView?: (view: NavItemKey, filter?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectView }) => {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [summary, setSummary] = useState<any>({
    sales_today: 0,
    total_medicines: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    expiring_soon_count: 0,
    recent_sales: [],
    recent_purchases: [],
    expiring_items: [],
    low_stock_items: [],
    sales_trend: []
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setHasError(false);
    try {
      let data: any = null;
      try {
        data = await GetDashboardSummary();
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.GetDashboardSummary === 'function') {
          data = await wailsApp.GetDashboardSummary();
        }
      }
      if (!data) {
        setHasError(true);
        toast.error('Failed to load live metrics');
      } else {
        setSummary(data);
        setLastUpdated(new Date());
        setSecondsAgo(0);
      }
    } catch (err: any) {
      setHasError(true);
      console.error(err);
      toast.error('Failed to load live metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const refreshInterval = setInterval(fetchDashboardData, 30000);
    const secondsTimer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(secondsTimer);
    };
  }, []);

  const kpiCards = [
    {
      id: 'today_sales',
      title: "Today's Sales",
      value: `UGX ${formatCurrency(summary.sales_today || 0)}`,
      subtitle: "POS Terminal Sales",
      icon: TrendingUp,
      accentColor: 'var(--blue)',
      topBorder: 'var(--blue)',
      targetView: 'reports' as NavItemKey,
      filter: undefined,
      hasSparkline: true
    },
    {
      id: 'active_skus',
      title: "Active SKUs",
      value: formatNumber(summary.total_medicines || 0),
      subtitle: "Master Catalog Items",
      icon: Pill,
      accentColor: 'var(--cyan)',
      topBorder: 'var(--cyan)',
      targetView: 'inventory' as NavItemKey,
      filter: 'all'
    },
    {
      id: 'low_stock',
      title: "Low Stock Alert",
      value: formatNumber(summary.low_stock_count || 0),
      subtitle: "Reorder Threshold",
      icon: AlertTriangle,
      accentColor: 'var(--yellow)',
      topBorder: 'var(--yellow)',
      targetView: 'inventory' as NavItemKey,
      filter: 'low_stock'
    },
    {
      id: 'out_of_stock',
      title: "Out of Stock",
      value: formatNumber(summary.out_of_stock_count || 0),
      subtitle: "Zero Quantity Count",
      icon: ShieldAlert,
      accentColor: 'var(--red)',
      topBorder: 'var(--red)',
      targetView: 'inventory' as NavItemKey,
      filter: 'out_of_stock'
    },
    {
      id: 'expiring_batches',
      title: "Expiring Batches",
      value: formatNumber(summary.expiring_soon_count || 0),
      subtitle: "Within 90 Days",
      icon: Clock,
      accentColor: 'var(--yellow)',
      topBorder: 'var(--yellow)',
      targetView: 'reports' as NavItemKey,
      filter: 'expiring'
    }
  ];

  const renderPaymentMethodBadge = (method: string) => {
    const m = (method || 'Cash').toLowerCase();
    let bg = 'rgba(46, 125, 50, 0.12)';
    let border = 'rgba(46, 125, 50, 0.3)';
    let color = '#4caf50';

    if (m.includes('card')) {
      bg = 'rgba(2, 136, 209, 0.12)';
      border = 'rgba(2, 136, 209, 0.3)';
      color = '#29b6f6';
    } else if (m.includes('mobile') || m.includes('momo') || m.includes('phone')) {
      bg = 'rgba(156, 39, 176, 0.12)';
      border = 'rgba(156, 39, 176, 0.3)';
      color = '#ab47bc';
    } else if (!m.includes('cash')) {
      bg = 'rgba(100, 116, 139, 0.12)';
      border = 'rgba(100, 116, 139, 0.3)';
      color = '#64748b';
    }

    return (
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        padding: '2px 8px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: color,
        borderRadius: '0px',
        textTransform: 'uppercase',
        letterSpacing: '0.03em'
      }}>
        {method || 'Cash'}
      </span>
    );
  };

  // Sparkline Chart Component for 7-day Sales Trend
  const SparklineChart: React.FC<{ data: any[] }> = ({ data }) => {
    if (!data || data.length === 0) {
      return null;
    }
    const max = Math.max(...data.map(d => d.amount), 1);
    const min = Math.min(...data.map(d => d.amount), 0);
    const range = max - min || 1;

    const width = 110;
    const height = 28;
    const points = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((d.amount - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }} title="7-Day Sales Trend">
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <polyline
            fill="none"
            stroke="var(--color-accent-base)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {data.map((d, idx) => {
            const x = (idx / (data.length - 1)) * width;
            const y = height - ((d.amount - min) / range) * (height - 6) - 3;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={idx === data.length - 1 ? "3" : "1.5"}
                fill="var(--color-accent-base)"
              />
            );
          })}
        </svg>
        <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          7-DAY TREND
        </span>
      </div>
    );
  };

  const salesColumns: Column<any>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      width: '30%',
      accessor: (s) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.invoice_number}</span>
    },
    {
      key: 'username',
      header: 'Operator',
      width: '25%',
      accessor: (s) => <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{s.username}</span>
    },
    {
      key: 'payment_method',
      header: 'Pay Method',
      width: '20%',
      accessor: (s) => renderPaymentMethodBadge(s.payment_method)
    },
    {
      key: 'total_amount',
      header: 'Total (UGX)',
      width: '25%',
      align: 'right' as const,
      accessor: (s) => <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{formatCurrency(s.total_amount)}</span>
    }
  ];

  const purchaseColumns: Column<any>[] = [
    {
      key: 'invoice_number',
      header: 'Supplier Invoice',
      width: '35%',
      accessor: (p) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.invoice_number}</span>
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      width: '35%',
      accessor: (p) => <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{p.supplier_name || 'Generic'}</span>
    },
    {
      key: 'total_amount',
      header: 'Amount (UGX)',
      width: '30%',
      align: 'right' as const,
      accessor: (p) => <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{formatCurrency(p.total_amount)}</span>
    }
  ];

  const expiringColumns: Column<any>[] = [
    {
      key: 'medicine_name',
      header: 'Pharmaceutical Item',
      width: '40%',
      accessor: (item) => (
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
          {item.medicine_name}
        </span>
      )
    },
    {
      key: 'batch_number',
      header: 'Batch #',
      width: '25%',
      accessor: (item) => (
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted)' }}>
          {item.batch_number}
        </span>
      )
    },
    {
      key: 'quantity_remaining',
      header: 'Qty',
      width: '15%',
      align: 'center' as const,
      accessor: (item) => (
        <span style={{ fontWeight: 700, color: 'var(--red)' }}>
          {item.quantity_remaining}
        </span>
      )
    },
    {
      key: 'days_until_expiry',
      header: 'Expiry Status',
      width: '20%',
      align: 'right' as const,
      accessor: (item) => (
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: item.days_until_expiry <= 30 ? 'var(--red)' : 'var(--yellow)'
        }}>
          {item.days_until_expiry < 0 ? 'EXPIRED' : item.days_until_expiry === 0 ? 'Expiring today' : `${item.days_until_expiry} days left`}
        </span>
      )
    }
  ];

  const lowStockColumns: Column<any>[] = [
    {
      key: 'medicine_name',
      header: 'Medicine Item',
      width: '45%',
      accessor: (item) => (
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
          {item.medicine_name || item.name}
        </span>
      )
    },
    {
      key: 'current_stock',
      header: 'Stock Qty',
      width: '25%',
      align: 'center' as const,
      accessor: (item) => (
        <span style={{ fontWeight: 700, color: 'var(--yellow)' }}>
          {item.current_stock}
        </span>
      )
    },
    {
      key: 'reorder_level',
      header: 'Reorder Level',
      width: '30%',
      align: 'right' as const,
      accessor: (item) => (
        <span style={{ fontSize: '11px', color: 'var(--muted-dark)' }}>
          Threshold: {item.reorder_level}
        </span>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0, overflowY: 'auto', padding: '0', boxSizing: 'border-box' }}>
      
      {/* Header Bar with Live Refresh Ticker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 14px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: '20px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', animation: 'pulse-glow 2s infinite', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.04em' }}>LIVE</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Updated {secondsAgo}s ago
            </span>
          )}
          <button
            onClick={fetchDashboardData}
            title="Refresh"
            className="win-btn"
            style={{ width: '36px', height: '36px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {hasError && !loading && (
        <div style={{
          padding: '14px 18px',
          background: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger-border)',
          color: 'var(--color-danger-text)',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderRadius: 'var(--r)',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>Could not load dashboard data. Check the backend connection.</span>
          <button onClick={fetchDashboardData} className="btn btn-danger" style={{ marginLeft: 'auto', padding: '6px 14px', minHeight: 'unset', height: 'auto', fontSize: '12px' }}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Metric Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="dashboard-kpi-card"
              onClick={() => onSelectView?.(card.targetView, card.filter)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderTop: `3px solid ${card.topBorder}`,
                borderRadius: 'var(--r2)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: 'var(--shadow)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-dropdown)'; e.currentTarget.style.borderColor = card.topBorder; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderTopColor = card.topBorder; e.currentTarget.style.borderRightColor = 'var(--line)'; e.currentTarget.style.borderBottomColor = 'var(--line)'; e.currentTarget.style.borderLeftColor = 'var(--line)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.02em' }}>
                  {card.title}
                </span>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: `${card.accentColor}18`,
                  border: `1px solid ${card.accentColor}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: card.accentColor,
                }}>
                  <Icon size={16} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: card.accentColor, letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '5px' }}>
                  {card.subtitle}
                </div>
              </div>
              {card.hasSparkline && (
                <SparklineChart data={summary.sales_trend || []} />
              )}
            </div>
          );
        })}
      </div>

      {/* Primary Activity Grids */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minHeight: '260px' }}>
        <Panel
          noPadding
          style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          headerRight={
            <button
              onClick={() => onSelectView?.('reports')}
              style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: '0', minHeight: 'unset', height: 'auto', transform: 'none', boxShadow: 'none' }}
            >
              View all <ChevronRight size={13} />
            </button>
          }
          title="Live POS Transactions"
        >
          <DataGrid
            columns={salesColumns}
            data={summary.recent_sales || []}
            keyExtractor={(s) => s.id}
            isLoading={loading}
            emptyMessage="No POS transactions completed today."
            compactRows={true}
            zebraStriping={true}
            maxHeight="196px"
          />
        </Panel>

        <Panel
          noPadding
          style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          headerRight={
            <button
              onClick={() => onSelectView?.('purchases')}
              style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: '0', minHeight: 'unset', height: 'auto', transform: 'none', boxShadow: 'none' }}
            >
              View all <ChevronRight size={13} />
            </button>
          }
          title="Recent Procurement GRNs"
        >
          <DataGrid
            columns={purchaseColumns}
            data={summary.recent_purchases || []}
            keyExtractor={(p) => p.id}
            isLoading={loading}
            emptyMessage="No stock purchase invoices received recently."
            compactRows={true}
            zebraStriping={true}
            maxHeight="196px"
          />
        </Panel>
      </div>

      {/* Secondary Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minHeight: '240px', marginBottom: '8px' }}>
        {/* Expiring Soon Details Panel */}
        <Panel
          noPadding
          style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          headerRight={
            <button
              onClick={() => onSelectView?.('reports', 'expiring')}
              style={{ background: 'none', border: 'none', color: 'var(--yellow)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: '0', minHeight: 'unset', height: 'auto', transform: 'none', boxShadow: 'none' }}
            >
              Audit Expiry <ChevronRight size={13} />
            </button>
          }
          title="Expiring Batches (90 days)"
        >
          <DataGrid
            columns={expiringColumns}
            data={summary.expiring_items || []}
            keyExtractor={(item) => item.id}
            isLoading={loading}
            emptyMessage="No inventory batches expiring within the next 90 days."
            compactRows={true}
            zebraStriping={true}
            maxHeight="176px"
          />
        </Panel>

        {/* Low Stock Items Panel */}
        <Panel
          noPadding
          style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          headerRight={
            <button
              onClick={() => onSelectView?.('inventory', 'low_stock')}
              style={{ background: 'none', border: 'none', color: 'var(--yellow)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: '0', minHeight: 'unset', height: 'auto', transform: 'none', boxShadow: 'none' }}
            >
              Reorder All <ChevronRight size={13} />
            </button>
          }
          title="Low Stock Items"
        >
          <DataGrid
            columns={lowStockColumns}
            data={summary.low_stock_items || []}
            keyExtractor={(item) => item.id}
            isLoading={loading}
            emptyMessage="All active medicine items are sufficiently stocked above reorder thresholds."
            compactRows={true}
            zebraStriping={true}
            maxHeight="176px"
          />
        </Panel>
      </div>

    </div>
  );
};
