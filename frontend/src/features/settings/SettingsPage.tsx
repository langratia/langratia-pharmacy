import React from 'react';

export const SettingsPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-charcoal-navy)', marginBottom: '8px' }}>
        Settings & Administration
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
        Manage system users, view audit logs, perform local backups, and restore data.
      </p>
    </div>
  );
};
