
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Prospects from './pages/Prospects';
import Reports from './pages/Reports';
import PointsHistory from './pages/PointsHistory';
import Group from './pages/Group';
import Agents from './pages/Agents';
import Sales from './pages/Sales';
import AdminUsers from './pages/AdminUsers';
import AdminGroups from './pages/AdminGroups';
import AdminRewards from './pages/AdminRewards';
import Import from './pages/Import';
import Events from './pages/Events';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';

const AuthenticatedApp: React.FC = () => {
  // Default to dashboard
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch(activePage) {
      case 'dashboard': return <Dashboard />;
      case 'prospects': return <Prospects />;
      case 'profile': return <Profile />;
      
      // Admin Routes (Re-enabled for Phase 1 Config)
      case 'users': return <AdminUsers />;
      case 'admin-groups': return <AdminGroups />;
      
      // Hidden / Disabled for Phase 1 but code preserved
      case 'points': return <PointsHistory />;
      case 'admin-rewards': return <AdminRewards />;
      case 'group': return <Group />; 
      case 'agents': return <Agents />;
      case 'sales': return <Sales />;
      case 'reports': return <Reports />;
      case 'events': return <Events />;
      case 'import': return <Import />;
      
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </Layout>
  );
};

const AuthFlow: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [isLogin, setIsLogin] = useState(true);

    if (isAuthenticated) {
        return <AuthenticatedApp />;
    }

    if (isLogin) {
        return <Login onSwitchToSignup={() => setIsLogin(false)} />;
    }

    return <Signup onSwitchToLogin={() => setIsLogin(true)} />;
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
         <AuthFlow />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
