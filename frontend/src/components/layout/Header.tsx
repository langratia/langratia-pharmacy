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
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleSearchResultClick = (item: models.SearchResultItem) => {
    setShowSearchDropdown(false);
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
        return <Pill size={15} style={{ color: '#0F8A6A' }} />;
      case 'Prescription':
        return <FileText size={15} style={{ color: '#8B5CF6' }} />;
      case 'Sale Invoice':
        return <ShoppingCart size={15} style={{ color: '#3B82F6' }} />;
      case 'Supplier':
        return <Users size={15} style={{ color: '#F59E0B' }} />;
      default:
        return <Pill size={15} />;
    }
  };

  return (
    <header
      style={{
        height: '48px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'sticky',
        top: '32px',
        zIndex: 90,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
      }}
    >
      {/* Left Quick Navigation Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <DesktopButton
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => onSelectView('pos')}
        >
          New Sale
        </DesktopButton>
      </div>

      {/* Center Search Field */}
      <div ref={searchRef} style={{ position: 'relative' }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search medicines, prescriptions, sales..."
          onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
          width="360px"
        />

        {/* Search Dropdown */}
        {showSearchDropdown && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E5E7EB',
              maxHeight: '340px',
              overflowY: 'auto',
              zIndex: 100
            }}
          >
            {isSearching ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                Searching database...
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                No results found for "{searchQuery}"
              </div>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {searchResults.map((item) => (
                  <div
                    key={`${item.category}_${item.id}`}
                    onClick={() => handleSearchResultClick(item)}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background-color 150ms'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          padding: '5px',
                          borderRadius: '6px',
                          backgroundColor: '#F3F4F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: '#9CA3AF' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        
        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4B5563',
              backgroundColor: 'transparent',
              position: 'relative',
              transition: 'background-color 150ms'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Bell size={17} />
            {notifications && notifications.total_count > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#EF4444',
                  borderRadius: '50%',
                  border: '1.5px solid #FFFFFF'
                }}
              />
            )}
          </button>

          {/* Notifications Panel */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '320px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                border: '1px solid #E5E7EB',
                zIndex: 100,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F9FAFB'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  Alerts & Notifications
                </span>
                {notifications && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    {notifications.total_count} New
                  </span>
                )}
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {!notifications || notifications.items.length === 0 ? (
                  <div style={{ padding: '20px 14px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>
                    No pending alerts.
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
                        padding: '10px 14px',
                        borderBottom: '1px solid #F3F4F6',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '10px',
                        transition: 'background-color 150ms'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
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
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '1px' }}>
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

        {/* User Pill */}
        <div
          onClick={() => fileInputRef.current?.click()}
          title="Click to upload custom avatar"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1.5px solid #0F8A6A',
              backgroundColor: '#111827',
              flexShrink: 0
            }}
          >
            <img 
              src={avatarUrl || getUserAvatarUrl(user)} 
              alt={user?.username || 'User'} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
              {user?.full_name || user?.username}
            </span>
            <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'capitalize' }}>
              {user?.role}
            </span>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Today's Sales Badge */}
        <div
          style={{
            backgroundColor: '#0F8A6A',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span style={{ opacity: 0.8, fontSize: '10px' }}>UGX</span>
          <span>{todaySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

      </div>
    </header>
  );
};
