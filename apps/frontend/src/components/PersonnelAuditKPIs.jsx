import React from "react";
import { useApp } from "../context/AppContext";

export function PersonnelAuditKPIs() {
  const {
    records,
    searchQuery,
    selectedRegionFilter,
    selectedStatusFilter,
    activeCategoryFilter,
    setActiveCategoryFilter,
    isRecordCompleted
  } = useApp();

  // Dynamically filter records according to active region, status, and search filters
  // so category KPI counts and accomplishment rates respond live to filters.
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
        const total = catRows.length;
        const audited = catRows.filter(isRecordCompleted).length;
        const pctRaw = total > 0 ? (audited / total) * 100 : 0;
        const pct = parseFloat(pctRaw.toFixed(1));
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
            <strong>{total}</strong>
            <div className="kpi-progress-wrap">
              <div className="kpi-progress-track">
                <div
                  className="kpi-progress-fill"
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
              <span className="completion-sticker">
                {pct.toFixed(1)}% accomplishment rate
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default PersonnelAuditKPIs;
