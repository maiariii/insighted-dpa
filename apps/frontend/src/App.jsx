import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { HomeDashboard } from './pages/HomeDashboard';
import { AuditDashboard } from './pages/AuditDashboard';
import { Interventions } from './pages/Interventions';
import { Settings } from './pages/Settings';

const HeaderTitleMapper = () => {
  const location = useLocation();
  let title = 'DepEd Personnel Audit';
  let subtitle = 'Live summary of unfilled plantilla items and vacancy reasons.';

  if (location.pathname === '/audit') {
    title = 'Personnel Audit Main Panel';
    subtitle = 'Item Number and Position Title stay frozen during horizontal scroll.';
  } else if (location.pathname === '/interventions') {
    title = 'Interventions Workspace';
    subtitle = 'Part II: Strategic actions designed to accelerate vacancy processing.';
  } else if (location.pathname === '/settings') {
    title = 'HRMO Settings & Collaborators';
    subtitle = 'Manage account scope and invite collaboration helpers.';
  }

  return <Header title={title} subtitle={subtitle} />;
};

const MainLayout = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold text-lg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading DepEd Personnel Audit Portal...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Login />;
  }

  return (
    <div className="app-shell" id="appShell">
      <Sidebar />
      <main>
        <HeaderTitleMapper />
        <Routes>
          <Route path="/" element={<HomeDashboard />} />
          <Route path="/audit" element={<AuditDashboard />} />
          <Route path="/interventions" element={<Interventions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter basename={window.location.pathname.startsWith('/insighted-dpa') ? '/insighted-dpa' : '/'}>
          <MainLayout />
          <footer>
            Department of Education Personnel Audit System • Official BHROD Portal
          </footer>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
