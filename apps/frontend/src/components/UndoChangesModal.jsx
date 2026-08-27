import React, { useState, useMemo, useEffect } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2, Search, X } from 'lucide-react';

export const UndoChangesModal = ({
  isOpen,
  onClose,
  stagedEdits = {},
  records = [],
  onUndoAll,
  onUndoSingleRecord
}) => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'single'
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Map staged edit keys to record objects
  const stagedItems = useMemo(() => {
    const ids = Object.keys(stagedEdits);
    return ids.map(id => {
      const rec = records.find(r => String(r.id || r['ITEM NUMBER'] || r.item_number || '') === String(id));
      const itemNum = rec?.item_number || rec?.['ITEM NUMBER'] || 'N/A';
      const posTitle = rec?.position_title || rec?.['POSITION TITLE'] || 'N/A';
      const stagedFields = Object.keys(stagedEdits[id] || {});
      return {
        id,
        rec,
        itemNum,
        posTitle,
        stagedFields
      };
    });
  }, [stagedEdits, records]);

  // Filtered staged items for search in single mode
  const filteredStagedItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return stagedItems;
    const q = itemSearchQuery.trim().toLowerCase();
    return stagedItems.filter(item =>
      item.itemNum.toLowerCase().includes(q) || item.posTitle.toLowerCase().includes(q)
    );
  }, [stagedItems, itemSearchQuery]);

  // Set default selected record when modal opens or stagedItems change
  useEffect(() => {
    if (stagedItems.length > 0 && !selectedRecordId) {
      setSelectedRecordId(stagedItems[0].id);
    }
  }, [stagedItems, selectedRecordId]);

  if (!isOpen) return null;

  const totalPending = stagedItems.length;

  const handleConfirmUndoAll = () => {
    if (onUndoAll) {
      onUndoAll();
    }
    onClose();
  };

  const handleConfirmUndoSingle = () => {
    if (!selectedRecordId) return;
    if (onUndoSingleRecord) {
      onUndoSingleRecord(selectedRecordId);
    }
    // If this was the last pending item, close modal
    if (totalPending <= 1) {
      onClose();
    } else {
      // Pick next available staged item
      const remaining = stagedItems.filter(i => i.id !== selectedRecordId);
      if (remaining.length > 0) {
        setSelectedRecordId(remaining[0].id);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Undo Unsaved Changes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revert pending modifications before saving</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 flex border-b border-slate-100 dark:border-slate-700 gap-2 bg-slate-50/20 dark:bg-slate-900/20">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Undo ALL Changes ({totalPending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'single'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Undo Specific Item
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'all' ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-sm mb-1">Revert all {totalPending} unsaved modification{totalPending === 1 ? '' : 's'}?</strong>
                  This action will discard every pending edit across all modified records and restore them back to their original saved database values.
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/30 max-h-48 overflow-y-auto">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 block mb-2">Affected Records ({totalPending}):</span>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {stagedItems.map(item => (
                    <li key={item.id} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{item.itemNum}</span>
                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-[220px]">{item.posTitle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Select a specific record to revert its pending edits while leaving remaining modified items intact.
              </p>

              {/* Search Bar for Staged Items */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by item number or position title..."
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Staged Items Selection List */}
              <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/40">
                {filteredStagedItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    No matching modified items found.
                  </div>
                ) : (
                  filteredStagedItems.map(item => {
                    const isSelected = selectedRecordId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedRecordId(item.id)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition flex justify-between items-center ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/50 text-slate-900 dark:text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{item.itemNum}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{item.posTitle}</div>
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                            {item.stagedFields.length} field{item.stagedFields.length === 1 ? '' : 's'} modified ({item.stagedFields.join(', ')})
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 ml-2" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {activeTab === 'all' ? (
            <button
              type="button"
              onClick={handleConfirmUndoAll}
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo All Pending Changes ({totalPending})
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmUndoSingle}
              disabled={!selectedRecordId}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
                selectedRecordId
                  ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Revert Selected Item
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
