import React, { useMemo } from 'react';
import { Save, AlertCircle, Check, X, ArrowRight } from 'lucide-react';
import { parseRemarksValue } from './RemarksModal';

const FIELD_LABELS = {
  position_status: 'Position Status',
  name_of_incumbent: 'Name of Incumbent',
  first_day_of_service: 'First Day of Service',
  date_of_vacancy: 'Date of Vacancy',
  reason_for_vacancy: 'Reason for Vacancy',
  status_of_vacancy: 'Status of Vacancy',
  tentative_date_to_fill_up: 'Tentative Date of First Day of Service',
  other_remarks: 'Other Remarks',
  is_audited: 'Audited Status'
};

const FIELD_ALIASES = {
  position_status: 'POSITION STATUS',
  name_of_incumbent: 'NAME OF INCUMBENT',
  first_day_of_service: 'FIRST DAY OF SERVICE',
  date_of_vacancy: 'DATE OF VACANCY',
  reason_for_vacancy: 'REASON FOR VACANCY',
  status_of_vacancy: 'STATUS OF VACANCY',
  tentative_date_to_fill_up: 'TENTATIVE DATE TO FILL-UP',
  other_remarks: 'OTHER REMARKS'
};

const formatDisplayValue = (field, rawVal) => {
  if (rawVal === null || rawVal === undefined || rawVal === '') {
    return '(Empty)';
  }
  if (field === 'other_remarks') {
    const parsed = parseRemarksValue(rawVal);
    return parsed.text ? parsed.text : '(Empty)';
  }
  if (typeof rawVal === 'boolean') {
    return rawVal ? 'Yes' : 'No';
  }
  return String(rawVal);
};

export const SaveFinalizedEditsModal = ({
  isOpen,
  onClose,
  onConfirm,
  stagedEdits = {},
  records = [],
  saving = false
}) => {
  const diffItems = useMemo(() => {
    if (!isOpen) return [];

    const entries = Object.entries(stagedEdits);
    return entries.map(([id, fields]) => {
      const rec = records.find(r => String(r.id || r['ITEM NUMBER'] || r.item_number || '') === String(id)) || {};
      const itemNum = rec.item_number || rec['ITEM NUMBER'] || 'N/A';
      const posTitle = rec.position_title || rec['POSITION TITLE'] || 'N/A';

      const diffs = Object.entries(fields)
        .map(([fieldKey, newVal]) => {
          const aliasKey = FIELD_ALIASES[fieldKey];
          let oldVal = rec[fieldKey];
          if (oldVal === undefined && aliasKey) {
            oldVal = rec[aliasKey];
          }

          const label = FIELD_LABELS[fieldKey] || fieldKey.replace(/_/g, ' ').toUpperCase();
          const oldFormatted = formatDisplayValue(fieldKey, oldVal);
          const newFormatted = formatDisplayValue(fieldKey, newVal);

          return {
            fieldKey,
            label,
            oldFormatted,
            newFormatted
          };
        })
        .filter(diff => diff.oldFormatted !== diff.newFormatted);

      if (diffs.length === 0 && Object.keys(fields).length > 0) {
        Object.entries(fields).forEach(([fieldKey, newVal]) => {
          const aliasKey = FIELD_ALIASES[fieldKey];
          let oldVal = rec[fieldKey];
          if (oldVal === undefined && aliasKey) oldVal = rec[aliasKey];
          diffs.push({
            fieldKey,
            label: FIELD_LABELS[fieldKey] || fieldKey.replace(/_/g, ' ').toUpperCase(),
            oldFormatted: formatDisplayValue(fieldKey, oldVal),
            newFormatted: formatDisplayValue(fieldKey, newVal)
          });
        });
      }

      return {
        id,
        itemNum,
        posTitle,
        diffs
      };
    }).filter(item => item.diffs.length > 0);
  }, [isOpen, stagedEdits, records]);

  if (!isOpen) return null;

  const recordCount = diffItems.length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Confirm Finalized Audit Edits</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review modifications before saving to database</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-xl flex items-start gap-3 text-xs text-teal-900 dark:text-teal-200">
            <AlertCircle className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-sm mb-1">
                You are about to save changes for {recordCount} record{recordCount === 1 ? '' : 's'}.
              </strong>
              Please confirm that the updated fields below are accurate before committing.
            </div>
          </div>

          <div className="space-y-3">
            {diffItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No modified fields detected.
              </div>
            ) : (
              diffItems.map(item => (
                <div key={item.id} className="border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700/60">
                    <div>
                      <span className="font-mono font-extrabold text-xs text-teal-700 dark:text-teal-400 mr-2">{item.itemNum}</span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{item.posTitle}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full">
                      {item.diffs.length} change{item.diffs.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {item.diffs.map(diff => (
                      <div key={diff.fieldKey} className="grid grid-cols-1 md:grid-cols-12 gap-1 text-xs items-center py-1 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
                        <div className="md:col-span-4 font-bold text-slate-600 dark:text-slate-400">
                          {diff.label}
                        </div>
                        <div className="md:col-span-8 flex items-center gap-2 flex-wrap text-xs">
                          <span className="px-2 py-0.5 bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-mono text-[11px] line-through decoration-red-400">
                            {diff.oldFormatted}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-950/80 text-green-800 dark:text-green-300 font-bold rounded text-[11px]">
                            {diff.newFormatted}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || diffItems.length === 0}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
              saving || diffItems.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer hover:shadow-lg'
            }`}
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Confirm & Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
