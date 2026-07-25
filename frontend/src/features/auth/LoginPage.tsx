import React, { useState } from 'react';
import { Cross, Lock, User as UserIcon, ShieldAlert, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    const ok = await login(username, password);
    if (!ok) setPassword('');
  };

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
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '0px',
            backgroundColor: 'var(--color-accent-solid)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-inverse)',
            marginBottom: '14px'
          }}>
            <Cross size={24} />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Langratia Pharmacy
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
        <form onSubmit={handleSubmit}>
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
          Langratia OS • v1.4.2 Build 8920
        </div>
      </div>
    </div>
  );
};

