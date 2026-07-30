import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Building2, Save } from 'lucide-react';
import { GetPharmacyConfig, UpdatePharmacyConfig } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';

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
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading configuration...</div>;
  }

  if (!cfg) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--red)', fontSize: '13px' }}>Failed to load configuration.</div>;
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r2)',
    padding: '20px',
    boxShadow: 'var(--shadow)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--muted)',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '34px',
    padding: '0 10px',
    borderRadius: 'var(--r)',
    border: '1px solid var(--line)',
    backgroundColor: 'var(--surface-soft)',
    color: 'var(--ink)',
    boxSizing: 'border-box',
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Pharmacy Header & Information */}
      <div style={cardStyle}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
          <Building2 size={16} style={{ color: 'var(--blue)' }} /> PHARMACY INFORMATION
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Pharmacy Name *</label>
            <input type="text" required value={cfg.pharmacy_name} onChange={e => update('pharmacy_name', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Logo (URL or Path)</label>
            <input type="text" value={cfg.logo} onChange={e => update('logo', e.target.value)} placeholder="/path/to/logo.png" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Address</label>
            <input type="text" value={cfg.address} onChange={e => update('address', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input type="text" value={cfg.phone} onChange={e => update('phone', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={cfg.email} onChange={e => update('email', e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Licensing & Tax */}
      <div style={cardStyle}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
          LICENSING & REGISTRATION
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>License Number</label>
            <input type="text" value={cfg.license_number} onChange={e => update('license_number', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Registration Number</label>
            <input type="text" value={cfg.registration_number} onChange={e => update('registration_number', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tax Number (TIN)</label>
            <input type="text" value={cfg.tax_number} onChange={e => update('tax_number', e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Region & Formats */}
      <div style={cardStyle}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
          REGIONAL & FORMATS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Currency</label>
            <select value={cfg.currency} onChange={e => update('currency', e.target.value)} style={inputStyle}>
              {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date Format</label>
            <select value={cfg.date_format} onChange={e => update('date_format', e.target.value)} style={inputStyle}>
              {dateFormatOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Time Format</label>
            <select value={cfg.time_format} onChange={e => update('time_format', e.target.value)} style={inputStyle}>
              {timeFormatOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Operating Hours</label>
            <input type="text" value={cfg.operating_hours} onChange={e => update('operating_hours', e.target.value)} placeholder="e.g. Mon-Fri 8AM-8PM" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
          style={{ padding: '10px 24px', fontSize: '13px', gap: '8px' }}
        >
          <Save size={16} />
          <span>{saving ? 'Saving Changes...' : 'Save Pharmacy Configuration'}</span>
        </button>
      </div>
    </form>
  );
};
