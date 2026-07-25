import React, { useState, useEffect } from 'react';
import { Database, UserCheck, Keyboard, Command } from 'lucide-react';
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
        height: '28px',
        maxHeight: '28px',
        backgroundColor: '#0F172A',
        color: '#94A3B8',
        borderTop: '1px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '12px',
        fontWeight: 500,
        userSelect: 'none',
        zIndex: 100
      }}
    >
      {/* Left Status: DB Connection & Active User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
          <Database size={13} />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Wails SQLite DB Connected</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#CBD5E1' }}>
          <UserCheck size={13} />
          <span>
            Operator: <strong>{user?.full_name || user?.username || 'Pharmacist'}</strong> ({user?.role || 'user'})
          </span>
        </div>
      </div>

      {/* Center Status: Keyboard Shortcuts Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748B' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Keyboard size={13} /> <strong>Ctrl+K</strong> Palette
        </span>
        <span>•</span>
        <span>Workstation v1.0.4</span>
      </div>

      {/* Right Status: Realtime System Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E2E8F0', fontFamily: 'monospace' }}>
        <span>{timeStr}</span>
      </div>
    </footer>
  );
};
