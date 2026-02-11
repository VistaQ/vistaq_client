
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Group } from '../types';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Crown,
  GraduationCap,
  Briefcase,
  Check
} from 'lucide-react';

const AdminGroups: React.FC = () => {
  const { groups, users, addGroup, updateGroup, deleteGroup, getGroupMembers } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<Group> | null>(null);
  
  // Form State for Modal
  const [formName, setFormName] = useState('');
  const [formLeaderId, setFormLeaderId] = useState('');
  const [formTrainerIds, setFormTrainerIds] = useState<string[]>([]);
  const [formAgentIds, setFormAgentIds] = useState<string[]>([]);

  // Search states within Modal
  const [trainerSearch, setTrainerSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Available Users for Selection
  const availableTrainers = users.filter(u => u.role === UserRole.TRAINER);
  // Potential Leaders: Existing Leaders or Agents
  const potentialLeaders = users.filter(u => u.role === UserRole.GROUP_LEADER || u.role === UserRole.AGENT);
  // Potential Agents: Agents, Leaders
  const potentialAgents = users.filter(u => u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER);

  const handleOpenModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormName(group.name);
      setFormLeaderId(group.leaderId);
      
      // Find current trainer(s) for this group
      const assignedTrainers = users.filter(u => u.role === UserRole.TRAINER && u.managedGroupIds?.includes(group.id)).map(u => u.id);
      setFormTrainerIds(assignedTrainers);

      // Get current agents
      const members = getGroupMembers(group.id);
      setFormAgentIds(members.map(m => m.id));
    } else {
      setEditingGroup(null); // New Group
      setFormName('');
      setFormLeaderId('');
      setFormTrainerIds([]);
      setFormAgentIds([]);
    }
    setTrainerSearch('');
    setAgentSearch('');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName || !formLeaderId) {
        alert("Group Name and Leader are required.");
        return;
    }

    if (editingGroup && editingGroup.id) {
        // Update
        updateGroup(editingGroup.id, formName, formLeaderId, formTrainerIds, formAgentIds);
    } else {
        // Create
        addGroup(formName, formLeaderId, formTrainerIds, formAgentIds);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Are you sure? This will disband the group and unassign all members.")) {
          deleteGroup(id);
      }
  };

  const toggleAgentSelection = (agentId: string) => {
      // Prevent selecting the leader as an agent simultaneously in the list
      if (agentId === formLeaderId) return;

      if (formAgentIds.includes(agentId)) {
          setFormAgentIds(prev => prev.filter(id => id !== agentId));
      } else {
          setFormAgentIds(prev => [...prev, agentId]);
      }
  };

  const toggleTrainerSelection = (trainerId: string) => {
      if (formTrainerIds.includes(trainerId)) {
          setFormTrainerIds(prev => prev.filter(id => id !== trainerId));
      } else {
          setFormTrainerIds(prev => [...prev, trainerId]);
      }
  };

  // Filter lists inside modal
  const filteredTrainersList = availableTrainers.filter(t => 
      t.name.toLowerCase().includes(trainerSearch.toLowerCase()) || 
      t.email.toLowerCase().includes(trainerSearch.toLowerCase())
  );

  const filteredAgentsList = potentialAgents.filter(a => 
      a.id !== formLeaderId && // Exclude currently selected leader from agent list
      (a.name.toLowerCase().includes(agentSearch.toLowerCase()) || 
       a.email.toLowerCase().includes(agentSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Group Management</h1>
           <p className="text-sm text-gray-500">Centralized control for assignments, trainers, leaders, and agents.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-w-md">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search groups..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {filteredGroups.map(group => {
             const members = getGroupMembers(group.id);
             const leader = users.find(u => u.id === group.leaderId);
             const trainers = users.filter(u => u.role === UserRole.TRAINER && u.managedGroupIds?.includes(group.id));

             return (
                 <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-gray-900">{group.name}</h3>
                            <div className="flex space-x-1">
                                <button onClick={() => handleOpenModal(group)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(group.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                <Crown className="w-5 h-5 text-yellow-600 mr-3" />
                                <div>
                                    <p className="text-xs font-bold text-yellow-700 uppercase">Group Leader</p>
                                    <p className="text-sm font-medium text-gray-900">{leader?.name || 'Unassigned'}</p>
                                </div>
                            </div>

                            <div className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                                <GraduationCap className="w-5 h-5 text-purple-600 mr-3" />
                                <div>
                                    <p className="text-xs font-bold text-purple-700 uppercase">Assigned Trainers</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {trainers.length > 0 ? trainers.map(t => t.name).join(', ') : 'No Trainer Assigned'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <Briefcase className="w-5 h-5 text-blue-600 mr-3" />
                                <div>
                                    <p className="text-xs font-bold text-blue-700 uppercase">Agents</p>
                                    <p className="text-sm font-medium text-gray-900">{members.length} Members</p>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
             );
         })}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900 text-lg">{editingGroup ? 'Edit Group Assignment' : 'Create New Group'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Name */}
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Group Name</label>
                              <input 
                                  type="text" 
                                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500" 
                                  value={formName}
                                  onChange={e => setFormName(e.target.value)}
                                  placeholder="e.g. The Avengers"
                              />
                          </div>

                          {/* Leader Assignment */}
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign Group Leader</label>
                              <div className="relative">
                                  <Crown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <select 
                                      className="w-full pl-10 bg-gray-50 border border-gray-300 text-gray-900 p-2.5 rounded-lg appearance-none"
                                      value={formLeaderId}
                                      onChange={e => {
                                          setFormLeaderId(e.target.value);
                                          // If user was selected as agent, unselect them automatically
                                          if (formAgentIds.includes(e.target.value)) {
                                              setFormAgentIds(prev => prev.filter(id => id !== e.target.value));
                                          }
                                      }}
                                  >
                                      <option value="">Select Leader...</option>
                                      {potentialLeaders.map(l => (
                                          <option key={l.id} value={l.id}>
                                              {l.name} {l.groupId && l.groupId !== editingGroup?.id ? `(In ${groups.find(g=>g.id===l.groupId)?.name})` : ''}
                                          </option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-96">
                          {/* Trainer Assignment Column */}
                          <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden">
                              <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                                  <label className="text-xs font-bold text-purple-800 uppercase flex items-center">
                                      <GraduationCap className="w-4 h-4 mr-2" /> Assign Trainers
                                  </label>
                              </div>
                              <div className="p-2 border-b border-gray-100">
                                  <input 
                                      type="text" 
                                      placeholder="Search trainers..."
                                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                                      value={trainerSearch}
                                      onChange={e => setTrainerSearch(e.target.value)}
                                  />
                              </div>
                              <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50 space-y-1">
                                  {filteredTrainersList.map(t => (
                                      <div 
                                        key={t.id} 
                                        onClick={() => toggleTrainerSelection(t.id)}
                                        className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${formTrainerIds.includes(t.id) ? 'bg-purple-100 border border-purple-200' : 'hover:bg-gray-100 border border-transparent'}`}
                                      >
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${formTrainerIds.includes(t.id) ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'}`}>
                                              {formTrainerIds.includes(t.id) && <Check className="w-3 h-3 text-white" />}
                                          </div>
                                          <div className="flex-1 overflow-hidden">
                                              <p className={`text-sm font-medium ${formTrainerIds.includes(t.id) ? 'text-purple-900' : 'text-gray-700'}`}>{t.name}</p>
                                              <p className="text-xs text-gray-500">{t.email}</p>
                                          </div>
                                      </div>
                                  ))}
                                  {filteredTrainersList.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No trainers found.</p>}
                              </div>
                          </div>

                          {/* Agent Assignment Column */}
                          <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden">
                              <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                                  <label className="text-xs font-bold text-blue-800 uppercase flex items-center">
                                      <Briefcase className="w-4 h-4 mr-2" /> Assign Agents
                                  </label>
                              </div>
                              <div className="p-2 border-b border-gray-100">
                                  <input 
                                      type="text" 
                                      placeholder="Search agents..."
                                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                                      value={agentSearch}
                                      onChange={e => setAgentSearch(e.target.value)}
                                  />
                              </div>
                              <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50 space-y-1">
                                  {filteredAgentsList.map(agent => {
                                      const isSelected = formAgentIds.includes(agent.id);
                                      const isAssignedElsewhere = agent.groupId && agent.groupId !== editingGroup?.id;
                                      
                                      return (
                                          <div 
                                            key={agent.id} 
                                            onClick={() => toggleAgentSelection(agent.id)}
                                            className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 border border-blue-200' : 'hover:bg-gray-100 border border-transparent'}`}
                                          >
                                              <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                              </div>
                                              <div className="flex-1 overflow-hidden">
                                                  <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{agent.name}</p>
                                                  <p className="text-xs text-gray-500 truncate">{agent.email}</p>
                                                  {isAssignedElsewhere && !isSelected && (
                                                      <p className="text-[10px] text-orange-600">
                                                          Currently in: {groups.find(g => g.id === agent.groupId)?.name}
                                                      </p>
                                                  )}
                                                  {isAssignedElsewhere && isSelected && (
                                                      <p className="text-[10px] text-blue-600 font-bold">
                                                          Will move to this group
                                                      </p>
                                                  )}
                                              </div>
                                          </div>
                                      );
                                  })}
                                  {filteredAgentsList.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No agents found.</p>}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 border-t bg-white flex justify-end">
                      <button 
                          onClick={handleSave}
                          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-transform active:scale-95"
                      >
                          {editingGroup ? 'Save Group Configuration' : 'Create Group'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminGroups;
