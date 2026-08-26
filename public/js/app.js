import { API } from './api.js';
import { StateManager } from './state.js';
import { UI } from './ui.js';
import { Events } from './events.js';

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

export async function loadDashboard() {
  try {
    const [recordsRes, kpisRes, interventionsRes] = await Promise.all([
      API.getRecords().catch(() => []),
      API.getKPIs().catch(() => ({})),
      API.getInterventions().catch(() => [])
    ]);

    const records = Array.isArray(recordsRes) ? recordsRes : (recordsRes.data || recordsRes.records || []);
    const kpis = kpisRes.data || kpisRes.kpis || kpisRes || {};
    const interventions = Array.isArray(interventionsRes) ? interventionsRes : (interventionsRes.data || []);

    StateManager.setCurrentRecords(records);
    StateManager.setCache(records, kpis);

    const stagedEdits = StateManager.getStagedEdits();

    UI.renderRows(records, stagedEdits);
    UI.renderCompletionStickers(kpis);
    UI.renderInterventions(interventions);
    UI.updateSaveChangesUI();

    Events.setupSaveButton(async () => {
      await loadDashboard();
    });

    Events.setupFilterListeners(({ search, region }) => {
      const allRecords = StateManager.getCurrentRecords();
      const filtered = allRecords.filter(r => {
        const itemNum = (r.item_number || r['ITEM NUMBER'] || '').toString().toLowerCase();
        const posTitle = (r.position_title || r['POSITION TITLE'] || '').toString().toLowerCase();
        const rRegion = (r.region_id || r.region_name || '').toString().toLowerCase();

        const matchesSearch = !search || itemNum.includes(search.toLowerCase()) || posTitle.includes(search.toLowerCase());
        const matchesRegion = !region || rRegion.includes(region.toLowerCase());
        return matchesSearch && matchesRegion;
      });
      UI.renderRows(filtered, StateManager.getStagedEdits());
    });

    Events.setupCollaboratorsListeners();
    await loadCollaborators();

  } catch (err) {
    console.error('Error launching dashboard:', err);
  }
}

export function showGatedAuth() {
  const gatedAuth = document.getElementById('gated-auth') || document.getElementById('login-view');
  const mainApp = document.getElementById('main-app') || document.getElementById('dashboard-view');
  if (gatedAuth) {
    gatedAuth.style.display = '';
    gatedAuth.classList.remove('hidden');
  }
  if (mainApp) {
    mainApp.style.display = 'none';
    mainApp.classList.add('hidden');
  }
}

export function showMainDashboard() {
  const gatedAuth = document.getElementById('gated-auth') || document.getElementById('login-view');
  const mainApp = document.getElementById('main-app') || document.getElementById('dashboard-view');
  if (gatedAuth) {
    gatedAuth.style.display = 'none';
    gatedAuth.classList.add('hidden');
  }
  if (mainApp) {
    mainApp.style.display = 'block';
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

  await loadDashboard();
}

// Global window exposure for inline triggers if any
window.showGatedAuth = showGatedAuth;
window.showMainDashboard = showMainDashboard;
window.switchView = switchView;

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
  Events.setupAuthListeners(async () => {
    await checkAuthAndHydrate();
  });

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
