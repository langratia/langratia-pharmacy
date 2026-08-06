import React, { useState } from 'react';
import { ShieldAlert, Key, Copy, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import amoLogo from '../../assets/amo-hope-logo.png';

interface ActivationPageProps {
  machineId: string;
  lockReason: string;
  onActivated: () => void;
}

export const ActivationPage: React.FC<ActivationPageProps> = ({ machineId, lockReason, onActivated }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    toast.success('Machine ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setIsActivating(true);
    try {
      const wailsApp = (window as any).go?.main?.App;
      if (!wailsApp) throw new Error('Application runtime not available');
      await wailsApp.ActivateLicense(licenseKey.trim());
      toast.success('License activated successfully!');
      onActivated();
    } catch (err: any) {
      toast.error(err?.message || 'Invalid license key');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F3526 0%, #174B37 100%)',
      padding: '20px',
      fontFamily: '"Inter", sans-serif'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: '#FFFFFF', border: '1px solid #E5E7EB',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px', boxSizing: 'border-box',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px',
          }}>
            <img src={amoLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#111827' }}>System Locked</h1>
          <p style={{ margin: '8px 0 0', color: '#6B7280', fontSize: '14px' }}>
            This application is bound to specific hardware. Please enter a valid license key to continue.
          </p>
        </div>

        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <ShieldAlert color="#DC2626" size={24} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#991B1B', fontSize: '14px', marginBottom: '4px' }}>
              Authentication Failed
            </div>
            <div style={{ color: '#B91C1C', fontSize: '13px' }}>
              {lockReason || "No valid license found for this machine."}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
            Your Machine ID
          </label>
          <div style={{
            display: 'flex',
            background: '#F3F4F6',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            overflow: 'hidden'
          }}>
            <input 
              type="text" 
              readOnly 
              value={machineId}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                padding: '12px 16px', fontSize: '14px',
                color: '#111827', outline: 'none', fontFamily: 'monospace'
              }}
            />
            <button 
              onClick={handleCopy}
              style={{
                border: 'none', background: 'none', padding: '0 16px',
                cursor: 'pointer', borderLeft: '1px solid #E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: copied ? '#059669' : '#6B7280',
                transition: 'color 0.2s'
              }}
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
            Send this ID to your vendor to receive a License Key.
          </p>
        </div>

        <form onSubmit={handleActivate}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              License Key
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}>
                <Key size={18} />
              </div>
              <textarea
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Paste your license key here..."
                required
                rows={4}
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '10px',
                  padding: '12px 16px 12px 40px',
                  fontSize: '14px',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isActivating || !licenseKey.trim()}
            style={{
              width: '100%', height: '48px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #174B37 0%, #0F3526 100%)',
              color: '#FFFFFF', border: 'none',
              fontSize: '15px', fontWeight: 700,
              cursor: (isActivating || !licenseKey.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isActivating || !licenseKey.trim()) ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(23, 75, 55, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {isActivating ? 'Verifying...' : 'Activate System'}
          </button>
        </form>
      </div>
    </div>
  );
};
