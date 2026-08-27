import { CONFIG } from '../utils/config';

export const API = {
  getToken() {
    return localStorage.getItem('dpa_token') || localStorage.getItem('token');
  },

  async request(endpoint, options = {}) {
    const isAuthRoute = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register') || endpoint.startsWith('/auth/regions-divisions') || endpoint.startsWith('/auth/request-passcode') || endpoint.startsWith('/auth/login-passcode');
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token && !isAuthRoute) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('/') ? `${CONFIG.API_BASE}${endpoint}` : `${CONFIG.API_BASE}/${endpoint}`;

    try {
      if (options.method && options.method !== 'GET') {
        console.log(`[API Request] ${options.method} ${url}`, options.body ? JSON.parse(options.body) : '');
      }
    } catch {
      console.log(`[API Request] ${options.method || 'GET'} ${url}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const errorMsg = data.errors 
        ? (Array.isArray(data.errors) ? data.errors.join('. ') : Object.values(data.errors).flat().join('. '))
        : (data.error || data.message || `HTTP ${response.status}: Request failed.`);
      console.error(`[API Error] HTTP ${response.status} ${url}:`, errorMsg, data);
    } else if (options.method && options.method !== 'GET') {
      console.log(`[API Response] HTTP ${response.status} ${url}:`, data);
    }

    if (response.status === 401) {
      if (isAuthRoute) {
        const errorMsg = data.errors 
          ? (Array.isArray(data.errors) ? data.errors.join('. ') : Object.values(data.errors).flat().join('. '))
          : (data.error || data.message || 'Invalid email or credentials.');
        throw new Error(errorMsg);
      }

      localStorage.removeItem('dpa_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user_profile');
      window.dispatchEvent(new Event('auth:unauthorized'));
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

  auth: {
    async login(deped_email, password) {
      return API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ deped_email, password })
      });
    },

    async requestPasscode(deped_email) {
      return API.request('/auth/request-passcode', {
        method: 'POST',
        body: JSON.stringify({ deped_email })
      });
    },

    async loginPasscode(deped_email, passcode) {
      return API.request('/auth/login-passcode', {
        method: 'POST',
        body: JSON.stringify({ deped_email, passcode })
      });
    },

    async register(payload) {
      return API.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async getRegionsDivisions() {
      return API.request('/auth/regions-divisions');
    },

    async getMe() {
      return API.request('/auth/me');
    },

    async changePassword(payload) {
      return API.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async verifyPasscode(passcode) {
      return API.request('/auth/verify-passcode', {
        method: 'POST',
        body: JSON.stringify({ passcode })
      });
    }
  },

  dpa: {
    async getPersonnelAudits(params = {}) {
      const queryParams = new URLSearchParams(params);
      const qs = queryParams.toString();
      return API.request(`/personnel-audit/records${qs ? '?' + qs : ''}`);
    },

    async getKPIs(params = {}) {
      const queryParams = new URLSearchParams(params);
      const qs = queryParams.toString();
      return API.request(`/personnel-audit/kpis${qs ? '?' + qs : ''}`);
    },

    async getInterventions() {
      return API.request('/personnel-audit/interventions');
    },

    async createIntervention(payload) {
      return API.request('/personnel-audit/interventions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async updateIntervention(id, payload) {
      return API.request(`/personnel-audit/interventions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },

    async deleteIntervention(id) {
      return API.request(`/personnel-audit/interventions/${id}`, {
        method: 'DELETE'
      });
    },

    async updateRecord(id, fields) {
      return API.request(`/personnel-audit/${id}`, {
        method: 'PUT',
        body: JSON.stringify(fields)
      });
    }
  },

  collaborators: {
    async getCollaborators() {
      return API.request('/collaborators');
    },

    async inviteCollaborator(payload) {
      return API.request('/collaborators/invite', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async deleteCollaborator(id) {
      return API.request(`/collaborators/${id}`, {
        method: 'DELETE'
      });
    }
  }
};
