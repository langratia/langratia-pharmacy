import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Camera,
  Upload
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserAvatarUrl, saveCustomAvatar } from '../../utils/avatar';

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

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', label: 'Point of Sale', icon: ShoppingCart },
  { key: 'prescriptions', label: 'Prescriptions', icon: FileText, adminOnly: false },
  { key: 'inventory', label: 'Inventory', icon: Pill, adminOnly: false },
  { key: 'purchases', label: 'Purchases', icon: Truck, adminOnly: true },
  { key: 'suppliers', label: 'Suppliers', icon: Users, adminOnly: true },
  { key: 'reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { key: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelectView, isCollapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateAvatar = () => {
    setAvatarUrl(getUserAvatarUrl(user));
  };

  useEffect(() => {
    updateAvatar();
    window.addEventListener('avatar-changed', updateAvatar);
    return () => window.removeEventListener('avatar-changed', updateAvatar);
  }, [user]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          saveCustomAvatar(user.id || user.username, event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <aside style={{
      width: isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
      height: 'calc(100vh - 32px)',
      backgroundColor: 'var(--color-slate-blue)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: '32px',
      zIndex: 100,
      boxShadow: 'var(--shadow-lg)',
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      color: '#FFFFFF'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: isCollapsed ? '16px 0' : '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-emerald-teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(26, 157, 139, 0.4)'
          }}>
            <Cross size={20} />
          </div>
          {!isCollapsed && (
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', lineHeight: '1.2' }}>
                Langratia
              </h2>
              <span style={{ fontSize: '10px', color: 'var(--color-mint-teal)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Pharmacy POS
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-cool-gray)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-mint-teal)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-cool-gray)'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Logged-In User Avatar Box */}
      {user && (
        <div style={{
          padding: isCollapsed ? '12px 0' : '14px',
          margin: isCollapsed ? '12px 6px' : '12px 14px',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          {/* Avatar Image with Hover Upload Trigger */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload custom user avatar"
            style={{
              position: 'relative',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              overflow: 'hidden',
              cursor: 'pointer',
              border: '2px solid var(--color-mint-teal)',
              flexShrink: 0,
              backgroundColor: '#0F172A'
            }}
          >
            <img 
              src={avatarUrl} 
              alt={user.username}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
              color: '#FFFFFF'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
            >
              <Camera size={16} />
            </div>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          {!isCollapsed && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 700, 
                color: '#FFFFFF', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
              }}>
                {user.full_name || user.username}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: user.role === 'admin' ? '#FEF3C7' : 'var(--color-emerald-teal)',
                  color: user.role === 'admin' ? '#92400E' : '#FFFFFF'
                }}>
                  {user.role}
                </span>
                <span 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: '10px', color: 'var(--color-mint-teal)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Change Avatar
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: isCollapsed ? '12px 8px' : '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
        {filteredNavItems.map((item) => {
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
                padding: isCollapsed ? '12px' : '11px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FFFFFF' : 'var(--color-cool-gray)',
                backgroundColor: isActive ? 'var(--color-emerald-teal)' : 'transparent',
                boxShadow: isActive ? 'var(--shadow-emerald)' : 'none',
                transition: 'var(--transition-fast)',
                textAlign: 'left',
                width: '100%',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-cool-gray)';
                }
              }}
            >
              <Icon size={19} color={isActive ? '#FFFFFF' : 'var(--color-cool-gray)'} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Section with Prominent Sign Out Button */}
      <div style={{
        padding: isCollapsed ? '14px 8px' : '14px 14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Prominent Sign Out Button at Bottom of Navigation Bar */}
        <button
          onClick={logout}
          title="Sign out of system"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '12px',
            width: '100%',
            padding: isCollapsed ? '10px' : '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#F87171',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EF4444';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#F87171';
          }}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
