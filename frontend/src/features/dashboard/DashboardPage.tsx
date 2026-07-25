import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  TrendingUp, 
  Pill, 
  AlertTriangle, 
  Clock, 
  ShieldAlert
} from 'lucide-react';
import { GetDashboardSummary } from '../../../wailsjs/go/main/App';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({
    sales_today: 0,
    total_medicines: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    expiring_soon_count: 0,
    recent_sales: [],
    recent_purchases: []
  });

  const fetchDashboardData = async () => {
    setLoading(true);
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
      setSummary(data || {
        sales_today: 0,
        total_medicines: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        expiring_soon_count: 0,
        recent_sales: [],
        recent_purchases: []
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load live metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const kpiCards = [
    {
      title: "Today's Sales",
      value: `UGX ${(summary.sales_today || 0).toLocaleString()}`,
      subtitle: "POS Terminal Sales",
      icon: TrendingUp,
      borderColor: '#0F8A6A',
      color: '#065F46'
    },
    {
      title: "Active SKUs",
      value: summary.total_medicines || 0,
      subtitle: "Master Catalog Items",
      icon: Pill,
      borderColor: '#CBD5E1',
      color: '#0F172A'
    },
    {
      title: "Low Stock Alert",
      value: summary.low_stock_count || 0,
      subtitle: "Reorder Threshold",
      icon: AlertTriangle,
      borderColor: '#F59E0B',
      color: '#B45309'
    },
    {
      title: "Out of Stock",
      value: summary.out_of_stock_count || 0,
      subtitle: "Zero Quantity Count",
      icon: ShieldAlert,
      borderColor: '#EF4444',
      color: '#991B1B'
    },
    {
      title: "Expiring Batches",
      value: summary.expiring_soon_count || 0,
      subtitle: "Within 90 Days",
      icon: Clock,
      borderColor: '#8B5CF6',
      color: '#6D28D9'
    }
  ];

  const salesColumns: Column<any>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      width: '30%',
      accessor: (s) => <span style={{ fontWeight: 600, color: '#0F172A' }}>{s.invoice_number}</span>
    },
    {
      key: 'username',
      header: 'Operator',
      width: '25%',
      accessor: (s) => <span style={{ fontSize: '13px', color: '#334155' }}>{s.username}</span>
    },
    {
      key: 'payment_method',
      header: 'Pay Method',
      width: '20%',
      accessor: (s) => <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px' }}>{s.payment_method}</span>
    },
    {
      key: 'total_amount',
      header: 'Total (UGX)',
      width: '25%',
      align: 'right' as const,
      accessor: (s) => <span style={{ fontWeight: 700, color: '#0F8A6A' }}>{s.total_amount?.toLocaleString()}</span>
    }
  ];

  const purchaseColumns: Column<any>[] = [
    {
      key: 'invoice_number',
      header: 'Supplier Invoice',
      width: '35%',
      accessor: (p) => <span style={{ fontWeight: 600, color: '#0F172A' }}>{p.invoice_number}</span>
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      width: '35%',
      accessor: (p) => <span style={{ fontSize: '13px', color: '#334155' }}>{p.supplier_name || 'Generic'}</span>
    },
    {
      key: 'total_amount',
      header: 'Amount (UGX)',
      width: '30%',
      align: 'right' as const,
      accessor: (p) => <span style={{ fontWeight: 700, color: '#0284C7' }}>{p.total_amount?.toLocaleString()}</span>
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', padding: '24px', overflow: 'hidden', backgroundColor: 'var(--color-desktop-bg)', boxSizing: 'border-box' }}>


      {/* KPI Metric Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '24px' }}>
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Panel key={idx} noPadding style={{ padding: '24px', borderLeft: `4px solid ${card.borderColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  {card.title}
                </span>
                <Icon size={18} style={{ color: card.color }} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: card.color, marginTop: '8px', marginBottom: '4px' }}>
                {card.value}
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                {card.subtitle}
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Workstation Activity Split Grids */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, overflow: 'hidden' }}>
        <Panel title="LIVE POS TRANSACTIONS LOG" noPadding style={{ height: '100%', overflow: 'hidden' }}>
          <DataGrid
            columns={salesColumns}
            data={summary.recent_sales || []}
            keyExtractor={(s) => s.id}
            isLoading={loading}
            emptyMessage="No POS transactions completed today."
            compactRows={true}
            zebraStriping={true}
            maxHeight="calc(100vh - 190px)"
          />
        </Panel>

        <Panel title="RECENT PROCUREMENT GRNs RECEIVED" noPadding style={{ height: '100%', overflow: 'hidden' }}>
          <DataGrid
            columns={purchaseColumns}
            data={summary.recent_purchases || []}
            keyExtractor={(p) => p.id}
            isLoading={loading}
            emptyMessage="No stock purchase invoices received recently."
            compactRows={true}
            zebraStriping={true}
            maxHeight="calc(100vh - 190px)"
          />
        </Panel>
      </div>
    </div>
  );
};
