import React from 'react';

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
  emptyMessage = 'No items found',
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
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
    >
      <div
        className="datagrid-scroll-container"
        style={{
          maxHeight: maxHeight || 'calc(100vh - 220px)',
          position: 'relative'
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: compactRows ? '13px' : '14px',
            color: '#111827'
          }}
        >
          {/* Sticky Table Header */}
          <thead>
            <tr
              style={{
                backgroundColor: '#F9FAFB',
                borderBottom: '1px solid #E5E7EB',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: compactRows ? '8px 12px' : '10px 14px',
                    fontWeight: 600,
                    color: '#4B5563',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    width: col.width || 'auto',
                    textAlign: col.align || 'left',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid #E5E7EB'
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: '#6B7280',
                    fontSize: '13px'
                  }}
                >
                  Loading data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '36px 16px',
                    textAlign: 'center',
                    color: '#9CA3AF',
                    fontSize: '13px'
                  }}
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
                  ? '#ECFDF5'
                  : zebraStriping && !isEven
                  ? '#F9FAFB'
                  : '#FFFFFF';

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`datagrid-row ${isSelected ? 'selected' : ''}`}
                    style={{
                      backgroundColor: bg,
                      height: rowHeight,
                      borderBottom: '1px solid #F3F4F6',
                      cursor: onRowClick ? 'pointer' : 'default'
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: compactRows ? '6px 12px' : '10px 14px',
                          textAlign: col.align || 'left',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                          color: isSelected ? '#065F46' : '#111827'
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
