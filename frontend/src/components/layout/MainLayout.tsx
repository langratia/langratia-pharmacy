import React from 'react';
import { Sidebar, NavItemKey } from './Sidebar';

interface MainLayoutProps {
  activeView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ activeView, onSelectView, children }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-soft-bg)' }}>
      <Sidebar activeView={activeView} onSelectView={onSelectView} />
      <main style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        minHeight: '100vh',
        backgroundColor: 'var(--color-soft-bg)'
      }}>
        {children}
      </main>
    </div>
  );
};
