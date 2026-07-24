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
      subtitle: "Completed POS sales",
      icon: TrendingUp,
      bgColor: '#ECFDF5',
      iconColor: '#065F46'
    },
    {
      title: "Active Medicines",
      value: summary.total_medicines || 0,
      subtitle: "Master registry items",
      icon: Pill,
      bgColor: '#F3F4F6',
      iconColor: '#1F2937'
    },
    {
      title: "Low Stock Alert",
      value: summary.low_stock_count || 0,
      subtitle: "At/below reorder level",
      icon: AlertTriangle,
      bgColor: '#FFFBEB',
      iconColor: '#92400E'
    },
    {
      title: "Out of Stock",
      value: summary.out_of_stock_count || 0,
      subtitle: "Zero inventory count",
      icon: ShieldAlert,
      bgColor: '#FEF2F2',
      iconColor: '#991B1B'
    },
    {
      title: "Expiring Soon",
      value: summary.expiring_soon_count || 0,
      subtitle: "Within 90 days",
      icon: Clock,
      bgColor: '#F5F3FF',
      iconColor: '#5B21B6'
    }
  ];

  const recentSalesColumns: Column<any>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      accessor: (s) => <span style={{ fontWeight: 600, color: '#111827' }}>{s.invoice_number}</span>
    },
    {
      key: 'username',
      header: 'Cashier',
      accessor: (s) => <span style={{ color: '#6B7280' }}>@{s.username}</span>
    },
    {
      key: 'payment_method',
      header: 'Method',
      accessor: (s) => (
        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F3F4F6', fontSize: '11px', fontWeight: 500 }}>
          {s.payment_method}
        </span>
      )
    },
    {
      key: 'total_amount',
      header: 'Amount',
      align: 'right',
      accessor: (s) => (
        <span style={{ fontWeight: 600, color: '#0F8A6A' }}>
          UGX {s.total_amount.toLocaleString()}
        </span>
      )
    }
  ];

  const recentPurchasesColumns: Column<any>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      accessor: (p) => <span style={{ fontWeight: 600, color: '#111827' }}>{p.invoice_number}</span>
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      accessor: (p) => <span style={{ color: '#374151' }}>{p.supplier_name || 'Direct'}</span>
    },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right',
      accessor: (p) => (
        <span style={{ fontWeight: 600, color: '#111827' }}>
          UGX {p.total_amount.toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader
        title="Pharmacy Operations Dashboard"
        subtitle="Real-time performance metrics, inventory health indicators, and activity logs."
      />

      {/* Metric Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Panel key={idx} noPadding style={{ padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                    {card.title}
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>
                    {card.value}
                  </div>
                  <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', display: 'block' }}>
                    {card.subtitle}
                  </span>
                </div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    backgroundColor: card.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.iconColor
                  }}
                >
                  <Icon size={18} />
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Recent Activity DataGrids */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Panel title="Recent POS Sales" noPadding>
          <DataGrid
            columns={recentSalesColumns}
            data={summary.recent_sales || []}
            keyExtractor={(s) => s.id}
            isLoading={loading}
            emptyMessage="No sales recorded today."
            compactRows={true}
            zebraStriping={true}
            maxHeight="320px"
          />
        </Panel>

        <Panel title="Recent Stock Procurement" noPadding>
          <DataGrid
            columns={recentPurchasesColumns}
            data={summary.recent_purchases || []}
            keyExtractor={(p) => p.id}
            isLoading={loading}
            emptyMessage="No purchases recorded."
            compactRows={true}
            zebraStriping={true}
            maxHeight="320px"
          />
        </Panel>
      </div>
    </div>
  );
};
