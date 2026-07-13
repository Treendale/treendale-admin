import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppointmentsPage from './pages/AppointmentsPage';
import BookingsInboxPage from './pages/BookingsInboxPage';
import StaffPage from './pages/StaffPage';
import ServicesPage from './pages/ServicesPage';
import ClientsPage from './pages/ClientsPage';
import ContentPage from './pages/ContentPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdminAuth();
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <RequireAdmin>
          <AdminLayout>
            <Routes>
              <Route path="/"              element={<DashboardPage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/inbox"        element={<BookingsInboxPage />} />
              <Route path="/staff"        element={<StaffPage />} />
              <Route path="/services"     element={<ServicesPage />} />
              <Route path="/clients"      element={<ClientsPage />} />
              <Route path="/content"      element={<ContentPage />} />
              <Route path="/settings"     element={<SettingsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/reports"      element={<ReportsPage />} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          </AdminLayout>
        </RequireAdmin>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AdminRoutes />
    </AdminAuthProvider>
  );
}
