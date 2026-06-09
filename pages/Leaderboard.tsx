
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Trophy, Medal, Award, Crown, AlertCircle, Users, ChevronDown, Loader2, Star, MapPin } from 'lucide-react';
import { apiCall } from '../services/apiClient';
import type { components } from '../types.generated';

type Tab = 'individual' | 'group';
type Metric = 'points' | 'prospects' | 'noc' | 'ace' | 'fyct' | 'fyc' | 'acs';
type Period = 'mtd' | 'ytd';

type IndividualEntry = components['schemas']['LeaderboardStatsIndividualObject'];
type GroupEntry      = components['schemas']['LeaderboardStatsGroupObject'];
type StatsResponse   = {
  success: boolean;
  data: {
    period: 'mtd' | 'ytd';
    generated_at: string;
    individual: IndividualEntry[];
    groups: GroupEntry[];
  };
};

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'points',    label: 'Total Points'    },
  { value: 'prospects', label: 'Total Prospects' },
  { value: 'noc',       label: 'NOC (Sales)'     },
  { value: 'ace',       label: 'ACE (RM)'        },
  { value: 'fyct',      label: 'FYCt (RM)'       },
  { value: 'fyc',       label: 'FYC (RM)'        },
  { value: 'acs',       label: 'ACS (Avg Case)'  },
];

const Leaderboard: React.FC = () => {
  const { currentUser }   = useAuth();
  const { badgeTiers, salesReports } = useData();

  const [tab,       setTab]       = useState<Tab>('individual');
  const [metric,    setMetric]    = useState<Metric>('points');
  const [period,    setPeriod]    = useState<Period>('mtd');
  const [statsData, setStatsData] = useState<StatsResponse['data'] | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Current calendar month index (0 = Jan) — used for MTD slicing of month arrays
  const currentMonthIdx = new Date().getMonth();

  const fetchStats = (p: Period) => {
    setLoading(true);
    setError(null);
    apiCall<StatsResponse>(`/leaderboard/stats?period=${p}`)
      .then(res => {
        if (res.success) setStatsData(res.data);
        else setError('Failed to load leaderboard data.');
      })
      .catch(err => setError(err.message || 'Failed to load leaderboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(period); }, [period]);

  if (!currentUser) return null;

  const sortedBadges = [...badgeTiers].sort((a, b) => a.threshold - b.threshold);

  const getCurrentBadge = (pts: number) => {
    const reversed = [...sortedBadges].reverse();
    return reversed.find(b => pts >= b.threshold) || sortedBadges[0];
  };

  // agent_id → salesReport lookup
  const salesReportByAgent = useMemo(() => {
    const map: Record<string, typeof salesReports[0]> = {};
    for (const r of salesReports) map[r.agent_id] = r;
    return map;
  }, [salesReports]);

  // Score for a given entry — sales metrics split by MTD/YTD
  const getIndividualScore = (entry: IndividualEntry): number => {
    const r    = salesReportByAgent[entry.user_id];
    const isMtd = period === 'mtd';
    switch (metric) {
      case 'prospects': return entry.prospects_added;  // API is period-aware
      case 'noc':       return entry.sales_successful; // API is period-aware
      case 'ace':       return isMtd ? (r?.month_ace?.[currentMonthIdx]  ?? 0) : (r?.ace_ytd  ?? 0);
      case 'fyct':      return isMtd ? (r?.month_fyct?.[currentMonthIdx] ?? 0) : (r?.fyct_ytd ?? 0);
      case 'fyc':       return isMtd ? (r?.month_fyc?.[currentMonthIdx]  ?? 0) : (r?.fyc_ytd  ?? 0);
      case 'acs': {
        const noc = entry.sales_successful; // period-aware via API
        const ace = isMtd ? (r?.month_ace?.[currentMonthIdx] ?? 0) : (r?.ace_ytd ?? 0);
        return noc > 0 ? ace / noc : 0;
      }
      default: return entry.total_points;
    }
  };

  const getGroupScore = (group: GroupEntry): number => {
    if (metric === 'points')    return group.total_points;
    if (metric === 'prospects') return group.prospects_added;
    if (metric === 'noc')       return group.sales_successful;
    const isMtd  = period === 'mtd';
    const members = statsData?.individual.filter(i => i.group_id === group.group_id) ?? [];
    const aceSum  = members.reduce((s, m) => {
      const r = salesReportByAgent[m.user_id];
      return s + (isMtd ? (r?.month_ace?.[currentMonthIdx]  ?? 0) : (r?.ace_ytd  ?? 0));
    }, 0);
    const fyctSum = members.reduce((s, m) => {
      const r = salesReportByAgent[m.user_id];
      return s + (isMtd ? (r?.month_fyct?.[currentMonthIdx] ?? 0) : (r?.fyct_ytd ?? 0));
    }, 0);
    const fycSum  = members.reduce((s, m) => {
      const r = salesReportByAgent[m.user_id];
      return s + (isMtd ? (r?.month_fyc?.[currentMonthIdx]  ?? 0) : (r?.fyc_ytd  ?? 0));
    }, 0);
    const nocSum  = members.reduce((s, m) => s + m.sales_successful, 0);
    switch (metric) {
      case 'ace':  return aceSum;
      case 'fyct': return fyctSum;
      case 'fyc':  return fycSum;
      case 'acs':  return nocSum > 0 ? aceSum / nocSum : 0;
      default:     return group.total_points;
    }
  };

  // Contextual score label that changes with the selected metric
  const getScoreLabel = (score: number): string => {
    const n = Math.round(score);
    switch (metric) {
      case 'points':    return `${n.toLocaleString()} pts`;
      case 'prospects': return `${n} Prospect${n !== 1 ? 's' : ''}`;
      case 'noc':       return `${n} Sale${n !== 1 ? 's' : ''}`;
      case 'ace':       return `RM ${n.toLocaleString()} ACE`;
      case 'fyct':      return `RM ${n.toLocaleString()} FYCt`;
      case 'fyc':       return `RM ${n.toLocaleString()} FYC`;
      case 'acs':       return `RM ${n.toLocaleString()} Avg Case`;
      default:          return n.toLocaleString();
    }
  };

  // ── Sorted rankings ────────────────────────────────────────────────────────

  const individualRanked = useMemo(() => {
    if (!statsData) return [];
    return statsData.individual
      .map(entry => ({
        entry,
        score: getIndividualScore(entry),
        badge: getCurrentBadge(entry.total_points),
      }))
      .sort((a, b) => b.score - a.score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsData, metric, period, sortedBadges, salesReportByAgent]);

  const groupRanked = useMemo(() => {
    if (!statsData) return [];
    return statsData.groups
      .map(group => {
        const totalScore = getGroupScore(group);
        const members    = statsData.individual.filter(i => i.group_id === group.group_id);
        const topMember  = members.reduce<IndividualEntry | null>((best, m) =>
          !best || m.total_points > best.total_points ? m : best, null);
        return { group, totalScore, topMemberName: topMember?.name ?? '—' };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsData, metric, period, salesReportByAgent]);

  const ranked = tab === 'individual' ? individualRanked : groupRanked;
  const top3   = ranked.slice(0, 3);

  // Podium is displayed Silver (left) | Gold (centre) | Bronze (right)
  const podiumOrder   = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumRanks   = [2, 1, 3];
  const podiumHeights = ['h-20 sm:h-24', 'h-28 sm:h-36', 'h-16 sm:h-20'];
  const podiumIcons   = [
    <Medal  key="2" className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />,
    <Crown  key="1" className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-400" />,
    <Award  key="3" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />,
  ];

  const MEDAL_CONFIG = {
    1: { label: 'Gold',   chip: 'bg-yellow-100 text-yellow-700 border border-yellow-300', avatar: 'bg-gradient-to-br from-yellow-400 to-yellow-600 ring-4 ring-yellow-300', podium: 'bg-gradient-to-t from-yellow-600 to-yellow-400', score: 'text-yellow-300' },
    2: { label: 'Silver', chip: 'bg-slate-100 text-slate-600 border border-slate-300',    avatar: 'bg-gradient-to-br from-gray-300 to-gray-500 ring-4 ring-gray-200',       podium: 'bg-gradient-to-t from-gray-500 to-gray-400',   score: 'text-slate-300'  },
    3: { label: 'Bronze', chip: 'bg-amber-100 text-amber-700 border border-amber-300',    avatar: 'bg-gradient-to-br from-amber-600 to-amber-800 ring-4 ring-amber-500',     podium: 'bg-gradient-to-t from-amber-800 to-amber-600', score: 'text-amber-400'  },
  } as const;

  const periodLabel  = period === 'mtd' ? 'Month to Date' : 'Year to Date';
  const metricLabel  = METRIC_OPTIONS.find(o => o.value === metric)?.label ?? 'Score';

  // Current user's rank in individual tab
  const myRankIdx = tab === 'individual'
    ? individualRanked.findIndex(r => r.entry.user_id === currentUser.id)
    : -1;
  const myRank  = myRankIdx >= 0 ? myRankIdx + 1 : null;
  const myEntry = myRankIdx >= 0 ? individualRanked[myRankIdx] : null;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-7 h-7 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{metricLabel} · {periodLabel}</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab('individual')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${tab === 'individual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Individual
            </button>
            <button
              onClick={() => setTab('group')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${tab === 'group' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Group</span>
            </button>
          </div>

          {/* Metric */}
          <div className="relative">
            <select
              value={metric}
              onChange={e => setMetric(e.target.value as Metric)}
              className="appearance-none text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            >
              {METRIC_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Period */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPeriod('mtd')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${period === 'mtd' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              MTD
            </button>
            <button
              onClick={() => setPeriod('ytd')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${period === 'ytd' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              YTD
            </button>
          </div>

          <span className="ml-auto text-xs text-gray-400 hidden sm:block">{periodLabel}</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => fetchStats(period)} className="ml-auto font-medium hover:underline">Retry</button>
        </div>
      )}

      {!loading && !error && ranked.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="font-medium text-gray-500">No rankings yet</p>
          <p className="text-sm text-gray-400 mt-1">No activity recorded for this period.</p>
        </div>
      )}

      {!loading && !error && ranked.length > 0 && (
        <>
          {/* ── Podium ─────────────────────────────────────────────────────────── */}
          {top3.length > 0 && (
            <div className="bg-gradient-to-br from-sidebar-primary to-sidebar-border rounded-2xl p-5 sm:p-8 shadow-xl">
              <h2 className="text-center text-white font-bold text-xs sm:text-sm mb-6 sm:mb-8 tracking-widest uppercase opacity-60">Top Performers</h2>
              <div className="flex items-end justify-center gap-3 sm:gap-6">
                {(top3.length === 3 ? podiumOrder : top3).map((item, podiumIdx) => {
                  const rank   = top3.length === 3 ? podiumRanks[podiumIdx] : podiumIdx + 1;
                  const isFirst = rank === 1;
                  const cfg    = MEDAL_CONFIG[rank as 1 | 2 | 3] ?? MEDAL_CONFIG[3];

                  if (tab === 'individual') {
                    const e    = item as typeof individualRanked[0];
                    const isMe = e.entry.user_id === currentUser.id;
                    return (
                      <div key={e.entry.user_id} className="flex flex-col items-center">
                        <div className={`flex flex-col items-center mb-2 transition-transform ${isFirst ? 'scale-105' : ''}`}>
                          {top3.length === 3 && podiumIcons[podiumIdx]}
                          <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg mt-1 ${cfg.avatar}`}>
                            {e.entry.name.charAt(0)}
                          </div>
                          <p className="text-white font-bold text-[11px] sm:text-sm mt-2 max-w-[72px] sm:max-w-[100px] text-center truncate">
                            {e.entry.name}{isMe && <span className="opacity-60 text-[9px] sm:text-xs"> (you)</span>}
                          </p>
                          <p className="text-slate-400 text-[9px] sm:text-xs truncate max-w-[72px] sm:max-w-[100px] text-center">
                            {e.entry.group_name || '—'}
                          </p>
                          <p className={`font-extrabold mt-1 text-xs sm:text-sm ${cfg.score}`}>
                            {getScoreLabel(e.score)}
                          </p>
                          {/* Rank medal label: Gold / Silver / Bronze (not the points badge tier) */}
                          <span className={`text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full mt-1 font-bold ${cfg.chip}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className={`${podiumHeights[podiumIdx]} w-16 sm:w-28 rounded-t-xl flex items-center justify-center ${cfg.podium}`}>
                          <span className="text-white font-black text-xl sm:text-3xl opacity-30">#{rank}</span>
                        </div>
                      </div>
                    );
                  } else {
                    const g = item as typeof groupRanked[0];
                    return (
                      <div key={g.group.group_id} className="flex flex-col items-center">
                        <div className={`flex flex-col items-center mb-2 transition-transform ${isFirst ? 'scale-105' : ''}`}>
                          {top3.length === 3 && podiumIcons[podiumIdx]}
                          <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold shadow-lg mt-1 ${cfg.avatar}`}>
                            <Users className="w-4 h-4 sm:w-6 sm:h-6" />
                          </div>
                          <p className="text-white font-bold text-[11px] sm:text-sm mt-2 max-w-[72px] sm:max-w-[100px] text-center truncate">{g.group.group_name}</p>
                          <p className="text-slate-400 text-[9px] sm:text-xs truncate max-w-[72px] sm:max-w-[100px] text-center">{g.group.member_count} members</p>
                          <p className={`font-extrabold mt-1 text-xs sm:text-sm ${cfg.score}`}>
                            {getScoreLabel(g.totalScore)}
                          </p>
                          <span className={`text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full mt-1 font-bold ${cfg.chip}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className={`${podiumHeights[podiumIdx]} w-16 sm:w-28 rounded-t-xl flex items-center justify-center ${cfg.podium}`}>
                          <span className="text-white font-black text-xl sm:text-3xl opacity-30">#{rank}</span>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {/* ── Top 10: positions 4–10, no badge/label chips ────────────────────── */}
          {ranked.length > 3 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-gray-800">Top 10</h3>
                <span className="text-xs text-gray-400 ml-1">{metricLabel}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {ranked.slice(3, 10).map((item, idx) => {
                  const displayRank = idx + 4;
                  if (tab === 'individual') {
                    const e    = item as typeof individualRanked[0];
                    const isMe = e.entry.user_id === currentUser.id;
                    return (
                      <div key={e.entry.user_id} className={`flex items-center px-5 sm:px-6 py-3 transition-colors ${isMe ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}>
                        <span className="w-7 text-center text-sm font-bold text-gray-400 flex-shrink-0">#{displayRank}</span>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm mx-3 flex-shrink-0">
                          {e.entry.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate text-sm ${isMe ? 'text-blue-800' : 'text-gray-900'}`}>
                            {e.entry.name} {isMe && <span className="text-xs font-normal text-blue-500">(you)</span>}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{e.entry.group_name || '—'}</p>
                        </div>
                        {/* No medal label for #4–10 — position number only */}
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold text-gray-900 text-sm">{getScoreLabel(e.score)}</p>
                        </div>
                      </div>
                    );
                  } else {
                    const g = item as typeof groupRanked[0];
                    return (
                      <div key={g.group.group_id} className="flex items-center px-5 sm:px-6 py-3 hover:bg-gray-50 transition-colors">
                        <span className="w-7 text-center text-sm font-bold text-gray-400 flex-shrink-0">#{displayRank}</span>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white mx-3 flex-shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm text-gray-900">{g.group.group_name}</p>
                          <p className="text-xs text-gray-400">{g.group.member_count} members · Top: {g.topMemberName}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold text-gray-900 text-sm">{getScoreLabel(g.totalScore)}</p>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {/* ── Full Rankings (11+) ──────────────────────────────────────────────── */}
          {ranked.length > 10 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 bg-gray-50 border-b flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gray-400" />
                <h3 className="font-bold text-gray-800">Full Rankings</h3>
                <span className="ml-auto text-xs text-gray-500 bg-white border px-2 py-1 rounded">
                  {ranked.length} {tab === 'individual' ? 'participants' : 'groups'}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {ranked.slice(10).map((item, idx) => {
                  const displayRank = idx + 11;
                  if (tab === 'individual') {
                    const e    = item as typeof individualRanked[0];
                    const isMe = e.entry.user_id === currentUser.id;
                    return (
                      <div key={e.entry.user_id} className={`flex items-center px-5 sm:px-6 py-3.5 transition-colors ${isMe ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}>
                        <span className="w-9 text-center text-sm font-bold text-gray-400 flex-shrink-0">#{displayRank}</span>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm mx-3 flex-shrink-0">
                          {e.entry.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate text-sm ${isMe ? 'text-blue-800' : 'text-gray-900'}`}>
                            {e.entry.name} {isMe && <span className="text-xs font-normal text-blue-500">(you)</span>}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{e.entry.group_name || '—'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900 text-sm">{getScoreLabel(e.score)}</p>
                        </div>
                      </div>
                    );
                  } else {
                    const g = item as typeof groupRanked[0];
                    return (
                      <div key={g.group.group_id} className="flex items-center px-5 sm:px-6 py-3.5 hover:bg-gray-50 transition-colors">
                        <span className="w-9 text-center text-sm font-bold text-gray-400 flex-shrink-0">#{displayRank}</span>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white mx-3 flex-shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-gray-900 text-sm">{g.group.group_name}</p>
                          <p className="text-xs text-gray-500">{g.group.member_count} members · Top: {g.topMemberName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900 text-sm">{getScoreLabel(g.totalScore)}</p>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {/* ── Your Position banner (shown when user is ranked 11+ in individual tab) ── */}
          {tab === 'individual' && myRank !== null && myRank > 10 && myEntry && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm font-bold text-blue-600 flex-shrink-0">Your Position</span>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {currentUser.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-blue-900 text-sm truncate">{currentUser.name}</p>
                <p className="text-xs text-blue-500 truncate">{myEntry.entry.group_name || '—'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-blue-700 text-lg">#{myRank}</p>
                <p className="text-xs text-blue-600">{getScoreLabel(myEntry.score)}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Leaderboard;
