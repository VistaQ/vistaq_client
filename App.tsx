
import React, { useState, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import GlobalNotification from './components/GlobalNotification';

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
const Support = React.lazy(() => import('./pages/Support'));
const Tutorials = React.lazy(() => import('./pages/Tutorials'));
const Coaching = React.lazy(() => import('./pages/Coaching'));
const AddToHomeScreen = React.lazy(() => import('./pages/AddToHomeScreen'));

const PageSpinner: React.FC = () => (
  <div className="flex h-full min-h-[60vh] items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);
const AuthenticatedApp: React.FC = () => {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={setActivePage} />;
      case 'prospects': return <Prospects />;
      case 'profile': return <Profile />;

      // Admin Routes
      case 'users': return <AdminUsers />;
      case 'admin-groups': return <AdminGroups />;

      case 'points': return <PointsHistory />;
      case 'leaderboard': return <Leaderboard />;
      case 'admin-rewards': return <AdminRewards />;
      case 'group': return <Group />;
      case 'sales': return <Sales />;
      case 'reports': return <Reports />;
      case 'events': return <MyCalendar />;
      case 'coaching': return <Coaching />;
      case 'import': return <Import />;
      case 'support': return <Support />;
      case 'tutorials': return <Tutorials onNavigate={setActivePage} />;
      case 'add-to-home-screen': return <AddToHomeScreen onBack={() => setActivePage('tutorials')} />;
      case 'privacy-policy': return <PrivacyPolicy />;

      default: return <Dashboard />;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      <Suspense fallback={<PageSpinner />}>
        {renderPage()}
      </Suspense>
    </Layout>
  );
};

type AuthView = 'login' | 'signup' | 'privacy';

const AuthFlow: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<AuthView>('login');

  if (isAuthenticated) {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
    return <AuthenticatedApp />;
  }

  return (
    <Suspense fallback={<PageSpinner />}>
      {view === 'login' && (
        <Login onSwitchToSignup={() => setView('signup')} />
      )}
      {view === 'signup' && (
        <Signup
          onSwitchToLogin={() => setView('login')}
          onNavigateToPolicy={(page) => setView(page)}
        />
      )}
      {view === 'privacy' && (
        <PrivacyPolicy onBack={() => setView('signup')} />
      )}
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <GlobalNotification />
        <AuthFlow />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
