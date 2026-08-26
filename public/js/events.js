import { API } from './api.js';
import { StateManager } from './state.js';
import { UI } from './ui.js';

export function debounce(func, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

export const Events = {
  setupAuthListeners(onAuthSuccess) {
    const regRegionSelect = document.getElementById('reg-region');
    const regDivisionSelect = document.getElementById('reg-division');

    if (regRegionSelect && regDivisionSelect) {
      API.getRegionsDivisions().then(data => {
        const regions = data.regions || [];
        const divisions = data.divisions || [];
        
        UI.renderRegionOptions(regRegionSelect, regions);

        regRegionSelect.addEventListener('change', (e) => {
          const selectedRegion = e.target.value;
          UI.renderDivisionOptions(regDivisionSelect, divisions, selectedRegion);
        });
      }).catch(err => {
        console.warn('Could not load region/division dropdown options:', err.message);
      });
    }

    const signinForm = document.getElementById('signin-form') || document.getElementById('login-form');
    if (signinForm) {
      signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailEl = document.querySelector('#signin-form [name="deped_email"]') || document.getElementById('login-email');
        const passEl = document.querySelector('#signin-form [name="password"]') || document.getElementById('login-password');
        const errEl = document.getElementById('signin-error') || document.getElementById('login-error');
        const btn = document.getElementById('signin-btn') || document.getElementById('login-btn');

        if (!emailEl || !passEl) return;
        const email = emailEl.value.trim();
        const password = passEl.value;

        if (!email || !password) {
          if (errEl) { errEl.textContent = 'Please enter your email and password.'; errEl.classList.remove('hidden'); }
          return;
        }

        if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
        if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

        try {
          const res = await API.login(email, password);
          const token = res.token || (res.data && res.data.token);
          const user = res.user || (res.data && res.data.user);
          if (token) {
            StateManager.setToken(token);
            if (user) {
              StateManager.setUserProfile(user);
              UI.hydrateProfile(user);
            }
            if (typeof window.showMainDashboard === 'function') {
              window.showMainDashboard();
            }
            if (typeof window.switchView === 'function') {
              window.switchView('home');
            }
            if (typeof onAuthSuccess === 'function') {
              await onAuthSuccess();
            }
          } else {
            const errMsg = res.errors 
              ? (Array.isArray(res.errors) ? res.errors.join('. ') : Object.values(res.errors).flat().join('. '))
              : (res.error || res.message || 'Authentication failed.');
            if (errEl) { errEl.textContent = errMsg; errEl.classList.remove('hidden'); }
          }
        } catch (err) {
          if (errEl) { errEl.textContent = err.message || 'Server connection failed.'; errEl.classList.remove('hidden'); }
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = 'Sign In to Dashboard'; }
        }
      });
    }

    const signinCard = document.getElementById('signin-card');
    const signupCard = document.getElementById('signup-card');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToSignin = document.getElementById('switch-to-signin');

    if (switchToRegister && switchToSignin) {
      switchToRegister.addEventListener('click', () => {
        if (signinCard) signinCard.classList.add('hidden');
        if (signupCard) signupCard.classList.remove('hidden');
      });
      switchToSignin.addEventListener('click', () => {
        if (signupCard) signupCard.classList.add('hidden');
        if (signinCard) signinCard.classList.remove('hidden');
      });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('signup-error');
        const btn = document.getElementById('signup-btn');

        const firstName = document.querySelector('#signup-form [name="first_name"]')?.value.trim();
        const lastName = document.querySelector('#signup-form [name="last_name"]')?.value.trim();
        const position = document.querySelector('#signup-form [name="position"]')?.value.trim();
        const regionId = document.querySelector('#signup-form [name="region_id"]')?.value.trim();
        const divisionId = document.querySelector('#signup-form [name="division_id"]')?.value.trim();
        const email = document.querySelector('#signup-form [name="deped_email"]')?.value.trim();
        const password = document.querySelector('#signup-form [name="password"]')?.value;
        const confirmPass = document.getElementById('reg-confirm-password')?.value;

        if (!firstName || !lastName || !position || !regionId || !divisionId || !email || !password) {
          if (errEl) { errEl.textContent = 'Please fill in all required fields.'; errEl.classList.remove('hidden'); }
          return;
        }
        if (password !== confirmPass) {
          if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.classList.remove('hidden'); }
          return;
        }

        if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
        if (btn) { btn.disabled = true; btn.textContent = 'Registering…'; }

        try {
          const res = await API.register({ first_name: firstName, last_name: lastName, position, region_id: regionId, division_id: divisionId, deped_email: email, password });
          const token = res.token || (res.data && res.data.token);
          const user = res.user || (res.data && res.data.user);
          if (token) {
            StateManager.setToken(token);
            if (user) {
              StateManager.setUserProfile(user);
              UI.hydrateProfile(user);
            }
            if (typeof window.showMainDashboard === 'function') {
              window.showMainDashboard();
            }
            if (typeof window.switchView === 'function') {
              window.switchView('home');
            }
            if (typeof onAuthSuccess === 'function') {
              await onAuthSuccess();
            }
          } else {
            if (errEl) { errEl.textContent = res.error || res.message || 'Registration failed.'; errEl.classList.remove('hidden'); }
          }
        } catch (err) {
          if (errEl) { errEl.textContent = err.message || 'Server connection error.'; errEl.classList.remove('hidden'); }
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = 'Register Account'; }
        }
      });
    }

    const btnSignout = document.getElementById('btn-signout') || document.getElementById('signOutBtn');
    if (btnSignout) {
      btnSignout.addEventListener('click', () => {
        StateManager.clearSession();
        window.location.reload();
      });
    }
  },

  setupFilterListeners(onFiltersChange) {
    const searchInput = document.getElementById('audit-search') || document.getElementById('audit-search-input');
    const regionSelect = document.getElementById('audit-region-select');

    const triggerChange = debounce(() => {
      const search = searchInput ? searchInput.value : '';
      const region = regionSelect ? regionSelect.value : '';
      if (typeof onFiltersChange === 'function') {
        onFiltersChange({ search, region });
      }
    }, 300);

    if (searchInput) searchInput.addEventListener('input', triggerChange);
    if (regionSelect) regionSelect.addEventListener('change', triggerChange);
  },

  setupSaveButton(onSaveSuccess) {
    const saveBtn = document.getElementById('save-changes-btn') || document.getElementById('btn-save-changes');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const edits = StateManager.getStagedEdits();
        const pendingCount = Object.keys(edits).length;

        if (pendingCount === 0) {
          alert('No uncommitted changes to save.');
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Changes...';

        try {
          const promises = Object.entries(edits).map(([id, fields]) => {
            return API.updateRecord(id, fields);
          });
          await Promise.all(promises);
          StateManager.clearStagedEdits();
          StateManager.invalidateCache();
          UI.updateSaveChangesUI();
          alert('All changes saved successfully!');
          if (typeof onSaveSuccess === 'function') {
            await onSaveSuccess();
          } else {
            window.location.reload();
          }
        } catch (err) {
          alert(`Failed to save changes: ${err.message}`);
        } finally {
          UI.updateSaveChangesUI();
        }
      });
    }
  },

  setupCollaboratorsListeners() {
    const inviteBtn = document.getElementById('btn-invite-collaborator');
    if (inviteBtn) {
      inviteBtn.addEventListener('click', async () => {
        const firstNameEl = document.getElementById('collab-first-name');
        const lastNameEl = document.getElementById('collab-last-name');
        const positionEl = document.getElementById('collab-position');
        const emailEl = document.getElementById('collab-email');

        const firstName = firstNameEl ? firstNameEl.value.trim() : '';
        const lastName = lastNameEl ? lastNameEl.value.trim() : '';
        const position = positionEl ? positionEl.value.trim() : '';
        const email = emailEl ? emailEl.value.trim() : '';

        if (!firstName || !lastName || !email) {
          alert('Please fill out First Name, Last Name, and Email address.');
          return;
        }

        inviteBtn.disabled = true;
        inviteBtn.textContent = 'Inviting...';

        try {
          const res = await API.inviteCollaborator({ first_name: firstName, last_name: lastName, position, email });
          if (res.success) {
            alert(`Success! Collaborator ${firstName} ${lastName} has been invited.\n\nLogin Email: ${email}\nDefault Password: 123456`);
            if (firstNameEl) firstNameEl.value = '';
            if (lastNameEl) lastNameEl.value = '';
            if (positionEl) positionEl.value = '';
            if (emailEl) emailEl.value = '';
            const collabModule = await import('./app.js');
            if (typeof collabModule.loadCollaborators === 'function') {
              collabModule.loadCollaborators();
            }
          }
        } catch (err) {
          alert(`Failed to invite collaborator: ${err.message}`);
        } finally {
          inviteBtn.disabled = false;
          inviteBtn.textContent = 'Invite collaborator';
        }
      });
    }
  }
};
