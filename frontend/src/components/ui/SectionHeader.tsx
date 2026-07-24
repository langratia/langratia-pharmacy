import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  isPageTitle?: boolean;
  style?: React.CSSProperties;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actions,
  isPageTitle = true,
  style
}) => {
  return (
    <div
      style={{
        height: '32px',
        maxHeight: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '2px',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
        <h1
          style={{
            margin: 0,
            fontSize: isPageTitle ? '13px' : '12px',
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <>
            <span style={{ color: '#CBD5E1', userSelect: 'none' }}>|</span>
            <span style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle}
            </span>
          </>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
