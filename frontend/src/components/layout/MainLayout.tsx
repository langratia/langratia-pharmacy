import React, { useState } from 'react';
import { Sidebar, NavItemKey } from './Sidebar';
import { Header } from './Header';
import { TitleBar } from './TitleBar';

interface MainLayoutProps {
  activeView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ activeView, onSelectView, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-soft-white)' }}>
      {/* Tier 1: Dedicated Desktop Window Titlebar */}
      <TitleBar />

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 32px)' }}>
        {/* Sidebar Navigation */}
        <Sidebar
          activeView={activeView}
          onSelectView={onSelectView}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Content Container */}
        <div style={{
          marginLeft: isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-soft-white)',
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Tier 2: Business Header */}
          <Header onSelectView={onSelectView} />

          <main style={{ 
            flex: 1, 
            height: 'calc(100vh - 88px)', 
            maxHeight: 'calc(100vh - 88px)', 
            overflowY: 'auto', 
            padding: '24px',
            boxSizing: 'border-box'
          }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
