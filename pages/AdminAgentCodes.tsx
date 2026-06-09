
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, AgentCode } from '../types';
import { apiCall } from '../services/apiClient';
import { createAgentCodes } from '../services/agentCodes';
import {
  IdCard, Plus, Trash2, Edit2, CheckCircle, AlertCircle,
  Loader2, Search, X, Check, Upload, RefreshCw,
} from 'lucide-react';

// A code is considered "new" if it was created within the last 24 hours
const isNew = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;

const AdminAgentCodes: React.FC = () => {
  const { currentUser } = useAuth();
  if (!currentUser || currentUser.role !== UserRole.ADMIN) return null;

  // ── List state ────────────────────────────────────────────────────────────
  const [codes, setCodes] = useState<AgentCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // ── Upload state ──────────────────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);
  const [uploadInput, setUploadInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ count: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // ── Delete state ──────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await apiCall<{ success: boolean; data: AgentCode[] }>('/agent-codes');
      setCodes(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setListError(e?.message || 'Failed to load agent codes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    const raw = uploadInput.split(/[\n,]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    const distinct = Array.from(new Set(raw));
    if (!distinct.length) { setUploadError('Please enter at least one agent code.'); return; }
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const result = await createAgentCodes(distinct);
      setUploadResult({ count: result.length });
      setUploadInput('');
      await fetchCodes();
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleStartEdit = (code: AgentCode) => {
    setEditingCode(code.agentCode);
    setEditValue(code.agentCode);
  };

  const handleSaveEdit = async (original: string) => {
    const trimmed = editValue.trim().toUpperCase();
    if (!trimmed || trimmed === original) { setEditingCode(null); return; }
    setEditSaving(true);
    try {
      await apiCall(`/agent-codes/${encodeURIComponent(original)}`, {
        method: 'PATCH',
        data: { agentCode: trimmed },
      });
      setCodes(prev => prev.map(c => c.agentCode === original ? { ...c, agentCode: trimmed } : c));
      setEditingCode(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to update code.');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (code: string) => {
    setDeleting(true);
    try {
      await apiCall(`/agent-codes/${encodeURIComponent(code)}`, { method: 'DELETE' });
      setCodes(prev => prev.filter(c => c.agentCode !== code));
      setConfirmDelete(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to delete code.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = codes.filter(c =>
    c.agentCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalCodes   = codes.length;
  const usedCodes    = codes.filter(c => c.isUsed).length;
  const newCodes     = codes.filter(c => isNew(c.createdAt)).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Codes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage the pool of codes agents use during sign-up.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCodes}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowUpload(v => !v); setUploadResult(null); setUploadError(null); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Upload Codes
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Codes', value: totalCodes, color: 'blue' },
          { label: 'Available',   value: totalCodes - usedCodes, color: 'green' },
          { label: 'Used',        value: usedCodes,  color: 'gray' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-green-600' : 'text-gray-500'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" /> Bulk Upload
            </h2>
            <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-gray-500">Paste codes one per line or comma-separated. Codes are trimmed and uppercased automatically. Re-uploading an existing code is safe.</p>
          <textarea
            className="w-full h-32 bg-gray-50 border border-gray-300 rounded-lg p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
            placeholder={"T66701C\nT66702C\nT66703C"}
            value={uploadInput}
            onChange={e => { setUploadInput(e.target.value); setUploadError(null); setUploadResult(null); }}
          />
          {uploadError && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {uploadError}
            </div>
          )}
          {uploadResult && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {uploadResult.count} code{uploadResult.count !== 1 ? 's' : ''} uploaded successfully.
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadInput.trim()}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      )}

      {/* Search + table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search codes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
          <span className="text-xs text-gray-400 font-medium">{filtered.length} of {totalCodes}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : listError ? (
          <div className="flex items-center gap-2 mx-5 my-6 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {listError}
            <button onClick={fetchCodes} className="ml-auto text-red-600 underline text-xs">Retry</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Agent Code</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    {search ? 'No codes match your search.' : 'No agent codes yet. Upload some to get started.'}
                  </td>
                </tr>
              ) : filtered.map(code => {
                const brand = isNew(code.createdAt);
                const isEditing = editingCode === code.agentCode;
                return (
                  <tr key={code.agentCode} className={`hover:bg-gray-50 transition-colors ${brand ? 'bg-blue-50/40' : ''}`}>
                    {/* Code */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input
                          autoFocus
                          className="font-mono font-semibold text-gray-900 border border-blue-400 rounded px-2 py-0.5 text-sm w-36 focus:outline-none"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value.toUpperCase())}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(code.agentCode); if (e.key === 'Escape') setEditingCode(null); }}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-gray-900">{code.agentCode}</span>
                          {brand && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">New</span>
                          )}
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-6 py-3">
                      {code.isUsed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" /> Used
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Available
                        </span>
                      )}
                    </td>
                    {/* Created */}
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(code.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    {/* Updated */}
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(code.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(code.agentCode)}
                              disabled={editSaving}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Save"
                            >
                              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setEditingCode(null)} className="text-gray-400 hover:text-gray-600" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(code)}
                              disabled={code.isUsed}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed"
                              title={code.isUsed ? 'Cannot edit a used code' : 'Edit'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(code.agentCode)}
                              disabled={code.isUsed}
                              className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                              title={code.isUsed ? 'Cannot delete a used code' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-red-600 flex justify-between items-center">
              <h3 className="font-semibold text-white">Delete Agent Code</h3>
              <button onClick={() => setConfirmDelete(null)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                Delete code <span className="font-mono font-bold">{confirmDelete}</span>? This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold flex items-center gap-2 disabled:opacity-60"
                >
                  {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAgentCodes;
