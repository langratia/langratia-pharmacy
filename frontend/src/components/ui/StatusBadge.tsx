import React from 'react';

export type StatusType =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'expired'
  | 'active'
  | 'pending'
  | 'archived'
  | 'paid';

interface StatusBadgeProps {
  status?: StatusType | string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status = 'active', label, style }) => {
  const normStatus = (status || '').toString().toLowerCase().replace(/\s+/g, '_');

  const getBadgeConfig = () => {
    switch (normStatus) {
      case 'in_stock':
      case 'in stock':
      case 'active':
      case 'paid':
        return {
          bg: 'var(--color-success-bg)',
          color: 'var(--color-success-text)',
          border: 'var(--color-success-border)',
          dot: 'var(--color-success-text)',
          text: label || (normStatus === 'in_stock' ? 'In Stock' : normStatus === 'active' ? 'Active' : 'Paid')
        };
      case 'low_stock':
      case 'low stock':
      case 'pending':
        return {
          bg: 'var(--color-warning-bg)',
          color: 'var(--color-warning-text)',
          border: 'var(--color-warning-border)',
          dot: 'var(--color-warning-text)',
          text: label || (normStatus === 'low_stock' ? 'Low Stock' : 'Pending')
        };
      case 'out_of_stock':
      case 'out of stock':
        return {
          bg: 'var(--color-danger-bg)',
          color: 'var(--color-danger-text)',
          border: 'var(--color-danger-border)',
          dot: 'var(--color-danger-text)',
          text: label || 'Out of Stock'
        };
      case 'expired':
        return {
          bg: 'var(--color-warning-bg)',
          color: 'var(--color-warning-text)',
          border: 'var(--color-warning-border)',
          dot: 'var(--color-warning-text)',
          text: label || 'Expired'
        };
      case 'archived':
      default:
        return {
          bg: 'var(--color-bg-hover)',
          color: 'var(--color-text-secondary)',
          border: 'var(--color-border-default)',
          dot: 'var(--color-text-muted)',
          text: label || status || 'Archived'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 7px',
        borderRadius: '2px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        lineHeight: '1.4',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...style
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: config.dot,
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      {config.text}
    </span>
  );
};
