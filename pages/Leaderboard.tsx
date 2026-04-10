
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Trophy, Medal, Award, Crown, AlertCircle, Users, ChevronDown, Loader2 } from 'lucide-react';
import { apiCall } from '../services/apiClient';
import type { components } from '../types.generated';

type Tab = 'individual' | 'group';
type Metric = 'points' | 'prospects';
type Period = 'mtd' | 'ytd';

type IndividualEntry = components['schemas']['LeaderboardStatsIndividualObject'];
type GroupEntry = components['schemas']['LeaderboardStatsGroupObject'];
type StatsResponse = {
  success: boolean;
  data: {
    period: 'mtd' | 'ytd';
    generated_at: string;
    individual: IndividualEntry[];
    groups: GroupEntry[];
  };
};

// Metrics that are future/placeholder — not yet backed by real data
const PLACEHOLDER_METRICS: string[] = ['noc', 'ace', 'fyct', 'fyc', 'acs'];

const Leaderboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { badgeTiers } = useData();

  const [tab, setTab] = useState<Tab>('individual');
  const [metric, setMetric] = useState<Metric>('points');
  const [period, setPeriod] = useState<Period>('mtd');

  const [statsData, setStatsData] = useState<StatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const getScore = (entry: IndividualEntry | GroupEntry): number =>
    metric === 'prospects' ? entry.prospects_added : entry.total_points;

  // ── Individual tab rankings ──────────────────────────────────────────────
  const individualRanked = useMemo(() => {
    if (!statsData) return [];
    return statsData.individual
      .map(entry => {
        const score = getScore(entry);
        return { entry, score, badge: getCurrentBadge(score) };
      })
      .sort((a, b) => b.score - a.score);
  }, [statsData, metric, sortedBadges]);

  // ── Group tab rankings ───────────────────────────────────────────────────
  const groupRanked = useMemo(() => {
    if (!statsData) return [];
    return statsData.groups
      .map(group => {
        const totalScore = getScore(group);
        const members = statsData.individual.filter(i => i.group_id === group.group_id);
        const topMember = members.reduce<IndividualEntry | null>((best, m) =>
          !best || m.total_points > best.total_points ? m : best
        , null);
        return { group, totalScore, topMemberName: topMember?.name ?? '—' };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [statsData, metric]);

  const ranked = tab === 'individual' ? individualRanked : groupRanked;
  const top3 = ranked.slice(0, 3);
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumHeights = ['h-24', 'h-36', 'h-20'];
  const podiumRanks = [2, 1, 3];
  const podiumIcons = [
    <Medal key="2" className="w-6 h-6 text-slate-400" />,
    <Crown key="1" className="w-7 h-7 text-yellow-400" />,
    <Award key="3" className="w-6 h-6 text-amber-600" />,
  ];

  const metricLabel = metric === 'points' ? 'Total Points' : 'Total Prospects';
  const periodLabel = period === 'mtd' ? 'Month to Date' : 'Year to Date';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Trophy className="w-7 h-7 mr-3 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">Ranked by Sales Results and Points</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
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
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Group</span>
          </button>
        </div>

        <div className="relative">
          <select
            value={metric}
            onChange={e => setMetric(e.target.value as Metric)}
            className="appearance-none text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          >
            <option value="points">Total Points</option>
            <option value="prospects">Total Prospects</option>
            <option disabled>── Coming Soon ──</option>
            {PLACEHOLDER_METRICS.map(m => (
              <option key={m} value={m} disabled>{m.toUpperCase()} (Coming soon)</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

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

        <span className="ml-auto text-xs text-gray-400 hidden sm:block">
          {metricLabel} · {periodLabel}
        </span>
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
          {/* ── Podium ── */}
          {top3.length > 0 && (
            <div className="bg-gradient-to-br from-sidebar-primary to-sidebar-border rounded-2xl p-8 shadow-xl">
              <h2 className="text-center text-white font-bold text-lg mb-8 tracking-wide uppercase opacity-70">Top Performers</h2>
              <div className="flex items-end justify-center gap-4 md:gap-8">
                {(top3.length === 3 ? podiumOrder : top3).map((item, podiumIdx) => {
                  const rank = top3.length === 3 ? podiumRanks[podiumIdx] : podiumIdx + 1;
                  const isFirst = rank === 1;

                  const avatarGradient = rank === 1
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 ring-4 ring-yellow-300'
                    : rank === 2
                    ? 'bg-gradient-to-br from-gray-300 to-gray-500 ring-4 ring-gray-200'
                    : 'bg-gradient-to-br from-amber-600 to-amber-800 ring-4 ring-amber-500';
                  const podiumGradient = rank === 1
                    ? 'bg-gradient-to-t from-yellow-600 to-yellow-400'
                    : rank === 2
                    ? 'bg-gradient-to-t from-gray-500 to-gray-400'
                    : 'bg-gradient-to-t from-amber-800 to-amber-600';
                  const scoreColor = rank === 1
                    ? 'text-yellow-400 text-lg'
                    : rank === 2
                    ? 'text-gray-300 text-base'
                    : 'text-amber-500 text-base';

                  if (tab === 'individual') {
                    const e = item as typeof individualRanked[0];
                    const isMe = e.entry.user_id === currentUser.id;
                    return (
                      <div key={e.entry.user_id} className="flex flex-col items-center">
                        <div className={`flex flex-col items-center mb-3 ${isFirst ? 'scale-110' : ''}`}>
                          {top3.length === 3 && podiumIcons[podiumIdx]}
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg mt-1 ${avatarGradient}`}>
                            {e.entry.name.charAt(0)}
                          </div>
                          <p className="text-white font-bold text-sm mt-2 max-w-[100px] text-center truncate">
                            {e.entry.name} {isMe && <span className="opacity-60 text-xs">(you)</span>}
                          </p>
                          <p className="text-slate-400 text-xs truncate max-w-[100px] text-center">{e.entry.group_name || '—'}</p>
                          <p className={`font-extrabold mt-1 ${scoreColor}`}>
                            {metric === 'points' ? `${e.score.toLocaleString()} pts` : `${e.score} prospects`}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 font-semibold ${e.badge.bg} ${e.badge.color}`}>
                            {e.badge.name}
                          </span>
                        </div>
                        <div className={`${top3.length === 3 ? podiumHeights[podiumIdx] : 'h-20'} w-24 md:w-32 rounded-t-xl flex items-center justify-center ${podiumGradient}`}>
                          <span className="text-white font-black text-3xl opacity-30">#{rank}</span>
                        </div>
                      </div>
                    );
                  } else {
                    const g = item as typeof groupRanked[0];
                    return (
                      <div key={g.group.group_id} className="flex flex-col items-center">
                        <div className={`flex flex-col items-center mb-3 ${isFirst ? 'scale-110' : ''}`}>
                          {top3.length === 3 && podiumIcons[podiumIdx]}
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg mt-1 ${avatarGradient}`}>
                            <Users className="w-6 h-6" />
                          </div>
                          <p className="text-white font-bold text-sm mt-2 max-w-[100px] text-center truncate">{g.group.group_name}</p>
                          <p className="text-slate-400 text-xs truncate max-w-[100px] text-center">{g.group.member_count} members</p>
                          <p className={`font-extrabold mt-1 ${scoreColor}`}>
                            {metric === 'points' ? `${g.totalScore.toLocaleString()} pts` : `${g.totalScore} prospects`}
                          </p>
                        </div>
                        <div className={`${top3.length === 3 ? podiumHeights[podiumIdx] : 'h-20'} w-24 md:w-32 rounded-t-xl flex items-center justify-center ${podiumGradient}`}>
                          <span className="text-white font-black text-3xl opacity-30">#{rank}</span>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {/* ── Top 10 ── */}
          {ranked.length > 3 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center">
                <Trophy className="w-5 h-5 text-amber-500 mr-2" />
                <h3 className="font-bold text-gray-800">Top 10</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {ranked.slice(3, 10).map((item, idx) => {
                  const displayRank = idx + 4;
                  if (tab === 'individual') {
                    const e = item as typeof individualRanked[0];
                    const isMe = e.entry.user_id === currentUser.id;
                    return (
                      <div key={e.entry.user_id} className={`flex items-center px-6 py-3 transition-colors ${isMe ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}>
                        <span className="w-8 text-center text-sm font-bold text-gray-400 flex-shrink-0">#{displayRank}</span>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm mx-3 flex-shrink-0">
                          {e.entry.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate text-sm ${isMe ? 'text-blue-800' : 'text-gray-900'}`}>
                            {e.entry.name} {isMe && <span className="text-xs font-normal text-blue-500">(you)</span>}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{e.entry.group_name || '—'}</p>
                        </div>
                        <span className={`hidden md:inline-flex text-xs px-2 py-0.5 rounded-full font-semibold mr-4 ${e.badge.bg} ${e.badge.color}`}>
                          {e.badge.name}
                        </span>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900 text-sm">{e.score.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">{metric === 'points' ? 'pts' : 'prospects'}</p>
                        </div>
                      </div>
                    );
                  } else {
                    const g = item as typeof groupRanked[0];
                    return (
                      <div key={g.group.group_id} className="flex items-center px-6 py-3 hover:bg-gray-50 transition-colors">
                        <span className="w-8 text-center text-sm font-bold text-gray-400 flex-shrink-0">#{displayRank}</span>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white mx-3 flex-shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm text-gray-900">{g.group.group_name}</p>
                          <p className="text-xs text-gray-400">{g.group.member_count} members · Top: {g.topMemberName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900 text-sm">{g.totalScore.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">{metric === 'points' ? 'pts' : 'prospects'}</p>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {/* ── Full Rankings ── */}
          {ranked.length > 10 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center">
              <Trophy className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="font-bold text-gray-800">Full Rankings</h3>
              <span className="ml-auto text-xs text-gray-500 bg-white border px-2 py-1 rounded">
                {ranked.length} {tab === 'individual' ? 'participants' : 'groups'}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {ranked.slice(10).map((item, idx) => {
                const displayRank = idx + 11;
                if (tab === 'individual') {
                  const e = item as typeof individualRanked[0];
                  const isMe = e.entry.user_id === currentUser.id;
                  return (
                    <div key={e.entry.user_id} className={`flex items-center px-6 py-4 transition-colors ${isMe ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}>
                      <div className="w-10 flex-shrink-0 text-center">
                        <span className="text-sm font-bold text-gray-400">#{displayRank}</span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm mx-4 flex-shrink-0">
                        {e.entry.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isMe ? 'text-blue-800' : 'text-gray-900'}`}>
                          {e.entry.name} {isMe && <span className="text-xs font-normal text-blue-500">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{e.entry.group_name || '—'}</p>
                      </div>
                      <div className="hidden md:block mx-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${e.badge.bg} ${e.badge.color}`}>
                          {e.badge.name}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-extrabold text-gray-900">{e.score.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{metric === 'points' ? 'points' : 'prospects'}</p>
                      </div>
                    </div>
                  );
                } else {
                  const g = item as typeof groupRanked[0];
                  return (
                    <div key={g.group.group_id} className="flex items-center px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 flex-shrink-0 text-center">
                        <span className="text-sm font-bold text-gray-400">#{displayRank}</span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white mx-4 flex-shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-gray-900">{g.group.group_name}</p>
                        <p className="text-xs text-gray-500">{g.group.member_count} members · Top: {g.topMemberName}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-extrabold text-gray-900">{g.totalScore.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{metric === 'points' ? 'points' : 'prospects'}</p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
};

export default Leaderboard;
