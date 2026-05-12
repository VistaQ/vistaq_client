
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, SalesReport as SalesReportType, MONTH_LABELS } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Download, TrendingUp, Award, Target, Users,
  ChevronDown, AlertCircle, Loader2, ArrowLeft,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── helpers ────────────────────────────────────────────────────────────────

const rm = (v: number) => 'RM ' + Math.round(v).toLocaleString('en-MY');

// Default annual target — group-level reference until per-user targets land via backend
const DEFAULT_TARGET = 400_000;

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

/** Thin inline progress bar used inside the agent table */
const MiniBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
    <div
      className={`h-2 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 25 ? 'bg-amber-400' : 'bg-red-400'}`}
      style={{ width: `${Math.min(pct, 100)}%` }}
    />
  </div>
);

// ─── main page ───────────────────────────────────────────────────────────────

const GroupSalesReport: React.FC = () => {
  const navigate  = useNavigate();
  const { currentUser } = useAuth();
  const { salesReports, isLoadingSalesReports, refetchSalesReports } = useData();

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const n = currentMonth;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [trendMetric, setTrendMetric]   = useState<'both' | 'fyc' | 'fyct'>('both');

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

  // ── Aggregate stats ──────────────────────────────────────────────────────

  const totalFyct = reports.reduce((s, r) => s + r.fyct_ytd, 0);
  const totalFyc  = reports.reduce((s, r) => s + r.fyc_ytd,  0);
  const totalAce  = reports.reduce((s, r) => s + r.ace_ytd,  0);
  const totalNoc  = reports.reduce((s, r) => s + r.noc_ytd,  0);

  const groupTarget          = DEFAULT_TARGET * Math.max(reports.length, 1);
  const groupTargetPct       = (totalFyc / groupTarget) * 100;
  const agentsTargetAchieved = reports.filter(r => r.fyc_ytd >= DEFAULT_TARGET).length;

  // ── Monthly group trend ──────────────────────────────────────────────────

  const monthlyTrend = MONTH_LABELS.slice(0, n).map((month, idx) => ({
    month,
    FYC:  reports.reduce((s, r) => s + (r.month_fyc?.[idx]  ?? 0), 0),
    FYCt: reports.reduce((s, r) => s + (r.month_fyct?.[idx] ?? 0), 0),
  }));

  // ── Sorted agents ────────────────────────────────────────────────────────

  const sortedReports = [...reports].sort((a, b) => b.fyc_ytd - a.fyc_ytd);

  // ── Downloads (ETL-standard format) ─────────────────────────────────────

  const buildRows = () => reports.map(r => {
    const fycPct  = (r.fyc_ytd  / DEFAULT_TARGET) * 100;
    const fyctPct = (r.fyct_ytd / DEFAULT_TARGET) * 100;
    const row: Record<string, unknown> = {
      'Agent Code':     r.agent_code,
      'Agent Name':     r.agent_name,
      'FYCt (YTD)':    r.fyct_ytd,
      '% FYCt':         `${fyctPct.toFixed(2)}%`,
      'FYC (YTD)':     r.fyc_ytd,
      '% FYC':          `${fycPct.toFixed(2)}%`,
      'Shortage (FYC)': Math.max(DEFAULT_TARGET - r.fyc_ytd, 0),
      'ACE (YTD)':     r.ace_ytd,
      'NOC (YTD)':     r.noc_ytd,
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
    XLSX.writeFile(wb, `VistaQ_GroupSalesReport_${selectedYear}.xlsx`);
  };

  const downloadCSV = () => {
    const rows = buildRows();
    const headers = Object.keys(rows[0] ?? {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => (r as any)[h]).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `VistaQ_GroupSalesReport_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

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
              Consolidated production analytics · {selectedYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Download
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
              <button onClick={downloadExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium">
                Excel Report
              </button>
              <button onClick={downloadCSV} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium border-t border-gray-100">
                CSV Report
              </button>
            </div>
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
            sub={`${groupTargetPct.toFixed(1)}% of group target`}
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

        {/* ── Section 2: Agent Leaderboard ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Agent Leaderboard</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Sorted by FYC · reference target {rm(DEFAULT_TARGET)} per agent
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{agentsTargetAchieved}</span>
                <span>of</span>
                <span className="font-semibold text-gray-700">{reports.length}</span>
                <span>reached target</span>
              </div>
            </div>

            {/* Group-level FYC progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span className="font-semibold text-green-700">Group FYC Progress</span>
                <span>{rm(totalFyc)} of {rm(groupTarget)} · {groupTargetPct.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all duration-700"
                  style={{ width: `${Math.min(groupTargetPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Agent table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">#</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Agent</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">FYCt YTD</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">FYC YTD</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Progress</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Target %</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">ACE</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">NOC</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedReports.map((r, idx) => {
                  const tPct   = (r.fyc_ytd / DEFAULT_TARGET) * 100;
                  const tColor = tPct >= 100 ? 'text-green-600' : tPct >= 75 ? 'text-blue-600' : tPct >= 25 ? 'text-amber-600' : 'text-red-500';
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-xs text-gray-400 font-bold">{idx + 1}</td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-800">
                        <div>
                          {r.agent_name}
                          <span className="ml-2 text-xs text-gray-400 font-normal">{r.agent_code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-blue-700 font-medium">{rm(r.fyct_ytd)}</td>
                      <td className="px-6 py-3 text-sm text-right text-green-700 font-medium">{rm(r.fyc_ytd)}</td>
                      <td className="px-6 py-3">
                        <MiniBar pct={tPct} />
                      </td>
                      <td className={`px-6 py-3 text-sm text-right font-bold ${tColor}`}>{tPct.toFixed(1)}%</td>
                      <td className="px-6 py-3 text-sm text-right text-gray-700">{rm(r.ace_ytd)}</td>
                      <td className="px-6 py-3 text-sm text-right text-gray-700">{r.noc_ytd}</td>
                      <td className="px-6 py-3 text-sm text-right text-red-500">{rm(Math.max(DEFAULT_TARGET - r.fyc_ytd, 0))}</td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td className="px-6 py-3" />
                  <td className="px-6 py-3 text-sm text-gray-900">Group Total</td>
                  <td className="px-6 py-3 text-sm text-right text-blue-700">{rm(totalFyct)}</td>
                  <td className="px-6 py-3 text-sm text-right text-green-700">{rm(totalFyc)}</td>
                  <td className="px-6 py-3" />
                  <td className="px-6 py-3 text-sm text-right text-gray-500">{groupTargetPct.toFixed(1)}% avg</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-900">{rm(totalAce)}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-900">{totalNoc}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-500">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 3: Monthly Group Trend ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Monthly Group Trend</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Month-by-month aggregate production across all group members
              </p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {([['both', 'FYC + FYCt'], ['fyc', 'FYC'], ['fyct', 'FYCt']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTrendMetric(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${trendMetric === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 md:p-8">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={(v: number) => rm(v)} />
                {(trendMetric === 'both' || trendMetric === 'fyc')  && <Bar dataKey="FYC"  fill="#22c55e" radius={[3, 3, 0, 0]} />}
                {(trendMetric === 'both' || trendMetric === 'fyct') && <Bar dataKey="FYCt" fill="#3b82f6" radius={[3, 3, 0, 0]} />}
                {trendMetric === 'both' && <Legend />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        </>
      )}

    </div>
  );
};

export default GroupSalesReport;
