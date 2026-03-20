
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, UserRole } from '../types';
import { Trophy, Medal, Award, Crown, Filter } from 'lucide-react';
import { computeUserPoints } from '../services/points';
import { apiCall } from '../services/apiClient';

const Leaderboard: React.FC = () => {
  const { currentUser, users, groups } = useAuth();
  const { prospects, coachingSessions, pointConfig, badgeTiers, refetchCoachingSessions } = useData();

  // For roles where /users is restricted, we fetch all groups' members directly
  const [fetchedUsers, setFetchedUsers] = useState<User[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  useEffect(() => {
    refetchCoachingSessions();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    // Admin and Master Trainer already receive all users via AuthContext
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MASTER_TRAINER) return;
    if (groups.length === 0) return;

    Promise.all(groups.map(g => apiCall(`/users/group/${g.id}`)))
      .then(responses => {
        const all: any[] = responses.flatMap(r => r.users || []);
        const normalized: User[] = all.map(u => ({ ...u, id: u.uid || u.id }));
        const unique = normalized.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);
        setFetchedUsers(unique);
      })
      .catch(() => {});
  }, [currentUser?.id, groups.length]);

  if (!currentUser) return null;

  const isFullAccess = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MASTER_TRAINER;

  const eligibleRoles = [UserRole.AGENT, UserRole.GROUP_LEADER];

  // System-wide pool — all roles see the same data
  const allUsers: User[] = isFullAccess
    ? users.filter(u => eligibleRoles.includes(u.role))
    : fetchedUsers.filter(u => eligibleRoles.includes(u.role));

  const sortedBadges = [...badgeTiers].sort((a, b) => a.threshold - b.threshold);

  const getCurrentBadge = (pts: number) => {
    const reversed = [...sortedBadges].reverse();
    return reversed.find(b => pts >= b.threshold) || sortedBadges[0];
  };

  const ranked = allUsers
    .map(user => {
      const userProspects = prospects.filter(p => p.uid === user.id);
      const { total } = computeUserPoints(user.id, userProspects, coachingSessions, pointConfig);
      return { user, points: total, badge: getCurrentBadge(total) };
    })
    .sort((a, b) => b.points - a.points);

  // Group filter — applied only to the display; global rank is preserved
  const filteredRanked = selectedGroupId === 'all'
    ? ranked
    : ranked.filter(e => e.user.groupId === selectedGroupId);

  const top3 = filteredRanked.slice(0, 3);

  const podiumOrder = top3.length === 3
    ? [top3[1], top3[0], top3[2]]
    : top3;

  const podiumHeights = ['h-24', 'h-36', 'h-20'];
  const podiumRanks = [2, 1, 3];
  const podiumIcons = [
    <Medal key="2" className="w-6 h-6 text-slate-400" />,
    <Crown key="1" className="w-7 h-7 text-yellow-500" />,
    <Award key="3" className="w-6 h-6 text-amber-700" />,
  ];

  const selectedGroupName = selectedGroupId === 'all'
    ? null
    : groups.find(g => g.id === selectedGroupId)?.name;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Trophy className="w-7 h-7 mr-3 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedGroupName
              ? `Showing ${filteredRanked.length} members from ${selectedGroupName} — global points`
              : 'All agents & group leaders ranked by total points'}
          </p>
        </div>

        {/* Group Filter */}
        {groups.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="all">All Groups</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredRanked.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="font-medium text-gray-500">No rankings yet</p>
          <p className="text-sm text-gray-400 mt-1">
            {selectedGroupId !== 'all' ? 'No members found in this group.' : 'Start adding prospects to earn points!'}
          </p>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length > 0 && (
            <div className="bg-gradient-to-br from-sidebar-primary to-sidebar-border rounded-2xl p-8 shadow-xl">
              <h2 className="text-center text-white font-bold text-lg mb-8 tracking-wide uppercase opacity-70">Top Performers</h2>
              <div className="flex items-end justify-center gap-4 md:gap-8">
                {(top3.length === 3 ? podiumOrder : top3).map((entry, podiumIdx) => {
                  const rank = top3.length === 3 ? podiumRanks[podiumIdx] : podiumIdx + 1;
                  const isFirst = rank === 1;
                  // Global rank — position in the unfiltered list
                  const globalRank = ranked.findIndex(e => e.user.id === entry.user.id) + 1;
                  return (
                    <div key={entry.user.id} className="flex flex-col items-center">
                      <div className={`flex flex-col items-center mb-3 ${isFirst ? 'scale-110' : ''}`}>
                        {top3.length === 3 && podiumIcons[podiumIdx]}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg mt-1 ${isFirst ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 ring-4 ring-yellow-300' : 'bg-gradient-to-br from-slate-500 to-slate-700'}`}>
                          {entry.user.name.charAt(0)}
                        </div>
                        <p className="text-white font-bold text-sm mt-2 max-w-[100px] text-center truncate">{entry.user.name}</p>
                        <p className="text-slate-400 text-xs truncate max-w-[100px] text-center">{entry.user.groupName || '—'}</p>
                        <p className={`font-extrabold mt-1 ${isFirst ? 'text-yellow-400 text-lg' : 'text-blue-300 text-base'}`}>
                          {entry.points.toLocaleString()} pts
                        </p>
                        {selectedGroupId !== 'all' && globalRank !== rank && (
                          <p className="text-slate-500 text-[10px] mt-0.5">#{globalRank} globally</p>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 font-semibold ${entry.badge.bg} ${entry.badge.color}`}>
                          {entry.badge.name}
                        </span>
                      </div>
                      <div className={`${top3.length === 3 ? podiumHeights[podiumIdx] : 'h-20'} w-24 md:w-32 rounded-t-xl flex items-center justify-center ${isFirst ? 'bg-gradient-to-t from-yellow-600 to-yellow-400' : 'bg-slate-600'}`}>
                        <span className="text-white font-black text-3xl opacity-30">#{rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full ranking table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center">
              <Trophy className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="font-bold text-gray-800">Full Rankings</h3>
              <span className="ml-auto text-xs text-gray-500 bg-white border px-2 py-1 rounded">
                {selectedGroupId !== 'all' ? `${filteredRanked.length} of ${ranked.length} participants` : `${ranked.length} participants`}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredRanked.map((entry, idx) => {
                const displayRank = idx + 1;
                const globalRank = ranked.findIndex(e => e.user.id === entry.user.id) + 1;
                const isCurrentUser = entry.user.id === currentUser.id;
                return (
                  <div key={entry.user.id} className={`flex items-center px-6 py-4 transition-colors ${isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}>
                    <div className="w-10 flex-shrink-0 text-center">
                      {displayRank === 1 ? (
                        <Crown className="w-5 h-5 text-yellow-500 mx-auto" />
                      ) : displayRank === 2 ? (
                        <Medal className="w-5 h-5 text-slate-400 mx-auto" />
                      ) : displayRank === 3 ? (
                        <Award className="w-5 h-5 text-amber-700 mx-auto" />
                      ) : (
                        <span className="text-sm font-bold text-gray-400">#{displayRank}</span>
                      )}
                    </div>

                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm mx-4 flex-shrink-0">
                      {entry.user.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${isCurrentUser ? 'text-blue-800' : 'text-gray-900'}`}>
                        {entry.user.name} {isCurrentUser && <span className="text-xs font-normal text-blue-500">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {entry.user.groupName || '—'}
                        {selectedGroupId !== 'all' && globalRank !== displayRank && (
                          <span className="ml-2 text-gray-400">· #{globalRank} globally</span>
                        )}
                      </p>
                    </div>

                    <div className="hidden md:block mx-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${entry.badge.bg} ${entry.badge.color}`}>
                        {entry.badge.name}
                      </span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold text-gray-900">{entry.points.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
