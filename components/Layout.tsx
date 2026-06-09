
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  Shield,
  Briefcase,
  GraduationCap,
  Award,
  Star,
  Settings,
  Gift,
  Layers,
  CalendarDays,
  UserCircle,
  TrendingUp,
  Globe,
  HelpCircle,
  FileText,
  BookOpen,
  Trophy,
  BarChart2,
  Bell,
  IdCard,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import WelcomeModal from './WelcomeModal';
import WhatsNewModal from './WhatsNewModal';

interface LayoutProps {
  children: React.ReactNode;
}

// ─── Nav item definition ──────────────────────────────────────────────────────

interface NavItemDef {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  section?: string; // section divider label shown above this item
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { unreadCount } = useNotifications();

  // Close menu on route change
  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield className="w-4 h-4" />;
      case UserRole.MASTER_TRAINER: return <Globe className="w-4 h-4" />;
      case UserRole.TRAINER: return <GraduationCap className="w-4 h-4" />;
      case UserRole.GROUP_LEADER: return <Users className="w-4 h-4" />;
      default: return <Briefcase className="w-4 h-4" />;
    }
  };

  // ── Desktop sidebar nav item ──────────────────────────────────────────────
  const SidebarNavItem = ({ id, label, icon: Icon, badge }: { id: string; label: string; icon: React.ElementType; badge?: number }) => {
    const isActive = pathname === `/${id}`;
    return (
      <Link
        to={`/${id}`}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex items-center w-full px-6 py-3.5 text-sm font-medium transition-all duration-200 group ${isActive
          ? 'text-white bg-white/10'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
        )}
        <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-blue-500 text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    );
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isManagement = currentUser?.role === UserRole.TRAINER ||
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.GROUP_LEADER ||
    currentUser?.role === UserRole.MASTER_TRAINER;
  const canSeeProspects = currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.AGENT ||
    currentUser?.role === UserRole.GROUP_LEADER;

  // ── Build nav item list for mobile grid ───────────────────────────────────
  const mobileNavItems: NavItemDef[] = [
    { id: 'dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
    ...(canSeeProspects ? [{ id: 'prospects', label: 'Prospects', icon: Users }] : []),
    { id: 'events',       label: 'Calendar',    icon: CalendarDays },
    { id: 'coaching',     label: 'Coaching',    icon: GraduationCap },
    { id: 'leaderboard',  label: 'Leaderboard', icon: Trophy },
    ...(currentUser?.role === UserRole.AGENT || currentUser?.role === UserRole.GROUP_LEADER
      ? [{ id: 'points', label: 'My Points', icon: Star }]
      : []),
    { id: 'sales-report', label: 'Sales Report', icon: BarChart2 },
    ...(isManagement
      ? [
          { id: 'group',             label: 'Group',       icon: TrendingUp },
          { id: 'group-sales-report', label: 'Group Sales', icon: BarChart2 },
        ]
      : []),
    ...(isAdmin
      ? [
          { id: 'users',             label: 'Users',     icon: Settings },
          { id: 'admin-groups',      label: 'Groups',    icon: Layers },
          { id: 'admin-rewards',     label: 'Rewards',   icon: Gift },
          { id: 'admin-agent-codes', label: 'Codes',     icon: IdCard },
        ]
      : []),
    { id: 'notifications', label: 'Alerts',    icon: Bell,      badge: unreadCount },
    { id: 'tutorials',     label: 'Tutorials', icon: BookOpen },
    { id: 'support',       label: 'Support',   icon: HelpCircle },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar — Desktop only (xl+) ──────────────────────────────────── */}
      <aside className="hidden xl:flex flex-col w-72 bg-sidebar-primary border-r border-gray-800 shadow-xl z-20">
        <div className="flex flex-col justify-center h-24 px-8 border-b border-gray-800/50 bg-sidebar-primary">
          <div className="flex items-center">
            <img src="/vistaq-logo.png" alt="VistaQ" className="h-12 w-auto" />
          </div>
          <p className="text-xs text-gray-400 mt-1 tracking-wide">Version 3.0</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 space-y-1">
          {currentUser?.role === UserRole.GROUP_LEADER && (
            <div className="px-6 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Personal</div>
          )}
          <SidebarNavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          {canSeeProspects && <SidebarNavItem id="prospects" label="Prospects" icon={Users} />}
          <SidebarNavItem id="events"      label="Calendar"    icon={CalendarDays} />
          <SidebarNavItem id="coaching"    label="Coaching"    icon={GraduationCap} />
          <SidebarNavItem id="leaderboard" label="Leaderboard" icon={Trophy} />
          {(currentUser?.role === UserRole.AGENT || currentUser?.role === UserRole.GROUP_LEADER) && (
            <SidebarNavItem id="points" label="My Points" icon={Star} />
          )}
          <SidebarNavItem id="sales-report" label="Sales Report" icon={BarChart2} />
          {isManagement && (
            <>
              <div className="px-6 py-2 mt-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Group</div>
              <SidebarNavItem id="group"              label="Group Progress"    icon={TrendingUp} />
              <SidebarNavItem id="group-sales-report" label="Group Sales Report" icon={BarChart2} />
            </>
          )}
          {isAdmin && (
            <>
              <div className="px-6 py-2 mt-4 text-xs font-bold text-gray-400 uppercase tracking-wider">System</div>
              <SidebarNavItem id="users"             label="User Management" icon={Settings} />
              <SidebarNavItem id="admin-groups"      label="Group Management" icon={Layers} />
              <SidebarNavItem id="admin-rewards"     label="Rewards Config"  icon={Gift} />
              <SidebarNavItem id="admin-agent-codes" label="Agent Codes"     icon={IdCard} />
            </>
          )}
          <div className="px-6 py-2 mt-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Help</div>
          <SidebarNavItem id="notifications" label="Notifications" icon={Bell} badge={unreadCount} />
          <SidebarNavItem id="tutorials"     label="Tutorials"     icon={BookOpen} />
          <SidebarNavItem id="support"       label="Support"       icon={HelpCircle} />
        </nav>

        <div className="p-4 border-t border-gray-800/50 bg-sidebar-secondary">
          <div
            className="flex items-center gap-3 p-3 mb-3 rounded-lg bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors"
            onClick={() => navigate('/profile')}
          >
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
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/profile')}
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
            <button
              onClick={() => navigate('/privacy-policy')}
              className="w-full flex items-center justify-center px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors gap-1.5"
            >
              <FileText className="w-3 h-3" /> Privacy Policy
            </button>
          </div>
        </div>
      </aside>

      {/* ── Right side: header + content ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Mobile / Tablet top bar (hidden on xl+) */}
        <header className="xl:hidden flex items-center justify-between h-16 px-4 bg-sidebar-primary border-b border-gray-800 shadow-md z-20 text-white flex-shrink-0">
          <img src="/vistaq-logo.png" alt="VistaQ" className="h-8 w-auto" />
          <div className="flex items-center gap-1">
            <div className="[&_button]:text-gray-300 [&_button:hover]:text-white [&_button:hover]:bg-white/10">
              <NotificationBell />
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(v => !v)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* ── Full-screen mobile / tablet menu ──────────────────────────── */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 xl:hidden flex flex-col bg-sidebar-primary"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Menu top bar */}
            <div className="flex items-center justify-between h-16 px-5 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{currentUser?.name}</p>
                  <p className="text-xs text-gray-400 capitalize flex items-center gap-1">
                    {currentUser && getRoleIcon(currentUser.role)}
                    {currentUser?.role.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable grid area */}
            <div className="flex-1 overflow-y-auto py-6 px-5">
              {/* App grid — 3 columns */}
              <div className="grid grid-cols-3 gap-3">
                {mobileNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === `/${item.id}`;
                  return (
                    <Link
                      key={item.id}
                      to={`/${item.id}`}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center transition-all active:scale-95 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                          : 'bg-white/8 text-gray-300 hover:bg-white/15 hover:text-white border border-white/10'
                      }`}
                    >
                      {/* Badge */}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-2 right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold rounded-full bg-red-500 text-white leading-none">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                      <div className={`p-2.5 rounded-xl ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-gray-800 p-4 flex-shrink-0 grid grid-cols-2 gap-3">
              <button
                onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/8 border border-white/10 text-gray-300 hover:text-white hover:bg-white/15 text-sm font-semibold transition-colors"
              >
                <UserCircle className="w-4 h-4" /> Profile
              </button>
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-900/30 border border-red-800/40 text-red-400 hover:text-red-300 hover:bg-red-900/50 text-sm font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Desktop top-bar — notification bell (xl+) */}
        <div className="hidden xl:flex items-center justify-end h-14 px-8 border-b border-gray-100 bg-white flex-shrink-0">
          <NotificationBell />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 xl:p-8 relative bg-gray-50">
          {children}
        </main>
      </div>

      {/* What's New modal — shows once per version, blocks daily briefing until dismissed */}
      <WhatsNewModal />
      {/* Daily Briefing modal */}
      <WelcomeModal />
    </div>
  );
};

export default Layout;
