import React, { useRef, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Prospect, ProspectStage, UploadAuditEntry, UserRole } from '../types';
import { Upload, FileText, CheckCircle, AlertCircle, FileSpreadsheet, Loader2, Clock, User, BarChart2, ChevronDown } from 'lucide-react';
import { parseCSV } from '../utils/exportUtils';
import { apiCall } from '../services/apiClient';

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── main component ───────────────────────────────────────────────────────────

const Import: React.FC = () => {
  const { currentUser } = useAuth();
  const { importProspects, refetchSalesReports } = useData();

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const [activeTab, setActiveTab] = useState<'prospects' | 'sales-report'>('prospects');

  // ─── Prospects tab state ───────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const TEMPLATE_HEADERS = ['ID', 'Name', 'Phone', 'Group/Agent', 'Outcome', 'Reason', 'Product', 'Amount', 'Date'];

  const handleDownloadTemplate = () => {
    const csvContent = [
      TEMPLATE_HEADERS.join(','),
      'p_sample_1,Ali Baba,+60123456789,agent_1,SUCCESSFUL,,Investment Link,5000,2023-10-01',
      'p_sample_2,Jane Doe,+60198765432,agent_1,UNSUCCESSFUL,Budget issue,Medical Card,0,2023-10-02',
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
    a.download = 'VistaQ_Import_Template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setStatus({ msg: 'Invalid file format. Please upload a CSV file.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const allRows = parseCSV(text);
        if (allRows.length < 2) { setStatus({ msg: 'File is empty or missing headers.', type: 'error' }); return; }
        const parsedData: Prospect[] = [];
        let successCount = 0;
        for (let i = 1; i < allRows.length; i++) {
          const cols = allRows[i];
          if (cols.length < 4) continue;
          const id = cols[0]?.trim(), name = cols[1]?.trim(), phone = cols[2]?.trim(), uid = cols[3]?.trim();
          const outcome = cols[4]?.trim(), reason = cols[5]?.trim(), product = cols[6]?.trim();
          const amount = parseFloat(cols[7]?.trim()) || 0;
          let stage = ProspectStage.PROSPECT;
          if (outcome === 'SUCCESSFUL' || outcome === 'UNSUCCESSFUL' || outcome === 'KIV') stage = ProspectStage.SALES;
          else if (outcome) stage = ProspectStage.APPOINTMENT;
          const normalizedOutcome = outcome === 'SUCCESSFUL' ? 'successful' : outcome === 'UNSUCCESSFUL' ? 'unsuccessful' : outcome === 'KIV' ? 'kiv' : undefined;
          if (id && uid && name) {
            parsedData.push({
              id, agent_id: uid, prospect_name: name, prospect_phone: phone,
              current_stage: stage, sales_outcome: normalizedOutcome as any,
              unsuccessful_reason: reason,
              products_sold: product ? [{ id: '1', productName: product, amount }] : [],
              appointment_status: 'done',
              created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            } as unknown as Prospect);
            successCount++;
          }
        }
        if (successCount > 0) { importProspects(parsedData); setStatus({ msg: `Successfully imported and synced ${successCount} records.`, type: 'success' }); }
        else setStatus({ msg: 'No valid records found to import.', type: 'error' });
      } catch (err: any) {
        setStatus({ msg: `Error parsing CSV file: ${err?.message || 'Unknown error'}`, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };

  // ─── Sales Report ETL tab state ────────────────────────────────────────────

  const etlFileRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();
  const prevMonth = new Date().getMonth() === 0 ? 12 : new Date().getMonth(); // 1-based prev month
  const [etlYear, setEtlYear] = useState(currentYear);
  const [etlMonth, setEtlMonth] = useState(prevMonth);
  const [etlFile, setEtlFile] = useState<File | null>(null);
  const [etlUploading, setEtlUploading] = useState(false);
  const [etlResult, setEtlResult] = useState<{ imported: number; skipped: number; errors: { source_row?: number; agent_code: string; issue: string; action?: string }[] } | null>(null);
  const [etlError, setEtlError] = useState<string | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadAuditEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiCall(`/sales-reports/uploads?year=${etlYear}&page=1&pageSize=50`);
      setUploadHistory(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setUploadHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sales-report' && isAdmin) fetchHistory();
  }, [activeTab, etlYear]);

  const handleEtlUpload = async () => {
    if (!etlFile) return;
    setEtlUploading(true);
    setEtlResult(null);
    setEtlError(null);
    try {
      const formData = new FormData();
      formData.append('file', etlFile);
      formData.append('year', String(etlYear));
      formData.append('month', String(etlMonth));

      const token = localStorage.getItem('authToken');
      const tenantSlug = (window as any).__tenantSlug ?? '';
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/etl/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
        },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      setEtlResult(data.data ?? data);
      setEtlFile(null);
      if (etlFileRef.current) etlFileRef.current.value = '';
      await fetchHistory();
      await refetchSalesReports(etlYear);
    } catch (err: any) {
      setEtlError(err?.message ?? 'Upload failed. Please try again.');
    } finally {
      setEtlUploading(false);
    }
  };

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
          <p className="text-sm text-gray-500">Bulk upload data into VistaQ.</p>
        </div>
        {activeTab === 'prospects' && (
          <button
            onClick={handleDownloadTemplate}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-100"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Download CSV Template
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('prospects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'prospects' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FileText className="w-4 h-4" />
          Prospects
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('sales-report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'sales-report' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart2 className="w-4 h-4" />
            Sales Report
          </button>
        )}
      </div>

      {/* ─── Prospects tab ─── */}
      {activeTab === 'prospects' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
              <div className="flex flex-col items-center pointer-events-none">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Report File</h3>
                <p className="text-gray-500 mb-6 max-w-sm">Drag and drop your CSV file here, or click the button below to browse.</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleChange} />
              <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-transform active:scale-95">
                Select CSV File
              </button>
              <p className="text-xs text-gray-400 mt-4">Supported Format: .csv</p>
            </div>
            {status && (
              <div className={`mt-6 p-4 rounded-lg flex items-start border ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {status.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
                <div>
                  <p className="font-bold">{status.type === 'success' ? 'Import Successful' : 'Import Failed'}</p>
                  <p className="text-sm">{status.msg}</p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-gray-500" />Format Instructions
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>1. The file must be a <strong>CSV</strong> file.</p>
              <p>2. The first row must contain headers. Use the downloadable template.</p>
              <p>3. <strong>ID</strong>: Must be unique. If an ID matches an existing record it will be updated.</p>
              <p>4. <strong>Group/Agent</strong>: Must match the System ID of the agent.</p>
              <p>5. <strong>Outcome</strong>: Use 'SUCCESSFUL' or 'UNSUCCESSFUL'.</p>
            </div>
          </div>
        </>
      )}

      {/* ─── Sales Report ETL tab ─── */}
      {activeTab === 'sales-report' && isAdmin && (
        <>
          {/* Upload card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-500" />
                Upload Monthly ETL File
              </h3>
              <p className="text-sm text-gray-500">Upload the monthly Excel export from the company system. Data is cumulative — re-uploading replaces the existing record for that year.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Year */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Year</label>
                <input
                  type="number"
                  value={etlYear}
                  onChange={e => setEtlYear(Number(e.target.value))}
                  min={2020}
                  max={2030}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Month */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Month (audit trail)</label>
                <select
                  value={etlMonth}
                  onChange={e => setEtlMonth(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>

              {/* File picker */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Excel File</label>
                <input
                  ref={etlFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={e => setEtlFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
            </div>

            {etlFile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{etlFile.name}</span>
                <span className="text-blue-500">({(etlFile.size / 1024).toFixed(0)} KB)</span>
              </div>
            )}

            <button
              onClick={handleEtlUpload}
              disabled={!etlFile || etlUploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {etlUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {etlUploading ? 'Processing…' : 'Upload & Process'}
            </button>

            {/* Result */}
            {etlResult && (
              <div className="border border-green-200 bg-green-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                  <CheckCircle className="w-5 h-5" />
                  {etlResult.imported} rows imported · {etlResult.skipped} rows skipped
                </div>
                {etlResult.errors?.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Skipped Rows</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1.5 px-2 text-gray-400 font-bold">Row</th>
                          <th className="text-left py-1.5 px-2 text-gray-400 font-bold">Agent Code</th>
                          <th className="text-left py-1.5 px-2 text-gray-400 font-bold">Issue</th>
                          <th className="text-left py-1.5 px-2 text-gray-400 font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {etlResult.errors.map((err, i) => (
                          <tr key={i}>
                            <td className="py-1.5 px-2 text-gray-600">{err.source_row ?? '—'}</td>
                            <td className="py-1.5 px-2 font-mono text-gray-700">{err.agent_code}</td>
                            <td className="py-1.5 px-2 text-red-600">{err.issue}</td>
                            <td className="py-1.5 px-2 text-gray-500">{err.action ?? 'Skipped'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {etlError && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Upload Failed</p>
                  <p>{etlError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Upload history */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <h3 className="font-bold text-gray-800">Upload History</h3>
            </div>
            {historyLoading ? (
              <div className="flex items-center gap-2 p-6 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />Loading history…
              </div>
            ) : uploadHistory.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 italic">No uploads yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Period</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase">Imported</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase">Skipped</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Uploaded By</th>
                      <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {uploadHistory.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-gray-600">{new Date(record.imported_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-gray-700 font-medium">{MONTH_NAMES[record.month - 1]} {record.year}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{record.rows_loaded}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{record.rows_skipped}</td>
                        <td className="py-3 px-4 text-gray-600 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />{record.uploader_name ?? <span className="text-gray-400 italic">manual ingest</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            record.status === 'success' ? 'bg-green-100 text-green-700' :
                            record.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default Import;
