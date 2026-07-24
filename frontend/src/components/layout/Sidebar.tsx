import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Pill, 
  Truck, 
  Users, 
  BarChart3, 
  Settings,
  Cross,
  LogOut,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavItemKey = 'dashboard' | 'pos' | 'prescriptions' | 'inventory' | 'purchases' | 'suppliers' | 'reports' | 'settings';

interface SidebarProps {
  activeView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  key: NavItemKey;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'MAIN',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
    ]
  },
  {
    title: 'SALES',
    items: [
      { key: 'pos', label: 'Point of Sale', icon: ShoppingCart },
      { key: 'prescriptions', label: 'Prescriptions', icon: FileText }
    ]
  },
  {
    title: 'INVENTORY',
    items: [
      { key: 'inventory', label: 'Medicines', icon: Pill },
      { key: 'suppliers', label: 'Suppliers', icon: Users, adminOnly: true }
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      { key: 'purchases', label: 'Purchases', icon: Truck, adminOnly: true },
      { key: 'reports', label: 'Reports', icon: BarChart3, adminOnly: true }
    ]
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { key: 'settings', label: 'Settings', icon: Settings, adminOnly: true }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelectView, isCollapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();

  return (
    <aside
      style={{
        width: isCollapsed ? '64px' : '240px',
        height: 'calc(100vh - 32px)',
        backgroundColor: '#1F2937',
        borderRight: '1px solid #374151',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: '32px',
        zIndex: 100,
        transition: 'width 200ms ease-out',
        color: '#FFFFFF',
        userSelect: 'none'
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '48px',
          padding: isCollapsed ? '0 12px' : '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #374151'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#0F8A6A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0
            }}
          >
            <Cross size={16} />
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                Langratia
              </span>
              <span style={{ fontSize: '10px', color: '#9CA3AF', marginLeft: '6px', fontWeight: 500 }}>
                POS
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            color: '#9CA3AF',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#374151';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#9CA3AF';
          }}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Grouped Navigation List */}
      <nav
        style={{
          flex: 1,
          padding: isCollapsed ? '8px 6px' : '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto'
        }}
      >
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || user?.role === 'admin'
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {!isCollapsed && (
                <div
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#6B7280',
                    letterSpacing: '0.05em'
                  }}
                >
                  {group.title}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectView(item.key)}
                    title={isCollapsed ? item.label : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      gap: '10px',
                      padding: isCollapsed ? '8px' : '7px 10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#FFFFFF' : '#9CA3AF',
                      backgroundColor: isActive ? '#0F8A6A' : 'transparent',
                      transition: 'all 150ms ease-out',
                      textAlign: 'left',
                      width: '100%',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#374151';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#9CA3AF';
                      }
                    }}
                  >
                    <Icon size={16} color={isActive ? '#FFFFFF' : '#9CA3AF'} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div
        style={{
          padding: isCollapsed ? '8px 6px' : '8px 10px',
          borderTop: '1px solid #374151'
        }}
      >
        <button
          onClick={logout}
          title="Sign out of system"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '10px',
            width: '100%',
            padding: isCollapsed ? '8px' : '7px 10px',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: '#F87171',
            fontWeight: 500,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 150ms ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
