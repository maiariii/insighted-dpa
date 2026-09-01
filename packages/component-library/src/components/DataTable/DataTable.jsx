import React from 'react';
import styles from './DataTable.module.css';

/**
 * DataTable
 *
 * Generic sortable, filterable, paginated data table — structural shell
 * extracted from the AuditDashboard. Rendering logic for each cell is
 * delegated to the `columns[].render` callback, keeping this component
 * domain-agnostic.
 *
 * @param {Object}   props
 *
 * @param {Array}    props.columns
 *   Column definitions:
 *     { key: string, label: string, sticky?: 1|2, align?: 'left'|'center'|'right',
 *       minWidth?: number, render?: (value, row) => ReactNode, sortable?: boolean }
 *
 * @param {Array}    props.data           - Full dataset (already filtered by external state)
 *
 * @param {string}   [props.sortKey]      - Currently sorted column key
 * @param {string}   [props.sortDir]      - 'asc' | 'desc'
 * @param {Function} [props.onSort]       - (key: string) => void
 *
 * @param {Object}   [props.columnFilters]          - { [key]: string }
 * @param {Function} [props.onColumnFilterChange]   - (key: string, value: string) => void
 *
 * @param {number}   [props.page]         - Current page index (1-based)
 * @param {number}   [props.pageSize]     - Rows per page (default 100)
 * @param {Function} [props.onPageChange] - (page: number) => void
 *
 * @param {Function} [props.getRowClassName] - (row) => string; for status-based row colouring
 * @param {string}   [props.emptyText]    - Message shown when no rows match
 */
export const DataTable = ({
  columns = [],
  data = [],
  sortKey,
  sortDir = 'asc',
  onSort,
  columnFilters = {},
  onColumnFilterChange,
  page = 1,
  pageSize = 100,
  onPageChange,
  getRowClassName,
  emptyText = 'No records found.',
}) => {
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const validPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (validPage - 1) * pageSize;
  const pageRows = data.slice(startIdx, startIdx + pageSize);

  const renderSortIndicator = (key) => {
    if (sortKey !== key) return <span className={styles.sortNeutral}>↕</span>;
    return <span className={styles.sortActive}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <thead>
          {/* Sort row */}
          <tr>
            {columns.map((col) => {
              const thClass = [
                col.sticky === 1 ? styles.sticky1 : '',
                col.sticky === 2 ? styles.sticky2 : '',
                col.align === 'center' ? styles.textCenter : '',
                col.align === 'right'  ? styles.textRight  : '',
                col.sortable !== false && onSort ? styles.sortable : '',
              ].filter(Boolean).join(' ');

              return (
                <th
                  key={col.key}
                  className={thClass}
                  style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                  onClick={col.sortable !== false && onSort ? () => onSort(col.key) : undefined}
                >
                  {col.label}
                  {col.sortable !== false && onSort && renderSortIndicator(col.key)}
                </th>
              );
            })}
          </tr>

          {/* Per-column filter row */}
          {onColumnFilterChange && (
            <tr className={styles.filterRow}>
              {columns.map((col) => {
                const thClass = [
                  col.sticky === 1 ? styles.sticky1 : '',
                  col.sticky === 2 ? styles.sticky2 : '',
                  styles.filterCell,
                ].filter(Boolean).join(' ');

                return (
                  <th key={col.key} className={thClass}>
                    <input
                      type="text"
                      placeholder={`Filter ${col.label}`}
                      value={columnFilters[col.key] || ''}
                      onChange={(e) => onColumnFilterChange(col.key, e.target.value)}
                      className={styles.filterInput}
                    />
                  </th>
                );
              })}
            </tr>
          )}
        </thead>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <tbody>
          {pageRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                {emptyText}
              </td>
            </tr>
          ) : (
            pageRows.map((row, rowIdx) => {
              const rowClass = getRowClassName ? getRowClassName(row) : '';
              return (
                <tr key={row.id ?? rowIdx} className={rowClass}>
                  {columns.map((col) => {
                    const rawValue = row[col.key];
                    const cell = col.render ? col.render(rawValue, row) : rawValue ?? '';
                    const tdClass = [
                      col.sticky === 1 ? styles.sticky1 : '',
                      col.sticky === 2 ? styles.sticky2 : '',
                      col.align === 'center' ? styles.textCenter : '',
                      col.align === 'right'  ? styles.textRight  : '',
                    ].filter(Boolean).join(' ');

                    return (
                      <td key={col.key} className={tdClass}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {totalPages > 1 && onPageChange && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={validPage <= 1}
            onClick={() => onPageChange(validPage - 1)}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {validPage} of {totalPages} ({data.length.toLocaleString()} rows)
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={validPage >= totalPages}
            onClick={() => onPageChange(validPage + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default DataTable;
