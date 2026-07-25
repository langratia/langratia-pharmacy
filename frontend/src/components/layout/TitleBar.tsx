import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { WindowMinimise, WindowToggleMaximise, Quit } from '../../../wailsjs/runtime/runtime';

export const TitleBar: React.FC = () => {
  return (
    <div style={{
      height: '24px',
      maxHeight: '24px',
      flexShrink: 0,
      backgroundColor: 'var(--color-slate-10)',
      color: 'var(--color-slate-4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 4px 0 8px',
      fontSize: '11px',
      fontWeight: 500,
      userSelect: 'none',
      // @ts-ignore
      '--wails-draggable': 'drag'
    } as any}>

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
            color: 'var(--color-slate-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-slate-8)';
            e.currentTarget.style.color = 'var(--color-slate-0)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-slate-4)';
          }}
        >
          <Minus size={12} />
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
            color: 'var(--color-slate-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-slate-8)';
            e.currentTarget.style.color = 'var(--color-slate-0)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-slate-4)';
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
            color: 'var(--color-slate-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)';
            e.currentTarget.style.color = 'var(--color-danger-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-slate-4)';
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
