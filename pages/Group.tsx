
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, ProspectStage, UserRole, Prospect } from '../types';
import { apiCall } from '../services/apiClient';
import { getCache, setCache, buildCacheKey } from '../services/cache';
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
  Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Zurich Palette
const COLORS = ['#23366F', '#3D6DB5', '#00C9B1', '#648FCC'];

const Group: React.FC = () => {
  const { currentUser, getGroupMembers, groups, getUserById, users } = useAuth();
  const { getGroupProspects } = useData();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales'>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  // Trainer/Admin Logic: Allow selecting a group
  const [trainerSelectedGroupId, setTrainerSelectedGroupId] = useState<string | null>(null);

  // Store group prospects fetched from API (for group leaders)
  const [groupProspectsFromAPI, setGroupProspectsFromAPI] = useState<Prospect[]>([]);

  // Store group users fetched from API (for group leaders)
  const [groupUsersFromAPI, setGroupUsersFromAPI] = useState<User[]>([]);

  // User Roles Logic
  const isTrainer = currentUser?.role === UserRole.TRAINER;
  const isMasterTrainer = currentUser?.role === UserRole.MASTER_TRAINER;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isMultiGroupUser = isTrainer || isMasterTrainer || isAdmin;

  // Determine current group ID (needed for useEffect dependency)
  const currentGroupId = isMultiGroupUser ? trainerSelectedGroupId : currentUser?.groupId;

  // Fetch group prospects and users from API for group leaders
  // IMPORTANT: This must be before any early returns to comply with Rules of Hooks
  useEffect(() => {
    const fetchGroupData = async () => {
      if (currentUser?.role === UserRole.GROUP_LEADER && currentGroupId) {
        const userId = currentUser.id;
        const usersCacheKey = buildCacheKey(userId, `group_users_${currentGroupId}`);
        const prospectsCacheKey = buildCacheKey(userId, `group_prospects_${currentGroupId}`);

        const cachedUsers = getCache<any[]>(usersCacheKey, userId);
        const cachedProspects = getCache<any[]>(prospectsCacheKey, userId);

        if (cachedUsers) setGroupUsersFromAPI(cachedUsers);
        if (cachedProspects) setGroupProspectsFromAPI(cachedProspects);
        if (cachedUsers && cachedProspects) return;

        try {
          if (!cachedProspects) {
            const prospectsResponse = await apiCall(`/prospects/group/${currentGroupId}`);
            const raw: any[] = prospectsResponse.prospects || [];
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
            setGroupProspectsFromAPI(normalized);
            setCache(prospectsCacheKey, normalized, userId);
          }

          if (!cachedUsers) {
            const usersResponse = await apiCall(`/users/group/${currentGroupId}`);
            const groupUsers = usersResponse.users || [];
            setGroupUsersFromAPI(groupUsers);
            setCache(usersCacheKey, groupUsers, userId);
          }
        } catch (error) {
          console.error('Failed to fetch group data:', error);
          setGroupProspectsFromAPI([]);
          setGroupUsersFromAPI([]);
        }
      }
    };
    fetchGroupData();
  }, [currentGroupId, currentUser?.role]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
  };

  // Normalize timestamp fields from Firestore format to ISO strings
  const toISO = (ts: any): string | undefined => {
    if (!ts) return undefined;
    if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toISOString();
    return undefined;
  };

  const normalizeProspect = (p: any): Prospect => ({
    ...p,
    id: p.id || p.prospectId,
    prospectName: p.prospectName || '',
    appointmentDate: toISO(p.appointmentDate),
    createdAt: toISO(p.createdAt),
    updatedAt: toISO(p.updatedAt),
    productsSold: (p.productsSold || []).map((prod: any, i: number) => ({
      ...prod,
      id: prod.id || `prod_${i}`,
    })),
  });

  // Helper to handle redacted prospect names for group leaders viewing other agents
  const getProspectDisplayName = (prospect: Prospect) => {
    // Show actual name only if it's the current user's prospect
    if (prospect.uid === currentUser?.id) {
      return prospect.prospectName || 'N/A';
    }
    // For other agents' prospects, show nothing
    return '';
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
              // Calculations for YTD metrics per group in the Trainer Grid
              const now = new Date();
              const currentYear = now.getFullYear();
              const startYTD = new Date(currentYear, 0, 1);
              const endYTD = new Date(currentYear, 11, 31, 23, 59, 59);

              const isWithinDateRange = (dateStr: string | undefined, start: Date, end: Date) => {
                if (!dateStr) return false;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return false;
                return d >= start && d <= end;
              };

              const gAppointmentsYTD = gProspects.filter(p =>
                (p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled') &&
                isWithinDateRange(p.appointmentDate, startYTD, endYTD)
              ).length;

              const gSalesMeetingsYTD = gProspects.filter(p =>
                p.appointmentStatus === 'completed' &&
                isWithinDateRange(p.appointmentCompletedAt || p.appointmentDate, startYTD, endYTD)
              ).length;

              const gSalesYTD = gProspects.filter(p =>
                p.salesOutcome === 'successful' &&
                isWithinDateRange(p.salesCompletedAt || p.updatedAt, startYTD, endYTD)
              );
              
              const gSalesNOC_YTD = gSalesYTD.length;
              const gSalesACE_YTD = gSalesYTD.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);

              // Count ALL registered members in this group regardless of activity
              const gNoOfAgentsYTD = users.filter(u =>
                u.groupId === group.id &&
                (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER)
              ).length;
              const gAcsYTD = gSalesNOC_YTD > 0 ? (gSalesACE_YTD / gSalesNOC_YTD) : 0;

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
                      <span className="text-gray-500">Appointments (YTD)</span>
                      <span className="font-bold text-gray-900">{gAppointmentsYTD}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sales Meetings (YTD)</span>
                      <span className="font-bold text-gray-900">{gSalesMeetingsYTD}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sales (YTD)</span>
                      <div className="text-right">
                          <span className="font-bold text-gray-900 block">{gSalesNOC_YTD} NOC</span>
                          <span className="font-bold text-green-600 text-xs text-right block">RM {gSalesACE_YTD.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">No. of Agents</span>
                      <span className="font-bold text-gray-900">{gNoOfAgentsYTD}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">ACS (YTD)</span>
                      <span className="font-bold text-yellow-600">RM {gAcsYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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

  // --- GROUP DATA PREPARATION ---
  const myGroup = groups.find(g => g.id === currentGroupId);
  // Use API data for group leaders, otherwise use DataContext
  const groupProspects = currentUser?.role === UserRole.GROUP_LEADER
    ? groupProspectsFromAPI
    : getGroupProspects(currentGroupId);
  const groupMembers = getGroupMembers(currentGroupId);

  // --- MTD & YTD Dates ---
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const startYTD = new Date(currentYear, 0, 1);
  const endYTD = new Date(currentYear, 11, 31, 23, 59, 59);

  const startMTD = new Date(currentYear, currentMonth, 1);
  const endMTD = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  // Helper for dates
  const isWithinDateRange = (dateStr: string | undefined, start: Date, end: Date) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d >= start && d <= end;
  };

  // Group Aggregates - only count successful sales (Total overall for the top right corner)
  const totalGroupFYC = groupProspects
    .filter(p => p.salesOutcome === 'successful')
    .reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);

  // --- YTD Calculations ---
  // Appointments Scheduled YTD
  const ytdAppointments_Grp = groupProspects.filter(p =>
    (p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled') &&
    isWithinDateRange(p.appointmentDate, startYTD, endYTD)
  ).length;

  // Sales Meetings Completed YTD
  const ytdSalesMeetings_Grp = groupProspects.filter(p =>
    p.appointmentStatus === 'completed' &&
    isWithinDateRange(p.appointmentCompletedAt || p.appointmentDate, startYTD, endYTD)
  ).length;

  // Sales (Successful) YTD
  const ytdSales_Grp = groupProspects.filter(p =>
    p.salesOutcome === 'successful' &&
    isWithinDateRange(p.salesCompletedAt || p.updatedAt, startYTD, endYTD)
  );
  const totalSalesNOC_YTD_Grp = ytdSales_Grp.length;
  const totalSalesACE_YTD_Grp = ytdSales_Grp.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);


  // ACS YTD
  const acsYTD_Grp = totalSalesNOC_YTD_Grp > 0 ? (totalSalesACE_YTD_Grp / totalSalesNOC_YTD_Grp) : 0;

  // Count all team members (both agents and group leaders)
  // Use API data for group leaders, otherwise use AuthContext users
  const groupUsers = currentUser?.role === UserRole.GROUP_LEADER
    ? groupUsersFromAPI
    : users.filter(u =>
      u.groupId === currentGroupId &&
      (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER)
    );
  const activeMembersCount = groupUsers.length;

  // Get all team members (agents + group leaders) - reuse groupUsers from above
  const allGroupUsers = groupUsers;

  // Build agent list with performance metrics - calculate from prospects for all roles
  const agentList = allGroupUsers.map(member => {
    const memberProspects = groupProspects.filter(p => p.uid === (member.uid || member.id));
    const memberFYC = memberProspects
      .filter(p => p.salesOutcome === 'successful')
      .reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
    const memberSales = memberProspects.filter(p => p.salesOutcome === 'successful').length;
    const memberAppointments = memberProspects.filter(p =>
      p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled'
    ).length;
    const memberSalesMeetings = memberProspects.filter(p => p.appointmentStatus === 'completed').length;
    return {
      ...member,
      id: member.uid || member.id,
      fyc: memberFYC,
      sales: memberSales,
      prospects: memberProspects.length,
      appointments: memberAppointments,
      salesMeetings: memberSalesMeetings,
    };
  })
    .sort((a, b) => b.fyc - a.fyc); // Sort by FYC descending

  const filteredAgentList = agentList.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    // YTD Calculations for the specific agent
    const aAppointmentsYTD = agentProspects.filter(p =>
      (p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled') &&
      isWithinDateRange(p.appointmentDate, startYTD, endYTD)
    ).length;

    const aSalesMeetingsYTD = agentProspects.filter(p =>
      p.appointmentStatus === 'completed' &&
      isWithinDateRange(p.appointmentCompletedAt || p.appointmentDate, startYTD, endYTD)
    ).length;

    const aSalesYTD = agentProspects.filter(p =>
      p.salesOutcome === 'successful' &&
      isWithinDateRange(p.salesCompletedAt || p.updatedAt, startYTD, endYTD)
    );
    const aSalesNOC_YTD = aSalesYTD.length;
    const aSalesACE_YTD = aSalesYTD.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);

    const aAcsYTD = aSalesNOC_YTD > 0 ? (aSalesACE_YTD / aSalesNOC_YTD) : 0;
    
    const aYtdActive = agentProspects.some(p => 
         isWithinDateRange(p.createdAt, startYTD, endYTD) ||
         isWithinDateRange(p.updatedAt, startYTD, endYTD) ||
         isWithinDateRange(p.appointmentDate, startYTD, endYTD) ||
         isWithinDateRange(p.salesCompletedAt, startYTD, endYTD)
    );
    const aNoOfAgentsYTD = aYtdActive ? 1 : 0;

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
        </div>

        {/* Dashboard Widgets for Individual Agent */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mb-3"><Clock className="w-5 h-5" /></div>
             <p className="text-xs font-medium text-gray-500 mb-1">Total Appointments</p>
             <h3 className="text-2xl font-bold text-gray-900">{aAppointmentsYTD}</h3>
             <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3"><Target className="w-5 h-5" /></div>
             <p className="text-xs font-medium text-gray-500 mb-1">Total Sales Meetings</p>
             <h3 className="text-2xl font-bold text-gray-900">{aSalesMeetingsYTD}</h3>
             <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-green-50 text-green-600 rounded-lg mb-3"><DollarSign className="w-5 h-5" /></div>
             <p className="text-xs font-medium text-gray-500 mb-1">Total Sales (NOC & ACE)</p>
             <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-gray-900">{aSalesNOC_YTD}</h3>
                <span className="text-xs text-gray-400">NOC</span>
             </div>
             <p className="text-sm font-bold text-green-600 mt-1">RM {aSalesACE_YTD.toLocaleString()}</p>
             <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-3"><Users className="w-5 h-5" /></div>
             <p className="text-xs font-medium text-gray-500 mb-1">No. of Agents</p>
             <h3 className="text-2xl font-bold text-gray-900">{aNoOfAgentsYTD}</h3>
             <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
             <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg mb-3"><Trophy className="w-5 h-5" /></div>
             <p className="text-xs font-medium text-gray-500 mb-1">ACS (ACE/NOC)</p>
             <h3 className="text-2xl font-bold text-gray-900">RM {aAcsYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
             <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
          </div>
        </div>

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
          <span className="text-xs uppercase font-semibold opacity-80">Total Group ACE</span>
          <p className="text-2xl font-bold">RM {totalGroupFYC.toLocaleString()}</p>
        </div>
      </div>

      {/* Analytics Cards (YTD) */}
      <h3 className="text-lg font-bold text-gray-800 flex items-center mt-6">
         <Target className="w-5 h-5 mr-2 text-gray-500" />
         Performance Metrics (YTD)
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mb-3"><Clock className="w-5 h-5" /></div>
            <p className="text-xs font-medium text-gray-500 mb-1">Total Appointments</p>
            <h3 className="text-2xl font-bold text-gray-900">{ytdAppointments_Grp}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
         </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3"><Target className="w-5 h-5" /></div>
            <p className="text-xs font-medium text-gray-500 mb-1">Total Sales Meetings</p>
            <h3 className="text-2xl font-bold text-gray-900">{ytdSalesMeetings_Grp}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
         </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg mb-3"><DollarSign className="w-5 h-5" /></div>
            <p className="text-xs font-medium text-gray-500 mb-1">Total Sales (NOC & ACE)</p>
            <div className="flex items-baseline gap-2">
               <h3 className="text-2xl font-bold text-gray-900">{totalSalesNOC_YTD_Grp}</h3>
               <span className="text-xs text-gray-400">NOC</span>
            </div>
            <p className="text-sm font-bold text-green-600 mt-1">RM {totalSalesACE_YTD_Grp.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
         </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-3"><Users className="w-5 h-5" /></div>
            <p className="text-xs font-medium text-gray-500 mb-1">No. of Agents</p>
            <h3 className="text-2xl font-bold text-gray-900">{activeMembersCount}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Total in Group</p>
         </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg mb-3"><TrendingUp className="w-5 h-5" /></div>
            <p className="text-xs font-medium text-gray-500 mb-1">ACS (ACE/NOC)</p>
            <h3 className="text-xl font-bold text-yellow-600 mt-1">RM {acsYTD_Grp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
         </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search agent by name..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
          <span className="text-xs text-gray-500 italic">Click "View" to see agent details</span>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Agent Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Prospects</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Appointments</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Sales Meetings</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Sales Closed</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total ACE (MYR)</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAgentList.map((agent) => (
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
