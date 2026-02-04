
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, UserRole } from '../types';
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
const COLORS = ['#23366F', '#3D6DB5', '#00C9B1'];

const Agents: React.FC = () => {
  const { groups, getGroupMembers, getUserById, currentUser } = useAuth();
  const { prospects } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'prospects'>('overview');

  // 1. Determine Visible Groups for current user
  let visibleGroups = groups; // Default to all (Admin)

  if (currentUser?.role === UserRole.TRAINER && currentUser.managedGroupIds) {
      visibleGroups = groups.filter(g => currentUser.managedGroupIds!.includes(g.id));
  } else if (currentUser?.role === UserRole.GROUP_LEADER && currentUser.groupId) {
      visibleGroups = groups.filter(g => g.id === currentUser.groupId);
  } else if (currentUser?.role === UserRole.AGENT) {
      // Agents shouldn't really access this page usually, but if they do, show only their group
      visibleGroups = groups.filter(g => g.id === currentUser.groupId);
  }

  // 2. Build Master List of All Agents/Leaders from visible groups
  const allAgents: User[] = [];
  
  visibleGroups.forEach(g => {
    // Add Leader
    const leader = getUserById(g.leaderId);
    if (leader) allAgents.push(leader);
    
    // Add Members
    const members = getGroupMembers(g.id);
    allAgents.push(...members);
  });

  // Deduplicate agents (in case of weird data states)
  const uniqueAgents = Array.from(new Set(allAgents.map(a => a.id)))
    .map(id => allAgents.find(a => a.id === id)!);

  // 3. Compute Aggregates
  const agentPerformance = uniqueAgents.map(agent => {
    const agentProspects = prospects.filter(p => p.agentId === agent.id);
    const fyc = agentProspects.reduce((sum, p) => sum + (p.policyAmountMYR || 0), 0);
    const sales = agentProspects.filter(p => p.saleStatus === 'SUCCESSFUL').length;
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

    const agentProspects = prospects.filter(p => p.agentId === selectedAgentId);
    const successfulSales = agentProspects.filter(p => p.saleStatus === 'SUCCESSFUL');
    const chartData = [
       { name: 'Prospects', value: agentProspects.length },
       { name: 'Appointments', value: agentProspects.filter(p => p.appointmentStatus === 'Completed').length },
       { name: 'Sales', value: successfulSales.length },
    ];

    const upcomingAppointments = agentProspects
        .filter(p => p.appointmentStatus === 'Not done' && p.appointmentDate && new Date(p.appointmentDate) > new Date())
        .sort((a, b) => new Date(a.appointmentDate!).getTime() - new Date(b.appointmentDate!).getTime())
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
             {['overview', 'sales', 'prospects'].map((tab) => (
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
                                        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                                        <p className="text-xs text-gray-500">{new Date(p.appointmentDate!).toLocaleString()}</p>
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
                                <td className="px-6 py-4 text-sm text-gray-600">{new Date(sale.updatedAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-medium">{sale.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{sale.productType}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold">RM {sale.policyAmountMYR?.toLocaleString()}</td>
                            </tr>
                        ))}
                        {successfulSales.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No successful sales yet.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
        )}

        {activeTab === 'prospects' && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Stage</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Last Contact</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {agentProspects.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                        p.currentStage === 5 ? 'bg-red-100 text-red-700' :
                                        p.currentStage === 4 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {p.currentStage === 5 ? 'Lost' : p.currentStage === 4 ? 'Won' : `Stage ${p.currentStage}`}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.updatedAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
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
                    <div className="flex items-center justify-center">
                       <Target className="w-3 h-3 text-gray-400 mr-1" />
                       <span className="font-bold">{agent.sales}</span>
                    </div>
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
