
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole, Prospect, ProspectStage } from '../types';
import { Plus, Search, ChevronRight, User, Download, Eye } from 'lucide-react';
import ProspectCard from '../components/ProspectCard';

const Prospects: React.FC = () => {
  const { currentUser } = useAuth();
  const { getProspectsByScope } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for managing the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | Partial<Prospect> | null>(null);

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

  const getStageBadge = (stage: ProspectStage) => {
    const styles = {
      [ProspectStage.INFO]: 'bg-gray-100 text-gray-600',
      [ProspectStage.APPOINTMENT]: 'bg-blue-100 text-blue-600',
      [ProspectStage.MEETING]: 'bg-indigo-100 text-indigo-600',
      [ProspectStage.SALES]: 'bg-purple-100 text-purple-600',
      [ProspectStage.POINTS]: 'bg-green-100 text-green-600',
      [ProspectStage.CLOSED]: 'bg-red-100 text-red-600',
    };
    const labels = {
      [ProspectStage.INFO]: 'Info',
      [ProspectStage.APPOINTMENT]: 'Appointment',
      [ProspectStage.MEETING]: 'Sales Meeting',
      [ProspectStage.SALES]: 'Negotiation',
      [ProspectStage.POINTS]: 'Won',
      [ProspectStage.CLOSED]: 'Lost',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[stage]}`}>
        {labels[stage]}
      </span>
    );
  };

  // Logic: 
  // Agent -> Add
  // Leader -> Add (own)
  // Admin -> Add (any)
  // Trainer -> View Only (Cannot Add)
  const canAddProspect = currentUser?.role === UserRole.AGENT || currentUser?.role === UserRole.GROUP_LEADER || currentUser?.role === UserRole.ADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Prospect Management</h1>
        <div className="flex space-x-2">
            {isAdmin && (
                <button 
                onClick={handleExportCSV}
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center shadow-sm transition-colors font-medium text-sm"
                >
                <Download className="w-4 h-4 mr-2" />
                Export Data
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

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                // Determine if this user is "Viewing Only" for this specific row
                // Logic mirrors ProspectCard.tsx but simpler just for button label
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
                    {getStageBadge(prospect.currentStage)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(prospect.updatedAt).toLocaleDateString()}
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
