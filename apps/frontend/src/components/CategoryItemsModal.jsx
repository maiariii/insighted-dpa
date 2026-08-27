import React, { useMemo } from 'react';
import { useTableSortAndFilter } from '../hooks/useTableSortAndFilter';

export const CategoryItemsModal = ({ isOpen, onClose, categoryName, records = [] }) => {
  if (!isOpen) return null;

  const categoryRecords = useMemo(() => {
    return records.filter(row => {
      const rowStatus = row.vacancy_aging_status || row['VACANCY AGING STATUS'] || 'Unspecified';
      return rowStatus.toString().toLowerCase() === (categoryName || '').toString().toLowerCase();
    });
  }, [records, categoryName]);

  const extractors = useMemo(() => ({
    item_number: r => r.item_number || r['ITEM NUMBER'] || '',
    position_title: r => r.position_title || r['POSITION TITLE'] || '',
    sg: r => r.sg || r.SG || '',
    years_unfilled: r => r.years_unfilled || r['YEARS UNFILLED'] || '',
    vacancy_aging_status: r => r.vacancy_aging_status || r['VACANCY AGING STATUS'] || ''
  }), []);

  const { processedData, handleSort, columnFilters, handleColumnFilterChange, renderSortIndicator } = useTableSortAndFilter(categoryRecords, extractors);

  const getAgingBadgeClass = (agingStatus) => {
    if (!agingStatus) return 'badge-vacancy-aging';
    const s = agingStatus.toString().toLowerCase();
    if (s.includes('long-term') || s.includes('unfilled')) return 'badge-vacancy-long-term';
    if (s.includes('extended')) return 'badge-vacancy-extended';
    if (s.includes('newly created')) return 'badge-vacancy-newly-created';
    if (s.includes('new')) return 'badge-vacancy-new';
    return 'badge-vacancy-aging';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-6xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{categoryName} Items ({processedData.length})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Underlying personnel records for this vacancy aging category</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-2xl leading-none cursor-pointer">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-300">
            <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('item_number')}>
                  Item Number {renderSortIndicator('item_number')}
                </th>
                <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('position_title')}>
                  Position Title {renderSortIndicator('position_title')}
                </th>
                <th className="px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort('sg')}>
                  SG {renderSortIndicator('sg')}
                </th>
                <th className="px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort('years_unfilled')}>
                  Years Unfilled {renderSortIndicator('years_unfilled')}
                </th>
                <th className="px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort('vacancy_aging_status')}>
                  Aging Status {renderSortIndicator('vacancy_aging_status')}
                </th>
              </tr>
              <tr className="bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                <th className="p-1.5">
                  <input
                    type="text"
                    placeholder="Search Item #"
                    value={columnFilters.item_number || ''}
                    onChange={e => handleColumnFilterChange('item_number', e.target.value)}
                    className="w-full px-2 py-1 text-xs font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1.5">
                  <input
                    type="text"
                    placeholder="Search Title"
                    value={columnFilters.position_title || ''}
                    onChange={e => handleColumnFilterChange('position_title', e.target.value)}
                    className="w-full px-2 py-1 text-xs font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1.5">
                  <input
                    type="text"
                    placeholder="SG"
                    value={columnFilters.sg || ''}
                    onChange={e => handleColumnFilterChange('sg', e.target.value)}
                    className="w-full px-2 py-1 text-xs font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1.5">
                  <input
                    type="text"
                    placeholder="Years"
                    value={columnFilters.years_unfilled || ''}
                    onChange={e => handleColumnFilterChange('years_unfilled', e.target.value)}
                    className="w-full px-2 py-1 text-xs font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1.5">
                  <input
                    type="text"
                    placeholder="Filter Aging"
                    value={columnFilters.vacancy_aging_status || ''}
                    onChange={e => handleColumnFilterChange('vacancy_aging_status', e.target.value)}
                    className="w-full px-2 py-1 text-xs font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">No records found for {categoryName}</td>
                </tr>
              ) : (
                processedData.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{row.item_number || row['ITEM NUMBER'] || 'N/A'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.position_title || row['POSITION TITLE'] || 'N/A'}</td>
                    <td className="px-4 py-3 text-center">{row.sg || row.SG || 'N/A'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">{row.years_unfilled || row['YEARS UNFILLED'] || 'N/A'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge-vacancy-status ${getAgingBadgeClass(row.vacancy_aging_status || row['VACANCY AGING STATUS'])}`}>
                        {row.vacancy_aging_status || row['VACANCY AGING STATUS'] || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-sm transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};
