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
          text: label || (normStatus === 'in_stock' ? 'In Stock' : normStatus === 'active' ? 'Active' : 'Paid'),
        };
      case 'low_stock':
      case 'low stock':
      case 'pending':
        return {
          bg: 'var(--color-warning-bg)',
          color: 'var(--color-warning-text)',
          border: 'var(--color-warning-border)',
          dot: 'var(--color-warning-text)',
          text: label || (normStatus === 'low_stock' ? 'Low Stock' : 'Pending'),
        };
      case 'out_of_stock':
      case 'out of stock':
        return {
          bg: 'var(--color-danger-bg)',
          color: 'var(--color-danger-text)',
          border: 'var(--color-danger-border)',
          dot: 'var(--color-danger-text)',
          text: label || 'Out of Stock',
        };
      case 'expired':
        return {
          bg: 'var(--color-warning-bg)',
          color: 'var(--color-warning-text)',
          border: 'var(--color-warning-border)',
          dot: 'var(--color-warning-text)',
          text: label || 'Expired',
        };
      case 'archived':
      default:
        return {
          bg: 'var(--overlay-hover)',
          color: 'var(--muted)',
          border: 'var(--line)',
          dot: 'var(--muted-dark)',
          text: label || status || 'Archived',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        lineHeight: '1.4',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...style,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.dot,
          display: 'inline-block',
          flexShrink: 0,
          boxShadow: `0 0 5px ${config.dot}`,
        }}
      />
      {config.text}
    </span>
  );
};
