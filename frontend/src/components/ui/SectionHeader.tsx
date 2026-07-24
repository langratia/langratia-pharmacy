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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        ...style
      }}
    >
      <div>
        {isPageTitle ? (
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 600,
              color: '#111827',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            {title}
          </h1>
        ) : (
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#111827',
              lineHeight: 1.3
            }}
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
