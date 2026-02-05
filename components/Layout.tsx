
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  BarChart, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Briefcase,
  GraduationCap,
  Award,
  Crown,
  DollarSign,
  UserCheck,
  Settings,
  Gift,
  Layers,
  Upload,
  CalendarDays,
  UserCircle,
  TrendingUp
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const { currentUser, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getRoleIcon = (role: UserRole) => {
    switch(role) {
      case UserRole.ADMIN: return <Shield className="w-4 h-4" />;
      case UserRole.TRAINER: return <GraduationCap className="w-4 h-4" />;
      case UserRole.GROUP_LEADER: return <Users className="w-4 h-4" />;
      default: return <Briefcase className="w-4 h-4" />;
    }
  };

  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => { onNavigate(id); setIsMobileMenuOpen(false); }}
      className={`relative flex items-center w-full px-6 py-3.5 text-sm font-medium transition-all duration-200 group ${
        activePage === id 
          ? 'text-white bg-white/10' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {activePage === id && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
      )}
      <Icon className={`w-5 h-5 mr-3 transition-colors ${
        activePage === id ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'
      }`} />
      {label}
    </button>
  );

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isManagement = currentUser?.role === UserRole.TRAINER || currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.GROUP_LEADER;
  const isTrainerOrAdmin = currentUser?.role === UserRole.TRAINER || currentUser?.role === UserRole.ADMIN;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0F172A] border-r border-gray-800 shadow-xl z-20">
        <div className="flex flex-col justify-center h-24 px-8 border-b border-gray-800/50 bg-[#0F172A]">
           {/* Top Branding Area */}
           <div className="flex items-center space-x-3">
             <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-900/20">
                <span className="font-brand text-2xl font-bold text-white italic transform -translate-y-0.5">V</span>
             </div>
             <div>
                <h1 className="font-brand text-3xl font-bold text-white tracking-wide">VistaQ</h1>
             </div>
           </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 space-y-1">
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          
          <NavItem id="prospects" label="Prospects" icon={Users} />
          
          <NavItem id="events" label="Events & Meetups" icon={CalendarDays} />

          {/* Management Views for Admin, Trainer & Leaders */}
          {isManagement && (
            <>
              <div className="px-6 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Performance</div>
              
              {/* Agents View: List of agents with drill-down */}
              <NavItem id="agents" label="Agents" icon={UserCheck} />
              
              {/* Group View: Group Dashboard (Aggregated) */}
              <NavItem id="group" label="Group Progress" icon={TrendingUp} />
            </>
          )}

          {/* ADMIN MANAGEMENT */}
          {isAdmin && (
            <>
              <div className="px-6 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">System</div>
              <NavItem id="users" label="User Management" icon={Settings} />
              <NavItem id="admin-groups" label="Group Management" icon={Layers} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-800/50 bg-[#0B1120]">
          {/* User Profile Card */}
          <div className="flex items-center gap-3 p-3 mb-3 rounded-lg bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => onNavigate('profile')}>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 text-white font-bold shadow-inner flex-shrink-0">
               {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-sm font-bold text-white truncate">{currentUser?.name}</div>
               <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                  {currentUser && getRoleIcon(currentUser.role)}
                  <span className="capitalize">{currentUser?.role.replace('_', ' ').toLowerCase()}</span>
               </div>
            </div>
          </div>
          
          {/* Footer Buttons (Stacked) */}
          <div className="flex flex-col gap-2">
             <button 
                onClick={() => onNavigate('profile')}
                className="w-full flex items-center justify-center px-3 py-2.5 text-xs font-bold text-slate-300 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
             >
                <UserCircle className="w-4 h-4 mr-2" /> Profile Settings
             </button>
             <button 
                onClick={logout}
                className="w-full flex items-center justify-center px-3 py-2.5 text-xs font-bold text-red-400 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-red-900/20 hover:text-red-300 hover:border-red-900/30 transition-colors"
             >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
             </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-[#0F172A] border-b border-gray-800 shadow-md z-20 text-white">
          <div className="flex items-center space-x-2">
             <span className="font-brand text-2xl font-bold">VistaQ</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300 hover:text-white">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="fixed inset-y-0 left-0 w-72 bg-[#0F172A] shadow-2xl border-r border-gray-800" onClick={e => e.stopPropagation()}>
               <div className="h-20 flex items-center px-6 border-b border-gray-800/50">
                 <span className="font-brand text-2xl font-bold text-white">VistaQ</span>
               </div>
               <nav className="py-4 overflow-y-auto max-h-[calc(100vh-180px)]">
                 <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
                 
                 <NavItem id="prospects" label="Prospects" icon={Users} />
                 
                 <NavItem id="events" label="Events & Meetups" icon={CalendarDays} />

                 {/* Management */}
                 {isManagement && (
                    <>
                       <div className="px-6 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Performance</div>
                       <NavItem id="agents" label="Agents" icon={UserCheck} />
                       <NavItem id="group" label="Group Progress" icon={TrendingUp} />
                    </>
                 )}

                 {/* Admin */}
                 {isAdmin && (
                    <>
                      <div className="my-2 border-t border-gray-800 mx-6"></div>
                      <NavItem id="users" label="User Management" icon={Settings} />
                      <NavItem id="admin-groups" label="Group Management" icon={Layers} />
                    </>
                 )}
               </nav>

               {/* Mobile Footer */}
               <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-[#0B1120] space-y-2">
                   <button 
                    onClick={() => { onNavigate('profile'); setIsMobileMenuOpen(false); }}
                    className="flex items-center text-sm text-slate-300 font-medium w-full p-2 hover:bg-slate-800 rounded transition-colors"
                   >
                    <UserCircle className="w-4 h-4 mr-2" /> My Profile
                   </button>
                   <button 
                    onClick={logout}
                    className="flex items-center text-sm text-red-400 font-medium w-full p-2 hover:bg-red-900/20 rounded transition-colors"
                   >
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                   </button>
               </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 relative bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
