import React from 'react';
import { Cross, Minus, Square, X } from 'lucide-react';
import { WindowMinimise, WindowToggleMaximise, Quit } from '../../../wailsjs/runtime/runtime';

export const TitleBar: React.FC = () => {
  return (
    <div style={{
      height: '32px',
      backgroundColor: '#0F172A', // Deep Slate / Dark Navy
      color: '#94A3B8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px 0 14px',
      fontSize: '12px',
      fontWeight: 500,
      userSelect: 'none',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      // @ts-ignore
      '--wails-draggable': 'drag'
    } as any}>
      
      {/* Left App Branding - Icon Only */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{
          width: '18px',
          height: '18px',
          borderRadius: '4px',
          backgroundColor: '#10B981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF'
        }}>
          <Cross size={11} />
        </div>
      </div>

      {/* Right Desktop Window Control Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', ...{ '--wails-draggable': 'no-drag' } as any }}>
        <button
          onClick={() => WindowMinimise()}
          title="Minimize Window"
          style={{
            width: '28px',
            height: '24px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#94A3B8';
          }}
        >
          <Minus size={14} />
        </button>

        <button
          onClick={() => WindowToggleMaximise()}
          title="Maximize / Restore"
          style={{
            width: '28px',
            height: '24px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#94A3B8';
          }}
        >
          <Square size={11} />
        </button>

        <button
          onClick={() => Quit()}
          title="Close Application"
          style={{
            width: '28px',
            height: '24px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EF4444';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#94A3B8';
          }}
        >
          <X size={14} />
        </button>
      </div>

    </div>
  );
};
