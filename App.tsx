
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import GlobalNotification from './components/GlobalNotification';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Spinner from './components/ui/Spinner';

// Lazy-load all page components so Vite splits them into separate chunks.
// Only the chunk for the active page is downloaded and parsed.
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Prospects = React.lazy(() => import('./pages/Prospects'));
const Reports = React.lazy(() => import('./pages/Reports'));
const PointsHistory = React.lazy(() => import('./pages/PointsHistory'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const Group = React.lazy(() => import('./pages/Group'));
const Sales = React.lazy(() => import('./pages/Sales'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminGroups = React.lazy(() => import('./pages/AdminGroups'));
const AdminRewards = React.lazy(() => import('./pages/AdminRewards'));
const Import = React.lazy(() => import('./pages/Import'));
const MyCalendar = React.lazy(() => import('./pages/MyCalendar'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const Support = React.lazy(() => import('./pages/Support'));
const Tutorials = React.lazy(() => import('./pages/Tutorials'));
const Coaching = React.lazy(() => import('./pages/Coaching'));
const AddToHomeScreen = React.lazy(() => import('./pages/AddToHomeScreen'));
const EventPublicPage = React.lazy(() => import('./pages/EventPublicPage'));
const SalesReport = React.lazy(() => import('./pages/SalesReport'));

const PageSpinner: React.FC = () => (
  <div className="flex h-full min-h-[60vh] items-center justify-center">
    <Spinner size="lg" />
  </div>
);

// Renders Support inside the Layout sidebar when authenticated, standalone when not
const SupportRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Layout><React.Suspense fallback={<PageSpinner />}><Support /></React.Suspense></Layout>;
  }
  return <React.Suspense fallback={<PageSpinner />}><Support /></React.Suspense>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <GlobalNotification />
        <SessionTimeoutModal />
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/support" element={<SupportRoute />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/event/:eventId" element={<EventPublicPage />} />

            {/* Protected app routes — nested inside Layout */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route index element={<Navigate to="/dashboard" replace />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="prospects" element={<Prospects />} />
                      <Route path="events" element={<MyCalendar />} />
                      <Route path="coaching" element={<Coaching />} />
                      <Route path="leaderboard" element={<Leaderboard />} />
                      <Route path="sales" element={<Sales />} />
                      <Route path="points" element={<PointsHistory />} />
                      <Route path="group" element={<Group />} />
                      <Route path="sales-report" element={<SalesReport />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="import" element={<Import />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="tutorials" element={<Tutorials />} />
                      <Route path="add-to-home-screen" element={<AddToHomeScreen />} />
                      <Route path="users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                      <Route path="admin-groups" element={<AdminRoute><AdminGroups /></AdminRoute>} />
                      <Route path="admin-rewards" element={<AdminRoute><AdminRewards /></AdminRoute>} />
                      {/* Catch-all: unknown protected paths redirect to dashboard */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
