import React, { useState, useEffect } from 'react';
import { BarChart3, Printer, Download, Calendar, Pill, DollarSign, AlertCircle } from 'lucide-react';
import { Medicine, Batch } from '../../types';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'expiry'>('sales');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<Batch[]>([]);

  const fetchReportsData = async () => {
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        const [meds, exp] = await Promise.all([
          wailsApp.ListMedicines?.('', '', false) || [],
          wailsApp.GetExpiringBatches?.(90) || []
        ]);
        setMedicines(meds || []);
        setExpiringBatches(exp || []);
      } else {
        setMedicines([
          { id: 1, name: 'Amoxicillin Capsules', generic_name: 'Amoxicillin', brand_name: 'Amoxil', category: 'Antibiotics', dosage_strength: '500mg', medicine_form: 'Capsule', pack_size: '10x10', buying_price: 15000, selling_price: 25000, current_stock: 45, reorder_level: 20, manufacturer: 'GSK', description: '', is_archived: false, created_at: '' }
        ]);
        setExpiringBatches([
          { id: 1, batch_number: 'BATCH-2026-X', medicine_id: 1, medicine_name: 'Amoxicillin Capsules', quantity_received: 50, quantity_remaining: 20, buying_price: 15000, mfg_date: '2025-01-01', expiry_date: '2026-09-30', date_received: '' }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-charcoal-navy)', marginBottom: '4px' }}>
            Reports & Analytics
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Exportable inventory, sales summaries, and batch expiration tracking.
          </p>
        </div>
        <button
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: 'var(--color-primary-teal)', color: '#fff', borderRadius: '10px', fontWeight: 600, fontSize: '14px', border: 'none', cursor: 'pointer' }}
        >
          <Printer size={18} />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: '24px' }}>
        {[
          { key: 'sales', label: 'Sales & Revenue Report' },
          { key: 'inventory', label: 'Inventory & Stock Level Report' },
          { key: 'expiry', label: 'Medicine Expiry Report (90 Days)' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--color-primary-teal)' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab.key ? '3px solid var(--color-primary-teal)' : '3px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Printable Document Container */}
      <div id="printable-report" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--color-border-subtle)', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-charcoal-navy)' }}>LANGRATIA PHARMACY</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Official Audit & Analytical Report • Generated on {new Date().toLocaleDateString()}
          </p>
        </div>

        {activeTab === 'inventory' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <th style={{ padding: '12px' }}>Medicine Name</th>
                <th style={{ padding: '12px' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Buying Price</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Selling Price</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Stock Count</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Valuation (UGX)</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{m.name} ({m.dosage_strength})</td>
                  <td style={{ padding: '12px' }}>{m.category}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>UGX {m.buying_price.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>UGX {m.selling_price.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>{m.current_stock}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-teal)' }}>
                    UGX {(m.current_stock * m.selling_price).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'expiry' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <th style={{ padding: '12px' }}>Batch #</th>
                <th style={{ padding: '12px' }}>Medicine</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Qty Remaining</th>
                <th style={{ padding: '12px' }}>Expiry Date</th>
                <th style={{ padding: '12px' }}>Status Alert</th>
              </tr>
            </thead>
            <tbody>
              {expiringBatches.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No batches expiring in the next 90 days.</td></tr>
              ) : (
                expiringBatches.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{b.batch_number}</td>
                    <td style={{ padding: '12px' }}>{b.medicine_name || `Medicine #${b.medicine_id}`}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>{b.quantity_remaining}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#DC2626' }}>{b.expiry_date}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '11px', fontWeight: 600 }}>
                        Expiring Soon (FEFO Priority)
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'sales' && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            Select date ranges and click "Print / Export PDF" to produce certified Sales Audit Sheets.
          </div>
        )}
      </div>
    </div>
  );
};
