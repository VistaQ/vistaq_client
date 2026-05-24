import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Briefcase, CheckCircle2, X,
  TrendingUp, AlertCircle, Clock, Star, ArrowRight, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, ProspectStage } from '../types';

// ─── Greeting ─────────────────────────────────────────────────────────────────

const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionItem {
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  description: string;
  url: string;
  cta: string;
  priority: 'high' | 'medium' | 'low';
}

// ─── Component ────────────────────────────────────────────────────────────────

const WelcomeModal: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { prospects, getProspectsByScope, salesReports } = useData();

  const isTargetRole =
    currentUser?.role === UserRole.AGENT ||
    currentUser?.role === UserRole.GROUP_LEADER;

  const sessionKey = `welcomeShown_${currentUser?.id ?? 'anon'}`;
  const alreadyShownThisSession = sessionStorage.getItem(sessionKey) === '1';
  const [visible, setVisible] = useState(isTargetRole && !alreadyShownThisSession);

  const myProspects = useMemo(() => {
    if (!currentUser) return [];
    return getProspectsByScope(currentUser);
  }, [currentUser, prospects]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total      = myProspects.length;
    const inProspect = myProspects.filter(p => p.current_stage === ProspectStage.PROSPECT).length;
    const inAppt     = myProspects.filter(p => p.current_stage === ProspectStage.APPOINTMENT).length;
    const inSales    = myProspects.filter(p => p.current_stage === ProspectStage.SALES).length;
    const won        = myProspects.filter(p => p.sales_outcome === 'successful').length;

    const now = Date.now();
    const stale = myProspects.filter(p => {
      if (p.current_stage !== ProspectStage.PROSPECT) return false;
      if (p.appointment_date) return false;
      const entered = new Date(p.prospect_entered_at).getTime();
      return now - entered > 14 * 86_400_000;
    }).length;

    const upcoming = myProspects.filter(p => {
      if (!p.appointment_date) return false;
      const d = new Date(p.appointment_date).getTime();
      return d >= now && d <= now + 7 * 86_400_000;
    }).length;

    const myReport = salesReports.find(r => r.agent_id === currentUser?.id);
    const mdrtPct  = myReport ? Math.round(myReport.fyc_pct) : null;

    return { total, inProspect, inAppt, inSales, won, stale, upcoming, mdrtPct };
  }, [myProspects, salesReports, currentUser]);

  // ── Action items ───────────────────────────────────────────────────────────
  const actionItems = useMemo((): ActionItem[] => {
    const items: ActionItem[] = [];

    if (stats.stale > 0) {
      items.push({
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        title: `Follow up on ${stats.stale} stale prospect${stats.stale > 1 ? 's' : ''}`,
        description: `${stats.stale > 1 ? `${stats.stale} prospects have` : '1 prospect has'} been sitting without an appointment for over 14 days. A quick follow-up call can restart the conversation.`,
        url: '/prospects',
        cta: 'View Prospects',
        priority: 'high',
      });
    }

    if (stats.upcoming > 0) {
      items.push({
        icon: Calendar,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        title: `Prepare for ${stats.upcoming} upcoming appointment${stats.upcoming > 1 ? 's' : ''}`,
        description: `You have ${stats.upcoming} appointment${stats.upcoming > 1 ? 's' : ''} in the next 7 days. Review each prospect's profile and confirm the time with them.`,
        url: '/prospects',
        cta: 'Review Pipeline',
        priority: 'high',
      });
    }

    if (stats.inSales > 0) {
      items.push({
        icon: Briefcase,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        title: `Close ${stats.inSales} open sales meeting${stats.inSales > 1 ? 's' : ''}`,
        description: `${stats.inSales} prospect${stats.inSales > 1 ? 's are' : ' is'} in the sales stage — your closest conversions. Prioritise following up today.`,
        url: '/prospects',
        cta: 'View Sales Stage',
        priority: 'medium',
      });
    }

    if (stats.mdrtPct !== null && stats.mdrtPct < 100) {
      const behind = Math.round((new Date().getMonth() + 1) / 12 * 100) - stats.mdrtPct;
      items.push({
        icon: TrendingUp,
        color: behind > 15 ? 'text-red-600' : 'text-amber-600',
        bg: behind > 15 ? 'bg-red-50' : 'bg-amber-50',
        title: behind > 0
          ? `MDRT: ${stats.mdrtPct}% — ${behind}% behind pace`
          : `MDRT: ${stats.mdrtPct}% — on track!`,
        description: behind > 0
          ? `You're ${behind}% below the expected pace. Focus on converting prospects in the sales stage to close the gap.`
          : `You're meeting your MDRT monthly pace. Keep the momentum going!`,
        url: '/sales-report',
        cta: 'View Sales Report',
        priority: behind > 15 ? 'high' : 'medium',
      });
    }

    if (stats.total === 0) {
      items.push({
        icon: Users,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        title: 'Build your prospect pipeline',
        description: "You don't have any prospects yet. Start by adding your first 5 — friends, family, or warm leads.",
        url: '/prospects',
        cta: 'Add Prospects',
        priority: 'high',
      });
    } else if (stats.inProspect < 3) {
      items.push({
        icon: Users,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        title: 'Top up your prospect pipeline',
        description: `Only ${stats.inProspect} prospect${stats.inProspect !== 1 ? 's' : ''} at the top of your funnel. Aim for at least 5 fresh prospects at all times.`,
        url: '/prospects',
        cta: 'Add Prospects',
        priority: 'medium',
      });
    }

    if (stats.won === 0 && stats.total >= 3) {
      items.push({
        icon: Star,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        title: 'Work towards your first sale',
        description: "You have prospects in your pipeline but no successful sales yet. Move at least one to sales meeting stage this week.",
        url: '/coaching',
        cta: 'Join Coaching',
        priority: 'medium',
      });
    }

    if (items.filter(i => i.priority === 'high').length === 0) {
      items.push({
        icon: Clock,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        title: 'Check your upcoming coaching sessions',
        description: "Regular coaching attendance earns points and sharpens your skills. Check this week's sessions.",
        url: '/coaching',
        cta: 'View Coaching',
        priority: 'low',
      });
    }

    const order = { high: 0, medium: 1, low: 2 };
    return items.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 3);
  }, [stats]);

  const dismiss = () => {
    sessionStorage.setItem(sessionKey, '1');
    setVisible(false);
  };

  const handleAction = (url: string) => {
    dismiss();
    navigate(url);
  };

  if (!visible || !currentUser) return null;

  const firstName = currentUser.name?.split(' ')[0] ?? 'there';

  return (
    /*
     * Layout strategy:
     *   mobile  (< sm): full-screen flex column — no overflow possible
     *   tablet+ (sm+):  centred modal, max-w-lg, max-h-[90vh], rounded corners
     * The inner body is always overflow-y-auto so it scrolls if content is tall.
     */
    <div className="fixed inset-0 z-[300] flex flex-col sm:items-center sm:justify-center sm:p-4 bg-black/50 backdrop-blur-sm">

      {/* Modal shell */}
      <div className="
        flex flex-col w-full bg-white shadow-2xl
        h-full sm:h-auto
        sm:rounded-2xl sm:max-w-lg sm:max-h-[90vh]
        overflow-hidden
      ">

        {/* ── Header (sticky, never scrolls away) ──────────────────────────── */}
        <div className="flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">

          {/* Mobile compact header */}
          <div className="sm:hidden flex items-center justify-between px-5 pt-5 pb-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wide">Daily Briefing</span>
            </div>
            <button
              onClick={dismiss}
              aria-label="Close"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="sm:hidden px-5 pb-5 pt-2">
            <h2 className="text-xl font-bold">{greeting()}, {firstName}! 👋</h2>
            <p className="text-blue-200 text-xs mt-0.5 leading-relaxed">
              Here's your pipeline snapshot and what to focus on today.
            </p>
          </div>

          {/* Tablet / Desktop header */}
          <div className="hidden sm:block relative px-8 pt-8 pb-6">
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-yellow-300" />
              <span className="text-sm font-semibold text-blue-200 uppercase tracking-wide">Daily Briefing</span>
            </div>
            <h2 className="text-2xl font-bold">{greeting()}, {firstName}! 👋</h2>
            <p className="text-blue-200 text-sm mt-1">
              Here's a snapshot of your pipeline and what to focus on today.
            </p>
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Stats grid — 2 cols on mobile, 4 cols on sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-100">
            {[
              { label: 'Prospects',        value: stats.total,   icon: Users,        color: 'text-blue-600'   },
              { label: 'Appointments',     value: stats.inAppt,  icon: Calendar,     color: 'text-purple-600' },
              { label: 'Meetings',         value: stats.inSales, icon: Briefcase,    color: 'text-amber-600'  },
              { label: 'Successful Sales', value: stats.won,     icon: CheckCircle2, color: 'text-green-600'  },
            ].map(({ label, value, icon: Icon, color }, i) => (
              <div
                key={label}
                className={`flex flex-col items-center justify-center py-4 px-2
                  ${i % 2 === 0 ? '' : 'border-l border-gray-100'}
                  sm:border-l sm:first:border-l-0
                  ${i >= 2 ? 'border-t border-gray-100 sm:border-t-0' : ''}
                `}
              >
                <Icon className={`w-5 h-5 ${color} mb-1`} />
                <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
                <span className="text-[11px] text-gray-500 mt-1 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Action items */}
          <div className="px-5 sm:px-6 py-4 sm:py-5">
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 sm:mb-4">
              Recommended actions for today
            </p>
            <div className="space-y-2.5 sm:space-y-3">
              {actionItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAction(item.url)}
                    className="w-full flex items-start gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 active:bg-blue-50 transition-all text-left group"
                  >
                    <div className={`flex-shrink-0 p-2 rounded-xl ${item.bg} mt-0.5`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors leading-snug">
                          {item.title}
                        </p>
                        {item.priority === 'high' && (
                          <span className="flex-shrink-0 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100 mt-0.5">
                            Priority
                          </span>
                        )}
                      </div>
                      {/* Description hidden on very small screens, shown on sm+ */}
                      <p className="hidden sm:block text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-blue-600 group-hover:gap-1.5 transition-all">
                        {item.cta} <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer (sticky, never scrolls away) ──────────────────────────── */}
        <div className="flex-shrink-0 px-5 sm:px-6 pb-5 sm:pb-6 pt-2 bg-white border-t border-gray-100">
          <button
            onClick={dismiss}
            className="w-full py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            Let's have a productive day 🚀
          </button>
        </div>

      </div>
    </div>
  );
};

export default WelcomeModal;
