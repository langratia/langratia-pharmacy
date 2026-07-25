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
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
    >
      {(title || actions) && (
        <div
          style={{
            height: '48px',
            maxHeight: '48px',
            padding: '0 16px',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-accent-light)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            {title && (
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <>
                {title && <span style={{ color: 'var(--color-border-subtle)' }}>|</span>}
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subtitle}
                </span>
              </>
            )}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{actions}</div>}
        </div>
      )}
      <div
        style={{
          padding: noPadding ? '0' : '4px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}
      >
        {children}
      </div>
    </div>
  );
};
