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
  emptyMessage = 'No records in grid',
  selectedKey = null,
  onRowClick,
  zebraStriping = true,
  compactRows = true,
  maxHeight,
  style
}: DataGridProps<T>) {
  const rowHeight = compactRows ? '28px' : '34px';

  return (
    <div
      style={{
        width: '100%',
        border: '1px solid #CBD5E1',
        borderRadius: '2px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
    >
      <div
        className="datagrid-scroll-container"
        style={{
          maxHeight: maxHeight || 'calc(100vh - 180px)',
          position: 'relative'
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: compactRows ? '12px' : '13px',
            color: '#0F172A'
          }}
        >
          {/* Sticky Workstation Table Header */}
          <thead>
            <tr
              style={{
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #CBD5E1',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: compactRows ? '4px 8px' : '6px 10px',
                    fontWeight: 700,
                    color: '#334155',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    width: col.width || 'auto',
                    textAlign: col.align || 'left',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid #CBD5E1',
                    borderRight: '1px solid #E2E8F0'
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
                  style={{
                    padding: '24px 12px',
                    textAlign: 'center',
                    color: '#64748B',
                    fontSize: '12px'
                  }}
                >
                  Fetching workspace data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '28px 12px',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '12px'
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
                  ? '#E0F2FE'
                  : zebraStriping && !isEven
                  ? '#F8FAFC'
                  : '#FFFFFF';

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`datagrid-row ${isSelected ? 'selected' : ''}`}
                    style={{
                      backgroundColor: bg,
                      height: rowHeight,
                      borderBottom: '1px solid #E2E8F0',
                      cursor: onRowClick ? 'pointer' : 'default'
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: compactRows ? '3px 8px' : '5px 10px',
                          textAlign: col.align || 'left',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                          color: isSelected ? '#0369A1' : '#0F172A',
                          borderRight: '1px solid #F1F5F9',
                          fontWeight: isSelected ? 600 : 400
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
