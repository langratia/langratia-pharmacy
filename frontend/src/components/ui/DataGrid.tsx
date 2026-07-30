import React from 'react';
import { Loader } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string | React.ReactNode;
  accessor?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  selectedKey?: string | number | null;
  onRowClick?: (row: T) => void;
  zebraStriping?: boolean;
  compactRows?: boolean;
  maxHeight?: string;
  style?: React.CSSProperties;
}

export function DataGrid<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records in grid',
  selectedKey = null,
  onRowClick,
  zebraStriping = true,
  compactRows = true,
  maxHeight,
  style
}: DataGridProps<T>) {
  const rowHeight = compactRows ? '36px' : '44px';

  return (
    <div
      style={{
        width: '100%',
        flex: 1,
        border: '1px solid var(--line)',
        borderRadius: 'var(--r2)',
        background: 'var(--surface)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        ...style
      }}
    >
      <div
        className="datagrid-scroll-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: maxHeight || undefined,
          position: 'relative',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--overlay-active) transparent',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '13px',
            color: 'var(--ink)'
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--surface-soft)',
                borderBottom: '1px solid var(--line)',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '10px 14px',
                    fontWeight: 700,
                    color: 'var(--muted)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    width: col.width || 'auto',
                    textAlign: col.align || 'left',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid var(--line)',
                    borderRight: 'none'
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* DataGrid Body Rows */}
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader size={16} className="animate-spin" style={{ color: 'var(--blue)' }} />
                    <span>Loading…</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = keyExtractor(row);
                const isSelected = selectedKey !== null && selectedKey === key;
                const isEven = index % 2 === 0;

                const bg = isSelected
                  ? 'rgba(18,108,255,0.12)'
                  : zebraStriping && !isEven
                    ? 'var(--surface-soft)'
                    : 'transparent';

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`datagrid-row ${isSelected ? 'selected' : ''}`}
                    style={{
                      backgroundColor: bg,
                      height: rowHeight,
                      borderBottom: '1px solid var(--line)',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 0.12s ease',
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: '8px 14px',
                          textAlign: col.align || 'left',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                          color: isSelected ? 'var(--blue)' : 'var(--ink)',
                          borderRight: 'none',
                          fontWeight: isSelected ? 600 : 400,
                          fontSize: '13px'
                        }}
                      >
                        {col.accessor ? col.accessor(row) : (row as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
