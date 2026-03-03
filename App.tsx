import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Assets from './pages/Assets';
import Scanner from './pages/Scanner';
import Audit from './pages/Audit';
import UsersPage from './pages/Users';
import DepartmentsPage from './pages/Departments';
import ReportsPage from './pages/Reports';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ children, requireAdmin }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="assets" element={<Assets />} />
        <Route path="scanner" element={<Scanner />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={
          <ProtectedRoute requireAdmin>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="departments" element={
          <ProtectedRoute requireAdmin>
            <DepartmentsPage />
          </ProtectedRoute>
        } />
        <Route path="audit" element={
          <ProtectedRoute requireAdmin>
            <Audit />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;