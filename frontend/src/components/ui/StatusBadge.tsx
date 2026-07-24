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
          bg: '#ECFDF5',
          color: '#065F46',
          border: '#A7F3D0',
          dot: '#10B981',
          text: label || (normStatus === 'in_stock' ? 'In Stock' : normStatus === 'active' ? 'Active' : 'Paid')
        };
      case 'low_stock':
      case 'low stock':
      case 'pending':
        return {
          bg: '#FFFBEB',
          color: '#92400E',
          border: '#FDE68A',
          dot: '#F59E0B',
          text: label || (normStatus === 'low_stock' ? 'Low Stock' : 'Pending')
        };
      case 'out_of_stock':
      case 'out of stock':
        return {
          bg: '#FEF2F2',
          color: '#991B1B',
          border: '#FCA5A5',
          dot: '#EF4444',
          text: label || 'Out of Stock'
        };
      case 'expired':
        return {
          bg: '#F5F3FF',
          color: '#5B21B6',
          border: '#DDD6FE',
          dot: '#8B5CF6',
          text: label || 'Expired'
        };
      case 'archived':
      default:
        return {
          bg: '#F3F4F6',
          color: '#4B5563',
          border: '#E5E7EB',
          dot: '#9CA3AF',
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
        padding: '2px 8px',
        borderRadius: '12px',
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
          width: '6px',
          height: '6px',
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
