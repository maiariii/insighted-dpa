import { CONFIG } from './config.js';
import { StateManager } from './state.js';

export const API = {
  async request(endpoint, options = {}) {
    const isAuthRoute = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register') || endpoint.startsWith('/auth/regions-divisions');
    const token = StateManager.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Do not attach stale Authorization headers on login/register/regions-divisions endpoints
    if (token && !isAuthRoute) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      if (isAuthRoute) {
        const errorMsg = data.errors 
          ? (Array.isArray(data.errors) ? data.errors.join('. ') : Object.values(data.errors).flat().join('. '))
          : (data.error || data.message || 'Invalid email or password.');
        throw new Error(errorMsg);
      }

      StateManager.clearSession();
      if (typeof window.showGatedAuth === 'function') {
        window.showGatedAuth();
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const errorMsg = data.errors 
        ? (Array.isArray(data.errors) ? data.errors.join('. ') : Object.values(data.errors).flat().join('. '))
        : (data.error || data.message || `HTTP ${response.status}: Request failed.`);
      throw new Error(errorMsg);
    }

    return data;
  },

  async login(deped_email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ deped_email, password })
    });
  },

  async register(payload) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getRegionsDivisions() {
    return this.request('/auth/regions-divisions');
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async getRecords(params = {}) {
    const queryParams = new URLSearchParams(params);
    const qs = queryParams.toString();
    return this.request(`/personnel-audit/records${qs ? '?' + qs : ''}`);
  },

  async getKPIs(params = {}) {
    const queryParams = new URLSearchParams(params);
    const qs = queryParams.toString();
    return this.request(`/personnel-audit/kpis${qs ? '?' + qs : ''}`);
  },

  async getInterventions() {
    return this.request('/personnel-audit/interventions');
  },

  async createIntervention(payload) {
    return this.request('/personnel-audit/interventions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateRecord(id, fields) {
    return this.request(`/personnel-audit/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fields)
    });
  },

  async getCollaborators() {
    return this.request('/collaborators');
  },

  async inviteCollaborator(payload) {
    return this.request('/collaborators/invite', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteCollaborator(id) {
    return this.request(`/collaborators/${id}`, {
      method: 'DELETE'
    });
  }
};
