import React from 'react';

export const InventoryPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-charcoal-navy)', marginBottom: '8px' }}>
        Inventory & Medicine Management
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
        Manage medicine catalog, batch tracking, stock adjustments, and reorder alerts.
      </p>
    </div>
  );
};
