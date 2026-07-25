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
        height: '20px',
        maxHeight: '20px',
        backgroundColor: '#0F172A',
        color: '#94A3B8',
        borderTop: '1px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        fontSize: '10px',
        fontWeight: 500,
        userSelect: 'none',
        zIndex: 100
      }}
    >
      {/* Left Status: DB Connection & Active User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981' }}>
          <Database size={11} />
          <span style={{ fontSize: '10px', fontWeight: 600 }}>Wails SQLite DB Connected</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#CBD5E1' }}>
          <UserCheck size={11} />
          <span>
            Operator: <strong>{user?.full_name || user?.username || 'Pharmacist'}</strong> ({user?.role || 'user'})
          </span>
        </div>
      </div>

      {/* Center Status: Keyboard Shortcuts Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#64748B' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Keyboard size={11} /> <strong>Ctrl+K</strong> Palette
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
