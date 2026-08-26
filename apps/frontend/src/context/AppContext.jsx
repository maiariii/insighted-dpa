import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const { token } = useAuth();

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  });

  // Global lookup state
  const [regions, setRegions] = useState([]);
  const [divisions, setDivisions] = useState([]);

  // Data states
  const [records, setRecords] = useState([]);
  const [kpis, setKpis] = useState({});
  const [interventions, setInterventions] = useState([]);
  const [collaborators, setCollaborators] = useState([]);

  // UI state & filters
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('');

  // Staged edits state
  const [stagedEdits, setStagedEdits] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('stagedEdits')) || {};
    } catch {
      return {};
    }
  });

  // Apply theme to document element
  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    if (document.body) document.body.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Fetch static regions & divisions lookup once
  useEffect(() => {
    let isMounted = true;
    API.auth.getRegionsDivisions()
      .then(data => {
        if (isMounted) {
          setRegions(data.regions || []);
          setDivisions(data.divisions || []);
        }
      })
      .catch(err => {
        console.warn('Could not fetch region/division lookup:', err.message);
      });
    return () => { isMounted = false; };
  }, []);

  // Hydrate dashboard data whenever authenticated token changes
  const refreshDashboard = useCallback(async () => {
    if (!token) return;
    setLoadingDashboard(true);
    try {
      const [recordsRes, kpisRes, interventionsRes, collabRes] = await Promise.all([
        API.dpa.getPersonnelAudits().catch(err => { console.error("API.dpa.getPersonnelAudits error:", err); return []; }),
        API.dpa.getKPIs().catch(err => { console.error("API.dpa.getKPIs error:", err); return {}; }),
        API.dpa.getInterventions().catch(err => { console.error("API.dpa.getInterventions error:", err); return []; }),
        API.collaborators.getCollaborators().catch(err => { console.error("API.collaborators.getCollaborators error:", err); return { collaborators: [] }; })
      ]);


      const loadedRecords = Array.isArray(recordsRes) ? recordsRes : (recordsRes.data || recordsRes.records || []);
      const loadedKpis = kpisRes || {};
      const loadedInterventions = Array.isArray(interventionsRes) ? interventionsRes : (interventionsRes.data || []);
      const loadedCollaborators = collabRes.collaborators || (Array.isArray(collabRes) ? collabRes : []);

      setRecords(loadedRecords);
      setKpis(loadedKpis);
      setInterventions(loadedInterventions);
      setCollaborators(loadedCollaborators);
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    } finally {
      setLoadingDashboard(false);
    }
  }, [token]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // Staged edit handlers
  const stageEdit = useCallback((recordId, field, val) => {
    setStagedEdits(prev => {
      const updated = { ...prev };
      if (!updated[recordId]) updated[recordId] = {};
      updated[recordId][field] = val;
      localStorage.setItem('stagedEdits', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearStagedEdits = useCallback(() => {
    setStagedEdits({});
    localStorage.removeItem('stagedEdits');
  }, []);

  const saveChanges = useCallback(async () => {
    const editEntries = Object.entries(stagedEdits);
    if (editEntries.length === 0) return;

    const promises = editEntries.map(([id, fields]) => API.dpa.updateRecord(id, fields));
    await Promise.all(promises);
    clearStagedEdits();
    await refreshDashboard();
  }, [stagedEdits, clearStagedEdits, refreshDashboard]);

  // Helper check for record completion
  const isRecordCompleted = useCallback((record) => {
    const itemStatus = record.item_status || record.ITEM_STATUS || record['ITEM STATUS'] || '';
    return itemStatus.toString().toLowerCase() === 'audited'
      || record.position_status === 'FILLED' || record['POSITION STATUS'] === 'FILLED'
      || record.is_audited === true || record.is_completed === true;
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        regions,
        divisions,
        records,
        kpis,
        interventions,
        collaborators,
        loadingDashboard,
        refreshDashboard,
        searchQuery,
        setSearchQuery,
        selectedRegionFilter,
        setSelectedRegionFilter,
        selectedStatusFilter,
        setSelectedStatusFilter,
        activeCategoryFilter,
        setActiveCategoryFilter,
        stagedEdits,
        stageEdit,
        clearStagedEdits,
        saveChanges,
        isRecordCompleted
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
