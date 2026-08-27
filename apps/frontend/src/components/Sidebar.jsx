import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, ClipboardList, Lightbulb, BookOpen, Settings, Moon, Sun, LogOut } from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useApp();

  const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'HRMO User' : 'HRMO User';
  const position = user?.position || 'Human Resource Management Officer';
  const regionName = user?.region_name || user?.region_id || '';
  const divisionName = user?.division_office_name || user?.division_id || '';
  const location = [regionName, divisionName].filter(Boolean).join(' • ') || 'DepEd National Office';

  return (
    <aside className="sidebar glass">
      <div className="brand">
        <div className="bg-white p-1 rounded-2xl shadow-md border border-slate-200/80 flex items-center justify-center flex-shrink-0 mr-1 overflow-hidden" style={{ width: '50px', height: '50px' }}>
          <img src={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/insighted_logo_vertical.png`} alt="InsightED Logo" className="w-full h-full object-contain" style={{ transform: 'scale(1.8)' }} />
        </div>
        <div className="collapsible-text" style={{ wordBreak: 'break-word', minWidth: 0, maxWidth: '100%' }}>
          <h1 className="font-extrabold text-base text-slate-900 dark:text-white">DepEd Personnel Audit</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Division vacancy monitoring</p>
        </div>
      </div>

      <hr className="sidebar-divider" />

      <div className="profile-card collapsible-text flex flex-col justify-center space-y-1 my-2">
        <strong className="text-sm font-bold text-slate-800 dark:text-white block leading-snug break-words">{fullName}</strong>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block leading-snug break-words">{position}</span>
        <span className="text-xs text-slate-400 dark:text-slate-400 block leading-snug break-words mt-0.5">{location}</span>
      </div>

      <nav className="nav" aria-label="Primary navigation">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon"><LayoutDashboard size={18} /></span>
          <span className="collapsible-text">Home</span>
        </NavLink>
        <NavLink to="/audit" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon"><ClipboardList size={18} /></span>
          <span className="collapsible-text">Personnel Audit</span>
        </NavLink>
        <NavLink to="/interventions" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon"><Lightbulb size={18} /></span>
          <span className="collapsible-text">Interventions</span>
        </NavLink>
        <NavLink to="/guide" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon"><BookOpen size={18} /></span>
          <span className="collapsible-text">User Guide</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon"><Settings size={18} /></span>
          <span className="collapsible-text">Settings</span>
        </NavLink>
      </nav>

      <button
        type="button"
        className="btn secondary sidebar-dark-btn"
        onClick={toggleTheme}
        style={{ minHeight: '42px', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 800 }}
      >
        <span>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</span>
        <span className="collapsible-text">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      <button
        type="button"
        id="btn-signout"
        className="btn secondary sidebar-signout-btn flex items-center justify-center text-center"
        onClick={logout}
        style={{ minHeight: '42px', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 800, color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.2)', background: 'rgba(254, 226, 226, 0.4)' }}
      >
        <LogOut size={18} />
        <span className="collapsible-text">Sign Out</span>
      </button>

      <div className="sidebar-footer collapsible-text">
        Access is scoped to the HRMO’s assigned region and division. Collaborators inherit the same region and division from the assigning HRMO.
      </div>
    </aside>
  );
};
