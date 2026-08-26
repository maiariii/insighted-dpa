import { API } from './api.js';
import { StateManager } from './state.js';
import { UI } from './ui.js';
import { Events } from './events.js';

let activeCategoryFilter = '';
let lastSearch = '';
let lastRegion = '';

// Apply the persisted theme immediately, before the rest of the app initializes,
// to avoid a light-mode flash when the user's saved preference is dark.
StateManager.initTheme();

function updateThemeToggleButton(theme) {
  const icon = document.querySelector('#darkModeBtn span:first-child');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

export function isRecordCompleted(record) {
  const itemStatus = record.item_status || record.ITEM_STATUS || record['ITEM STATUS'] || '';
  return itemStatus.toString().toLowerCase() === 'audited'
    || record.position_status === 'FILLED' || record['POSITION STATUS'] === 'FILLED'
    || record.is_audited === true || record.is_completed === true;
}

export function getActiveRows(records = []) {
  return records.filter(r => !isRecordCompleted(r));
}

export function getCompletedRows(records = []) {
  return records.filter(isRecordCompleted);
}

export function switchView(viewId) {
  // Hide all view panels
  const viewPanels = document.querySelectorAll('.view-panel, .audit-panel, section[id$="-view"]');
  viewPanels.forEach(panel => {
    panel.classList.add('hidden');
    panel.classList.remove('active');
    if (panel.style.display && panel.id !== 'gated-auth' && panel.id !== 'main-app') {
      panel.style.display = 'none';
    }
  });

  // Activate target panel
  const target = document.getElementById(`${viewId}-view`) || document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
    if (target.style.display === 'none') {
      target.style.display = 'block';
    }
  }

  // Update nav button active states
  document.querySelectorAll('.nav button').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.target === viewId || btn.id === `nav-${viewId}`) {
      btn.classList.add('active');
    }
  });
}

export async function loadCollaborators() {
  const token = StateManager.getToken();
  if (!token) return;
  try {
    const result = await API.getCollaborators();
    const listContainer = document.getElementById('collaborators-list-container');
    if (listContainer && result.success && Array.isArray(result.collaborators)) {
      if (result.collaborators.length === 0) {
        listContainer.innerHTML = '<p style="font-size: 12px; color: var(--muted); margin: 0;">No active collaborators yet.</p>';
      } else {
        listContainer.innerHTML = result.collaborators.map(c => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(15, 95, 183, 0.04); border: 1px solid var(--line); border-radius: 12px;">
            <div>
              <strong style="font-size: 13px; color: var(--ink); display: block;">${c.first_name} ${c.last_name}</strong>
              <span style="font-size: 11px; color: var(--muted);">${c.position || 'Collaborator'} • ${c.email}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="pill green" style="font-size: 10px;">ACTIVE</span>
              <button type="button" class="btn-delete-collab" data-id="${c.id}" style="background: none; border: none; color: #dc2626; font-size: 12px; font-weight: 700; cursor: pointer; padding: 2px 6px;">Remove</button>
            </div>
          </div>
        `).join('');

        listContainer.querySelectorAll('.btn-delete-collab').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm('Are you sure you want to remove this collaborator? Their access will be revoked.')) {
              try {
                await API.deleteCollaborator(id);
                await loadCollaborators();
              } catch (err) {
                alert(`Failed to remove collaborator: ${err.message}`);
              }
            }
          });
        });
      }
    }
  } catch (err) {
    console.error('Failed to load collaborators:', err);
  }
}

function applyFilters() {
  const activeRecords = getActiveRows(StateManager.getCurrentRecords());
  const filtered = activeRecords.filter(r => {
    const itemNum = (r.item_number || r['ITEM NUMBER'] || '').toString().toLowerCase();
    const posTitle = (r.position_title || r['POSITION TITLE'] || '').toString().toLowerCase();
    const rRegion = (r.region_id || r.region_name || '').toString().toLowerCase();
    const rCategory = r.position_category || r['POSITION CATEGORY'] || '';

    const matchesSearch = !lastSearch || itemNum.includes(lastSearch.toLowerCase()) || posTitle.includes(lastSearch.toLowerCase());
    const matchesRegion = !lastRegion || rRegion.includes(lastRegion.toLowerCase());
    const matchesCategory = !activeCategoryFilter || rCategory === activeCategoryFilter;
    return matchesSearch && matchesRegion && matchesCategory;
  });
  UI.renderRows(filtered, StateManager.getStagedEdits());
}

export async function loadDashboard() {
  try {
    const [recordsRes, kpisRes, interventionsRes] = await Promise.all([
      API.getRecords().catch(() => []),
      API.getKPIs().catch(() => ({})),
      API.getInterventions().catch(() => [])
    ]);

    const records = Array.isArray(recordsRes) ? recordsRes : (recordsRes.data || recordsRes.records || []);
    const kpis = kpisRes || {};
    const interventions = Array.isArray(interventionsRes) ? interventionsRes : (interventionsRes.data || []);

    StateManager.setCurrentRecords(records);
    StateManager.setCache(records, kpis);

    const stagedEdits = StateManager.getStagedEdits();

    UI.renderRows(getActiveRows(records), stagedEdits);
    UI.renderCompletedTable(getCompletedRows(records));
    UI.renderCompletionStickers(kpis);
    UI.renderCategoryKPIs(records, activeCategoryFilter);
    UI.renderDashboardCharts(kpis.vacancyAgingDistribution || [], kpis.reasonsUnfilled || []);
    UI.renderInterventions(interventions);
    UI.updateSaveChangesUI();

    await loadCollaborators();

  } catch (err) {
    console.error('Error launching dashboard:', err);
  }
}

export function showGatedAuth() {
  const gatedAuth = document.getElementById('gated-auth') || document.getElementById('login-view');
  const mainApp = document.getElementById('main-app') || document.getElementById('dashboard-view');
  if (gatedAuth) {
    gatedAuth.style.removeProperty('display');
    gatedAuth.classList.remove('hidden');
  }
  if (mainApp) {
    mainApp.style.setProperty('display', 'none', 'important');
    mainApp.classList.add('hidden');
  }
}

export function showMainDashboard() {
  const gatedAuth = document.getElementById('gated-auth') || document.getElementById('login-view');
  const mainApp = document.getElementById('main-app') || document.getElementById('dashboard-view');
  if (gatedAuth) {
    gatedAuth.style.setProperty('display', 'none', 'important');
    gatedAuth.classList.add('hidden');
  }
  if (mainApp) {
    mainApp.style.setProperty('display', 'block', 'important');
    mainApp.classList.remove('hidden');
  }
}

export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function checkAuthAndHydrate() {
  const token = StateManager.getToken();
  console.log('[Auth] checkAuthAndHydrate | token present:', !!token);
  if (!token) {
    showGatedAuth();
    return;
  }

  // Token present: Switch to main dashboard immediately to prevent UI stalling
  showMainDashboard();

  // Instantly hydrate user profile from stored profile state or JWT token payload
  const storedUser = StateManager.getUserProfile();
  const jwtUser = parseJwt(token);
  const initialUser = storedUser || jwtUser;
  if (initialUser) {
    UI.hydrateProfile(initialUser);
  }

  try {
    const res = await API.getMe();
    if (res.success && res.data) {
      StateManager.setUserProfile(res.data);
      UI.hydrateProfile(res.data);
    }
  } catch (err) {
    console.warn('Profile fetch warning (using cached user state):', err.message);
  }

  console.log('[Auth] checkAuthAndHydrate — calling loadDashboard()');
  await loadDashboard();
}

// Global window exposure for inline triggers if any
window.showGatedAuth = showGatedAuth;
window.showMainDashboard = showMainDashboard;
window.switchView = switchView;

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
  updateThemeToggleButton(StateManager.getTheme());

  const darkModeBtn = document.getElementById('darkModeBtn');
  if (darkModeBtn) {
    darkModeBtn.addEventListener('click', () => {
      const newTheme = StateManager.toggleTheme();
      updateThemeToggleButton(newTheme);
    });
  }

  Events.setupAuthListeners(async () => {
    await checkAuthAndHydrate();
  });

  Events.setupRemarksModalListeners();
  Events.setupCategoryModalListeners();

  // Bind all data-independent DOM listeners once, immediately, at page load —
  // not inside loadDashboard(), which used to re-run these on every dashboard
  // refresh (initial load, every save, every intervention add). That both
  // stacked duplicate handlers (the interventions double-submit bug) and meant
  // "+ Add Intervention" silently did nothing until the first loadDashboard()
  // async chain (records + kpis + interventions + collaborators) finished.
  Events.setupSaveButton(async () => {
    await loadDashboard();
  });

  Events.setupInterventionsListeners(async () => {
    await loadDashboard();
  });

  Events.setupFilterListeners(({ search, region }) => {
    lastSearch = search;
    lastRegion = region;
    applyFilters();
  });

  Events.setupCategoryFilterListeners((category) => {
    activeCategoryFilter = category;
    UI.renderCategoryKPIs(StateManager.getCurrentRecords(), activeCategoryFilter);
    applyFilters();
  });

  Events.setupCollaboratorsListeners();

  // Setup sidebar navigation clicks
  document.querySelectorAll('.nav button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetView = e.currentTarget.dataset.target || e.currentTarget.id.replace('nav-', '');
      if (targetView) {
        switchView(targetView);
      }
    });
  });

  await checkAuthAndHydrate();
});
