import React, { useState, useMemo } from 'react';

export function useTableSortAndFilter(initialData = [], fieldExtractors = {}, customComparators = {}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [columnFilters, setColumnFilters] = useState({});

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleColumnFilterChange = (key, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearColumnFilters = () => {
    setColumnFilters({});
  };

  const processedData = useMemo(() => {
    let result = Array.isArray(initialData) ? [...initialData] : [];

    // 1. Per-column live filtering
    Object.keys(columnFilters).forEach(key => {
      const filterVal = columnFilters[key];
      if (filterVal && String(filterVal).trim() !== '') {
        const query = String(filterVal).trim().toLowerCase();
        result = result.filter(row => {
          let cellValue = '';
          if (fieldExtractors[key]) {
            cellValue = fieldExtractors[key](row);
          } else if (row[key] !== undefined && row[key] !== null) {
            cellValue = row[key];
          }
          return String(cellValue || '').toLowerCase().includes(query);
        });
      }
    });

    // 2. Column sorting
    if (sortKey) {
      result.sort((a, b) => {
        if (customComparators && typeof customComparators[sortKey] === 'function') {
          return customComparators[sortKey](a, b, sortDirection, fieldExtractors);
        }

        let valA = fieldExtractors[sortKey] ? fieldExtractors[sortKey](a) : a[sortKey];
        let valB = fieldExtractors[sortKey] ? fieldExtractors[sortKey](b) : b[sortKey];

        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        // Numeric comparison
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && String(valA).trim() !== '' && String(valB).trim() !== '') {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        // Date comparison
        const dateA = Date.parse(valA);
        const dateB = Date.parse(valB);
        if (!isNaN(dateA) && !isNaN(dateB) && typeof valA === 'string' && valA.includes('-')) {
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }

        // String comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [initialData, sortKey, sortDirection, columnFilters, fieldExtractors, customComparators]);

  const renderSortIndicator = (key) => {
    if (sortKey !== key) {
      return <span className="inline-block ml-1 opacity-30 text-[10px]">↕</span>;
    }
    return (
      <span className="inline-block ml-1 text-teal-600 dark:text-teal-400 text-[11px] font-bold">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  return {
    processedData,
    sortKey,
    sortDirection,
    handleSort,
    columnFilters,
    handleColumnFilterChange,
    clearColumnFilters,
    renderSortIndicator
  };
}
