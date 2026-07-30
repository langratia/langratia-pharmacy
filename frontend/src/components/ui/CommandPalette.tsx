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
  Command,
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
  icon: React.ComponentType<{ size?: number }>;
  category: 'Navigation' | 'Database Result';
  targetView: NavItemKey;
}

const navCommands: CommandItem[] = [
  { id: 'nav-pos',           title: 'Point of Sale (POS)',      subtitle: 'Open direct checkout workstation',        icon: ShoppingCart,    category: 'Navigation', targetView: 'pos' },
  { id: 'nav-inventory',     title: 'Medicine Inventory',       subtitle: 'View master medicine registry & stock',   icon: Pill,            category: 'Navigation', targetView: 'inventory' },
  { id: 'nav-prescriptions', title: 'Prescriptions',            subtitle: 'View doctor orders & dosages',            icon: FileText,        category: 'Navigation', targetView: 'prescriptions' },
  { id: 'nav-purchases',     title: 'Purchases & Receiving',    subtitle: 'Record incoming supplier shipments',      icon: Truck,           category: 'Navigation', targetView: 'purchases' },
  { id: 'nav-suppliers',     title: 'Suppliers Directory',      subtitle: 'Manage distributors & contacts',          icon: Users,           category: 'Navigation', targetView: 'suppliers' },
  { id: 'nav-reports',       title: 'Reports & Analytics',      subtitle: 'Export inventory & sales audits',         icon: BarChart3,       category: 'Navigation', targetView: 'reports' },
  { id: 'nav-settings',      title: 'System Settings',          subtitle: 'Manage users, backups & audit logs',      icon: Settings,        category: 'Navigation', targetView: 'settings' },
  { id: 'nav-dashboard',     title: 'Dashboard',                subtitle: 'Real-time sales & operational metrics',   icon: LayoutDashboard, category: 'Navigation', targetView: 'dashboard' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelectView }) => {
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
          category: 'Database Result' as const,
          targetView: r.target_view as NavItemKey,
        }));
        setSearchResults(formatted);
        setSelectedIndex(0);
      } catch {}
      finally { setIsSearching(false); }
    }, 150);
    return () => clearTimeout(timer);
  }, [query, user]);

  const filteredNav = navCommands.filter((cmd) => {
    if (
      (cmd.targetView === 'suppliers' || cmd.targetView === 'reports' || cmd.targetView === 'settings') &&
      user?.role !== 'admin'
    ) return false;
    if (!query.trim()) return true;
    return (
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(query.toLowerCase()))
    );
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
      if (allItems[selectedIndex]) handleSelectItem(allItems[selectedIndex]);
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
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(3, 5, 8, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 9999,
        padding: '10vh 24px 24px',
      }}
    >
      <div
        className="animate-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'var(--surface-soft)',
          borderRadius: 'var(--r2)',
          border: '1px solid var(--line-strong)',
          boxShadow: 'var(--shadow-dropdown)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 18px',
            borderBottom: '1px solid var(--line)',
            gap: '12px',
          }}
        >
          <Command size={18} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Navigate or search records…"
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              width: '100%',
              color: 'var(--ink)',
              background: 'transparent',
              padding: 0,
              minHeight: 'unset',
              height: 'auto',
              boxShadow: 'none',
            }}
          />
          <kbd
            style={{
              fontSize: '11px',
              color: 'var(--muted-dark)',
              background: 'var(--overlay-hover)',
              border: '1px solid var(--line)',
              borderRadius: '5px',
              padding: '3px 7px',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '6px 0' }}>
          {isSearching ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
              Searching records…
            </div>
          ) : allItems.length === 0 && query.trim() ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
              No results for "{query}"
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
                    padding: '11px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isSelected ? 'rgba(18, 108, 255, 0.1)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--blue)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease, border-color 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(18, 108, 255, 0.15)' : 'var(--surface)',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: isSelected ? 'var(--blue)' : 'var(--muted)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={15} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: isSelected ? 'var(--blue)' : 'var(--ink)',
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={15}
                    style={{ color: isSelected ? 'var(--blue)' : 'var(--muted-dark)', flexShrink: 0 }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 18px',
            background: 'var(--bg)',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
            color: 'var(--muted-dark)',
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  );
};
