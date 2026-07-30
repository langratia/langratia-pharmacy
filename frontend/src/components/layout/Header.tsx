import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  Pill,
  FileText,
  ShoppingCart,
  Users,
  ChevronRight,
  Sun,
  Moon,
  Search,
  Server,
  Monitor,
  LogOut,
  Settings,
  Camera,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NavItemKey } from './Sidebar';
import { getUserAvatarUrl, saveCustomAvatar } from '../../utils/avatar';
import { SearchBar } from '../ui/SearchBar';
import { formatCurrency } from '../../utils/formatters';
import {
  GetUserTodaySalesTotal,
  GetNotificationsSummary,
  GlobalSearch,
  GetNetworkStatus,
} from '../../../wailsjs/go/main/App';
import { models, main } from '../../../wailsjs/go/models';

// Page title/subtitle map per view
const PAGE_META: Record<NavItemKey, { title: string; subtitle: string }> = {
  dashboard:     { title: 'Dashboard',     subtitle: 'Overview of pharmacy operations' },
  pos:           { title: 'Point of Sale', subtitle: 'Process transactions and sales' },
  prescriptions: { title: 'Prescriptions', subtitle: 'Manage and dispense prescriptions' },
  inventory:     { title: 'Medicines',     subtitle: 'Track stock and manage medicines' },
  purchases:     { title: 'Purchases',     subtitle: 'Manage purchase orders and suppliers' },
  suppliers:     { title: 'Suppliers',     subtitle: 'Manage your supplier directory' },
  reports:       { title: 'Reports',       subtitle: 'Analytics and financial reports' },
  settings:      { title: 'Settings',      subtitle: 'Configure your pharmacy system' },
};

interface HeaderProps {
  onSelectView: (view: NavItemKey) => void;
  activeView: NavItemKey;
}

export const Header: React.FC<HeaderProps> = ({ onSelectView, activeView }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [todaySales, setTodaySales] = useState<number>(0);

  const [notifications, setNotifications] = useState<models.NotificationSummary | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<models.SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  const [networkStatus, setNetworkStatus] = useState<main.NetworkStatus | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
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

  const fetchHeaderData = async () => {
    if (!user) return;
    try {
      const sales = await GetUserTodaySalesTotal(user.id);
      setTodaySales(sales || 0);
      const notifs = await GetNotificationsSummary();
      setNotifications(notifs);
      try {
        const netStatus = await GetNetworkStatus();
        setNetworkStatus(netStatus);
      } catch {}
    } catch (err) {
      console.error('Failed to load header metrics:', err);
    }
  };

  useEffect(() => {
    fetchHeaderData();
    const interval = setInterval(fetchHeaderData, 15000);

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if (e.key === 'Escape') {
        setShowSearchModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await GlobalSearch(searchQuery.trim(), user?.role || 'cashier');
        setSearchResults(results || []);
      } catch {}
      finally { setIsSearching(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleSearchResultClick = (item: models.SearchResultItem) => {
    setShowSearchModal(false);
    setSearchQuery('');
    if ((item.target_view === 'suppliers' || item.target_view === 'reports') && user?.role !== 'admin') {
      alert('Access Restricted: You need Administrator privileges to view this section.');
      return;
    }
    onSelectView(item.target_view as NavItemKey);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Medicine':     return <Pill size={14} style={{ color: 'var(--blue)' }} />;
      case 'Prescription': return <FileText size={14} style={{ color: 'var(--cyan)' }} />;
      case 'Sale Invoice': return <ShoppingCart size={14} style={{ color: 'var(--blue)' }} />;
      case 'Supplier':     return <Users size={14} style={{ color: 'var(--yellow)' }} />;
      default:             return <Pill size={14} />;
    }
  };

  const pageMeta = PAGE_META[activeView] ?? { title: 'Dashboard', subtitle: '' };
  const hasNotifications = notifications && notifications.total_count > 0;

  return (
    <>
      {/* Hidden avatar file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarFileChange}
      />

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header
        style={{
          height: 'var(--topbar-h)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--line)',
          background: 'var(--topbar-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          flexShrink: 0,
          zIndex: 10,
          /* Wails drag region on the title area */
          // @ts-ignore
          '--wails-draggable': 'drag',
        }}
      >
        {/* Left: Page title */}
        <div style={{ '--wails-draggable': 'drag' } as React.CSSProperties}>
          <h1
            style={{
              fontSize: '19px',
              fontWeight: 700,
              letterSpacing: '-0.2px',
              color: 'var(--ink)',
              lineHeight: 1,
            }}
          >
            {pageMeta.title}
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              marginTop: '3px',
              lineHeight: 1,
            }}
          >
            {pageMeta.subtitle}
          </p>
        </div>

        {/* Right: Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            // prevent drag on interactive controls
            // @ts-ignore
            '--wails-draggable': 'no-drag',
          }}
        >

          {/* Search button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="win-btn"
            title="Global Search (Ctrl+K)"
          >
            <Search size={16} />
          </button>

          {/* Network status */}
          {networkStatus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                background: networkStatus.is_host
                  ? 'rgba(20, 240, 109, 0.08)'
                  : 'rgba(18, 108, 255, 0.08)',
                border: `1px solid ${networkStatus.is_host ? 'rgba(20, 240, 109, 0.25)' : 'rgba(18, 108, 255, 0.25)'}`,
                borderRadius: '20px',
                color: networkStatus.is_host ? 'var(--green)' : 'var(--blue)',
                fontSize: '12px',
                fontWeight: 600,
              }}
              title={networkStatus.is_host ? 'Local Database' : `Connected: ${networkStatus.db_path}`}
            >
              {networkStatus.is_host ? <Server size={13} /> : <Monitor size={13} />}
              <span>{networkStatus.is_host ? 'Main Server' : 'Connected'}</span>
            </div>
          )}

          {/* Today's sales */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              background: 'rgba(18, 108, 255, 0.08)',
              border: '1px solid rgba(18, 108, 255, 0.25)',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--blue)',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--muted)' }}>Today</span>
            <span>{formatCurrency(todaySales)}</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="win-btn"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark'
              ? <Sun size={16} style={{ color: 'var(--yellow)' }} />
              : <Moon size={16} style={{ color: 'var(--blue)' }} />
            }
          </button>

          {/* Notifications */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="win-btn"
              title="Notifications"
              style={{ position: 'relative' }}
            >
              <Bell size={16} />
              {hasNotifications && (
                <span
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '7px',
                    height: '7px',
                    background: 'var(--red)',
                    borderRadius: '50%',
                    boxShadow: '0 0 6px var(--red)',
                  }}
                />
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  background: 'var(--surface-soft)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: 'var(--r2)',
                  boxShadow: 'var(--shadow-dropdown)',
                  zIndex: 200,
                  overflow: 'hidden',
                  animation: 'popupEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                    System Alerts
                  </span>
                  {hasNotifications && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(255, 56, 96, 0.12)',
                        color: 'var(--red)',
                        border: '1px solid rgba(255, 56, 96, 0.25)',
                        padding: '2px 8px',
                        borderRadius: '20px',
                      }}
                    >
                      {notifications!.total_count} New
                    </span>
                  )}
                </div>

                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {!notifications || notifications.items.length === 0 ? (
                    <div
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: 'var(--muted)',
                        fontSize: '13px',
                      }}
                    >
                      No alerts pending.
                    </div>
                  ) : (
                    notifications.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setShowNotifications(false);
                          onSelectView(item.target as NavItemKey);
                        }}
                        style={{
                          padding: '12px 18px',
                          borderBottom: '1px solid var(--line)',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '12px',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--overlay-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ marginTop: '2px', flexShrink: 0 }}>
                          {item.severity === 'danger'
                            ? <AlertTriangle size={15} style={{ color: 'var(--red)' }} />
                            : <Clock size={15} style={{ color: 'var(--yellow)' }} />
                          }
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                            {item.message}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar badge & Profile dropdown menu */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title="User Account"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px 6px 6px',
                background: showProfileMenu ? 'var(--overlay-active)' : 'var(--overlay-hover)',
                border: showProfileMenu ? '1px solid var(--blue)' : '1px solid var(--line)',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!showProfileMenu) {
                  e.currentTarget.style.background = 'var(--overlay-active)';
                  e.currentTarget.style.borderColor = 'var(--line-strong)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showProfileMenu) {
                  e.currentTarget.style.background = 'var(--overlay-hover)';
                  e.currentTarget.style.borderColor = 'var(--line)';
                }
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--blue)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {(user?.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
                  {user?.username || 'User'}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted)',
                    textTransform: 'capitalize',
                    lineHeight: 1,
                    marginTop: '2px',
                  }}
                >
                  {user?.role}
                </div>
              </div>
            </div>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '240px',
                  background: 'var(--surface-soft)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: 'var(--r2)',
                  boxShadow: 'var(--shadow-dropdown)',
                  zIndex: 200,
                  padding: '8px',
                  animation: 'popupEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}
              >
                {/* User Info Header */}
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                    {(user?.username?.[0] || 'U').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.full_name || user?.username}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize', marginTop: '2px' }}>
                      {user?.role} {user?.branch ? `· ${user.branch}` : ''}
                    </div>
                  </div>
                </div>

                {/* Change Avatar Photo */}
                <button
                  onClick={() => { setShowProfileMenu(false); fileInputRef.current?.click(); }}
                  style={{
                    width: '100%', padding: '9px 12px', background: 'transparent', border: 'none',
                    borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    fontSize: '13px', color: 'var(--ink)', fontWeight: 600, transition: 'background 0.15s ease',
                    textAlign: 'left', minHeight: 'unset', transform: 'none', boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--overlay-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Camera size={15} style={{ color: 'var(--blue)' }} />
                  <span>Change Profile Photo</span>
                </button>

                {/* Admin Settings Link */}
                {user?.role === 'admin' && (
                  <button
                    onClick={() => { setShowProfileMenu(false); onSelectView('settings'); }}
                    style={{
                      width: '100%', padding: '9px 12px', background: 'transparent', border: 'none',
                      borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                      fontSize: '13px', color: 'var(--ink)', fontWeight: 600, transition: 'background 0.15s ease',
                      textAlign: 'left', minHeight: 'unset', transform: 'none', boxShadow: 'none'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--overlay-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Settings size={15} style={{ color: 'var(--muted)' }} />
                    <span>System Settings</span>
                  </button>
                )}

                {/* Logout Button for all roles */}
                <button
                  onClick={() => { setShowProfileMenu(false); logout(); }}
                  style={{
                    width: '100%', padding: '9px 12px', background: 'transparent', border: 'none',
                    borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    fontSize: '13px', color: 'var(--red)', fontWeight: 600, transition: 'background 0.15s ease',
                    textAlign: 'left', minHeight: 'unset', transform: 'none', boxShadow: 'none', marginTop: '4px',
                    borderTop: '1px solid var(--line)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={15} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Global Search Modal ──────────────────────────────────────────── */}
      {showSearchModal && (
        <div
          className="modal-overlay"
          style={{ alignItems: 'flex-start', paddingTop: '10vh' }}
          onClick={() => setShowSearchModal(false)}
        >
          <div
            ref={searchRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '580px',
              maxWidth: '90vw',
              background: 'var(--surface-soft)',
              borderRadius: 'var(--r2)',
              boxShadow: 'var(--shadow-dropdown)',
              border: '1px solid var(--line-strong)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'popupEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Search input */}
            <div
              style={{
                padding: '16px 18px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Search size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicines, invoices, suppliers…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '15px',
                  color: 'var(--ink)',
                  padding: 0,
                  height: 'auto',
                  minHeight: 'unset',
                }}
              />
            </div>

            {/* Results */}
            {searchQuery.trim() && (
              <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '6px 0' }}>
                {isSearching ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                    Searching…
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                    No results for "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <div
                      key={`${item.category}_${item.id}`}
                      onClick={() => handleSearchResultClick(item)}
                      style={{
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--line)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--overlay-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'var(--surface)',
                            border: '1px solid var(--line)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--muted-dark)' }} />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer hint */}
            <div
              style={{
                padding: '10px 18px',
                background: 'var(--bg)',
                borderTop: '1px solid var(--line)',
                fontSize: '12px',
                color: 'var(--muted-dark)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Search across medicines, invoices, suppliers…</span>
              <span>
                <kbd
                  style={{
                    padding: '2px 6px',
                    background: 'var(--surface-soft)',
                    border: '1px solid var(--line)',
                    borderRadius: '5px',
                    fontSize: '11px',
                  }}
                >
                  ESC
                </kbd>{' '}
                to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
