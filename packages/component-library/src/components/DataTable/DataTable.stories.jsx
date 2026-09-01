import React, { useState, useMemo } from 'react';
import { DataTable } from './DataTable';

export default {
  title: 'Components/DataTable',
  component: DataTable,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Generic sortable, filterable, paginated table. Columns are fully configurable via props. ' +
          'Row colouring and cell rendering are delegated to callbacks. Matches the audit-table pattern from AuditDashboard.',
      },
    },
  },
};

const SAMPLE_RECORDS = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  item_number: `NCR-DIV-${String(i + 1).padStart(4, '0')}`,
  position_title: ['Teacher I', 'Teacher II', 'Teacher III', 'Head Teacher I', 'School Principal I'][i % 5],
  position_category: ['Teaching', 'Non-Teaching', 'Teaching-Related'][i % 3],
  item_status: i % 4 === 0 ? 'FILLED' : 'UNFILLED',
  sg: 11 + (i % 10),
  year_created: 2010 + (i % 14),
  years_unfilled: i % 8,
  vacancy_aging_status: ['Long-Term Unfilled', 'Extended Unfilled', 'Aging', 'New', 'Newly Created'][i % 5],
}));

const COLUMNS = [
  { key: 'item_number',       label: 'Item Number',    sticky: 1, sortable: true },
  { key: 'position_title',    label: 'Position Title', sticky: 2, sortable: true },
  { key: 'position_category', label: 'Category',       sortable: true },
  { key: 'item_status',       label: 'Item Status',    align: 'center', sortable: true },
  { key: 'sg',                label: 'Salary Grade',   align: 'center', sortable: true },
  { key: 'year_created',      label: 'Year Created',   align: 'center', sortable: true },
  { key: 'years_unfilled',    label: 'Years Unfilled', align: 'center', sortable: true },
  {
    key: 'vacancy_aging_status',
    label: 'Aging Status',
    align: 'center',
    sortable: true,
    render: (value) => {
      const s = (value || '').toLowerCase();
      let cls = 'iu-badge iu-badge-aging';
      if (s.includes('long-term')) cls = 'iu-badge iu-badge-long-term';
      else if (s.includes('extended')) cls = 'iu-badge iu-badge-extended';
      else if (s.includes('newly created')) cls = 'iu-badge iu-badge-newly-created';
      else if (s.includes('new')) cls = 'iu-badge iu-badge-new';
      return <span className={cls}>{value}</span>;
    },
  },
];

export const Default = () => {
  const [sortKey, setSortKey] = useState('item_number');
  const [sortDir, setSortDir] = useState('asc');
  const [columnFilters, setColumnFilters] = useState({});
  const [page, setPage] = useState(1);

  const handleSort = (key) => {
    setSortKey(prev => {
      setSortDir(prev === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc');
      return key;
    });
  };

  const filtered = useMemo(() => {
    return SAMPLE_RECORDS.filter(row =>
      Object.entries(columnFilters).every(([k, v]) =>
        !v || String(row[k] ?? '').toLowerCase().includes(v.toLowerCase())
      )
    );
  }, [columnFilters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = String(a[sortKey] ?? '');
      const vb = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <div style={{ padding: '16px' }}>
      <DataTable
        columns={COLUMNS}
        data={sorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters(prev => ({ ...prev, [k]: v }))}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        emptyText="No matching personnel audit records found."
      />
    </div>
  );
};

export const NoFilters = () => (
  <div style={{ padding: '16px' }}>
    <DataTable
      columns={COLUMNS}
      data={SAMPLE_RECORDS.slice(0, 8)}
      emptyText="No data."
    />
  </div>
);

export const Empty = () => (
  <div style={{ padding: '16px' }}>
    <DataTable columns={COLUMNS} data={[]} emptyText="No matching personnel audit records found." />
  </div>
);
