
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Award, Star, Lock, CheckCircle, Users, Target, DollarSign, X, TrendingUp, Loader2 } from 'lucide-react';
import { Player } from '@lottiefiles/react-lottie-player';
import { apiCall } from '../services/apiClient';
import type { AgentPointsData, AgentPointsResponse } from '../types';

type HistoryCategory = 'prospect' | 'coaching' | null;

const PointsHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const { badgeTiers } = useData();
  const [historyCategory, setHistoryCategory] = useState<HistoryCategory>(null);
  const [pointsData, setPointsData] = useState<AgentPointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ userId: currentUser.id, limit: '100' });
    apiCall<AgentPointsResponse>(`/agent-points?${params.toString()}`)
      .then(res => {
        if (res.success) setPointsData(res.data);
        else setError('Failed to load points data.');
      })
      .catch(err => setError(err.message || 'Failed to load points data.'))
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !pointsData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <TrendingUp className="w-8 h-8 mb-3 text-gray-400" />
        <p className="font-medium">{error ?? 'No data available.'}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            const params = new URLSearchParams({ userId: currentUser.id, limit: '100' });
            apiCall<AgentPointsResponse>(`/agent-points?${params.toString()}`)
              .then(res => { if (res.success) setPointsData(res.data); else setError('Failed to load points data.'); })
              .catch(err => setError(err.message || 'Failed to load points data.'))
              .finally(() => setLoading(false));
          }}
          className="mt-3 text-sm text-blue-600 font-medium hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalPoints = pointsData.total;
  const sortedBadges = [...badgeTiers].sort((a, b) => a.threshold - b.threshold);

  // Determine current badge and next milestone
  const currentBadgeIndex = [...sortedBadges].reverse().findIndex(m => totalPoints >= m.threshold);
  const originalIndex = currentBadgeIndex === -1 ? 0 : sortedBadges.length - 1 - currentBadgeIndex;
  const currentBadge = sortedBadges[originalIndex];
  const nextBadge = sortedBadges[originalIndex + 1];

  const progressToNext = nextBadge
    ? Math.min(100, Math.max(0, ((totalPoints - currentBadge.threshold) / (nextBadge.threshold - currentBadge.threshold)) * 100))
    : 100;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
  };

  const prospectEntries = pointsData.breakdown.filter(e => e.category === 'prospect');
  const coachingEntries = pointsData.breakdown.filter(e => e.category === 'coaching');

  const historyEntries = historyCategory === 'prospect' ? prospectEntries : coachingEntries;
  const historyTitle = historyCategory === 'prospect' ? 'Prospect Management History' : 'Personal Development History';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Points</h1>
          {currentBadge && (
            <span className={`inline-flex items-center mt-1 px-3 py-1 rounded-full text-xs font-bold ${currentBadge.bg} ${currentBadge.color}`}>
              Level {currentBadge.level ?? originalIndex + 1} — {currentBadge.name}
            </span>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Award className="w-64 h-64 text-blue-900" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${currentBadge.bg} mr-6 shadow-inner overflow-hidden`}>
              {currentBadge.lottieUrl ? (
                <Player src={currentBadge.lottieUrl} loop autoplay style={{ width: 80, height: 80 }} />
              ) : (
                <Award className={`w-12 h-12 ${currentBadge.color}`} />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Current Rank</h2>
              <h1 className="text-3xl font-bold text-gray-900">{currentBadge.name}</h1>
              <p className="text-blue-600 font-bold text-xl mt-1">{Math.floor(totalPoints).toLocaleString()} Points</p>
            </div>
          </div>

          {nextBadge ? (
            <div className="w-full md:w-1/2 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                <span>Next: {nextBadge.name}</span>
                <span>{Math.floor(progressToNext)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{currentBadge.threshold.toLocaleString()} pts</span>
                <span className="font-medium text-blue-600">{Math.floor(nextBadge.threshold - totalPoints).toLocaleString()} pts to go!</span>
                <span>{nextBadge.threshold.toLocaleString()} pts</span>
              </div>
            </div>
          ) : (
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-green-50 rounded-xl border border-green-100">
              <div className="text-center">
                <div className="inline-flex p-2 bg-green-100 rounded-full text-green-600 mb-2">
                  <Star className="w-6 h-6 fill-current" />
                </div>
                <h3 className="text-green-800 font-bold">Max Rank Achieved!</h3>
                <p className="text-green-600 text-sm">You've reached Achiever status!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3 Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Prospect Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-blue-50 rounded-lg mr-3">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Prospect Management</p>
              <p className="text-2xl font-bold text-gray-900">{pointsData.categories.prospect.toLocaleString()} pts</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">{prospectEntries.length} activities recorded</p>
          <button
            onClick={() => setHistoryCategory('prospect')}
            className="mt-auto text-xs text-blue-600 font-bold hover:underline text-left"
          >
            See Points History →
          </button>
        </div>

        {/* Sales Completion — placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col opacity-60">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-green-50 rounded-lg mr-3">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Sales Completion</p>
              <p className="text-2xl font-bold text-gray-900">{pointsData.categories.sales.toLocaleString()} pts</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Coming soon — backend integration pending
          </p>
          <button
            disabled
            className="mt-auto text-xs text-gray-400 font-bold text-left cursor-not-allowed"
          >
            See Points History →
          </button>
        </div>

        {/* Personal Development */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-purple-50 rounded-lg mr-3">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Personal Development</p>
              <p className="text-2xl font-bold text-gray-900">{pointsData.categories.coaching.toLocaleString()} pts</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">{coachingEntries.length} confirmed sessions</p>
          <button
            onClick={() => setHistoryCategory('coaching')}
            className="mt-auto text-xs text-purple-600 font-bold hover:underline text-left"
          >
            See Points History →
          </button>
        </div>
      </div>

      {/* Milestone Badges */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-gray-500" />
          Milestone Badges
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {sortedBadges.map((m, idx) => {
            const isEarned = totalPoints >= m.threshold;
            const isCurrent = m.id === currentBadge.id;
            return (
              <div
                key={m.id}
                className={`relative p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                  isCurrent
                    ? 'bg-white border-blue-300 shadow-md ring-2 ring-blue-400 ring-offset-2'
                    : isEarned
                    ? 'bg-white border-blue-100 shadow-sm'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                {isEarned && !isCurrent && (
                  <div className="absolute top-1.5 right-1.5 text-green-500 bg-white rounded-full shadow-sm">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-1.5 right-1.5">
                    <Star className="w-4 h-4 text-blue-500 fill-current" />
                  </div>
                )}
                <div
                  className={`rounded-full ${isEarned ? m.bg : 'bg-gray-200'} mb-2 transition-colors overflow-hidden flex items-center justify-center`}
                  style={{ width: 44, height: 44 }}
                >
                  {isEarned && m.lottieUrl ? (
                    <Player src={m.lottieUrl} loop autoplay style={{ width: 32, height: 32 }} />
                  ) : isEarned ? (
                    <Award className={`w-5 h-5 ${m.color}`} />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <p className="text-xs font-bold text-gray-400 mb-0.5">Lv.{m.level ?? idx + 1}</p>
                <h4 className={`font-bold text-xs ${isEarned ? 'text-gray-900' : 'text-gray-400'}`}>{m.name}</h4>
                <span className="text-[10px] text-gray-400 mt-0.5">{m.threshold.toLocaleString()} pts</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Modal */}
      {historyCategory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setHistoryCategory(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-500" />
                <h3 className="font-bold text-gray-800">{historyTitle}</h3>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border">{historyEntries.length} entries</span>
              </div>
              <button onClick={() => setHistoryCategory(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1">
              {historyEntries.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-400">
                  <TrendingUp className="w-8 h-8 mb-3" />
                  <p className="font-medium">No entries yet</p>
                  <p className="text-sm mt-1">
                    {historyCategory === 'prospect'
                      ? 'Add prospects and complete appointments to earn points.'
                      : 'Attend coaching sessions to earn points.'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Subject</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(entry.date)}</td>
                        <td className="px-6 py-3 text-sm text-gray-700 font-medium">{entry.action}</td>
                        <td className="px-6 py-3 text-sm text-gray-600 truncate max-w-[160px]">{entry.subject}</td>
                        <td className="px-6 py-3 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            +{entry.points} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsHistory;
