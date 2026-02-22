
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, UserRole } from '../types';
import { apiCall } from '../services/apiClient';
import {
  Search,
  UserCheck,
  ChevronRight,
  ArrowLeft,
  Clock,
  Target
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Zurich Palette
const COLORS = ['#23366F', '#3D6DB5', '#00C9B1', '#648FCC'];

const Agents: React.FC = () => {
  const { groups, getGroupMembers, getUserById, currentUser, users } = useAuth();
  const { prospects } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales'>('overview');
  const [groupUsers, setGroupUsers] = useState<any[]>([]);
  const [groupProspects, setGroupProspects] = useState<any[]>([]);

  // Fetch group users and prospects for group leaders
  useEffect(() => {
    const fetchGroupData = async () => {
      if (currentUser?.role === UserRole.GROUP_LEADER && currentUser.groupId) {
        try {
          // Fetch users
          const usersResponse = await apiCall(`/users/group/${currentUser.groupId}`);
          setGroupUsers(usersResponse.users || []);

          // Fetch prospects
          const prospectsResponse = await apiCall(`/prospects/group/${currentUser.groupId}`);
          const raw = prospectsResponse.prospects || [];
          // Normalize prospects
          const normalized = raw.map((p: any) => ({
            ...p,
            id: p.id || p.prospectId,
            prospectName: p.prospectName || '',
            appointmentDate: p.appointmentDate?._seconds
              ? new Date(p.appointmentDate._seconds * 1000).toISOString()
              : p.appointmentDate,
            appointmentCompletedAt: p.appointmentCompletedAt?._seconds
              ? new Date(p.appointmentCompletedAt._seconds * 1000).toISOString()
              : p.appointmentCompletedAt,
            salesCompletedAt: p.salesCompletedAt?._seconds
              ? new Date(p.salesCompletedAt._seconds * 1000).toISOString()
              : p.salesCompletedAt,
            createdAt: p.createdAt?._seconds
              ? new Date(p.createdAt._seconds * 1000).toISOString()
              : p.createdAt,
            updatedAt: p.updatedAt?._seconds
              ? new Date(p.updatedAt._seconds * 1000).toISOString()
              : p.updatedAt,
            productsSold: (p.productsSold || []).map((prod: any, i: number) => ({
              ...prod,
              id: prod.id || `prod_${i}`,
            })),
          }));
          setGroupProspects(normalized);
        } catch (error) {
          console.error('Failed to fetch group data:', error);
          setGroupUsers([]);
          setGroupProspects([]);
        }
      }
    };
    fetchGroupData();
  }, [currentUser?.groupId, currentUser?.role]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
  };

  // Helper to handle redacted prospect names for group leaders viewing other agents
  const getProspectDisplayName = (prospect: any) => {
    // Show actual name only if it's the current user's prospect
    if (prospect.uid === currentUser?.id) {
      return prospect.prospectName || 'N/A';
    }
    // For other agents' prospects, show nothing
    return '';
  };

  // 1. Determine Visible Groups for current user
  let visibleGroups = groups; // Default to all (Admin & Master Trainer)

  if (currentUser?.role === UserRole.TRAINER) {
      // Trainers MUST have managedGroupIds - only show their managed groups
      if (currentUser.managedGroupIds && currentUser.managedGroupIds.length > 0) {
          visibleGroups = groups.filter(g => currentUser.managedGroupIds!.includes(g.id));
      } else {
          // If trainer has no managedGroupIds, show empty (data issue - needs to be fixed in backend)
          visibleGroups = [];
      }
  } else if (currentUser?.role === UserRole.GROUP_LEADER && currentUser.groupId) {
      visibleGroups = groups.filter(g => g.id === currentUser.groupId);
  } else if (currentUser?.role === UserRole.AGENT) {
      // Agents shouldn't really access this page usually, but if they do, show only their group
      visibleGroups = groups.filter(g => g.id === currentUser.groupId);
  }
  // Note: Admin and Master Trainer see all groups (default)

  // 2. Build Master List of All Agents/Leaders from visible groups
  // Get all users (agents + group leaders) from visible groups
  const visibleGroupIds = visibleGroups.map(g => g.id);
  const uniqueAgents = users.filter(u =>
    visibleGroupIds.includes(u.groupId || '') &&
    (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER)
  );

  // 3. Compute Aggregates - calculate from prospects for all roles
  const agentPerformance = currentUser?.role === UserRole.GROUP_LEADER
    ? groupUsers.map(user => {
        const userId = user.uid || user.id;
        const userProspects = groupProspects.filter(p => p.uid === userId);
        const fyc = userProspects
          .filter(p => p.salesOutcome === 'successful')
          .reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
        const sales = userProspects.filter(p => p.salesOutcome === 'successful').length;
        const group = groups.find(g => g.id === user.groupId);

        return {
          ...user,
          id: userId,
          groupName: user.groupName || group?.name || 'N/A',
          fyc,
          sales
        };
      })
    : uniqueAgents.map(agent => {
        const agentProspects = prospects.filter(p => p.uid === agent.id);
        const fyc = agentProspects
          .filter(p => p.salesOutcome === 'successful')
          .reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
        const sales = agentProspects.filter(p => p.salesOutcome === 'successful').length;
        const group = groups.find(g => g.id === agent.groupId);

        return {
          ...agent,
          groupName: group ? group.name : 'N/A',
          fyc,
          sales
        };
      });

  // 4. Filter
  const filteredAgents = agentPerformance.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.fyc - a.fyc); // Default Sort by FYC

  // --- DRILL DOWN VIEW (Reused logic from Group.tsx for consistency) ---
  if (selectedAgentId) {
    const agent = agentPerformance.find(u => u.id === selectedAgentId);
    if (!agent) return <div>Agent not found</div>;

    // Use appropriate data source based on role
    const prospectsSource = currentUser?.role === UserRole.GROUP_LEADER ? groupProspects : prospects;
    const agentProspects = prospectsSource.filter(p => p.uid === selectedAgentId);
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
             <div className="flex items-center text-sm text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold mr-2">{agent.groupName}</span>
                <span>{agent.role === UserRole.GROUP_LEADER ? 'Group Leader' : 'Agent'}</span>
             </div>
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
                                        <p className="text-sm font-semibold text-gray-900">{getProspectDisplayName(p)}</p>
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
                                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(sale.salesCompletedAt || sale.updatedAt)}</td>
                                <td className="px-6 py-4 font-medium">{getProspectDisplayName(sale)}</td>
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

  // --- MAIN LIST VIEW ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">All Agents</h1>
           <p className="text-sm text-gray-500">View performance and activity for {uniqueAgents.length} agents in your scope.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search agent by name or group..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Master Agent List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Agent Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Group</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Sales</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total FYC (MYR)</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAgents.map((agent) => (
              <tr key={agent.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 font-bold text-xs">
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{agent.name}</div>
                        <div className="text-xs text-gray-500">{agent.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                     {agent.groupName}
                  </span>
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
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center justify-end w-full"
                  >
                    View <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredAgents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                   <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                   <p>No agents found matching your search.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Agents;
