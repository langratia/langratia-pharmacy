import React from 'react';

interface PanelProps {
  id?: string;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  id,
  children,
  title,
  subtitle,
  actions,
  className = '',
  style,
  noPadding = false
}) => {
  return (
    <div
      id={id}
      className={`glass-panel ${className}`}
      style={{
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--color-border)',
        borderRadius: '2px',
        boxShadow: 'var(--shadow-glass)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
    >
      {(title || actions) && (
        <div
          style={{
            height: '30px',
            maxHeight: '30px',
            padding: '0 10px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-accent-light)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            {title && (
              <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <>
                <span style={{ color: 'var(--color-border)' }}>|</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subtitle}
                </span>
              </>
            )}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{actions}</div>}
        </div>
      )}
      <div
        style={{
          padding: noPadding ? 0 : '8px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {children}
      </div>
    </div>
  );
};
