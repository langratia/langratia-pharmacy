import React from 'react';

export const SuppliersPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-charcoal-navy)', marginBottom: '8px' }}>
        Supplier Management
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
        Maintain vendor records, contact details, and supplier order histories.
      </p>
    </div>
  );
};
