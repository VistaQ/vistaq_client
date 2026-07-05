
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, SalesReport as SalesReportType, Group, MONTH_LABELS } from '../types';
import { apiCall } from '../services/apiClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Download, TrendingUp, Award, Target, Users,
  ChevronDown, AlertCircle, Loader2, ArrowLeft, ArrowRight, Search, X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── helpers ────────────────────────────────────────────────────────────────

const rm = (v: number) => 'RM ' + Math.round(v).toLocaleString('en-MY');

const DEFAULT_TARGET = 400_000;

// Per-agent profile targets come from the sales report (echoed from the user record).
// Fall back to DEFAULT_TARGET when an agent hasn't set one (null).
const fyctTargetOf = (r: SalesReportType) => r.fyct_target ?? DEFAULT_TARGET;
const fycTargetOf  = (r: SalesReportType) => r.fyc_target  ?? DEFAULT_TARGET;

// ─── Trend line config ───────────────────────────────────────────────────────

const TREND_LINES = [
  { key: 'FYCt', color: '#3b82f6', yAxis: 'left'  as const },
  { key: 'FYC',  color: '#22c55e', yAxis: 'left'  as const },
  { key: 'ACE',  color: '#10b981', yAxis: 'left'  as const },
  { key: 'NOC',  color: '#a855f7', yAxis: 'right' as const },
];

// ─── sub-components ─────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string; value: string; sub: string; bg: string; icon: React.ReactNode;
}> = ({ label, value, sub, bg, icon }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
    <div className="flex items-center mb-3">
      <div className={`p-2 ${bg} rounded-lg mr-3`}>{icon}</div>
      <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-400 mt-1">{sub}</p>
  </div>
);

const GroupBar: React.FC<{
  label: string; value: number; total: number; pct: number; color: string; fillClass: string;
}> = ({ label, value, total, pct, fillClass }) => (
  <div className="mt-3">
    <div className="flex justify-between items-baseline text-sm text-gray-500 mb-1">
      <span className="font-semibold text-gray-700">{label}</span>
      <span>
        <span className="hidden sm:inline">{rm(value)} of {rm(total)} · </span>
        <span className="font-bold text-gray-800">{pct.toFixed(1)}%</span>
      </span>
    </div>
    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-3 rounded-full transition-all duration-700 ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

// ─── main page ───────────────────────────────────────────────────────────────

const GroupSalesReport: React.FC = () => {
  const navigate  = useNavigate();
  const { currentUser } = useAuth();
  const { salesReports, isLoadingSalesReports, refetchSalesReports, users } = useData();

  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [selectedYear,  setSelectedYear]  = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [trendLines,    setTrendLines]    = useState<Set<string>>(() => new Set(['FYCt', 'FYC']));
  const [showDownload,  setShowDownload]  = useState(false);
  const [agentSearch,   setAgentSearch]   = useState('');
  // null = "All Groups" overview (multi-group viewers); a key = drilled into that group
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  const toggleTrend = (key: string) =>
    setTrendLines(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  useEffect(() => { refetchSalesReports(selectedYear); }, [selectedYear]);
  useEffect(() => {
    apiCall('/groups').then(res => setGroups(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  if (!currentUser) return null;

  const isGroupLeader = currentUser.role === UserRole.GROUP_LEADER;
  const isManagement  = currentUser.role === UserRole.ADMIN
    || currentUser.role === UserRole.MASTER_TRAINER
    || currentUser.role === UserRole.TRAINER;

  if (!isGroupLeader && !isManagement) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <AlertCircle className="w-8 h-8 mb-3" />
        <p className="font-medium">You don't have access to the Group Sales Report.</p>
      </div>
    );
  }

  const allReports: SalesReportType[] = salesReports;
  const hasData = allReports.length > 0;
  const n = selectedMonth;
  const periodLabel = `Jan–${MONTH_LABELS[n - 1]} ${selectedYear}`;

  const sum = (r: SalesReportType, key: 'month_fyct' | 'month_fyc' | 'month_ace' | 'month_noc') =>
    (r[key] ?? []).slice(0, n).reduce((s, v) => s + v, 0);

  // ── Bucket reports by group (agent_id → users.group_id → group name) ────
  // The server already scopes /sales-reports per role (admin/MT = all groups,
  // trainer = managed groups, group leader = own group); here we present that
  // scope group-by-group instead of as one flat list.
  const UNASSIGNED = 'unassigned';
  const groupIdByAgent = new Map(users.map(u => [u.id, u.group_id]));
  const groupNameOf = (key: string) =>
    key === UNASSIGNED ? 'Unassigned' : (groups.find(g => g.id === key)?.name ?? 'Unknown Group');

  const buckets = new Map<string, SalesReportType[]>();
  for (const r of allReports) {
    const key = groupIdByAgent.get(r.agent_id) ?? UNASSIGNED;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }
  const groupsInScope = [...buckets.entries()]
    .map(([key, rs]) => ({ key, name: groupNameOf(key), reports: rs }))
    .sort((a, b) =>
      b.reports.reduce((s, r) => s + sum(r, 'month_fyct'), 0) -
      a.reports.reduce((s, r) => s + sum(r, 'month_fyct'), 0)
    );

  // Group leaders are locked to their own group; a scope with exactly one group
  // auto-selects it. Everyone else starts on the "All Groups" overview.
  const lockedGroupKey = isGroupLeader
    ? (buckets.has(currentUser.group_id ?? '') ? currentUser.group_id! : (groupsInScope[0]?.key ?? null))
    : groupsInScope.length === 1 ? groupsInScope[0].key : null;
  const effectiveGroupKey = lockedGroupKey ?? selectedGroupKey;
  const selectedGroup = groupsInScope.find(g => g.key === effectiveGroupKey) ?? null;
  const isOverview = selectedGroup === null;
  const multiGroup = lockedGroupKey === null && groupsInScope.length > 1;
  const scopeName = selectedGroup?.name ?? (isGroupLeader ? 'My Group' : 'All Groups');

  // All aggregates below derive from the current selection.
  const reports: SalesReportType[] = selectedGroup ? selectedGroup.reports : allReports;

  // ── Aggregate YTD (month-array based, respects selectedMonth) ───────────

  const totalFyct = reports.reduce((s, r) => s + sum(r, 'month_fyct'), 0);
  const totalFyc  = reports.reduce((s, r) => s + sum(r, 'month_fyc'),  0);
  const totalAce  = reports.reduce((s, r) => s + sum(r, 'month_ace'),  0);
  const totalNoc  = reports.reduce((s, r) => s + sum(r, 'month_noc'),  0);

  // Group targets are the sum of each agent's personal target (falls back to default).
  const groupFyctTarget      = reports.reduce((s, r) => s + fyctTargetOf(r), 0) || DEFAULT_TARGET;
  const groupFycTarget       = reports.reduce((s, r) => s + fycTargetOf(r),  0) || DEFAULT_TARGET;
  const groupFycPct          = (totalFyc  / groupFycTarget)  * 100;
  const groupFyctPct         = (totalFyct / groupFyctTarget) * 100;
  const agentsTargetAchieved = reports.filter(r => sum(r, 'month_fyc') >= fycTargetOf(r)).length;

  // ── Sorted agents ────────────────────────────────────────────────────────

  const sortedReports = [...reports].sort((a, b) => sum(b, 'month_fyct') - sum(a, 'month_fyct'));

  // ── Monthly trend data ───────────────────────────────────────────────────

  const monthlyTrend = MONTH_LABELS.slice(0, n).map((month, idx) => ({
    month,
    FYCt: reports.reduce((s, r) => s + (r.month_fyct?.[idx] ?? 0), 0),
    FYC:  reports.reduce((s, r) => s + (r.month_fyc?.[idx]  ?? 0), 0),
    ACE:  reports.reduce((s, r) => s + (r.month_ace?.[idx]  ?? 0), 0),
    NOC:  reports.reduce((s, r) => s + (r.month_noc?.[idx]  ?? 0), 0),
  }));

  // ── Downloads (ETL-standard format) ─────────────────────────────────────

  const buildRows = () => reports.map(r => {
    const agentFyc     = sum(r, 'month_fyc');
    const agentFyct    = sum(r, 'month_fyct');
    const agentAce     = sum(r, 'month_ace');
    const agentNoc     = sum(r, 'month_noc');
    const fyctTarget   = fyctTargetOf(r);
    const fycTarget    = fycTargetOf(r);
    const fycPct       = (agentFyc  / fycTarget)  * 100;
    const fyctPct      = (agentFyct / fyctTarget) * 100;
    const row: Record<string, unknown> = {
      'Agent Code':      r.agent_code,
      'Agent Name':      r.agent_name,
      'Group':           groupNameOf(groupIdByAgent.get(r.agent_id) ?? UNASSIGNED),
      'FYCt Target':     fyctTarget,
      'FYCt (YTD)':     agentFyct,
      '% FYCt':          `${fyctPct.toFixed(2)}%`,
      'FYC Target':      fycTarget,
      'FYC (YTD)':      agentFyc,
      '% FYC':           `${fycPct.toFixed(2)}%`,
      'Shortage (FYC)':  Math.max(fycTarget - agentFyc, 0),
      'ACE (YTD)':      agentAce,
      'NOC (YTD)':      agentNoc,
    };
    MONTH_LABELS.forEach((m, idx) => {
      row[`${m} FYCt`] = r.month_fyct?.[idx] ?? 0;
      row[`${m} FYC`]  = r.month_fyc?.[idx]  ?? 0;
      row[`${m} ACE`]  = r.month_ace?.[idx]  ?? 0;
      row[`${m} NOC`]  = r.month_noc?.[idx]  ?? 0;
    });
    return row;
  });

  const fileScope = selectedGroup ? selectedGroup.name.replace(/[^\w]+/g, '') : 'AllGroups';

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(buildRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Group Sales Report');
    XLSX.writeFile(wb, `VistaQ_GroupSalesReport_${fileScope}_${MONTH_LABELS[n - 1]}_${selectedYear}.xlsx`);
  };

  const downloadCSV = () => {
    const rows = buildRows();
    const headers = Object.keys(rows[0] ?? {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const v = String((r as any)[h]);
      return v.includes(',') ? `"${v}"` : v;
    }).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `VistaQ_GroupSalesReport_${fileScope}_${MONTH_LABELS[n - 1]}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const monthOptions = MONTH_LABELS.map((label, idx) => ({ label, value: idx + 1 }));

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/group')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Group Sales Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isOverview && multiGroup
                ? `All groups · ${groupsInScope.length} group${groupsInScope.length !== 1 ? 's' : ''} · ${periodLabel}`
                : `${scopeName} · ${periodLabel}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month / Year selectors */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Download */}
          <div className="relative">
            <button
              onClick={() => setShowDownload(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download
              <ChevronDown className={`w-3 h-3 transition-transform ${showDownload ? 'rotate-180' : ''}`} />
            </button>
            {showDownload && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowDownload(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-30">
                  <button onClick={() => { downloadExcel(); setShowDownload(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Excel Report
                  </button>
                  <button onClick={() => { downloadCSV(); setShowDownload(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium border-t border-gray-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    CSV Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoadingSalesReports && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading group sales data…</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoadingSalesReports && !hasData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700">No sales data for {selectedYear} yet.</p>
          <p className="text-sm text-gray-400 mt-1">Group sales analytics will appear once an ETL upload has been processed.</p>
        </div>
      )}

      {!isLoadingSalesReports && hasData && (
        <>

        {/* ── Back to overview (when drilled into a group) ── */}
        {!isOverview && multiGroup && (
          <button
            onClick={() => { setSelectedGroupKey(null); setAgentSearch(''); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Groups
          </button>
        )}

        {/* ── Section 1: Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="FYCt YTD"
            value={rm(totalFyct)}
            sub={`${scopeName} · ${reports.length} agent${reports.length !== 1 ? 's' : ''}`}
            bg="bg-blue-50"
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          />
          <StatCard
            label="FYC YTD"
            value={rm(totalFyc)}
            sub={`${groupFycPct.toFixed(1)}% of ${isOverview ? 'combined' : scopeName} target`}
            bg="bg-green-50"
            icon={<Award className="w-5 h-5 text-green-600" />}
          />
          <StatCard
            label="ACE YTD"
            value={rm(totalAce)}
            sub={`${rm(Math.round(totalAce / Math.max(reports.length, 1)))} avg per agent`}
            bg="bg-emerald-50"
            icon={<Target className="w-5 h-5 text-emerald-600" />}
          />
          <StatCard
            label="NOC YTD"
            value={String(totalNoc)}
            sub={`Avg ${(totalNoc / Math.max(reports.length, 1)).toFixed(1)} per agent`}
            bg="bg-purple-50"
            icon={<Users className="w-5 h-5 text-purple-600" />}
          />
        </div>

        {/* ── Section 1b: Group overview cards (multi-group "All Groups" view) ── */}
        {isOverview && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Groups — Sales Progress</h2>
              <p className="text-sm text-gray-500 mt-0.5">Select a group to view its agents and full report</p>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {groupsInScope.map(g => {
                const gFyct       = g.reports.reduce((s, r) => s + sum(r, 'month_fyct'), 0);
                const gFyc        = g.reports.reduce((s, r) => s + sum(r, 'month_fyc'),  0);
                const gFyctTarget = g.reports.reduce((s, r) => s + fyctTargetOf(r), 0) || DEFAULT_TARGET;
                const gFycTarget  = g.reports.reduce((s, r) => s + fycTargetOf(r),  0) || DEFAULT_TARGET;
                const gFyctPct    = (gFyct / gFyctTarget) * 100;
                const gFycPct     = (gFyc  / gFycTarget)  * 100;
                const gOnTarget   = g.reports.filter(r => sum(r, 'month_fyc') >= fycTargetOf(r)).length;
                return (
                  <div key={g.key} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-gray-900 truncate">{g.name}</p>
                        <p className="text-sm text-gray-400">{g.reports.length} agent{g.reports.length !== 1 ? 's' : ''} · {gOnTarget} on target</p>
                      </div>
                      <button
                        onClick={() => { setSelectedGroupKey(g.key); setAgentSearch(''); }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        View Group
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* FYCt */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">FYCt</span>
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-sm font-semibold text-gray-700">{rm(gFyct)}</span>
                          <span className="text-base font-bold text-blue-700">{gFyctPct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-3 rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(gFyctPct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1.5">
                        <span className="text-gray-500">Target: <span className="font-semibold text-gray-700">{rm(gFyctTarget)}</span></span>
                        {gFyct < gFyctTarget
                          ? <span className="text-red-500 font-semibold">Shortage: {rm(gFyctTarget - gFyct)}</span>
                          : <span className="text-green-600 font-semibold">Target met ✓</span>}
                      </div>
                    </div>

                    {/* FYC */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wide">FYC</span>
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-sm font-semibold text-gray-700">{rm(gFyc)}</span>
                          <span className="text-base font-bold text-green-700">{gFycPct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-3 rounded-full transition-all duration-700 ${gFycPct >= 100 ? 'bg-green-500' : gFycPct >= 75 ? 'bg-green-400' : gFycPct >= 25 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(gFycPct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1.5">
                        <span className="text-gray-500">Target: <span className="font-semibold text-gray-700">{rm(gFycTarget)}</span></span>
                        {gFyc < gFycTarget
                          ? <span className="text-red-500 font-semibold">Shortage: {rm(gFycTarget - gFyc)}</span>
                          : <span className="text-green-600 font-semibold">Target met ✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Section 2: Agent Sales Progress (single-group detail view) ── */}
        {!isOverview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h2 className="text-lg font-bold text-gray-900">{scopeName} — Sales Progress</h2>
                <span className="text-sm text-gray-400">{agentsTargetAchieved} of {reports.length} reached target</span>
              </div>
              {/* Group progress bars — FYCt first, then FYC */}
              <GroupBar
                label={`${scopeName} FYCt`}
                value={totalFyct}
                total={groupFyctTarget}
                pct={groupFyctPct}
                color="#3b82f6"
                fillClass="bg-blue-500"
              />
              <GroupBar
                label={`${scopeName} FYC`}
                value={totalFyc}
                total={groupFycTarget}
                pct={groupFycPct}
                color="#22c55e"
                fillClass="bg-green-500"
              />

              {/* Search bar */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={agentSearch}
                  onChange={e => setAgentSearch(e.target.value)}
                  placeholder="Search by agent name or ID…"
                  className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                />
                {agentSearch && (
                  <button
                    onClick={() => setAgentSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Agent cards — single column, all screen sizes ── */}
          <div className="p-4 sm:p-6">
            {(() => {
              const q = agentSearch.trim().toLowerCase();
              const filtered = q
                ? sortedReports.filter(r =>
                    r.agent_name?.toLowerCase().includes(q) ||
                    r.agent_code?.toLowerCase().includes(q)
                  )
                : sortedReports;
              return (
            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Search className="w-6 h-6 mb-2" />
                  <p className="text-sm font-medium">No agents match "{agentSearch}"</p>
                  <button onClick={() => setAgentSearch('')} className="mt-2 text-xs text-blue-500 hover:underline">Clear search</button>
                </div>
              )}
              {filtered.map((r, idx) => {
                const agentFyc     = sum(r, 'month_fyc');
                const agentFyct    = sum(r, 'month_fyct');
                const agentAce     = sum(r, 'month_ace');
                const agentNoc     = sum(r, 'month_noc');
                const fyctTarget   = fyctTargetOf(r);
                const fycTarget    = fycTargetOf(r);
                const fyctPct      = (agentFyct / fyctTarget) * 100;
                const fycPct       = (agentFyc  / fycTarget)  * 100;
                const fyctShortage = Math.max(fyctTarget - agentFyct, 0);
                const fycShortage  = Math.max(fycTarget  - agentFyc,  0);
                const statusCfg = fycPct >= 100
                  ? { badge: 'bg-green-100 text-green-700 border-green-200',  label: 'Target Met' }
                  : fycPct >= 75
                  ? { badge: 'bg-blue-100 text-blue-700 border-blue-200',     label: 'On Track' }
                  : fycPct >= 25
                  ? { badge: 'bg-amber-100 text-amber-700 border-amber-200',  label: 'Progressing' }
                  : { badge: 'bg-red-50 text-red-600 border-red-200',         label: 'Needs Attention' };
                return (
                  <div
                    key={r.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
                  >
                    {/* Name + status */}
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-gray-900 truncate leading-snug">{r.agent_name}</p>
                          <p className="text-sm text-gray-400">{r.agent_code}</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${statusCfg.badge}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* FYCt — achieved / % / bar / target + shortage on one line */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">FYCt</span>
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-sm font-semibold text-gray-700">{rm(agentFyct)}</span>
                          <span className="text-base font-bold text-blue-700">{fyctPct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-3 rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(fyctPct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1.5">
                        <span className="text-gray-500">Target: <span className="font-semibold text-gray-700">{rm(fyctTarget)}</span></span>
                        {fyctShortage > 0 ? (
                          <span className="text-red-500 font-semibold">Shortage: {rm(fyctShortage)}</span>
                        ) : (
                          <span className="text-green-600 font-semibold">Target met ✓</span>
                        )}
                      </div>
                    </div>

                    {/* FYC — achieved / % / bar / target + shortage on one line */}
                    <div className="mb-5">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wide">FYC</span>
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-sm font-semibold text-gray-700">{rm(agentFyc)}</span>
                          <span className="text-base font-bold text-green-700">{fycPct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-3 rounded-full transition-all duration-700 ${fycPct >= 100 ? 'bg-green-500' : fycPct >= 75 ? 'bg-green-400' : fycPct >= 25 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(fycPct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1.5">
                        <span className="text-gray-500">Target: <span className="font-semibold text-gray-700">{rm(fycTarget)}</span></span>
                        {fycShortage > 0 ? (
                          <span className="text-red-500 font-semibold">Shortage: {rm(fycShortage)}</span>
                        ) : (
                          <span className="text-green-600 font-semibold">Target met ✓</span>
                        )}
                      </div>
                    </div>

                    {/* ACE · NOC · View Report */}
                    <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-50 rounded-xl px-3.5 py-2 border border-gray-100 flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 uppercase">ACE</span>
                          <span className="text-sm font-bold text-gray-700">{rm(agentAce)}</span>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-3.5 py-2 border border-gray-100 flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-400 uppercase">NOC</span>
                          <span className="text-sm font-bold text-purple-700">{agentNoc}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/sales-report?agent=${r.agent_id}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        View Report
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
              );
            })()}

            {/* Group totals summary */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                {scopeName} Total · {periodLabel}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'FYCt', value: rm(totalFyct),      dot: 'bg-blue-400',   num: 'text-base font-bold text-blue-700' },
                  { key: 'FYC',  value: rm(totalFyc),       dot: 'bg-green-400',  num: 'text-base font-bold text-green-700' },
                  { key: 'ACE',  value: rm(totalAce),       dot: 'bg-gray-400',   num: 'text-base font-bold text-gray-700' },
                  { key: 'NOC',  value: String(totalNoc),   dot: 'bg-purple-400', num: 'text-base font-bold text-purple-700' },
                ].map(s => (
                  <div key={s.key} className="bg-white rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{s.key}</p>
                    </div>
                    <p className={`${s.num} truncate`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ── Section 3: Monthly Group Trend ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Monthly Trend — {scopeName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isOverview
                ? 'Month-by-month aggregate production across all groups combined'
                : `Month-by-month aggregate production across ${scopeName} members`}
            </p>
          </div>
          <div className="p-6 md:p-8">
            {/* Individual metric toggles */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-100 mb-5">
              <span className="self-center text-xs font-bold text-gray-400 uppercase pr-1">Metrics</span>
              {TREND_LINES.map(cfg => (
                <button
                  key={cfg.key}
                  onClick={() => toggleTrend(cfg.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    trendLines.has(cfg.key)
                      ? 'bg-white shadow-sm text-gray-800 border border-gray-200'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity ${trendLines.has(cfg.key) ? 'opacity-100' : 'opacity-30'}`} style={{ backgroundColor: cfg.color }} />
                  {cfg.key}
                </button>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left"  tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) => name === 'NOC' ? [String(v), name] : [rm(v), name]} />
                <Legend />
                {TREND_LINES.map(cfg => trendLines.has(cfg.key) && (
                  <Line
                    key={cfg.key}
                    yAxisId={cfg.yAxis}
                    type="monotone"
                    dataKey={cfg.key}
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        </>
      )}

    </div>
  );
};

export default GroupSalesReport;
