import React, { useState, useEffect } from 'react';
import { API } from '../services/api';
import { InterventionCreateSchema } from '@project/shared';
import { FlatpickrInput } from './FlatpickrInput';

const formatFieldText = (val) => {
  if (!val) return '';
  if (Array.isArray(val) && val.length > 0) {
    return val.map(item => (typeof item === 'object' ? item.text || JSON.stringify(item) : String(item))).join(', ');
  }
  if (typeof val === 'object') {
    return val.text || JSON.stringify(val);
  }
  return String(val);
};

export const AddInterventionModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const [formData, setFormData] = useState({
    area_of_concern: '',
    intervention_to_undertake: '',
    responsible_office: '',
    target_date: '',
    expected_outcomes: '',
    remarks: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!(initialData && initialData.id);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        let formattedTargetDate = '';
        if (initialData.target_date) {
          formattedTargetDate = typeof initialData.target_date === 'string'
            ? initialData.target_date.split('T')[0]
            : new Date(initialData.target_date).toISOString().split('T')[0];
        }
        setFormData({
          area_of_concern: initialData.area_of_concern || '',
          intervention_to_undertake: initialData.intervention_to_undertake || '',
          responsible_office: initialData.responsible_office || '',
          target_date: formattedTargetDate,
          expected_outcomes: formatFieldText(initialData.expected_outcomes),
          remarks: formatFieldText(initialData.remarks)
        });
      } else {
        setFormData({
          area_of_concern: '',
          intervention_to_undertake: '',
          responsible_office: '',
          target_date: '',
          expected_outcomes: '',
          remarks: ''
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Zod validation check using InterventionCreateSchema
    const validation = InterventionCreateSchema.safeParse(formData);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setError(issue ? issue.message : 'Invalid intervention data.');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (isEditMode) {
        res = await API.dpa.updateIntervention(initialData.id, validation.data);
      } else {
        res = await API.dpa.createIntervention(validation.data);
      }

      if (res.success || res.intervention) {
        setFormData({
          area_of_concern: '',
          intervention_to_undertake: '',
          responsible_office: '',
          target_date: '',
          expected_outcomes: '',
          remarks: ''
        });
        onSuccess();
        onClose();
      } else {
        setError(res.error || (isEditMode ? 'Failed to update intervention.' : 'Failed to submit intervention.'));
      }
    } catch (err) {
      setError(err.message || 'Server error saving intervention.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">
            {isEditMode ? 'Edit Intervention' : 'Add New Intervention'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Area of Concern <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="area_of_concern"
              value={formData.area_of_concern}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm transition-all"
              placeholder="e.g. Teaching vacancy backlog in Division of Caloocan"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Intervention to Undertake <span className="text-red-500">*</span>
            </label>
            <textarea
              name="intervention_to_undertake"
              value={formData.intervention_to_undertake}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm transition-all"
              placeholder="e.g. Expedite publication of unsubmitted items and schedule board deliberations."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Responsible Office <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="responsible_office"
                value={formData.responsible_office}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm transition-all"
                placeholder="e.g. SDR-HRMO / Division HRMO"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Target Date <span className="text-red-500">*</span>
              </label>
              <FlatpickrInput
                value={formData.target_date}
                onChange={(val) => setFormData(prev => ({ ...prev, target_date: val }))}
                minDate="today"
                placeholder="Select date"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Expected Outcomes</label>
            <input
              type="text"
              name="expected_outcomes"
              value={formData.expected_outcomes}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm transition-all"
              placeholder="e.g. Hiring backlog reduced by 25%."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Remarks</label>
            <input
              type="text"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm transition-all"
              placeholder="e.g. Plan submitted and approved during audit session."
            />
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-bold bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white rounded-xl shadow-lg shadow-teal-600/15 transition-all cursor-pointer">
              {submitting ? (isEditMode ? 'Saving...' : 'Submitting...') : (isEditMode ? 'Save Changes' : 'Submit Intervention')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
