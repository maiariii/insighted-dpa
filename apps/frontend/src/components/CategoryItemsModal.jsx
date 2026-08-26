import React from 'react';

export const CategoryItemsModal = ({ isOpen, onClose, categoryName, records = [] }) => {
  if (!isOpen) return null;

  const filtered = records.filter(row => {
    const rowStatus = row.vacancy_aging_status || row['VACANCY AGING STATUS'] || 'Unspecified';
    return rowStatus.toString().toLowerCase() === (categoryName || '').toString().toLowerCase();
  });

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
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{categoryName} Items</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Underlying personnel records for this vacancy aging category</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-300">
            <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Item Number</th>
                <th className="px-4 py-3">Position Title</th>
                <th className="px-4 py-3 text-center">SG</th>
                <th className="px-4 py-3 text-center">Years Unfilled</th>
                <th className="px-4 py-3">Aging Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">No records found for {categoryName}</td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{row.item_number || row['ITEM NUMBER'] || 'N/A'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.position_title || row['POSITION TITLE'] || 'N/A'}</td>
                    <td className="px-4 py-3 text-center">{row.sg || row.SG || 'N/A'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">{row.years_unfilled || row['YEARS UNFILLED'] || 'N/A'}</td>
                    <td className="px-4 py-3">
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
