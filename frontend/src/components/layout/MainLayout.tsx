import React, { useState } from 'react';
import { Sidebar, NavItemKey } from './Sidebar';
import { Header } from './Header';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';

interface MainLayoutProps {
  activeView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ activeView, onSelectView, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--color-desktop-bg)' }}>
      {/* Tier 1: Window TitleBar */}
      <TitleBar />

      {/* Tier 2: Middle Workstation Canvas (Sidebar + Right Content Column) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Collapsible Navigation Sidebar */}
        <Sidebar
          activeView={activeView}
          onSelectView={onSelectView}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Right Workspace Column */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: 'var(--color-desktop-bg)'
          }}
        >
          {/* App Toolbar Header */}
          <Header onSelectView={onSelectView} />

          {/* Main Desktop Screen Workspace Canvas */}
          <main
            style={{
              flex: 1,
              overflow: 'hidden',
              padding: '16px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Tier 3: Persistent Bottom Desktop Status Bar */}
      <StatusBar />
    </div>
  );
};
