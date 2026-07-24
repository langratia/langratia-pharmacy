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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#F4F6F8' }}>
      {/* Tier 1: Window Titlebar */}
      <TitleBar />

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 32px)' }}>
        {/* Tier 2: Grouped Collapsible Sidebar */}
        <Sidebar
          activeView={activeView}
          onSelectView={onSelectView}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Content Container */}
        <div
          style={{
            marginLeft: isCollapsed ? '64px' : '240px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#F4F6F8',
            transition: 'margin-left 200ms ease-out'
          }}
        >
          {/* Tier 3: Desktop App Toolbar */}
          <Header onSelectView={onSelectView} />

          {/* Tier 4: Workspace Main Content Area */}
          <main
            style={{
              flex: 1,
              height: 'calc(100vh - 80px)',
              maxHeight: 'calc(100vh - 80px)',
              overflowY: 'auto',
              overscrollBehaviorY: 'contain',
              // @ts-ignore
              WebkitOverflowScrolling: 'touch',
              padding: '16px 20px',
              boxSizing: 'border-box'
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
