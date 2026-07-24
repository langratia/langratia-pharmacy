import React from 'react';

export const ReportsPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-charcoal-navy)', marginBottom: '8px' }}>
        Reports & Analytics
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
        Generate printable reports for sales performance, stock status, and expiry schedules.
      </p>
    </div>
  );
};
