import { API } from './api.js';
import { StateManager } from './state.js';
import { UI, parseRemarksValue } from './ui.js';

let interventionAddedCallback = null;

// Resolves a field's effective value for a row: staged edit takes priority over
// the record's persisted value (checked under both its plain key and its
// "SPACED ALIAS" key from the /records SELECT).
function resolveFieldValue(recordId, field, aliasKey) {
  const edits = StateManager.getStagedEdits()[recordId] || {};
  if (edits[field] !== undefined) return edits[field];
  const record = (StateManager.getCurrentRecords() || []).find(r => String(r.id) === String(recordId)) || {};
  if (record[field] !== undefined && record[field] !== null) return record[field];
  if (aliasKey && record[aliasKey] !== undefined && record[aliasKey] !== null) return record[aliasKey];
  return '';
}

// A row counts as a completed audit once its position status has all of the
// data required for that status: incumbent name + first day of service when
// FILLED, or reason + status of vacancy + tentative fill-up date when still
// UNFILLED. Previously "is_audited" was only ever set on the FILLED transition,
// so an UNFILLED row that had its reason/status/tentative-date fully filled in
// and saved never got marked audited and therefore never moved into the
// Finalized / Audited Personnel Records table — this restores that path.
function computeIsAudited(recordId) {
  const positionStatus = resolveFieldValue(recordId, 'position_status', 'POSITION STATUS') || 'UNFILLED';

  if (positionStatus === 'FILLED') {
    return !!(
      resolveFieldValue(recordId, 'name_of_incumbent', 'NAME OF INCUMBENT') &&
      resolveFieldValue(recordId, 'first_day_of_service', 'FIRST DAY OF SERVICE')
    );
  }

  return !!(
    resolveFieldValue(recordId, 'reason_for_vacancy', 'REASON FOR VACANCY') &&
    resolveFieldValue(recordId, 'status_of_vacancy', 'STATUS OF VACANCY') &&
    resolveFieldValue(recordId, 'tentative_date_to_fill_up', 'TENTATIVE DATE TO FILL-UP')
  );
}

function syncAuditedFlag(recordId) {
  StateManager.stageEdit(recordId, 'is_audited', computeIsAudited(recordId));
}

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
        // 1. Prevent default browser form submission reload
        e.preventDefault();
        console.log('[Auth] Sign-in form submit intercepted.');
        
        // 2. Extract DOM targets associated with deped_email and password
        const emailEl = document.querySelector('#signin-form [name="deped_email"]') || document.getElementById('signin-email') || document.getElementById('login-email');
        const passEl = document.querySelector('#signin-form [name="password"]') || document.getElementById('signin-password') || document.getElementById('login-password');
        const errEl = document.getElementById('signin-error') || document.getElementById('login-error');
        const btn = document.getElementById('signin-btn') || document.getElementById('login-btn');

        console.log('[Auth] DOM elements found:', { emailEl: !!emailEl, passEl: !!passEl, errEl: !!errEl, btn: !!btn });
        if (!emailEl || !passEl) {
          console.error('[Auth] CRITICAL: Could not find email or password input elements.');
          return;
        }
        const email = emailEl.value.trim();
        const password = passEl.value;

        if (!email || !password) {
          if (errEl) { 
            errEl.textContent = 'Please enter your DepEd Email and Password.'; 
            errEl.classList.remove('hidden'); 
          }
          return;
        }

        // Reset error state & disable button while awaiting API response
        if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
        if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

        let loginSuccess = false;

        // 3. Wrap API login call in try-catch block
        try {
          console.log('[Auth] Calling API.login for:', email);
          const res = await API.login(email, password);
          console.log('[Auth] API.login raw response:', res);

          const token = res.token || (res.data && res.data.token);
          const user = res.user || (res.data && res.data.user);
          console.log('[Auth] Extracted token:', !!token, '| user:', !!user);
          
          if (token) {
            // 6. Persist session token and user profile via StateManager
            StateManager.setToken(token);
            if (user) {
              StateManager.setUserProfile(user);
              UI.hydrateProfile(user);
            }
            loginSuccess = true;
          } else {
            const errMsg = res.errors 
              ? (Array.isArray(res.errors) ? res.errors.join('. ') : Object.values(res.errors).flat().join('. '))
              : (res.error || res.message || 'Authentication failed.');
            console.error('[Auth] No token in response. Error:', errMsg);
            if (errEl) { errEl.textContent = errMsg; errEl.classList.remove('hidden'); }
          }
        } catch (err) {
          // 5. Catch and display error message to user
          console.error('[Auth] API.login threw an error:', err);
          if (errEl) { errEl.textContent = err.message || 'Server connection failed.'; errEl.classList.remove('hidden'); }
        } finally {
          // 4 & 7. Re-enable button with verified string 'Sign In to Dashboard'
          if (btn) { btn.disabled = false; btn.textContent = 'Sign In to Dashboard'; }
        }

        // 6. Trigger view transition AFTER try-catch completes (outside try block
        //    so dashboard load errors don't interfere with the auth error display)
        if (loginSuccess) {
          console.log('[Auth] Login successful — transitioning to dashboard.');

          // Show main dashboard — hide gated auth portal
          if (typeof window.showMainDashboard === 'function') {
            window.showMainDashboard();
          } else {
            console.error('[Auth] window.showMainDashboard is not defined!');
          }

          if (typeof window.switchView === 'function') {
            window.switchView('home');
          }

          // Trigger onAuthSuccess callback to hydrate profile and load dashboard data
          if (typeof onAuthSuccess === 'function') {
            try {
              await onAuthSuccess();
            } catch (dashErr) {
              // Dashboard load failure should not block the view transition
              console.error('[Auth] onAuthSuccess (dashboard load) failed:', dashErr);
            }
          }
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

  handlePositionStatusChange(recordId, newStatus) {
    if (newStatus === 'UNFILLED') {
      StateManager.stageEdit(recordId, 'position_status', 'UNFILLED');
      StateManager.stageEdit(recordId, 'name_of_incumbent', '');
      StateManager.stageEdit(recordId, 'first_day_of_service', '');
    } else if (newStatus === 'FILLED') {
      StateManager.stageEdit(recordId, 'position_status', 'FILLED');
      StateManager.stageEdit(recordId, 'date_of_vacancy', '');
      StateManager.stageEdit(recordId, 'reason_for_vacancy', '');
      StateManager.stageEdit(recordId, 'status_of_vacancy', '');
      StateManager.stageEdit(recordId, 'tentative_date_to_fill_up', '');
    }
    syncAuditedFlag(recordId);
    UI.updateSaveChangesUI();
    // Patch just this row in place — a full table rebuild isn't needed here.
    // Toggling FILLED/UNFILLED changes which fields this one row shows as
    // editable vs N/A, but doesn't change which rows are on this page or move
    // anything into the Finalized table (that only happens after Save + reload).
    UI.patchRow(recordId);
  },

  handleFieldChange(recordId, field, value) {
    const cleanVal = field === 'name_of_incumbent' && typeof value === 'string' ? value.toUpperCase() : value;
    StateManager.stageEdit(recordId, field, cleanVal);

    // Fields that feed into the audit-completion criteria: recompute the
    // finalize flag every time one of them changes, so it's always accurate
    // by the time "Save Changes" sends the payload — not just on the
    // position-status toggle.
    const auditRelevantFields = [
      'name_of_incumbent', 'first_day_of_service',
      'reason_for_vacancy', 'status_of_vacancy', 'tentative_date_to_fill_up'
    ];
    if (auditRelevantFields.includes(field)) {
      syncAuditedFlag(recordId);
    }

    UI.updateSaveChangesUI();
  },

  openRemarksModal(recordId, records = [], stagedEdits = {}) {
    const modal = document.getElementById('remarks-modal');
    const textarea = document.getElementById('remarks-text');
    const meta = document.getElementById('remarks-meta');
    const form = document.getElementById('remarks-form');
    if (!modal || !textarea || !form) return;

    const rowEdits = stagedEdits[recordId] || {};
    const record = records.find(r => String(r.id) === String(recordId)) || {};
    const raw = rowEdits.other_remarks !== undefined ? rowEdits.other_remarks : (record.other_remarks || record['OTHER REMARKS'] || '');
    const parsed = parseRemarksValue(raw);

    textarea.value = parsed.text || '';
    if (meta) {
      meta.textContent = parsed.updatedBy ? `Last updated by ${parsed.updatedBy}${parsed.updatedAt ? ' on ' + new Date(parsed.updatedAt).toLocaleString() : ''}` : '';
    }

    form.dataset.recordId = recordId;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.remove('opacity-0'));
  },

  setupRemarksModalListeners() {
    const modal = document.getElementById('remarks-modal');
    const form = document.getElementById('remarks-form');
    const btnClose = document.getElementById('close-remarks-modal');
    const btnCancel = document.getElementById('cancel-remarks-modal');
    const textarea = document.getElementById('remarks-text');

    const closeModal = () => {
      if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
      }
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const recordId = form.dataset.recordId;
        if (!recordId) return;

        const text = (textarea?.value || '').trim();
        const user = StateManager.getUserProfile() || {};
        const updatedBy = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'HRMO User';
        const payload = text ? { text, updatedBy, updatedAt: new Date().toISOString() } : '';

        this.handleFieldChange(recordId, 'other_remarks', payload ? JSON.stringify(payload) : '');
        closeModal();
        // Patch just this row so its remarks-button icon/title reflects the
        // new value, instead of rebuilding the entire table.
        UI.patchRow(recordId);
      });
    }
  },

  setupCategoryFilterListeners(onCategoryChange) {
    document.querySelectorAll('.personnel-tab[data-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        const isActive = btn.classList.contains('active');
        const nextCategory = isActive ? '' : category;
        if (typeof onCategoryChange === 'function') {
          onCategoryChange(nextCategory);
        }
      });
    });
  },

  setupInterventionsListeners(onInterventionAdded) {
    // The callback is refreshed on every call (it's just a thin wrapper around
    // loadDashboard()), but the DOM listeners below must only ever be bound once —
    // this function used to be re-invoked on every loadDashboard() cycle (initial
    // load, after every save, after every intervention add), and each call stacked
    // a brand new 'submit' listener onto the same static <form> element. That's why
    // the SECOND "Add Intervention" submission always fired the create request
    // twice and produced two identical cards: two listeners were both handling the
    // one submit event. Binding once here removes the root cause outright.
    interventionAddedCallback = onInterventionAdded;

    const form = document.getElementById('add-intervention-form');
    if (form && form.dataset.listenersBound === 'true') {
      return;
    }
    if (form) form.dataset.listenersBound = 'true';

    const btnAdd = document.getElementById('btn-add-intervention');
    const modal = document.getElementById('add-intervention-modal');
    const btnClose = document.getElementById('close-intervention-modal');
    const btnCancel = document.getElementById('cancel-intervention-modal');
    const errorEl = document.getElementById('intervention-error');
    const submitBtn = document.getElementById('submit-intervention-btn');

    const getTomorrow = () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const openModal = () => {
      // Render the modal immediately — no awaited fetch gates this anymore.
      // Any supporting data (flatpickr init below) is cheap, synchronous DOM work.
      if (modal) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.remove('opacity-0'));
      }
      if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }

      const targetDateInput = document.getElementById('intervention-target-date');
      if (targetDateInput && typeof flatpickr !== 'undefined' && !targetDateInput._flatpickr) {
        flatpickr(targetDateInput, {
          dateFormat: 'Y-m-d',
          changeMonth: true,
          changeYear: true,
          minDate: getTomorrow() // Only dates strictly after today are selectable
        });
      }
    };
    const closeModal = () => {
      if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
      }
      if (form) form.reset();
      const targetDateInput = document.getElementById('intervention-target-date');
      if (targetDateInput && targetDateInput._flatpickr) {
        targetDateInput._flatpickr.clear();
      }
    };

    if (btnAdd) btnAdd.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Double-submit guard: ignore re-entrant submits (double-click, Enter-key
        // repeat, etc.) while a create request is already in flight.
        if (submitBtn && submitBtn.disabled) return;

        const area_of_concern = document.getElementById('intervention-area-of-concern')?.value.trim();
        const intervention_to_undertake = document.getElementById('intervention-strategy')?.value.trim();
        const responsible_office = document.getElementById('intervention-office')?.value.trim();
        const target_date = document.getElementById('intervention-target-date')?.value;
        const expected_outcomes = document.getElementById('intervention-expected-outcomes')?.value.trim();
        const remarks = document.getElementById('intervention-remarks')?.value.trim();

        if (!area_of_concern || !intervention_to_undertake || !responsible_office || !target_date) {
          if (errorEl) {
            errorEl.textContent = 'Area of Concern, Intervention, Responsible Office, and Target Date are required.';
            errorEl.classList.remove('hidden');
          }
          return;
        }

        const targetDateObj = new Date(target_date);
        if (isNaN(targetDateObj.getTime()) || targetDateObj < getTomorrow()) {
          if (errorEl) {
            errorEl.textContent = 'Target Date must be a future date (after today).';
            errorEl.classList.remove('hidden');
          }
          return;
        }

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

        try {
          const res = await API.createIntervention({
            area_of_concern,
            intervention_to_undertake,
            responsible_office,
            target_date,
            expected_outcomes,
            remarks
          });

          if (res.success || res.intervention) {
            closeModal();
            if (typeof interventionAddedCallback === 'function') {
              await interventionAddedCallback();
            }
          } else {
            if (errorEl) {
              errorEl.textContent = res.error || 'Failed to add intervention.';
              errorEl.classList.remove('hidden');
            }
          }
        } catch (err) {
          if (errorEl) {
            errorEl.textContent = err.message || 'Server error saving intervention.';
            errorEl.classList.remove('hidden');
          }
        } finally {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Intervention'; }
        }
      });
    }
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

  setupCategoryModalListeners() {
    const modal = document.getElementById('category-items-modal');
    const btnClose = document.getElementById('close-category-modal');
    const btnCloseFooter = document.getElementById('close-category-modal-footer');
    if (!modal) return;

    const closeModal = () => {
      modal.classList.add('opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 300);
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
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
