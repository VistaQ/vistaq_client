
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole, Prospect, ProspectStage } from '../types';
import { Plus, Search, ChevronRight, User, Download, Eye, LayoutList, LayoutGrid, Phone, Calendar, Loader2, AlertCircle, CheckCircle, DollarSign, Shield } from 'lucide-react';
import { apiCall } from '../services/apiClient';
import ProspectCard from '../components/ProspectCard';
import { exportProspectsToExcel } from '../utils/exportUtils';

const Prospects: React.FC = () => {
  const { currentUser } = useAuth();
  const { getProspectsByScope } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  type ProspectStatus =
    | 'all'
    | 'new_prospect'
    | 'appt_not_scheduled'
    | 'appt_scheduled'
    | 'appt_completed'
    | 'declined'
    | 'kiv'
    | 'successful'
    | 'non_successful';

  const [stageFilter, setStageFilter] = useState<ProspectStatus>('all');
  
  // State for managing the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | Partial<Prospect> | null>(null);
  const [loadingProspect, setLoadingProspect] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // View Mode State
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  // Set default view based on screen size on mount
  useEffect(() => {
    if (window.innerWidth < 1024) {
        setViewMode('card');
    } else {
        setViewMode('list');
    }
  }, []);

  const prospects = currentUser ? getProspectsByScope(currentUser) : [];
  
  const getProspectStatus = (p: Prospect): Exclude<ProspectStatus, 'all'> => {
    const { current_stage, appointment_status, sales_outcome } = p;
    if (sales_outcome === 'successful')   return 'successful';
    if (sales_outcome === 'unsuccessful') return 'non_successful';
    if (sales_outcome === 'kiv')          return 'kiv';
    if (appointment_status === 'done')    return 'appt_completed';
    if (appointment_status === 'declined') return 'declined';
    if (appointment_status === 'scheduled' || appointment_status === 'rescheduled') return 'appt_scheduled';
    if (appointment_status === 'kiv')     return 'kiv';
    if (appointment_status === 'not_done' || current_stage === ProspectStage.APPOINTMENT) return 'appt_not_scheduled';
    return 'new_prospect';
  };

  const filteredProspects = prospects
    .filter(p => {
      if (stageFilter !== 'all' && getProspectStatus(p) !== stageFilter) return false;
      if (searchTerm) {
        return (
          (p.prospect_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.prospect_phone || '').includes(searchTerm)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.updated_at).getTime();
      const db = new Date(b.updated_at).getTime();
      if (isNaN(db) && isNaN(da)) return 0;
      if (isNaN(db)) return -1;
      if (isNaN(da)) return 1;
      return db - da; // most recent first
    });

  const stageCounts: Record<ProspectStatus, number> = {
    all:               prospects.length,
    new_prospect:      prospects.filter(p => getProspectStatus(p) === 'new_prospect').length,
    appt_not_scheduled: prospects.filter(p => getProspectStatus(p) === 'appt_not_scheduled').length,
    appt_scheduled:    prospects.filter(p => getProspectStatus(p) === 'appt_scheduled').length,
    appt_completed:    prospects.filter(p => getProspectStatus(p) === 'appt_completed').length,
    declined:          prospects.filter(p => getProspectStatus(p) === 'declined').length,
    kiv:               prospects.filter(p => getProspectStatus(p) === 'kiv').length,
    successful:        prospects.filter(p => getProspectStatus(p) === 'successful').length,
    non_successful:    prospects.filter(p => getProspectStatus(p) === 'non_successful').length,
  };

  const handleCreateNew = () => {
    if (!currentUser) return;
    // Open modal with a skeleton prospect object
    setSelectedProspect({
      agent_id: currentUser.id,
      prospect_name: '',
      current_stage: ProspectStage.PROSPECT
    });
    setIsModalOpen(true);
  };

  const handleViewProspect = async (prospect: Prospect) => {
    setLoadingProspect(true);
    setFetchError(null);
    try {
      const res = await apiCall(`/prospects/${prospect.id}`);
      const raw = res.data || prospect;
      const normalized: Prospect = {
        ...raw,
        products_sold: (raw.products_sold || []).map((p: any, i: number) => ({
          ...p,
          id: p.id || `prod_${raw.id || 'unknown'}_${i}`,
        })),
      };
      setSelectedProspect(normalized);
      setIsModalOpen(true);
    } catch (e: any) {
      console.error('[Prospects] handleViewProspect failed:', e);
      setFetchError(e?.message || 'Failed to load prospect details. Please try again.');
      setSelectedProspect(prospect);
      setIsModalOpen(true);
    } finally {
      setLoadingProspect(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProspect(null);
  };

  const handleExportExcel = () => {
    exportProspectsToExcel(filteredProspects);
  };

  const getStageBadge = (prospect: Prospect) => {
    const { current_stage, appointment_status, sales_outcome } = prospect;

    // Priority 1: Sales outcome overrides everything
    if (sales_outcome === 'successful')
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Successful</span>;
    if (sales_outcome === 'unsuccessful')
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Non-Successful</span>;
    if (sales_outcome === 'kiv')
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">KIV</span>;

    // Priority 2: Appointment completed → entered Sales Meeting
    if (appointment_status === 'done')
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700">Appointment Completed</span>;

    // Priority 3: Appointment sub-states
    if (appointment_status === 'declined')
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Declined</span>;
    if (appointment_status === 'scheduled')
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Scheduled</span>;
    if (appointment_status === 'rescheduled')
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Rescheduled</span>;
    if (appointment_status === 'kiv')
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">KIV</span>;
    if (appointment_status === 'not_done' || current_stage === ProspectStage.APPOINTMENT)
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">Not Scheduled</span>;

    // Priority 4: Basic info stage
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">New Prospect</span>;
  };

  // Logic: 
  // Agent -> Add
  // Leader -> Add (own)
  // Admin -> Add (any), can view/edit all
  // Trainer / Master Trainer -> View Only (Cannot Add or Edit)
  const canAddProspect = currentUser?.role === UserRole.AGENT || currentUser?.role === UserRole.GROUP_LEADER;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isViewOnly = currentUser?.role === UserRole.MASTER_TRAINER || currentUser?.role === UserRole.TRAINER;

  const formatDate = (val: any) => {
    if (!val) return 'N/A';
    const d = new Date(val);
    return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
  };

  const getProspectACE = (p: Prospect) =>
    (p.products_sold || []).reduce((sum, prod) => sum + (prod.amount || 0), 0);

  const getProspectProducts = (p: Prospect) =>
    (p.products_sold || []).map(prod => prod.productName).filter(Boolean).join(', ') || '—';

  const successfulProspects = prospects.filter(p => p.sales_outcome === 'successful');
  const totalNOC = successfulProspects.length;
  const totalACE = successfulProspects.reduce((sum, p) => sum + getProspectACE(p), 0);
  const showSalesSummary = totalNOC > 0;

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{fetchError}</span>
          <button onClick={() => setFetchError(null)} className="ml-auto text-red-500 hover:text-red-700 font-bold">×</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Prospect Management</h1>
        <div className="flex flex-wrap items-center gap-2">
            {/* View Toggle */}
            <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    title="List View"
                >
                    <LayoutList className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode('card')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Card View"
                >
                    <LayoutGrid className="w-4 h-4" />
                </button>
            </div>

            {(isAdmin || canAddProspect) && (
                <button
                onClick={handleExportExcel}
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center shadow-sm transition-colors font-medium text-sm"
                >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
                </button>
            )}
            {canAddProspect && (
            <button 
                onClick={handleCreateNew}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm transition-colors font-medium text-sm"
            >
                <Plus className="w-4 h-4 mr-2" />
                Add Prospect
            </button>
            )}
        </div>
      </div>

      {/* ── Closed Sales Summary ── */}
      {showSalesSummary && (
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Total Closed</p>
              <p className="text-2xl font-bold leading-none">{totalNOC}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Total ACE</p>
              <p className="text-2xl font-bold leading-none">RM {totalACE.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
          </div>
          <button
            onClick={() => setStageFilter('successful')}
            className={`col-span-2 sm:col-span-1 sm:ml-auto text-xs font-semibold px-4 py-2 rounded-lg transition-colors border ${
              stageFilter === 'successful'
                ? 'bg-white text-green-700 border-white'
                : 'border-white/50 text-white hover:bg-white/20'
            }`}
          >
            {stageFilter === 'successful' ? '✓ Viewing Closed Sales' : 'View Closed Sales'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all',               label: 'All',                    active: 'bg-gray-700 text-white border-gray-700',     inactive: 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50',     badge: 'bg-gray-100 text-gray-500',     badgeActive: 'bg-white/25 text-white' },
            { key: 'new_prospect',      label: 'New Prospect',           active: 'bg-blue-600 text-white border-blue-600',     inactive: 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:bg-blue-50',     badge: 'bg-blue-50 text-blue-500',      badgeActive: 'bg-white/25 text-white' },
            { key: 'appt_not_scheduled',label: 'Appt Not Scheduled',     active: 'bg-gray-500 text-white border-gray-500',     inactive: 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50',     badge: 'bg-gray-100 text-gray-500',     badgeActive: 'bg-white/25 text-white' },
            { key: 'appt_scheduled',    label: 'Appt Scheduled',         active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50', badge: 'bg-indigo-50 text-indigo-500',  badgeActive: 'bg-white/25 text-white' },
            { key: 'appt_completed',    label: 'Appt Completed',         active: 'bg-cyan-600 text-white border-cyan-600',     inactive: 'bg-white text-gray-600 border-gray-300 hover:border-cyan-400 hover:bg-cyan-50',     badge: 'bg-cyan-50 text-cyan-500',      badgeActive: 'bg-white/25 text-white' },
            { key: 'declined',          label: 'Declined',               active: 'bg-red-500 text-white border-red-500',       inactive: 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:bg-red-50',       badge: 'bg-red-50 text-red-500',        badgeActive: 'bg-white/25 text-white' },
            { key: 'kiv',              label: 'KIV',                    active: 'bg-orange-500 text-white border-orange-500', inactive: 'bg-white text-gray-600 border-gray-300 hover:border-orange-400 hover:bg-orange-50', badge: 'bg-orange-50 text-orange-500',  badgeActive: 'bg-white/25 text-white' },
            { key: 'successful',        label: 'Successful',             active: 'bg-green-600 text-white border-green-600',   inactive: 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:bg-green-50',   badge: 'bg-green-50 text-green-500',    badgeActive: 'bg-white/25 text-white' },
            { key: 'non_successful',    label: 'Non-Successful',         active: 'bg-red-700 text-white border-red-700',       inactive: 'bg-white text-gray-600 border-gray-300 hover:border-red-500 hover:bg-red-50',       badge: 'bg-red-50 text-red-600',        badgeActive: 'bg-white/25 text-white' },
          ] as { key: ProspectStatus; label: string; active: string; inactive: string; badge: string; badgeActive: string }[]).map(tab => {
            const isActive = stageFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStageFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${isActive ? tab.active : tab.inactive}`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? tab.badgeActive : tab.badge}`}>
                  {stageCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Prospect Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                    <th className="hidden md:table-cell px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Product / ACE</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Last Updated</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredProspects.map((prospect) => {
                        const isOwner = prospect.agent_id === currentUser?.id;
                        const canEdit = !isViewOnly && isOwner;

                        return (
                        <tr key={prospect.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-xs">
                                {prospect.prospect_name.charAt(0)}
                                </div>
                                <span className="font-medium text-gray-900">{prospect.prospect_name}</span>
                            </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                            {prospect.prospect_phone}
                            </td>
                            <td className="px-6 py-4">
                            {getStageBadge(prospect)}
                            </td>
                            <td className="hidden md:table-cell px-6 py-4">
                              {prospect.sales_outcome === 'successful' ? (
                                <div>
                                  <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
                                    <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                    <span className="truncate max-w-[160px]">{getProspectProducts(prospect)}</span>
                                  </div>
                                  <div className="text-xs font-semibold text-green-700 mt-0.5">
                                    RM {getProspectACE(prospect).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-sm">—</span>
                              )}
                            </td>
                            <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-500">
                            {formatDate(prospect.updated_at)}
                            </td>
                            <td className="px-6 py-4 text-right">
                            <button
                                onClick={() => handleViewProspect(prospect)}
                                className={`${canEdit ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500 hover:text-gray-700'} font-medium text-sm flex items-center justify-end w-full`}
                            >
                                {canEdit ? (
                                    <>Edit <ChevronRight className="w-4 h-4 ml-1" /></>
                                ) : (
                                    <><Eye className="w-4 h-4 mr-1" /> View</>
                                )}
                            </button>
                            </td>
                        </tr>
                        );
                    })}
                    {filteredProspects.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No prospects found.
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
        </div>
      )}

      {/* CARD VIEW */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProspects.map(prospect => {
                const isOwner = prospect.agent_id === currentUser?.id;
                const canEdit = !isViewOnly && isOwner;

                return (
                    <div key={prospect.id} className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all flex flex-col justify-between h-full ${
                      prospect.sales_outcome === 'successful'
                        ? 'border-green-200 hover:border-green-300'
                        : 'border-gray-100 hover:border-blue-200'
                    }`}>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 font-bold text-sm shadow-sm ${
                                      prospect.sales_outcome === 'successful'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-blue-100 text-blue-600'
                                    }`}>
                                        {prospect.prospect_name.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-gray-900 truncate pr-2" title={prospect.prospect_name}>{prospect.prospect_name}</h3>
                                        <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                            <Phone className="w-3 h-3 mr-1" /> {prospect.prospect_phone}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                {getStageBadge(prospect)}
                            </div>

                            {/* Closed sale details */}
                            {prospect.sales_outcome === 'successful' && (
                              <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 mb-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                  <span className="font-medium truncate">{getProspectProducts(prospect)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm font-bold text-green-700">
                                  <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                                  RM {getProspectACE(prospect).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            )}
                        </div>

                        <div className="border-t border-gray-50 pt-3 flex items-center justify-between mt-auto">
                            <div className="text-xs text-gray-400 flex items-center" title="Last Updated">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(prospect.updated_at)}
                            </div>
                            <button
                                onClick={() => handleViewProspect(prospect)}
                                className={`${canEdit ? 'text-blue-600 hover:text-blue-800 bg-blue-50' : 'text-gray-600 hover:text-gray-800 bg-gray-50'} px-3 py-1.5 rounded-lg text-xs font-bold transition-colors`}
                            >
                                {canEdit ? 'Manage' : 'View'}
                            </button>
                        </div>
                    </div>
                )
            })}
            {filteredProspects.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No prospects found.</p>
                </div>
            )}
        </div>
      )}

      {isModalOpen && selectedProspect && (
        <ProspectCard 
          prospect={selectedProspect} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
};

export default Prospects;
