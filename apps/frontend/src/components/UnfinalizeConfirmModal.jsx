import React from 'react';
import { AlertTriangle, X, RotateCcw } from 'lucide-react';

export const UnfinalizeConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  record,
  processing = false
}) => {
  if (!isOpen) return null;

  const itemNum = record?.item_number || record?.['ITEM NUMBER'] || 'N/A';
  const posTitle = record?.position_title || record?.['POSITION TITLE'] || 'N/A';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Clear Finalized Audit Data?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">This will move the record back to the Main Panel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/80">
            <span className="font-mono font-extrabold text-xs text-teal-700 dark:text-teal-400 mr-2">{itemNum}</span>
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{posTitle}</span>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl flex items-start gap-3 text-xs text-red-900 dark:text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              This will clear this record's finalized audit data — position status, incumbent/vacancy details,
              dates, and remarks — and reset its audited flag. It will <strong className="font-bold">not</strong> delete
              the underlying record itself. Once cleared, this row will disappear from the Finalized / Audited table
              and reappear in the Personnel Audit Main Panel for re-auditing.
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            This action cannot be undone automatically — the audit fields will need to be re-entered from the Main Panel.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={processing}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
              processing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer hover:shadow-lg'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            {processing ? 'Clearing...' : 'Clear & Move to Main Panel'}
          </button>
        </div>
      </div>
    </div>
  );
};
