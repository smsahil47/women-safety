import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import MainLayout from './layout/MainLayout';
import ToastContainer from './components/ui/ToastContainer';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SafeRoutePage from './pages/SafeRoutePage';
import TrackingPage from './pages/TrackingPage';
import SOSPage from './pages/SOSPage';
import ContactsPage from './pages/ContactsPage';
import ReportsPage from './pages/ReportsPage';
import HeatmapPage from './pages/HeatmapPage';

// ─── Protected Route ──────────────────────────────────────────────────────────

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
};

// ─── App Routes ───────────────────────────────────────────────────────────────

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useApp();

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/safe-route" element={<ProtectedRoute><SafeRoutePage /></ProtectedRoute>} />
      <Route path="/tracking" element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />
      <Route path="/sos" element={<ProtectedRoute><SOSPage /></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/heatmap" element={<ProtectedRoute><HeatmapPage /></ProtectedRoute>} />

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <ToastContainer />
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
