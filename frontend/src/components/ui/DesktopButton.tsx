import React from 'react';

interface DesktopButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
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
          background: 'var(--blue)',
          color: '#fff',
          border: '1px solid var(--blue)',
        };
      case 'danger':
        return {
          background: 'var(--color-danger-bg)',
          color: 'var(--color-danger-text)',
          border: '1px solid var(--color-danger-border)',
        };
      case 'success':
        return {
          background: 'var(--color-success-bg)',
          color: 'var(--color-success-text)',
          border: '1px solid var(--color-success-border)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--ink)',
          border: '1px solid var(--line-strong)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--muted)',
          border: '1px solid transparent',
        };
      case 'secondary':
      default:
        return {
          background: 'var(--surface-soft)',
          color: 'var(--ink)',
          border: '1px solid var(--line)',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { padding: '6px 12px', fontSize: '12px', borderRadius: '8px', gap: '5px' };
      case 'lg':
        return { padding: '12px 24px', fontSize: '15px', borderRadius: 'var(--r)', gap: '10px' };
      case 'md':
      default:
        return { padding: '9px 18px', fontSize: '14px', borderRadius: 'var(--r)', gap: '8px' };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        ...variantStyles,
        ...getSizeStyles(),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow =
          variant === 'primary' ? 'var(--shadow-blue)' :
          variant === 'danger' ? '0 8px 24px rgba(255,56,96,0.25)' :
          '0 6px 20px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translateY(1px) scale(0.97)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onMouseUp={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'none';
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
