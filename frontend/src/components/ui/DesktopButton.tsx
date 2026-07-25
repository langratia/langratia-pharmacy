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
          backgroundColor: 'var(--color-accent-solid)',
          color: 'var(--color-text-inverse)',
          border: '1px solid var(--color-accent-solid-hover)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-danger-text)',
          color: 'var(--color-text-inverse)',
          border: '1px solid var(--color-danger-border)',
        };
      case 'outline':
        return {
          backgroundColor: 'var(--color-bg-panel)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-strong)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          border: '1px solid transparent',
        };
      case 'secondary':
      default:
        return {
          backgroundColor: 'var(--color-bg-hover)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-default)',
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

  const getHoverBg = () => {
    switch (variant) {
      case 'primary': return 'var(--color-accent-solid-hover)';
      case 'danger': return 'var(--color-danger-bg)';
      case 'secondary': return 'var(--color-bg-active)';
      case 'outline': return 'var(--color-bg-hover)';
      case 'ghost': return 'var(--color-bg-hover)';
      default: return 'var(--color-bg-active)';
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
        borderRadius: '2px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 150ms ease-out',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.backgroundColor = getHoverBg();
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
