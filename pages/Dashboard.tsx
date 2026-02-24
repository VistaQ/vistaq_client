
import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Prospect, ProspectStage } from '../types';
import { 
  Calendar, 
  Target, 
  Trophy, 
  Clock,
  Briefcase,
  Users,
  TrendingUp,
  BarChart2,
  PieChart,
  Layers,
  GraduationCap, 
  Crown,
  CalendarDays,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MDRT_TARGET_FYC = 100000;
const MDRT_TARGET_PROSPECTS = 100;

// Zurich Palette for Charts
const COLORS = ['#23366F', '#3D6DB5', '#00C9B1', '#648FCC']; 

const Dashboard: React.FC = () => {
  const { currentUser, groups, users } = useAuth();
  const { prospects, getProspectsByScope, getGroupProspects, getEventsForUser } = useData();

  // --- MANAGEMENT DASHBOARD (Admin, Master Trainer & Trainer ONLY) ---
  // Group Leaders now see Personal Dashboard by default, and access Group stats via "Group" page.
  const isManagementRole = currentUser?.role === UserRole.TRAINER ||
                           currentUser?.role === UserRole.MASTER_TRAINER ||
                           currentUser?.role === UserRole.ADMIN;

  if (isManagementRole) {
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isTrainer = currentUser?.role === UserRole.TRAINER;
    
    // Use the robust scope filter from DataContext which now handles Leaders correctly
    const scopeProspects = getProspectsByScope(currentUser!);

    // --- 1. IDENTIFY RELEVANT GROUPS ---
    let relevantGroups = groups;
    if (isTrainer && currentUser?.managedGroupIds?.length) {
        relevantGroups = groups.filter(g => currentUser.managedGroupIds?.includes(g.id));
    }
    
    const totalGroups = relevantGroups.length;
    
    // --- 2. IDENTIFY RELEVANT AGENTS (For Count) ---
    // If Admin: All Agents/Leaders
    // If Trainer: Filter by relevant groups
    const relevantAgents = isAdmin 
        ? users.filter(u => u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER)
        : users.filter(u => (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER) && relevantGroups.some(g => g.id === u.groupId));

    const totalAgents = relevantAgents.length;
    
    // --- 3. PERFORMANCE METRICS (AGGREGATE) ---
    const totalFYC = scopeProspects.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
    const totalSales = scopeProspects.filter(p => p.salesOutcome === 'successful').length;
    const totalClosed = scopeProspects.filter(p => p.salesOutcome === 'successful' || p.salesOutcome === 'unsuccessful').length;
    const conversionRate = totalClosed > 0 ? (totalSales / totalClosed) * 100 : 0;
    
    // --- 4. GROUP RANKINGS (Only relevant if > 1 group) ---
    const groupRankings = relevantGroups.map(group => {
       const gProspects = getGroupProspects(group.id);
       const gFYC = gProspects.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
       const gSales = gProspects.filter(p => p.salesOutcome === 'successful').length;
       return { id: group.id, name: group.name, fyc: gFYC, sales: gSales };
    }).sort((a, b) => b.fyc - a.fyc);

    // --- 5. CHART DATA ---
    const totalAppointmentsSet = scopeProspects.filter(p =>
        p.appointmentStatus === 'scheduled' ||
        p.appointmentStatus === 'rescheduled'
    ).length;

    const totalSalesMeetings = scopeProspects.filter(p => p.appointmentStatus === 'completed').length;

    const funnelData = [
       { name: 'Prospects', value: scopeProspects.length },
       { name: 'Appointments', value: totalAppointmentsSet },
       { name: 'Sales Meeting', value: totalSalesMeetings },
       { name: 'Sales', value: totalSales },
    ];

    return (
       <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                  {isAdmin ? 'System Admin Dashboard' : 'Trainer Overview'}
              </h1>
              <p className="text-sm text-gray-500">
                  {isAdmin 
                    ? 'System-wide statistics and performance monitoring.' 
                    : `High-level analytics for ${relevantGroups.length} managed group(s).`}
              </p>
            </div>
          </div>

          {/* ADMIN & TRAINER: System Stats Row */}
          {(isAdmin || isTrainer) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                       <p className="text-sm font-medium text-gray-500">Total Groups</p>
                       <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalGroups}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Layers className="w-6 h-6"/></div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                       <p className="text-sm font-medium text-gray-500">Trainers</p>
                       <h3 className="text-3xl font-bold text-gray-900 mt-1">{users.filter(u => u.role === UserRole.TRAINER).length}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><GraduationCap className="w-6 h-6"/></div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                       <p className="text-sm font-medium text-gray-500">Sales Force</p>
                       <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalAgents}</h3>
                       <p className="text-xs text-gray-400">Agents & Leaders</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-6 h-6"/></div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between bg-gradient-to-br from-white to-green-50">
                    <div>
                       <p className="text-sm font-medium text-gray-500">Total Revenue (ACE)</p>
                       <h3 className="text-2xl font-bold text-green-700 mt-1">RM {totalFYC.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-green-100 text-green-700 rounded-lg"><TrendingUp className="w-6 h-6"/></div>
                 </div>
              </div>
          )}

          {/* Performance Metrics Row */}
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <BarChart2 className="w-5 h-5 mr-2 text-gray-500" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-sm text-gray-500">Conversion Rate</p>
                      <h3 className="text-2xl font-bold text-gray-900">{Math.round(conversionRate)}%</h3>
                   </div>
                   <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><PieChart className="w-5 h-5"/></div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                   <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${conversionRate}%` }}></div>
                </div>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-sm text-gray-500">Total Sales</p>
                      <h3 className="text-2xl font-bold text-gray-900">{totalSales}</h3>
                   </div>
                   <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Target className="w-5 h-5"/></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Successful Closings</p>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-sm text-gray-500">Total Prospects</p>
                      <h3 className="text-2xl font-bold text-gray-900">{scopeProspects.length}</h3>
                   </div>
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-5 h-5"/></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Total Pipeline Volume</p>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-5">
                    <Trophy className="w-24 h-24" />
                </div>
                <div className="flex justify-between items-start relative z-10">
                   <div>
                      <p className="text-sm text-gray-500">{totalGroups > 1 ? 'Top Group KPI' : 'Total Revenue'}</p>
                      {totalGroups > 1 ? (
                          <>
                            <h3 className="text-lg font-bold text-gray-900 truncate">{groupRankings[0]?.name || 'N/A'}</h3>
                            <p className="text-sm font-mono text-green-600 font-bold">RM {groupRankings[0]?.fyc.toLocaleString() || '0'}</p>
                          </>
                      ) : (
                          <>
                            <h3 className="text-lg font-bold text-gray-900 truncate">ACE Generated</h3>
                            <p className="text-sm font-mono text-green-600 font-bold">RM {totalFYC.toLocaleString() || '0'}</p>
                          </>
                      )}
                   </div>
                   <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Crown className="w-5 h-5"/></div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Company Funnel */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                   <BarChart2 className="w-5 h-5 mr-2 text-blue-600" />
                   Sales Funnel Aggregate
                </h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} layout="vertical">
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                         <Tooltip />
                         <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                            {funnelData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Group Overview */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                   <Users className="w-5 h-5 mr-2 text-blue-600" />
                   Group Overview
                </h3>
                <div className="overflow-y-auto max-h-64">
                   {totalGroups > 0 ? (
                       <table className="w-full">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                             <tr>
                                <th className="px-4 py-2 text-left">Group</th>
                                <th className="px-4 py-2 text-right">Sales Count</th>
                                <th className="px-4 py-2 text-right">Total ACE</th>
                             </tr>
                          </thead>
                          <tbody>
                             {groupRankings.map((g, idx) => (
                                <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                   <td className="px-4 py-3 text-sm font-medium text-gray-900">{g.name}</td>
                                   <td className="px-4 py-3 text-sm text-right font-medium text-gray-600">{g.sales}</td>
                                   <td className="px-4 py-3 text-sm font-mono text-right text-green-700">RM {g.fyc.toLocaleString()}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                   ) : (
                       <div className="p-8 text-center text-gray-500">
                           <p>No groups assigned to this trainer.</p>
                       </div>
                   )}
                </div>
             </div>
          </div>
       </div>
    );
  }

  // --- AGENT & GROUP LEADER PERSONAL DASHBOARD ---

  // --- STRICTLY PERSONAL DATA ---
  const myProspects = prospects.filter(p => p.uid === currentUser?.id);
  const myEvents = currentUser ? getEventsForUser(currentUser) : [];

  // KPI Calculations
  const totalProspects = myProspects.length;
  
  // "Appointments" = Scheduled or Rescheduled only
  const appointmentsSet = myProspects.filter(p =>
      p.appointmentStatus === 'scheduled' ||
      p.appointmentStatus === 'rescheduled'
  ).length;

  const completedAppointments = myProspects.filter(p => p.appointmentStatus === 'completed').length;
  const closedSales = myProspects.filter(p => p.salesOutcome === 'successful').length;
  const totalPersonalFYC = myProspects.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
  
  // MDRT Progress
  const fycProgress = Math.min(100, (totalPersonalFYC / MDRT_TARGET_FYC) * 100);
  const prospectsProgress = Math.min(100, (totalProspects / MDRT_TARGET_PROSPECTS) * 100);
  
  // --- UPCOMING SCHEDULE LOGIC (Combined Events & Meetings) ---
  const now = new Date();
  const next7Days = new Date();
  next7Days.setDate(now.getDate() + 7);

  // 1. Process Appointments
  const upcomingAppointments = myProspects
    .filter(p => {
        if (!p.appointmentDate) return false;
        const apptDate = new Date(p.appointmentDate);
        if (isNaN(apptDate.getTime())) return false; // Safety check
        const isFuture = apptDate >= now && apptDate <= next7Days;
        const isActive = p.appointmentStatus === 'not_done' || (p.currentStage === ProspectStage.APPOINTMENT && p.appointmentStatus !== 'completed');
        return isFuture && isActive;
    })
    .map(p => ({
        id: p.id,
        title: `Mtg: ${p.prospectName}`,
        date: p.appointmentDate!,
        type: 'meeting',
        meta: p.prospectName,
        link: undefined
    }));

  // 2. Process Events
  const upcomingEvents = myEvents
    .filter(e => {
        const evtDate = new Date(e.date);
        if (isNaN(evtDate.getTime())) return false; // Safety check
        return evtDate >= now && evtDate <= next7Days;
    })
    .map(e => ({
        id: e.id,
        title: e.eventTitle,
        date: e.date,
        type: 'event',
        meta: e.venue,
        link: e.meetingLink
    }));

  // 3. Combine & Sort
  const combinedSchedule = [...upcomingAppointments, ...upcomingEvents]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Chart Data (Personal Funnel)
  const chartData = [
    { name: 'Prospects', value: totalProspects },
    { name: 'Appointments', value: appointmentsSet },
    { name: 'Sales Meeting', value: completedAppointments },
    { name: 'Sales', value: closedSales },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {currentUser?.name}. Here is your individual performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Personal Sales Funnel</h3>
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

        {/* Upcoming Meetings & Events */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
           <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center">
                 <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                 Upcoming Events & Meetings
              </h3>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Next 7 Days</span>
           </div>
           <div className="flex-1 overflow-y-auto space-y-3">
             {combinedSchedule.length > 0 ? (
                combinedSchedule.map(item => (
                   <div key={item.id} className={`flex flex-col p-3 rounded-lg border ${
                       item.type === 'event' ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100'
                   }`}>
                      <div className="flex items-start">
                          <div className="mt-1 mr-3">
                             {item.type === 'event' 
                                ? <CalendarDays className="w-4 h-4 text-indigo-500" />
                                : <Clock className="w-4 h-4 text-gray-400" />
                             }
                          </div>
                          <div className="flex-1">
                             <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</p>
                             <p className="text-xs text-gray-500 mb-1">
                               {(() => {
                                   try {
                                       return new Date(item.date).toLocaleString([], {weekday:'short', hour:'2-digit', minute:'2-digit'});
                                   } catch (e) {
                                       return 'Invalid Date';
                                   }
                               })()}
                             </p>
                             {item.type === 'event' && (
                                 <div className="flex items-center text-[10px] text-indigo-600">
                                     <MapPin className="w-3 h-3 mr-1" />
                                     {item.meta || 'Venue TBD'}
                                 </div>
                             )}
                             {item.type === 'meeting' && (
                                 <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded uppercase tracking-wider">
                                    Client Meeting
                                 </span>
                             )}
                          </div>
                      </div>
                      
                      {/* JOIN BUTTON FOR EVENTS */}
                      {item.type === 'event' && item.link && (
                          <div className="mt-2 ml-7">
                              <a 
                                href={item.link} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors"
                              >
                                  <ExternalLink className="w-3 h-3 mr-1" /> Join Here
                              </a>
                          </div>
                      )}
                   </div>
                ))
             ) : (
               <div className="text-center py-8 text-gray-400 text-sm">
                 <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                 No meetings or events in the next 7 days.
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
