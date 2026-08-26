import { BADGE_CLASSES } from './config.js';
import { StateManager } from './state.js';

export const UI = {
  getBadgeClass(status) {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = status.toString().toLowerCase();
    return BADGE_CLASSES[s] || 'bg-blue-50 text-blue-700 border border-blue-200';
  },

  getAgingBadgeClass(agingStatus) {
    if (!agingStatus) return 'badge-vacancy-aging';
    const s = agingStatus.toString().toLowerCase();
    if (s.includes('long-term') || s.includes('unfilled')) return 'badge-vacancy-long-term';
    if (s.includes('extended')) return 'badge-vacancy-extended';
    if (s.includes('newly created')) return 'badge-vacancy-newly-created';
    if (s.includes('new')) return 'badge-vacancy-new';
    return 'badge-vacancy-aging';
  },

  renderRows(records = [], stagedEdits = {}) {
    const container = document.getElementById('audit-table-body');
    if (!container) return;

    if (!records || records.length === 0) {
      container.innerHTML = `<tr><td colspan="16" class="p-8 text-center text-gray-500 font-medium">No matching personnel audit records found.</td></tr>`;
      return;
    }

    container.innerHTML = records.map(record => {
      const rowEdits = stagedEdits[record.id] || {};
      const isDirty = Object.keys(rowEdits).length > 0;
      
      const itemStatus = rowEdits.item_status || record.item_status || record.POSITION_STATUS || 'UNFILLED';
      const isComplete = itemStatus === 'FILLED';
      const agingStatus = record.vacancy_aging_status || record['VACANCY AGING STATUS'] || 'N/A';
      const positionTitle = record.position_title || record['POSITION TITLE'] || 'N/A';
      const positionCat = record.position_category || record['POSITION CATEGORY'] || 'N/A';
      const itemNumber = record.item_number || record['ITEM NUMBER'] || 'N/A';
      const sg = record.sg || record.SG || 'N/A';
      const yearCreated = record.year_created || record['YEAR CREATED'] || 'N/A';
      const yearsUnfilled = record.years_unfilled || record['YEARS UNFILLED'] || 'N/A';
      const incumbent = rowEdits.name_of_incumbent || record.name_of_incumbent || record['NAME OF INCUMBENT'] || '';
      const firstDay = rowEdits.first_day_of_service || record.first_day_of_service || record['FIRST DAY OF SERVICE'] || '';
      const dateVacancy = rowEdits.date_of_vacancy || record.date_of_vacancy || record['DATE OF VACANCY'] || '';
      const reasonVacancy = rowEdits.reason_for_vacancy || record.reason_for_vacancy || record['REASON FOR VACANCY'] || '';
      const statusVacancy = rowEdits.status_of_vacancy || record.status_of_vacancy || record['STATUS OF VACANCY'] || '';
      const remarks = rowEdits.other_remarks || record.other_remarks || record['OTHER REMARKS'] || '';
      const tentativeFill = rowEdits.tentative_date_to_fill || record.tentative_date_to_fill || record['TENTATIVE DATE TO FILL-UP'] || '';

      return `
        <tr class="hover:bg-blue-50/50 transition cursor-pointer ${isDirty ? 'bg-amber-50/40 cell-dirty' : ''}" data-id="${record.id}">
          <td class="status-col border-b">
            <span class="row-status ${isComplete ? 'complete' : 'incomplete'}">
              ${isComplete ? 'FILLED' : 'UNFILLED'}
            </span>
          </td>
          <td class="sticky-1 border-b font-medium text-gray-900 dark:text-white">${itemNumber}</td>
          <td class="sticky-2 border-b text-gray-700 dark:text-gray-200">${positionTitle}</td>
          <td class="p-3 border-b text-gray-600 dark:text-gray-300">${positionCat}</td>
          <td class="p-3 border-b text-center">${sg}</td>
          <td class="p-3 border-b text-center">${yearCreated}</td>
          <td class="p-3 border-b text-center">${yearsUnfilled}</td>
          <td class="p-3 border-b">
            <span class="badge-vacancy-status ${this.getAgingBadgeClass(agingStatus)}">${agingStatus}</span>
          </td>
          <td class="p-3 border-b">${incumbent}</td>
          <td class="p-3 border-b">${firstDay}</td>
          <td class="p-3 border-b">${dateVacancy}</td>
          <td class="p-3 border-b">${reasonVacancy}</td>
          <td class="p-3 border-b">${statusVacancy}</td>
          <td class="p-3 border-b">${remarks}</td>
          <td class="p-3 border-b">${tentativeFill}</td>
          <td class="p-3 border-b text-right whitespace-nowrap">
            ${isDirty ? '<span class="text-xs text-amber-600 font-semibold mr-2">Uncommitted</span>' : ''}
            <button class="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 edit-trigger" data-id="${record.id}">Edit</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderCompletionStickers(kpis = {}) {
    const totalEl = document.getElementById('kpi-total-items');
    const auditedEl = document.getElementById('kpi-audited-items');
    const progressEl = document.getElementById('kpi-progress-bar');
    const stickerTextEl = document.getElementById('kpi-progress-text');

    const total = kpis.total || kpis.total_items || 0;
    const audited = kpis.audited || kpis.audited_items || 0;

    if (totalEl) totalEl.textContent = Number(total).toLocaleString();
    if (auditedEl) auditedEl.textContent = Number(audited).toLocaleString();

    const percent = total > 0 ? Math.min(100, Math.round((audited / total) * 100)) : 0;

    if (progressEl) {
      progressEl.style.width = `${percent}%`;
    }
    if (stickerTextEl) {
      stickerTextEl.textContent = `${percent}% Audited`;
    }
  },

  renderInterventions(interventions = []) {
    const container = document.getElementById('interventions-card-grid');
    if (!container) return;

    if (!interventions || interventions.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-12 text-center border-2 border-dashed border-gray-300 rounded-xl bg-white/40">
          <p class="text-gray-500 font-medium">No interventions submitted yet for vacant positions.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = interventions.map(item => `
      <div class="p-6 bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition">
        <div class="flex items-start justify-between mb-4">
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
            ${item.area_of_concern || 'General Concern'}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">${item.target_date ? new Date(item.target_date).toLocaleDateString() : 'N/A'}</span>
        </div>
        <h4 class="font-bold text-gray-800 dark:text-white mb-2">${item.intervention_to_undertake || 'Intervention Strategy'}</h4>
        <p class="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">${item.remarks || item.description || 'No additional remarks.'}</p>
        <div class="border-t border-gray-100 dark:border-slate-700 pt-4 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
          <span>Office: ${item.responsible_office || 'N/A'}</span>
        </div>
      </div>
    `).join('');
  },

  updateSaveChangesUI() {
    const saveBtn = document.getElementById('save-changes-btn') || document.getElementById('btn-save-changes');
    if (!saveBtn) return;

    const edits = StateManager.getStagedEdits();
    const pendingCount = Object.keys(edits).length;

    if (pendingCount === 0) {
      saveBtn.className = 'btn-save-disabled';
      saveBtn.disabled = true;
      saveBtn.textContent = 'Save Changes';
    } else {
      saveBtn.className = 'btn-save-active';
      saveBtn.disabled = false;
      saveBtn.textContent = `Save ${pendingCount} ${pendingCount === 1 ? 'Change' : 'Changes'}`;
    }
  },

  renderRegionOptions(selectEl, regions = []) {
    if (!selectEl) return;
    const currentVal = selectEl.value;
    selectEl.innerHTML = '<option value="">Select Region</option>' + 
      regions.map(r => {
        const val = r.name || r.id;
        return `<option value="${val}">${val}</option>`;
      }).join('');
    if (currentVal) selectEl.value = currentVal;
  },

  renderDivisionOptions(selectEl, divisions = [], selectedRegion = '') {
    if (!selectEl) return;
    if (!selectedRegion) {
      selectEl.innerHTML = '<option value="">Select Division</option>';
      selectEl.disabled = true;
      return;
    }

    const filtered = divisions.filter(d => {
      if (!d.region_id) return true;
      return d.region_id === selectedRegion || selectedRegion.includes(d.region_id) || d.region_id.includes(selectedRegion);
    });

    selectEl.innerHTML = '<option value="">Select Division</option>' +
      filtered.map(d => {
        const val = d.office_name || d.name || d.id;
        return `<option value="${val}">${val}</option>`;
      }).join('');
    selectEl.disabled = false;
  },

  hydrateProfile(user = {}) {
    let currentUser = user;
    if (!currentUser || (!currentUser.first_name && !currentUser.deped_email)) {
      currentUser = StateManager.getUserProfile() || {};
    } else {
      StateManager.setUserProfile(currentUser);
    }

    const profileCard = document.querySelector('.profile-card');
    if (!profileCard) return;

    const fullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'HRMO User';
    const position = currentUser.position || 'Human Resource Management Officer';
    const regionName = currentUser.region_name || currentUser.region_id || '';
    const divisionName = currentUser.division_office_name || currentUser.division_id || '';
    const location = [regionName, divisionName].filter(Boolean).join(' • ');

    profileCard.innerHTML = `
      <strong>${fullName}</strong>
      <span>${position}</span>
      <span>${location}</span>
    `;

    const scopeHint = document.getElementById('collab-scope-hint');
    if (scopeHint) {
      scopeHint.textContent = `Collaborators inherit scope: ${location}`;
    }
  }
};
