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

  // Sidebar uses its own deep navy surface, independent of the light/dark panel tokens
  // so that it always reads as a distinct navigation layer.
  const sidebarBg = 'var(--color-slate-9)';
  const sidebarBorder = 'var(--color-slate-8)';
  const sidebarTextMuted = 'var(--color-slate-4)';
  const sidebarTextActive = 'var(--color-slate-0)';
  const sidebarHoverBg = 'var(--color-slate-8)';
  const sidebarActiveBg = 'rgba(75, 134, 194, 0.18)'; // accent-base at low opacity
  const sidebarActiveColor = 'var(--color-accent-base)';

  return (
    <aside
      style={{
        width: isCollapsed ? '60px' : '220px',
        height: '100%',
        backgroundColor: sidebarBg,
        borderRight: `1px solid ${sidebarBorder}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        zIndex: 100,
        transition: 'width 150ms ease-out',
        color: sidebarTextActive,
        userSelect: 'none'
      }}
    >
      {/* Brand & Collapse Header */}
      <div
        style={{
          height: '48px',
          padding: isCollapsed ? '0 10px' : '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: `1px solid ${sidebarBorder}`,
          backgroundColor: 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '0px',
              backgroundColor: 'var(--color-accent-solid)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-inverse)',
              flexShrink: 0
            }}
          >
            <Cross size={11} />
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: sidebarTextActive, letterSpacing: '-0.01em' }}>
                Langratia
              </span>
              <span style={{ fontSize: '10px', color: sidebarTextMuted, marginLeft: '5px', fontWeight: 600 }}>
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
            color: sidebarTextMuted,
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = sidebarHoverBg;
            e.currentTarget.style.color = sidebarTextActive;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = sidebarTextMuted;
          }}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Navigation Group List */}
      <nav
        style={{
          flex: 1,
          padding: isCollapsed ? '12px 8px' : '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
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
                    padding: '10px 8px 4px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: sidebarTextMuted,
                    letterSpacing: '0.08em'
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
                      padding: isCollapsed ? '10px' : '9px 12px',
                      borderRadius: '0px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? sidebarActiveColor : sidebarTextMuted,
                      backgroundColor: isActive ? sidebarActiveBg : 'transparent',
                      border: isActive ? `1px solid rgba(75, 134, 194, 0.25)` : '1px solid transparent',
                      textAlign: 'left',
                      width: '100%',
                      minHeight: '36px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = sidebarHoverBg;
                        e.currentTarget.style.color = sidebarTextActive;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = sidebarTextMuted;
                      }
                    }}
                  >
                    <Icon size={16} color={isActive ? 'var(--color-accent-base)' : sidebarTextMuted} />
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
          padding: isCollapsed ? '12px 8px' : '12px 10px',
          borderTop: `1px solid ${sidebarBorder}`
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
            padding: isCollapsed ? '10px' : '9px 12px',
            borderRadius: '0px',
            backgroundColor: 'transparent',
            border: '1px solid transparent',
            color: 'var(--color-danger-text)',
            fontWeight: 500,
            fontSize: '13px',
            minHeight: '36px',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)';
            e.currentTarget.style.borderColor = 'var(--color-danger-border)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
