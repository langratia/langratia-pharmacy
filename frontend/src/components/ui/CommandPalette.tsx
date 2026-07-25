import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  ShoppingCart, 
  Pill, 
  Truck, 
  Users, 
  BarChart3, 
  Settings, 
  FileText,
  ChevronRight,
  Command
} from 'lucide-react';
import { NavItemKey } from '../layout/Sidebar';
import { GlobalSearch } from '../../../wailsjs/go/main/App';
import { useAuth } from '../../context/AuthContext';
import { models } from '../../../wailsjs/go/models';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: NavItemKey) => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  category: 'Navigation' | 'Database Result';
  targetView: NavItemKey;
}

const navCommands: CommandItem[] = [
  { id: 'nav-pos', title: 'Point of Sale (POS)', subtitle: 'Open direct checkout workstation', icon: ShoppingCart, category: 'Navigation', targetView: 'pos' },
  { id: 'nav-inventory', title: 'Medicine Inventory', subtitle: 'View master medicine registry & stock', icon: Pill, category: 'Navigation', targetView: 'inventory' },
  { id: 'nav-prescriptions', title: 'Prescriptions', subtitle: 'View doctor orders & dosages', icon: FileText, category: 'Navigation', targetView: 'prescriptions' },
  { id: 'nav-purchases', title: 'Purchases & Receiving', subtitle: 'Record incoming supplier shipments', icon: Truck, category: 'Navigation', targetView: 'purchases' },
  { id: 'nav-suppliers', title: 'Suppliers Directory', subtitle: 'Manage distributors & contacts', icon: Users, category: 'Navigation', targetView: 'suppliers' },
  { id: 'nav-reports', title: 'Reports & Analytics', subtitle: 'Export inventory & sales audits', icon: BarChart3, category: 'Navigation', targetView: 'reports' },
  { id: 'nav-settings', title: 'System Settings', subtitle: 'Manage users, backups & audit logs', icon: Settings, category: 'Navigation', targetView: 'settings' },
  { id: 'nav-dashboard', title: 'Dashboard', subtitle: 'Real-time sales & operational metrics', icon: LayoutDashboard, category: 'Navigation', targetView: 'dashboard' }
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectView
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await GlobalSearch(query.trim(), user?.role || 'cashier');
        const formatted: CommandItem[] = (results || []).map((r: models.SearchResultItem) => ({
          id: `${r.category}_${r.id}`,
          title: r.title,
          subtitle: `${r.category} • ${r.subtitle}`,
          icon: r.category === 'Medicine' ? Pill : r.category === 'Prescription' ? FileText : ShoppingCart,
          category: 'Database Result',
          targetView: r.target_view as NavItemKey
        }));
        setSearchResults(formatted);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Command palette search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, user]);

  const filteredNav = navCommands.filter(cmd => {
    if ((cmd.targetView === 'suppliers' || cmd.targetView === 'reports' || cmd.targetView === 'settings') && user?.role !== 'admin') {
      return false;
    }
    if (!query.trim()) return true;
    return cmd.title.toLowerCase().includes(query.toLowerCase()) || (cmd.subtitle && cmd.subtitle.toLowerCase().includes(query.toLowerCase()));
  });

  const allItems = [...filteredNav, ...searchResults];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev + 1) % allItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev - 1 + allItems.length) % allItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelectItem(allItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelectItem = (item: CommandItem) => {
    onSelectView(item.targetView);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="modal-overlay"
      style={{ alignItems: 'flex-start', paddingTop: '10vh' }}
    >
      <div
        className="animate-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #E5E7EB',
            gap: '10px'
          }}
        >
          <Search size={18} style={{ color: '#0F8A6A' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search database (e.g. POS, Amoxicillin)..."
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              width: '100%',
              color: '#111827',
              backgroundColor: 'transparent'
            }}
          />
          <kbd
            style={{
              fontSize: '11px',
              color: '#6B7280',
              backgroundColor: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              padding: '2px 6px',
              lineHeight: 1
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '6px 0' }}>
          {isSearching ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
              Searching database records...
            </div>
          ) : allItems.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
              No commands or database records found for "{query}"
            </div>
          ) : (
            allItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === index;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? '#ECFDF5' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 100ms'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} style={{ color: isSelected ? '#0F8A6A' : '#6B7280' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#065F46' : '#111827' }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: isSelected ? '#0F8A6A' : '#9CA3AF' }} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
