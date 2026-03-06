
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
   ExternalLink,
   DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

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
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between bg-gradient-to-br from-white to-green-50">
                     <div>
                        <p className="text-sm font-medium text-gray-500">Total Revenue (ACE)</p>
                        <h3 className="text-2xl font-bold text-green-700 mt-1">RM {totalFYC.toLocaleString()}</h3>
                     </div>
                     <div className="p-3 bg-green-100 text-green-700 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
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
                     <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><PieChart className="w-5 h-5" /></div>
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
                     <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Target className="w-5 h-5" /></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Successful Closings</p>
               </div>

               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="text-sm text-gray-500">Total Prospects</p>
                        <h3 className="text-2xl font-bold text-gray-900">{scopeProspects.length}</h3>
                     </div>
                     <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-5 h-5" /></div>
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
                     <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Crown className="w-5 h-5" /></div>
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
                           <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
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
   // Appointments Scheduled MTD
   const mtdAppointmentsCount = myProspects.filter(p =>
      (p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled') &&
      isWithinDateRange(p.appointmentDate, startMTD, endMTD)
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


   // --- UPCOMING SCHEDULE LOGIC (Combined Events & Meetings) ---
   const next7Days = new Date();
   next7Days.setDate(now.getDate() + 7);

   // 1. Process Appointments (Next 7 Days)
   const upcomingAppointments = myProspects
      .filter(p => {
         if (!p.appointmentDate) return false;
         const apptDate = new Date(p.appointmentDate);
         if (isNaN(apptDate.getTime())) return false; // Safety check
         // Ensure we show appointments that are upcoming within 7 days
         const isFuture = apptDate >= now && apptDate <= next7Days;
         const isActive = p.appointmentStatus === 'scheduled' || p.appointmentStatus === 'rescheduled';
         return isFuture && isActive;
      })
      .map(p => {
         // Find correct time if available
         let finalDate = new Date(p.appointmentDate!);
         if (p.appointmentStartTime) {
            const [hours, minutes] = p.appointmentStartTime.split(':');
            finalDate.setHours(parseInt(hours, 10));
            finalDate.setMinutes(parseInt(minutes, 10));
         }

         return {
            id: p.id,
            title: `Appt: ${p.prospectName}`,
            date: finalDate.toISOString(),
            type: 'meeting',
            meta: p.appointmentLocation || p.prospectName,
            link: undefined
         };
      });

   // 2. Process Events (Next 7 Days, Admin/Trainer/Group)
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

   // Chart Data (Month-To-Date Funnel)
   // We use separate bars conceptually if possible. Recharts allows Custom Tooltips or multi-bar if needed.
   // We will display Quantity (NOC) and Quality (ACE) in the chart tooltip for Sales.
   const chartDataMTD = [
      { name: 'Prospects', Quantity: mtdProspectsCount },
      { name: 'Appt Set', Quantity: mtdAppointmentsCount },
      { name: 'Appt Done', Quantity: mtdSalesMeetingsCount },
      { name: 'Sales', Quantity: mtdSalesNOC, ACE: mtdSalesACE },
   ];

   // Custom Tooltip for the MTD Bar Chart to show ACE appropriately
   const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
         const data = payload[0].payload;
         return (
            <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
               <p className="font-bold text-gray-900 mb-1">{label}</p>
               <p className="text-blue-600 text-sm font-medium">Quantity (NOC): {data.Quantity}</p>
               {data.ACE !== undefined && (
                  <p className="text-green-600 text-sm font-medium">Quality (ACE): RM {data.ACE.toLocaleString()}</p>
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
               <p className="text-xs font-medium text-gray-500 mb-1">Total Prospects (YTD)</p>
               <h3 className="text-2xl font-bold text-gray-900">{totalProspectsYTD}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mb-3"><Calendar className="w-5 h-5" /></div>
               <p className="text-xs font-medium text-gray-500 mb-1">Total Apptm (YTD)</p>
               <h3 className="text-2xl font-bold text-gray-900">{totalAppointmentsYTD}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-3"><Target className="w-5 h-5" /></div>
               <p className="text-xs font-medium text-gray-500 mb-1">Sales Meeting (YTD)</p>
               <h3 className="text-2xl font-bold text-gray-900">{totalSalesMeetingsYTD}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-green-50 text-green-600 rounded-lg mb-3"><DollarSign className="w-5 h-5" /></div>
               <p className="text-xs font-medium text-gray-500 mb-1">Total Sales (YTD)</p>
               <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">{totalSalesNOC_YTD}</h3>
                  <span className="text-xs text-gray-400">NOC</span>
               </div>
               <p className="text-sm font-bold text-green-600 mt-1">RM {totalSalesACE_YTD.toLocaleString()}</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
               <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg mb-3"><BarChart2 className="w-5 h-5" /></div>
               <p className="text-xs font-medium text-gray-500 mb-1">ACS (ACE/NOC) (YTD)</p>
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
                     <BarChart data={chartDataMTD} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Quantity" radius={[4, 4, 0, 0]}>
                           {chartDataMTD.map((entry, index) => (
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
                     <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                     Upcoming Schedule
                  </h3>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">Next 7 Days</span>
               </div>

               <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {combinedSchedule.length > 0 ? (
                     combinedSchedule.map(item => (
                        <div key={item.id} className={`flex flex-col p-3 rounded-lg border ${item.type === 'event' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-gray-50 border-gray-100'
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
                                          return new Date(item.date).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
                                       } catch (e) {
                                          return 'Invalid Date';
                                       }
                                    })()}
                                 </p>
                                 {item.type === 'event' && (
                                    <div className="flex items-center text-[10px] text-indigo-600 font-medium mt-1">
                                       <MapPin className="w-3 h-3 mr-1" />
                                       {item.meta || 'Venue TBD'}
                                    </div>
                                 )}
                                 {item.type === 'meeting' && (
                                    <div className="mt-1">
                                       <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded uppercase tracking-wider font-bold">
                                          Client Meeting
                                       </span>
                                    </div>
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
                     <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm h-full">
                        <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-500" />
                        <p className="text-gray-500">No scheduled activities</p>
                        <p className="text-xs mt-1 text-gray-400">Next 7 days are clear</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default Dashboard;
