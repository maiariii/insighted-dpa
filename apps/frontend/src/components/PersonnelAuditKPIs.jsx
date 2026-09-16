import React from "react";
import { useApp } from "../context/AppContext";

export function PersonnelAuditKPIs({ mainStagedEdits: propStagedEdits } = {}) {
  const {
    records,
    searchQuery,
    selectedRegionFilter,
    selectedStatusFilter,
    activeCategoryFilter,
    setActiveCategoryFilter,
    stagedEdits: contextStagedEdits,
    isRecordCompleted
  } = useApp();

  // Helper to safely resolve a record's identification key
  const getRecordKey = (r) => {
    if (!r) return '';
    return r.id || r['ITEM NUMBER'] || r.item_number || '';
  };

  // Determine active staged edits (prefer prop, then context, then localStorage fallback)
  const activeStagedEdits = propStagedEdits || contextStagedEdits || (() => {
    try {
      const raw = localStorage.getItem('auditDashboard.mainStagedEdits');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  // Dynamically filter records according to active region, status, and search filters
  // so category KPI counts and filling-up rates respond live to filters.
  const filteredRecords = (records || []).filter(r => {
    const itemNum = (r.item_number || r['ITEM NUMBER'] || '').toString().toLowerCase();
    const posTitle = (r.position_title || r['POSITION TITLE'] || '').toString().toLowerCase();
    const regionVal = (r.region_id || r.region_name || r.REGION || r['REGION'] || '').toString().toLowerCase();
    const statusVal = (r.item_status || r.ITEM_STATUS || r.position_status || r['POSITION STATUS'] || '').toString();

    const matchesSearch = !searchQuery || itemNum.includes(searchQuery.toLowerCase()) || posTitle.includes(searchQuery.toLowerCase());
    const matchesRegion = !selectedRegionFilter || regionVal.includes(selectedRegionFilter.toLowerCase());
    const matchesStatus = !selectedStatusFilter || statusVal.toLowerCase() === selectedStatusFilter.toLowerCase();

    return matchesSearch && matchesRegion && matchesStatus;
  });

  const categories = [
    { key: 'Teaching', label: 'Teaching Personnel' },
    { key: 'Non-Teaching', label: 'Non-Teaching Personnel' },
    { key: 'Teaching-Related', label: 'Teaching-Related Personnel' }
  ];

  return (
    <div className="personnel-kpi-grid relative z-10">
      {categories.map(({ key, label }) => {
        const catRows = filteredRecords.filter(
          r => (r.position_category || r['POSITION CATEGORY']) === key
        );

        let filled = 0;
        let auditedUnfilled = 0;
        catRows.forEach(r => {
          const recKey = getRecordKey(r);
          const staged = activeStagedEdits ? (activeStagedEdits[recKey] || activeStagedEdits[r.id] || activeStagedEdits[r.item_number] || activeStagedEdits[r['ITEM NUMBER']]) : null;
          const stagedStatus = staged?.position_status;
          const posStatus = (stagedStatus || r.position_status || r['POSITION STATUS'] || '').toString().trim().toUpperCase();

          if (posStatus === 'FILLED') {
            filled++;
          } else if (posStatus === 'UNFILLED') {
            const isAudited = staged?.is_audited !== undefined
              ? staged.is_audited
              : (r.is_audited === true || r.is_audited === 1 || String(r.item_status || r.ITEM_STATUS).toLowerCase() === 'audited' || (isRecordCompleted && isRecordCompleted(r)));
            if (isAudited) {
              auditedUnfilled++;
            }
          }
        });

        const totalAuditedUnfilled = auditedUnfilled;
        const pctRaw = totalAuditedUnfilled > 0 ? (filled / totalAuditedUnfilled) * 100 : 0;
        const pct = parseFloat(pctRaw.toFixed(1));
        const pctDisplay = pct.toFixed(1);
        const isActive = activeCategoryFilter === key;

        return (
          <button
            key={key}
            type="button"
            className={`personnel-tab kpi card-glass ${isActive ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter(isActive ? '' : key)}
          >
            <div className="specular-sheen"></div>
            <label>{label}</label>
            <strong>{Number(totalAuditedUnfilled).toLocaleString()}</strong>
            <div className="kpi-progress-wrap">
              <div className="kpi-progress-track">
                <div
                  className="kpi-progress-fill"
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                ></div>
                <span className={`kpi-progress-percent ${pct >= 45 ? 'on-fill' : 'on-track'}`}>
                  {pctDisplay}%
                </span>
              </div>
              <span className="completion-sticker">
                {Number(filled).toLocaleString()} filled of {Number(totalAuditedUnfilled).toLocaleString()} total audited unfilled plantilla items
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default PersonnelAuditKPIs;
