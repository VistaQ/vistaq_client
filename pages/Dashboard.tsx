import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Prospect, ProspectStage, CoachingSession, User } from '../types';
import { apiCall } from '../services/apiClient';
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
   TrendingUp,
   AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, Label } from 'recharts';

const MDRT_TARGET_FYC = 100000;
const MDRT_TARGET_PROSPECTS = 100;

import { CHART_COLORS, CHART_LABEL_FILL } from '../constants/tokens';
const COLORS = CHART_COLORS;

// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
   const navigate = useNavigate();
   const { currentUser } = useAuth();
   const { prospects, getEventsForUser, getCoachingSessionsForUser, refetchEvents, refetchCoachingSessions, dashboardStats, groupStats, isLoadingDashboardStats, refetchDashboardStats, refetchGroupStats, isLoadingProspects } = useData();

   const [users, setUsers] = useState<User[]>([]);

   // Fetch stats, events and coaching sessions on mount (deferred — not loaded on app start)
   useEffect(() => {
      refetchDashboardStats();
      refetchGroupStats();
      refetchEvents();
      refetchCoachingSessions();
      apiCall('/users').then(res => setUsers(Array.isArray(res.data) ? res.data : [])).catch(() => {});
   }, []);

   // --- MANAGEMENT DASHBOARD (Admin, Master Trainer & Trainer ONLY) ---
   // Group Leaders now see Personal Dashboard by default, and access Group stats via "Group" page.
   const isManagementRole = currentUser?.role === UserRole.TRAINER ||
      currentUser?.role === UserRole.MASTER_TRAINER ||
      currentUser?.role === UserRole.ADMIN;

   if (isManagementRole) {
      const isAdmin = currentUser?.role === UserRole.ADMIN;
      const isMasterTrainer = currentUser?.role === UserRole.MASTER_TRAINER;

      const totalGroups = groupStats.length;
      const now = new Date();

      // --- Stats from API ---
      const ytd = dashboardStats?.ytd;
      const mtd = dashboardStats?.mtd;

      const ytdAppointments_Mgmt = ytd?.appointments_set ?? 0;
      const ytdSalesMeetings_Mgmt = ytd?.sales_meetings ?? 0;
      const totalSalesNOC_YTD_Mgmt = ytd?.sales_noc ?? 0;
      const totalSalesACE_YTD_Mgmt = ytd?.sales_ace ?? 0;
      const noOfAgentsYTD = ytd?.agents_count ?? 0;
      const acsYTD_Mgmt = totalSalesNOC_YTD_Mgmt > 0 ? (totalSalesACE_YTD_Mgmt / totalSalesNOC_YTD_Mgmt) : 0;

      // --- Group Rankings from /groups/stats (already sorted by ytd_sales_ace desc) ---
      const groupRankings = groupStats.map(g => ({
         id: g.group_id,
         name: g.group_name,
         fyc: g.ytd_sales_ace,
         sales: g.ytd_sales_noc,
      }));

      // --- MTD Chart Data from API ---
      const mgmtChartDataMTD = [
         { name: 'Prospects',        value: mtd?.prospects ?? 0,        barType: 'count' },
         { name: 'Appointments', value: mtd?.appointments_set ?? 0, barType: 'count' },
         { name: 'Sales Meetings',   value: mtd?.sales_meetings ?? 0,   barType: 'count' },
         { name: 'Sales',            value: mtd?.sales_noc ?? 0,        barType: 'sales', ace: mtd?.sales_ace ?? 0 },
      ];

      const MgmtCustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { payload: { barType: string; value: number; ace?: number } }[]; label?: string }) => {
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
               id: `evt_${e.id}`, title: e.event_title, date: e.start_date,
               type: 'event' as const, meta: e.venue, link: e.meeting_link || undefined,
               isOwned: e.created_by === currentUser?.id
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
                           ? `High-level analytics for ${groupRankings.length} managed group(s).`
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
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">{noOfAgentsYTD}</h3>
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
                                 <p className="text-sm font-mono text-green-600 font-bold">RM {totalSalesACE_YTD_Mgmt.toLocaleString()}</p>
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
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Appointments</p>
                  <h3 className="text-3xl font-bold text-gray-900">{ytdAppointments_Mgmt}</h3>
                  <p className="text-xs text-gray-400 mt-1">Year to Date</p>
               </div>

               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3"><Target className="w-5 h-5" /></div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Sales Meetings</p>
                  <h3 className="text-3xl font-bold text-gray-900">{ytdSalesMeetings_Mgmt}</h3>
                  <p className="text-xs text-gray-400 mt-1">Year to Date</p>
               </div>

               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg mb-3"><DollarSign className="w-5 h-5" /></div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Sales (NOC & ACE)</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-3xl font-bold text-gray-900">{totalSalesNOC_YTD_Mgmt}</h3>
                     <span className="text-xs text-gray-400">NOC</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                     <p className="text-2xl font-bold text-green-600">RM {totalSalesACE_YTD_Mgmt.toLocaleString()}</p>
                     <span className="text-xs text-gray-400">ACE</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Year to Date</p>
               </div>

               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-3"><Users className="w-5 h-5" /></div>
                  <p className="text-sm font-medium text-gray-500 mb-1">No. of Agents</p>
                  <h3 className="text-3xl font-bold text-gray-900">{noOfAgentsYTD}</h3>
                  <p className="text-xs text-gray-400 mt-1">Total in Scope</p>
               </div>

               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
                  <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg mb-3"><BarChart2 className="w-5 h-5" /></div>
                  <p className="text-sm font-medium text-gray-500 mb-1">ACS (ACE/NOC)</p>
                  <h3 className="text-3xl font-bold text-yellow-600 mt-1">RM {acsYTD_Mgmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                  <p className="text-xs text-gray-400 mt-1">Year to Date</p>
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
                              <Label value="No." angle={-90} position="insideLeft" offset={-5} style={{ fontSize: '10px', fill: CHART_LABEL_FILL }} />
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

                     <button onClick={() => navigate('/events')} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                        View Calendar <ExternalLink className="w-3 h-3" />
                     </button>
                  </div>
               </div>
               <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {mgmtScheduleItems.length > 0 ? mgmtScheduleItems.map(item => (
                     <div
                        key={item.id}
                        className={`flex flex-col p-3 rounded-lg border transition-colors ${item.type === 'event' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-green-50/50 border-green-100'
                           } ${item.isOwned ? 'cursor-pointer hover:brightness-95' : ''}`}
                        onClick={item.isOwned ? () => navigate(item.type === 'coaching' ? '/coaching' : '/events') : undefined}
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
                                 <div className={`flex items-center text-[10px] mt-1 font-medium ${item.type === 'event' ? 'text-indigo-600' : 'text-green-600'}`}>
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

   const now = new Date();
   const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

   // --- Stats from API (scoped to personal by backend) ---
   const personalYtd = dashboardStats?.ytd;
   const personalMtd = dashboardStats?.mtd;

   const totalProspectsYTD = personalYtd?.prospects ?? 0;
   const totalAppointmentsYTD = personalYtd?.appointments_set ?? 0;
   const totalSalesMeetingsYTD = personalYtd?.sales_meetings ?? 0;
   const totalSalesNOC_YTD = personalYtd?.sales_noc ?? 0;
   const totalSalesACE_YTD = personalYtd?.sales_ace ?? 0;
   const acsYTD = totalSalesNOC_YTD > 0 ? (totalSalesACE_YTD / totalSalesNOC_YTD) : 0;

   const mtdSalesNOC = personalMtd?.sales_noc ?? 0;
   const mtdSalesACE = personalMtd?.sales_ace ?? 0;

   // --- Prospects still needed for Upcoming Schedule (appointment dates) ---
   const myProspects = prospects.filter(p => p.agent_id === currentUser?.id);
   const myEvents = currentUser ? getEventsForUser(currentUser) : [];


   // --- UPCOMING SCHEDULE LOGIC — Next 5 items (all types combined) ---
   type ScheduleItem = { id: string; title: string; date: string; type: 'event' | 'coaching' | 'meeting'; meta?: string; link?: string; isOwned: boolean; };

   const upcomingAppointments: ScheduleItem[] = myProspects
      .filter(p => {
         if (!p.appointment_date) return false;
         const isActive = p.appointment_status === 'scheduled' || p.appointment_status === 'rescheduled' || p.appointment_status === 'not_done';
         const d = new Date(p.appointment_date);
         return isActive && d >= now && d <= sevenDaysFromNow;
      })
      .map(p => {
         let finalDate = new Date(p.appointment_date!);
         if (p.appointment_start_time) {
            const [hours, minutes] = p.appointment_start_time.split(':');
            finalDate.setHours(parseInt(hours, 10));
            finalDate.setMinutes(parseInt(minutes, 10));
         }
         return {
            id: p.id, title: `Appt: ${p.prospect_name}`, date: finalDate.toISOString(),
            type: 'meeting' as const, meta: p.appointment_location || undefined, link: undefined, isOwned: true
         };
      });

   const upcomingEvents: ScheduleItem[] = myEvents
      .filter(e => { const d = new Date(e.start_date); return e.status !== 'cancelled' && d >= now && d <= sevenDaysFromNow; })
      .map(e => ({
         id: e.id, title: e.event_title, date: e.start_date, type: 'event' as const,
         meta: e.venue, link: e.meeting_link || undefined, isOwned: e.created_by === currentUser?.id
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
   const combinedSchedule = useMemo(
     () => [...upcomingAppointments, ...upcomingEvents, ...upcomingCoachingSessions]
       .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
       .slice(0, 5),
     [upcomingAppointments, upcomingEvents, upcomingCoachingSessions]
   );

   // Chart Data (Month-To-Date Funnel)
   const chartDataMTD = useMemo(() => [
      { name: 'Prospects',        value: personalMtd?.prospects ?? 0,        barType: 'count' },
      { name: 'Appointments', value: personalMtd?.appointments_set ?? 0, barType: 'count' },
      { name: 'Sales Meetings',   value: personalMtd?.sales_meetings ?? 0,   barType: 'count' },
      { name: 'Sales',           value: mtdSalesNOC,           barType: 'sales', ace: mtdSalesACE },
   ], [personalMtd, mtdSalesNOC, mtdSalesACE]);

   // Custom Tooltip for the MTD Bar Chart
   const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { payload: { barType: string; value: number; ace?: number } }[]; label?: string }) => {
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
         {/* Stats load error */}
         {!isLoadingDashboardStats && !dashboardStats && !isLoadingProspects && prospects.length === 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
               <span>Some data could not be loaded. Check your connection and refresh.</span>
            </div>
         )}

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
               <h3 className="text-3xl font-bold text-gray-900">{totalProspectsYTD}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mb-3"><Calendar className="w-5 h-5" /></div>
               <p className="text-sm font-medium text-gray-500 mb-1">Total Appointments (YTD)</p>
               <h3 className="text-3xl font-bold text-gray-900">{totalAppointmentsYTD}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3"><Target className="w-5 h-5" /></div>
               <p className="text-sm font-medium text-gray-500 mb-1">Sales Meetings (YTD)</p>
               <h3 className="text-3xl font-bold text-gray-900">{totalSalesMeetingsYTD}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-green-50 text-green-600 rounded-lg mb-3"><DollarSign className="w-5 h-5" /></div>
               <p className="text-sm font-medium text-gray-500 mb-1">Total Sales (YTD)</p>
               <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-gray-900">{totalSalesNOC_YTD}</h3>
                  <span className="text-xs text-gray-400">NOC</span>
               </div>
               <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-green-600">RM {totalSalesACE_YTD.toLocaleString()}</p>
                  <span className="text-xs text-gray-400">ACE</span>
               </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg mb-3"><BarChart2 className="w-5 h-5" /></div>
               <p className="text-sm font-medium text-gray-500 mb-1">ACS (ACE/NOC) (YTD)</p>
               <h3 className="text-3xl font-bold text-yellow-600 mt-1">RM {acsYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
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
                           <Label value="No." angle={-90} position="insideLeft" offset={-5} style={{ fontSize: '10px', fill: CHART_LABEL_FILL }} />
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
                     <button onClick={() => navigate('/events')} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                        View Calendar <ExternalLink className="w-3 h-3" />
                     </button>
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
                              } ${item.isOwned ? 'cursor-pointer hover:brightness-95' : ''}`}
                           onClick={item.isOwned
                              ? () => navigate(item.type === 'coaching' ? '/coaching' : item.type === 'meeting' ? '/prospects' : '/events')
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
