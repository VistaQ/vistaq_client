import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── helpers ────────────────────────────────────────────────────────────────

const rm = (v: number) => 'RM ' + Math.round(v).toLocaleString('en-MY');
const pct = (v: number) => (v * 100).toFixed(1) + '%';

// ─── section nav ────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'milestone',  label: 'Milestone'  },
  { id: 'pipeline',   label: 'Prospect'   },
  { id: 'efficiency', label: 'Efficiency' },
  { id: 'products',   label: 'Products'   },
  { id: 'trends',     label: 'Trends'     },
];

// ─── Aging config ─────────────────────────────────────────────────────────────

const AGING_BUCKETS = [
  { label: '0–30 days',  min: 0,  max: 30,        bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100',  dot: '#22c55e' },
  { label: '31–60 days', min: 31, max: 60,        bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', dot: '#eab308' },
  { label: '61–90 days', min: 61, max: 90,        bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', dot: '#f97316' },
  { label: '90+ days',   min: 91, max: Infinity,  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100',    dot: '#ef4444' },
];

// ─── Trend line config ───────────────────────────────────────────────────────

const ETL_LINE_CFG = [
  { key: 'FYCt', color: '#3b82f6', yAxis: 'left'  as const },
  { key: 'FYC',  color: '#22c55e', yAxis: 'left'  as const },
  { key: 'ACE',  color: '#10b981', yAxis: 'left'  as const },
  { key: 'NOC',  color: '#a855f7', yAxis: 'right' as const },
];
const PIPELINE_LINE_CFG = [
  { key: 'Prospects',      color: CHART_COLORS[0], yAxis: 'right' as const },
  { key: 'Appointments',   color: CHART_COLORS[1], yAxis: 'right' as const },
  { key: 'Sales Meetings', color: CHART_COLORS[2], yAxis: 'right' as const },
  { key: 'Sales',          color: CHART_COLORS[3], yAxis: 'right' as const },
];

// ─── TargetBar ───────────────────────────────────────────────────────────────

const TargetBar: React.FC<{
  label: string; value: number; target: number; shortage: number; fixedColor: string;
}> = ({ label, value, target, shortage, fixedColor }) => {
  const p = target > 0 ? Math.min((value / target) * 100, 100) : 0;
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
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { mySalesReport, isLoadingMySalesReport, refetchMySalesReport, getProspectsByScope } = useData();

  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [selectedYear,  setSelectedYear]  = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [milestoneTab,  setMilestoneTab]  = useState<'ytd' | 'mtd'>('ytd');
  const [pipelineTab,   setPipelineTab]   = useState<'ytd' | 'mtd'>('ytd');
  const [trendLines,    setTrendLines]    = useState<Set<string>>(() => new Set(['FYCt', 'FYC']));

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { refetchMySalesReport(selectedYear); }, [selectedYear]);

  const toggleTrendLine = (key: string) =>
    setTrendLines(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  if (!currentUser) return null;

  // ─── Sales target ─────────────────────────────────────────────────────────
  const salesTarget   = parseFloat(localStorage.getItem(`salesTarget_${currentUser.id}`) ?? '0') || 400_000;
  const monthlyTarget = salesTarget / 12;

  // ─── ETL data ─────────────────────────────────────────────────────────────
  const myReport: SalesReportType | undefined = mySalesReport ?? undefined;
  const hasEtlData = myReport !== undefined;
  const n = selectedMonth; // effective period index (1-based)

  // Computed-from-arrays period values
  const ytdFyct = (myReport?.month_fyct ?? []).slice(0, n).reduce((s, v) => s + v, 0);
  const ytdFyc  = (myReport?.month_fyc  ?? []).slice(0, n).reduce((s, v) => s + v, 0);
  const ytdAce  = (myReport?.month_ace  ?? []).slice(0, n).reduce((s, v) => s + v, 0);
  const ytdNoc  = (myReport?.month_noc  ?? []).slice(0, n).reduce((s, v) => s + v, 0);
  const mtdFyct = myReport?.month_fyct?.[n - 1] ?? 0;
  const mtdFyc  = myReport?.month_fyc?.[n - 1]  ?? 0;
  const mtdAce  = myReport?.month_ace?.[n - 1]  ?? 0;
  const mtdNoc  = myReport?.month_noc?.[n - 1]  ?? 0;

  const isMilYtd = milestoneTab === 'ytd';

  // ─── Prospect data ────────────────────────────────────────────────────────
  const allProspects = getProspectsByScope(currentUser);

  const inMtd = (d: string | null | undefined): boolean => {
    if (!d) return false;
    const dt = new Date(d);
    return dt.getFullYear() === selectedYear && dt.getMonth() + 1 === selectedMonth;
  };
  const inYtd = (d: string | null | undefined): boolean => {
    if (!d) return false;
    const dt = new Date(d);
    return dt.getFullYear() === selectedYear && dt.getMonth() + 1 <= selectedMonth;
  };

  const g = allProspects.filter(p => inMtd(p.prospect_entered_at)).length;
  const G = allProspects.filter(p => inYtd(p.prospect_entered_at)).length;
  const h = allProspects.filter(p => inMtd(p.appointment_completed_at)).length;
  const H = allProspects.filter(p => inYtd(p.appointment_completed_at)).length;
  const i = allProspects.filter(p => p.sales_parts_completed?.length && inMtd(p.sales_completed_at)).length;
  const I = allProspects.filter(p => p.sales_parts_completed?.length && inYtd(p.sales_completed_at)).length;
  const j = allProspects.filter(p => p.sales_outcome === 'successful' && inMtd(p.sales_completed_at)).length;
  const J = allProspects.filter(p => p.sales_outcome === 'successful' && inYtd(p.sales_completed_at)).length;

  const divOrDash = (num: number, den: number) => den === 0 ? '—' : pct(num / den);
  const isPipYtd = pipelineTab === 'ytd';

  // ─── Aging (all active — not filtered by period, shows current pipeline state)
  const today = new Date();
  const daysSince = (d: string | null | undefined): number => {
    if (!d) return 0;
    return Math.floor((today.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  };
  // Prospect aging: entered but no appointment yet
  const prospectAgingDays = allProspects
    .filter(p => p.prospect_entered_at && !p.appointment_completed_at && p.sales_outcome !== 'successful')
    .map(p => daysSince(p.prospect_entered_at));
  // Meeting aging: had a sales meeting but no successful outcome yet
  const meetingAgingDays = allProspects
    .filter(p => p.sales_parts_completed?.length && p.sales_outcome !== 'successful')
    .map(p => daysSince(p.sales_completed_at));
  const bucketCounts = (days: number[]) =>
    AGING_BUCKETS.map(b => ({ ...b, count: days.filter(d => d >= b.min && d <= b.max).length }));
  const prospectBuckets = bucketCounts(prospectAgingDays);
  const meetingBuckets  = bucketCounts(meetingAgingDays);

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
      month:          label,
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

  // ─── Monthly averages ─────────────────────────────────────────────────────
  const avgFyct = n > 0 ? ytdFyct / n : 0;
  const avgFyc  = n > 0 ? ytdFyc  / n : 0;
  const avgAce  = n > 0 ? ytdAce  / n : 0;
  const avgNoc  = n > 0 ? ytdNoc  / n : 0;

  const monthsLeft = Math.max(12 - n, 0);
  const periodLabel = `Jan–${MONTH_LABELS[n - 1]} ${selectedYear}`;

  // ─── Shared report row — matches company ETL format ──────────────────────
  // Columns: Agent Code | Agent Name | FYCt (YTD) | % FYCt | FYC (YTD) | % FYC |
  //          Shortage (FYC) | ACE (YTD) | NOC (YTD) | Jan FYCt | Jan FYC | Jan ACE | Jan NOC | … | Dec …
  const buildReportRow = (): Record<string, string | number> | null => {
    if (!myReport) return null;
    const fycPct  = salesTarget > 0 ? (ytdFyc  / salesTarget) * 100 : 0;
    const fyctPct = salesTarget > 0 ? (ytdFyct / salesTarget) * 100 : 0;
    const row: Record<string, string | number> = {
      'Agent Code':      myReport.agent_code,
      'Agent Name':      myReport.agent_name,
      'FYCt (YTD)':     ytdFyct,
      '% FYCt':          `${fyctPct.toFixed(2)}%`,
      'FYC (YTD)':      ytdFyc,
      '% FYC':           `${fycPct.toFixed(2)}%`,
      'Shortage (FYC)':  Math.max(salesTarget - ytdFyc, 0),
      'ACE (YTD)':      ytdAce,
      'NOC (YTD)':      ytdNoc,
    };
    MONTH_LABELS.forEach((m, idx) => {
      row[`${m} FYCt`] = myReport.month_fyct?.[idx] ?? 0;
      row[`${m} FYC`]  = myReport.month_fyc?.[idx]  ?? 0;
      row[`${m} ACE`]  = myReport.month_ace?.[idx]  ?? 0;
      row[`${m} NOC`]  = myReport.month_noc?.[idx]  ?? 0;
    });
    return row;
  };

  // ─── Download: Excel ─────────────────────────────────────────────────────
  const downloadExcel = () => {
    const row = buildReportRow();
    if (!row) return;
    const ws = XLSX.utils.json_to_sheet([row]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    XLSX.writeFile(wb, `VistaQ_SalesReport_${MONTH_LABELS[n - 1]}_${selectedYear}.xlsx`);
  };

  // ─── Download: CSV ────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const row = buildReportRow();
    if (!row) return;
    const headers = Object.keys(row);
    const csv = [
      headers.join(','),
      headers.map(h => {
        const v = String(row[h]);
        return v.includes(',') ? `"${v}"` : v;
      }).join(','),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `VistaQ_SalesReport_${MONTH_LABELS[n - 1]}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── Download: PDF ────────────────────────────────────────────────────────
  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const slate800   = [30, 41, 59]   as [number, number, number];
    const green600   = [22, 163, 74]  as [number, number, number];
    const blue600    = [37, 99, 235]  as [number, number, number];
    const gray100    = [243, 244, 246] as [number, number, number];
    const gray600    = [75, 85, 99]   as [number, number, number];

    // ── Header bar ──
    doc.setFillColor(...slate800);
    doc.rect(0, 0, W, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('VistaQ', 14, 13);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Sales Report', 14, 21);
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 210);
    const agentLine = myReport
      ? `${myReport.agent_name}  ·  ${myReport.agent_code}`
      : currentUser?.name ?? '';
    doc.text(agentLine, 14, 29);
    doc.text(`Period: ${periodLabel}`, 14, 35);
    doc.setTextColor(...gray600);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}`, W - 14, 35, { align: 'right' });

    let y = 46;

    // ── Data source note ──
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.roundedRect(14, y, W - 28, 12, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.setFont('helvetica', 'bold');
    doc.text('Data sources:', 18, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sales figures (FYCt, FYC, ACE, NOC) — Company ETL records   ·   Annual target (${rm(salesTarget)}) — Agent profile setting`, 42, y + 5);
    doc.setFont('helvetica', 'italic');
    doc.text('Target can be updated anytime in the Profile page.', 18, y + 10);
    y += 17;

    // ── Section helper ──
    const sectionHeader = (title: string, color: [number, number, number]) => {
      doc.setFillColor(...color);
      doc.rect(14, y, 3, 7, 'F');
      doc.setTextColor(...color);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 19, y + 5.5);
      y += 12;
    };

    // ── MILESTONE ──
    sectionHeader('Sales Milestone', blue600);

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'MTD', 'YTD', 'Profile Target', '% of Target', 'Shortage']],
      body: [
        ['FYCt', rm(mtdFyct), rm(ytdFyct), rm(salesTarget), `${((ytdFyct / salesTarget) * 100).toFixed(2)}%`, rm(Math.max(salesTarget - ytdFyct, 0))],
        ['FYC',  rm(mtdFyc),  rm(ytdFyc),  rm(salesTarget), `${((ytdFyc  / salesTarget) * 100).toFixed(2)}%`, rm(Math.max(salesTarget - ytdFyc,  0))],
        ['ACE',  rm(mtdAce),  rm(ytdAce),  '—', '—', '—'],
        ['NOC',  String(mtdNoc), String(ytdNoc), '—', '—', '—'],
      ],
      headStyles: { fillColor: slate800, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: gray100 },
      columnStyles: {
        4: { fontStyle: 'bold', textColor: blue600 },
        5: { textColor: [220, 38, 38] },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Progress bars (visual)
    const drawBar = (label: string, value: number, target: number, color: [number, number, number]) => {
      const barW = W - 28;
      const fillW = target > 0 ? Math.min((value / target), 1) * barW : 0;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gray600);
      doc.text(`${rm(value)} of ${rm(target)}  (${target > 0 ? ((value / target) * 100).toFixed(1) : '0.0'}%)`, W - 14, y, { align: 'right' });
      y += 4;
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(14, y, barW, 4, 2, 2, 'F');
      if (fillW > 0) {
        doc.setFillColor(...color);
        doc.roundedRect(14, y, fillW, 4, 2, 2, 'F');
      }
      y += 8;
    };
    drawBar('FYC Progress',  ytdFyc,  salesTarget, green600);
    drawBar('FYCt Progress', ytdFyct, salesTarget, blue600);

    y += 4;

    // ── PIPELINE ──
    if (y > 220) { doc.addPage(); y = 20; }
    sectionHeader('Pipeline', [99, 102, 241]);

    autoTable(doc, {
      startY: y,
      head: [['Stage', 'Month to Date', 'Year to Date', 'Conversion Rate (YTD)']],
      body: [
        ['Prospects',      String(g), String(G), '—'],
        ['Appointments',   String(h), String(H), divOrDash(H, G)],
        ['Sales Meetings', String(i), String(I), divOrDash(I, H)],
        ['Sales (Closed)', String(j), String(J), divOrDash(J, I)],
      ],
      headStyles: { fillColor: slate800, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: gray100 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ── PRODUCTS ──
    if (productRows.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      sectionHeader('Product Summary', [16, 185, 129]);

      autoTable(doc, {
        startY: y,
        head: [['Product', 'Cases', 'Total ACE']],
        body: [
          ...productRows.map(r => [r.name, String(r.count), rm(r.ace)]),
          ['TOTAL', String(totalProdCount), rm(totalProdACE)],
        ],
        headStyles: { fillColor: slate800, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: gray100 },
        footStyles: { fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── MONTHLY BREAKDOWN ──
    if (myReport) {
      doc.addPage();
      y = 20;
      sectionHeader('Monthly Breakdown', [168, 85, 247]);

      autoTable(doc, {
        startY: y,
        head: [['Month', 'FYCt', 'FYC', 'ACE', 'NOC']],
        body: MONTH_LABELS.map((month, idx) => [
          month,
          rm(myReport!.month_fyct?.[idx] ?? 0),
          rm(myReport!.month_fyc?.[idx]  ?? 0),
          rm(myReport!.month_ace?.[idx]  ?? 0),
          String(myReport!.month_noc?.[idx] ?? 0),
        ]),
        headStyles: { fillColor: slate800, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: gray100 },
        margin: { left: 14, right: 14 },
      });
    }

    // ── Footer ──
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(...gray100);
      doc.rect(0, pageH - 10, W, 10, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...gray600);
      doc.text('VistaQ · Confidential', 14, pageH - 3.5);
      doc.text(`Page ${p} of ${pageCount}`, W - 14, pageH - 3.5, { align: 'right' });
    }

    doc.save(`VistaQ_SalesReport_${MONTH_LABELS[n - 1]}_${selectedYear}.pdf`);
  };

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const noEtlData = !hasEtlData;

  // Available months for selector (all 12, future months will show zero data)
  const monthOptions = MONTH_LABELS.map((label, idx) => ({ label, value: idx + 1 }));

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-12">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sales data from company records · Progress calculated against your profile target</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month / Year selectors */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="flex-1 min-w-[90px] text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="flex-1 min-w-[80px] text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Download */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Download
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
              <button onClick={downloadPDF} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                PDF Report
              </button>
              <button onClick={downloadExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium flex items-center gap-2 border-t border-gray-100">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Excel Report
              </button>
              <button onClick={downloadCSV} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium flex items-center gap-2 border-t border-gray-100">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                CSV Report
              </button>
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
          subtitle={`Your profile target: ${rm(salesTarget)} · Period: ${periodLabel} · ${monthsLeft} month${monthsLeft !== 1 ? 's' : ''} to year end`}
        >
          {noEtlData ? (
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl text-amber-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>No sales data for {selectedYear} yet. Contact your admin to upload the monthly ETL file.</span>
            </div>
          ) : (
            <>
              {/* Data source note */}
              <div className="p-4 mb-6 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  <span>
                    Sales figures (FYCt, FYC, ACE, NOC) are sourced from your <strong>company's sales report</strong>.
                    All progress bars and percentage calculations compare these figures against the{' '}
                    <strong>annual target you have set in your Profile</strong>.
                    You can update your target anytime from the Profile page.
                  </span>
                </div>
                <div className="mt-3 ml-7">
                  <button
                    onClick={() => navigate('/profile')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Update my annual target
                  </button>
                </div>
              </div>

              {/* Period toggle — YTD first */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-fit">
                  {(['ytd', 'mtd'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setMilestoneTab(p)}
                      className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${milestoneTab === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {p === 'ytd' ? 'Year to Date' : 'Month to Date'}
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
                      value: isMilYtd ? rm(ytdFyct) : rm(mtdFyct),
                      sub:   isMilYtd
                        ? `${((ytdFyct / salesTarget) * 100).toFixed(1)}% of your profile target`
                        : `${((mtdFyct / monthlyTarget) * 100).toFixed(1)}% of monthly profile target`,
                      bg: 'bg-blue-50', icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
                    },
                    {
                      label: `FYC ${milestoneTab.toUpperCase()}`,
                      value: isMilYtd ? rm(ytdFyc) : rm(mtdFyc),
                      sub:   isMilYtd
                        ? `${((ytdFyc / salesTarget) * 100).toFixed(1)}% of your profile target`
                        : `${((mtdFyc / monthlyTarget) * 100).toFixed(1)}% of monthly profile target`,
                      bg: 'bg-green-50', icon: <Award className="w-5 h-5 text-green-600" />,
                    },
                    {
                      label: `ACE ${milestoneTab.toUpperCase()}`,
                      value: isMilYtd ? rm(ytdAce) : rm(mtdAce),
                      sub:   'Annualised contribution',
                      bg: 'bg-emerald-50', icon: <Target className="w-5 h-5 text-emerald-600" />,
                    },
                    {
                      label: `NOC ${milestoneTab.toUpperCase()}`,
                      value: isMilYtd ? String(ytdNoc) : String(mtdNoc),
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

              {/* Sales Target Progress bars */}
              {myReport && (
                <div className="p-5 md:p-6 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
                    Sales Progress
                  </p>
                  <TargetBar
                    label="FYC"
                    value={ytdFyc}
                    target={salesTarget}
                    shortage={Math.max(salesTarget - ytdFyc, 0)}
                    fixedColor="bg-green-500"
                  />
                  <TargetBar
                    label="FYCt"
                    value={ytdFyct}
                    target={salesTarget}
                    shortage={Math.max(salesTarget - ytdFyct, 0)}
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
          title="Prospect"
          subtitle="Stage progression and conversion rates — from prospect data"
        >
          {/* YTD / MTD toggle — YTD first */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-fit mb-6">
            {(['ytd', 'mtd'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPipelineTab(p)}
                className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${pipelineTab === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {p === 'ytd' ? 'Year to Date' : 'Month to Date'}
              </button>
            ))}
          </div>

          {/* Stage funnel — 2×2 on mobile, 4 cols on md+ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Prospects',      value: isPipYtd ? G : g, color: 'text-blue-600',   bg: 'bg-blue-50'   },
              { label: 'Appointments',   value: isPipYtd ? H : h, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Sales Meetings', value: isPipYtd ? I : i, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Sales',          value: isPipYtd ? J : j, color: 'text-green-600',  bg: 'bg-green-50'  },
            ].map(chip => (
              <div key={chip.label} className={`${chip.bg} rounded-xl p-4 text-center`}>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{chip.value}</p>
                <p className={`text-xs font-semibold mt-1 ${chip.color}`}>{chip.label}</p>
              </div>
            ))}
          </div>

        </SectionCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — SALES EFFICIENCY & AGING
      ══════════════════════════════════════════════════════════════════════ */}
      <div ref={el => { sectionRefs.current['efficiency'] = el; }}>
        <SectionCard
          id="efficiency"
          title="Sales Efficiency & Aging"
          subtitle="Conversion rates and how long prospects have been waiting at each stage"
        >
          {/* Conversion rates — 3 coloured cards */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Conversion Rates</p>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Appointment Rate', mtd: divOrDash(h, g), ytd: divOrDash(H, G), bg: 'bg-violet-50', border: 'border-violet-100', numColor: 'text-violet-700', tagBg: 'bg-violet-100 text-violet-600' },
              { label: 'Show-up Rate',     mtd: divOrDash(i, h), ytd: divOrDash(I, H), bg: 'bg-sky-50',    border: 'border-sky-100',    numColor: 'text-sky-700',    tagBg: 'bg-sky-100 text-sky-600'    },
              { label: 'Closing Rate',     mtd: divOrDash(j, i), ytd: divOrDash(J, I), bg: 'bg-emerald-50',border: 'border-emerald-100',numColor: 'text-emerald-700',tagBg: 'bg-emerald-100 text-emerald-600' },
            ].map(rate => (
              <div key={rate.label} className={`${rate.bg} ${rate.border} rounded-xl p-4 text-center border`}>
                <p className={`text-xl md:text-2xl font-bold ${rate.numColor}`}>{isPipYtd ? rate.ytd : rate.mtd}</p>
                <p className="text-xs font-semibold text-gray-600 mt-1 leading-tight">{rate.label}</p>
                <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${rate.tagBg}`}>{isPipYtd ? 'YTD' : 'MTD'}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 my-6" />

          {/* Aging — shows all active prospects regardless of period filter */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Prospect & Meeting Aging</p>
          <p className="text-xs text-gray-400 mb-5">Active prospects only · not filtered by selected period</p>

          <div className="space-y-6">
            {/* Prospect Aging */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-gray-700">Prospect Aging</p>
                <span className="text-xs text-gray-400">· awaiting first appointment ({prospectAgingDays.length} active)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {prospectBuckets.map(b => (
                  <div key={b.label} className={`${b.bg} ${b.border} border rounded-xl p-3 md:p-4 text-center`}>
                    <p className={`text-2xl font-bold ${b.text}`}>{b.count}</p>
                    <p className={`text-xs font-semibold mt-1 ${b.text}`}>{b.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Meeting Aging */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-gray-700">Meeting Aging</p>
                <span className="text-xs text-gray-400">· sales meeting done, outcome pending ({meetingAgingDays.length} active)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {meetingBuckets.map(b => (
                  <div key={b.label} className={`${b.bg} ${b.border} border rounded-xl p-3 md:p-4 text-center`}>
                    <p className={`text-2xl font-bold ${b.text}`}>{b.count}</p>
                    <p className={`text-xs font-semibold mt-1 ${b.text}`}>{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — PRODUCTS
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* 3-column table */}
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

              {/* Pie chart — desktop only, centred vertically */}
              <div className="hidden md:flex items-center justify-center">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={productRows}
                      dataKey="ace"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={95}
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
          subtitle="Month-by-month sales breakdown"
        >
          {/* Monthly averages row */}
          {myReport && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Avg FYCt / Month', value: rm(avgFyct), color: 'text-blue-600'    },
                { label: 'Avg FYC / Month',  value: rm(avgFyc),  color: 'text-green-600'   },
                { label: 'Avg ACE / Month',  value: rm(avgAce),  color: 'text-emerald-600' },
                { label: 'Avg NOC / Month',  value: avgNoc.toFixed(1), color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Individual metric toggles */}
          <div className="flex flex-wrap gap-2 mb-5">
            {/* ETL group */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-100">
              <span className="self-center text-xs font-bold text-gray-400 uppercase pr-1">Sales</span>
              {ETL_LINE_CFG.map(cfg => (
                <button
                  key={cfg.key}
                  onClick={() => toggleTrendLine(cfg.key)}
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
            {/* Pipeline group */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-100">
              <span className="self-center text-xs font-bold text-gray-400 uppercase pr-1">Prospect Management</span>
              {PIPELINE_LINE_CFG.map(cfg => (
                <button
                  key={cfg.key}
                  onClick={() => toggleTrendLine(cfg.key)}
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
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {ETL_LINE_CFG.map(cfg => trendLines.has(cfg.key) && (
                <Line
                  key={cfg.key}
                  yAxisId={cfg.yAxis}
                  type="monotone"
                  dataKey={cfg.key}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  strokeDasharray={cfg.yAxis === 'left' ? '4 2' : undefined}
                />
              ))}
              {PIPELINE_LINE_CFG.map(cfg => trendLines.has(cfg.key) && (
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
        </SectionCard>
      </div>

    </div>
  );
};

export default SalesReportPage;
