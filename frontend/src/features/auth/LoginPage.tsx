import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, ShieldAlert, Building2, Network } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usePharmacy } from '../../context/PharmacyContext';
import { IsFirstTimeSetup, CompleteFirstTimeSetup, UpdateDatabaseConfig, AutoDiscoverServer } from '../../../wailsjs/go/main/App';
import amoLogo from '../../assets/images/amo_hope_logo.svg';

/* ── Shared input style ────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px 12px 42px',
  background: 'var(--color-bg-input)',
  border: '1px solid var(--line)',
  borderRadius: '12px',
  fontSize: '14px',
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  minHeight: 'unset',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--muted)',
  marginBottom: '6px',
  letterSpacing: '0.02em',
};

const iconWrapStyle: React.CSSProperties = {
  position: 'absolute',
  left: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--muted-dark)',
  display: 'flex',
  pointerEvents: 'none',
};

export const LoginPage: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const { pharmacyName, refreshConfig } = usePharmacy();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // First-Time Setup State
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [setupPharmacyName, setSetupPharmacyName] = useState('');
  const [setupFullName, setSetupFullName] = useState('');
  const [setupUsername, setSetupUsername] = useState('admin');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Client connection state for First Time Setup
  const [isConnectingMode, setIsConnectingMode] = useState(false);
  const [connectUrl, setConnectUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let first = false;
        try { first = await IsFirstTimeSetup(); }
        catch {
          const wailsApp = (window as any)?.go?.main?.App;
          if (wailsApp?.IsFirstTimeSetup) first = await wailsApp.IsFirstTimeSetup();
        }
        setIsFirstTime(first);
      } catch { setIsFirstTime(false); }
    })();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    const ok = await login(username, password);
    if (!ok) setPassword('');
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    if (!setupFullName.trim() || !setupUsername.trim() || !setupPassword) {
      setSetupError('Please fill out all required fields.');
      return;
    }
    if (setupPassword.length < 4) { setSetupError('Password must be at least 4 characters.'); return; }
    if (setupPassword !== setupConfirmPassword) { setSetupError('Passwords do not match.'); return; }

    setIsSettingUp(true);
    try {
      let userRes: any = null;
      try {
        userRes = await CompleteFirstTimeSetup(
          setupPharmacyName.trim() || 'A.M.O HOPE PHARMACY',
          setupFullName.trim(), setupUsername.trim(), setupPassword
        );
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp?.CompleteFirstTimeSetup) {
          userRes = await wailsApp.CompleteFirstTimeSetup(
            setupPharmacyName.trim() || 'A.M.O HOPE PHARMACY',
            setupFullName.trim(), setupUsername.trim(), setupPassword
          );
        }
      }
      if (userRes) {
        await refreshConfig();
        toast.success('Setup complete! Logging you in…');
        setIsFirstTime(false);
        await login(setupUsername.trim(), setupPassword);
      }
    } catch (err: any) {
      setSetupError(err?.message || 'Setup failed. Please try again.');
    } finally { setIsSettingUp(false); }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    if (!connectUrl.trim()) {
      setSetupError('Please enter a server URL.');
      return;
    }
    
    setIsConnecting(true);
    const toastId = toast.loading('Connecting to Main Server...');
    try {
      await UpdateDatabaseConfig(connectUrl.trim());
      toast.success('Connected! Restarting application to apply settings...', { id: toastId, duration: 4000 });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      setSetupError(err?.message || 'Failed to connect to server.');
      toast.error('Connection failed', { id: toastId });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAutoDiscoverSetup = async () => {
    setIsConnecting(true);
    const toastId = toast.loading('Scanning local network for Main Server...');
    try {
      const url = await AutoDiscoverServer();
      setConnectUrl(url);
      toast.success('Server found! Click Connect to proceed.', { id: toastId, duration: 4000 });
    } catch (err: any) {
      setSetupError(err?.message || 'No server found on the network.');
      toast.error('Discovery failed', { id: toastId });
    } finally {
      setIsConnecting(false);
    }
  };

  /* Loading check */
  if (isFirstTime === null) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--muted)', fontSize: '14px',
      }}>
        Initializing system…
      </div>
    );
  }

  /* ── Split-Screen Page Wrapper inspired by Fillianta Reference Design ───────── */
  const pageWrapper = (content: React.ReactNode) => (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '960px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '28px',
        boxShadow: 'var(--shadow-dropdown)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        overflow: 'hidden',
        minHeight: '560px',
        animation: 'popupEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}>
        {/* Left Form Panel */}
        <div style={{
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          {content}
        </div>

        {/* Right Showcase Banner (Rich Deep Forest Green Panel) */}
        <div style={{
          padding: '16px',
          display: 'flex',
        }}>
          <div style={{
            flex: 1,
            borderRadius: '20px',
            background: 'linear-gradient(145deg, #174B37 0%, #0F3526 60%, #0A241A 100%)',
            padding: '40px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.2)',
          }}>
            {/* Subtle background glow */}
            <div style={{
              position: 'absolute', right: '-40px', top: '-40px',
              width: '220px', height: '220px', borderRadius: '50%',
              background: 'rgba(46, 204, 113, 0.15)', filter: 'blur(40px)',
              pointerEvents: 'none',
            }} />

            {/* Headline */}
            <div style={{ zIndex: 2 }}>
              <div style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: 'italic',
                fontSize: '34px',
                color: 'rgba(255, 255, 255, 0.95)',
                lineHeight: 1.15,
                letterSpacing: '-0.5px',
              }}>
                Enter the Future
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.15,
                letterSpacing: '-0.8px',
                marginTop: '4px',
              }}>
                of Pharmacy,<br />today
              </div>
            </div>

            {/* Creative Showcase Card (Glassmorphism & Feature Highlights) */}
            <div style={{
              zIndex: 2,
              background: 'rgba(255, 255, 255, 0.96)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}>
              {/* Header with Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: '#FFFFFF', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '4px', boxSizing: 'border-box',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  flexShrink: 0,
                }}>
                  <img src={amoLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    {pharmacyName || 'A.M.O HOPE PHARMACY'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', fontWeight: 500 }}>
                    Pharmacy Management Suite
                  </div>
                </div>
              </div>

              {/* Feature pills grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: '#174B37',
                  background: 'rgba(23, 75, 55, 0.08)', border: '1px solid rgba(23, 75, 55, 0.15)',
                  padding: '5px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center',
                }}>
                  Fast POS Checkout
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: '#174B37',
                  background: 'rgba(23, 75, 55, 0.08)', border: '1px solid rgba(23, 75, 55, 0.15)',
                  padding: '5px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center',
                }}>
                  Inventory & Batch Tracking
                </span>

              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: '12px', borderTop: '1px solid #E5E7EB', fontSize: '11px',
                color: '#6B7280', fontWeight: 600,
              }}>
                <span>Langratia POS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── First-Time Setup Wizard ─────────────────────────────────────────── */
  if (isFirstTime) {
    return pageWrapper(
      <>
        {/* Logo Icon */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: '#FFFFFF', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '6px', boxSizing: 'border-box',
          boxShadow: 'var(--shadow-sm)', marginBottom: '20px',
        }}>
          <img src={amoLogo} alt="A.M.O Hope Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
          Initial Setup
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 24px' }}>
          {isConnectingMode ? 'Connect to an existing Main Server' : 'Configure your pharmacy and admin credentials'}
        </p>

        {/* Error */}
        {setupError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger-text)', padding: '12px 14px',
            borderRadius: '10px', fontSize: '13px', marginBottom: '20px',
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{setupError}</span>
          </div>
        )}

        <form onSubmit={handleSetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Pharmacy / Company Name</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrapStyle}><Building2 size={16} /></span>
              <input
                type="text" value={setupPharmacyName}
                onChange={(e) => setSetupPharmacyName(e.target.value)}
                placeholder="e.g. A.M.O HOPE PHARMACY" autoFocus
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Admin Full Name *</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrapStyle}><UserIcon size={16} /></span>
              <input
                type="text" required value={setupFullName}
                onChange={(e) => setSetupFullName(e.target.value)}
                placeholder="e.g. John Doe"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Admin Username *</label>
              <input type="text" required value={setupUsername}
                onChange={(e) => setSetupUsername(e.target.value)} placeholder="admin"
                style={{ ...inputStyle, paddingLeft: '14px' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Password *</label>
              <input type="password" required value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)} placeholder="Min 4 chars"
                style={{ ...inputStyle, paddingLeft: '14px' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Confirm Password *</label>
            <input type="password" required value={setupConfirmPassword}
              onChange={(e) => setSetupConfirmPassword(e.target.value)} placeholder="Re-enter password"
              style={{ ...inputStyle, paddingLeft: '14px' }}
            />
          </div>

          <button
            type="submit" disabled={isSettingUp}
            style={{
              width: '100%', height: '48px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #174B37 0%, #0F3526 100%)',
              color: '#FFFFFF', border: 'none',
              fontSize: '15px', fontWeight: 700,
              cursor: isSettingUp ? 'not-allowed' : 'pointer',
              opacity: isSettingUp ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(23, 75, 55, 0.3)',
              transition: 'all 0.2s ease',
              marginTop: '6px',
            }}
          >
            {isSettingUp ? 'Configuring System…' : 'Initialize & Complete Setup'}
          </button>
        </form>


      </>
    );
  }

  /* ── First-Time Connection Mode ────────────────────────────────────────── */
  if (isFirstTime && isConnectingMode) {
    return pageWrapper(
      <>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: '#FFFFFF', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '6px', boxSizing: 'border-box',
          boxShadow: 'var(--shadow-sm)', marginBottom: '20px',
        }}>
          <img src={amoLogo} alt="A.M.O Hope Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
          Connect to Server
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 24px' }}>
          Enter the Main Server API URL to join the network.
        </p>

        {setupError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger-text)', padding: '12px 14px',
            borderRadius: '10px', fontSize: '13px', marginBottom: '20px',
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{setupError}</span>
          </div>
        )}

        <form onSubmit={handleConnectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Server API URL *</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrapStyle}><Network size={16} /></span>
              <input
                type="text" required value={connectUrl}
                onChange={(e) => setConnectUrl(e.target.value)}
                placeholder="http://192.168.1.50:45556" autoFocus
                style={inputStyle}
              />
            </div>
            <div style={{ marginTop: '8px', textAlign: 'right' }}>
              <button
                type="button" onClick={handleAutoDiscoverSetup} disabled={isConnecting}
                style={{
                  background: 'var(--surface-soft)', border: '1px solid var(--line)', color: 'var(--ink)',
                  fontSize: '12px', padding: '4px 10px', borderRadius: '6px', cursor: isConnecting ? 'not-allowed' : 'pointer'
                }}
              >
                Auto-Discover
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={isConnecting}
            style={{
              width: '100%', height: '48px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #174B37 0%, #0F3526 100%)',
              color: '#FFFFFF', border: 'none',
              fontSize: '15px', fontWeight: 700,
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              opacity: isConnecting ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(23, 75, 55, 0.3)',
              transition: 'all 0.2s ease',
              marginTop: '6px',
            }}
          >
            {isConnecting ? 'Connecting…' : 'Connect to Server'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => { setIsConnectingMode(false); setSetupError(''); }}
            style={{
              background: 'none', border: 'none', color: '#174B37',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Or setup as a new Main Server
          </button>
        </div>
      </>
    );
  }

  /* ── Standard Login Screen (Matching Fillianta Reference Design) ────────── */
  return pageWrapper(
    <>
      {/* Brand Logo Icon Box */}
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px',
        background: '#FFFFFF', border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '6px', boxSizing: 'border-box',
        boxShadow: 'var(--shadow-sm)', marginBottom: '24px',
      }}>
        <img src={amoLogo} alt="A.M.O Hope Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      {/* Header text */}
      <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        Login
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 28px', lineHeight: 1.4 }}>
        Welcome to {pharmacyName || 'A.M.O HOPE PHARMACY'} — Let's sign in to your POS account
      </p>

      {/* Error Alert */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)',
          color: 'var(--color-danger-text)', padding: '12px 14px',
          borderRadius: '10px', fontSize: '13px', marginBottom: '20px',
        }}>
          <ShieldAlert size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Username field */}
        <div>
          <label style={labelStyle}>Username</label>
          <div style={{ position: 'relative' }}>
            <span style={iconWrapStyle}><UserIcon size={16} /></span>
            <input
              type="text" value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin" required autoFocus
              style={inputStyle}
            />
          </div>
        </div>

        {/* Password field */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={iconWrapStyle}><Lock size={16} /></span>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={inputStyle}
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit" disabled={isLoading}
          style={{
            width: '100%', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #174B37 0%, #0F3526 100%)',
            color: '#FFFFFF', border: 'none',
            fontSize: '15px', fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            boxShadow: '0 4px 14px rgba(23, 75, 55, 0.3)',
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            marginTop: '6px',
          }}
          onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(23, 75, 55, 0.4)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(23, 75, 55, 0.3)'; }}
        >
          {isLoading ? 'Authenticating…' : 'Sign in'}
        </button>
      </form>

      {/* Footer info */}
      <div style={{
        marginTop: '32px', paddingTop: '16px',
        borderTop: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '12px', color: 'var(--muted-dark)',
      }}>
        <span>Langratia POS</span>
        <span>{pharmacyName || 'A.M.O HOPE PHARMACY'}</span>
      </div>
    </>
  );
};
