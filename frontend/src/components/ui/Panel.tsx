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
      className={className}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '0px',
        boxShadow: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
    >
      {(title || actions) && (
        <div
          style={{
            height: '24px',
            maxHeight: '24px',
            padding: '0 6px',
            borderBottom: '1px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            {title && (
              <h3 style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <>
                {title && <span style={{ color: '#CBD5E1' }}>|</span>}
                <p style={{ margin: 0, fontSize: '10px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {subtitle}
                </p>
              </>
            )}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? '0' : '4px', flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
};
