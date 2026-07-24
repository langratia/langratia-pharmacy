import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Pill, 
  Truck, 
  Users, 
  BarChart3, 
  Settings,
  Cross
} from 'lucide-react';

export type NavItemKey = 'dashboard' | 'pos' | 'inventory' | 'purchases' | 'suppliers' | 'reports' | 'settings';

interface SidebarProps {
  activeView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
}

interface NavItem {
  key: NavItemKey;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', label: 'Point of Sale', icon: ShoppingCart },
  { key: 'inventory', label: 'Inventory', icon: Pill },
  { key: 'purchases', label: 'Purchases', icon: Truck },
  { key: 'suppliers', label: 'Suppliers', icon: Users },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelectView }) => {
  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      backgroundColor: 'var(--color-surface-white)',
      borderRight: '1px solid var(--color-border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      boxShadow: '2px 0 8px rgba(0,0,0,0.02)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--color-border-subtle)'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: 'var(--color-primary-teal)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <Cross size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-charcoal-navy)', lineHeight: '1.2' }}>
            Langratia
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>
            PHARMACY SYSTEM
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onSelectView(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-primary-teal)' : 'var(--color-charcoal-navy)',
                backgroundColor: isActive ? '#F0FDF9' : 'transparent',
                transition: 'all 0.15s ease-in-out',
                textAlign: 'left',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--color-soft-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon size={18} color={isActive ? 'var(--color-primary-teal)' : 'var(--color-text-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info / Status */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--color-border-subtle)',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#10B981'
        }} />
        <span>System Offline Ready</span>
      </div>
    </aside>
  );
};
