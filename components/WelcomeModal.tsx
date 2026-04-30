import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Briefcase, CheckCircle2, X,
  TrendingUp, AlertCircle, Clock, Star, ArrowRight, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, ProspectStage } from '../types';


// ─── Greeting based on time of day ───────────────────────────────────────────

const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// ─── Action item type ─────────────────────────────────────────────────────────

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
  const { prospects, getProspectsByScope, salesReports, dashboardStats } = useData();

  // Show on every login for Agent and Group Leader
  const isTargetRole =
    currentUser?.role === UserRole.AGENT ||
    currentUser?.role === UserRole.GROUP_LEADER;

  const [visible, setVisible] = useState(isTargetRole);

  const myProspects = useMemo(() => {
    if (!currentUser) return [];
    return getProspectsByScope(currentUser);
  }, [currentUser, prospects]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total       = myProspects.length;
    const inProspect  = myProspects.filter(p => p.current_stage === ProspectStage.PROSPECT).length;
    const inAppt      = myProspects.filter(p => p.current_stage === ProspectStage.APPOINTMENT).length;
    const inSales     = myProspects.filter(p => p.current_stage === ProspectStage.SALES).length;
    const won         = myProspects.filter(p => p.sales_outcome === 'successful').length;

    // Stale: in prospect stage for more than 14 days with no appointment booked
    const now = Date.now();
    const stale = myProspects.filter(p => {
      if (p.current_stage !== ProspectStage.PROSPECT) return false;
      if (p.appointment_date) return false;
      const entered = new Date(p.prospect_entered_at).getTime();
      return now - entered > 14 * 86_400_000;
    }).length;

    // Upcoming appointments (appointment_date in the next 7 days)
    const upcoming = myProspects.filter(p => {
      if (!p.appointment_date) return false;
      const d = new Date(p.appointment_date).getTime();
      return d >= now && d <= now + 7 * 86_400_000;
    }).length;

    // MDRT progress from ETL (own report)
    const myReport = salesReports.find(r => r.agent_id === currentUser?.id);
    const mdrtPct  = myReport ? Math.round(myReport.fyc_pct) : null;

    return { total, inProspect, inAppt, inSales, won, stale, upcoming, mdrtPct };
  }, [myProspects, salesReports, currentUser]);

  // ── Action items logic ─────────────────────────────────────────────────────
  const actionItems = useMemo((): ActionItem[] => {
    const items: ActionItem[] = [];

    // HIGH priority items
    if (stats.stale > 0) {
      items.push({
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        title: `Follow up on ${stats.stale} stale prospect${stats.stale > 1 ? 's' : ''}`,
        description: `${stats.stale > 1 ? `${stats.stale} prospects have` : '1 prospect has'} been sitting without an appointment booked for over 14 days. A quick follow-up call can restart the conversation.`,
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
        description: `You have ${stats.upcoming} appointment${stats.upcoming > 1 ? 's' : ''} within the next 7 days. Review each prospect's profile, prepare your fact-find questions, and confirm the time with them today.`,
        url: '/prospects',
        cta: 'Review Pipeline',
        priority: 'high',
      });
    }

    // MEDIUM priority items
    if (stats.inSales > 0) {
      items.push({
        icon: Briefcase,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        title: `Close ${stats.inSales} open sales meeting${stats.inSales > 1 ? 's' : ''}`,
        description: `${stats.inSales} prospect${stats.inSales > 1 ? 's are' : ' is'} in the sales stage. Prioritise completing the presentation and following up on any outstanding proposals — these are your closest conversions.`,
        url: '/prospects',
        cta: 'View Sales Stage',
        priority: 'medium',
      });
    }

    if (stats.mdrtPct !== null && stats.mdrtPct < 100) {
      const currentMonth = new Date().getMonth() + 1;
      const expectedPct  = Math.round((currentMonth / 12) * 100);
      const behind = expectedPct - stats.mdrtPct;
      items.push({
        icon: TrendingUp,
        color: behind > 15 ? 'text-red-600' : 'text-amber-600',
        bg: behind > 15 ? 'bg-red-50' : 'bg-amber-50',
        title: behind > 0
          ? `MDRT: ${stats.mdrtPct}% — ${behind}% behind pace`
          : `MDRT: ${stats.mdrtPct}% — on track!`,
        description: behind > 0
          ? `You're ${behind}% below the expected pace for this point in the year. Focus on converting prospects in your sales stage to close the gap. Every case counts.`
          : `You're meeting your MDRT monthly pace. Keep this momentum going — consistency is what gets you across the finish line.`,
        url: '/sales-report',
        cta: 'View Sales Report',
        priority: behind > 15 ? 'high' : 'medium',
      });
    }

    // LOW priority / general productivity
    if (stats.total === 0) {
      items.push({
        icon: Users,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        title: 'Build your prospect pipeline',
        description: "You don't have any prospects yet. Start by adding your first 5 prospects — friends, family, or warm leads. A full pipeline is the foundation of consistent sales.",
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
        description: `You only have ${stats.inProspect} prospect${stats.inProspect !== 1 ? 's' : ''} at the top of your funnel. Aim for at least 5 fresh prospects at all times to keep your pipeline flowing.`,
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
        description: "You have prospects in your pipeline but no successful sales yet. Focus on moving at least one through to the sales meeting stage this week. Your first close is always the hardest!",
        url: '/coaching',
        cta: 'Join Coaching',
        priority: 'medium',
      });
    }

    // Always suggest coaching if no high-priority items
    if (items.filter(i => i.priority === 'high').length === 0) {
      items.push({
        icon: Clock,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        title: 'Check your upcoming coaching sessions',
        description: 'Regular coaching attendance earns you points and sharpens your skills. Check this week\'s sessions and join one to keep your development on track.',
        url: '/coaching',
        cta: 'View Coaching',
        priority: 'low',
      });
    }

    // Sort: high → medium → low, cap at 3
    const order = { high: 0, medium: 1, low: 2 };
    return items.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 3);
  }, [stats]);

  const handleAction = (url: string) => {
    setVisible(false);
    navigate(url);
  };

  if (!visible || !currentUser) return null;

  const firstName = currentUser.name?.split(' ')[0] ?? 'there';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">

        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 px-8 pt-8 pb-6 text-white">
          <button
            onClick={() => setVisible(false)}
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

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: 'Prospects',  value: stats.total,     icon: Users,          color: 'text-blue-600'   },
            { label: 'Appts',      value: stats.inAppt,    icon: Calendar,       color: 'text-purple-600' },
            { label: 'Meetings',   value: stats.inSales,   icon: Briefcase,      color: 'text-amber-600'  },
            { label: 'Sales Won',  value: stats.won,       icon: CheckCircle2,   color: 'text-green-600'  },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col items-center justify-center py-5 px-2">
              <Icon className={`w-5 h-5 ${color} mb-1.5`} />
              <span className="text-2xl font-bold text-gray-900">{value}</span>
              <span className="text-xs text-gray-500 mt-0.5 text-center">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Action items ── */}
        <div className="px-6 py-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Recommended actions for today
          </p>
          <div className="space-y-3">
            {actionItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleAction(item.url)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group"
                >
                  <div className={`flex-shrink-0 p-2 rounded-xl ${item.bg} mt-0.5`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                        {item.title}
                      </p>
                      {item.priority === 'high' && (
                        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                          Priority
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-blue-600 group-hover:gap-2 transition-all">
                      {item.cta} <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-6">
          <button
            onClick={() => setVisible(false)}
            className="w-full py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors active:scale-[0.98]"
          >
            Let's have a productive day 🚀
          </button>
        </div>

      </div>
    </div>
  );
};

export default WelcomeModal;
