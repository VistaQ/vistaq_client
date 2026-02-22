
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, ProspectStage, UserRole } from '../types';
import { 
  Users, 
  Crown,
  TrendingUp,
  Target,
  Trophy,
  ChevronRight,
  ArrowLeft,
  DollarSign,
  CheckCircle,
  Clock,
  Briefcase,
  Grid,
  Layers
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Zurich Palette
const COLORS = ['#23366F', '#3D6DB5', '#00C9B1', '#648FCC'];

const Group: React.FC = () => {
  const { currentUser, getGroupMembers, groups, getUserById, users } = useAuth();
  const { getGroupProspects } = useData();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales'>('overview');

  // Trainer/Admin Logic: Allow selecting a group
  const [trainerSelectedGroupId, setTrainerSelectedGroupId] = useState<string | null>(null);

  // User Roles Logic
  const isTrainer = currentUser?.role === UserRole.TRAINER;
  const isMasterTrainer = currentUser?.role === UserRole.MASTER_TRAINER;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isMultiGroupUser = isTrainer || isMasterTrainer || isAdmin;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
  };
  
  // TRAINER / ADMIN VIEW: GROUP SELECTION GRID
  if (isMultiGroupUser && !trainerSelectedGroupId) {
      const visibleGroups = (isTrainer && currentUser.managedGroupIds)
        ? groups.filter(g => currentUser.managedGroupIds!.includes(g.id))
        : groups;

      return (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div>
                   <h1 className="text-2xl font-bold text-gray-900">Group Performance Dashboard</h1>
                   <p className="text-sm text-gray-500">
                     {isAdmin ? 'System Administrator View: Select a group to audit.' : 'Select a managed group to view detailed performance and analytics.'}
                   </p>
                </div>
             </div>

             {visibleGroups.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleGroups.map(group => {
                   const gProspects = getGroupProspects(group.id);
                   const gFYC = gProspects.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
                   const gSales = gProspects.filter(p => p.salesOutcome === 'successful').length;
                   // Count all team members (agents + group leaders)
                   const members = users.filter(u =>
                     u.groupId === group.id &&
                     (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER)
                   );

                   return (
                      <button 
                        key={group.id} 
                        onClick={() => setTrainerSelectedGroupId(group.id)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all text-left group flex flex-col h-full"
                      >
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">{group.name}</h3>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 ml-2">
                               <Layers className="w-5 h-5" />
                            </div>
                         </div>
                         
                         <div className="space-y-3 flex-1">
                            <div className="flex justify-between text-sm">
                               <span className="text-gray-500">Total FYC</span>
                               <span className="font-bold text-gray-900">RM {gFYC.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                               <span className="text-gray-500">Sales Closed</span>
                               <span className="font-bold text-gray-900">{gSales}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                               <span className="text-gray-500">Agents</span>
                               <span className="font-bold text-gray-900">{members.length}</span>
                            </div>
                         </div>
                         
                         <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-blue-600 text-sm font-medium">
                            View Dashboard <ChevronRight className="w-4 h-4 ml-1" />
                         </div>
                      </button>
                   );
                })}
             </div>
             ) : (
                <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-dashed">
                    <Grid className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No groups available to view.</p>
                </div>
             )}
          </div>
      );
  }

  // If not Admin/Trainer, user just has one group. If Admin/Trainer selected a group, use that.
  const currentGroupId = isMultiGroupUser ? trainerSelectedGroupId : currentUser?.groupId;

  if (!currentGroupId) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
           <Users className="w-16 h-16 mb-4 opacity-20" />
           <p>You are not assigned to any group.</p>
        </div>
     );
  }

  // --- GROUP DATA PREPARATION ---
  const myGroup = groups.find(g => g.id === currentGroupId);
  const groupProspects = getGroupProspects(currentGroupId);
  const groupMembers = getGroupMembers(currentGroupId);

  // Group Aggregates
  const totalGroupFYC = groupProspects.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
  const totalGroupSales = groupProspects.filter(p => p.salesOutcome === 'successful').length;

  // Count all team members (both agents and group leaders)
  const activeMembersCount = users.filter(u =>
    u.groupId === currentGroupId &&
    (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER)
  ).length;

  const avgFYCPerAgent = activeMembersCount > 0 ? totalGroupFYC / activeMembersCount : 0;

  // Get all team members (agents + group leaders)
  const allGroupUsers = users.filter(u =>
    u.groupId === currentGroupId &&
    (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER)
  );

  // Sorting by FYC instead of Points
  const agentList = allGroupUsers.map(member => {
    const memberProspects = groupProspects.filter(p => p.uid === member.id);
    const memberFYC = memberProspects.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
    const memberSales = memberProspects.filter(p => p.salesOutcome === 'successful').length;
    return {
      ...member,
      fyc: memberFYC,
      sales: memberSales
    };
  })
  .sort((a, b) => b.fyc - a.fyc); // Sort by FYC descending

  // --- AGENT DETAIL VIEW RENDERER ---
  if (selectedAgentId) {
    const agent = agentList.find(u => u.id === selectedAgentId);
    if (!agent) return <div>Agent not found</div>;

    const agentProspects = groupProspects.filter(p => p.uid === selectedAgentId);
    const successfulSales = agentProspects.filter(p => p.salesOutcome === 'successful');
    
    // Updated Logic for Funnel
    const appointmentsSet = agentProspects.filter(p =>
        p.appointmentStatus === 'scheduled' ||
        p.appointmentStatus === 'rescheduled'
    ).length;
    const completedAppointments = agentProspects.filter(p => p.appointmentStatus === 'completed').length;

    const chartData = [
       { name: 'Prospects', value: agentProspects.length },
       { name: 'Appointments', value: appointmentsSet },
       { name: 'Sales Meeting', value: completedAppointments },
       { name: 'Sales', value: successfulSales.length },
    ];

    const upcomingAppointments = agentProspects
        .filter(p => p.appointmentStatus === 'not_done' && p.appointmentDate && new Date(p.appointmentDate) > new Date())
        .sort((a, b) => {
            const dateA = new Date(a.appointmentDate!).getTime();
            const dateB = new Date(b.appointmentDate!).getTime();
            return (isNaN(dateA) ? Infinity : dateA) - (isNaN(dateB) ? Infinity : dateB);
        })
        .slice(0, 5);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center space-x-4">
           <button 
             onClick={() => setSelectedAgentId(null)}
             className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
           >
             <ArrowLeft className="w-5 h-5" />
           </button>
           <div>
             <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
             <p className="text-sm text-gray-500">Individual Performance Dashboard</p>
           </div>
           <div className="ml-auto flex space-x-2 bg-white p-1 rounded-lg border">
             {['overview', 'sales'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
             ))}
           </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Total FYC</p>
                    <h3 className="text-2xl font-bold text-gray-900">RM {agent.fyc.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Total Sales</p>
                    <h3 className="text-2xl font-bold text-gray-900">{agent.sales}</h3>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                   <h3 className="font-bold text-gray-800 mb-4">Sales Funnel</h3>
                   <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Upcoming Meetings</h3>
                    </div>
                    <div className="space-y-3">
                        {upcomingAppointments.length > 0 ? (
                            upcomingAppointments.map(p => (
                                <div key={p.id} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <Clock className="w-4 h-4 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{p.prospectName}</p>
                                        <p className="text-xs text-gray-500">
                                            {(() => {
                                                const d = new Date(p.appointmentDate!);
                                                return !isNaN(d.getTime()) ? d.toLocaleString() : 'Date Pending';
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-sm text-center py-4">No upcoming meetings scheduled.</p>
                        )}
                    </div>
                </div>
            </div>
          </>
        )}

        {activeTab === 'sales' && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Client</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">FYC</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {successfulSales.map(sale => (
                            <tr key={sale.id}>
                                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(sale.updatedAt)}</td>
                                <td className="px-6 py-4 font-medium">{sale.prospectName}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{(sale.productsSold || []).map(p => p.productName).filter(Boolean).join(', ') || '-'}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold">RM {(sale.productsSold || []).reduce((s, p) => s + (p.aceAmount || 0), 0).toLocaleString()}</td>
                            </tr>
                        ))}
                        {successfulSales.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No successful sales yet.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
        )}
      </div>
    );
  }

  // --- DEFAULT VIEW: AGENT LIST & STATS ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          {isMultiGroupUser && (
              <button 
                 onClick={() => setTrainerSelectedGroupId(null)}
                 className="flex items-center text-sm text-gray-500 hover:text-blue-600 mb-2 transition-colors"
              >
                 <ArrowLeft className="w-4 h-4 mr-1" /> Back to Group List
              </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide flex items-center">
             <Crown className="w-6 h-6 mr-3 text-yellow-500" />
             {myGroup?.name || 'My Group'}
          </h1>
          <p className="text-sm text-gray-500">Team Performance & Sales Overview</p>
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg">
           <span className="text-xs uppercase font-semibold opacity-80">Total Group FYC</span>
           <p className="text-2xl font-bold">RM {totalGroupFYC.toLocaleString()}</p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500">Total Sales Closed</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalGroupSales}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
               <Target className="w-6 h-6" />
            </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500">Avg FYC / Agent</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-1">RM {Math.round(avgFYCPerAgent).toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
               <TrendingUp className="w-6 h-6" />
            </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500">Active Agents</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-1">{activeMembersCount}</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
               <Users className="w-6 h-6" />
            </div>
         </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center">
               <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
               Agent Sales Performance
            </h3>
            <span className="text-xs text-gray-500 italic">Click "View" to see agent details</span>
         </div>
         <table className="w-full text-left">
           <thead className="bg-white border-b border-gray-200">
             <tr>
               <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Agent Name</th>
               <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Sales Closed</th>
               <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total FYC (MYR)</th>
               <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {agentList.map((agent) => (
               <tr key={agent.id} className={`hover:bg-blue-50 transition-colors ${agent.id === currentUser?.id ? 'bg-blue-50/50' : ''}`}>
                 <td className="px-6 py-4">
                    <div className="flex items-center">
                       <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mr-3">
                          {agent.name.charAt(0)}
                       </div>
                       <div>
                          <p className={`font-semibold ${agent.id === currentUser?.id ? 'text-blue-700' : 'text-gray-900'}`}>
                             {agent.name} {agent.id === currentUser?.id && '(You)'}
                          </p>
                       </div>
                    </div>
                 </td>
                 <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-700">
                       {agent.sales}
                    </span>
                 </td>
                 <td className="px-6 py-4 text-right">
                    <span className="font-mono font-medium text-gray-900">
                       {agent.fyc.toLocaleString()}
                    </span>
                 </td>
                 <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedAgentId(agent.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-end w-full"
                    >
                      View <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>
    </div>
  );
};

export default Group;
