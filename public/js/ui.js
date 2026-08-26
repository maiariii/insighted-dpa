import { BADGE_CLASSES, REASONS_FOR_VACANCY, STATUSES_OF_VACANCY } from './config.js';
import { StateManager } from './state.js';
import { Events } from './events.js';
import { isRecordCompleted } from './app.js';

let agingChartInstance = null;
let reasonsChartInstance = null;

export function parseRemarksValue(raw) {
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
    // Not JSON — treat as legacy plain-text remarks
  }
  return { text: String(raw), updatedBy: '', updatedAt: '' };
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

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

  // Builds a single row's HTML given a record + the current staged edits.
  // Extracted from the old renderRows() row-mapping callback so it can be reused
  // both for a full page render and for patchRow()'s single-row in-place update.
  renderRowHtml(record, stagedEdits = {}) {
      const rowEdits = stagedEdits[record.id] || {};
      const isDirty = Object.keys(rowEdits).length > 0;

      const positionStatus = rowEdits.position_status || record.position_status || record['POSITION STATUS'] || record.item_status || 'UNFILLED';
      const isComplete = positionStatus === 'FILLED';
      const itemStatusDisplay = record.item_status || record.ITEM_STATUS || positionStatus;
      const agingStatus = record.vacancy_aging_status || record['VACANCY AGING STATUS'] || 'N/A';
      const positionTitle = record.position_title || record['POSITION TITLE'] || 'N/A';
      const positionCat = record.position_category || record['POSITION CATEGORY'] || 'N/A';
      const itemNumber = record.item_number || record['ITEM NUMBER'] || 'N/A';
      const sg = record.sg || record.SG || 'N/A';
      const yearCreated = record.year_created || record['YEAR CREATED'] || 'N/A';
      const yearsUnfilled = record.years_unfilled || record['YEARS UNFILLED'] || 'N/A';

      const incumbent = isComplete ? (rowEdits.name_of_incumbent !== undefined ? rowEdits.name_of_incumbent : (record.name_of_incumbent || record['NAME OF INCUMBENT'] || '')) : '';
      const firstDay = isComplete ? (rowEdits.first_day_of_service !== undefined ? rowEdits.first_day_of_service : (record.first_day_of_service || record['FIRST DAY OF SERVICE'] || '')) : '';
      const dateVacancy = !isComplete ? (rowEdits.date_of_vacancy !== undefined ? rowEdits.date_of_vacancy : (record.date_of_vacancy || record['DATE OF VACANCY'] || '')) : '';
      const reasonVacancy = !isComplete ? (rowEdits.reason_for_vacancy !== undefined ? rowEdits.reason_for_vacancy : (record.reason_for_vacancy || record['REASON FOR VACANCY'] || '')) : '';
      const statusVacancy = !isComplete ? (rowEdits.status_of_vacancy !== undefined ? rowEdits.status_of_vacancy : (record.status_of_vacancy || record['STATUS OF VACANCY'] || '')) : '';
      const tentativeFill = !isComplete ? (rowEdits.tentative_date_to_fill_up !== undefined ? rowEdits.tentative_date_to_fill_up : (record.tentative_date_to_fill_up || record['TENTATIVE DATE TO FILL-UP'] || '')) : '';
      const remarksRaw = rowEdits.other_remarks !== undefined ? rowEdits.other_remarks : (record.other_remarks || record['OTHER REMARKS'] || '');
      const remarksParsed = parseRemarksValue(remarksRaw);

      const naInput = () => `<input type="text" class="form-input form-input-disabled-na border rounded px-2 py-1 text-xs w-full" disabled value="N/A" />`;

      const reasonOptionsHtml = `<option value="">Select Reason</option>` + REASONS_FOR_VACANCY.map(r => {
        const selected = reasonVacancy === r ? 'selected' : '';
        return `<option value="${r}" ${selected}>${r}</option>`;
      }).join('');

      const statusVacancyOptionsHtml = `<option value="">Select Status</option>` + STATUSES_OF_VACANCY.map(s => {
        const selected = statusVacancy === s ? 'selected' : '';
        return `<option value="${s}" ${selected}>${s}</option>`;
      }).join('');

      return `
        <tr class="hover:bg-blue-50/50 transition ${isDirty ? 'bg-amber-50/40 cell-dirty' : ''}" data-id="${record.id}">
          <td class="sticky-1 border-b font-medium text-gray-900 dark:text-white">${itemNumber}</td>
          <td class="sticky-2 border-b text-gray-700 dark:text-gray-200">${positionTitle}</td>
          <td class="p-3 border-b table-readonly-cell">${positionCat}</td>
          <td class="p-3 border-b table-readonly-cell">${itemStatusDisplay}</td>
          <td class="p-3 border-b table-readonly-cell text-center">${sg}</td>
          <td class="p-3 border-b table-readonly-cell text-center">${yearCreated}</td>
          <td class="p-3 border-b table-readonly-cell text-center">${yearsUnfilled}</td>
          <td class="p-3 border-b table-readonly-cell">
            <span class="badge-vacancy-status ${this.getAgingBadgeClass(agingStatus)}">${agingStatus}</span>
          </td>
          <td class="p-2 border-b">
            <select class="row-position-status font-bold rounded px-2 py-1 text-xs border border-slate-300 shadow-sm ${isComplete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} cursor-pointer" data-id="${record.id}">
              <option value="UNFILLED" ${!isComplete ? 'selected' : ''}>UNFILLED</option>
              <option value="FILLED" ${isComplete ? 'selected' : ''}>FILLED</option>
            </select>
          </td>
          <td class="p-2 border-b">
            ${!isComplete ? naInput() : `<input type="text" class="form-input uppercase border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300" value="${incumbent}" data-id="${record.id}" data-field="name_of_incumbent" placeholder="INCUMBENT NAME" />`}
          </td>
          <td class="p-2 border-b">
            ${!isComplete ? naInput() : `<input type="text" autocomplete="off" placeholder="YYYY-MM-DD" class="form-input audit-date-picker border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300" value="${firstDay}" data-id="${record.id}" data-field="first_day_of_service" />`}
          </td>
          <td class="p-2 border-b">
            ${isComplete ? naInput() : `<input type="text" autocomplete="off" placeholder="YYYY-MM-DD" class="form-input audit-date-picker border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300" value="${dateVacancy}" data-id="${record.id}" data-field="date_of_vacancy" />`}
          </td>
          <td class="p-2 border-b">
            ${isComplete ? naInput() : `<select class="form-select border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300" data-id="${record.id}" data-field="reason_for_vacancy">${reasonOptionsHtml}</select>`}
          </td>
          <td class="p-2 border-b">
            ${isComplete ? naInput() : `<select class="form-select border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300" data-id="${record.id}" data-field="status_of_vacancy">${statusVacancyOptionsHtml}</select>`}
          </td>
          <td class="p-2 border-b text-center">
            <button type="button" class="btn-remarks-trigger inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${remarksParsed.text ? 'bg-teal-100 text-teal-700 border border-teal-300' : 'bg-slate-100 text-slate-500 border border-slate-300'} hover:bg-teal-200 transition cursor-pointer" data-id="${record.id}" title="${escapeAttr(remarksParsed.text) || 'Add remarks'}">${remarksParsed.text ? '&#9998;' : '+'}</button>
          </td>
          <td class="p-2 border-b">
            ${isComplete ? naInput() : `<input type="text" readonly autocomplete="off" placeholder="YYYY-MM-DD" class="form-input audit-date-picker tentative-date-picker border rounded px-2 py-1 text-xs w-full bg-white text-slate-800 border-slate-300" value="${tentativeFill}" data-id="${record.id}" data-field="tentative_date_to_fill_up" />`}
          </td>
          <td class="p-3 border-b text-right whitespace-nowrap">
            ${isDirty ? '<span class="text-xs text-amber-600 font-semibold">Uncommitted</span>' : ''}
          </td>
        </tr>
      `;
  },

  AUDIT_PAGE_SIZE: 100,

  // Full render entry point: fresh data load or a new search/filter/category
  // result set. Always starts back at page 1 — a new result set has a new
  // page 1 by definition. Caches the (unpaginated) records + staged edits so
  // pagination and patchRow() can operate without the caller re-supplying them.
  renderRows(records = [], stagedEdits = {}) {
    this._auditRecords = records || [];
    this._auditStagedEdits = stagedEdits || {};
    this._auditPage = 1;
    this._renderAuditPage();
  },

  // Renders only the current page's slice of this._auditRecords into the DOM,
  // instead of the full dataset — keeps the live DOM node count bounded to
  // AUDIT_PAGE_SIZE regardless of how many personnel records the division has.
  _renderAuditPage() {
    const container = document.getElementById('audit-table-body');
    if (!container) return;

    const records = this._auditRecords || [];
    const stagedEdits = this._auditStagedEdits || {};

    if (records.length === 0) {
      container.innerHTML = `<tr><td colspan="17" class="p-8 text-center text-gray-500 font-medium">No matching personnel audit records found.</td></tr>`;
      this.renderAuditPagination(0, 1, 1);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(records.length / this.AUDIT_PAGE_SIZE));
    this._auditPage = Math.min(Math.max(1, this._auditPage || 1), totalPages);
    const start = (this._auditPage - 1) * this.AUDIT_PAGE_SIZE;
    const pageRecords = records.slice(start, start + this.AUDIT_PAGE_SIZE);

    container.innerHTML = pageRecords.map(record => this.renderRowHtml(record, stagedEdits)).join('');

    this.bindAuditTableDelegation();
    this.initTableDatePickers();
    this.renderAuditPagination(records.length, this._auditPage, totalPages);
  },

  goToAuditPage(page) {
    this._auditPage = page;
    this._renderAuditPage();
  },

  renderAuditPagination(total, page, totalPages) {
    const el = document.getElementById('audit-table-pagination');
    if (!el) return;

    if (total === 0) {
      el.innerHTML = '';
      return;
    }

    const rangeStart = (page - 1) * this.AUDIT_PAGE_SIZE + 1;
    const rangeEnd = Math.min(page * this.AUDIT_PAGE_SIZE, total);

    el.innerHTML = `
      <span class="text-xs text-slate-500 dark:text-slate-400">Showing ${rangeStart}–${rangeEnd} of ${total} records</span>
      <div class="flex items-center gap-2">
        <button type="button" class="audit-page-prev px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 ${page <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Page ${page} of ${totalPages}</span>
        <button type="button" class="audit-page-next px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 ${page >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    `;

    const prevBtn = el.querySelector('.audit-page-prev');
    const nextBtn = el.querySelector('.audit-page-next');
    if (prevBtn && page > 1) prevBtn.addEventListener('click', () => this.goToAuditPage(page - 1));
    if (nextBtn && page < totalPages) nextBtn.addEventListener('click', () => this.goToAuditPage(page + 1));
  },

  // Re-renders exactly one row in place from the current cached record + staged
  // edits, instead of rebuilding the whole table body. Used whenever a single
  // row's own edit (position-status toggle, remarks save) needs its own cells
  // to reflect the change — e.g. swapping which fields are editable when the
  // FILLED/UNFILLED status flips, or updating the remarks button's icon/title.
  // A no-op if the row isn't on the currently-displayed page (rare — only
  // possible via a stale reference — in which case the next full render will
  // pick up the change anyway since it's already staged in StateManager).
  patchRow(recordId) {
    const container = document.getElementById('audit-table-body');
    if (!container) return;
    const rowEl = container.querySelector(`tr[data-id="${CSS.escape(String(recordId))}"]`);
    if (!rowEl) return;

    const records = this._auditRecords || [];
    const record = records.find(r => String(r.id) === String(recordId));
    if (!record) return;

    const stagedEdits = this._auditStagedEdits || {};
    const wrapper = document.createElement('tbody');
    wrapper.innerHTML = this.renderRowHtml(record, stagedEdits);
    const newRowEl = wrapper.firstElementChild;
    if (newRowEl) rowEl.replaceWith(newRowEl);
  },

  // Single delegated listener set, bound once on the persistent #audit-table-body
  // element, instead of re-attaching an individual listener to every input/select
  // in every row on every render. The container itself is never replaced (only
  // its children, via innerHTML), so binding once here covers all current and
  // future rows regardless of how many times the page/table body re-renders.
  bindAuditTableDelegation() {
    const container = document.getElementById('audit-table-body');
    if (!container || container.dataset.delegationBound === 'true') return;
    container.dataset.delegationBound = 'true';

    container.addEventListener('input', (e) => {
      const target = e.target;
      if (target.dataset && target.dataset.field === 'name_of_incumbent') {
        const caret = target.selectionStart;
        target.value = target.value.toUpperCase();
        if (caret !== null) target.setSelectionRange(caret, caret);
      }
    });

    container.addEventListener('change', (e) => {
      const target = e.target;
      const id = target.dataset && target.dataset.id;
      if (!id) return;

      if (target.classList.contains('row-position-status')) {
        Events.handlePositionStatusChange(id, target.value);
        return;
      }

      const field = target.dataset.field;
      if (!field) return;

      const val = field === 'name_of_incumbent' ? target.value.toUpperCase() : target.value;
      Events.handleFieldChange(id, field, val);
    });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.btn-remarks-trigger');
      if (!btn) return;
      const id = btn.dataset.id;
      Events.openRemarksModal(id, this._auditRecords || [], this._auditStagedEdits || {});
    });
  },

  initTableDatePickers() {
    // Lazily construct each row's flatpickr instance on first interaction instead
    // of eagerly building one for every date cell on every render. With a large
    // record set (hundreds+ rows, up to ~2 date inputs each) eagerly instantiating
    // flatpickr synchronously for every cell on every renderRows() call was the
    // actual source of the multi-second UI freeze when opening/filtering the Audit
    // panel — each instantiation builds a full calendar DOM subtree. Delegating
    // through a single listener bound once on the (persistent) table body element
    // means the cost is now O(1) per render and only paid per field the user
    // actually opens.
    if (typeof flatpickr === 'undefined') return;
    const container = document.getElementById('audit-table-body');
    if (!container || container.dataset.datePickerDelegationBound === 'true') return;
    container.dataset.datePickerDelegationBound = 'true';

    const ensurePicker = (input) => {
      if (!input || input.disabled || input._flatpickr) return;
      flatpickr(input, {
        dateFormat: 'Y-m-d',
        changeMonth: true,
        changeYear: true,
        clickOpens: true,
        allowInput: !input.classList.contains('tentative-date-picker'),
        minDate: input.classList.contains('tentative-date-picker') ? 'today' : undefined,
        onClose(selectedDates, dateStr, instance) {
          const rowId = instance.element.dataset.id;
          const field = instance.element.dataset.field;
          Events.handleFieldChange(rowId, field, dateStr);
        },
        onReady(selectedDates, dateStr, instance) {
          // The click/focus that triggered lazy init should still open the
          // calendar immediately, matching the old eager-init UX.
          instance.open();
        }
      });
    };

    const handleActivate = (e) => {
      const input = e.target.closest && e.target.closest('.audit-date-picker');
      if (input) ensurePicker(input);
    };

    container.addEventListener('focusin', handleActivate);
    container.addEventListener('mousedown', handleActivate);
  },

  renderCompletionStickers(kpis = {}) {
    const totalUnfilledEl = document.getElementById('kpi-total-unfilled');
    const totalItemsEl = document.getElementById('kpi-total-items');
    const auditedEl = document.getElementById('kpi-audited-items');
    const remainingEl = document.getElementById('kpi-remaining-items');
    const percentEl = document.getElementById('kpi-completion-percentage');
    const progressFillEl = document.getElementById('kpi-progress-fill');
    const stickerTextEl = document.getElementById('kpi-progress-text');

    const kpiObj = kpis.kpis || kpis;
    const total = kpis.totalUnfilled ?? kpiObj.totalUnfilled ?? kpis.total ?? kpiObj.total_monitored ?? 0;
    const audited = kpis.auditedItems ?? kpiObj.auditedItems ?? kpis.audited ?? kpiObj.audited_items ?? 0;
    const remaining = kpis.remainingItems ?? kpiObj.remainingItems ?? kpis.remaining ?? kpiObj.remaining_items ?? 0;
    const percent = kpis.completionPercentage ?? kpiObj.completionPercentage ?? (total > 0 ? parseFloat(((audited / total) * 100).toFixed(1)) : 0);

    if (totalUnfilledEl) totalUnfilledEl.textContent = Number(total).toLocaleString();
    if (totalItemsEl) totalItemsEl.textContent = Number(total).toLocaleString();
    if (auditedEl) auditedEl.textContent = Number(audited).toLocaleString();
    if (remainingEl) remainingEl.textContent = Number(remaining).toLocaleString();
    if (percentEl) percentEl.textContent = `${percent}%`;

    if (progressFillEl) {
      progressFillEl.style.width = `${percent}%`;
    }
    if (stickerTextEl) {
      stickerTextEl.textContent = `${percent}% Audited`;
    }
  },

  renderCompletedTable(completedRows = []) {
    const container = document.getElementById('completed-records-table-body');
    const countEl = document.getElementById('completed-table-count');
    if (countEl) countEl.textContent = `${completedRows.length} record${completedRows.length === 1 ? '' : 's'}`;
    if (!container) return;

    if (!completedRows.length) {
      container.innerHTML = `<tr><td colspan="16" class="p-8 text-center text-gray-500 font-medium">No finalized audit records yet.</td></tr>`;
      return;
    }

    container.innerHTML = completedRows.map(record => {
      const positionStatus = record.position_status || record['POSITION STATUS'] || record.item_status || 'UNFILLED';
      const isComplete = positionStatus === 'FILLED';
      const itemStatusDisplay = record.item_status || record.ITEM_STATUS || positionStatus;
      const agingStatus = record.vacancy_aging_status || record['VACANCY AGING STATUS'] || 'N/A';
      const positionTitle = record.position_title || record['POSITION TITLE'] || 'N/A';
      const positionCat = record.position_category || record['POSITION CATEGORY'] || 'N/A';
      const itemNumber = record.item_number || record['ITEM NUMBER'] || 'N/A';
      const sg = record.sg || record.SG || 'N/A';
      const yearCreated = record.year_created || record['YEAR CREATED'] || 'N/A';
      const yearsUnfilled = record.years_unfilled || record['YEARS UNFILLED'] || 'N/A';
      const incumbent = record.name_of_incumbent || record['NAME OF INCUMBENT'] || 'N/A';
      const firstDay = record.first_day_of_service || record['FIRST DAY OF SERVICE'] || 'N/A';
      const dateVacancy = record.date_of_vacancy || record['DATE OF VACANCY'] || 'N/A';
      const reasonVacancy = record.reason_for_vacancy || record['REASON FOR VACANCY'] || 'N/A';
      const statusVacancy = record.status_of_vacancy || record['STATUS OF VACANCY'] || 'N/A';
      const tentativeFill = record.tentative_date_to_fill_up || record['TENTATIVE DATE TO FILL-UP'] || 'N/A';
      const remarksParsed = parseRemarksValue(record.other_remarks || record['OTHER REMARKS'] || '');

      return `
        <tr class="hover:bg-green-50/40 transition" data-id="${record.id}">
          <td class="sticky-1 border-b font-medium text-gray-900 dark:text-white">${itemNumber}</td>
          <td class="sticky-2 border-b text-gray-700 dark:text-gray-200">${positionTitle}</td>
          <td class="p-3 border-b table-readonly-cell">${positionCat}</td>
          <td class="p-3 border-b table-readonly-cell">${itemStatusDisplay}</td>
          <td class="p-3 border-b table-readonly-cell text-center">${sg}</td>
          <td class="p-3 border-b table-readonly-cell text-center">${yearCreated}</td>
          <td class="p-3 border-b table-readonly-cell text-center">${yearsUnfilled}</td>
          <td class="p-3 border-b table-readonly-cell">
            <span class="badge-vacancy-status ${this.getAgingBadgeClass(agingStatus)}">${agingStatus}</span>
          </td>
          <td class="p-3 border-b table-readonly-cell">${positionStatus}</td>
          <td class="p-3 border-b table-readonly-cell">${isComplete ? incumbent : 'N/A'}</td>
          <td class="p-3 border-b table-readonly-cell">${isComplete ? firstDay : 'N/A'}</td>
          <td class="p-3 border-b table-readonly-cell">${!isComplete ? dateVacancy : 'N/A'}</td>
          <td class="p-3 border-b table-readonly-cell">${!isComplete ? reasonVacancy : 'N/A'}</td>
          <td class="p-3 border-b table-readonly-cell">${!isComplete ? statusVacancy : 'N/A'}</td>
          <td class="p-3 border-b table-readonly-cell">${!isComplete ? tentativeFill : 'N/A'}</td>
          <td class="p-3 border-b table-readonly-cell">${remarksParsed.text || 'N/A'}</td>
        </tr>
      `;
    }).join('');
  },

  renderCategoryKPIs(records = [], activeCategory = '') {
    const categories = ['Teaching', 'Non-Teaching', 'Teaching-Related'];
    categories.forEach(cat => {
      const catRows = records.filter(row => (row.position_category || row['POSITION CATEGORY']) === cat);
      const total = catRows.length;
      // Use the same completion criteria as the rest of the app (isRecordCompleted:
      // FILLED-with-incumbent-data, or an UNFILLED row with its required vacancy
      // fields captured, or is_audited === true) rather than a narrower "FILLED or
      // literal 'Audited' string" check — otherwise this percentage silently
      // undercounts rows that were finalized via the UNFILLED path.
      const audited = catRows.filter(isRecordCompleted).length;
      // Keep full precision through division; round to one decimal place at the
      // display boundary only (not before), and round rather than truncate.
      const pctRaw = total > 0 ? (audited / total) * 100 : 0;
      const pct = parseFloat(pctRaw.toFixed(1));

      const countEl = document.querySelector(`[data-category-count="${cat}"]`);
      if (countEl) countEl.textContent = total;

      const barEl = document.querySelector(`[data-category-progress="${cat}"]`);
      if (barEl) barEl.style.width = `${pct}%`;

      const stickerEl = document.querySelector(`[data-category-sticker="${cat}"]`);
      if (stickerEl) stickerEl.textContent = `${pct.toFixed(1)}% accomplishment rate`;

      const cardEl = document.querySelector(`[data-category="${cat}"]`);
      if (cardEl) cardEl.classList.toggle('active', cat === activeCategory);
    });
  },

  getAgingCategoryColor(label) {
    const s = (label || '').toString().toLowerCase();
    if (s.includes('newly created')) return { background: '#3b82f6', border: '#2563eb' };
    if (s.includes('long-term') || s.includes('long term')) return { background: '#ef4444', border: '#dc2626' };
    if (s.includes('extended')) return { background: '#f97316', border: '#ea580c' };
    if (s.includes('new')) return { background: '#10b981', border: '#059669' };
    if (s.includes('aging')) return { background: '#8b5cf6', border: '#7c3aed' };
    return { background: '#64748b', border: '#475569' };
  },

  openCategoryModal(categoryName) {
    const modal = document.getElementById('category-items-modal');
    const titleEl = document.getElementById('category-modal-title');
    if (!modal) return;
    if (titleEl) titleEl.textContent = `${categoryName} Items`;
    this.renderCategoryModalTable(categoryName);
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.remove('opacity-0'));
  },

  renderCategoryModalTable(categoryName) {
    const tbody = document.getElementById('category-modal-table-body');
    if (!tbody) return;

    const allRecords = StateManager.getCurrentRecords() || [];
    const filteredRows = allRecords.filter(row => {
      const rowStatus = row.vacancy_aging_status || row['VACANCY AGING STATUS'] || 'Unspecified';
      return rowStatus.toString().toLowerCase() === categoryName.toString().toLowerCase();
    });

    if (filteredRows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-slate-400">No records found for ${categoryName}</td></tr>`;
      return;
    }

    tbody.innerHTML = filteredRows.map(row => {
      const itemNumber = row.item_number || row['ITEM NUMBER'] || 'N/A';
      const positionTitle = row.position_title || row['POSITION TITLE'] || 'N/A';
      const positionCat = row.position_category || row['POSITION CATEGORY'] || 'N/A';
      const sg = row.sg || row.SG || 'N/A';
      const yearsUnfilled = row.years_unfilled || row['YEARS UNFILLED'] || 'N/A';
      const agingStatus = row.vacancy_aging_status || row['VACANCY AGING STATUS'] || 'N/A';
      const positionStatus = row.position_status || row['POSITION STATUS'] || 'UNFILLED';
      const incumbent = row.name_of_incumbent || row['NAME OF INCUMBENT'] || 'N/A';
      const dateVacancy = row.date_of_vacancy || row['DATE OF VACANCY'] || 'N/A';
      const reasonVacancy = row.reason_for_vacancy || row['REASON FOR VACANCY'] || 'N/A';
      const tentativeFill = row.tentative_date_to_fill_up || row['TENTATIVE DATE TO FILL-UP'] || 'N/A';

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40">
          <td class="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">${itemNumber}</td>
          <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">${positionTitle}</td>
          <td class="px-4 py-3 text-xs">${positionCat}</td>
          <td class="px-4 py-3 text-center">${sg}</td>
          <td class="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">${yearsUnfilled}</td>
          <td class="px-4 py-3"><span class="badge-vacancy-status ${this.getAgingBadgeClass(agingStatus)}">${agingStatus}</span></td>
          <td class="px-4 py-3 text-xs font-bold text-center">${positionStatus}</td>
          <td class="px-4 py-3">${incumbent}</td>
          <td class="px-4 py-3 font-mono text-xs">${dateVacancy}</td>
          <td class="px-4 py-3 text-xs">${reasonVacancy}</td>
          <td class="px-4 py-3 font-mono text-xs">${tentativeFill}</td>
        </tr>
      `;
    }).join('');
  },

  renderDashboardCharts(agingData = [], reasonsData = []) {
    const agingCtx = document.getElementById('agingChart');
    const reasonsCtx = document.getElementById('reasonsChart');

    if (agingCtx && typeof Chart !== 'undefined') {
      if (agingChartInstance) {
        agingChartInstance.destroy();
      }

      const labels = agingData.map(d => d.status || d.vacancy_aging_status || 'Unspecified');
      const counts = agingData.map(d => parseInt(d.count || 0, 10));

      const barColors = labels.map(label => this.getAgingCategoryColor(label));

      agingChartInstance = new Chart(agingCtx, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['No Data'],
          datasets: [{
            label: 'Unfilled Items',
            data: counts.length > 0 ? counts : [0],
            backgroundColor: labels.length > 0 ? barColors.map(c => c.background) : ['rgba(59, 130, 246, 0.75)'],
            borderColor: labels.length > 0 ? barColors.map(c => c.border) : ['rgba(37, 99, 235, 1)'],
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: labels.length > 0 ? barColors.map(c => c.border) : ['rgba(37, 99, 235, 1)']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              grace: '15%',
              ticks: { precision: 0 },
              grid: { color: '#f1f5f9' }
            }
          },
          onClick: (event, activeElements) => {
            if (!activeElements || activeElements.length === 0) return;
            const clickedBarIndex = activeElements[0].index;
            const labelName = agingChartInstance.data.labels[clickedBarIndex];
            if (!labelName || labelName === 'No Data') return;
            this.openCategoryModal(labelName);
          }
        },
        plugins: [{
          id: 'customBarLabels',
          afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, i) => {
              const meta = chart.getDatasetMeta(i);
              meta.data.forEach((bar, index) => {
                const val = dataset.data[index];
                if (!val) return;
                ctx.save();
                ctx.fillStyle = '#475569';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(val, bar.x, bar.y - 6);
                ctx.restore();
              });
            });
          }
        }]
      });
    }

    if (reasonsCtx && typeof Chart !== 'undefined') {
      if (reasonsChartInstance) {
        reasonsChartInstance.destroy();
      }

      const labels = reasonsData.map(d => d.reason || d.reason_for_vacancy || 'Unspecified');
      const counts = reasonsData.map(d => parseInt(d.count || 0, 10));

      reasonsChartInstance = new Chart(reasonsCtx, {
        type: 'doughnut',
        data: {
          labels: labels.length > 0 ? labels : ['No Data'],
          datasets: [{
            data: counts.length > 0 ? counts : [0],
            backgroundColor: [
              '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
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

    container.innerHTML = interventions.map(item => {
      let outcomesText = 'N/A';
      if (Array.isArray(item.expected_outcomes) && item.expected_outcomes.length > 0) {
        outcomesText = item.expected_outcomes.map(o => (typeof o === 'object' ? o.text || JSON.stringify(o) : String(o))).join(', ');
      } else if (typeof item.expected_outcomes === 'object' && item.expected_outcomes !== null) {
        outcomesText = item.expected_outcomes.text || JSON.stringify(item.expected_outcomes);
      } else if (item.expected_outcomes) {
        outcomesText = String(item.expected_outcomes);
      }

      let remarksText = 'No additional remarks.';
      if (Array.isArray(item.remarks) && item.remarks.length > 0) {
        remarksText = item.remarks.map(r => (typeof r === 'object' ? r.text || JSON.stringify(r) : String(r))).join('. ');
      } else if (typeof item.remarks === 'object' && item.remarks !== null) {
        remarksText = item.remarks.text || JSON.stringify(item.remarks);
      } else if (item.remarks) {
        remarksText = String(item.remarks);
      }

      return `
        <div class="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-3">
              <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                ${item.area_of_concern || 'General Concern'}
              </span>
              <span class="text-xs text-slate-400 font-medium">${item.target_date ? new Date(item.target_date).toLocaleDateString() : 'N/A'}</span>
            </div>
            <h4 class="font-bold text-slate-800 dark:text-white mb-2 leading-snug">${item.intervention_to_undertake || 'Intervention Strategy'}</h4>
            <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4">
              <p><strong class="text-slate-700 dark:text-slate-200">Expected Outcomes:</strong> ${outcomesText}</p>
              <p><strong class="text-slate-700 dark:text-slate-200">Remarks:</strong> ${remarksText}</p>
            </div>
          </div>
          <div class="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Office: ${item.responsible_office || 'N/A'}</span>
          </div>
        </div>
      `;
    }).join('');
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
