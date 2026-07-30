import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Truck,
  Users,
  BarChart3,
  Settings,
  FileText,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { usePharmacy } from '../../context/PharmacyContext';

export type NavItemKey =
  | 'dashboard'
  | 'pos'
  | 'prescriptions'
  | 'inventory'
  | 'purchases'
  | 'suppliers'
  | 'reports'
  | 'settings';

interface NavItem {
  key: NavItemKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  permission?: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard, permission: 'view_dashboard' },
  { key: 'pos',           label: 'Point of Sale',  icon: ShoppingCart,    permission: 'create_sale' },
  { key: 'prescriptions', label: 'Prescriptions',  icon: FileText,        permission: 'manage_prescriptions' },
  { key: 'inventory',     label: 'Medicines',      icon: Pill,            permission: 'view_inventory' },
  { key: 'suppliers',     label: 'Suppliers',      icon: Users,           permission: 'manage_suppliers' },
  { key: 'purchases',     label: 'Purchases',      icon: Truck,           permission: 'stock_receiving' },
  { key: 'reports',       label: 'Reports',        icon: BarChart3,       permission: 'view_reports' },
  { key: 'settings',      label: 'Settings',       icon: Settings,        permission: 'access_settings' },
];

interface SidebarProps {
  activeView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  // Legacy props — kept for compatibility but collapse is removed per design
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelectView }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { pharmacyName } = usePharmacy();

  const visibleItems = navItems.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 'var(--sidebar-w)',
        height: '100vh',
        background: 'var(--bg)',
        borderRight: '1px solid var(--line)',
        overflow: 'hidden',
        padding: '24px 16px',
        justifyContent: 'space-between',
        flexShrink: 0,
        /* Subtle radial accent at top */
        backgroundImage:
          'radial-gradient(circle at 50% 0%, var(--card-accent) 0%, transparent 60%), ' +
          'radial-gradient(circle, var(--overlay-line) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 24px 24px',
        position: 'relative',
        zIndex: 100,
      }}
    >
      {/* Top section: Brand + Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 6px',
            color: 'var(--ink)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: 'rgba(18, 108, 255, 0.15)',
              border: '1px solid rgba(18, 108, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue)',
              flexShrink: 0,
            }}
          >
            <Pill size={16} />
          </div>
          <span
            style={{
              fontSize: '17px',
              fontWeight: 700,
              letterSpacing: '-0.2px',
              color: 'var(--ink)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {pharmacyName}
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.key;

            return (
              <button
                key={item.key}
                onClick={() => onSelectView(item.key)}
                title={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  color: isActive ? 'var(--ink)' : 'var(--muted)',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'rgba(18, 108, 255, 0.15)' : 'transparent',
                  border: isActive
                    ? '1px solid rgba(18, 108, 255, 0.3)'
                    : '1px solid transparent',
                  textAlign: 'left',
                  width: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  transform: 'none',
                  boxShadow: 'none',
                  minHeight: 'unset',
                  height: 'auto',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--ink)';
                    e.currentTarget.style.background = 'var(--overlay-hover)';
                    e.currentTarget.style.transform = 'translateX(5px)';
                    e.currentTarget.style.borderColor = 'var(--overlay-strong)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--muted)';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '-8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '3px',
                      height: '20px',
                      background: 'var(--blue)',
                      borderRadius: '0 3px 3px 0',
                      boxShadow: '0 0 8px rgba(18, 108, 255, 0.6)',
                      animation: 'active-indicator-in 0.25s ease-out',
                    }}
                  />
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ flexShrink: 0, color: isActive ? 'var(--blue)' : 'inherit', display: 'flex' }}>
                    <Icon size={18} />
                  </span>
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: user status card */}
      {user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: 'var(--green)',
                  boxShadow: '0 0 8px var(--green)',
                  flexShrink: 0,
                  animation: 'pulse-glow 2s infinite',
                }}
              />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.full_name || user.username}
              </span>
            </div>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--muted-dark)',
                textTransform: 'capitalize',
              }}
            >
              {user.role}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
