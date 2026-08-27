import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AddInterventionModal } from '../components/AddInterventionModal';
import { API } from '../services/api';

export const Interventions = () => {
  const { interventions, refreshDashboard } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const formatFieldText = (val, fallback = 'N/A') => {
    if (!val) return fallback;
    if (Array.isArray(val) && val.length > 0) {
      return val.map(item => (typeof item === 'object' ? item.text || JSON.stringify(item) : String(item))).join(', ');
    }
    if (typeof val === 'object') {
      return val.text || JSON.stringify(val);
    }
    return String(val);
  };

  const openEditModal = (item) => {
    setEditTarget(item);
    setIsModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setDeleteError('');
    setDeleteTarget(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await API.dpa.deleteIntervention(deleteTarget.id);
      await refreshDashboard();
      setDeleteTarget(null);
      setDeleteError('');
    } catch (err) {
      const cleanError = err.message ? err.message.replace(/^Failed to delete intervention:\s*/i, '') : 'Failed to delete intervention record.';
      setDeleteError(cleanError);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-700">
        <div>
          <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 tracking-wider uppercase">
            Part II: Other Interventions to Address Vacancies
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Interventions Workspace
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Formulate and monitor strategic actions designed to accelerate vacancy processing.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              setEditTarget(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>+</span> Add Intervention
          </button>
        </div>
      </div>

      {/* Interventions Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {interventions.length === 0 ? (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white/40 dark:bg-slate-800/40">
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              No interventions submitted yet for vacant positions.
            </p>
          </div>
        ) : (
          interventions.map((item) => (
            <div
              key={item.id || item.created_at}
              className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-start justify-between mb-3 gap-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                    {item.area_of_concern || 'General Concern'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium mr-1">
                      {item.target_date ? new Date(item.target_date).toLocaleDateString() : 'N/A'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30 p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center"
                      title="Edit intervention"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(item)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center"
                      title="Delete intervention"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white mb-2 leading-snug">
                  {item.intervention_to_undertake || 'Intervention Strategy'}
                </h4>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4">
                  <p>
                    <strong className="text-slate-700 dark:text-slate-200">Expected Outcomes:</strong>{' '}
                    {formatFieldText(item.expected_outcomes)}
                  </p>
                  <p>
                    <strong className="text-slate-700 dark:text-slate-200">Remarks:</strong>{' '}
                    {formatFieldText(item.remarks, 'No additional remarks.')}
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Office: {item.responsible_office || 'N/A'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Intervention Modal Overlay */}
      <AddInterventionModal
        isOpen={isModalOpen}
        initialData={editTarget}
        onClose={() => {
          setIsModalOpen(false);
          setEditTarget(null);
        }}
        onSuccess={() => refreshDashboard()}
      />

      {/* Delete Confirmation Modal Overlay */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Delete Intervention</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            {deleteError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800/60 font-semibold flex items-start gap-2">
                <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{deleteError}</span>
              </div>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove the intervention strategy for <strong className="text-slate-900 dark:text-white">"{deleteTarget.area_of_concern || 'this item'}"</strong>?
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError('');
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : deleteError ? 'Retry Delete' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
