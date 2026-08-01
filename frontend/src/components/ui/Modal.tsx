import React, { useEffect } from 'react';

export interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
  width?: number | string;
}

export const Modal: React.FC<ModalProps> = ({ children, onClose, width = 420 }) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3,5,8,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          background: 'var(--surface-soft)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--r2)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: '28px',
          animation: 'popupEnter 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {children}
      </div>
    </div>
  );
};
