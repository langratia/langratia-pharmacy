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
        backgroundColor: '#FFFFFF',
        border: `1px solid ${isFocused ? '#0F8A6A' : '#D1D5DB'}`,
        borderRadius: '20px',
        padding: '0 16px',
        height: '40px',
        boxShadow: isFocused ? '0 0 0 2px rgba(15, 138, 106, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
        transition: 'all 150ms ease-out'
      }}
    >
      <Search size={15} style={{ color: isFocused ? '#0F8A6A' : '#9CA3AF', marginRight: '8px', flexShrink: 0 }} />
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
          fontSize: '13px',
          width: '100%',
          color: '#111827'
        }}
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          style={{
            background: 'none',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={14} />
        </button>
      ) : showShortcut ? (
        <kbd
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#6B7280',
            backgroundColor: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            padding: '2px 5px',
            userSelect: 'none',
            lineHeight: '1'
          }}
        >
          ⌘K
        </kbd>
      ) : null}
    </div>
  );
};
