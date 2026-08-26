import { CONFIG } from './config.js';

let memoryCache = {
  records: null,
  kpis: null,
  lastFetch: 0
};

let recordsCacheStore = {};
let kpisCacheStore = {};
let currentRecordsData = [];

export const StateManager = {
  getToken() {
    return localStorage.getItem('dpa_token') || localStorage.getItem('token');
  },

  setToken(token) {
    localStorage.setItem('dpa_token', token);
    localStorage.setItem('token', token);
  },

  getUserProfile() {
    try {
      return JSON.parse(localStorage.getItem('user_profile')) || null;
    } catch {
      return null;
    }
  },

  setUserProfile(user) {
    if (user) {
      localStorage.setItem('user_profile', JSON.stringify(user));
    }
  },

  clearSession() {
    localStorage.removeItem('dpa_token');
    localStorage.removeItem('token');
    localStorage.removeItem('stagedEdits');
    localStorage.removeItem('user_profile');
    memoryCache = { records: null, kpis: null, lastFetch: 0 };
    recordsCacheStore = {};
    kpisCacheStore = {};
    currentRecordsData = [];
  },

  getStagedEdits() {
    try {
      return JSON.parse(localStorage.getItem('stagedEdits')) || {};
    } catch {
      return {};
    }
  },

  stageEdit(recordId, field, val) {
    const edits = this.getStagedEdits();
    if (!edits[recordId]) edits[recordId] = {};
    edits[recordId][field] = val;
    localStorage.setItem('stagedEdits', JSON.stringify(edits));
  },

  clearStagedEdits() {
    localStorage.removeItem('stagedEdits');
  },

  isCacheValid() {
    return (Date.now() - memoryCache.lastFetch) < CONFIG.CACHE_TTL && memoryCache.records !== null;
  },

  getCache() {
    return memoryCache;
  },

  setCache(records, kpis) {
    memoryCache.records = records;
    memoryCache.kpis = kpis;
    memoryCache.lastFetch = Date.now();
  },

  invalidateCache() {
    memoryCache.records = null;
    memoryCache.kpis = null;
    recordsCacheStore = {};
    kpisCacheStore = {};
  },

  getRecordsCacheStore() {
    return recordsCacheStore;
  },

  setRecordsCache(key, data) {
    recordsCacheStore[key] = data;
  },

  getKpisCacheStore() {
    return kpisCacheStore;
  },

  setKpisCache(key, data) {
    kpisCacheStore[key] = data;
  },

  getCurrentRecords() {
    return currentRecordsData;
  },

  setCurrentRecords(records) {
    currentRecordsData = records;
  }
};
