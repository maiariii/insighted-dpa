import React, { useState, useEffect } from 'react';
import { FlatpickrInput } from './FlatpickrInput';
import { parseRemarksValue } from './RemarksModal';
import { REASONS_FOR_VACANCY, STATUSES_OF_VACANCY } from '../utils/config';

export const RowEditModal = ({ isOpen, onClose, record, stagedEdits = {}, onFieldChange, onStatusChange }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (record && isOpen) {
      const rowEdits = stagedEdits[record.id] || {};
      const resolveValue = (field, aliasKey) => {
        if (rowEdits[field] !== undefined) return rowEdits[field];
        if (record[field] !== undefined && record[field] !== null) return record[field];
        if (aliasKey && record[aliasKey] !== undefined && record[aliasKey] !== null) return record[aliasKey];
        return '';
      };

      const posStatus = resolveValue('position_status', 'POSITION STATUS') || record.item_status || 'UNFILLED';
      const remarksRaw = resolveValue('other_remarks', 'OTHER REMARKS');
      const remarksParsed = parseRemarksValue(remarksRaw);

      setFormData({
        position_status: posStatus,
        name_of_incumbent: resolveValue('name_of_incumbent', 'NAME OF INCUMBENT'),
        first_day_of_service: resolveValue('first_day_of_service', 'FIRST DAY OF SERVICE'),
        date_of_vacancy: resolveValue('date_of_vacancy', 'DATE OF VACANCY'),
        reason_for_vacancy: resolveValue('reason_for_vacancy', 'REASON FOR VACANCY'),
        status_of_vacancy: resolveValue('status_of_vacancy', 'STATUS OF VACANCY'),
        tentative_date_to_fill_up: resolveValue('tentative_date_to_fill_up', 'TENTATIVE DATE TO FILL-UP'),
        other_remarks: remarksParsed.text || ''
      });
    }
  }, [record, isOpen, stagedEdits]);

  if (!isOpen || !record) return null;

  const isFilled = formData.position_status === 'FILLED';

  const handlePosStatusChange = (newStatus) => {
    setFormData(prev => ({ ...prev, position_status: newStatus }));
    if (onStatusChange) {
      onStatusChange(record.id, newStatus);
    }
  };

  const handleInputChange = (field, val) => {
    const cleanVal = field === 'name_of_incumbent' && typeof val === 'string' ? val.toUpperCase() : val;
    setFormData(prev => ({ ...prev, [field]: cleanVal }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFieldChange(record.id, 'position_status', formData.position_status);

    if (isFilled) {
      onFieldChange(record.id, 'name_of_incumbent', formData.name_of_incumbent);
      onFieldChange(record.id, 'first_day_of_service', formData.first_day_of_service);
    } else {
      onFieldChange(record.id, 'date_of_vacancy', formData.date_of_vacancy);
      onFieldChange(record.id, 'reason_for_vacancy', formData.reason_for_vacancy);
      onFieldChange(record.id, 'status_of_vacancy', formData.status_of_vacancy);
      onFieldChange(record.id, 'tentative_date_to_fill_up', formData.tentative_date_to_fill_up);
    }

    if (formData.other_remarks) {
      const payload = JSON.stringify({
        text: formData.other_remarks.trim(),
        updatedBy: 'HRMO User',
        updatedAt: new Date().toISOString()
      });
      onFieldChange(record.id, 'other_remarks', payload);
    }

    onClose();
  };

  const itemNum = record.item_number || record['ITEM NUMBER'] || 'N/A';
  const posTitle = record.position_title || record['POSITION TITLE'] || 'N/A';
  const posCat = record.position_category || record['POSITION CATEGORY'] || 'N/A';
  const sg = record.sg || record.SG || 'N/A';
  const yearCreated = record.year_created || record['YEAR CREATED'] || 'N/A';
  const yearsUnfilled = record.years_unfilled || record['YEARS UNFILLED'] || 'N/A';
  const agingStatus = record.vacancy_aging_status || record['VACANCY AGING STATUS'] || 'N/A';

  const getAgingBadgeClass = (status) => {
    if (!status) return 'badge-vacancy-aging';
    const s = status.toString().toLowerCase();
    if (s.includes('long-term') || s.includes('unfilled')) return 'badge-vacancy-long-term';
    if (s.includes('extended')) return 'badge-vacancy-extended';
    if (s.includes('newly created')) return 'badge-vacancy-newly-created';
    if (s.includes('new')) return 'badge-vacancy-new';
    return 'badge-vacancy-aging';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">Edit Audit Record</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{itemNum} — {posTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-xl leading-none">&times;</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Readonly Summary Sub-cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Category</span>
              <strong className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">{posCat}</strong>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SG</span>
              <strong className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">{sg}</strong>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Years Unfilled</span>
              <strong className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">{yearsUnfilled}</strong>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Aging Status</span>
              <div>
                <span className={`badge-vacancy-status ${getAgingBadgeClass(agingStatus)}`}>
                  {agingStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Position Status Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Position Status <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full px-3.5 py-2.5 rounded-xl border font-bold text-sm shadow-sm cursor-pointer ${isFilled ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}
              value={formData.position_status}
              onChange={(e) => handlePosStatusChange(e.target.value)}
            >
              <option value="UNFILLED">UNFILLED</option>
              <option value="FILLED">FILLED</option>
            </select>
          </div>

          {/* Conditional Fields */}
          {isFilled ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Name of Incumbent
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 uppercase bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  value={formData.name_of_incumbent || ''}
                  onChange={(e) => handleInputChange('name_of_incumbent', e.target.value)}
                  placeholder="INCUMBENT NAME"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  First Day of Service
                </label>
                <FlatpickrInput
                  value={formData.first_day_of_service}
                  onChange={(val) => handleInputChange('first_day_of_service', val)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Date of Vacancy
                  </label>
                  <FlatpickrInput
                    value={formData.date_of_vacancy}
                    onChange={(val) => handleInputChange('date_of_vacancy', val)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Reason for Vacancy
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                    value={formData.reason_for_vacancy || ''}
                    onChange={(e) => handleInputChange('reason_for_vacancy', e.target.value)}
                  >
                    <option value="">Select Reason</option>
                    {REASONS_FOR_VACANCY.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Status of Vacancy
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                    value={formData.status_of_vacancy || ''}
                    onChange={(e) => handleInputChange('status_of_vacancy', e.target.value)}
                  >
                    <option value="">Select Status</option>
                    {STATUSES_OF_VACANCY.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Tentative Date to Fill-Up
                  </label>
                  <FlatpickrInput
                    value={formData.tentative_date_to_fill_up}
                    onChange={(val) => handleInputChange('tentative_date_to_fill_up', val)}
                    minDate="today"
                    allowInput={false}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Other Remarks
            </label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
              value={formData.other_remarks || ''}
              onChange={(e) => handleInputChange('other_remarks', e.target.value)}
              placeholder="Add notes about this record..."
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-600/15 transition-all cursor-pointer">Apply &amp; Stage Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};
