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
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NavItemKey } from './Sidebar';
import { getUserAvatarUrl, saveCustomAvatar } from '../../utils/avatar';
import { SearchBar } from '../ui/SearchBar';
import { DesktopButton } from '../ui/DesktopButton';
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
        return <Pill size={13} style={{ color: '#0F8A6A' }} />;
      case 'Prescription':
        return <FileText size={13} style={{ color: '#8B5CF6' }} />;
      case 'Sale Invoice':
        return <ShoppingCart size={13} style={{ color: '#3B82F6' }} />;
      case 'Supplier':
        return <Users size={13} style={{ color: '#F59E0B' }} />;
      default:
        return <Pill size={13} />;
    }
  };

  return (
    <>
      <header
      style={{
        height: '64px',
        maxHeight: '64px',
        flexShrink: 0,
        backgroundColor: 'var(--color-header-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'relative',
        zIndex: 90,
        boxShadow: 'var(--shadow-glass)'
      }}
    >
      {/* Left Quick Desktop Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onSelectView('pos')}
          className="desktop-btn-primary"
          style={{ height: '36px', fontSize: '13px', gap: '8px', padding: '0 16px', borderRadius: '18px' }}
        >
          <Plus size={12} />
          <span>New Sale (F1)</span>
        </button>

        <button
          onClick={() => setShowSearchModal(true)}
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '50%',
            backgroundColor: 'var(--color-panel-bg)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)'
          }}
          title="Global Search (Ctrl+K)"
        >
          <Search size={16} />
        </button>
      </div>

      {/* Center Empty Space */}
      <div style={{ flex: 1 }}></div>


      {/* Right Toolbar Controls & User Profile Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Teal Workstation' : 'Switch to Dark Workstation Mode'}
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '18px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-panel-bg)',
            color: 'var(--color-text-primary)'
          }}
        >
          {theme === 'dark' ? <Sun size={14} style={{ color: '#F59E0B' }} /> : <Moon size={14} style={{ color: '#6366F1' }} />}
        </button>

        {/* Today's Sales Counter */}
        <div
          style={{
            backgroundColor: 'var(--color-accent-light)',
            color: 'var(--color-accent-hover)',
            border: '1px solid var(--color-accent)',
            padding: '0 12px',
            borderRadius: '18px',
            fontWeight: 600,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '36px'
          }}
        >
          <span style={{ color: '#059669', fontSize: '10px' }}>UGX</span>
          <span>{todaySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              borderRadius: '18px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-panel-bg)',
              color: 'var(--color-text-primary)',
              position: 'relative'
            }}
          >
            <Bell size={14} />
            {notifications && notifications.total_count > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#EF4444',
                  borderRadius: '50%'
                }}
              />
            )}
          </button>

          {/* Notifications Glass Dropdown */}
          {showNotifications && (
            <div
              className="glass-modal"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                width: '300px',
                borderRadius: '2px',
                zIndex: 100
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--color-accent-light)'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
                  System Alerts
                </span>
                {notifications && (
                  <span style={{ fontSize: '12px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '4px' }}>
                    {notifications.total_count} New
                  </span>
                )}
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {!notifications || notifications.items.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
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
                        padding: '12px 16px',
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ marginTop: '2px' }}>
                        {item.severity === 'danger' ? (
                          <AlertTriangle size={16} style={{ color: '#EF4444' }} />
                        ) : (
                          <Clock size={16} style={{ color: '#F59E0B' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
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
            gap: '8px',
            padding: '0 12px 0 6px',
            border: '1px solid var(--color-border)',
            borderRadius: '18px',
            backgroundColor: 'var(--color-panel-bg)',
            cursor: 'pointer',
            height: '36px'
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#0F172A',
              flexShrink: 0
            }}
          >
            <img 
              src={avatarUrl || getUserAvatarUrl(user)} 
              alt={user?.username || 'User'} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A' }}>
            {user?.username || 'Pharmacist'}
          </span>
          <span style={{ fontSize: '9px', padding: '1px 4px', backgroundColor: '#E2E8F0', borderRadius: '2px', textTransform: 'uppercase', fontWeight: 700, color: '#334155' }}>
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
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '12vh',
            zIndex: 9999
          }}
          onClick={() => setShowSearchModal(false)}
        >
          <div
            ref={searchRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '600px',
              maxWidth: '90vw',
              backgroundColor: 'var(--color-panel-solid)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search anything (Ctrl+K)..."
                width="100%"
                autoFocus={true}
              />
            </div>

            {searchQuery.trim() && (
              <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px 0' }}>
                {isSearching ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    Searching database...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <div
                      key={`${item.category}_${item.id}`}
                      onClick={() => handleSearchResultClick(item)}
                      style={{
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--color-border-subtle)'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-light)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          style={{
                            padding: '10px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--color-desktop-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  ))
                )}
              </div>
            )}
            
            {/* Modal Footer helper */}
            <div style={{ padding: '12px 24px', backgroundColor: 'var(--color-desktop-bg)', borderTop: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Search Medicines, Invoices, Suppliers...</span>
              <span><kbd style={{ padding: '2px 6px', backgroundColor: 'var(--color-panel-solid)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>ESC</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
