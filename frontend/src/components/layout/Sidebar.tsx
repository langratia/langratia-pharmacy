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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { usePharmacy } from '../../context/PharmacyContext';
import amoLogo from '../../assets/images/amo_hope_logo.svg';

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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelectView }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { pharmacyName, logoUrl } = usePharmacy();

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
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-line)',
        overflow: 'hidden',
        padding: '24px 16px',
        justifyContent: 'space-between',
        flexShrink: 0,
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
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
            padding: '4px 8px',
            color: 'var(--sidebar-ink)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px',
              boxSizing: 'border-box',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          >
            <img
              src={logoUrl || amoLogo}
              alt="Pharmacy Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <span
            style={{
              fontSize: '17px',
              fontWeight: 800,
              letterSpacing: '-0.3px',
              color: 'var(--sidebar-ink)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {pharmacyName}
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--sidebar-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 12px 4px',
            }}
          >
            Menu
          </div>
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
                  padding: '10px 14px',
                  borderRadius: '10px',
                  color: isActive ? '#FFFFFF' : 'var(--sidebar-muted)',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  border: isActive
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid transparent',
                  textAlign: 'left',
                  width: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  transform: 'none',
                  boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                  minHeight: 'unset',
                  height: 'auto',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.background = 'var(--sidebar-hover-bg)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--sidebar-muted)';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'none';
                  }
                }}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '0px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '3px',
                      height: '20px',
                      background: '#2ECC71',
                      borderRadius: '0 3px 3px 0',
                      boxShadow: '0 0 8px #2ECC71',
                    }}
                  />
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingLeft: isActive ? '4px' : '0',
                    transition: 'padding 0.2s ease',
                  }}
                >
                  <span style={{ flexShrink: 0, color: isActive ? '#2ECC71' : 'inherit', display: 'flex' }}>
                    <Icon size={18} />
                  </span>
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: user profile card */}
      {user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--sidebar-line)',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#2ECC71',
                color: '#0F3526',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '14px',
                flexShrink: 0,
              }}
            >
              {(user.username?.[0] || 'U').toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#FFFFFF',
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
                  color: 'var(--sidebar-muted)',
                  textTransform: 'capitalize',
                }}
              >
                {user.role}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
