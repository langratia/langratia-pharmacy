import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  User as UserIcon, 
  AlertTriangle, 
  Clock, 
  Pill, 
  FileText, 
  ShoppingCart, 
  Users, 
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from './Sidebar';
import { getUserAvatarUrl } from '../../utils/avatar';
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
  const [todaySales, setTodaySales] = useState<number>(0);
  
  // Notification State
  const [notifications, setNotifications] = useState<models.NotificationSummary | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<models.SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const updateAvatar = () => {
    setAvatarUrl(getUserAvatarUrl(user));
  };

  useEffect(() => {
    updateAvatar();
    window.addEventListener('avatar-changed', updateAvatar);
    return () => window.removeEventListener('avatar-changed', updateAvatar);
  }, [user]);

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
    const interval = setInterval(fetchHeaderData, 15000); // refresh every 15s

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  // Handle Search Input Change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await GlobalSearch(searchQuery.trim(), user?.role || 'cashier');
        setSearchResults(results || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleSearchResultClick = (item: models.SearchResultItem) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    
    // Privilege check
    if ((item.target_view === 'suppliers' || item.target_view === 'reports') && user?.role !== 'admin') {
      alert('Access Restricted: You need Administrator privileges to view this section.');
      return;
    }

    onSelectView(item.target_view as NavItemKey);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Medicine':
        return <Pill size={16} className="text-emerald-500" />;
      case 'Prescription':
        return <FileText size={16} className="text-purple-500" />;
      case 'Sale Invoice':
        return <ShoppingCart size={16} className="text-blue-500" />;
      case 'Supplier':
        return <Users size={16} className="text-amber-500" />;
      default:
        return <Search size={16} />;
    }
  };

  return (
    <header style={{
      height: '56px',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid var(--color-slate-200)',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 24px',
      position: 'sticky',
      top: '32px',
      zIndex: 90,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Left Section / Quick View Label */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-slate-700)', letterSpacing: '0.3px' }}>
          Langratia Pharmacy
        </span>
      </div>

      {/* Center Global Search Bar */}
      <div ref={searchRef} style={{ position: 'relative', width: '420px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#F3F4F6',
          borderRadius: 'var(--radius-md)',
          padding: '7px 14px',
          border: '1px solid #E5E7EB',
          transition: 'all 0.2s'
        }}>
          <Search size={17} style={{ color: '#9CA3AF', marginRight: '10px' }} />
          <input
            type="text"
            placeholder="Search medicines, prescriptions, invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
            style={{
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '13px',
              width: '100%',
              color: 'var(--color-slate-800)'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchDropdown && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--color-slate-200)',
            maxHeight: '360px',
            overflowY: 'auto',
            zIndex: 100
          }}>
            {isSearching ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                Searching database...
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                No results found for "{searchQuery}"
              </div>
            ) : (
              <div style={{ padding: '6px 0' }}>
                {searchResults.map((item) => (
                  <div
                    key={`${item.category}_${item.id}`}
                    onClick={() => handleSearchResultClick(item)}
                    style={{
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        padding: '6px',
                        borderRadius: '8px',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-slate-800)' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls Area */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '18px' }}>
        
        {/* Notifications Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-slate-700)',
              padding: '6px',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Bell size={19} />
            {notifications && notifications.total_count > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '18px',
                height: '18px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #FFFFFF'
              }}>
                {notifications.total_count > 99 ? '99+' : notifications.total_count}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              right: 0,
              width: '340px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--color-slate-200)',
              zIndex: 100,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FAFAFA'
              }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-slate-800)' }}>
                  Notifications & Alerts
                </h4>
                {notifications && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: 'var(--color-emerald-light)',
                    color: 'var(--color-emerald-dark)',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {notifications.total_count} New
                  </span>
                )}
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {!notifications || notifications.items.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                    No pending alerts or stock warnings.
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
                        borderBottom: '1px solid #F3F4F6',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '12px',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ marginTop: '2px' }}>
                        {item.severity === 'danger' ? (
                          <AlertTriangle size={18} className="text-red-500" style={{ color: '#EF4444' }} />
                        ) : (
                          <Clock size={18} className="text-amber-500" style={{ color: '#F59E0B' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-slate-800)' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', lineHeight: '1.4' }}>
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

        {/* User Profile Pill with Avatar Image */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--color-emerald-teal)',
            backgroundColor: '#0F172A',
            flexShrink: 0
          }}>
            <img 
              src={avatarUrl || getUserAvatarUrl(user)} 
              alt={user?.username || 'User'} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-slate-800)', lineHeight: '1.2' }}>
              {user?.full_name || user?.username}
            </span>
            <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'capitalize' }}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '22px', backgroundColor: '#E5E7EB' }} />

        {/* Today's Sales Total Badge (Matching user screenshot UGX 0.00) */}
        <div style={{
          backgroundColor: '#047857', // Rich Emerald Teal
          color: '#FFFFFF',
          padding: '6px 14px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 700,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 6px rgba(4, 120, 87, 0.2)',
          letterSpacing: '0.3px'
        }}>
          <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: 600 }}>UGX</span>
          <span>{todaySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

      </div>
    </header>
  );
};
