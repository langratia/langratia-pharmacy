import React, { useState, useEffect } from 'react';
import { Database, UserCheck, Keyboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const StatusBar: React.FC = () => {
  const { user } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer
      style={{
        height: '24px',
        maxHeight: '24px',
        backgroundColor: 'var(--color-slate-10)',
        color: 'var(--color-slate-4)',
        borderTop: '1px solid var(--color-slate-8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        fontSize: '11px',
        fontWeight: 500,
        userSelect: 'none',
        zIndex: 100
      }}
    >
      {/* Left Status: DB Connection & Active User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-success-text)' }}>
          <Database size={12} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Wails SQLite DB Connected</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-slate-3)' }}>
          <UserCheck size={12} />
          <span>
            Operator: <strong>{user?.full_name || user?.username || 'Pharmacist'}</strong> ({user?.role || 'user'})
          </span>
        </div>
      </div>

      {/* Center Status: Keyboard Shortcuts Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-slate-5)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Keyboard size={12} /> <strong>Ctrl+K</strong> Palette
        </span>
        <span>•</span>
        <span>Workstation v1.0.4</span>
      </div>

      {/* Right Status: Realtime System Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-slate-2)', fontFamily: 'monospace' }}>
        <span>{timeStr}</span>
      </div>
    </footer>
  );
};
