
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole, Prospect, ProspectStage } from '../types';
import { Plus, Search, ChevronRight, User, Download, Eye, LayoutList, LayoutGrid, Phone, Calendar, Loader2 } from 'lucide-react';
import { apiCall } from '../services/apiClient';
import ProspectCard from '../components/ProspectCard';
import * as XLSX from 'xlsx';

const Prospects: React.FC = () => {
  const { currentUser } = useAuth();
  const { getProspectsByScope } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for managing the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | Partial<Prospect> | null>(null);
  const [loadingProspect, setLoadingProspect] = useState(false);

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
  
  const filteredProspects = prospects.filter(p =>
    (p.prospect_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.prospect_phone || '').includes(searchTerm)
  );

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
    try {
      const res = await apiCall(`/prospects/${prospect.id}`);
      const raw = res.data || prospect;
      const normalized: Prospect = {
        ...raw,
        products_sold: (raw.products_sold || []).map((p: any, i: number) => ({ ...p, id: p.id || `prod_${i}` })),
      };
      setSelectedProspect(normalized);
      setIsModalOpen(true);
    } catch (_e) {
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
    const rows = filteredProspects.map(p => {
      let outcomeLabel = 'Ongoing';
      if (p.sales_outcome === 'successful') outcomeLabel = 'Won';
      else if (p.sales_outcome === 'unsuccessful') outcomeLabel = 'Lost';
      else if (p.sales_outcome === 'kiv') outcomeLabel = 'KIV';

      const totalAce = p.sales_outcome === 'successful'
        ? (p.products_sold || []).reduce((sum, prod) => sum + (prod.amount || 0), 0)
        : 0;
      const productNames = (p.products_sold || []).map(prod => prod.productName).filter(Boolean).join(', ');
      const formatTS = (val: any) => {
        if (!val) return '';
        const d = val._seconds ? new Date(val._seconds * 1000) : new Date(val);
        return !isNaN(d.getTime()) ? d.toLocaleDateString() : '';
      };

      return {
        'Prospect ID': p.id,
        'Name': p.prospect_name,
        'Email': p.prospect_email || '',
        'Phone': p.prospect_phone || '',
        'Stage': p.current_stage || '',
        'Appointment Status': p.appointment_status || '',
        'Appointment Date': formatTS(p.appointment_date),
        'Sales Outcome': outcomeLabel,
        'Lost Reason': p.unsuccessful_reason || '',
        'Products': productNames,
        'ACE Amount (MYR)': totalAce,
        'Created': formatTS(p.created_at),
        'Last Updated': formatTS(p.updated_at),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
    XLSX.writeFile(wb, `VistaQ_Prospects_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  // Admin -> Add (any)
  // Trainer -> View Only (Cannot Add)
  const canAddProspect = currentUser?.role === UserRole.AGENT || currentUser?.role === UserRole.GROUP_LEADER;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isViewOnly = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MASTER_TRAINER;

  const formatDate = (val: any) => {
    if (!val) return 'N/A';
    const d = new Date(val);
    return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
  };

  return (
    <div className="space-y-6">
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
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
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Last Updated</th>
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
                            <td className="px-6 py-4 text-sm text-gray-500">
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
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
                    <div key={prospect.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between h-full">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-sm shadow-sm">
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
