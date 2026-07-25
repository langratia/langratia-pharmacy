import React, { useState } from 'react';
import { Lock, ShieldAlert, X } from 'lucide-react';
import { VerifyPassword } from '../../../wailsjs/go/main/App';

interface ReAuthDialogProps {
  isOpen: boolean;
  userId: number;
  title?: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const ReAuthDialog: React.FC<ReAuthDialogProps> = ({
  isOpen,
  userId,
  title = 'Confirm Your Identity',
  onVerified,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      const ok = await VerifyPassword(userId, password);
      if (ok) {
        setPassword('');
        onVerified();
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    } catch {
      setError('Verification failed');
    }

    setIsVerifying(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          width: '380px',
          backgroundColor: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border-default)',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 }}>
            <Lock size={16} />
            {title}
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger-text)', padding: '8px 10px', fontSize: '12px', marginBottom: '12px',
            }}
          >
            <ShieldAlert size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password to continue"
            required
            autoFocus
            style={{
              width: '100%', padding: '8px 10px', fontSize: '13px',
              border: '1px solid var(--color-border-strong)',
              backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
              outline: 'none', boxSizing: 'border-box', marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCancel} className="desktop-btn" style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}>
              Cancel
            </button>
            <button type="submit" disabled={isVerifying || !password} className="desktop-btn-primary" style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}>
              {isVerifying ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
