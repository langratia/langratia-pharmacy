import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export interface DateFilterBarProps {
  value: string; // 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'YYYY-MM-DD'
  onChange: (newPeriod: string) => void;
  periodLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_year', label: 'This Year' },
];

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  value,
  onChange,
  periodLabel,
  className,
  style,
}) => {
  // Determine if current value is a specific date YYYY-MM-DD
  const isCustomDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isPreset = PRESETS.some((p) => p.key === value);

  // Today string in local timezone YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [dateInputVal, setDateInputVal] = useState<string>(
    isCustomDate ? value : getTodayStr()
  );

  useEffect(() => {
    if (isCustomDate) {
      setDateInputVal(value);
    }
  }, [value, isCustomDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.value;
    setDateInputVal(chosen);
    if (chosen) {
      onChange(chosen);
    }
  };

  const handleStepDay = (direction: -1 | 1) => {
    let currentD = new Date();
    if (isCustomDate) {
      currentD = new Date(value + 'T00:00:00');
    } else if (value === 'yesterday') {
      currentD.setDate(currentD.getDate() - 1);
    }

    currentD.setDate(currentD.getDate() + direction);
    const yyyy = currentD.getFullYear();
    const mm = String(currentD.getMonth() + 1).padStart(2, '0');
    const dd = String(currentD.getDate()).padStart(2, '0');
    const newDateStr = `${yyyy}-${mm}-${dd}`;

    setDateInputVal(newDateStr);
    onChange(newDateStr);
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '6px 10px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow)',
        ...style,
      }}
    >
      {/* ── Left: Preset Buttons Group ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
        {PRESETS.map((preset) => {
          const isActive = value === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onChange(preset.key)}
              style={{
                height: '30px',
                minHeight: 'unset',
                minWidth: 'unset',
                padding: '0 12px',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 600,
                borderRadius: '6px',
                border: isActive ? '1px solid var(--brand-primary, #174B37)' : '1px solid var(--line)',
                background: isActive ? 'var(--brand-primary, #174B37)' : 'var(--surface-soft)',
                color: isActive ? '#ffffff' : 'var(--ink)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* ── Right: Custom Date Picker & Step Navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Step backward 1 day */}
        <button
          type="button"
          onClick={() => handleStepDay(-1)}
          title="Previous day"
          aria-label="Previous day"
          style={{
            width: '32px',
            height: '30px',
            minHeight: 'unset',
            minWidth: 'unset',
            padding: 0,
            borderRadius: '6px',
            border: '1px solid var(--line)',
            background: 'var(--surface-soft)',
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>

        {/* Date input container */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            height: '30px',
            borderRadius: '6px',
            border: isCustomDate
              ? '1px solid var(--brand-primary, #174B37)'
              : '1px solid var(--line)',
            background: isCustomDate ? 'rgba(23, 75, 55, 0.08)' : 'var(--surface-soft)',
            padding: '0 8px',
            gap: '6px',
          }}
        >
          <Calendar
            size={14}
            style={{
              color: isCustomDate ? 'var(--brand-primary, #174B37)' : 'var(--muted)',
              flexShrink: 0,
            }}
          />
          <input
            type="date"
            value={dateInputVal}
            onChange={handleDateChange}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--ink)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Step forward 1 day */}
        <button
          type="button"
          onClick={() => handleStepDay(1)}
          title="Next day"
          aria-label="Next day"
          style={{
            width: '32px',
            height: '30px',
            minHeight: 'unset',
            minWidth: 'unset',
            padding: 0,
            borderRadius: '6px',
            border: '1px solid var(--line)',
            background: 'var(--surface-soft)',
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>

        {/* Reset to Today button if custom date is active */}
        {!isPreset && (
          <button
            type="button"
            onClick={() => onChange('today')}
            title="Reset to Today"
            style={{
              height: '30px',
              minHeight: 'unset',
              minWidth: 'unset',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--surface-soft)',
              color: 'var(--ink)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <RotateCcw size={12} /> Today
          </button>
        )}

        {/* Formatted Period Active Badge */}
        {periodLabel && (
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '12px',
              background: 'var(--surface-soft)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
            }}
          >
            {periodLabel}
          </div>
        )}
      </div>
    </div>
  );
};
