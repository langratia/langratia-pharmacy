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
  onClick,
}) => {
  return (
    <div
      id={id}
      className={className}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r2)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
        ...style,
      }}
    >
      {(title || subtitle || actions || headerRight) && (
        <div
          style={{
            padding: '16px 20px 14px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.1px',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
          {(actions || headerRight) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {actions}
              {headerRight}
            </div>
          )}
        </div>
      )}
      <div
        style={{
          padding: noPadding ? '0' : '20px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
};
