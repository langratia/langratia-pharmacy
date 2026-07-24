import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Pill, 
  AlertTriangle, 
  Clock, 
  ShoppingCart, 
  Truck, 
  ArrowUpRight, 
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
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
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp && typeof wailsApp.GetDashboardSummary === 'function') {
        const data = await wailsApp.GetDashboardSummary();
        setSummary(data || {});
      } else {
        setSummary({
          sales_today: 485000,
          total_medicines: 124,
          low_stock_count: 5,
          out_of_stock_count: 2,
          expiring_soon_count: 4,
          recent_sales: [
            { id: 101, invoice_number: 'INV-POS-2026-001', username: 'cashier', sale_date: new Date().toISOString(), total_amount: 45000, payment_method: 'Cash' },
            { id: 102, invoice_number: 'INV-POS-2026-002', username: 'admin', sale_date: new Date().toISOString(), total_amount: 120000, payment_method: 'Mobile Money' }
          ],
          recent_purchases: [
            { id: 501, invoice_number: 'INV-SUP-882', supplier_name: 'Quality Chemicals Uganda', purchase_date: new Date().toISOString(), total_amount: 1250000, notes: 'Restock Antibiotics' }
          ]
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const kpiCards = [
    {
      title: "Today's Sales",
      value: `UGX ${(summary.sales_today || 0).toLocaleString()}`,
      subtitle: "Completed POS transactions",
      icon: TrendingUp,
      bgColor: '#F0FDF9',
      iconColor: 'var(--color-primary-teal)',
      borderColor: '#CCFBF1'
    },
    {
      title: "Medicines Registered",
      value: summary.total_medicines || 0,
      subtitle: "Active stock items",
      icon: Pill,
      bgColor: '#F1F5F9',
      iconColor: '#475569',
      borderColor: '#E2E8F0'
    },
    {
      title: "Low Stock Alert",
      value: summary.low_stock_count || 0,
      subtitle: "At or below reorder level",
      icon: AlertTriangle,
      bgColor: '#FEF3C7',
      iconColor: '#D97706',
      borderColor: '#FDE68A'
    },
    {
      title: "Out of Stock",
      value: summary.out_of_stock_count || 0,
      subtitle: "Zero inventory count",
      icon: ShieldAlert,
      bgColor: '#FEE2E2',
      iconColor: '#DC2626',
      borderColor: '#FCA5A5'
    },
    {
      title: "Expiring Soon (90 Days)",
      value: summary.expiring_soon_count || 0,
      subtitle: "Requires FEFO priority",
      icon: Clock,
      bgColor: '#EFF6FF',
      iconColor: '#2563EB',
      borderColor: '#BFDBFE'
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-charcoal-navy)', marginBottom: '4px' }}>
          Pharmacy Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Real-time operational summary, stock health indicators, and recent transactions.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              style={{
                backgroundColor: '#fff',
                borderRadius: '14px',
                border: `1px solid ${card.borderColor}`,
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {card.title}
                </span>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-charcoal-navy)', marginTop: '4px', marginBottom: '4px' }}>
                  {card.value}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {card.subtitle}
                </span>
              </div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.iconColor
              }}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recent Sales Table */}
        <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid var(--color-border-subtle)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} color="var(--color-primary-teal)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-charcoal-navy)' }}>Recent POS Sales</h3>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <th style={{ padding: '10px 12px' }}>Invoice #</th>
                <th style={{ padding: '10px 12px' }}>Cashier</th>
                <th style={{ padding: '10px 12px' }}>Method</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(summary.recent_sales || []).length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No sales recorded today</td></tr>
              ) : (
                (summary.recent_sales || []).map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{s.invoice_number}</td>
                    <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{s.username}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', fontSize: '11px', fontWeight: 600 }}>
                        {s.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-teal)' }}>
                      UGX {s.total_amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Purchases Table */}
        <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid var(--color-border-subtle)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="var(--color-secondary-teal)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-charcoal-navy)' }}>Recent Incoming Purchases</h3>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <th style={{ padding: '10px 12px' }}>Invoice #</th>
                <th style={{ padding: '10px 12px' }}>Supplier</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {(summary.recent_purchases || []).length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No stock shipments recorded</td></tr>
              ) : (
                (summary.recent_purchases || []).map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{p.invoice_number}</td>
                    <td style={{ padding: '12px' }}>{p.supplier_name || 'Direct'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-charcoal-navy)' }}>
                      UGX {p.total_amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
