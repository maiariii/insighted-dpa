import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const parseRemarksValue = (raw) => {
  if (!raw) return { text: '', updatedBy: '', updatedAt: '' };
  if (typeof raw === 'object') {
    return { text: raw.text || '', updatedBy: raw.updatedBy || '', updatedAt: raw.updatedAt || '' };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { text: parsed.text || '', updatedBy: parsed.updatedBy || '', updatedAt: parsed.updatedAt || '' };
    }
  } catch {
    // legacy text
  }
  return { text: String(raw), updatedBy: '', updatedAt: '' };
};

export const RemarksModal = ({ isOpen, onClose, recordId, currentRemarksValue, onSave }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [metaInfo, setMetaInfo] = useState('');

  useEffect(() => {
    if (isOpen) {
      const parsed = parseRemarksValue(currentRemarksValue);
      setText(parsed.text || '');
      if (parsed.updatedBy) {
        const dateStr = parsed.updatedAt ? new Date(parsed.updatedAt).toLocaleString() : '';
        setMetaInfo(`Last updated by ${parsed.updatedBy}${dateStr ? ' on ' + dateStr : ''}`);
      } else {
        setMetaInfo('');
      }
    }
  }, [isOpen, currentRemarksValue]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanText = text.trim();
    const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'HRMO User';
    const payload = cleanText
      ? JSON.stringify({ text: cleanText, updatedBy: userName, updatedAt: new Date().toISOString() })
      : '';
    onSave(recordId, payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">Row Remarks</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Remarks</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm transition-all"
              placeholder="Add notes about this record..."
            />
          </div>
          {metaInfo && <p className="text-xs text-slate-400 dark:text-slate-500">{metaInfo}</p>}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white rounded-xl shadow-lg shadow-teal-600/15 transition-all cursor-pointer">Save Remarks</button>
          </div>
        </form>
      </div>
    </div>
  );
};
