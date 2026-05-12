import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { SalesReport as SalesReportType, MONTH_LABELS } from '../types';
import { CHART_COLORS } from '../constants/tokens';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Download, TrendingUp, Users, Target, Award,
  ChevronDown, AlertCircle, Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── helpers ────────────────────────────────────────────────────────────────

const rm = (v: number) => 'RM ' + Math.round(v).toLocaleString('en-MY');
const pct = (v: number) => (v * 100).toFixed(1) + '%';

const isThisMonth = (d: string | null | undefined) => {
  if (!d) return false;
  const dt = new Date(d);
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
};
const isThisYear = (d: string | null | undefined) => {
  if (!d) return false;
  return new Date(d).getFullYear() === new Date().getFullYear();
};

// ─── section nav ────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'milestone', label: 'Milestone' },
  { id: 'pipeline',  label: 'Pipeline'  },
  { id: 'products',  label: 'Products'  },
  { id: 'trends',    label: 'Trends'    },
];

// ─── TargetBar ───────────────────────────────────────────────────────────────

const TargetBar: React.FC<{
  label: string; value: number; target: number; shortage: number; fixedColor: string;
}> = ({ label, value, target, shortage, fixedColor }) => {
  const p = Math.min((value / target) * 100, 100);
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-semibold text-gray-700">{label}</span>
        <span className="text-base font-bold text-gray-900">{p.toFixed(1)}%</span>
      </div>
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-4 rounded-full ${fixedColor} transition-all duration-700 shadow-sm`} style={{ width: `${p}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-sm text-gray-500">
        <span>{rm(value)} of {rm(target)}</span>
        <span>Shortage: {rm(Math.max(shortage, 0))}</span>
      </div>
    </div>
  );
};

// ─── SectionCard ─────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ id: string; title: string; subtitle?: string; children: React.ReactNode }> = ({
  id, title, subtitle, children,
}) => (
  <div id={id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-6 md:p-8">{children}</div>
  </div>
);

// ─── main page ───────────────────────────────────────────────────────────────

const SalesReportPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { mySalesReport, isLoadingMySalesReport, refetchMySalesReport, getProspectsByScope } = useData();

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const n = currentMonth;

  const [selectedYear,  setSelectedYear]  = useState(currentYear);
  const [milestoneTab,  setMilestoneTab]  = useState<'mtd' | 'ytd'>('ytd');
  const [pipelineTab,   setPipelineTab]   = useState<'mtd' | 'ytd'>('ytd');
  const [trendPreset,   setTrendPreset]   = useState<'etl' | 'pipeline' | 'all'>('etl');

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { refetchMySalesReport(selectedYear); }, [selectedYear]);

  if (!currentUser) return null;

  // ─── Personal sales target (from localStorage until backend ships) ──────
  const salesTarget = parseFloat(localStorage.getItem(`salesTarget_${currentUser.id}`) ?? '0') || 400_000;
  const monthlyTarget = salesTarget / 12;

  // ─── ETL data ─────────────────────────────────────────────────────────────
  const myReport: SalesReportType | undefined = mySalesReport ?? undefined;
  const hasEtlData = myReport !== undefined;
  const isMilMtd = milestoneTab === 'mtd';

  // ─── Prospect data ────────────────────────────────────────────────────────
  const allProspects = getProspectsByScope(currentUser);

  const g = allProspects.filter(p => isThisMonth(p.prospect_entered_at)).length;
  const G = allProspects.filter(p => isThisYear(p.prospect_entered_at)).length;
  const h = allProspects.filter(p => isThisMonth(p.appointment_completed_at)).length;
  const H = allProspects.filter(p => isThisYear(p.appointment_completed_at)).length;
  const i = allProspects.filter(p => p.sales_parts_completed?.length && isThisMonth(p.sales_completed_at)).length;
  const I = allProspects.filter(p => p.sales_parts_completed?.length && isThisYear(p.sales_completed_at)).length;
  const j = allProspects.filter(p => p.sales_outcome === 'successful' && isThisMonth(p.sales_completed_at)).length;
  const J = allProspects.filter(p => p.sales_outcome === 'successful' && isThisYear(p.sales_completed_at)).length;

  const divOrDash = (num: number, den: number) => den === 0 ? '—' : pct(num / den);
  const isPipMtd = pipelineTab === 'mtd';

  // ─── Product summary ──────────────────────────────────────────────────────
  const successfulSales = allProspects.filter(p => p.sales_outcome === 'successful');
  const productMap: Record<string, { count: number; ace: number }> = {};
  for (const s of successfulSales) {
    for (const prod of s.products_sold ?? []) {
      if (!prod.productName) continue;
      if (!productMap[prod.productName]) productMap[prod.productName] = { count: 0, ace: 0 };
      productMap[prod.productName].count++;
      productMap[prod.productName].ace += prod.amount ?? 0;
    }
  }
  const productRows = Object.entries(productMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.ace - a.ace);
  const totalProdCount = productRows.reduce((s, r) => s + r.count, 0);
  const totalProdACE   = productRows.reduce((s, r) => s + r.ace,   0);

  // ─── Monthly trend data ───────────────────────────────────────────────────
  const trendData = MONTH_LABELS.slice(0, n).map((label, idx) => {
    const inMonth = (d: string | null | undefined) => {
      if (!d) return false;
      const dt = new Date(d);
      return dt.getFullYear() === selectedYear && dt.getMonth() === idx;
    };
    return {
      month: label,
      Prospects:      allProspects.filter(p => inMonth(p.prospect_entered_at)).length,
      Appointments:   allProspects.filter(p => inMonth(p.appointment_completed_at)).length,
      'Sales Meetings': allProspects.filter(p => p.sales_parts_completed?.length && inMonth(p.sales_completed_at)).length,
      Sales:          allProspects.filter(p => p.sales_outcome === 'successful' && inMonth(p.sales_completed_at)).length,
      FYCt: myReport?.month_fyct?.[idx] ?? 0,
      FYC:  myReport?.month_fyc?.[idx]  ?? 0,
      ACE:  myReport?.month_ace?.[idx]  ?? 0,
      NOC:  myReport?.month_noc?.[idx]  ?? 0,
    };
  });

  // ─── Monthly averages (for Trends header) ─────────────────────────────────
  const avgFyct = n > 0 ? (myReport?.fyct_ytd ?? 0) / n : 0;
  const avgFyc  = n > 0 ? (myReport?.fyc_ytd  ?? 0) / n : 0;
  const avgAce  = n > 0 ? (myReport?.ace_ytd  ?? 0) / n : 0;
  const avgNoc  = n > 0 ? (myReport?.noc_ytd  ?? 0) / n : 0;

  // ─── Download ─────────────────────────────────────────────────────────────
  const downloadExcel = () => {
    if (!myReport) return;
    const row: Record<string, unknown> = {
      'Agent Code': myReport.agent_code,
      'Agent Name': myReport.agent_name,
      'ACE (YTD)':  myReport.ace_ytd,
      'NOC (YTD)':  myReport.noc_ytd,
      'FYCt (YTD)': myReport.fyct_ytd,
      '% of Target (FYCt)': ((myReport.fyct_ytd / salesTarget) * 100).toFixed(1) + '%',
      'FYC (YTD)':  myReport.fyc_ytd,
      '% of Target (FYC)':  ((myReport.fyc_ytd  / salesTarget) * 100).toFixed(1) + '%',
      'Shortage (FYCt)':    Math.max(salesTarget - myReport.fyct_ytd, 0),
      'Shortage (FYC)':     Math.max(salesTarget - myReport.fyc_ytd,  0),
    };
    MONTH_LABELS.forEach((m, idx) => {
      row[`${m} ACE`]  = myReport.month_ace?.[idx]  ?? 0;
      row[`${m} NOC`]  = myReport.month_noc?.[idx]  ?? 0;
      row[`${m} FYCt`] = myReport.month_fyct?.[idx] ?? 0;
      row[`${m} FYC`]  = myReport.month_fyc?.[idx]  ?? 0;
    });
    const ws = XLSX.utils.json_to_sheet([row]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    XLSX.writeFile(wb, `VistaQ_SalesReport_${selectedYear}.xlsx`);
  };

  const downloadCSV = () => {
    if (!myReport) return;
    const row = {
      'Agent Code':  myReport.agent_code,
      'Agent Name':  myReport.agent_name,
      'ACE (YTD)':   myReport.ace_ytd,
      'NOC (YTD)':   myReport.noc_ytd,
      'FYCt (YTD)':  myReport.fyct_ytd,
      'FYC (YTD)':   myReport.fyc_ytd,
    };
    const headers = Object.keys(row);
    const csv = [headers.join(','), headers.map(h => row[h as keyof typeof row]).join(',')].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `VistaQ_SalesReport_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const monthsLeft = Math.max(12 - n, 0);
  const noEtlData  = !hasEtlData;

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-12">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your personal production & pipeline analytics</p>
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
              <button onClick={downloadExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium">Full Report (Excel)</button>
              <button onClick={downloadCSV}   className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium border-t border-gray-100">Export CSV</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section nav — dark blue ── */}
      <div className="sticky top-0 z-20 bg-slate-800 rounded-xl shadow-md px-4 py-3 flex gap-1 overflow-x-auto">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className="flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {isLoadingMySalesReport && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading sales data…</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — SALES MILESTONE
      ══════════════════════════════════════════════════════════════════════ */}
      <div ref={el => { sectionRefs.current['milestone'] = el; }}>
        <SectionCard
          id="milestone"
          title="Sales Milestone"
          subtitle={`Annual target: RM ${salesTarget.toLocaleString()} · ${monthsLeft} month${monthsLeft !== 1 ? 's' : ''} remaining`}
        >
          {noEtlData ? (
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl text-amber-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>No sales data for {selectedYear} yet. Contact your admin to upload the monthly ETL file.</span>
            </div>
          ) : (
            <>
              {/* Period toggle */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                  {(['mtd', 'ytd'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setMilestoneTab(p)}
                      className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${milestoneTab === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {p === 'mtd' ? 'Month to Date' : 'Year to Date'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stat cards — 2×2 on mobile, 4 cols on md+ */}
              {myReport && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    {
                      label: `FYCt ${milestoneTab.toUpperCase()}`,
                      value: isMilMtd ? rm(myReport.month_fyct?.[n - 1] ?? 0) : rm(myReport.fyct_ytd),
                      sub:   isMilMtd
                        ? `${(((myReport.month_fyct?.[n - 1] ?? 0) / monthlyTarget) * 100).toFixed(1)}% of monthly target`
                        : `${((myReport.fyct_ytd / salesTarget) * 100).toFixed(1)}% of annual target`,
                      bg: 'bg-blue-50', icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
                    },
                    {
                      label: `FYC ${milestoneTab.toUpperCase()}`,
                      value: isMilMtd ? rm(myReport.month_fyc?.[n - 1] ?? 0) : rm(myReport.fyc_ytd),
                      sub:   isMilMtd
                        ? `${(((myReport.month_fyc?.[n - 1] ?? 0) / monthlyTarget) * 100).toFixed(1)}% of monthly target`
                        : `${((myReport.fyc_ytd / salesTarget) * 100).toFixed(1)}% of annual target`,
                      bg: 'bg-green-50', icon: <Award className="w-5 h-5 text-green-600" />,
                    },
                    {
                      label: `ACE ${milestoneTab.toUpperCase()}`,
                      value: isMilMtd ? rm(myReport.month_ace?.[n - 1] ?? 0) : rm(myReport.ace_ytd),
                      sub:   'Annualised contribution',
                      bg: 'bg-emerald-50', icon: <Target className="w-5 h-5 text-emerald-600" />,
                    },
                    {
                      label: `NOC ${milestoneTab.toUpperCase()}`,
                      value: isMilMtd ? String(myReport.month_noc?.[n - 1] ?? 0) : String(myReport.noc_ytd),
                      sub:   'Number of cases',
                      bg: 'bg-purple-50', icon: <Users className="w-5 h-5 text-purple-600" />,
                    },
                  ].map(card => (
                    <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 flex flex-col">
                      <div className="flex items-center mb-3">
                        <div className={`p-2 ${card.bg} rounded-lg mr-3`}>{card.icon}</div>
                        <p className="text-xs font-semibold text-gray-500 uppercase leading-tight">{card.label}</p>
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">{card.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Sales Target Progress bars — always YTD vs annual target */}
              {myReport && (
                <div className="p-5 md:p-6 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
                    Sales Target Progress · Annual target {rm(salesTarget)}
                  </p>
                  <TargetBar
                    label="FYC"
                    value={myReport.fyc_ytd}
                    target={salesTarget}
                    shortage={Math.max(salesTarget - myReport.fyc_ytd, 0)}
                    fixedColor="bg-green-500"
                  />
                  <TargetBar
                    label="FYCt"
                    value={myReport.fyct_ytd}
                    target={salesTarget}
                    shortage={Math.max(salesTarget - myReport.fyct_ytd, 0)}
                    fixedColor="bg-blue-500"
                  />
                </div>
              )}
            </>
          )}
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — PIPELINE
      ══════════════════════════════════════════════════════════════════════ */}
      <div ref={el => { sectionRefs.current['pipeline'] = el; }}>
        <SectionCard
          id="pipeline"
          title="Pipeline"
          subtitle="Stage progression and conversion rates — from prospect data"
        >
          {/* MTD / YTD toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
            {(['mtd', 'ytd'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPipelineTab(p)}
                className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${pipelineTab === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {p === 'mtd' ? 'Month to Date' : 'Year to Date'}
              </button>
            ))}
          </div>

          {/* Stage funnel — 2×2 on mobile, 4 cols on md+ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Prospects',     value: isPipMtd ? g : G, color: 'text-blue-600',   bg: 'bg-blue-50'   },
              { label: 'Appointments',  value: isPipMtd ? h : H, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Sales Meetings',value: isPipMtd ? i : I, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Sales',         value: isPipMtd ? j : J, color: 'text-green-600',  bg: 'bg-green-50'  },
            ].map(chip => (
              <div key={chip.label} className={`${chip.bg} rounded-xl p-4 text-center`}>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{chip.value}</p>
                <p className={`text-xs font-semibold mt-1 ${chip.color}`}>{chip.label}</p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-6" />

          {/* Conversion rates — 3 numbers */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Conversion Rates</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Appointment Rate', mtd: divOrDash(h, g), ytd: divOrDash(H, G) },
              { label: 'Show-up Rate',     mtd: divOrDash(i, h), ytd: divOrDash(I, H) },
              { label: 'Closing Rate',     mtd: divOrDash(j, i), ytd: divOrDash(J, I) },
            ].map(rate => (
              <div key={rate.label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <p className="text-xl md:text-2xl font-bold text-gray-900">{isPipMtd ? rate.mtd : rate.ytd}</p>
                <p className="text-xs font-semibold text-gray-500 mt-1 leading-tight">{rate.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isPipMtd ? 'MTD' : 'YTD'}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — PRODUCTS
      ══════════════════════════════════════════════════════════════════════ */}
      <div ref={el => { sectionRefs.current['products'] = el; }}>
        <SectionCard
          id="products"
          title="Product Summary"
          subtitle="Cumulative — all successful sales"
        >
          {productRows.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No successful sales recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Simplified 3-column table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Product</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Cases</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total ACE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {productRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.name}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">{r.count}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">{rm(r.ace)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{totalProdCount}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{rm(totalProdACE)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pie chart — desktop only */}
              <div className="hidden md:block">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={productRows}
                      dataKey="ace"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {productRows.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => rm(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — TRENDS
      ══════════════════════════════════════════════════════════════════════ */}
      <div ref={el => { sectionRefs.current['trends'] = el; }}>
        <SectionCard
          id="trends"
          title="Monthly Trends"
          subtitle="Month-by-month production breakdown"
        >
          {/* Monthly averages row */}
          {myReport && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Avg FYCt / Month', value: rm(avgFyct), color: 'text-blue-600'   },
                { label: 'Avg FYC / Month',  value: rm(avgFyc),  color: 'text-green-600'  },
                { label: 'Avg ACE / Month',  value: rm(avgAce),  color: 'text-emerald-600'},
                { label: 'Avg NOC / Month',  value: avgNoc.toFixed(1), color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Preset toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-5">
            {([
              { key: 'etl',      label: 'ETL (FYCt / FYC / ACE / NOC)' },
              { key: 'pipeline', label: 'Pipeline'                       },
              { key: 'all',      label: 'All'                            },
            ] as const).map(preset => (
              <button
                key={preset.key}
                onClick={() => setTrendPreset(preset.key)}
                className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${trendPreset === preset.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {/* ETL lines */}
              {(trendPreset === 'etl' || trendPreset === 'all') && myReport && (
                <>
                  <Line yAxisId="left" type="monotone" dataKey="FYCt" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                  <Line yAxisId="left" type="monotone" dataKey="FYC"  stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                  <Line yAxisId="left" type="monotone" dataKey="ACE"  stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                  <Line yAxisId="right" type="monotone" dataKey="NOC" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                </>
              )}
              {/* Pipeline lines */}
              {(trendPreset === 'pipeline' || trendPreset === 'all') && (
                <>
                  <Line yAxisId="right" type="monotone" dataKey="Prospects"      stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="Appointments"   stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="Sales Meetings" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="Sales"          stroke={CHART_COLORS[3]} strokeWidth={2} dot={{ r: 3 }} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

    </div>
  );
};

export default SalesReportPage;
