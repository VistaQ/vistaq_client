import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { UserRole, GroupDetailStats } from "../types";
import { apiCall } from "../services/apiClient";
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
  Layers,
  Search,
  BarChart2,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Label,
} from "recharts";

import { CHART_COLORS } from '../constants/tokens';
const COLORS = CHART_COLORS;

const Group: React.FC = () => {
  const { currentUser } = useAuth();
  const { groupStats, refetchGroupStats } = useData();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "sales">("overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Trainer/Admin Logic: Allow selecting a group
  const [trainerSelectedGroupId, setTrainerSelectedGroupId] = useState<string | null>(null);

  // Group detail stats fetched from API
  const [groupDetailStats, setGroupDetailStats] = useState<GroupDetailStats | null>(null);
  const [isLoadingGroupDetail, setIsLoadingGroupDetail] = useState(false);

  // User Roles Logic
  const isTrainer = currentUser?.role === UserRole.TRAINER;
  const isMasterTrainer = currentUser?.role === UserRole.MASTER_TRAINER;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isMultiGroupUser = isTrainer || isMasterTrainer || isAdmin;

  // Determine current group ID (needed for useEffect dependency)
  const currentGroupId = isMultiGroupUser
    ? trainerSelectedGroupId
    : currentUser?.group_id;

  // Fetch group detail stats for the selected/current group
  // IMPORTANT: Must be before any early returns to comply with Rules of Hooks
  useEffect(() => {
    const fetchGroupDetailStats = async () => {
      if (!currentGroupId) return;
      setIsLoadingGroupDetail(true);
      try {
        const res = await apiCall(`/groups/${currentGroupId}/stats`);
        setGroupDetailStats(res.data ?? null);
      } catch (error) {
        console.error("Failed to fetch group detail stats:", error);
        setGroupDetailStats(null);
      } finally {
        setIsLoadingGroupDetail(false);
      }
    };
    fetchGroupDetailStats();
  }, [currentGroupId]);

  // Refresh group stats list when trainer/admin grid is shown
  useEffect(() => {
    if (isMultiGroupUser) {
      refetchGroupStats();
    }
  }, []);

  // TRAINER / ADMIN VIEW: GROUP SELECTION GRID
  if (isMultiGroupUser && !trainerSelectedGroupId) {
    const visibleGroupStats = groupStats;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Group Performance Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              {isAdmin
                ? "System Administrator View: Select a group to audit."
                : "Select a managed group to view detailed performance and analytics."}
            </p>
          </div>
        </div>

        {visibleGroupStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleGroupStats.map((g) => {
              const gAcsYTD =
                g.ytd_sales_noc > 0 ? g.ytd_sales_ace / g.ytd_sales_noc : 0;

              return (
                <button
                  key={g.group_id}
                  onClick={() => setTrainerSelectedGroupId(g.group_id)}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all text-left group flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {g.group_name}
                    </h3>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 ml-2">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Prospects (YTD)</span>
                      <span className="font-bold text-gray-900">{g.ytd_prospects}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Appointments (YTD)</span>
                      <span className="font-bold text-gray-900">{g.ytd_appointments_set}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sales Meetings (YTD)</span>
                      <span className="font-bold text-gray-900">{g.ytd_sales_meetings}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sales (YTD)</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 block">{g.ytd_sales_noc} NOC</span>
                        <span className="font-bold text-green-600 text-xs text-right block">RM {g.ytd_sales_ace.toLocaleString()} ACE</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">No. of Agents</span>
                      <span className="font-bold text-gray-900">{g.ytd_agents_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">ACS (YTD)</span>
                      <span className="font-bold text-yellow-600">
                        RM{" "}
                        {gAcsYTD.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
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

  if (!currentGroupId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Users className="w-16 h-16 mb-4 opacity-20" />
        <p>You are not assigned to any group.</p>
      </div>
    );
  }

  // --- GROUP DATA FROM API ---
  const ytd = groupDetailStats?.ytd;
  const groupName = groupDetailStats?.group_name ?? 'My Group';
  const now = new Date();

  // ACS derived
  const acsYTD_Grp = (ytd?.sales_noc ?? 0) > 0
    ? (ytd?.sales_ace ?? 0) / (ytd?.sales_noc ?? 1)
    : 0;

  // Agent list mapped from API response, sorted by ACE desc
  const agentList = (groupDetailStats?.agents ?? [])
    .map((a) => ({
      id: a.agent_id,
      name: a.agent_name,
      prospects: a.ytd_prospects,
      appointments: a.ytd_appointments_set,
      salesMeetings: a.ytd_sales_meetings,
      sales: a.ytd_sales_noc,
      fyc: a.ytd_sales_ace,
      mtd_prospects: a.mtd_prospects,
      mtd_appointments_set: a.mtd_appointments_set,
      mtd_sales_meetings: a.mtd_sales_meetings,
      mtd_sales_noc: a.mtd_sales_noc,
      mtd_sales_ace: a.mtd_sales_ace,
    }))
    .sort((a, b) => b.fyc - a.fyc);

  const filteredAgentList = agentList.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // --- AGENT DETAIL VIEW RENDERER ---
  if (selectedAgentId) {
    const agent = agentList.find((u) => u.id === selectedAgentId);
    if (!agent) return <div>Agent not found</div>;

    const aAcsYTD = agent.sales > 0 ? agent.fyc / agent.sales : 0;

    const chartData = [
      { name: 'Prospects',        value: agent.mtd_prospects,        barType: 'count' },
      { name: 'Appointments Set', value: agent.mtd_appointments_set, barType: 'count' },
      { name: 'Sales Meetings',   value: agent.mtd_sales_meetings,   barType: 'count' },
      { name: 'Sales',            value: agent.mtd_sales_noc,        barType: 'sales', ace: agent.mtd_sales_ace },
    ];

    const AgentCustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
            <p className="font-bold text-gray-900 mb-1">{label}</p>
            {data.barType === 'sales' ? (
              <>
                <p className="text-blue-600 text-sm font-medium">NOC {data.value}</p>
                <p className="text-green-600 text-sm font-medium">ACE RM {data.ace.toLocaleString()}</p>
              </>
            ) : (
              <p className="text-blue-600 text-sm font-medium">{data.value}</p>
            )}
          </div>
        );
      }
      return null;
    };

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
            <p className="text-sm text-gray-500">
              Individual Performance Dashboard
            </p>
          </div>
        </div>

        {/* Dashboard Widgets for Individual Agent */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-3"><Users className="w-5 h-5" /></div>
             <p className="text-sm font-medium text-gray-500 mb-1">Total Prospects (YTD)</p>
             <h3 className="text-3xl font-bold text-gray-900">{agent.prospects}</h3>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mb-3"><Calendar className="w-5 h-5" /></div>
             <p className="text-sm font-medium text-gray-500 mb-1">Total Appointments (YTD)</p>
             <h3 className="text-3xl font-bold text-gray-900">{agent.appointments}</h3>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3"><Target className="w-5 h-5" /></div>
             <p className="text-sm font-medium text-gray-500 mb-1">Sales Meetings (YTD)</p>
             <h3 className="text-3xl font-bold text-gray-900">{agent.salesMeetings}</h3>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-green-50 text-green-600 rounded-lg mb-3"><DollarSign className="w-5 h-5" /></div>
             <p className="text-sm font-medium text-gray-500 mb-1">Total Sales (YTD)</p>
             <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-gray-900">{agent.sales}</h3>
                <span className="text-xs text-gray-400">NOC</span>
             </div>
             <div className="flex items-baseline gap-1 mt-1">
                <p className="text-2xl font-bold text-green-600">RM {agent.fyc.toLocaleString()}</p>
                <span className="text-xs text-gray-400">ACE</span>
             </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg mb-3"><BarChart2 className="w-5 h-5" /></div>
             <p className="text-sm font-medium text-gray-500 mb-1">ACS (ACE/NOC) (YTD)</p>
             <h3 className="text-3xl font-bold text-yellow-600 mt-1">RM {aAcsYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Month-To-Date Pipeline</h3>
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">{now.toLocaleString('default', { month: 'long', year: 'numeric' })} MTD</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tickFormatter={(v) => v.toLocaleString()}>
                  <Label value="No. / RM'000" angle={-90} position="insideLeft" offset={-5} style={{ fontSize: '10px', fill: '#6B7280' }} />
                </YAxis>
                <Tooltip content={<AgentCustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
            {groupName}
          </h1>
          <p className="text-sm text-gray-500">
            Team Performance & Sales Overview
          </p>
        </div>
      </div>

      {/* Analytics Cards (YTD) */}
      <h3 className="text-lg font-bold text-gray-800 flex items-center mt-6">
        <Target className="w-5 h-5 mr-2 text-gray-500" />
        Performance Metrics (YTD)
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-3"><Users className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Prospects (YTD)</p>
            <h3 className="text-3xl font-bold text-gray-900">{ytd?.prospects ?? 0}</h3>
         </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mb-3"><Calendar className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Appointments (YTD)</p>
            <h3 className="text-3xl font-bold text-gray-900">{ytd?.appointments_set ?? 0}</h3>
         </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3"><Target className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-gray-500 mb-1">Sales Meetings (YTD)</p>
            <h3 className="text-3xl font-bold text-gray-900">{ytd?.sales_meetings ?? 0}</h3>
         </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg mb-3"><DollarSign className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Sales (YTD)</p>
            <div className="flex items-baseline gap-2">
               <h3 className="text-3xl font-bold text-gray-900">{ytd?.sales_noc ?? 0}</h3>
               <span className="text-xs text-gray-400">NOC</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
               <p className="text-2xl font-bold text-green-600">RM {(ytd?.sales_ace ?? 0).toLocaleString()}</p>
               <span className="text-xs text-gray-400">ACE</span>
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg mb-3"><Users className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-gray-500 mb-1">No. of Agents</p>
            <h3 className="text-3xl font-bold text-gray-900">{ytd?.agents_count ?? 0}</h3>
            <p className="text-xs text-gray-400 mt-1">Total in Group</p>
         </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg mb-3"><BarChart2 className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-gray-500 mb-1">ACS (ACE/NOC)</p>
            <h3 className="text-3xl font-bold text-yellow-600 mt-1">RM {acsYTD_Grp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
         </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search agent by name..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
            Agent Activities &amp; Sales Results
          </h3>
          <span className="text-xs text-gray-500 italic">
            Click "View" to see agent details
          </span>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Agent Name
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                Prospects
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                Appointments
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                Sales Meetings
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                Sales Closed
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                Total ACE (MYR)
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAgentList.map((agent) => (
              <tr
                key={agent.id}
                className={`hover:bg-blue-50 transition-colors ${agent.id === currentUser?.id ? "bg-blue-50/50" : ""}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mr-3">
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <p
                        className={`font-semibold ${agent.id === currentUser?.id ? "text-blue-700" : "text-gray-900"}`}
                      >
                        {agent.name} {agent.id === currentUser?.id && "(You)"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-700">
                    {agent.prospects}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
                    {agent.appointments}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                    {agent.salesMeetings}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
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
