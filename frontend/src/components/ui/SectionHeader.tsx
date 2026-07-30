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
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: isPageTitle ? '22px' : '17px',
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <span
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
