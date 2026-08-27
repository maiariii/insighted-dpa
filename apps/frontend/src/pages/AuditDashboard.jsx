import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { API } from '../services/api';
import { useApp } from '../context/AppContext';
import { PersonnelAuditKPIs } from '../components/PersonnelAuditKPIs';
import { RemarksModal, parseRemarksValue } from '../components/RemarksModal';
import { RowEditModal } from '../components/RowEditModal';
import { UndoChangesModal } from '../components/UndoChangesModal';
import { SaveFinalizedEditsModal } from '../components/SaveFinalizedEditsModal';
import { UnfinalizeConfirmModal } from '../components/UnfinalizeConfirmModal';
import { FlatpickrInput } from '../components/FlatpickrInput';
import { REASONS_FOR_VACANCY, STATUSES_OF_VACANCY } from '../utils/config';
import { useTableSortAndFilter } from '../hooks/useTableSortAndFilter';
import { checkRecordRequiredFields } from '../utils/recordValidation';

export const AuditDashboard = () => {
  const {
    records,
    regions,
    refreshDashboard,
    searchQuery,
    setSearchQuery,
    selectedRegionFilter,
    setSelectedRegionFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    activeCategoryFilter,
    setActiveCategoryFilter,
    isRecordCompleted
  } = useApp();

  const [saving, setSaving] = useState(false);
  const [remarksModalRecordId, setRemarksModalRecordId] = useState(null);
  const [editingModalRecord, setEditingModalRecord] = useState(null);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFinalizedEditMode, setIsFinalizedEditMode] = useState(false);
  const [isFinalizedSaveModalOpen, setIsFinalizedSaveModalOpen] = useState(false);
  const [unfinalizeTargetRecord, setUnfinalizeTargetRecord] = useState(null);
  const [isUnfinalizing, setIsUnfinalizing] = useState(false);
  const PAGE_SIZE = 100;

  // Helper to safely extract record key across id, ITEM NUMBER, or item_number
  const getRecordKey = (record) => {
    if (!record) return '';
    return record.id || record['ITEM NUMBER'] || record.item_number || '';
  };

  // Decoupled local edit-state objects for Main Audit Panel vs Finalized Records Table
  // Persisted to localStorage so unsaved Draft/Incomplete edits survive a page refresh
  const MAIN_STAGED_EDITS_KEY = 'auditDashboard.mainStagedEdits';
  const FINALIZED_STAGED_EDITS_KEY = 'auditDashboard.finalizedStagedEdits';

  const loadPersistedEdits = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [mainStagedEdits, setMainStagedEdits] = useState(() => loadPersistedEdits(MAIN_STAGED_EDITS_KEY));
  const [finalizedStagedEdits, setFinalizedStagedEdits] = useState(() => loadPersistedEdits(FINALIZED_STAGED_EDITS_KEY));

  useEffect(() => {
    try {
      localStorage.setItem(MAIN_STAGED_EDITS_KEY, JSON.stringify(mainStagedEdits));
    } catch {
      // ignore storage write failures (e.g. quota exceeded, private browsing)
    }
  }, [mainStagedEdits]);

  useEffect(() => {
    try {
      localStorage.setItem(FINALIZED_STAGED_EDITS_KEY, JSON.stringify(finalizedStagedEdits));
    } catch {
      // ignore storage write failures (e.g. quota exceeded, private browsing)
    }
  }, [finalizedStagedEdits]);

  // Helper to compute is_audited boolean flag from merged row state
  const computeAuditedFlag = (rec, rowEdits) => {
    const isAlreadyAudited = rec ? isRecordCompleted(rec) : false;
    const posStatus = rowEdits.position_status !== undefined
      ? rowEdits.position_status
      : (rec?.position_status || rec?.['POSITION STATUS'] || 'UNFILLED');

    if (posStatus === 'FILLED') {
      const incumbent = rowEdits.name_of_incumbent !== undefined
        ? rowEdits.name_of_incumbent
        : (rec?.name_of_incumbent || rec?.['NAME OF INCUMBENT'] || '');
      const firstDay = rowEdits.first_day_of_service !== undefined
        ? rowEdits.first_day_of_service
        : (rec?.first_day_of_service || rec?.['FIRST DAY OF SERVICE'] || '');
      return !!(incumbent && String(incumbent).trim() && firstDay && String(firstDay).trim()) || isAlreadyAudited;
    } else {
      const dateVacancy = rowEdits.date_of_vacancy !== undefined
        ? rowEdits.date_of_vacancy
        : (rec?.date_of_vacancy || rec?.['DATE OF VACANCY'] || '');
      const reason = rowEdits.reason_for_vacancy !== undefined
        ? rowEdits.reason_for_vacancy
        : (rec?.reason_for_vacancy || rec?.['REASON FOR VACANCY'] || '');
      const status = rowEdits.status_of_vacancy !== undefined
        ? rowEdits.status_of_vacancy
        : (rec?.status_of_vacancy || rec?.['STATUS OF VACANCY'] || '');
      const tentative = rowEdits.tentative_date_to_fill_up !== undefined
        ? rowEdits.tentative_date_to_fill_up
        : (rec?.tentative_date_to_fill_up || rec?.['TENTATIVE DATE TO FILL-UP'] || '');
      const unfilledAudited = !!(dateVacancy && String(dateVacancy).trim() && reason && String(reason).trim() && status && String(status).trim() && tentative && String(tentative).trim());
      return unfilledAudited || isAlreadyAudited;
    }
  };

  // --- MAIN PANEL CHANGE TRACKING HANDLERS ---
  const stageMainEdit = (recordId, field, val) => {
    if (!recordId) return;
    const cleanVal = field === 'name_of_incumbent' && typeof val === 'string' ? val.toUpperCase() : val;
    setMainStagedEdits(prev => {
      const rec = records.find(r => String(getRecordKey(r)) === String(recordId));
      const updatedRow = {
        ...(prev[recordId] || {}),
        [field]: cleanVal
      };
      delete updatedRow.item_status;
      updatedRow.is_audited = computeAuditedFlag(rec, updatedRow);
      return {
        ...prev,
        [recordId]: updatedRow
      };
    });
  };

  const handleMainStatusChange = (recordId, newStatus) => {
    if (!recordId) return;
    if (newStatus === 'UNFILLED') {
      stageMainEdit(recordId, 'position_status', 'UNFILLED');
      stageMainEdit(recordId, 'name_of_incumbent', '');
      stageMainEdit(recordId, 'first_day_of_service', '');
    } else if (newStatus === 'FILLED') {
      stageMainEdit(recordId, 'position_status', 'FILLED');
      stageMainEdit(recordId, 'date_of_vacancy', '');
      stageMainEdit(recordId, 'reason_for_vacancy', '');
      stageMainEdit(recordId, 'status_of_vacancy', '');
      stageMainEdit(recordId, 'tentative_date_to_fill_up', '');
    }
  };

  const resolveMainValue = (record, field, aliasKey) => {
    if (!record) return '';
    const recId = getRecordKey(record);
    const rowEdits = mainStagedEdits[recId] || {};
    if (rowEdits[field] !== undefined) return rowEdits[field];
    if (record[field] !== undefined && record[field] !== null) return record[field];
    if (aliasKey && record[aliasKey] !== undefined && record[aliasKey] !== null) return record[aliasKey];
    return '';
  };

  const mainPendingCount = Object.keys(mainStagedEdits).length;

  const handleMainSave = async () => {
    console.log('[MainSave] handleMainSave triggered with staged edits:', mainStagedEdits);
    if (mainPendingCount === 0) return;

    const editEntries = Object.entries(mainStagedEdits);
    const validDraftEntries = [];
    const invalidEntries = [];

    for (const [id, rowEdits] of editEntries) {
      const rec = records.find(r => String(r.id || r['ITEM NUMBER'] || r.item_number || '') === String(id));
      const validation = checkRecordRequiredFields(rec || { id }, rowEdits);
      if (validation.isDraft) {
        validDraftEntries.push({ id, rec, rowEdits });
      } else {
        invalidEntries.push({ id, rec, validation });
      }
    }

    if (invalidEntries.length > 0) {
      const invalidMessages = invalidEntries.map(({ rec, validation }) => {
        const itemNum = rec?.item_number || rec?.['ITEM NUMBER'] || 'N/A';
        return `• Item ${itemNum}: missing ${validation.missingFields.join(', ')}`;
      });

      alert(`Cannot save changes for incomplete record(s):\n\n${invalidMessages.join('\n')}\n\nPlease accomplish all required fields to mark records as Draft before saving.`);

      if (validDraftEntries.length === 0) {
        return;
      }
    }

    setSaving(true);
    try {
      const savedIds = validDraftEntries.map(e => e.id);
      const promises = validDraftEntries.map(({ id, rowEdits }) => {
        const cleanFields = { ...rowEdits };
        delete cleanFields.item_status;
        console.log(`[MainSave] API.dpa.updateRecord call for ID ${id}:`, cleanFields);
        return API.dpa.updateRecord(id, cleanFields);
      });
      await Promise.all(promises);

      // Clear only successfully persisted IDs from mainStagedEdits after successful API resolution
      setMainStagedEdits(prev => {
        const updated = { ...prev };
        savedIds.forEach(id => delete updated[id]);
        return updated;
      });

      await refreshDashboard();
      alert(`Successfully saved ${savedIds.length} draft record(s)!`);
    } catch (err) {
      console.error('[MainSave] Error saving main audit records:', err);
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- FINALIZED TABLE CHANGE TRACKING HANDLERS ---
  const stageFinalizedEdit = (recordId, field, val) => {
    if (!recordId) return;
    const cleanVal = field === 'name_of_incumbent' && typeof val === 'string' ? val.toUpperCase() : val;
    console.log(`[FinalizedEdit Staged] recordId=${recordId}, field=${field}, val=${cleanVal}`);
    setFinalizedStagedEdits(prev => {
      const rec = records.find(r => String(getRecordKey(r)) === String(recordId));
      const updatedRow = {
        ...(prev[recordId] || {}),
        [field]: cleanVal
      };
      delete updatedRow.item_status;
      updatedRow.is_audited = computeAuditedFlag(rec, updatedRow);
      return {
        ...prev,
        [recordId]: updatedRow
      };
    });
  };

  const handleFinalizedStatusChange = (recordId, newStatus) => {
    if (!recordId) return;
    if (newStatus === 'UNFILLED') {
      stageFinalizedEdit(recordId, 'position_status', 'UNFILLED');
      stageFinalizedEdit(recordId, 'name_of_incumbent', '');
      stageFinalizedEdit(recordId, 'first_day_of_service', '');
    } else if (newStatus === 'FILLED') {
      stageFinalizedEdit(recordId, 'position_status', 'FILLED');
      stageFinalizedEdit(recordId, 'date_of_vacancy', '');
      stageFinalizedEdit(recordId, 'reason_for_vacancy', '');
      stageFinalizedEdit(recordId, 'status_of_vacancy', '');
      stageFinalizedEdit(recordId, 'tentative_date_to_fill_up', '');
    }
  };

  const resolveFinalizedValue = (record, field, aliasKey) => {
    if (!record) return '';
    const recId = getRecordKey(record);
    const rowEdits = finalizedStagedEdits[recId] || {};
    if (rowEdits[field] !== undefined) return rowEdits[field];
    if (record[field] !== undefined && record[field] !== null) return record[field];
    if (aliasKey && record[aliasKey] !== undefined && record[aliasKey] !== null) return record[aliasKey];
    return '';
  };

  const finalizedPendingCount = Object.keys(finalizedStagedEdits).length;

  const handleConfirmFinalizedSave = async () => {
    console.log('[FinalizedSave] Step 2: handleConfirmFinalizedSave triggered', { finalizedPendingCount, finalizedStagedEdits });
    if (finalizedPendingCount === 0) return;
    setSaving(true);
    try {
      const entries = Object.entries(finalizedStagedEdits);
      const targetIds = entries.map(([id]) => id);
      console.log('[FinalizedSave] Step 3: Sending update requests for target IDs:', targetIds);

      const promises = entries.map(([id, fields]) => {
        const cleanFields = { ...fields };
        delete cleanFields.item_status;
        console.log(`[FinalizedSave] API.dpa.updateRecord call for ID ${id}:`, cleanFields);
        return API.dpa.updateRecord(id, cleanFields);
      });
      const results = await Promise.all(promises);
      console.log('[FinalizedSave] Step 4: API requests resolved successfully:', results);

      // ONLY clear dirty changes state AFTER confirmed successful API save
      setFinalizedStagedEdits({});
      setIsFinalizedSaveModalOpen(false);
      setIsFinalizedEditMode(false);
      await refreshDashboard();
      alert(`Successfully saved ${targetIds.length} finalized personnel record(s)!`);
    } catch (err) {
      console.error('[FinalizedSave] ERROR in handleConfirmFinalizedSave:', err);
      alert(`Failed to save finalized records: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Clears only the audit-specific fields on a finalized record (does NOT delete the row),
  // so it drops out of is_audited/FILLED-based completion checks and reappears in the Main Panel.
  const UNFINALIZE_RESET_FIELDS = {
    position_status: 'UNFILLED',
    name_of_incumbent: '',
    first_day_of_service: '',
    date_of_vacancy: '',
    reason_for_vacancy: '',
    status_of_vacancy: '',
    other_remarks: '',
    tentative_date_to_fill_up: '',
    is_audited: false
  };

  const handleConfirmUnfinalize = async () => {
    if (!unfinalizeTargetRecord) return;
    const recId = getRecordKey(unfinalizeTargetRecord);
    setIsUnfinalizing(true);
    try {
      await API.dpa.updateRecord(recId, UNFINALIZE_RESET_FIELDS);

      // Drop any stale staged edits for this record now that its audit data is cleared
      setFinalizedStagedEdits(prev => {
        const copy = { ...prev };
        delete copy[recId];
        return copy;
      });
      setMainStagedEdits(prev => {
        const copy = { ...prev };
        delete copy[recId];
        return copy;
      });

      setUnfinalizeTargetRecord(null);
      await refreshDashboard();
    } catch (err) {
      console.error('[Unfinalize] Error clearing finalized audit data:', err);
      alert(`Failed to clear finalized audit data: ${err.message}`);
    } finally {
      setIsUnfinalizing(false);
    }
  };

  // Separate active (uncompleted) rows and completed rows
  const activeRecords = useMemo(() => {
    return records.filter(r => !isRecordCompleted(r));
  }, [records, isRecordCompleted]);

  const completedRecords = useMemo(() => {
    return records.filter(isRecordCompleted);
  }, [records, isRecordCompleted]);

  // Filter active records by global search, region, status, and category
  const filteredActiveRecords = useMemo(() => {
    return activeRecords.filter(r => {
      const itemNum = (r.item_number || r['ITEM NUMBER'] || '').toString().toLowerCase();
      const posTitle = (r.position_title || r['POSITION TITLE'] || '').toString().toLowerCase();
      const regionVal = (r.region_id || r.region_name || r.REGION || r['REGION'] || '').toString().toLowerCase();
      const categoryVal = r.position_category || r['POSITION CATEGORY'] || '';
      const statusVal = (r.item_status || r.ITEM_STATUS || r.position_status || r['POSITION STATUS'] || '').toString();

      const matchesSearch = !searchQuery || itemNum.includes(searchQuery.toLowerCase()) || posTitle.includes(searchQuery.toLowerCase());
      const matchesRegion = !selectedRegionFilter || regionVal.includes(selectedRegionFilter.toLowerCase());
      const matchesStatus = !selectedStatusFilter || statusVal.toLowerCase() === selectedStatusFilter.toLowerCase();
      const matchesCategory = !activeCategoryFilter || categoryVal === activeCategoryFilter;

      return matchesSearch && matchesRegion && matchesStatus && matchesCategory;
    });

  }, [activeRecords, searchQuery, selectedRegionFilter, selectedStatusFilter, activeCategoryFilter]);

  // Submission Status helper for sorting and filtering
  const getSubmissionStatus = useCallback((record) => {
    if (!record) return '';
    const recId = getRecordKey(record);
    const rowEdits = mainStagedEdits[recId] || {};
    const isDirty = Object.keys(rowEdits).length > 0;
    if (!isDirty) return '';
    const validation = checkRecordRequiredFields(record, rowEdits);
    return validation.isDraft ? 'Draft' : 'Incomplete';
  }, [mainStagedEdits]);

  // Field extractors for Main Audit Table sorting & column filtering
  const mainExtractors = useMemo(() => ({
    item_number: r => r.item_number || r['ITEM NUMBER'] || '',
    position_title: r => r.position_title || r['POSITION TITLE'] || '',
    position_category: r => r.position_category || r['POSITION CATEGORY'] || '',
    item_status: r => r.item_status || r.ITEM_STATUS || resolveMainValue(r, 'position_status', 'POSITION STATUS') || '',
    sg: r => r.sg || r.SG || '',
    year_created: r => r.year_created || r['YEAR CREATED'] || '',
    years_unfilled: r => r.years_unfilled || r['YEARS UNFILLED'] || '',
    vacancy_aging_status: r => r.vacancy_aging_status || r['VACANCY AGING STATUS'] || '',
    position_status: r => resolveMainValue(r, 'position_status', 'POSITION STATUS') || r.item_status || 'UNFILLED',
    name_of_incumbent: r => resolveMainValue(r, 'name_of_incumbent', 'NAME OF INCUMBENT') || '',
    first_day_of_service: r => resolveMainValue(r, 'first_day_of_service', 'FIRST DAY OF SERVICE') || '',
    date_of_vacancy: r => resolveMainValue(r, 'date_of_vacancy', 'DATE OF VACANCY') || '',
    reason_for_vacancy: r => resolveMainValue(r, 'reason_for_vacancy', 'REASON FOR VACANCY') || '',
    status_of_vacancy: r => resolveMainValue(r, 'status_of_vacancy', 'STATUS OF VACANCY') || '',
    other_remarks: r => parseRemarksValue(resolveMainValue(r, 'other_remarks', 'OTHER REMARKS')).text || '',
    tentative_date_to_fill_up: r => resolveMainValue(r, 'tentative_date_to_fill_up', 'TENTATIVE DATE TO FILL-UP') || '',
    submission_status: r => getSubmissionStatus(r)
  }), [mainStagedEdits, getSubmissionStatus]);

  // Custom comparators for Main Audit Table (custom priority order for Submission Status)
  const mainCustomComparators = useMemo(() => ({
    submission_status: (a, b, sortDirection, extractors) => {
      const getPriority = (row) => {
        const status = extractors.submission_status ? extractors.submission_status(row) : getSubmissionStatus(row);
        if (status === 'Draft') return 0;
        if (status === 'Incomplete') return 1;
        return 2; // null/empty
      };
      const prioA = getPriority(a);
      const prioB = getPriority(b);
      if (prioA !== prioB) {
        return sortDirection === 'asc' ? prioA - prioB : prioB - prioA;
      }
      const itemA = String(a.item_number || a['ITEM NUMBER'] || '');
      const itemB = String(b.item_number || b['ITEM NUMBER'] || '');
      return itemA.localeCompare(itemB);
    }
  }), [getSubmissionStatus]);

  // Main Audit Table hook instance
  const mainTable = useTableSortAndFilter(filteredActiveRecords, mainExtractors, mainCustomComparators);

  // Field extractors for Finalized / Audited Personnel Records Table
  const finalizedExtractors = useMemo(() => ({
    item_number: r => r.item_number || r['ITEM NUMBER'] || '',
    position_title: r => r.position_title || r['POSITION TITLE'] || '',
    position_category: r => r.position_category || r['POSITION CATEGORY'] || '',
    item_status: r => r.item_status || r.ITEM_STATUS || resolveFinalizedValue(r, 'position_status', 'POSITION STATUS') || '',
    sg: r => r.sg || r.SG || '',
    year_created: r => r.year_created || r['YEAR CREATED'] || '',
    years_unfilled: r => r.years_unfilled || r['YEARS UNFILLED'] || '',
    vacancy_aging_status: r => r.vacancy_aging_status || r['VACANCY AGING STATUS'] || '',
    position_status: r => resolveFinalizedValue(r, 'position_status', 'POSITION STATUS') || r.item_status || '',
    name_of_incumbent: r => resolveFinalizedValue(r, 'name_of_incumbent', 'NAME OF INCUMBENT') || '',
    first_day_of_service: r => resolveFinalizedValue(r, 'first_day_of_service', 'FIRST DAY OF SERVICE') || '',
    date_of_vacancy: r => resolveFinalizedValue(r, 'date_of_vacancy', 'DATE OF VACANCY') || '',
    reason_for_vacancy: r => resolveFinalizedValue(r, 'reason_for_vacancy', 'REASON FOR VACANCY') || '',
    status_of_vacancy: r => resolveFinalizedValue(r, 'status_of_vacancy', 'STATUS OF VACANCY') || '',
    tentative_date_to_fill_up: r => resolveFinalizedValue(r, 'tentative_date_to_fill_up', 'TENTATIVE DATE TO FILL-UP') || '',
    other_remarks: r => parseRemarksValue(resolveFinalizedValue(r, 'other_remarks', 'OTHER REMARKS')).text || ''
  }), [finalizedStagedEdits]);

  // Finalized Table hook instance
  const finalizedTable = useTableSortAndFilter(completedRecords, finalizedExtractors);

  // Export CSV Handler for Finalized / Audited Records
  const handleExportCompletedCSV = () => {
    const list = finalizedTable.processedData;
    if (!list || list.length === 0) {
      alert('No finalized personnel records available to export.');
      return;
    }

    const headers = [
      'ITEM NUMBER',
      'POSITION TITLE',
      'CATEGORY',
      'ITEM STATUS',
      'SG',
      'YEAR CREATED',
      'YEARS UNFILLED',
      'AGING STATUS',
      'POSITION STATUS',
      'NAME OF INCUMBENT',
      'FIRST DAY OF SERVICE',
      'DATE OF VACANCY',
      'REASON FOR VACANCY',
      'STATUS OF VACANCY',
      'TENTATIVE DATE OF FIRST DAY OF SERVICE',
      'OTHER REMARKS'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = list.map(record => {
      const posStatus = record.position_status || record['POSITION STATUS'] || record.item_status || 'UNFILLED';
      const isFilled = posStatus === 'FILLED';
      const remarksParsed = parseRemarksValue(record.other_remarks || record['OTHER REMARKS'] || '');

      return [
        escapeCsv(record.item_number || record['ITEM NUMBER'] || 'N/A'),
        escapeCsv(record.position_title || record['POSITION TITLE'] || 'N/A'),
        escapeCsv(record.position_category || record['POSITION CATEGORY'] || 'N/A'),
        escapeCsv(record.item_status || record.ITEM_STATUS || posStatus),
        escapeCsv(record.sg || record.SG || 'N/A'),
        escapeCsv(record.year_created || record['YEAR CREATED'] || 'N/A'),
        escapeCsv(record.years_unfilled || record['YEARS UNFILLED'] || 'N/A'),
        escapeCsv(record.vacancy_aging_status || record['VACANCY AGING STATUS'] || 'N/A'),
        escapeCsv(posStatus),
        escapeCsv(isFilled ? (record.name_of_incumbent || record['NAME OF INCUMBENT'] || 'N/A') : 'N/A'),
        escapeCsv(isFilled ? (record.first_day_of_service || record['FIRST DAY OF SERVICE'] || 'N/A') : 'N/A'),
        escapeCsv(!isFilled ? (record.date_of_vacancy || record['DATE OF VACANCY'] || 'N/A') : 'N/A'),
        escapeCsv(!isFilled ? (record.reason_for_vacancy || record['REASON FOR VACANCY'] || 'N/A') : 'N/A'),
        escapeCsv(!isFilled ? (record.status_of_vacancy || record['STATUS OF VACANCY'] || 'N/A') : 'N/A'),
        escapeCsv(!isFilled ? (record.tentative_date_to_fill_up || record['TENTATIVE DATE TO FILL-UP'] || 'N/A') : 'N/A'),
        escapeCsv(remarksParsed.text || 'N/A')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `finalized_personnel_records_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Paginated active records slice from mainTable.processedData
  const totalPages = Math.max(1, Math.ceil(mainTable.processedData.length / PAGE_SIZE));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (validPage - 1) * PAGE_SIZE;
  const paginatedRecords = mainTable.processedData.slice(startIdx, startIdx + PAGE_SIZE);

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
    <div className="space-y-8">
      {/* Main Audit Card */}
      <article className="card card-glass p-6">
        <div className="specular-sheen"></div>

        {/* Audit Header */}
        <div className="audit-header mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60 relative z-10 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="panel-header-title text-xl md:text-2xl font-extrabold tracking-tight mb-1 leading-tight">
              Personnel Audit Main Panel
            </h3>
            <p className="panel-header-subtitle text-sm font-normal leading-relaxed mt-1">
              Item Number and Position Title stay frozen during horizontal scroll.
            </p>
          </div>
          <div className="audit-header-actions flex items-center gap-3">
            <input
              type="text"
              className="field search text-sm"
              placeholder="Search item number or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: '240px' }}
            />
            {mainPendingCount > 0 && (
              <button
                type="button"
                onClick={() => setIsUndoModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Undo pending unsaved changes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo Changes
              </button>
            )}
            <button
              type="button"
              onClick={handleMainSave}
              disabled={mainPendingCount === 0 || saving}
              className={mainPendingCount > 0 ? 'btn-save-active' : 'btn-save-disabled'}
            >
              {saving ? 'Saving...' : mainPendingCount > 0 ? `Save ${mainPendingCount} ${mainPendingCount === 1 ? 'Change' : 'Changes'}` : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Personnel Audit KPI Category Tabs */}
        <PersonnelAuditKPIs />

        {/* Audit Table Wrap */}
        <div className="table-wrap mt-4">
          <table className="audit-table">
            <thead>
              <tr>
                <th className="sticky-1 cursor-pointer select-none" onClick={() => mainTable.handleSort('item_number')}>
                  ITEM NUMBER {mainTable.renderSortIndicator('item_number')}
                </th>
                <th className="sticky-2 cursor-pointer select-none" onClick={() => mainTable.handleSort('position_title')}>
                  POSITION TITLE {mainTable.renderSortIndicator('position_title')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => mainTable.handleSort('position_category')}>
                  CATEGORY {mainTable.renderSortIndicator('position_category')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => mainTable.handleSort('item_status')}>
                  ITEM STATUS {mainTable.renderSortIndicator('item_status')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => mainTable.handleSort('sg')}>
                  SALARY GRADE {mainTable.renderSortIndicator('sg')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => mainTable.handleSort('year_created')}>
                  YEAR CREATED {mainTable.renderSortIndicator('year_created')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => mainTable.handleSort('years_unfilled')}>
                  YEARS UNFILLED {mainTable.renderSortIndicator('years_unfilled')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => mainTable.handleSort('vacancy_aging_status')}>
                  AGING STATUS {mainTable.renderSortIndicator('vacancy_aging_status')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => mainTable.handleSort('position_status')}>
                  POSITION STATUS {mainTable.renderSortIndicator('position_status')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => mainTable.handleSort('name_of_incumbent')}>
                  NAME OF INCUMBENT {mainTable.renderSortIndicator('name_of_incumbent')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => mainTable.handleSort('first_day_of_service')}>
                  FIRST DAY OF SERVICE {mainTable.renderSortIndicator('first_day_of_service')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => mainTable.handleSort('date_of_vacancy')}>
                  DATE OF VACANCY {mainTable.renderSortIndicator('date_of_vacancy')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => mainTable.handleSort('reason_for_vacancy')}>
                  REASON OF VACANCY {mainTable.renderSortIndicator('reason_for_vacancy')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => mainTable.handleSort('status_of_vacancy')}>
                  STATUS OF VACANCY {mainTable.renderSortIndicator('status_of_vacancy')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => mainTable.handleSort('other_remarks')}>
                  REMARKS {mainTable.renderSortIndicator('other_remarks')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => mainTable.handleSort('tentative_date_to_fill_up')}>
                  TENTATIVE DATE OF FIRST DAY OF SERVICE {mainTable.renderSortIndicator('tentative_date_to_fill_up')}
                </th>
                <th className="text-right cursor-pointer select-none" onClick={() => mainTable.handleSort('submission_status')}>
                  SUBMISSION STATUS {mainTable.renderSortIndicator('submission_status')}
                </th>
              </tr>

              {/* Per-Column Filter Input Row */}
              <tr className="filter-row bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                <th className="sticky-1 p-1">
                  <input
                    type="text"
                    placeholder="Search Item #"
                    value={mainTable.columnFilters.item_number || ''}
                    onChange={e => mainTable.handleColumnFilterChange('item_number', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="sticky-2 p-1">
                  <input
                    type="text"
                    placeholder="Search Title"
                    value={mainTable.columnFilters.position_title || ''}
                    onChange={e => mainTable.handleColumnFilterChange('position_title', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Filter Category"
                    value={mainTable.columnFilters.position_category || ''}
                    onChange={e => mainTable.handleColumnFilterChange('position_category', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Filter Item Status"
                    value={mainTable.columnFilters.item_status || ''}
                    onChange={e => mainTable.handleColumnFilterChange('item_status', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Salary Grade"
                    value={mainTable.columnFilters.sg || ''}
                    onChange={e => mainTable.handleColumnFilterChange('sg', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Year"
                    value={mainTable.columnFilters.year_created || ''}
                    onChange={e => mainTable.handleColumnFilterChange('year_created', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Years Unfilled"
                    value={mainTable.columnFilters.years_unfilled || ''}
                    onChange={e => mainTable.handleColumnFilterChange('years_unfilled', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Filter Aging"
                    value={mainTable.columnFilters.vacancy_aging_status || ''}
                    onChange={e => mainTable.handleColumnFilterChange('vacancy_aging_status', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Pos Status"
                    value={mainTable.columnFilters.position_status || ''}
                    onChange={e => mainTable.handleColumnFilterChange('position_status', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Name of Incumbent"
                    value={mainTable.columnFilters.name_of_incumbent || ''}
                    onChange={e => mainTable.handleColumnFilterChange('name_of_incumbent', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="First Day of Service"
                    value={mainTable.columnFilters.first_day_of_service || ''}
                    onChange={e => mainTable.handleColumnFilterChange('first_day_of_service', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Date of Vacancy"
                    value={mainTable.columnFilters.date_of_vacancy || ''}
                    onChange={e => mainTable.handleColumnFilterChange('date_of_vacancy', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Reason of Vacancy"
                    value={mainTable.columnFilters.reason_for_vacancy || ''}
                    onChange={e => mainTable.handleColumnFilterChange('reason_for_vacancy', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Status of Vacancy"
                    value={mainTable.columnFilters.status_of_vacancy || ''}
                    onChange={e => mainTable.handleColumnFilterChange('status_of_vacancy', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Remarks"
                    value={mainTable.columnFilters.other_remarks || ''}
                    onChange={e => mainTable.handleColumnFilterChange('other_remarks', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Tentative Date of First Day of Service"
                    value={mainTable.columnFilters.tentative_date_to_fill_up || ''}
                    onChange={e => mainTable.handleColumnFilterChange('tentative_date_to_fill_up', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Filter Status"
                    value={mainTable.columnFilters.submission_status || ''}
                    onChange={e => mainTable.handleColumnFilterChange('submission_status', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-right focus:outline-none focus:border-teal-500"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-8 text-center text-gray-500 font-medium">
                    No matching personnel audit records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(record => {
                  const recId = getRecordKey(record);
                  const rowEdits = mainStagedEdits[recId] || {};
                  const isDirty = Object.keys(rowEdits).length > 0;

                  const posStatus = resolveMainValue(record, 'position_status', 'POSITION STATUS') || record.item_status || 'UNFILLED';
                  const isFilled = posStatus === 'FILLED';

                  const itemNum = record.item_number || record['ITEM NUMBER'] || 'N/A';
                  const posTitle = record.position_title || record['POSITION TITLE'] || 'N/A';
                  const posCategory = record.position_category || record['POSITION CATEGORY'] || 'N/A';
                  const itemStatusDisplay = record.item_status || record.ITEM_STATUS || posStatus;
                  const sg = record.sg || record.SG || 'N/A';
                  const yearCreated = record.year_created || record['YEAR CREATED'] || 'N/A';
                  const yearsUnfilled = record.years_unfilled || record['YEARS UNFILLED'] || 'N/A';
                  const agingStatus = record.vacancy_aging_status || record['VACANCY AGING STATUS'] || 'N/A';

                  const incumbent = isFilled ? resolveMainValue(record, 'name_of_incumbent', 'NAME OF INCUMBENT') : '';
                  const firstDay = isFilled ? resolveMainValue(record, 'first_day_of_service', 'FIRST DAY OF SERVICE') : '';
                  const dateVacancy = !isFilled ? resolveMainValue(record, 'date_of_vacancy', 'DATE OF VACANCY') : '';
                  const reasonVacancy = !isFilled ? resolveMainValue(record, 'reason_for_vacancy', 'REASON FOR VACANCY') : '';
                  const statusVacancy = !isFilled ? resolveMainValue(record, 'status_of_vacancy', 'STATUS OF VACANCY') : '';
                  const tentativeFill = !isFilled ? resolveMainValue(record, 'tentative_date_to_fill_up', 'TENTATIVE DATE TO FILL-UP') : '';
                  const remarksRaw = resolveMainValue(record, 'other_remarks', 'OTHER REMARKS');
                  const remarksParsed = parseRemarksValue(remarksRaw);

                  const submissionStatus = getSubmissionStatus(record);
                  let rowStatusClass = '';
                  if (submissionStatus === 'Draft') {
                    rowStatusClass = 'row-status-draft';
                  } else if (submissionStatus === 'Incomplete') {
                    rowStatusClass = 'row-status-incomplete';
                  }

                  return (
                    <tr
                      key={recId}
                      className={`hover:bg-blue-50/50 transition cursor-pointer ${rowStatusClass}`}
                      onClick={(e) => {
                        if (!e.target.closest('input, select, button')) {
                          setEditingModalRecord(record);
                        }
                      }}
                    >
                      <td
                        className="sticky-1 border-b font-medium text-gray-900 dark:text-white hover:text-teal-600 hover:underline cursor-pointer"
                        onClick={() => setEditingModalRecord(record)}
                        title="Click to open modal editor"
                      >
                        {itemNum}
                      </td>
                      <td
                        className="sticky-2 border-b text-gray-700 dark:text-gray-200 hover:text-teal-600 hover:underline cursor-pointer font-semibold"
                        onClick={() => setEditingModalRecord(record)}
                        title="Click to open modal editor"
                      >
                        {posTitle}
                      </td>
                      <td className="p-3 border-b table-readonly-cell">{posCategory}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{itemStatusDisplay}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{sg}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{yearCreated}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{yearsUnfilled}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">
                        <span className={`badge-vacancy-status ${getAgingBadgeClass(agingStatus)}`}>{agingStatus}</span>
                      </td>
                      <td className="p-2 border-b text-center">
                        <select
                          className={`row-position-status font-bold rounded px-2 py-1 text-xs border shadow-sm cursor-pointer text-center ${
                            isFilled
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/70 dark:text-green-300 dark:border-green-700'
                              : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-700'
                          }`}
                          value={posStatus}
                          onChange={(e) => handleMainStatusChange(recId, e.target.value)}
                        >
                          <option
                            value="UNFILLED"
                            className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold"
                            style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                          >
                            UNFILLED
                          </option>
                          <option
                            value="FILLED"
                            className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 font-bold"
                            style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                          >
                            FILLED
                          </option>
                        </select>
                      </td>
                      <td className="p-2 border-b">
                        {!isFilled ? (
                          <input type="text" className="form-input form-input-disabled-na border rounded px-2 py-1 text-xs w-full" disabled value="N/A" />
                        ) : (
                          <input
                            type="text"
                            className="form-input uppercase border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300"
                            value={incumbent}
                            onChange={(e) => stageMainEdit(recId, 'name_of_incumbent', e.target.value)}
                            placeholder="INCUMBENT NAME"
                          />
                        )}
                      </td>
                      <td className="p-2 border-b">
                        <FlatpickrInput
                          disabled={!isFilled}
                          value={firstDay}
                          onChange={(val) => stageMainEdit(recId, 'first_day_of_service', val)}
                        />
                      </td>
                      <td className="p-2 border-b">
                        <FlatpickrInput
                          disabled={isFilled}
                          value={dateVacancy}
                          onChange={(val) => stageMainEdit(recId, 'date_of_vacancy', val)}
                        />
                      </td>
                      <td className="p-2 border-b">
                        {isFilled ? (
                          <input type="text" className="form-input form-input-disabled-na border rounded px-2 py-1 text-xs w-full" disabled value="N/A" />
                        ) : (
                          <select
                            className="form-select border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300"
                            value={reasonVacancy}
                            onChange={(e) => stageMainEdit(recId, 'reason_for_vacancy', e.target.value)}
                          >
                            <option value="">Select Reason</option>
                            {REASONS_FOR_VACANCY.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="p-2 border-b">
                        {isFilled ? (
                          <input type="text" className="form-input form-input-disabled-na border rounded px-2 py-1 text-xs w-full" disabled value="N/A" />
                        ) : (
                          <select
                            className="form-select border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300"
                            value={statusVacancy}
                            onChange={(e) => stageMainEdit(recId, 'status_of_vacancy', e.target.value)}
                          >
                            <option value="">Select Status</option>
                            {STATUSES_OF_VACANCY.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="p-2 border-b text-center">
                        <button
                          type="button"
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${remarksParsed.text ? 'bg-teal-100 text-teal-700 border border-teal-300' : 'bg-slate-100 text-slate-500 border border-slate-300'} hover:bg-teal-200 transition cursor-pointer`}
                          onClick={() => setRemarksModalRecordId(recId)}
                          title={remarksParsed.text || 'Add remarks'}
                        >
                          {remarksParsed.text ? '✎' : '+'}
                        </button>
                      </td>
                      <td className="p-2 border-b">
                        <FlatpickrInput
                          disabled={isFilled}
                          value={tentativeFill}
                          onChange={(val) => stageMainEdit(recId, 'tentative_date_to_fill_up', val)}
                          minDate="today"
                          allowInput={false}
                        />
                      </td>
                      <td className="p-3 border-b text-right whitespace-nowrap">
                        {isDirty && (() => {
                          const validation = checkRecordRequiredFields(record, rowEdits);
                          return validation.isDraft ? (
                            <span className="px-2 py-0.5 text-xs font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 rounded border border-teal-300 dark:border-teal-700/60 shadow-xs" title="Draft record ready for saving">
                              Draft
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-700/60" title={`Missing required fields: ${validation.missingFields.join(', ')}`}>
                              Incomplete
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredActiveRecords.length > 0 && (
          <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filteredActiveRecords.length)} of {filteredActiveRecords.length} records
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 ${validPage <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                disabled={validPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Page {validPage} of {totalPages}
              </span>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 ${validPage >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </article>

      {/* Secondary Finalized / Audited Personnel Records Table Panel */}
      <article className="card card-glass p-6">
        <div className="specular-sheen"></div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Finalized / Audited Personnel Records</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Historical logs of successfully completed personnel audits</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFinalizedEditMode(prev => !prev)}
              className={`px-3.5 py-1.5 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
                isFinalizedEditMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'
              }`}
              title={isFinalizedEditMode ? "Disable inline editing for finalized records" : "Enable inline editing for finalized records"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 012.828 0L20.586 7.586a2 2 0 010 2.828L11.828 19H9v-2.828l8.586-8.586z" />
              </svg>
              {isFinalizedEditMode ? 'Disable Edit' : 'Enable Edit'}
            </button>
            {isFinalizedEditMode && (
              <button
                type="button"
                onClick={() => {
                  if (finalizedPendingCount === 0) {
                    alert('No unsaved changes in finalized personnel records.');
                    return;
                  }
                  setIsFinalizedSaveModalOpen(true);
                }}
                disabled={finalizedPendingCount === 0 || saving}
                className={`px-3.5 py-1.5 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 ${
                  finalizedPendingCount > 0 && !saving
                    ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer hover:-translate-y-0.5 active:translate-y-0'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                }`}
                title={finalizedPendingCount > 0 ? "Save pending changes in finalized records" : "No changes to save"}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {saving ? 'Saving...' : finalizedPendingCount > 0 ? `Save ${finalizedPendingCount} ${finalizedPendingCount === 1 ? 'Change' : 'Changes'}` : 'Save Changes'}
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCompletedCSV}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              title="Export finalized records table to CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <span className="px-3 py-1 bg-green-100 border border-green-200 text-green-800 rounded-full text-xs font-semibold">
              {finalizedTable.processedData.length} record{finalizedTable.processedData.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th className="sticky-1 cursor-pointer select-none" onClick={() => finalizedTable.handleSort('item_number')}>
                  ITEM NUMBER {finalizedTable.renderSortIndicator('item_number')}
                </th>
                <th className="sticky-2 cursor-pointer select-none" onClick={() => finalizedTable.handleSort('position_title')}>
                  POSITION TITLE {finalizedTable.renderSortIndicator('position_title')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => finalizedTable.handleSort('position_category')}>
                  CATEGORY {finalizedTable.renderSortIndicator('position_category')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => finalizedTable.handleSort('item_status')}>
                  ITEM STATUS {finalizedTable.renderSortIndicator('item_status')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => finalizedTable.handleSort('sg')}>
                  SALARY GRADE {finalizedTable.renderSortIndicator('sg')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => finalizedTable.handleSort('year_created')}>
                  YEAR CREATED {finalizedTable.renderSortIndicator('year_created')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => finalizedTable.handleSort('years_unfilled')}>
                  YEARS UNFILLED {finalizedTable.renderSortIndicator('years_unfilled')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => finalizedTable.handleSort('vacancy_aging_status')}>
                  AGING STATUS {finalizedTable.renderSortIndicator('vacancy_aging_status')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => finalizedTable.handleSort('position_status')}>
                  POSITION STATUS {finalizedTable.renderSortIndicator('position_status')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => finalizedTable.handleSort('name_of_incumbent')}>
                  NAME OF INCUMBENT {finalizedTable.renderSortIndicator('name_of_incumbent')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => finalizedTable.handleSort('first_day_of_service')}>
                  FIRST DAY OF SERVICE {finalizedTable.renderSortIndicator('first_day_of_service')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => finalizedTable.handleSort('date_of_vacancy')}>
                  DATE OF VACANCY {finalizedTable.renderSortIndicator('date_of_vacancy')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => finalizedTable.handleSort('reason_for_vacancy')}>
                  REASON OF VACANCY {finalizedTable.renderSortIndicator('reason_for_vacancy')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => finalizedTable.handleSort('status_of_vacancy')}>
                  STATUS OF VACANCY {finalizedTable.renderSortIndicator('status_of_vacancy')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => finalizedTable.handleSort('tentative_date_to_fill_up')}>
                  TENTATIVE DATE OF FIRST DAY OF SERVICE {finalizedTable.renderSortIndicator('tentative_date_to_fill_up')}
                </th>
                <th className="text-center cursor-pointer select-none" onClick={() => finalizedTable.handleSort('other_remarks')}>
                  REMARKS {finalizedTable.renderSortIndicator('other_remarks')}
                </th>
                <th className="text-center">
                  ACTIONS
                </th>
              </tr>

              {/* Per-Column Filter Input Row */}
              <tr className="filter-row bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                <th className="sticky-1 p-1">
                  <input
                    type="text"
                    placeholder="Search Item #"
                    value={finalizedTable.columnFilters.item_number || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('item_number', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="sticky-2 p-1">
                  <input
                    type="text"
                    placeholder="Search Title"
                    value={finalizedTable.columnFilters.position_title || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('position_title', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Filter Category"
                    value={finalizedTable.columnFilters.position_category || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('position_category', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Filter Item Status"
                    value={finalizedTable.columnFilters.item_status || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('item_status', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Salary Grade"
                    value={finalizedTable.columnFilters.sg || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('sg', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Year"
                    value={finalizedTable.columnFilters.year_created || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('year_created', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Years Unfilled"
                    value={finalizedTable.columnFilters.years_unfilled || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('years_unfilled', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Filter Aging"
                    value={finalizedTable.columnFilters.vacancy_aging_status || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('vacancy_aging_status', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Pos Status"
                    value={finalizedTable.columnFilters.position_status || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('position_status', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Name of Incumbent"
                    value={finalizedTable.columnFilters.name_of_incumbent || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('name_of_incumbent', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="First Day of Service"
                    value={finalizedTable.columnFilters.first_day_of_service || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('first_day_of_service', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Date of Vacancy"
                    value={finalizedTable.columnFilters.date_of_vacancy || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('date_of_vacancy', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Reason of Vacancy"
                    value={finalizedTable.columnFilters.reason_for_vacancy || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('reason_for_vacancy', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Status of Vacancy"
                    value={finalizedTable.columnFilters.status_of_vacancy || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('status_of_vacancy', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Tentative Date of First Day of Service"
                    value={finalizedTable.columnFilters.tentative_date_to_fill_up || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('tentative_date_to_fill_up', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Remarks"
                    value={finalizedTable.columnFilters.other_remarks || ''}
                    onChange={e => finalizedTable.handleColumnFilterChange('other_remarks', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-normal border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:border-teal-500"
                  />
                </th>
                <th className="p-1"></th>
              </tr>
            </thead>
            <tbody>
              {finalizedTable.processedData.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-8 text-center text-gray-500 font-medium">
                    No finalized audit records yet.
                  </td>
                </tr>
              ) : (
                finalizedTable.processedData.map(record => {
                  const recId = getRecordKey(record);
                  const rowEdits = finalizedStagedEdits[recId] || {};
                  const isDirty = Object.keys(rowEdits).length > 0;

                  const posStatus = resolveFinalizedValue(record, 'position_status', 'POSITION STATUS') || record.item_status || 'UNFILLED';
                  const isFilled = posStatus === 'FILLED';

                  const itemNum = record.item_number || record['ITEM NUMBER'] || 'N/A';
                  const posTitle = record.position_title || record['POSITION TITLE'] || 'N/A';
                  const posCategory = record.position_category || record['POSITION CATEGORY'] || 'N/A';
                  const itemStatusDisplay = record.item_status || record.ITEM_STATUS || posStatus;
                  const sg = record.sg || record.SG || 'N/A';
                  const yearCreated = record.year_created || record['YEAR CREATED'] || 'N/A';
                  const yearsUnfilled = record.years_unfilled || record['YEARS UNFILLED'] || 'N/A';
                  const agingStatus = record.vacancy_aging_status || record['VACANCY AGING STATUS'] || 'N/A';

                  const incumbent = isFilled ? resolveFinalizedValue(record, 'name_of_incumbent', 'NAME OF INCUMBENT') : '';
                  const firstDay = isFilled ? resolveFinalizedValue(record, 'first_day_of_service', 'FIRST DAY OF SERVICE') : '';
                  const dateVacancy = !isFilled ? resolveFinalizedValue(record, 'date_of_vacancy', 'DATE OF VACANCY') : '';
                  const reasonVacancy = !isFilled ? resolveFinalizedValue(record, 'reason_for_vacancy', 'REASON FOR VACANCY') : '';
                  const statusVacancy = !isFilled ? resolveFinalizedValue(record, 'status_of_vacancy', 'STATUS OF VACANCY') : '';
                  const tentativeFill = !isFilled ? resolveFinalizedValue(record, 'tentative_date_to_fill_up', 'TENTATIVE DATE TO FILL-UP') : '';
                  const remarksRaw = resolveFinalizedValue(record, 'other_remarks', 'OTHER REMARKS');
                  const remarksParsed = parseRemarksValue(remarksRaw);

                  if (!isFinalizedEditMode) {
                    return (
                      <tr key={recId} className={`hover:bg-green-50/40 transition ${isDirty ? 'bg-amber-50/40 cell-dirty' : ''}`}>
                        <td className="sticky-1 border-b font-medium text-gray-900 dark:text-white">{itemNum}</td>
                        <td className="sticky-2 border-b text-gray-700 dark:text-gray-200">{posTitle}</td>
                        <td className="p-3 border-b table-readonly-cell">{posCategory}</td>
                        <td className="p-3 border-b table-readonly-cell text-center">{itemStatusDisplay}</td>
                        <td className="p-3 border-b table-readonly-cell text-center">{sg}</td>
                        <td className="p-3 border-b table-readonly-cell text-center">{yearCreated}</td>
                        <td className="p-3 border-b table-readonly-cell text-center">{yearsUnfilled}</td>
                        <td className="p-3 border-b table-readonly-cell text-center">
                          <span className={`badge-vacancy-status ${getAgingBadgeClass(agingStatus)}`}>
                            {agingStatus}
                          </span>
                        </td>
                        <td className="p-3 border-b table-readonly-cell text-center">{posStatus}</td>
                        <td className="p-3 border-b table-readonly-cell">{isFilled ? (incumbent || 'N/A') : 'N/A'}</td>
                        <td className="p-3 border-b table-readonly-cell">{isFilled ? (firstDay || 'N/A') : 'N/A'}</td>
                        <td className="p-3 border-b table-readonly-cell">{!isFilled ? (dateVacancy || 'N/A') : 'N/A'}</td>
                        <td className="p-3 border-b table-readonly-cell">{!isFilled ? (reasonVacancy || 'N/A') : 'N/A'}</td>
                        <td className="p-3 border-b table-readonly-cell">{!isFilled ? (statusVacancy || 'N/A') : 'N/A'}</td>
                        <td className="p-3 border-b table-readonly-cell">{!isFilled ? (tentativeFill || 'N/A') : 'N/A'}</td>
                        <td className="p-3 border-b table-readonly-cell text-center">{remarksParsed.text || 'N/A'}</td>
                        <td className="p-2 border-b text-center">
                          <button
                            type="button"
                            onClick={() => setUnfinalizeTargetRecord(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 transition cursor-pointer"
                            title="Clear finalized audit data and move this record back to the Main Panel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={recId}
                      className={`hover:bg-blue-50/50 transition cursor-pointer ${isDirty ? 'bg-amber-50/40 cell-dirty' : ''}`}
                      onClick={(e) => {
                        if (!e.target.closest('input, select, button')) {
                          setEditingModalRecord(record);
                        }
                      }}
                    >
                      <td
                        className="sticky-1 border-b font-medium text-gray-900 dark:text-white hover:text-teal-600 hover:underline cursor-pointer"
                        onClick={() => setEditingModalRecord(record)}
                        title="Click to open modal editor"
                      >
                        {itemNum}
                      </td>
                      <td
                        className="sticky-2 border-b text-gray-700 dark:text-gray-200 hover:text-teal-600 hover:underline cursor-pointer font-semibold"
                        onClick={() => setEditingModalRecord(record)}
                        title="Click to open modal editor"
                      >
                        {posTitle}
                      </td>
                      <td className="p-3 border-b table-readonly-cell">{posCategory}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{itemStatusDisplay}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{sg}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{yearCreated}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{yearsUnfilled}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">
                        <span className={`badge-vacancy-status ${getAgingBadgeClass(agingStatus)}`}>{agingStatus}</span>
                      </td>
                      <td className="p-2 border-b text-center">
                        <select
                          className={`row-position-status font-bold rounded px-2 py-1 text-xs border shadow-sm cursor-pointer text-center ${
                            isFilled
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/70 dark:text-green-300 dark:border-green-700'
                              : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-700'
                          }`}
                          value={posStatus}
                          onChange={(e) => handleFinalizedStatusChange(recId, e.target.value)}
                        >
                          <option
                            value="UNFILLED"
                            className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold"
                            style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                          >
                            UNFILLED
                          </option>
                          <option
                            value="FILLED"
                            className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 font-bold"
                            style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                          >
                            FILLED
                          </option>
                        </select>
                      </td>
                      <td className="p-2 border-b">
                        {!isFilled ? (
                          <input type="text" className="form-input form-input-disabled-na border rounded px-2 py-1 text-xs w-full" disabled value="N/A" />
                        ) : (
                          <input
                            type="text"
                            className="form-input uppercase border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300"
                            value={incumbent}
                            onChange={(e) => stageFinalizedEdit(recId, 'name_of_incumbent', e.target.value)}
                            placeholder="INCUMBENT NAME"
                          />
                        )}
                      </td>
                      <td className="p-2 border-b">
                        <FlatpickrInput
                          disabled={!isFilled}
                          value={firstDay}
                          onChange={(val) => stageFinalizedEdit(recId, 'first_day_of_service', val)}
                        />
                      </td>
                      <td className="p-2 border-b">
                        <FlatpickrInput
                          disabled={isFilled}
                          value={dateVacancy}
                          onChange={(val) => stageFinalizedEdit(recId, 'date_of_vacancy', val)}
                        />
                      </td>
                      <td className="p-2 border-b">
                        {isFilled ? (
                          <input type="text" className="form-input form-input-disabled-na border rounded px-2 py-1 text-xs w-full" disabled value="N/A" />
                        ) : (
                          <select
                            className="form-select border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300"
                            value={reasonVacancy}
                            onChange={(e) => stageFinalizedEdit(recId, 'reason_for_vacancy', e.target.value)}
                          >
                            <option value="">Select Reason</option>
                            {REASONS_FOR_VACANCY.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="p-2 border-b">
                        {isFilled ? (
                          <input type="text" className="form-input form-input-disabled-na border rounded px-2 py-1 text-xs w-full" disabled value="N/A" />
                        ) : (
                          <select
                            className="form-select border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300"
                            value={statusVacancy}
                            onChange={(e) => stageFinalizedEdit(recId, 'status_of_vacancy', e.target.value)}
                          >
                            <option value="">Select Status</option>
                            {STATUSES_OF_VACANCY.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="p-2 border-b text-center">
                        <button
                          type="button"
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${remarksParsed.text ? 'bg-teal-100 text-teal-700 border border-teal-300' : 'bg-slate-100 text-slate-500 border border-slate-300'} hover:bg-teal-200 transition cursor-pointer`}
                          onClick={() => setRemarksModalRecordId(recId)}
                          title={remarksParsed.text || 'Add remarks'}
                        >
                          {remarksParsed.text ? '✎' : '+'}
                        </button>
                      </td>
                      <td className="p-2 border-b">
                        <FlatpickrInput
                          disabled={isFilled}
                          value={tentativeFill}
                          onChange={(val) => stageFinalizedEdit(recId, 'tentative_date_to_fill_up', val)}
                          minDate="today"
                          allowInput={false}
                        />
                      </td>
                      <td className="p-2 border-b text-center">
                        <button
                          type="button"
                          onClick={() => setUnfinalizeTargetRecord(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 transition cursor-pointer"
                          title="Clear finalized audit data and move this record back to the Main Panel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Row Remarks Edit Modal */}
      <RemarksModal
        isOpen={!!remarksModalRecordId}
        onClose={() => setRemarksModalRecordId(null)}
        recordId={remarksModalRecordId}
        currentRemarksValue={(() => {
          if (!remarksModalRecordId) return '';
          const rec = records.find(r => String(getRecordKey(r)) === String(remarksModalRecordId));
          const isComp = rec ? completedRecords.some(c => String(getRecordKey(c)) === String(getRecordKey(rec))) : false;
          return isComp ? resolveFinalizedValue(rec, 'other_remarks', 'OTHER REMARKS') : resolveMainValue(rec, 'other_remarks', 'OTHER REMARKS');
        })()}
        onSave={(id, newPayload) => {
          const recKey = id || remarksModalRecordId;
          const isComp = completedRecords.some(c => String(getRecordKey(c)) === String(recKey));
          if (isComp) {
            stageFinalizedEdit(recKey, 'other_remarks', newPayload);
          } else {
            stageMainEdit(recKey, 'other_remarks', newPayload);
          }
        }}
      />

      {/* Row Click Pre-filled Edit Modal Form */}
      {(() => {
        const modalRecId = getRecordKey(editingModalRecord);
        const isCompletedRowModal = editingModalRecord ? completedRecords.some(r => String(getRecordKey(r)) === String(modalRecId)) : false;
        return (
          <RowEditModal
            isOpen={!!editingModalRecord}
            onClose={() => setEditingModalRecord(null)}
            record={editingModalRecord}
            stagedEdits={isCompletedRowModal ? finalizedStagedEdits : mainStagedEdits}
            onFieldChange={(id, f, v) => isCompletedRowModal ? stageFinalizedEdit(id || modalRecId, f, v) : stageMainEdit(id || modalRecId, f, v)}
            onStatusChange={(id, s) => isCompletedRowModal ? handleFinalizedStatusChange(id || modalRecId, s) : handleMainStatusChange(id || modalRecId, s)}
          />
        );
      })()}

      {/* Undo Pending Changes Modal */}
      <UndoChangesModal
        isOpen={isUndoModalOpen}
        onClose={() => setIsUndoModalOpen(false)}
        stagedEdits={mainStagedEdits}
        records={records}
        onUndoAll={() => setMainStagedEdits({})}
        onUndoSingleRecord={(id) => setMainStagedEdits(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        })}
      />

      {/* Finalized Audit Records Save Confirmation Modal */}
      <SaveFinalizedEditsModal
        isOpen={isFinalizedSaveModalOpen}
        onClose={() => setIsFinalizedSaveModalOpen(false)}
        onConfirm={handleConfirmFinalizedSave}
        stagedEdits={finalizedStagedEdits}
        records={records}
        saving={saving}
      />

      {/* Un-finalize (Clear Audit Data) Confirmation Modal */}
      <UnfinalizeConfirmModal
        isOpen={!!unfinalizeTargetRecord}
        onClose={() => setUnfinalizeTargetRecord(null)}
        onConfirm={handleConfirmUnfinalize}
        record={unfinalizeTargetRecord}
        processing={isUnfinalizing}
      />
    </div>
  );
};
