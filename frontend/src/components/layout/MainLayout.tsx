import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NavItemKey } from './Sidebar';

interface MainLayoutProps {
  activeView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ activeView, onSelectView, children }) => {
  return (
    <div className="shell">
      {/* Left navigation column */}
      <Sidebar activeView={activeView} onSelectView={onSelectView} />

      {/* Right main column: topbar + content */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <Header onSelectView={onSelectView} activeView={activeView} />

        <section
          className="content content-enter"
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            padding: '24px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--overlay-active) transparent',
            backgroundImage: 'radial-gradient(ellipse at 20% 50%, var(--card-accent) 0%, transparent 60%)',
          }}
        >
          {children}
        </section>
      </main>
    </div>
  );
};
