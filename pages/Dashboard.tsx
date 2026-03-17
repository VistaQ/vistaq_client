import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Prospect, ProspectStage, CoachingSession } from '../types';
import {
   Calendar,
   Target,
   Trophy,
   Clock,
   Briefcase,
   Users,
   BarChart2,
   PieChart,
   Layers,
   GraduationCap,
   Crown,
   CalendarDays,
   MapPin,
   ExternalLink,
   DollarSign,
   TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, Label } from 'recharts';

const MDRT_TARGET_FYC = 100000;
const MDRT_TARGET_PROSPECTS = 100;

// Zurich Palette for Charts
const COLORS = ['#23366F', '#3D6DB5', '#00C9B1', '#648FCC', '#10B981'];

// ---------------------------------------------------------------------------

interface DashboardProps {
   onNavigate?: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
   const { currentUser, groups, users } = useAuth();
   const { prospects, getProspectsByScope, getGroupProspects, getEventsForUser, getCoachingSessionsForUser, refetchEvents, refetchCoachingSessions } = useData();

   // Fetch events and coaching sessions on mount (deferred fetch — not loaded on app start)
   useEffect(() => {
      refetchEvents();
      refetchCoachingSessions();
   }, []);

   // --- MANAGEMENT DASHBOARD (Admin, Master Trainer & Trainer ONLY) ---
   // Group Leaders now see Personal Dashboard by default, and access Group stats via "Group" page.
   const isManagementRole = currentUser?.role === UserRole.TRAINER ||
      currentUser?.role === UserRole.MASTER_TRAINER ||
      currentUser?.role === UserRole.ADMIN;

   if (isManagementRole) {
      const isAdmin = currentUser?.role === UserRole.ADMIN;
      const isTrainer = currentUser?.role === UserRole.TRAINER;
      const isMasterTrainer = currentUser?.role === UserRole.MASTER_TRAINER;

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
      const successfulScopeProspects = scopeProspects.filter(p => p.salesOutcome === 'successful');
      const totalFYC = successfulScopeProspects.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
      const totalSales = scopeProspects.filter(p => p.salesOutcome === 'successful').length;
      const totalClosed = scopeProspects.filter(p => p.salesOutcome === 'successful' || p.salesOutcome === 'unsuccessful').length;
      const conversionRate = totalClosed > 0 ? (totalSales / totalClosed) * 100 : 0;

      // --- MTD Calculations for Management ---
      const now = new Date();
      const currentYear = now.getFullYear();

      // YTD Dates
      const startYTD = new Date(currentYear, 0, 1);
      const endYTD = new Date(currentYear, 11, 31, 23, 59, 59);

      // Helper for date ranges
      const isWithinDateRange = (dateStr: string | undefined, start: Date, end: Date) => {
         if (!dateStr) return false;
         const d = new Date(dateStr);
         if (isNaN(d.getTime())) return false;
         return d >= start && d <= end;
      };

      // --- 4. GROUP RANKINGS (YTD, to match Group Performance Dashboard) ---
      const groupRankings = relevantGroups.map(group => {
         const gProspects = getGroupProspects(group.id);
         const gSalesYTD = gProspects.filter(p =>
            p.salesOutcome === 'successful' &&
            isWithinDateRange(p.salesCompletedAt || p.updatedAt, startYTD, endYTD)
         );
         const gFYC = gSalesYTD.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);
         const gSales = gSalesYTD.length;
         return { id: group.id, name: group.name, fyc: gFYC, sales: gSales };
      }).sort((a, b) => b.fyc - a.fyc);

      // YTD Metrics Filtered
      const ytdAppointments_Mgmt = scopeProspects.filter(p =>
         (p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled') &&
         isWithinDateRange(p.appointmentDate, startYTD, endYTD)
      ).length;

      const ytdSalesMeetings_Mgmt = scopeProspects.filter(p =>
         p.appointmentStatus === 'completed' &&
         isWithinDateRange(p.appointmentCompletedAt || p.appointmentDate, startYTD, endYTD)
      ).length;

      const ytdSales_Mgmt = scopeProspects.filter(p =>
         p.salesOutcome === 'successful' &&
         isWithinDateRange(p.salesCompletedAt || p.updatedAt, startYTD, endYTD)
      );

      const totalSalesNOC_YTD_Mgmt = ytdSales_Mgmt.length;
      const totalSalesACE_YTD_Mgmt = ytdSales_Mgmt.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);

      // Total agents in scope — counts ALL registered members regardless of activity
      const noOfAgentsYTD = relevantAgents.length;

      const acsYTD_Mgmt = totalSalesNOC_YTD_Mgmt > 0 ? (totalSalesACE_YTD_Mgmt / totalSalesNOC_YTD_Mgmt) : 0;

      // --- 5. MTD CHART DATA ---
      const currentMonth_Mgmt = now.getMonth();
      const startMTD_Mgmt = new Date(currentYear, currentMonth_Mgmt, 1);
      const endMTD_Mgmt = new Date(currentYear, currentMonth_Mgmt + 1, 0, 23, 59, 59);

      const mtdProspects_Mgmt = scopeProspects.filter(p =>
         isWithinDateRange(p.createdAt, startMTD_Mgmt, endMTD_Mgmt)
      ).length;
      const mtdAppointments_Mgmt = scopeProspects.filter(p =>
         (p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled') &&
         isWithinDateRange(p.appointmentDate, startMTD_Mgmt, endMTD_Mgmt)
      ).length;
      const mtdSalesMeetings_Mgmt = scopeProspects.filter(p =>
         p.appointmentStatus === 'completed' &&
         isWithinDateRange(p.appointmentCompletedAt || p.appointmentDate, startMTD_Mgmt, endMTD_Mgmt)
      ).length;
      const mtdSalesArr_Mgmt = scopeProspects.filter(p =>
         p.salesOutcome === 'successful' &&
         isWithinDateRange(p.salesCompletedAt || p.updatedAt, startMTD_Mgmt, endMTD_Mgmt)
      );
      const mtdSalesNOC_Mgmt = mtdSalesArr_Mgmt.length;
      const mtdSalesACE_Mgmt = mtdSalesArr_Mgmt.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);

      const mgmtChartDataMTD = [
         { name: 'Prospects',       value: mtdProspects_Mgmt,     barType: 'count' },
         { name: 'Appointments Set', value: mtdAppointments_Mgmt,  barType: 'count' },
         { name: 'Sales Meetings',   value: mtdSalesMeetings_Mgmt, barType: 'count' },
         { name: 'Sales',           value: mtdSalesNOC_Mgmt,      barType: 'sales', ace: mtdSalesACE_Mgmt },
      ];

      const MgmtCustomTooltip = ({ active, payload, label }: any) => {
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

      // --- Upcoming Schedule for Management ---
      const mgmtNow = new Date();
      const sevenDaysFromNow = new Date(mgmtNow.getTime() + 7 * 24 * 60 * 60 * 1000);
      const mgmtEvents = currentUser ? getEventsForUser(currentUser) : [];
      const mgmtSessions = currentUser ? getCoachingSessionsForUser(currentUser) : [];

      type ScheduleItem = { id: string; title: string; date: string; type: 'event' | 'coaching'; meta?: string; link?: string; isOwned: boolean; };

      const mgmtScheduleItems: ScheduleItem[] = [
         ...mgmtEvents
            .filter(e => e.status !== 'cancelled')
            .map(e => ({
               id: `evt_${e.id}`, title: e.eventTitle, date: e.date,
               type: 'event' as const, meta: e.venue, link: e.meetingLink || undefined,
               isOwned: e.createdBy === currentUser?.id
            })),
         ...mgmtSessions
            .filter(s => s.status !== 'cancelled')
            .map(s => {
               let sessionDate = s.date;
               try {
                  const b = new Date(s.date);
                  if (s.durationStart) { const [h, m] = s.durationStart.split(':').map(Number); b.setHours(h, m, 0, 0); sessionDate = b.toISOString(); }
               } catch { }
               return {
                  id: `cs_${s.id}`, title: s.title, date: sessionDate, type: 'coaching' as const,
                  meta: `${s.durationStart || ''} – ${s.durationEnd || ''} · ${s.venue}`,
                  link: s.link || undefined,
                  isOwned: s.createdBy === currentUser?.id
               };
            })
      ]
         .filter(i => { const d = new Date(i.date); return !isNaN(d.getTime()) && d >= mgmtNow && d <= sevenDaysFromNow; })
         .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
         .slice(0, 5);

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
                        : isMasterTrainer
                           ? `High-level analytics for ${relevantGroups.length} managed group(s).`
                           : ''}
                  </p>
               </div>
            </div>

            {/* ADMIN & MASTER TRAINER: System Stats Row */}
            {(isAdmin || isMasterTrainer) && (
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                     <div>
                        <p className="text-sm font-medium text-gray-500">Total Groups</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalGroups}</h3>
                     </div>
                     <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Layers className="w-6 h-6" /></div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                     <div>
                        <p className="text-sm font-medium text-gray-500">Trainers</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">{users.filter(u => u.role === UserRole.TRAINER).length}</h3>
                     </div>
                     <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><GraduationCap className="w-6 h-6" /></div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                     <div>
                        <p className="text-sm font-medium text-gray-500">Sales Force</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalAgents}</h3>
                        <p className="text-xs text-gray-400">Agents & Leaders</p>
                     </div>
                     <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-6 h-6" /></div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
                     <div className="absolute right-0 top-0 p-4 opacity-5">
                        <Trophy className="w-24 h-24" />
                     </div>
                     <div className="z-10 w-full">
                        <p className="text-sm font-medium text-gray-500">{totalGroups > 1 ? 'Top Group KPI' : 'Total Revenue'}</p>
                        {totalGroups > 1 ? (
                           <div className="mt-1 flex justify-between items-end w-full">
                              <div>
                                 <h3 className="text-xl font-bold text-gray-900 truncate">{groupRankings[0]?.name || 'N/A'}</h3>
                                 <p className="text-sm font-mono text-green-600 font-bold">RM {groupRankings[0]?.fyc.toLocaleString() || '0'}</p>
                              </div>
                              <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Crown className="w-5 h-5" /></div>
                           </div>
                        ) : (
                           <div className="mt-1 flex justify-between items-end w-full">
                              <div>
                                 <h3 className="text-xl font-bold text-gray-900 truncate">ACE Generated</h3>
                                 <p className="text-sm font-mono text-green-600 font-bold">RM {totalFYC.toLocaleString() || '0'}</p>
                              </div>
                              <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Crown className="w-5 h-5" /></div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* Performance Metrics Row (YTD) */}
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
               <BarChart2 className="w-5 h-5 mr-2 text-gray-500" />
               Performance Metrics (YTD)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mb-3"><Calendar className="w-5 h-5" /></div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Appointments</p>
                  <h3 className="text-2xl font-bold text-gray-900">{ytdAppointments_Mgmt}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
               </div>

               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3"><Target className="w-5 h-5" /></div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Sales Meetings</p>
                  <h3 className="text-2xl font-bold text-gray-900">{ytdSalesMeetings_Mgmt}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
               </div>

               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg mb-3"><DollarSign className="w-5 h-5" /></div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Sales (NOC & ACE)</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-2xl font-bold text-gray-900">{totalSalesNOC_YTD_Mgmt}</h3>
                     <span className="text-xs text-gray-400">NOC</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                     <p className="text-xl font-bold text-green-600">RM {totalSalesACE_YTD_Mgmt.toLocaleString()}</p>
                     <span className="text-xs text-gray-400">ACE</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
               </div>

               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-3"><Users className="w-5 h-5" /></div>
                  <p className="text-xs font-medium text-gray-500 mb-1">No. of Agents</p>
                  <h3 className="text-2xl font-bold text-gray-900">{noOfAgentsYTD}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Total in Scope</p>
               </div>

               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
                  <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg mb-3"><BarChart2 className="w-5 h-5" /></div>
                  <p className="text-xs font-medium text-gray-500 mb-1">ACS (ACE/NOC)</p>
                  <h3 className="text-xl font-bold text-yellow-600 mt-1">RM {acsYTD_Mgmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Year to Date</p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* MTD Pipeline */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-gray-800">Month-To-Date Pipeline</h3>
                     <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">{now.toLocaleString('default', { month: 'long', year: 'numeric' })} MTD</span>
                  </div>
                  <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mgmtChartDataMTD} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} />
                           <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                           <YAxis allowDecimals={false} tickFormatter={(v) => v.toLocaleString()}>
                              <Label value="No. / RM'000" angle={-90} position="insideLeft" offset={-5} style={{ fontSize: '10px', fill: '#6B7280' }} />
                           </YAxis>
                           <Tooltip content={<MgmtCustomTooltip />} />
                           <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {mgmtChartDataMTD.map((entry, index) => (
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
            {/* Upcoming Schedule Widget - Management */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center">
                     <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                     Upcoming Schedule
                  </h3>
                  <div className="flex items-center gap-2">

                     {onNavigate && (
                        <button onClick={() => onNavigate('events')} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                           View Calendar <ExternalLink className="w-3 h-3" />
                        </button>
                     )}
                  </div>
               </div>
               <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {mgmtScheduleItems.length > 0 ? mgmtScheduleItems.map(item => (
                     <div
                        key={item.id}
                        className={`flex flex-col p-3 rounded-lg border transition-colors ${item.type === 'event' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-green-50/50 border-green-100'
                           } ${item.isOwned && onNavigate ? 'cursor-pointer hover:brightness-95' : ''}`}
                        onClick={item.isOwned && onNavigate ? () => onNavigate(item.type === 'coaching' ? 'coaching' : 'events') : undefined}
                     >
                        <div className="flex items-start">
                           <div className="mt-1 mr-3">
                              {item.type === 'event' ? <CalendarDays className="w-4 h-4 text-indigo-500" /> : <GraduationCap className="w-4 h-4 text-green-500" />}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                 <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</p>
                                 {item.isOwned && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded flex-shrink-0">MINE</span>}
                              </div>
                              <p className="text-xs text-gray-500">
                                 {(() => { try { return new Date(item.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })()}
                              </p>
                              {item.meta && (
                                 <div className="flex items-center text-[10px] mt-1 font-medium" style={{ color: item.type === 'event' ? '#4f46e5' : '#16a34a' }}>
                                    <MapPin className="w-3 h-3 mr-1" />{item.meta}
                                 </div>
                              )}
                           </div>
                        </div>
                        {item.link ? (
                           <div className="mt-2 ml-7">
                              <a href={item.link} target="_blank" rel="noreferrer"
                                 className={`inline-flex items-center text-xs font-bold text-white px-3 py-1.5 rounded transition-colors ${
                                    item.type === 'coaching' && item.meta?.includes('Online') ? 'bg-green-600 hover:bg-green-700' :
                                    item.type === 'coaching' && item.meta?.includes('Face to Face') ? 'bg-orange-600 hover:bg-orange-700' :
                                    'bg-indigo-600 hover:bg-indigo-700'
                                 }`}>
                                 <ExternalLink className="w-3 h-3 mr-1" /> 
                                 {item.type === 'coaching' && item.meta?.includes('Face to Face')
                                    ? 'Venue Info'
                                    : (item.type === 'coaching' && item.meta?.includes('Online') && new Date() < new Date(item.date))
                                       ? 'Wait for Start'
                                       : 'Join Now'
                                 }
                              </a>
                           </div>
                        ) : null}
                     </div>
                  )) : (
                     <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm">
                        <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-gray-500">No upcoming schedule</p>
                     </div>
                  )}
               </div>
            </div>

      </div>
      );
   }

   // --- AGENT & GROUP LEADER PERSONAL DASHBOARD ---

   // --- Date Filters ---
   const now = new Date();
   const currentYear = now.getFullYear();
   const currentMonth = now.getMonth();

   // YTD Dates: Jan 1st to Dec 31st of Current Year
   const startYTD = new Date(currentYear, 0, 1);
   const endYTD = new Date(currentYear, 11, 31, 23, 59, 59);

   // MTD Dates: 1st of Current Month to Last day of Current Month
   const startMTD = new Date(currentYear, currentMonth, 1);
   const endMTD = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

   const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

   // --- STRICTLY PERSONAL DATA ---
   const myProspects = prospects.filter(p => p.uid === currentUser?.id);
   const myEvents = currentUser ? getEventsForUser(currentUser) : []; // This gets Admin/Trainer/Group events

   // Helper to check if a date string falls within a date range
   const isWithinDateRange = (dateStr: string | undefined, start: Date, end: Date) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      return d >= start && d <= end;
   };

   // --- YTD Calculations ---
   // Prospects entered YTD
   const ytdProspects = myProspects.filter(p => isWithinDateRange(p.createdAt, startYTD, endYTD));
   const totalProspectsYTD = ytdProspects.length;

   // Appointments Scheduled YTD (including rescheduled)
   const ytdAppointments = myProspects.filter(p =>
      (p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled') &&
      isWithinDateRange(p.appointmentDate, startYTD, endYTD)
   );
   const totalAppointmentsYTD = ytdAppointments.length;

   // Sales Meetings Completed YTD
   const ytdSalesMeetings = myProspects.filter(p =>
      p.appointmentStatus === 'completed' &&
      isWithinDateRange(p.appointmentCompletedAt || p.appointmentDate, startYTD, endYTD)
   );
   const totalSalesMeetingsYTD = ytdSalesMeetings.length;

   // Sales (Successful) YTD
   const ytdSales = myProspects.filter(p =>
      p.salesOutcome === 'successful' &&
      isWithinDateRange(p.salesCompletedAt || p.updatedAt, startYTD, endYTD)
   );
   const totalSalesNOC_YTD = ytdSales.length;
   const totalSalesACE_YTD = ytdSales.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);

   // ACS (ACE / NOC) YTD
   const acsYTD = totalSalesNOC_YTD > 0 ? (totalSalesACE_YTD / totalSalesNOC_YTD) : 0;

   // --- MTD Calculations ---
   // Prospects entered MTD
   const mtdProspectsCount = myProspects.filter(p => isWithinDateRange(p.createdAt, startMTD, endMTD)).length;
   // Appointments Scheduled MTD — counts when the appointment was SET this month (by updatedAt)
   const mtdAppointmentsCount = myProspects.filter(p =>
      (p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled') &&
      isWithinDateRange(p.updatedAt, startMTD, endMTD)
   ).length;
   // Sales Meetings Completed MTD
   const mtdSalesMeetingsCount = myProspects.filter(p =>
      p.appointmentStatus === 'completed' &&
      isWithinDateRange(p.appointmentCompletedAt || p.appointmentDate, startMTD, endMTD)
   ).length;
   // Sales (Successful) MTD
   const mtdSales = myProspects.filter(p =>
      p.salesOutcome === 'successful' &&
      isWithinDateRange(p.salesCompletedAt || p.updatedAt, startMTD, endMTD)
   );
   const mtdSalesNOC = mtdSales.length;
   const mtdSalesACE = mtdSales.reduce((sum, p) => sum + ((p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0)), 0);


   // --- UPCOMING SCHEDULE LOGIC — Next 5 items (all types combined) ---
   type ScheduleItem = { id: string; title: string; date: string; type: 'event' | 'coaching' | 'meeting'; meta?: string; link?: string; isOwned: boolean; };

   const upcomingAppointments: ScheduleItem[] = myProspects
      .filter(p => {
         if (!p.appointmentDate) return false;
         const isActive = p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled' || p.appointmentStatus === 'not_done';
         const d = new Date(p.appointmentDate);
         return isActive && d >= now && d <= sevenDaysFromNow;
      })
      .map(p => {
         let finalDate = new Date(p.appointmentDate!);
         if (p.appointmentStartTime) {
            const [hours, minutes] = p.appointmentStartTime.split(':');
            finalDate.setHours(parseInt(hours, 10));
            finalDate.setMinutes(parseInt(minutes, 10));
         }
         return {
            id: p.id, title: `Appt: ${p.prospectName}`, date: finalDate.toISOString(),
            type: 'meeting' as const, meta: p.appointmentLocation || undefined, link: undefined, isOwned: true
         };
      });

   const upcomingEvents: ScheduleItem[] = myEvents
      .filter(e => { const d = new Date(e.date); return e.status !== 'cancelled' && d >= now && d <= sevenDaysFromNow; })
      .map(e => ({
         id: e.id, title: e.eventTitle, date: e.date, type: 'event' as const,
         meta: e.venue, link: e.meetingLink || undefined, isOwned: e.createdBy === currentUser?.id
      }));

   const myCoachingSessions = currentUser ? getCoachingSessionsForUser(currentUser) : [];
   const upcomingCoachingSessions: ScheduleItem[] = myCoachingSessions
      .filter(s => s.status !== 'cancelled')
      .map(s => {
         let sessionDate = s.date;
         try {
            const base = new Date(s.date);
            if (s.durationStart) { const [h, m] = s.durationStart.split(':').map(Number); base.setHours(h, m, 0, 0); sessionDate = base.toISOString(); }
         } catch { }
         return {
            id: s.id, title: s.title, date: sessionDate, type: 'coaching' as const,
            meta: `${s.durationStart || ''} – ${s.durationEnd || ''} · ${s.venue}`,
            link: s.link || undefined,
            isOwned: s.createdBy === currentUser?.id
         };
      })
      .filter(i => { const d = new Date(i.date); return d >= now && d <= sevenDaysFromNow; });

   // Take the 5 soonest upcoming items across all 3 types
   const combinedSchedule = [...upcomingAppointments, ...upcomingEvents, ...upcomingCoachingSessions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

   // Chart Data (Month-To-Date Funnel)
   // We use separate bars conceptually if possible. Recharts allows Custom Tooltips or multi-bar if needed.
   // We will display Quantity (NOC) and Quality (ACE) in the chart tooltip for Sales.
   const chartDataMTD = [
      { name: 'Prospects',       value: mtdProspectsCount,     barType: 'count' },
      { name: 'Appointments Set', value: mtdAppointmentsCount,  barType: 'count' },
      { name: 'Sales Meetings',   value: mtdSalesMeetingsCount, barType: 'count' },
      { name: 'Sales',           value: mtdSalesNOC,           barType: 'sales', ace: mtdSalesACE },
   ];

   // Custom Tooltip for the MTD Bar Chart
   const CustomTooltip = ({ active, payload, label }: any) => {
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
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-2xl font-bold text-gray-900">Personal Dashboard</h1>
               <p className="text-sm text-gray-500">Welcome back, {currentUser?.name}. Here is your individual performance.</p>
            </div>
         </div>

         {/* YTD WIDGETS */}
         <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-3"><Users className="w-5 h-5" /></div>
               <p className="text-sm font-medium text-gray-500 mb-1">Total Prospects (YTD)</p>
               <h3 className="text-2xl font-bold text-gray-900">{totalProspectsYTD}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mb-3"><Calendar className="w-5 h-5" /></div>
               <p className="text-sm font-medium text-gray-500 mb-1">Total Appointments (YTD)</p>
               <h3 className="text-2xl font-bold text-gray-900">{totalAppointmentsYTD}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3"><Target className="w-5 h-5" /></div>
               <p className="text-sm font-medium text-gray-500 mb-1">Sales Meetings (YTD)</p>
               <h3 className="text-2xl font-bold text-gray-900">{totalSalesMeetingsYTD}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-green-50 text-green-600 rounded-lg mb-3"><DollarSign className="w-5 h-5" /></div>
               <p className="text-sm font-medium text-gray-500 mb-1">Total Sales (YTD)</p>
               <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">{totalSalesNOC_YTD}</h3>
                  <span className="text-xs text-gray-400">NOC</span>
               </div>
               <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-xl font-bold text-green-600">RM {totalSalesACE_YTD.toLocaleString()}</p>
                  <span className="text-xs text-gray-400">ACE</span>
               </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg mb-3"><BarChart2 className="w-5 h-5" /></div>
               <p className="text-sm font-medium text-gray-500 mb-1">ACS (ACE/NOC) (YTD)</p>
               <h3 className="text-xl font-bold text-yellow-600 mt-1">RM {acsYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* MTD Bar Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Month-To-Date Pipeline</h3>
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">{now.toLocaleString('default', { month: 'long', year: 'numeric' })} MTD</span>
               </div>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartDataMTD} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tickFormatter={(v) => v.toLocaleString()}>
                           <Label value="No. / RM'000" angle={-90} position="insideLeft" offset={-5} style={{ fontSize: '10px', fill: '#6B7280' }} />
                        </YAxis>
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                           {chartDataMTD.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Upcoming Schedule */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center">
                     <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                     Upcoming Schedule
                  </h3>
                  <div className="flex items-center gap-2">
                     {onNavigate && (
                        <button onClick={() => onNavigate('events')} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                           View Calendar <ExternalLink className="w-3 h-3" />
                        </button>
                     )}
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {combinedSchedule.length > 0 ? (
                     combinedSchedule.map(item => (
                        <div
                           key={item.id}
                           className={`flex flex-col p-3 rounded-lg border transition-colors ${item.type === 'event' ? 'bg-indigo-50/50 border-indigo-100'
                              : item.type === 'coaching' ? 'bg-green-50/50 border-green-100'
                                 : 'bg-gray-50 border-gray-100'
                              } ${item.isOwned && onNavigate ? 'cursor-pointer hover:brightness-95' : ''}`}
                           onClick={item.isOwned && onNavigate
                              ? () => onNavigate(item.type === 'coaching' ? 'coaching' : item.type === 'meeting' ? 'prospects' : 'events')
                              : undefined}
                        >
                           <div className="flex items-start">
                              <div className="mt-1 mr-3">
                                 {item.type === 'event'
                                    ? <CalendarDays className="w-4 h-4 text-indigo-500" />
                                    : item.type === 'coaching'
                                       ? <GraduationCap className="w-4 h-4 text-green-500" />
                                       : <Clock className="w-4 h-4 text-gray-400" />
                                 }
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-start justify-between gap-1">
                                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</p>
                                    {item.isOwned && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded flex-shrink-0">MINE</span>}
                                 </div>
                                 <p className="text-xs text-gray-500 mt-0.5">
                                    {(() => { try { return new Date(item.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })()}
                                 </p>
                                 {item.meta && (
                                    <div className={`flex items-center text-[10px] font-medium mt-1 ${item.type === 'event' ? 'text-indigo-600'
                                       : item.type === 'coaching' ? 'text-green-700'
                                          : 'text-gray-500'
                                       }`}>
                                       <MapPin className="w-3 h-3 mr-1" />{item.meta}
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* JOIN BUTTON — Everyone sees link interactions */}
                           {(item.type === 'event' || item.type === 'coaching') && item.link && (
                                 <div className="mt-2 ml-7">
                                    <a
                                       href={(item.type === 'coaching' && item.meta?.includes('Online') && new Date() < new Date(item.date)) ? '#' : item.link}
                                       target={(item.type === 'coaching' && item.meta?.includes('Online') && new Date() < new Date(item.date)) ? '_self' : '_blank'}
                                       rel="noreferrer"
                                       onClick={e => e.stopPropagation()}
                                       className={`inline-flex items-center text-xs font-bold text-white px-3 py-1.5 rounded transition-colors ${
                                          item.type === 'coaching' && item.meta?.includes('Online') 
                                             ? new Date() < new Date(item.date) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                             : item.type === 'coaching' && item.meta?.includes('Face to Face')
                                                ? 'bg-orange-600 hover:bg-orange-700'
                                                : 'bg-indigo-600 hover:bg-indigo-700'
                                       }`}
                                    >
                                       <ExternalLink className="w-3 h-3 mr-1" /> 
                                       {item.type === 'coaching' && item.meta?.includes('Face to Face')
                                          ? 'Venue Info'
                                          : (item.type === 'coaching' && item.meta?.includes('Online') && new Date() < new Date(item.date))
                                             ? 'Wait for Start'
                                             : 'Join Now'
                                       }
                                    </a>
                                 </div>
                              )}
                        </div>
                     ))
                  ) : (
                     <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm h-full">
                        <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-500" />
                        <p className="text-gray-500">No upcoming activities</p>
                        <p className="text-xs mt-1 text-gray-400">Your schedule is clear</p>
                     </div>
                  )}
               </div>
            </div>
         </div>

      </div>
   );
};

export default Dashboard;
