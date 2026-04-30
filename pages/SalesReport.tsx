import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, SalesReport as SalesReportType, MDRT_TARGET, MONTH_LABELS, ProspectStage } from '../types';
import { CHART_COLORS } from '../constants/tokens';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Download, TrendingUp, BarChart2, Users, Target,
  ChevronDown, Award, AlertCircle, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── demo / mock data (used when no ETL upload exists yet) ──────────────────

const MOCK_SALES_REPORT: SalesReportType = {
  id: 'mock-001',
  agent_id: 'mock-agent',
  agent_code: 'T75040K',
  agent_name: 'Sarah Tan Mei Ling',
  year: new Date().getFullYear(),
  imported_at: new Date().toISOString(),
  // YTD (Jan–May, n=5)
  ace_ytd:  312_500,
  noc_ytd:  9,
  fyct_ytd: 156_000,
  fyct_pct: 39.0,
  mdrt_shortage_fyct: 244_000,
  fyc_ytd:  148_200,
  fyc_pct:  37.05,
  mdrt_shortage_fyc:  251_800,
  // Monthly ACE  Jan     Feb     Mar     Apr     May    Jun–Dec
  month_ace:  [48000, 55000, 70000, 82000, 57500,   0,0,0,0,0,0,0],
  month_noc:  [    1,     2,     2,     3,     1,   0,0,0,0,0,0,0],
  month_fyct: [28000, 31000, 38500, 40000, 18500,   0,0,0,0,0,0,0],
  month_fyc:  [24000, 28500, 36000, 38200, 21500,   0,0,0,0,0,0,0],
};

// Mock prospects for widgets 3-5 when the API returns none
const MOCK_PROSPECTS_DATA = [
  // Successful sales with products
  { stage: 'sales', outcome: 'successful', product: 'Medical Card', amount: 48000, enteredAt: '2026-01-05', apptDate: '2026-01-10', completedAt: '2026-01-18' },
  { stage: 'sales', outcome: 'successful', product: 'Investment Link', amount: 55000, enteredAt: '2026-01-20', apptDate: '2026-01-28', completedAt: '2026-02-05' },
  { stage: 'sales', outcome: 'successful', product: 'Medical Card', amount: 32000, enteredAt: '2026-02-03', apptDate: '2026-02-10', completedAt: '2026-02-20' },
  { stage: 'sales', outcome: 'successful', product: 'Term Life', amount: 70000, enteredAt: '2026-03-01', apptDate: '2026-03-08', completedAt: '2026-03-22' },
  { stage: 'sales', outcome: 'successful', product: 'Investment Link', amount: 82000, enteredAt: '2026-03-15', apptDate: '2026-03-22', completedAt: '2026-04-10' },
  { stage: 'sales', outcome: 'successful', product: 'Medical Card', amount: 28000, enteredAt: '2026-04-02', apptDate: '2026-04-09', completedAt: '2026-04-18' },
  { stage: 'sales', outcome: 'successful', product: 'Takaful Savings', amount: 42000, enteredAt: '2026-04-10', apptDate: '2026-04-17', completedAt: '2026-04-30' },
  { stage: 'sales', outcome: 'successful', product: 'Term Life', amount: 35000, enteredAt: '2026-04-22', apptDate: '2026-04-29', completedAt: '2026-05-08' },
  { stage: 'sales', outcome: 'successful', product: 'Investment Link', amount: 57500, enteredAt: '2026-05-01', apptDate: '2026-05-07', completedAt: '2026-05-15' },
  // Unsuccessful / KIV
  { stage: 'sales', outcome: 'unsuccessful', product: '', amount: 0, enteredAt: '2026-02-15', apptDate: '2026-02-22', completedAt: '2026-03-01' },
  { stage: 'sales', outcome: 'unsuccessful', product: '', amount: 0, enteredAt: '2026-03-20', apptDate: '2026-03-28', completedAt: '2026-04-05' },
  { stage: 'sales', outcome: 'kiv', product: '', amount: 0, enteredAt: '2026-05-05', apptDate: '2026-05-12', completedAt: '2026-05-20' },
  // Still in appointment stage
  { stage: 'appointment', outcome: null, product: '', amount: 0, enteredAt: '2026-04-25', apptDate: '2026-05-03', completedAt: null },
  { stage: 'appointment', outcome: null, product: '', amount: 0, enteredAt: '2026-05-10', apptDate: '2026-05-17', completedAt: null },
  // Still prospect
  { stage: 'prospect', outcome: null, product: '', amount: 0, enteredAt: '2026-05-20', apptDate: null, completedAt: null },
  { stage: 'prospect', outcome: null, product: '', amount: 0, enteredAt: '2026-05-22', apptDate: null, completedAt: null },
];

// ─── helpers ────────────────────────────────────────────────────────────────

const rm = (v: number) =>
  'RM ' + Math.round(v).toLocaleString('en-MY');

const pct = (v: number) =>
  (v * 100).toFixed(1) + '%';

const daysBetween = (a: string | null | undefined, b: string | null | undefined): number | null => {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return null;
  return Math.round(Math.abs(db - da) / 86400000);
};

const agingBucket = (days: number): string => {
  if (days <= 7) return '≤ 7d';
  if (days <= 14) return '≤ 14d';
  if (days <= 21) return '≤ 21d';
  if (days <= 28) return '≤ 28d';
  return '> 28d';
};
const AGING_BUCKETS = ['≤ 7d', '≤ 14d', '≤ 21d', '≤ 28d', '> 28d'];

const isThisMonth = (dateStr: string | null | undefined): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const isThisYear = (dateStr: string | null | undefined): boolean => {
  if (!dateStr) return false;
  return new Date(dateStr).getFullYear() === new Date().getFullYear();
};

// ─── section nav ────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'milestone', label: 'Milestone' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'effectiveness', label: 'Effectiveness' },
  { id: 'efficiency', label: 'Efficiency' },
  { id: 'products', label: 'Products' },
  { id: 'trends', label: 'Trends' },
];

// ─── sub-components ─────────────────────────────────────────────────────────

const SectionCard: React.FC<{ id: string; title: string; subtitle?: string; children: React.ReactNode }> = ({
  id, title, subtitle, children
}) => (
  <div id={id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="p-8">{children}</div>
  </div>
);

const MiniTable: React.FC<{ headers: string[]; rows: (string | number | React.ReactNode)[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100">
          {headers.map((h, i) => (
            <th key={i} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((row, ri) => (
          <tr key={ri} className="hover:bg-gray-50/50">
            {row.map((cell, ci) => (
              <td key={ci} className={`px-6 py-3 text-sm ${ci === 0 ? 'font-medium text-gray-800' : 'text-right text-gray-700'}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MdrtBar: React.FC<{ label: string; value: number; target: number; shortage: number }> = ({
  label, value, target, shortage
}) => {
  const pctVal = Math.min((value / target) * 100, 100);
  const color = pctVal < 25 ? 'bg-red-500' : pctVal < 75 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-semibold text-gray-700">{label}</span>
        <span className="text-base font-bold text-gray-900">{pctVal.toFixed(1)}%</span>
      </div>
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-4 rounded-full ${color} transition-all duration-700 shadow-sm`} style={{ width: `${pctVal}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-sm text-gray-500">
        <span>{rm(value)} of {rm(target)}</span>
        <span>Shortage: {rm(Math.max(shortage, 0))}</span>
      </div>
    </div>
  );
};

// ─── main page ───────────────────────────────────────────────────────────────

const SalesReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { salesReports, isLoadingSalesReports, refetchSalesReports, getProspectsByScope, prospects } = useData();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-based
  const n = currentMonth; // month number for productivity formula

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [kpiTab, setKpiTab] = useState<'fyct' | 'fyc' | 'ace' | 'noc'>('fyct');
  const [periodTab, setPeriodTab] = useState<'mtd' | 'ytd'>('ytd');
  // Default to demo — stays on until real ETL data is confirmed available
  const [demoMode, setDemoMode] = useState(true);
  const [trendLines, setTrendLines] = useState<Record<string, boolean>>({
    Prospects: true, Appointments: false, 'Sales Meetings': false, Sales: true,
    FYCt: true, FYC: false, ACE: false, NOC: false,
  });

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch on mount / year change
  useEffect(() => { refetchSalesReports(selectedYear); }, [selectedYear]);

  // Auto-exit demo mode once real ETL data has loaded
  useEffect(() => {
    if (salesReports.length > 0 && !isLoadingSalesReports) {
      setDemoMode(false);
    }
  }, [salesReports, isLoadingSalesReports]);

  if (!currentUser) return null;

  const isManagement = currentUser.role === UserRole.ADMIN
    || currentUser.role === UserRole.MASTER_TRAINER
    || currentUser.role === UserRole.TRAINER;

  // ─── ETL data — use mock when demo mode is on or no real data ────────────

  const hasRealEtlData = salesReports.length > 0;
  const effectiveSalesReports = demoMode || !hasRealEtlData
    ? [{ ...MOCK_SALES_REPORT, agent_id: currentUser.id }]
    : salesReports;

  const myReport: SalesReportType | undefined = isManagement
    ? undefined
    : effectiveSalesReports.find(r => r.agent_id === currentUser.id) ?? effectiveSalesReports[0];

  // ─── Prospect data — use mock when demo mode is on ────────────────────────

  const realProspects = getProspectsByScope(currentUser);
  const mockProspects = MOCK_PROSPECTS_DATA.map((d, idx) => ({
    id: `mock-p-${idx}`,
    agent_id: currentUser.id,
    tenant_id: '',
    prospect_name: `Demo Client ${idx + 1}`,
    prospect_email: null,
    prospect_phone: null,
    current_stage: d.stage as any,
    prospect_entered_at: d.enteredAt,
    appointment_date: d.apptDate ?? undefined,
    appointment_completed_at: d.apptDate,
    sales_parts_completed: d.stage === 'sales' ? ['social', 'factFind'] as any : [],
    products_sold: d.product ? [{ productName: d.product, amount: d.amount }] : [],
    sales_outcome: d.outcome as any,
    sales_completed_at: d.completedAt,
    created_at: d.enteredAt,
    updated_at: d.completedAt ?? d.enteredAt,
  }));

  const allProspects = (demoMode || realProspects.length === 0) ? mockProspects as any[] : realProspects;

  // Effectiveness counts — using YTD (current year) and MTD filters
  const prospectsMTD = allProspects.filter(p => isThisMonth(p.prospect_entered_at));
  const prospectsYTD = allProspects.filter(p => isThisYear(p.prospect_entered_at));

  const apptMTD = allProspects.filter(p => isThisMonth(p.appointment_completed_at));
  const apptYTD = allProspects.filter(p => isThisYear(p.appointment_completed_at));

  const meetingMTD = allProspects.filter(p => p.sales_parts_completed?.length && isThisMonth(p.sales_completed_at));
  const meetingYTD = allProspects.filter(p => p.sales_parts_completed?.length && isThisYear(p.sales_completed_at));

  const salesMTD = allProspects.filter(p => p.sales_outcome === 'successful' && isThisMonth(p.sales_completed_at));
  const salesYTD = allProspects.filter(p => p.sales_outcome === 'successful' && isThisYear(p.sales_completed_at));

  const g = prospectsMTD.length, G = prospectsYTD.length;
  const h = apptMTD.length, H = apptYTD.length;
  const i = meetingMTD.length, I = meetingYTD.length;
  const j = salesMTD.length, J = salesYTD.length;

  const divOrDash = (num: number, den: number) =>
    den === 0 ? '—' : pct(num / den);

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
  const totalProdACE = productRows.reduce((s, r) => s + r.ace, 0);

  // ─── Aging ────────────────────────────────────────────────────────────────

  const prospectAgingCounts = Object.fromEntries(AGING_BUCKETS.map(b => [b, 0]));
  for (const p of allProspects) {
    const d = daysBetween(p.prospect_entered_at, p.appointment_date);
    if (d !== null) prospectAgingCounts[agingBucket(d)]++;
  }

  const meetingAgingCounts = Object.fromEntries(AGING_BUCKETS.map(b => [b, 0]));
  for (const p of allProspects) {
    const d = daysBetween(p.appointment_date, p.sales_completed_at);
    if (d !== null) meetingAgingCounts[agingBucket(d)]++;
  }

  // ─── Monthly trend data ───────────────────────────────────────────────────

  const trendData = MONTH_LABELS.slice(0, n).map((label, idx) => {
    const month1 = idx + 1; // 1-based
    const inMonth = (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getFullYear() === selectedYear && d.getMonth() === idx;
    };
    return {
      month: label,
      Prospects: allProspects.filter(p => inMonth(p.prospect_entered_at)).length,
      Appointments: allProspects.filter(p => inMonth(p.appointment_completed_at)).length,
      'Sales Meetings': allProspects.filter(p => p.sales_parts_completed?.length && inMonth(p.sales_completed_at)).length,
      Sales: allProspects.filter(p => p.sales_outcome === 'successful' && inMonth(p.sales_completed_at)).length,
      FYCt: myReport?.month_fyct?.[idx] ?? 0,
      FYC: myReport?.month_fyc?.[idx] ?? 0,
      ACE: myReport?.month_ace?.[idx] ?? 0,
      NOC: myReport?.month_noc?.[idx] ?? 0,
    };
  });

  // ─── Widget 1 KPI data ────────────────────────────────────────────────────

  const kpiConfig = {
    fyct: {
      label: 'FYCt',
      ytd: myReport?.fyct_ytd ?? 0,
      ytdTarget: MDRT_TARGET,
      mtd: myReport?.month_fyct?.[n - 1] ?? 0,
      mtdTarget: MDRT_TARGET / 12,
      isMonetary: true,
    },
    fyc: {
      label: 'FYC',
      ytd: myReport?.fyc_ytd ?? 0,
      ytdTarget: MDRT_TARGET,
      mtd: myReport?.month_fyc?.[n - 1] ?? 0,
      mtdTarget: MDRT_TARGET / 12,
      isMonetary: true,
    },
    ace: {
      label: 'ACE',
      ytd: myReport?.ace_ytd ?? 0,
      ytdTarget: MDRT_TARGET,
      mtd: myReport?.month_ace?.[n - 1] ?? 0,
      mtdTarget: MDRT_TARGET / 12,
      isMonetary: true,
    },
    noc: {
      label: 'NOC',
      ytd: myReport?.noc_ytd ?? 0,
      ytdTarget: 0, // configurable — shown as N/A until set
      mtd: myReport?.month_noc?.[n - 1] ?? 0,
      mtdTarget: 0,
      isMonetary: false,
    },
  };
  const kpi = kpiConfig[kpiTab];
  const isMtd = periodTab === 'mtd';
  const kpiValue  = isMtd ? kpi.mtd : kpi.ytd;
  const kpiTarget = isMtd ? kpi.mtdTarget : kpi.ytdTarget;
  const kpiDiff   = kpiValue - kpiTarget;
  const kpiPct    = kpiTarget > 0 ? (kpiValue / kpiTarget) * 100 : 0;
  const monthsLeft = Math.max(12 - n, 0);

  // ─── Download ─────────────────────────────────────────────────────────────

  const downloadExcel = () => {
    const rows = effectiveSalesReports.map(r => {
      const row: Record<string, unknown> = {
        'Agent Code': r.agent_code,
        'Agent Name': r.agent_name,
        'ACE (YTD)': r.ace_ytd,
        'NOC (YTD)': r.noc_ytd,
        'FYCt (YTD)': r.fyct_ytd,
        '% FYCt': r.fyct_pct,
        'MDRT Shortage (FYCt)': r.mdrt_shortage_fyct,
        'FYC (YTD)': r.fyc_ytd,
        '% FYC': r.fyc_pct,
        'MDRT Shortage (FYC)': r.mdrt_shortage_fyc,
      };
      MONTH_LABELS.forEach((m, idx) => {
        row[`${m} ACE`] = r.month_ace?.[idx] ?? 0;
        row[`${m} NOC`] = r.month_noc?.[idx] ?? 0;
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    XLSX.writeFile(wb, `VistaQ_SalesReport_${selectedYear}.xlsx`);
  };

  const downloadCSV = () => {
    const rows = effectiveSalesReports.map(r => ({
      'Agent Code': r.agent_code,
      'Agent Name': r.agent_name,
      'ACE (YTD)': r.ace_ytd,
      'NOC (YTD)': r.noc_ytd,
      'FYCt (YTD)': r.fyct_ytd,
      'FYC (YTD)': r.fyc_ytd,
    }));
    const headers = Object.keys(rows[0] ?? {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h as keyof typeof r]).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `VistaQ_SalesReport_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── scroll to section ────────────────────────────────────────────────────

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─── empty ETL state ──────────────────────────────────────────────────────

  const noEtlData = false; // always show data — real or mock

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-12">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isManagement ? 'Team-wide production & pipeline analytics' : 'Your personal production & pipeline analytics'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Demo toggle (when real data exists) */}
          {hasRealEtlData && (
            <button
              onClick={() => setDemoMode(v => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                demoMode ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {demoMode ? '⚠ Demo On' : 'Demo'}
            </button>
          )}

          {/* Download */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Download
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
              <button onClick={downloadExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium">
                Full Report (Excel)
              </button>
              <button onClick={downloadCSV} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium border-t border-gray-100">
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section nav ── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm px-4 py-3 flex gap-1 overflow-x-auto">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className="flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Demo mode banner ── */}
      {(!hasRealEtlData || demoMode) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
            <span>
              {demoMode
                ? 'Demo mode — showing sample data. Toggle off to see real data.'
                : 'No ETL data uploaded yet — showing sample data so you can preview all widgets.'}
            </span>
          </div>
          <button
            onClick={() => setDemoMode(v => !v)}
            className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
              demoMode
                ? 'bg-amber-200 text-amber-800 border-amber-300 hover:bg-amber-300'
                : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'
            }`}
          >
            {demoMode ? 'Exit Demo' : 'View Demo'}
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoadingSalesReports && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading sales data…</span>
        </div>
      )}

      {/* ── Widget 1 — Sales Performance Milestone ── */}
      <div ref={el => { sectionRefs.current['milestone'] = el; }}>
        <SectionCard
          id="milestone"
          title="Sales Performance Milestone"
          subtitle="MDRT target: RM 400,000"
        >
          {noEtlData ? (
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl text-amber-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>No sales data for {selectedYear} yet. Contact your admin to upload the monthly ETL file.</span>
            </div>
          ) : (
            <>
              {/* ── Period toggle (MTD / YTD) — drives entire widget ── */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                  {(['mtd', 'ytd'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriodTab(p)}
                      className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${periodTab === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {p === 'mtd' ? 'Month to Date' : 'Year to Date'}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-blue-600 font-medium">{monthsLeft} months remaining</span>
              </div>

              {/* ── Stat cards — values swap with period toggle ── */}
              {myReport && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {([
                    {
                      label: `FYCt ${periodTab.toUpperCase()}`,
                      value: isMtd ? rm(myReport.month_fyct?.[n - 1] ?? 0) : rm(myReport.fyct_ytd),
                      sub: isMtd
                        ? `${((( myReport.month_fyct?.[n - 1] ?? 0) / (MDRT_TARGET / 12)) * 100).toFixed(1)}% of monthly target`
                        : `${myReport.fyct_pct.toFixed(1)}% of annual target`,
                      bg: 'bg-blue-50', icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
                    },
                    {
                      label: `FYC ${periodTab.toUpperCase()}`,
                      value: isMtd ? rm(myReport.month_fyc?.[n - 1] ?? 0) : rm(myReport.fyc_ytd),
                      sub: isMtd
                        ? `${(((myReport.month_fyc?.[n - 1] ?? 0) / (MDRT_TARGET / 12)) * 100).toFixed(1)}% of monthly target`
                        : `${myReport.fyc_pct.toFixed(1)}% of annual target`,
                      bg: 'bg-indigo-50', icon: <Award className="w-5 h-5 text-indigo-600" />,
                    },
                    {
                      label: `ACE ${periodTab.toUpperCase()}`,
                      value: isMtd ? rm(myReport.month_ace?.[n - 1] ?? 0) : rm(myReport.ace_ytd),
                      sub: 'Annualised contribution',
                      bg: 'bg-emerald-50', icon: <Target className="w-5 h-5 text-emerald-600" />,
                    },
                    {
                      label: `NOC ${periodTab.toUpperCase()}`,
                      value: isMtd ? String(myReport.month_noc?.[n - 1] ?? 0) : String(myReport.noc_ytd),
                      sub: 'Number of cases',
                      bg: 'bg-purple-50', icon: <Users className="w-5 h-5 text-purple-600" />,
                    },
                  ] as { label: string; value: string; sub: string; bg: string; icon: React.ReactNode }[]).map(card => (
                    <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
                      <div className="flex items-center mb-3">
                        <div className={`p-2 ${card.bg} rounded-lg mr-3`}>{card.icon}</div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">{card.label}</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── MDRT progress bars — values swap with period toggle ── */}
              {myReport && (
                <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      MDRT Progress · {isMtd ? `Monthly target ${rm(MDRT_TARGET / 12)}` : `Annual target ${rm(MDRT_TARGET)}`}
                    </span>
                  </div>
                  <MdrtBar
                    label="FYC"
                    value={isMtd ? (myReport.month_fyc?.[n - 1] ?? 0) : myReport.fyc_ytd}
                    target={isMtd ? MDRT_TARGET / 12 : MDRT_TARGET}
                    shortage={isMtd
                      ? Math.max(MDRT_TARGET / 12 - (myReport.month_fyc?.[n - 1] ?? 0), 0)
                      : myReport.mdrt_shortage_fyc}
                  />
                  <MdrtBar
                    label="FYCt"
                    value={isMtd ? (myReport.month_fyct?.[n - 1] ?? 0) : myReport.fyct_ytd}
                    target={isMtd ? MDRT_TARGET / 12 : MDRT_TARGET}
                    shortage={isMtd
                      ? Math.max(MDRT_TARGET / 12 - (myReport.month_fyct?.[n - 1] ?? 0), 0)
                      : myReport.mdrt_shortage_fyct}
                  />
                </div>
              )}

              {/* ── KPI metric toggle ── */}
              <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
                {(['fyct', 'fyc', 'ace', 'noc'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setKpiTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${kpiTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {kpiConfig[tab].label}
                  </button>
                ))}
              </div>

              {/* ── KPI table — columns reflect selected period ── */}
              <MiniTable
                headers={['', `${isMtd ? 'MTD' : 'YTD'} %`, isMtd ? 'MTD Value' : 'YTD Value', 'Target', 'Difference']}
                rows={[
                  [
                    'Achieved',
                    kpiTarget > 0 ? `${kpiPct.toFixed(1)}%` : '—',
                    kpi.isMonetary ? rm(kpiValue) : String(kpiValue),
                    kpi.isMonetary && kpiTarget > 0 ? rm(kpiTarget) : kpiTarget > 0 ? String(Math.round(kpiTarget)) : '—',
                    kpiTarget > 0
                      ? <span className={kpiDiff >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {kpiDiff >= 0 ? '+' : ''}{kpi.isMonetary ? rm(kpiDiff) : String(Math.round(kpiDiff))}
                        </span>
                      : '—',
                  ],
                  [
                    'Target',
                    kpiTarget > 0 ? '100%' : '—',
                    kpi.isMonetary && kpiTarget > 0 ? rm(kpiTarget) : kpiTarget > 0 ? String(Math.round(kpiTarget)) : '—',
                    '—',
                    '—',
                  ],
                  [
                    'Difference',
                    kpiTarget > 0 ? `${(kpiPct - 100).toFixed(1)}%` : '—',
                    kpiTarget > 0
                      ? <span className={kpiDiff >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {kpiDiff >= 0 ? '+' : ''}{kpi.isMonetary ? rm(kpiDiff) : String(Math.round(kpiDiff))}
                        </span>
                      : '—',
                    '—',
                    '—',
                  ],
                ]}
              />
            </>
          )}
        </SectionCard>
      </div>

      {/* ── Widget 2 — Productivity Per Month ── */}
      <div ref={el => { sectionRefs.current['productivity'] = el; }}>
        <SectionCard
          id="productivity"
          title="Productivity Per Month"
          subtitle={`Calculated as YTD ÷ ${n} (months elapsed)`}
        >
          {noEtlData ? (
            <p className="text-sm text-gray-400 italic">Awaiting ETL data upload.</p>
          ) : (
            <>
              <MiniTable
                headers={['Metric', 'Monthly Productivity', 'YTD Total']}
                rows={[
                  ['FYCt', rm((myReport?.fyct_ytd ?? 0) / n), rm(myReport?.fyct_ytd ?? 0)],
                  ['FYC', rm((myReport?.fyc_ytd ?? 0) / n), rm(myReport?.fyc_ytd ?? 0)],
                  ['ACE', rm((myReport?.ace_ytd ?? 0) / n), rm(myReport?.ace_ytd ?? 0)],
                  ['NOC', ((myReport?.noc_ytd ?? 0) / n).toFixed(1), String(myReport?.noc_ytd ?? 0)],
                  ['ACS (ACE/NOC)', myReport && myReport.noc_ytd > 0 ? rm(myReport.ace_ytd / myReport.noc_ytd) : '—', '—'],
                ]}
              />

              {/* Monthly trend chart */}
              <div className="mt-8">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Monthly Trend</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip formatter={(v: number) => rm(v)} />
                    <Legend />
                    <Bar dataKey="ACE" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="FYCt" fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* ── Widget 3 — Sales Effectiveness ── */}
      <div ref={el => { sectionRefs.current['effectiveness'] = el; }}>
        <SectionCard
          id="effectiveness"
          title="Sales Effectiveness"
          subtitle="Pipeline stage progression — from prospect data"
        >
          <MiniTable
            headers={['Stage', 'MTD', 'YTD', 'Per Month (YTD/n)']}
            rows={[
              ['Prospect', g, G, (G / n).toFixed(1)],
              ['Appointment', h, H, (H / n).toFixed(1)],
              ['Sales Meeting', i, I, (I / n).toFixed(1)],
              ['Sales', j, J, (J / n).toFixed(1)],
            ]}
          />
        </SectionCard>
      </div>

      {/* ── Widget 4 — Sales Efficiency + Aging ── */}
      <div ref={el => { sectionRefs.current['efficiency'] = el; }}>
        <SectionCard
          id="efficiency"
          title="Sales Efficiency & Aging"
          subtitle="Conversion rates and pipeline timing"
        >
          {/* Efficiency table */}
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Conversion Rates</p>
          <MiniTable
            headers={['Metric', 'MTD', 'YTD', 'Per Month']}
            rows={[
              ['Appointment Rate', divOrDash(h, g), divOrDash(H, G), divOrDash(H, G)],
              ['Show-up Rate', divOrDash(i, h), divOrDash(I, H), divOrDash(I, H)],
              ['Closing Rate', divOrDash(j, i), divOrDash(J, I), divOrDash(J, I)],
            ]}
          />

          {/* Prospect aging */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Prospect Aging</p>
              <p className="text-sm text-gray-400 mb-4">Days from prospect creation → appointment date</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={AGING_BUCKETS.map(b => ({ name: b, count: prospectAgingCounts[b] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Meeting Aging</p>
              <p className="text-sm text-gray-400 mb-4">Days from appointment → sales completion</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={AGING_BUCKETS.map(b => ({ name: b, count: meetingAgingCounts[b] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Widget 5 — Product Summary ── */}
      <div ref={el => { sectionRefs.current['products'] = el; }}>
        <SectionCard
          id="products"
          title="Product Summary"
          subtitle="Cumulative — all successful sales across all months"
        >
          {productRows.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No successful sales recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Product</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Cases</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">% (No.)</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total ACE</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">% (ACE)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {productRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-800">{r.name}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-700">{r.count}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-700">{totalProdCount > 0 ? pct(r.count / totalProdCount) : '—'}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-700">{rm(r.ace)}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-700">{totalProdACE > 0 ? pct(r.ace / totalProdACE) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 font-bold bg-gray-50">
                      <td className="px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                      <td className="px-6 py-3 text-sm font-bold text-right text-gray-900">{totalProdCount}</td>
                      <td className="px-6 py-3 text-sm font-bold text-right text-gray-900">100%</td>
                      <td className="px-6 py-3 text-sm font-bold text-right text-gray-900">{rm(totalProdACE)}</td>
                      <td className="px-6 py-3 text-sm font-bold text-right text-gray-900">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pie chart */}
              <div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={productRows}
                      dataKey="ace"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
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

      {/* ── Widget 6 — Monthly Progress Chart ── */}
      <div ref={el => { sectionRefs.current['trends'] = el; }}>
        <SectionCard
          id="trends"
          title="Monthly Progress"
          subtitle="Select metrics to display on the chart"
        >
          {/* Toggle strip */}
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.keys(trendLines).map(key => (
              <button
                key={key}
                onClick={() => setTrendLines(prev => ({ ...prev, [key]: !prev[key] }))}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  trendLines[key]
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {/* Count lines — right axis */}
              {(['Prospects', 'Appointments', 'Sales Meetings', 'Sales'] as const).map((key, idx) =>
                trendLines[key] && (
                  <Line key={key} yAxisId="right" type="monotone" dataKey={key}
                    stroke={CHART_COLORS[idx]} strokeWidth={2} dot={{ r: 3 }} />
                )
              )}
              {/* Monetary lines — left axis */}
              {(['FYCt', 'FYC', 'ACE'] as const).map((key, idx) =>
                trendLines[key] && (
                  <Line key={key} yAxisId="left" type="monotone" dataKey={key}
                    stroke={CHART_COLORS[idx + 4]} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                )
              )}
              {trendLines['NOC'] && (
                <Line yAxisId="right" type="monotone" dataKey="NOC"
                  stroke={CHART_COLORS[7]} strokeWidth={2} dot={{ r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

    </div>
  );
};

export default SalesReportPage;
