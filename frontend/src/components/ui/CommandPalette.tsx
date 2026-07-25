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
  ChevronRight
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
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: '0px',
          border: '1px solid var(--color-border-default)',
          boxShadow: 'var(--shadow-dropdown)',
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
            padding: '10px 14px',
            borderBottom: '1px solid var(--color-border-default)',
            gap: '8px'
          }}
        >
          <Search size={16} style={{ color: 'var(--color-accent-base)' }} />
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
              fontSize: '13px',
              width: '100%',
              color: 'var(--color-text-primary)',
              backgroundColor: 'transparent'
            }}
          />
          <kbd
            style={{
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-bg-hover)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0px',
              padding: '2px 5px',
              lineHeight: 1
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '4px 0' }}>
          {isSearching ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              Searching database records...
            </div>
          ) : allItems.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
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
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 100ms'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={15} style={{ color: isSelected ? 'var(--color-accent-base)' : 'var(--color-text-muted)' }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'var(--color-text-accent)' : 'var(--color-text-primary)' }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: isSelected ? 'var(--color-accent-base)' : 'var(--color-text-muted)' }} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
