import React from 'react';

interface DesktopButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const DesktopButton: React.FC<DesktopButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  style,
  disabled,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#0F8A6A',
          color: '#FFFFFF',
          border: '1px solid transparent',
          boxShadow: '0 1px 2px rgba(15, 138, 106, 0.2)'
        };
      case 'danger':
        return {
          backgroundColor: '#EF4444',
          color: '#FFFFFF',
          border: '1px solid transparent',
          boxShadow: '0 1px 2px rgba(239, 68, 68, 0.2)'
        };
      case 'outline':
        return {
          backgroundColor: '#FFFFFF',
          color: '#374151',
          border: '1px solid #D1D5DB',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: '#4B5563',
          border: '1px solid transparent'
        };
      case 'secondary':
      default:
        return {
          backgroundColor: '#F3F4F6',
          color: '#1F2937',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { height: '32px', padding: '0 10px', fontSize: '12px' };
      case 'lg':
        return { height: '42px', padding: '0 18px', fontSize: '14px' };
      case 'md':
      default:
        return { height: '36px', padding: '0 14px', fontSize: '13px' };
    }
  };

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontWeight: 500,
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 150ms ease-out',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'primary') e.currentTarget.style.backgroundColor = '#0B6B52';
        if (variant === 'danger') e.currentTarget.style.backgroundColor = '#DC2626';
        if (variant === 'secondary') e.currentTarget.style.backgroundColor = '#E5E7EB';
        if (variant === 'outline') e.currentTarget.style.backgroundColor = '#F9FAFB';
        if (variant === 'ghost') e.currentTarget.style.backgroundColor = '#F3F4F6';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        const vs = getVariantStyles();
        if (vs.backgroundColor) e.currentTarget.style.backgroundColor = vs.backgroundColor as string;
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
