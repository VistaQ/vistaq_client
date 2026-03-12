
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Award, Star, TrendingUp, Lock, CheckCircle, Users, Target } from 'lucide-react';
import { Player } from '@lottiefiles/react-lottie-player';
import { computeUserPoints } from '../services/points';

const PointsHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const { getProspectsByScope, badgeTiers, coachingSessions, pointConfig } = useData();

  if (!currentUser) return null;

  const sortedBadges = [...badgeTiers].sort((a, b) => a.threshold - b.threshold);
  const prospects = getProspectsByScope(currentUser);

  const { total: totalPoints, breakdown } = computeUserPoints(
    currentUser.id,
    prospects,
    coachingSessions,
    pointConfig
  );

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

  const prospectEntries = breakdown.filter(e => e.category === 'prospect');
  const coachingEntries = breakdown.filter(e => e.category === 'coaching');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Points & Achievements</h1>
      </div>

      {/* Header Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Award className="w-64 h-64 text-blue-900" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-8 md:mb-0">
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
                <span>Next Milestone: {nextBadge.name}</span>
                <span>{Math.floor(progressToNext)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{currentBadge.threshold} pts</span>
                <span className="font-medium text-blue-600">{Math.floor(nextBadge.threshold - totalPoints)} pts to go!</span>
                <span>{nextBadge.threshold} pts</span>
              </div>
            </div>
          ) : (
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-green-50 rounded-xl border border-green-100">
              <div className="text-center">
                <div className="inline-flex p-2 bg-green-100 rounded-full text-green-600 mb-2">
                  <Star className="w-6 h-6 fill-current" />
                </div>
                <h3 className="text-green-800 font-bold">Max Rank Achieved!</h3>
                <p className="text-green-600 text-sm">You are a legend!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Points Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-blue-50 rounded-lg mr-3">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Prospect Activity</p>
              <p className="text-2xl font-bold text-gray-900">{prospectEntries.reduce((s, e) => s + e.points, 0).toLocaleString()} pts</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{prospectEntries.length} activities</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-purple-50 rounded-lg mr-3">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Coaching Attended</p>
              <p className="text-2xl font-bold text-gray-900">{coachingEntries.reduce((s, e) => s + e.points, 0).toLocaleString()} pts</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{coachingEntries.length} confirmed sessions</p>
        </div>
      </div>

      {/* Badges Grid */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-gray-500" />
          Milestone Badges
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sortedBadges.map((m) => {
            const isEarned = totalPoints >= m.threshold;
            return (
              <div key={m.id} className={`relative p-4 rounded-xl border flex flex-col items-center text-center transition-all ${isEarned ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                {isEarned && (
                  <div className="absolute top-2 right-2 text-green-500 bg-white rounded-full shadow-sm">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}
                <div className={`p-3 rounded-full ${isEarned ? m.bg : 'bg-gray-200'} mb-3 transition-colors overflow-hidden`} style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isEarned && m.lottieUrl ? (
                    <Player src={m.lottieUrl} loop autoplay style={{ width: 40, height: 40 }} />
                  ) : isEarned ? (
                    <Award className={`w-6 h-6 ${m.color}`} />
                  ) : (
                    <Lock className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <h4 className={`font-bold text-sm ${isEarned ? 'text-gray-900' : 'text-gray-500'}`}>{m.name}</h4>
                <span className="text-xs text-gray-500 mt-1">{m.threshold.toLocaleString()} pts</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-bold text-gray-800">Points History</h3>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border">
            {breakdown.length} Entries
          </span>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {breakdown.map((entry) => (
              <tr key={entry.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(entry.date)}</td>
                <td className="px-6 py-4">
                  {entry.category === 'prospect' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <Target className="w-3 h-3 mr-1" /> Prospect
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Users className="w-3 h-3 mr-1" /> Coaching
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 font-medium">{entry.action}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{entry.subject}</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    +{entry.points} pts
                  </span>
                </td>
              </tr>
            ))}
            {breakdown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-gray-100 rounded-full mb-3">
                      <TrendingUp className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="font-medium">No points earned yet.</p>
                    <p className="text-sm mt-1">Add prospects and attend coaching sessions to start earning points!</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PointsHistory;
