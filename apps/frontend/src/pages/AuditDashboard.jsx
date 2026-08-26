import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PersonnelAuditKPIs } from '../components/PersonnelAuditKPIs';
import { RemarksModal, parseRemarksValue } from '../components/RemarksModal';
import { RowEditModal } from '../components/RowEditModal';
import { FlatpickrInput } from '../components/FlatpickrInput';
import { REASONS_FOR_VACANCY, STATUSES_OF_VACANCY } from '../utils/config';

export const AuditDashboard = () => {
  const {
    records,
    regions,
    stagedEdits,
    stageEdit,
    saveChanges,
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
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;

  // Compute pending edits count
  const pendingCount = Object.keys(stagedEdits).length;

  const handleSave = async () => {
    if (pendingCount === 0) return;
    setSaving(true);
    try {
      await saveChanges();
      alert('All personnel audit changes saved successfully!');
    } catch (err) {
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Helper to resolve row field value with staged edits priority
  const resolveValue = (record, field, aliasKey) => {
    const rowEdits = stagedEdits[record.id] || {};
    if (rowEdits[field] !== undefined) return rowEdits[field];
    if (record[field] !== undefined && record[field] !== null) return record[field];
    if (aliasKey && record[aliasKey] !== undefined && record[aliasKey] !== null) return record[aliasKey];
    return '';
  };

  // Field change handler
  const handleFieldChange = (recordId, field, val) => {
    const cleanVal = field === 'name_of_incumbent' && typeof val === 'string' ? val.toUpperCase() : val;
    stageEdit(recordId, field, cleanVal);
  };

  // Position status toggle handler
  const handleStatusChange = (recordId, newStatus) => {
    if (newStatus === 'UNFILLED') {
      stageEdit(recordId, 'position_status', 'UNFILLED');
      stageEdit(recordId, 'name_of_incumbent', '');
      stageEdit(recordId, 'first_day_of_service', '');
    } else if (newStatus === 'FILLED') {
      stageEdit(recordId, 'position_status', 'FILLED');
      stageEdit(recordId, 'date_of_vacancy', '');
      stageEdit(recordId, 'reason_for_vacancy', '');
      stageEdit(recordId, 'status_of_vacancy', '');
      stageEdit(recordId, 'tentative_date_to_fill_up', '');
    }
  };

  // Separate active (uncompleted) rows and completed rows
  const activeRecords = useMemo(() => {
    return records.filter(r => !isRecordCompleted(r));
  }, [records, isRecordCompleted]);

  const completedRecords = useMemo(() => {
    return records.filter(isRecordCompleted);
  }, [records, isRecordCompleted]);

  // Filter active records by search, region, status, and category
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

  // Paginated active records slice
  const totalPages = Math.max(1, Math.ceil(filteredActiveRecords.length / PAGE_SIZE));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (validPage - 1) * PAGE_SIZE;
  const paginatedRecords = filteredActiveRecords.slice(startIdx, startIdx + PAGE_SIZE);

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
            <button
              type="button"
              onClick={handleSave}
              disabled={pendingCount === 0 || saving}
              className={pendingCount > 0 ? 'btn-save-active' : 'btn-save-disabled'}
            >
              {saving ? 'Saving...' : pendingCount > 0 ? `Save ${pendingCount} ${pendingCount === 1 ? 'Change' : 'Changes'}` : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Personnel Audit KPI Category Tabs */}
        <PersonnelAuditKPIs />

        {/* Filter Toolbar */}
        <div className="toolbar relative z-10 my-4 flex gap-3 flex-wrap">
          <select
            className="field text-sm"
            value={selectedRegionFilter}
            onChange={(e) => setSelectedRegionFilter(e.target.value)}
          >
            <option value="">All Regions</option>
            {regions.map(r => {
              const val = r.name || r.id;
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>

          <select
            className="field text-sm"
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="UNFILLED">UNFILLED</option>
            <option value="FILLED">FILLED</option>
          </select>
        </div>

        {/* Audit Table Wrap */}
        <div className="table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th className="sticky-1">ITEM NUMBER</th>
                <th className="sticky-2">POSITION TITLE</th>
                <th>CATEGORY</th>
                <th>ITEM STATUS</th>
                <th className="text-center">SG</th>
                <th className="text-center">YEAR CREATED</th>
                <th className="text-center">YEARS UNFILLED</th>
                <th>AGING STATUS</th>
                <th>POSITION STATUS</th>
                <th>INCUMBENT</th>
                <th>FIRST DAY</th>
                <th>DATE VACANCY</th>
                <th>REASON</th>
                <th>STATUS VACANCY</th>
                <th className="text-center">REMARKS</th>
                <th>TENTATIVE FILL</th>
                <th className="text-right">ACTIONS</th>
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
                  const rowEdits = stagedEdits[record.id] || {};
                  const isDirty = Object.keys(rowEdits).length > 0;

                  const posStatus = resolveValue(record, 'position_status', 'POSITION STATUS') || record.item_status || 'UNFILLED';
                  const isFilled = posStatus === 'FILLED';

                  const itemNum = record.item_number || record['ITEM NUMBER'] || 'N/A';
                  const posTitle = record.position_title || record['POSITION TITLE'] || 'N/A';
                  const posCategory = record.position_category || record['POSITION CATEGORY'] || 'N/A';
                  const itemStatusDisplay = record.item_status || record.ITEM_STATUS || posStatus;
                  const sg = record.sg || record.SG || 'N/A';
                  const yearCreated = record.year_created || record['YEAR CREATED'] || 'N/A';
                  const yearsUnfilled = record.years_unfilled || record['YEARS UNFILLED'] || 'N/A';
                  const agingStatus = record.vacancy_aging_status || record['VACANCY AGING STATUS'] || 'N/A';

                  const incumbent = isFilled ? resolveValue(record, 'name_of_incumbent', 'NAME OF INCUMBENT') : '';
                  const firstDay = isFilled ? resolveValue(record, 'first_day_of_service', 'FIRST DAY OF SERVICE') : '';
                  const dateVacancy = !isFilled ? resolveValue(record, 'date_of_vacancy', 'DATE OF VACANCY') : '';
                  const reasonVacancy = !isFilled ? resolveValue(record, 'reason_for_vacancy', 'REASON FOR VACANCY') : '';
                  const statusVacancy = !isFilled ? resolveValue(record, 'status_of_vacancy', 'STATUS OF VACANCY') : '';
                  const tentativeFill = !isFilled ? resolveValue(record, 'tentative_date_to_fill_up', 'TENTATIVE DATE TO FILL-UP') : '';
                  const remarksRaw = resolveValue(record, 'other_remarks', 'OTHER REMARKS');
                  const remarksParsed = parseRemarksValue(remarksRaw);

                  return (
                    <tr
                      key={record.id}
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
                      <td className="p-3 border-b table-readonly-cell">{itemStatusDisplay}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{sg}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{yearCreated}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{yearsUnfilled}</td>
                      <td className="p-3 border-b table-readonly-cell">
                        <span className={`badge-vacancy-status ${getAgingBadgeClass(agingStatus)}`}>{agingStatus}</span>
                      </td>
                      <td className="p-2 border-b">
                        <select
                          className={`row-position-status font-bold rounded px-2 py-1 text-xs border border-slate-300 shadow-sm ${isFilled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} cursor-pointer`}
                          value={posStatus}
                          onChange={(e) => handleStatusChange(record.id, e.target.value)}
                        >
                          <option value="UNFILLED">UNFILLED</option>
                          <option value="FILLED">FILLED</option>
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
                            onChange={(e) => handleFieldChange(record.id, 'name_of_incumbent', e.target.value)}
                            placeholder="INCUMBENT NAME"
                          />
                        )}
                      </td>
                      <td className="p-2 border-b">
                        <FlatpickrInput
                          disabled={!isFilled}
                          value={firstDay}
                          onChange={(val) => handleFieldChange(record.id, 'first_day_of_service', val)}
                        />
                      </td>
                      <td className="p-2 border-b">
                        <FlatpickrInput
                          disabled={isFilled}
                          value={dateVacancy}
                          onChange={(val) => handleFieldChange(record.id, 'date_of_vacancy', val)}
                        />
                      </td>
                      <td className="p-2 border-b">
                        {isFilled ? (
                          <input type="text" className="form-input form-input-disabled-na border rounded px-2 py-1 text-xs w-full" disabled value="N/A" />
                        ) : (
                          <select
                            className="form-select border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300"
                            value={reasonVacancy}
                            onChange={(e) => handleFieldChange(record.id, 'reason_for_vacancy', e.target.value)}
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
                            onChange={(e) => handleFieldChange(record.id, 'status_of_vacancy', e.target.value)}
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
                          onClick={() => setRemarksModalRecordId(record.id)}
                          title={remarksParsed.text || 'Add remarks'}
                        >
                          {remarksParsed.text ? '✎' : '+'}
                        </button>
                      </td>
                      <td className="p-2 border-b">
                        <FlatpickrInput
                          disabled={isFilled}
                          value={tentativeFill}
                          onChange={(val) => handleFieldChange(record.id, 'tentative_date_to_fill_up', val)}
                          minDate="today"
                          allowInput={false}
                        />
                      </td>
                      <td className="p-3 border-b text-right whitespace-nowrap">
                        {isDirty && <span className="text-xs text-amber-600 font-semibold">Uncommitted</span>}
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
          <span className="px-3 py-1 bg-green-100 border border-green-200 text-green-800 rounded-full text-xs font-semibold">
            {completedRecords.length} record{completedRecords.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th className="sticky-1">ITEM NUMBER</th>
                <th className="sticky-2">POSITION TITLE</th>
                <th>CATEGORY</th>
                <th>ITEM STATUS</th>
                <th className="text-center">SG</th>
                <th className="text-center">YEAR CREATED</th>
                <th className="text-center">YEARS UNFILLED</th>
                <th>AGING STATUS</th>
                <th>POSITION STATUS</th>
                <th>NAME OF INCUMBENT</th>
                <th>FIRST DAY OF SERVICE</th>
                <th>DATE OF VACANCY</th>
                <th>REASON FOR VACANCY</th>
                <th>STATUS OF VACANCY</th>
                <th>TENTATIVE DATE OF FIRST DAY OF SERVICE</th>
                <th>OTHER REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {completedRecords.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-gray-500 font-medium">
                    No finalized audit records yet.
                  </td>
                </tr>
              ) : (
                completedRecords.map(record => {
                  const posStatus = record.position_status || record['POSITION STATUS'] || record.item_status || 'UNFILLED';
                  const isFilled = posStatus === 'FILLED';
                  const remarksParsed = parseRemarksValue(record.other_remarks || record['OTHER REMARKS'] || '');

                  return (
                    <tr key={record.id} className="hover:bg-green-50/40 transition">
                      <td className="sticky-1 border-b font-medium text-gray-900 dark:text-white">{record.item_number || record['ITEM NUMBER'] || 'N/A'}</td>
                      <td className="sticky-2 border-b text-gray-700 dark:text-gray-200">{record.position_title || record['POSITION TITLE'] || 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell">{record.position_category || record['POSITION CATEGORY'] || 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell">{record.item_status || record.ITEM_STATUS || posStatus}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{record.sg || record.SG || 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{record.year_created || record['YEAR CREATED'] || 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell text-center">{record.years_unfilled || record['YEARS UNFILLED'] || 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell">
                        <span className={`badge-vacancy-status ${getAgingBadgeClass(record.vacancy_aging_status || record['VACANCY AGING STATUS'])}`}>
                          {record.vacancy_aging_status || record['VACANCY AGING STATUS'] || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 border-b table-readonly-cell">{posStatus}</td>
                      <td className="p-3 border-b table-readonly-cell">{isFilled ? (record.name_of_incumbent || record['NAME OF INCUMBENT'] || 'N/A') : 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell">{isFilled ? (record.first_day_of_service || record['FIRST DAY OF SERVICE'] || 'N/A') : 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell">{!isFilled ? (record.date_of_vacancy || record['DATE OF VACANCY'] || 'N/A') : 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell">{!isFilled ? (record.reason_for_vacancy || record['REASON FOR VACANCY'] || 'N/A') : 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell">{!isFilled ? (record.status_of_vacancy || record['STATUS OF VACANCY'] || 'N/A') : 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell">{!isFilled ? (record.tentative_date_to_fill_up || record['TENTATIVE DATE TO FILL-UP'] || 'N/A') : 'N/A'}</td>
                      <td className="p-3 border-b table-readonly-cell">{remarksParsed.text || 'N/A'}</td>
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
        currentRemarksValue={remarksModalRecordId ? resolveValue(records.find(r => r.id === remarksModalRecordId) || {}, 'other_remarks', 'OTHER REMARKS') : ''}
        onSave={(id, newPayload) => handleFieldChange(id, 'other_remarks', newPayload)}
      />

      {/* Row Click Pre-filled Edit Modal Form */}
      <RowEditModal
        isOpen={!!editingModalRecord}
        onClose={() => setEditingModalRecord(null)}
        record={editingModalRecord}
        stagedEdits={stagedEdits}
        onFieldChange={handleFieldChange}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};
