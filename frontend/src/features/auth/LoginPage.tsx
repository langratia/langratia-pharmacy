import React, { useState, useEffect } from 'react';
import { Cross, Lock, User as UserIcon, ShieldAlert, Cpu, CheckCircle, Sparkles, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usePharmacy } from '../../context/PharmacyContext';
import { IsFirstTimeSetup, CompleteFirstTimeSetup } from '../../../wailsjs/go/main/App';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const { pharmacyName, logoUrl, refreshConfig } = usePharmacy();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // First-Time Setup State
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [setupStep, setSetupStep] = useState<'wizard' | 'animating'>('wizard');
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
        try {
          first = await IsFirstTimeSetup();
        } catch {
          const wailsApp = (window as any)?.go?.main?.App;
          if (wailsApp && typeof wailsApp.IsFirstTimeSetup === 'function') {
            first = await wailsApp.IsFirstTimeSetup();
          }
        }
        setIsFirstTime(first);
      } catch {
        setIsFirstTime(false);
      }
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
      setSetupError('Please fill out all required setup fields.');
      return;
    }
    if (setupPassword.length < 4) {
      setSetupError('Password must be at least 4 characters long.');
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      setSetupError('Passwords do not match.');
      return;
    }

    setIsSettingUp(true);
    try {
      let userRes: any = null;
      try {
        userRes = await CompleteFirstTimeSetup(
          setupPharmacyName.trim() || 'My Pharmacy',
          setupFullName.trim(),
          setupUsername.trim(),
          setupPassword
        );
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.CompleteFirstTimeSetup === 'function') {
          userRes = await wailsApp.CompleteFirstTimeSetup(
            setupPharmacyName.trim() || 'My Pharmacy',
            setupFullName.trim(),
            setupUsername.trim(),
            setupPassword
          );
        }
      }

      if (userRes) {
        await refreshConfig();
        setSetupStep('animating');
        toast.success('Initial setup completed successfully!');

        // Smooth transition animation before logging in automatically
        setTimeout(async () => {
          await login(setupUsername.trim(), setupPassword);
        }, 1500);
      }
    } catch (err: any) {
      setSetupError(err?.message || 'Failed to complete setup. Please try again.');
    } finally {
      setIsSettingUp(false);
    }
  };

  if (isFirstTime === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-muted)', fontSize: '13px' }}>
        Initializing System Check...
      </div>
    );
  }

  // --- FIRST TIME SETUP ONBOARDING WIZARD ---
  if (isFirstTime) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-base)',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--color-bg-panel)',
          borderRadius: '0px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          padding: '36px 32px 28px',
          border: '1px solid var(--color-border-default)'
        }}>
          {setupStep === 'animating' ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div className="animate-success-pop" style={{ color: 'var(--color-success-text)' }}>
                <CheckCircle size={64} />
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Setup Complete!
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                Launching {setupPharmacyName || 'Pharmacy'} POS Workspace...
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  System Initial Setup
                </h1>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Configure your business name and primary admin credentials
                </div>
              </div>

              {/* Error Alert */}
              {setupError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  color: 'var(--color-danger-text)',
                  padding: '10px 12px',
                  borderRadius: '0px',
                  fontSize: '12px',
                  marginBottom: '16px'
                }}>
                  <ShieldAlert size={16} />
                  <span>{setupError}</span>
                </div>
              )}

              <form onSubmit={handleSetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Pharmacy / Company Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      value={setupPharmacyName}
                      onChange={(e) => setSetupPharmacyName(e.target.value)}
                      placeholder="e.g. City Pharmacy Ltd"
                      autoFocus
                      style={{ width: '100%', padding: '6px 10px 6px 32px', height: '34px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', fontSize: '13px', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Admin Full Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      required
                      value={setupFullName}
                      onChange={(e) => setSetupFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      style={{ width: '100%', padding: '6px 10px 6px 32px', height: '34px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', fontSize: '13px', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Admin Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={setupUsername}
                      onChange={(e) => setSetupUsername(e.target.value)}
                      placeholder="admin"
                      style={{ width: '100%', padding: '6px 10px', height: '34px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', fontSize: '13px', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Set Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="Min 4 chars"
                      style={{ width: '100%', padding: '6px 10px', height: '34px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', fontSize: '13px', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    style={{ width: '100%', padding: '6px 10px', height: '34px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', fontSize: '13px', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSettingUp}
                  className="desktop-btn-primary"
                  style={{ width: '100%', height: '38px', borderRadius: '0px', fontSize: '13px', fontWeight: 700, justifyContent: 'center', marginTop: '6px', cursor: isSettingUp ? 'not-allowed' : 'pointer' }}
                >
                  {isSettingUp ? 'Configuring System...' : 'Initialize System & Complete Setup'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- STANDARD LOGIN SCREEN ---
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg-base)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--color-bg-panel)',
        borderRadius: '0px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        padding: '36px 32px 28px',
        border: '1px solid var(--color-border-default)'
      }}>
        {/* Header Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {logoUrl && (
            <img src={logoUrl} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '14px' }} />
          )}
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {pharmacyName}
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, backgroundColor: 'var(--color-bg-base)', padding: '2px 8px', border: '1px solid var(--color-border-subtle)' }}>
            <Cpu size={12} style={{ color: 'var(--color-accent-base)' }} />
            <span>ENTERPRISE POS • SECURE AUTH</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger-text)',
            padding: '10px 12px',
            borderRadius: '0px',
            fontSize: '12px',
            marginBottom: '20px'
          }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLoginSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Operator Username
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
                display: 'flex'
              }}>
                <UserIcon size={14} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 32px',
                  height: '34px',
                  borderRadius: '0px',
                  border: '1px solid var(--color-border-strong)',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent-base)';
                  e.target.style.boxShadow = '0 0 0 2px var(--color-accent-subtle)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border-strong)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Access Password
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
                display: 'flex'
              }}>
                <Lock size={14} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 32px',
                  height: '34px',
                  borderRadius: '0px',
                  border: '1px solid var(--color-border-strong)',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent-base)';
                  e.target.style.boxShadow = '0 0 0 2px var(--color-accent-subtle)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border-strong)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="desktop-btn-primary"
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '0px',
              fontSize: '13px',
              fontWeight: 700,
              justifyContent: 'center',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Authenticating System...' : 'Sign In to System'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-border-subtle)',
          textAlign: 'center',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {pharmacyName} POS • v1.0.0 Enterprise Release
        </div>
      </div>
    </div>
  );
};
