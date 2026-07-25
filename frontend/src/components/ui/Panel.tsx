import React from 'react';

interface PanelProps {
  id?: string;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
  onClick?: () => void;
}

export const Panel: React.FC<PanelProps> = ({
  id,
  children,
  title,
  subtitle,
  actions,
  headerRight,
  className = '',
  style,
  noPadding = false,
  onClick
}) => {
  return (
    <div
      id={id}
      className={`solid-panel ${className}`}
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0px',
        boxShadow: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : undefined,
        ...style
      }}
    >
      {(title || subtitle || actions || headerRight) && (
        <div
          style={{
            height: '36px',
            maxHeight: '36px',
            padding: '0 12px',
            borderBottom: '1px solid var(--color-border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-bg-base)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            {title && (
              <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <>
                {title && <span style={{ color: 'var(--color-border-default)' }}>|</span>}
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subtitle}
                </span>
              </>
            )}
          </div>
          {(actions || headerRight) && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{actions}{headerRight}</div>}
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
