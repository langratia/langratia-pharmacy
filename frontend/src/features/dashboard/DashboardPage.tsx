import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-charcoal-navy)', marginBottom: '8px' }}>
        Dashboard Overview
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
        Operational summary, daily sales, stock levels, and expiration alerts.
      </p>
    </div>
  );
};
