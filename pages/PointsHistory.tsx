import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Award, Star, TrendingUp, Lock, CheckCircle } from 'lucide-react';

const PointsHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const { getProspectsByScope, badgeTiers } = useData();

  if (!currentUser) return null;

  // Use Dynamic Badges
  const sortedBadges = [...badgeTiers].sort((a, b) => a.threshold - b.threshold);

  const prospects = getProspectsByScope(currentUser);
  
  // Filter for items that gave points and sort by most recent
  const history = prospects
    .filter(p => (p.pointsAwarded || 0) > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const totalPoints = history.reduce((sum, p) => sum + (p.pointsAwarded || 0), 0);

  // Determine current badge and next milestone
  // Find the highest threshold met
  const currentBadgeIndex = [...sortedBadges].reverse().findIndex(m => totalPoints >= m.threshold);
  // The reverse index needs to be converted back to original array index
  const originalIndex = currentBadgeIndex === -1 ? 0 : sortedBadges.length - 1 - currentBadgeIndex;
  
  const currentBadge = sortedBadges[originalIndex];
  const nextBadge = sortedBadges[originalIndex + 1];
  
  const progressToNext = nextBadge 
    ? Math.min(100, Math.max(0, ((totalPoints - currentBadge.threshold) / (nextBadge.threshold - currentBadge.threshold)) * 100))
    : 100;

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
               <div className={`w-24 h-24 rounded-full flex items-center justify-center ${currentBadge.bg} mr-6 shadow-inner`}>
                  <Award className={`w-12 h-12 ${currentBadge.color}`} />
               </div>
               <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Current Rank</h2>
                  <h1 className="text-3xl font-bold text-gray-900">{currentBadge.name}</h1>
                  <p className="text-blue-600 font-bold text-xl mt-1">{Math.floor(totalPoints).toLocaleString()} Points</p>
               </div>
            </div>

            {/* Progress Bar */}
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
                  ></div>
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
                   <div className={`p-4 rounded-full ${isEarned ? m.bg : 'bg-gray-200'} mb-3 transition-colors`}>
                      {isEarned ? <Award className={`w-6 h-6 ${m.color}`} /> : <Lock className="w-6 h-6 text-gray-400" />}
                   </div>
                   <h4 className={`font-bold text-sm ${isEarned ? 'text-gray-900' : 'text-gray-500'}`}>{m.name}</h4>
                   <span className="text-xs text-gray-500 mt-1">{m.threshold.toLocaleString()} pts</span>
                </div>
              )
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
                {history.length} Transactions
             </span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Source / Client</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Points Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(item.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                       <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-2">
                          {item.name.charAt(0)}
                       </div>
                       <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 pl-8">Closed Sale</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {item.productType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      +{Math.floor(item.pointsAwarded || 0)} pts
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                       <div className="p-4 bg-gray-100 rounded-full mb-3">
                          <TrendingUp className="w-6 h-6 text-gray-400" />
                       </div>
                       <p className="font-medium">No points earned yet.</p>
                       <p className="text-sm mt-1">Close sales to start earning points and badges!</p>
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