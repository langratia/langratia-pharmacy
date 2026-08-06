import React, { useState } from 'react';
import { ShieldAlert, Key, Copy, CheckCircle2, Globe, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import langratiaLogo from '../../assets/langratia-logo.png';

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
      background: 'linear-gradient(135deg, #090d16 0%, #030712 100%)',
      padding: '20px',
      fontFamily: '"Nunito", "Inter", sans-serif'
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '24px',
        padding: '36px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(14, 165, 233, 0.1)',
        color: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '18px',
            background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '6px', boxSizing: 'border-box',
            boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.25)', marginBottom: '16px',
          }}>
            <img src={langratiaLogo} alt="Langratia Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>Langratia Security Lock</h1>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '13.5px' }}>
            Hardware node-locked licensing protection. Enter a verified license key to initialize POS.
          </p>
        </div>

        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <ShieldAlert color="#f87171" size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#f87171', fontSize: '13.5px', marginBottom: '2px' }}>
              License Required
            </div>
            <div style={{ color: '#fca5a5', fontSize: '12.5px', lineHeight: 1.4 }}>
              {lockReason || "No valid cryptographic license found for this machine."}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Physical Machine ID
          </label>
          <div style={{
            display: 'flex',
            background: '#030712',
            borderRadius: '10px',
            border: '1px solid #334155',
            overflow: 'hidden'
          }}>
            <input 
              type="text" 
              readOnly 
              value={machineId}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                padding: '10px 14px', fontSize: '13px',
                color: '#38bdf8', outline: 'none', fontFamily: 'monospace'
              }}
            />
            <button 
              onClick={handleCopy}
              style={{
                border: 'none', background: '#1e293b', padding: '0 14px',
                cursor: 'pointer', borderLeft: '1px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: copied ? '#34d399' : '#94a3b8',
                transition: 'all 0.2s'
              }}
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#94a3b8', fontSize: '12px' }}>
            <Globe size={14} color="#38bdf8" />
            <span>Generate key online at: <strong style={{ color: '#38bdf8' }}>distribution.langratia.com/activate</strong></span>
          </div>
        </div>

        <form onSubmit={handleActivate}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cryptographic License Key
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Paste the base64 license payload here..."
                required
                rows={3}
                style={{
                  width: '100%',
                  background: '#030712',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  color: '#f8fafc',
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
              width: '100%', height: '46px', borderRadius: '12px',
              background: '#0ea5e9',
              color: '#FFFFFF', border: 'none',
              fontSize: '14.5px', fontWeight: 700,
              cursor: (isActivating || !licenseKey.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isActivating || !licenseKey.trim()) ? 0.6 : 1,
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <span>{isActivating ? 'Cryptographically Verifying...' : 'Authenticate & Unlock System'}</span>
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  );
};
