import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, ShieldAlert, Pill, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usePharmacy } from '../../context/PharmacyContext';
import { IsFirstTimeSetup, CompleteFirstTimeSetup } from '../../../wailsjs/go/main/App';

/* ── Shared input style ────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px 11px 42px',
  background: 'var(--surface-soft)',
  border: '1px solid var(--line)',
  borderRadius: '8px',
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
  fontWeight: 600,
  color: 'var(--muted)',
  marginBottom: '8px',
  letterSpacing: '0.03em',
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
          setupPharmacyName.trim() || 'My Pharmacy',
          setupFullName.trim(), setupUsername.trim(), setupPassword
        );
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp?.CompleteFirstTimeSetup) {
          userRes = await wailsApp.CompleteFirstTimeSetup(
            setupPharmacyName.trim() || 'My Pharmacy',
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

  /* Loading check */
  if (isFirstTime === null) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--muted)', fontSize: '14px',
        backgroundImage: 'radial-gradient(circle, var(--overlay-line) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}>
        Initializing system…
      </div>
    );
  }

  /* Shared page wrapper */
  const pageWrapper = (content: React.ReactNode) => (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px',
      backgroundImage: 'radial-gradient(circle, var(--overlay-line) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r2)',
        boxShadow: 'var(--shadow)',
        padding: '40px 36px 32px',
        animation: 'popupEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}>
        {content}
      </div>
    </div>
  );

  /* ── First-Time Setup Wizard ─────────────────────────────────────────── */
  if (isFirstTime) {
    return pageWrapper(
      <>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'rgba(18, 108, 255, 0.12)',
            border: '1px solid rgba(18, 108, 255, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: 'var(--blue)',
          }}>
            <Pill size={28} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.2px' }}>
            Initial Setup
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Configure your pharmacy and admin credentials
          </p>
        </div>

        {/* Error */}
        {setupError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger-text)', padding: '12px 14px',
            borderRadius: '8px', fontSize: '13px', marginBottom: '20px',
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{setupError}</span>
          </div>
        )}

        <form onSubmit={handleSetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Pharmacy name */}
          <div>
            <label style={labelStyle}>Pharmacy / Company Name</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrapStyle}><Building2 size={16} /></span>
              <input
                type="text" value={setupPharmacyName}
                onChange={(e) => setSetupPharmacyName(e.target.value)}
                placeholder="e.g. City Pharmacy Ltd" autoFocus
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(18,108,255,0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Full name */}
          <div>
            <label style={labelStyle}>Admin Full Name *</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrapStyle}><UserIcon size={16} /></span>
              <input
                type="text" required value={setupFullName}
                onChange={(e) => setSetupFullName(e.target.value)}
                placeholder="e.g. John Doe"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(18,108,255,0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Username + Password row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Admin Username *</label>
              <input type="text" required value={setupUsername}
                onChange={(e) => setSetupUsername(e.target.value)} placeholder="admin"
                style={{ ...inputStyle, paddingLeft: '14px' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(18,108,255,0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Password *</label>
              <input type="password" required value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)} placeholder="Min 4 chars"
                style={{ ...inputStyle, paddingLeft: '14px' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(18,108,255,0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label style={labelStyle}>Confirm Password *</label>
            <input type="password" required value={setupConfirmPassword}
              onChange={(e) => setSetupConfirmPassword(e.target.value)} placeholder="Re-enter password"
              style={{ ...inputStyle, paddingLeft: '14px' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(18,108,255,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <button
            type="submit" disabled={isSettingUp}
            style={{
              width: '100%', height: '46px', borderRadius: 'var(--r)',
              background: 'var(--blue)', color: '#fff', border: 'none',
              fontSize: '15px', fontWeight: 700, cursor: isSettingUp ? 'not-allowed' : 'pointer',
              opacity: isSettingUp ? 0.7 : 1,
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              marginTop: '4px',
            }}
            onMouseEnter={(e) => { if (!isSettingUp) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-blue)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {isSettingUp ? 'Configuring System…' : 'Initialize & Complete Setup'}
          </button>
        </form>
      </>
    );
  }

  /* ── Standard Login Screen ───────────────────────────────────────────── */
  return pageWrapper(
    <>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'rgba(18, 108, 255, 0.12)',
          border: '1px solid rgba(18, 108, 255, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', color: 'var(--blue)',
          boxShadow: '0 0 20px rgba(18, 108, 255, 0.2)',
        }}>
          <Pill size={28} />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
          {pharmacyName}
        </h1>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '11px', color: 'var(--muted)',
          background: 'var(--surface-soft)', border: '1px solid var(--line)',
          padding: '4px 12px', borderRadius: '20px', fontWeight: 600,
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', display: 'inline-block' }} />
          ENTERPRISE POS • SECURE AUTH
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)',
          color: 'var(--color-danger-text)', padding: '12px 14px',
          borderRadius: '8px', fontSize: '13px', marginBottom: '24px',
        }}>
          <ShieldAlert size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Username */}
        <div>
          <label style={labelStyle}>Username</label>
          <div style={{ position: 'relative' }}>
            <span style={iconWrapStyle}><UserIcon size={16} /></span>
            <input
              type="text" value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username" required autoFocus
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(18,108,255,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <span style={iconWrapStyle}><Lock size={16} /></span>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password" required
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(18,108,255,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit" disabled={isLoading}
          style={{
            width: '100%', height: '48px', borderRadius: 'var(--r)',
            background: 'var(--blue)', color: '#fff', border: 'none',
            fontSize: '15px', fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            marginTop: '4px',
          }}
          onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-blue)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          {isLoading ? 'Authenticating…' : 'Sign In'}
        </button>
      </form>

      {/* Footer */}
      <div style={{
        marginTop: '28px', paddingTop: '16px',
        borderTop: '1px solid var(--line)',
        textAlign: 'center', fontSize: '12px',
        color: 'var(--muted-dark)',
      }}>
        {pharmacyName} · v1.0.0
      </div>
    </>
  );
};
