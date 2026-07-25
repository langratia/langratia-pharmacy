import React from 'react';
import { Filter, Grid, List, Search } from 'lucide-react';
import { Panel } from './Panel';

export interface ContextualToolbarProps {
  title?: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  categories?: string[];
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
  categoryMode?: 'chips' | 'dropdown';
  actions?: React.ReactNode;
  statusBadges?: React.ReactNode;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const ContextualToolbar: React.FC<ContextualToolbarProps> = ({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search items...',
  categories,
  selectedCategory = 'All',
  onCategorySelect,
  categoryMode = 'dropdown',
  actions,
  statusBadges,
  viewMode,
  onViewModeChange,
  children,
  className = '',
  style
}) => {
  return (
    <Panel noPadding className={className} style={{ padding: '8px 16px', minHeight: '44px', borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-panel)', justifyContent: 'center', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', width: '100%' }}>
        {/* Left: Title / Subtitle & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {title && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {subtitle}
                </div>
              )}
            </div>
          )}

          {onSearchChange !== undefined && (
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  height: '30px',
                  padding: '0 10px 0 32px',
                  fontSize: '12px',
                  borderRadius: '0px',
                  border: '1px solid var(--color-border-strong)',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Category Selector */}
          {categories && categories.length > 0 && onCategorySelect && (
            categoryMode === 'chips' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => onCategorySelect(cat)}
                      style={{
                        height: '26px',
                        padding: '0 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '0px',
                        border: `1px solid ${active ? 'var(--color-accent-base)' : 'var(--color-border-default)'}`,
                        backgroundColor: active ? 'var(--color-accent-subtle)' : 'var(--color-bg-base)',
                        color: active ? 'var(--color-accent-base)' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-bg-base)', padding: '2px 8px', border: '1px solid var(--color-border-default)', borderRadius: '0px' }}>
                <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
                <select
                  value={selectedCategory}
                  onChange={(e) => onCategorySelect(e.target.value)}
                  style={{
                    height: '26px',
                    fontSize: '12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>

        {/* Right: Actions, Badges & View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {statusBadges}
          {actions}
          {children}

          {onViewModeChange && viewMode && (
            <div style={{ display: 'flex', border: '1px solid var(--color-border-default)' }}>
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                title="Grid View"
                style={{
                  height: '28px',
                  width: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  backgroundColor: viewMode === 'grid' ? 'var(--color-accent-subtle)' : 'var(--color-bg-panel)',
                  color: viewMode === 'grid' ? 'var(--color-accent-base)' : 'var(--color-text-muted)',
                  cursor: 'pointer'
                }}
              >
                <Grid size={14} />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                title="Dense List View"
                style={{
                  height: '28px',
                  width: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderLeft: '1px solid var(--color-border-default)',
                  backgroundColor: viewMode === 'list' ? 'var(--color-accent-subtle)' : 'var(--color-bg-panel)',
                  color: viewMode === 'list' ? 'var(--color-accent-base)' : 'var(--color-text-muted)',
                  cursor: 'pointer'
                }}
              >
                <List size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
};
