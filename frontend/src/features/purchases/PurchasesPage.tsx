import React from 'react';

export const PurchasesPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-charcoal-navy)', marginBottom: '8px' }}>
        Stock Receiving & Purchases
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
        Record incoming shipments, register new batches, and update inventory stock counts.
      </p>
    </div>
  );
};
