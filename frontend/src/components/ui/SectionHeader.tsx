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
        backgroundColor: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border-default)',
        borderRadius: '0px',
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
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <>
            <span style={{ color: 'var(--color-border-default)', userSelect: 'none' }}>|</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
