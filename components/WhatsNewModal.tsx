
import React, { useState } from 'react';
import { Sparkles, X, BarChart2, Target, Smartphone, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { APP_VERSION } from '../constants/tokens';

// ─── Feature definitions ──────────────────────────────────────────────────────

interface Feature {
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  desc: string;
  roles: UserRole[];
}

const ALL_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MASTER_TRAINER,
  UserRole.TRAINER,
  UserRole.GROUP_LEADER,
  UserRole.AGENT,
];

const FEATURES: Feature[] = [
  {
    icon: BarChart2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Redesigned Sales Report',
    desc: 'New aging stat cards, desktop section nav, and a professional 2-page PDF export.',
    roles: ALL_ROLES,
  },
  {
    icon: Target,
    color: 'text-green-600',
    bg: 'bg-green-50',
    title: 'FYCt & FYC Target Sync',
    desc: 'Dashboard now shows separate progress bars for your FYCt and FYC targets set in Profile.',
    roles: [UserRole.AGENT, UserRole.GROUP_LEADER],
  },
  {
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Group Sales Report Overhaul',
    desc: 'Card layout with agent search, FYCt + FYC bars per agent, and a simplified single-column view.',
    roles: [UserRole.ADMIN, UserRole.MASTER_TRAINER, UserRole.TRAINER, UserRole.GROUP_LEADER],
  },
  {
    icon: TrendingUp,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    title: 'Leaderboard Upgrade',
    desc: 'Refreshed leaderboard with improved rankings and mobile-friendly layout.',
    roles: ALL_ROLES,
  },
  {
    icon: Smartphone,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    title: 'Mobile & Tablet Navigation',
    desc: 'Sidebar now appears only on desktop. Tablet and phone get a cleaner, purpose-built nav.',
    roles: ALL_ROLES,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const WhatsNewModal: React.FC = () => {
  const { currentUser } = useAuth();

  const storageKey = `whatsNew_v${APP_VERSION}_${currentUser?.id ?? 'anon'}`;
  const alreadySeen = localStorage.getItem(storageKey) === '1';
  const [visible, setVisible] = useState(!alreadySeen);

  const dismiss = () => {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  if (!visible || !currentUser) return null;

  const visibleFeatures = FEATURES.filter(f => f.roles.includes(currentUser.role as UserRole));
  const firstName = currentUser.name?.split(' ')[0] ?? 'there';

  return (
    <div className="fixed inset-0 z-[400] flex flex-col sm:items-center sm:justify-center sm:p-4 bg-black/50 backdrop-blur-sm">

      {/* Modal shell */}
      <div className="
        flex flex-col w-full bg-white shadow-2xl
        h-full sm:h-auto
        sm:rounded-2xl sm:max-w-md sm:max-h-[90vh]
        overflow-hidden
      ">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white px-6 pt-6 pb-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">What's New</span>
              <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">v{APP_VERSION}</span>
            </div>
            <button
              onClick={dismiss}
              aria-label="Close"
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-xl font-bold mt-3">Hey {firstName}, we've been busy! 🚀</h2>
          <p className="text-slate-400 text-sm mt-1">Here's what's new in VistaQ {APP_VERSION}.</p>
        </div>

        {/* ── Feature list ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {visibleFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className={`flex-shrink-0 p-2 rounded-xl ${feature.bg} mt-0.5`}>
                  <Icon className={`w-4 h-4 ${feature.color}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 leading-snug">{feature.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer CTA ────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 bg-white border-t border-gray-100">
          <button
            onClick={dismiss}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            Got it, let's go <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default WhatsNewModal;
