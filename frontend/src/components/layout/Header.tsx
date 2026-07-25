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
  Plus,
  Sun,
  Moon,
  Search,
  Building2
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
  GlobalSearch
} from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';

interface HeaderProps {
  onSelectView: (view: NavItemKey) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectView }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [todaySales, setTodaySales] = useState<number>(0);

  // Notification State
  const [notifications, setNotifications] = useState<models.NotificationSummary | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<models.SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
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

  // Fetch today's sales & notifications
  const fetchHeaderData = async () => {
    if (!user) return;
    try {
      const sales = await GetUserTodaySalesTotal(user.id);
      setTodaySales(sales || 0);

      const notifs = await GetNotificationsSummary();
      setNotifications(notifs);
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

  // Handle Search Input Change
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
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
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
      case 'Medicine':
        return <Pill size={13} style={{ color: 'var(--color-accent-base)' }} />;
      case 'Prescription':
        return <FileText size={13} style={{ color: 'var(--color-info-text)' }} />;
      case 'Sale Invoice':
        return <ShoppingCart size={13} style={{ color: 'var(--color-accent-base)' }} />;
      case 'Supplier':
        return <Users size={13} style={{ color: 'var(--color-warning-text)' }} />;
      default:
        return <Pill size={13} />;
    }
  };

  return (
    <>
      <header
        style={{
          height: '48px',
          maxHeight: '48px',
          flexShrink: 0,
          backgroundColor: 'var(--color-bg-panel)',
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'relative',
          zIndex: 90,
          boxShadow: 'none'
        }}
      >
        {/* Left Quick Desktop Actions & Branch Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => onSelectView('pos')}
            className="desktop-btn-primary"
            style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 12px', borderRadius: '0px' }}
          >
            <Plus size={12} />
            <span>New Sale (F1)</span>
          </button>

          <button
            onClick={() => setShowSearchModal(true)}
            style={{
              width: '28px',
              height: '28px',
              padding: 0,
              borderRadius: '0px',
              backgroundColor: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)'
            }}
            title="Global Search (Ctrl+K)"
          >
            <Search size={14} />
          </button>

          {/* Branch Badge & Shift Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: '24px',
                padding: '0 8px',
                backgroundColor: 'var(--color-bg-base)',
                border: '1px solid var(--color-border-default)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                borderRadius: '0px'
              }}
              title="Current Pharmacy Branch Location"
            >
              <Building2 size={12} style={{ color: 'var(--color-accent-base)' }} />
              <span>Main Branch</span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: '24px',
                padding: '0 8px',
                backgroundColor: 'var(--color-success-bg, rgba(46, 125, 50, 0.12))',
                border: '1px solid var(--color-success-border, rgba(46, 125, 50, 0.3))',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-success-text, #4caf50)',
                borderRadius: '0px'
              }}
              title="Workstation Shift Status"
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success-text, #4caf50)',
                  boxShadow: '0 0 6px var(--color-success-text, #4caf50)'
                }}
              />
              <span>Shift: Active (Day)</span>
            </div>
          </div>
        </div>

        {/* Center Empty Space */}
        <div style={{ flex: 1 }}></div>

        {/* Right Toolbar Controls & User Profile Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Workstation Mode' : 'Switch to Dark Workstation Mode'}
            style={{
              width: '28px',
              height: '28px',
              padding: 0,
              borderRadius: '0px',
              border: '1px solid var(--color-border-default)',
              backgroundColor: 'var(--color-bg-panel)',
              color: 'var(--color-text-primary)'
            }}
          >
            {theme === 'dark' ? <Sun size={14} style={{ color: 'var(--color-warning-text)' }} /> : <Moon size={14} style={{ color: 'var(--color-accent-base)' }} />}
          </button>

          {/* Today's Sales Counter */}
          <div
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              color: 'var(--color-accent-base)',
              border: '1px solid var(--color-accent-base)',
              padding: '0 10px',
              borderRadius: '0px',
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '28px'
            }}
          >
            <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>UGX</span>
            <span>{formatCurrency(todaySales)}</span>
          </div>

          {/* Notifications */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                borderRadius: '0px',
                border: '1px solid var(--color-border-default)',
                backgroundColor: 'var(--color-bg-panel)',
                color: 'var(--color-text-primary)',
                position: 'relative'
              }}
            >
              <Bell size={14} />
              {notifications && notifications.total_count > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    right: '3px',
                    width: '6px',
                    height: '6px',
                    backgroundColor: 'var(--color-danger-text)',
                    borderRadius: '50%'
                  }}
                />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div
                className="solid-modal"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  width: '300px',
                  borderRadius: '0px',
                  zIndex: 100
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--color-border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--color-bg-base)'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
                    System Alerts
                  </span>
                  {notifications && (
                    <span style={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)', border: '1px solid var(--color-success-border)', padding: '1px 6px', borderRadius: '0px' }}>
                      {notifications.total_count} New
                    </span>
                  )}
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {!notifications || notifications.items.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
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
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--color-border-subtle)',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '10px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div style={{ marginTop: '2px' }}>
                          {item.severity === 'danger' ? (
                            <AlertTriangle size={15} style={{ color: 'var(--color-danger-text)' }} />
                          ) : (
                            <Clock size={15} style={{ color: 'var(--color-warning-text)' }} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
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

          {/* User Profile Desktop Status Item */}
          <div
            onClick={() => fileInputRef.current?.click()}
            title="Click to change avatar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 8px 0 4px',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0px',
              backgroundColor: 'var(--color-bg-panel)',
              cursor: 'pointer',
              height: '28px'
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: 'var(--color-bg-base)',
                flexShrink: 0
              }}
            >
              <img
                src={avatarUrl || getUserAvatarUrl(user)}
                alt={user?.username || 'User'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {user?.username || 'Pharmacist'}
            </span>
            <span style={{ fontSize: '9px', padding: '1px 4px', backgroundColor: 'var(--color-bg-hover)', borderRadius: '0px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {user?.role}
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </header>

      {/* Global Search Modal Overlay */}
      {showSearchModal && (
        <div
          className="modal-overlay"
          style={{
            alignItems: 'flex-start',
            paddingTop: '10vh'
          }}
          onClick={() => setShowSearchModal(false)}
        >
          <div
            ref={searchRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '560px',
              maxWidth: '90vw',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: '0px',
              boxShadow: 'var(--shadow-dropdown)',
              border: '1px solid var(--color-border-default)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '12px', borderBottom: '1px solid var(--color-border-default)' }}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search anything (Ctrl+K)..."
                width="100%"
                autoFocus={true}
              />
            </div>

            {searchQuery.trim() && (
              <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '4px 0' }}>
                {isSearching ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    Searching database...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <div
                      key={`${item.category}_${item.id}`}
                      onClick={() => handleSearchResultClick(item)}
                      style={{
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--color-border-subtle)'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            padding: '6px',
                            borderRadius: '0px',
                            backgroundColor: 'var(--color-bg-base)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Modal Footer helper */}
            <div style={{ padding: '8px 16px', backgroundColor: 'var(--color-bg-base)', borderTop: '1px solid var(--color-border-default)', fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Search Medicines, Invoices, Suppliers...</span>
              <span><kbd style={{ padding: '1px 4px', backgroundColor: 'var(--color-bg-panel)', borderRadius: '0px', border: '1px solid var(--color-border-default)' }}>ESC</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
