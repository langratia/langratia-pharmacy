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
  placeholder = 'Search…',
  onFocus,
  onBlur,
  width = '280px',
  showShortcut = true,
  autoFocus = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface-soft)',
        border: `1px solid ${isFocused ? 'var(--blue)' : 'var(--line)'}`,
        borderRadius: '8px',
        padding: '0 12px',
        height: '38px',
        boxShadow: isFocused ? '0 0 0 3px rgba(18, 108, 255, 0.2)' : 'none',
        transition: 'all 0.2s ease',
        gap: '8px',
      }}
    >
      <Search
        size={15}
        style={{ color: isFocused ? 'var(--blue)' : 'var(--muted-dark)', flexShrink: 0 }}
      />
      <input
        type="text"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => { setIsFocused(true); onFocus?.(); }}
        onBlur={() => { setIsFocused(false); onBlur?.(); }}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: '14px',
          width: '100%',
          color: 'var(--ink)',
          height: '100%',
          minHeight: 'unset',
          padding: 0,
          boxShadow: 'none',
        }}
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px',
            minHeight: 'unset',
            height: 'auto',
            transform: 'none',
            boxShadow: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <X size={13} />
        </button>
      ) : showShortcut ? (
        <kbd
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--muted-dark)',
            background: 'var(--overlay-hover)',
            border: '1px solid var(--line)',
            borderRadius: '5px',
            padding: '2px 6px',
            userSelect: 'none',
            lineHeight: '1',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          ⌘K
        </kbd>
      ) : null}
    </div>
  );
};
