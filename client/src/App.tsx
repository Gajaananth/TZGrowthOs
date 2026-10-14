import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';

import Sidebar from './components/Sidebar';
import BottomTabBar from './components/BottomTabBar';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GrowthPlanPage from './pages/GrowthPlanPage';
import ProductsPage from './pages/ProductsPage';
import PrioritiesPage from './pages/PrioritiesPage';
import CreateCampaignPage from './pages/CreateCampaignPage';
import ReviewPage from './pages/ReviewPage';
import SeoHelperPage from './pages/SeoHelperPage';
import ResultsPage from './pages/ResultsPage';
import ChatPage from './pages/ChatPage';
import FestivalsPage from './pages/FestivalsPage';
import SettingsPage from './pages/SettingsPage';

const ProtectedLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-light)',
            borderTopColor: '#059669',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
          Starting GrowthOS...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<GrowthPlanPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/priorities" element={<PrioritiesPage />} />
              <Route path="/campaigns" element={<ReviewPage />} />
              <Route path="/campaigns/new" element={<CreateCampaignPage />} />
              <Route path="/seo" element={<SeoHelperPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/festivals" element={<FestivalsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
