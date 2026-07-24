import React from 'react';

export const POSPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-charcoal-navy)', marginBottom: '8px' }}>
        Point of Sale (POS)
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
        Fast checkout interface for selling medicines and recording transactions.
      </p>
    </div>
  );
};
