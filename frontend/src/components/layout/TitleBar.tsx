import React from 'react';
import { Cross, Minus, Square, X } from 'lucide-react';
import { WindowMinimise, WindowToggleMaximise, Quit } from '../../../wailsjs/runtime/runtime';

export const TitleBar: React.FC = () => {
  return (
    <div style={{
      height: '24px',
      maxHeight: '24px',
      flexShrink: 0,
      backgroundColor: '#0F172A',
      color: '#94A3B8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 4px 0 8px',
      fontSize: '11px',
      fontWeight: 500,
      userSelect: 'none',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      // @ts-ignore
      '--wails-draggable': 'drag'
    } as any}>
      
      {/* Left App Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '14px',
          height: '14px',
          borderRadius: '0px',
          backgroundColor: '#0F8A6A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF'
        }}>
          <Cross size={9} />
        </div>
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#E2E8F0', letterSpacing: '-0.01em' }}>
          Langratia POS Workstation
        </span>
      </div>

      {/* Right Desktop Window Control Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', ...{ '--wails-draggable': 'no-drag' } as any }}>
        <button
          onClick={() => WindowMinimise()}
          title="Minimize Window"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '0px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
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
          <Minus size={13} />
        </button>

        <button
          onClick={() => WindowToggleMaximise()}
          title="Maximize / Restore"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '0px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
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
          <Square size={10} />
        </button>

        <button
          onClick={() => Quit()}
          title="Close Application"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '0px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
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
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
