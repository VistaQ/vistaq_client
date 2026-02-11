
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole, Prospect, ProspectStage } from '../types';
import { Plus, Search, ChevronRight, User, Download, Eye, LayoutList, LayoutGrid, Phone, Calendar } from 'lucide-react';
import ProspectCard from '../components/ProspectCard';

const Prospects: React.FC = () => {
  const { currentUser } = useAuth();
  const { getProspectsByScope } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for managing the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | Partial<Prospect> | null>(null);

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
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm)
  );

  const handleCreateNew = () => {
    if (!currentUser) return;
    // Open modal with a skeleton prospect object
    setSelectedProspect({
      agentId: currentUser.id,
      name: '',
      phone: '',
      currentStage: ProspectStage.INFO
    });
    setIsModalOpen(true);
  };

  const handleViewProspect = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProspect(null);
  };

  const handleExportCSV = () => {
    // Generate CSV content
    const headers = ['ID', 'Name', 'Phone', 'Group/Agent', 'Stage', 'Outcome', 'Reason (If Lost)', 'Product', 'Amount (MYR)', 'Date'];
    const rows = filteredProspects.map(p => {
      let outcomeLabel = 'Ongoing';
      if (p.saleStatus === 'SUCCESSFUL') outcomeLabel = 'Won';
      else if (p.saleStatus === 'UNSUCCESSFUL') outcomeLabel = 'Lose';
      else if (p.saleStatus === 'KIV') outcomeLabel = 'KIV';

      return [
        p.id, 
        p.name, 
        p.phone, 
        p.agentId,
        p.currentStage,
        outcomeLabel, 
        p.saleReason || 'N/A',
        p.productType || 'N/A', 
        p.policyAmountMYR || 0, 
        p.updatedAt
      ]
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VistaQ_Prospects_Export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // UPDATED: Logic to handle new labeling requirements
  const getStageBadge = (prospect: Prospect) => {
    const { currentStage, appointmentStatus, saleStatus } = prospect;

    // 1. Sales Outcome Priorities
    if (saleStatus === 'SUCCESSFUL' || currentStage === ProspectStage.POINTS) {
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Successful</span>;
    }
    if (saleStatus === 'UNSUCCESSFUL' || currentStage === ProspectStage.CLOSED) {
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Non-Successful</span>;
    }
    if (saleStatus === 'KIV') {
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">KIV</span>;
    }

    // 2. Appointment Statuses
    if (appointmentStatus === 'Declined') {
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">Appt Declined</span>;
    }
    if (appointmentStatus === 'Completed') {
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700">Appt Done</span>;
    }
    
    // 3. General Workflow Stages (Appointment / Meeting)
    // Covers Scheduled, Rescheduled, Not Done, KIV (Appt level)
    if (currentStage === ProspectStage.APPOINTMENT || currentStage === ProspectStage.MEETING) {
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">Appointment</span>;
    }

    // 4. Basic Info (New)
    if (currentStage === ProspectStage.INFO) {
         return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">New</span>;
    }

    // Fallback
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Info</span>;
  };

  // Logic: 
  // Agent -> Add
  // Leader -> Add (own)
  // Admin -> Add (any)
  // Trainer -> View Only (Cannot Add)
  const canAddProspect = currentUser?.role === UserRole.AGENT || currentUser?.role === UserRole.GROUP_LEADER || currentUser?.role === UserRole.ADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
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

            {isAdmin && (
                <button 
                onClick={handleExportCSV}
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center shadow-sm transition-colors font-medium text-sm"
                >
                <Download className="w-4 h-4 mr-2" />
                Export
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
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                        const isOwner = prospect.agentId === currentUser?.id;
                        const canEdit = isAdmin || isOwner;
                        
                        return (
                        <tr key={prospect.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-xs">
                                {prospect.name.charAt(0)}
                                </div>
                                <span className="font-medium text-gray-900">{prospect.name}</span>
                            </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                            {prospect.phone}
                            </td>
                            <td className="px-6 py-4">
                            {getStageBadge(prospect)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(prospect.updatedAt)}
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
                const isOwner = prospect.agentId === currentUser?.id;
                const canEdit = isAdmin || isOwner;

                return (
                    <div key={prospect.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between h-full">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-sm shadow-sm">
                                        {prospect.name.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-gray-900 truncate pr-2" title={prospect.name}>{prospect.name}</h3>
                                        <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                            <Phone className="w-3 h-3 mr-1" /> {prospect.phone}
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
                                {formatDate(prospect.updatedAt)}
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
