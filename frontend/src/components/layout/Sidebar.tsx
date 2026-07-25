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
        width: isCollapsed ? '80px' : '260px',
        height: '100%',
        backgroundColor: '#0F172A',
        borderRight: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        zIndex: 100,
        transition: 'width 150ms ease-out',
        color: '#FFFFFF',
        userSelect: 'none'
      }}
    >
      {/* Brand & Collapse Header */}
      <div
        style={{
          height: '64px',
          padding: isCollapsed ? '0 12px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #1E293B',
          backgroundColor: 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '0px',
              backgroundColor: '#0F8A6A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0
            }}
          >
            <Cross size={13} />
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
                Langratia
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px', fontWeight: 600 }}>
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
            width: '20px',
            height: '20px',
            borderRadius: '0px',
            color: '#94A3B8',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1E293B';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#94A3B8';
          }}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Navigation Group List */}
      <nav
        style={{
          flex: 1,
          padding: isCollapsed ? '16px 12px' : '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto'
        }}
      >
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || user?.role === 'admin'
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {!isCollapsed && (
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: '0.06em'
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
                      gap: '12px',
                      padding: isCollapsed ? '14px' : '14px 16px',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#34D399' : '#94A3B8',
                      backgroundColor: isActive ? 'rgba(15, 138, 106, 0.15)' : 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      width: '100%',
                      minHeight: '48px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = '#F8FAFC';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#94A3B8';
                      }
                    }}
                  >
                    <Icon size={20} color={isActive ? '#34D399' : '#94A3B8'} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer / Sign Out */}
      <div
        style={{
          padding: isCollapsed ? '16px 12px' : '16px 20px',
          borderTop: '1px solid #1E293B'
        }}
      >
        <button
          onClick={logout}
          title="Sign out of system"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '12px',
            width: '100%',
            padding: isCollapsed ? '14px' : '14px 16px',
            borderRadius: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#F87171',
            fontWeight: 500,
            fontSize: '15px',
            minHeight: '48px',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
