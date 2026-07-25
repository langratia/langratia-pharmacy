import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  width?: string;
  showShortcut?: boolean;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onFocus,
  onBlur,
  width = '320px',
  showShortcut = true,
  autoFocus = false
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: width,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--color-bg-input)',
        border: `1px solid ${isFocused ? 'var(--color-accent-base)' : 'var(--color-border-strong)'}`,
        borderRadius: '2px',
        padding: '0 10px',
        height: '32px',
        boxShadow: isFocused ? '0 0 0 2px var(--color-accent-subtle)' : 'none',
        transition: 'all 150ms ease-out'
      }}
    >
      <Search size={14} style={{ color: isFocused ? 'var(--color-accent-base)' : 'var(--color-text-muted)', marginRight: '6px', flexShrink: 0 }} />
      <input
        type="text"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: '12px',
          width: '100%',
          color: 'var(--color-text-primary)',
          height: '100%'
        }}
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={13} />
        </button>
      ) : showShortcut ? (
        <kbd
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-bg-hover)',
            border: '1px solid var(--color-border-default)',
            borderRadius: '2px',
            padding: '1px 4px',
            userSelect: 'none',
            lineHeight: '1',
            flexShrink: 0
          }}
        >
          ⌘K
        </kbd>
      ) : null}
    </div>
  );
};
