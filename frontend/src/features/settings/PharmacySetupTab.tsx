import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Building2, Save, Upload } from 'lucide-react';
import { GetPharmacyConfig, UpdatePharmacyConfig } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';
import { Panel } from '../../components/ui/Panel';

const currencyOptions = ['UGX', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF', 'BIF', 'SSP', 'ZAR'];
const dateFormatOptions = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'DD.MM.YYYY'];
const timeFormatOptions = ['HH:mm', 'hh:mm A', 'HH:mm:ss', 'hh:mm:ss A'];

export const PharmacySetupTab: React.FC = () => {
  const [cfg, setCfg] = useState<models.PharmacyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await GetPharmacyConfig(1);
        setCfg(data);
      } catch (err: any) {
        toast.error('Failed to load pharmacy config: ' + (err.message || err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true);
    try {
      await UpdatePharmacyConfig(cfg, 1);
      toast.success('Pharmacy settings saved successfully');
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof models.PharmacyConfig>(key: K, value: models.PharmacyConfig[K]) => {
    if (!cfg) return;
    setCfg({ ...cfg, [key]: value });
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading pharmacy configuration...</div>;
  }

  if (!cfg) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger-text)', fontSize: '13px' }}>Failed to load configuration.</div>;
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'auto' }}>
      <Panel noPadding style={{ padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
          <Building2 size={16} style={{ color: 'var(--color-accent-base)' }} /> PHARMACY INFORMATION
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Pharmacy Name *</label>
            <input type="text" required value={cfg.pharmacy_name} onChange={e => update('pharmacy_name', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Logo (URL or Path)</label>
            <input type="text" value={cfg.logo} onChange={e => update('logo', e.target.value)} placeholder="/path/to/logo.png or base64:" style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Address</label>
            <input type="text" value={cfg.address} onChange={e => update('address', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Phone</label>
            <input type="text" value={cfg.phone} onChange={e => update('phone', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Email</label>
            <input type="email" value={cfg.email} onChange={e => update('email', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
        </div>
      </Panel>

      <Panel noPadding style={{ padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
          LICENSING & REGISTRATION
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>License Number</label>
            <input type="text" value={cfg.license_number} onChange={e => update('license_number', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Registration Number</label>
            <input type="text" value={cfg.registration_number} onChange={e => update('registration_number', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Tax Number</label>
            <input type="text" value={cfg.tax_number} onChange={e => update('tax_number', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
        </div>
      </Panel>

      <Panel noPadding style={{ padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
          REGIONAL SETTINGS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Currency</label>
            <select value={cfg.currency} onChange={e => update('currency', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}>
              {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Date Format</label>
            <select value={cfg.date_format} onChange={e => update('date_format', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}>
              {dateFormatOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Time Format</label>
            <select value={cfg.time_format} onChange={e => update('time_format', e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}>
              {timeFormatOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Operating Hours</label>
            <input type="text" value={cfg.operating_hours} onChange={e => update('operating_hours', e.target.value)} placeholder="e.g. Mon-Fri 8AM-6PM" style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
        </div>
      </Panel>

      <Panel noPadding style={{ padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
          DEFAULT VALUES
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Default Tax (%)</label>
            <input type="number" min="0" step="0.01" value={cfg.default_tax} onChange={e => update('default_tax', parseFloat(e.target.value) || 0)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Default Discount (%)</label>
            <input type="number" min="0" step="0.01" value={cfg.default_discount} onChange={e => update('default_discount', parseFloat(e.target.value) || 0)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Low-Stock Threshold</label>
            <input type="number" min="0" value={cfg.low_stock_threshold} onChange={e => update('low_stock_threshold', parseInt(e.target.value) || 0)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Expiry Warning (days)</label>
            <input type="number" min="0" value={cfg.expiry_warning_days} onChange={e => update('expiry_warning_days', parseInt(e.target.value) || 0)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
        </div>
      </Panel>

      <Panel noPadding style={{ padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
          RECEIPT & INVOICE SETTINGS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Receipt Format</label>
            <textarea rows={3} value={cfg.receipt_format} onChange={e => update('receipt_format', e.target.value)} placeholder="Receipt header/footer template (optional)" style={{ width: '100%', padding: '6px 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Invoice Format</label>
            <textarea rows={3} value={cfg.invoice_format} onChange={e => update('invoice_format', e.target.value)} placeholder="Invoice header/footer template (optional)" style={{ width: '100%', padding: '6px 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
        </div>
      </Panel>

      <Panel noPadding style={{ padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
          RETURN RULES
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Return Policy / Rules</label>
          <textarea rows={4} value={cfg.return_rules} onChange={e => update('return_rules', e.target.value)} placeholder="Describe return policy, time limits, conditions..." style={{ width: '100%', padding: '6px 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
        </div>
      </Panel>

      <Panel noPadding style={{ padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
          NUMBERING FORMATS (JSON)
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Numbering Formats</label>
          <textarea rows={4} value={cfg.numbering_formats} onChange={e => update('numbering_formats', e.target.value)} placeholder='{"sale_invoice": "INV-{YYYY}-{####}", "purchase": "PO-{YYYY}-{####}", "prescription": "RX-{####}"}' style={{ width: '100%', padding: '6px 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box', fontFamily: 'monospace' }} />
        </div>
      </Panel>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 0', borderTop: '1px solid var(--color-border-default)' }}>
        <button type="submit" disabled={saving} className="desktop-btn-primary" style={{ height: '32px', fontSize: '13px', gap: '6px', borderRadius: '0px', padding: '0 20px' }}>
          <Save size={14} />
          <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>
    </form>
  );
};
