
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, SalesReport as SalesReportType, MONTH_LABELS } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Download, TrendingUp, Award, Target, Users,
  ChevronDown, AlertCircle, Loader2, ArrowLeft,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── helpers ────────────────────────────────────────────────────────────────

const rm = (v: number) => 'RM ' + Math.round(v).toLocaleString('en-MY');

const DEFAULT_TARGET = 400_000;

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
    <div className="flex justify-between text-xs text-gray-500 mb-1">
      <span className="font-semibold">{label}</span>
      <span>
        <span className="hidden sm:inline">{rm(value)} of {rm(total)} · </span>
        {pct.toFixed(1)}%
      </span>
    </div>
    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-2.5 rounded-full transition-all duration-700 ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

// ─── main page ───────────────────────────────────────────────────────────────

const GroupSalesReport: React.FC = () => {
  const navigate  = useNavigate();
  const { currentUser } = useAuth();
  const { salesReports, isLoadingSalesReports, refetchSalesReports } = useData();

  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [selectedYear,  setSelectedYear]  = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [trendLines,    setTrendLines]    = useState<Set<string>>(() => new Set(['FYCt', 'FYC']));
  const [showDownload,  setShowDownload]  = useState(false);

  const toggleTrend = (key: string) =>
    setTrendLines(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  useEffect(() => { refetchSalesReports(selectedYear); }, [selectedYear]);

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

  const reports: SalesReportType[] = salesReports;
  const hasData = reports.length > 0;
  const n = selectedMonth;
  const periodLabel = `Jan–${MONTH_LABELS[n - 1]} ${selectedYear}`;

  // ── Aggregate YTD (month-array based, respects selectedMonth) ───────────

  const sum = (r: SalesReportType, key: 'month_fyct' | 'month_fyc' | 'month_ace' | 'month_noc') =>
    (r[key] ?? []).slice(0, n).reduce((s, v) => s + v, 0);

  const totalFyct = reports.reduce((s, r) => s + sum(r, 'month_fyct'), 0);
  const totalFyc  = reports.reduce((s, r) => s + sum(r, 'month_fyc'),  0);
  const totalAce  = reports.reduce((s, r) => s + sum(r, 'month_ace'),  0);
  const totalNoc  = reports.reduce((s, r) => s + sum(r, 'month_noc'),  0);

  const groupTarget          = DEFAULT_TARGET * Math.max(reports.length, 1);
  const groupFycPct          = (totalFyc  / groupTarget) * 100;
  const groupFyctPct         = (totalFyct / groupTarget) * 100;
  const agentsTargetAchieved = reports.filter(r => sum(r, 'month_fyc') >= DEFAULT_TARGET).length;

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
    const agentFyc  = sum(r, 'month_fyc');
    const agentFyct = sum(r, 'month_fyct');
    const agentAce  = sum(r, 'month_ace');
    const agentNoc  = sum(r, 'month_noc');
    const fycPct    = (agentFyc  / DEFAULT_TARGET) * 100;
    const fyctPct   = (agentFyct / DEFAULT_TARGET) * 100;
    const row: Record<string, unknown> = {
      'Agent Code':     r.agent_code,
      'Agent Name':     r.agent_name,
      'FYCt (YTD)':    agentFyct,
      '% FYCt':         `${fyctPct.toFixed(2)}%`,
      'FYC (YTD)':     agentFyc,
      '% FYC':          `${fycPct.toFixed(2)}%`,
      'Shortage (FYC)': Math.max(DEFAULT_TARGET - agentFyc, 0),
      'ACE (YTD)':     agentAce,
      'NOC (YTD)':     agentNoc,
    };
    MONTH_LABELS.forEach((m, idx) => {
      row[`${m} FYCt`] = r.month_fyct?.[idx] ?? 0;
      row[`${m} FYC`]  = r.month_fyc?.[idx]  ?? 0;
      row[`${m} ACE`]  = r.month_ace?.[idx]  ?? 0;
      row[`${m} NOC`]  = r.month_noc?.[idx]  ?? 0;
    });
    return row;
  });

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(buildRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Group Sales Report');
    XLSX.writeFile(wb, `VistaQ_GroupSalesReport_${MONTH_LABELS[n - 1]}_${selectedYear}.xlsx`);
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
    a.download = `VistaQ_GroupSalesReport_${MONTH_LABELS[n - 1]}_${selectedYear}.csv`;
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
              Consolidated production analytics · {periodLabel}
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

        {/* ── Section 1: Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="FYCt YTD (Group)"
            value={rm(totalFyct)}
            sub={`${reports.length} agent${reports.length !== 1 ? 's' : ''} contributing`}
            bg="bg-blue-50"
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          />
          <StatCard
            label="FYC YTD (Group)"
            value={rm(totalFyc)}
            sub={`${groupFycPct.toFixed(1)}% of group target`}
            bg="bg-green-50"
            icon={<Award className="w-5 h-5 text-green-600" />}
          />
          <StatCard
            label="ACE YTD (Group)"
            value={rm(totalAce)}
            sub={`${rm(Math.round(totalAce / Math.max(reports.length, 1)))} avg per agent`}
            bg="bg-emerald-50"
            icon={<Target className="w-5 h-5 text-emerald-600" />}
          />
          <StatCard
            label="NOC YTD (Group)"
            value={String(totalNoc)}
            sub={`Avg ${(totalNoc / Math.max(reports.length, 1)).toFixed(1)} per agent`}
            bg="bg-purple-50"
            icon={<Users className="w-5 h-5 text-purple-600" />}
          />
        </div>

        {/* ── Section 2: Agent Sales Progress ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h2 className="text-lg font-bold text-gray-900">Agent Sales Progress</h2>
                <span className="text-xs text-gray-400">{agentsTargetAchieved} of {reports.length} reached target</span>
              </div>
              {/* Group progress bars — FYCt first, then FYC */}
              <GroupBar
                label="Group FYCt"
                value={totalFyct}
                total={groupTarget}
                pct={groupFyctPct}
                color="#3b82f6"
                fillClass="bg-blue-500"
              />
              <GroupBar
                label="Group FYC"
                value={totalFyc}
                total={groupTarget}
                pct={groupFycPct}
                color="#22c55e"
                fillClass="bg-green-500"
              />
            </div>
          </div>

          {/* ── Agent cards — single column, all screen sizes ── */}
          <div className="p-4 sm:p-6">
            <div className="space-y-3">
              {sortedReports.map((r, idx) => {
                const agentFyc  = sum(r, 'month_fyc');
                const agentFyct = sum(r, 'month_fyct');
                const agentAce  = sum(r, 'month_ace');
                const agentNoc  = sum(r, 'month_noc');
                const fyctPct   = (agentFyct / DEFAULT_TARGET) * 100;
                const fycPct    = (agentFyc  / DEFAULT_TARGET) * 100;
                const shortage  = Math.max(DEFAULT_TARGET - agentFyc, 0);
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
                    className="bg-gray-50 border border-gray-100 rounded-2xl p-4"
                  >
                    {/* Name + status */}
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate leading-snug">{r.agent_name}</p>
                          <p className="text-xs text-gray-400">{r.agent_code}</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${statusCfg.badge}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* FYCt progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">FYCt</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{rm(agentFyct)}</span>
                          <span className="text-xs font-bold text-blue-700">{fyctPct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-2.5 rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(fyctPct, 100)}%` }} />
                      </div>
                    </div>

                    {/* FYC progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wide">FYC</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{rm(agentFyc)}</span>
                          <span className="text-xs font-bold text-green-700">{fycPct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-2.5 rounded-full transition-all duration-700 ${fycPct >= 100 ? 'bg-green-500' : fycPct >= 75 ? 'bg-green-400' : fycPct >= 25 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(fycPct, 100)}%` }} />
                      </div>
                    </div>

                    {/* ACE · NOC · Shortage */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">ACE</span>
                        <span className="text-xs font-bold text-gray-700">{rm(agentAce)}</span>
                      </div>
                      <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-purple-400 uppercase">NOC</span>
                        <span className="text-xs font-bold text-purple-700">{agentNoc}</span>
                      </div>
                      {shortage > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          Shortage {rm(shortage)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Group totals summary */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Group Total · {periodLabel}
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

        {/* ── Section 3: Monthly Group Trend ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Monthly Group Trend</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Month-by-month aggregate production across all group members
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
