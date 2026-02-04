import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Group } from '../types';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Crown,
  GraduationCap,
  Briefcase
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
  const [formTrainerId, setFormTrainerId] = useState('');
  const [formAgentIds, setFormAgentIds] = useState<string[]>([]);

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Available Users for Selection
  const availableTrainers = users.filter(u => u.role === UserRole.TRAINER);
  // Potential Leaders: Existing Leaders (if reassigning) or Agents
  const potentialLeaders = users.filter(u => u.role === UserRole.GROUP_LEADER || u.role === UserRole.AGENT);
  // Potential Agents: Agents
  const potentialAgents = users.filter(u => u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER);

  const handleOpenModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormName(group.name);
      setFormLeaderId(group.leaderId);
      
      // Find current trainer(s) for this group
      const trainer = users.find(u => u.role === UserRole.TRAINER && u.managedGroupIds?.includes(group.id));
      setFormTrainerId(trainer ? trainer.id : '');

      // Get current agents
      const members = getGroupMembers(group.id);
      setFormAgentIds(members.map(m => m.id));
    } else {
      setEditingGroup(null); // New Group
      setFormName('');
      setFormLeaderId('');
      setFormTrainerId('');
      setFormAgentIds([]);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName || !formLeaderId) {
        alert("Group Name and Leader are required.");
        return;
    }

    if (editingGroup && editingGroup.id) {
        // Update
        updateGroup(editingGroup.id, formName, formLeaderId, formTrainerId || null, formAgentIds);
    } else {
        // Create
        addGroup(formName, formLeaderId, formTrainerId || null, formAgentIds);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Are you sure? This will disband the group and unassign all members.")) {
          deleteGroup(id);
      }
  };

  const toggleAgentSelection = (agentId: string) => {
      // Prevent selecting the leader as an agent simultaneously in the list (though logic handles it)
      if (agentId === formLeaderId) return;

      if (formAgentIds.includes(agentId)) {
          setFormAgentIds(prev => prev.filter(id => id !== agentId));
      } else {
          setFormAgentIds(prev => prev.filter(id => id !== formLeaderId).concat(agentId));
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Group Management</h1>
           <p className="text-sm text-gray-500">Create groups, assign trainers, leaders, and agents.</p>
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
                                    <p className="text-xs font-bold text-purple-700 uppercase">Assigned Trainer</p>
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
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                      <h3 className="font-bold text-gray-900">{editingGroup ? 'Edit Group' : 'Create New Group'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  
                  <div className="p-6 space-y-6">
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Trainer Assignment */}
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign Trainer</label>
                              <div className="relative">
                                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <select 
                                      className="w-full pl-10 bg-gray-50 border border-gray-300 text-gray-900 p-2.5 rounded-lg appearance-none"
                                      value={formTrainerId}
                                      onChange={e => setFormTrainerId(e.target.value)}
                                  >
                                      <option value="">Select Trainer...</option>
                                      {availableTrainers.map(t => (
                                          <option key={t.id} value={t.id}>{t.name}</option>
                                      ))}
                                  </select>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Trainer will have view access to this group.</p>
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
                                          // If user was selected as agent, unselect them
                                          if (formAgentIds.includes(e.target.value)) {
                                              setFormAgentIds(prev => prev.filter(id => id !== e.target.value));
                                          }
                                      }}
                                  >
                                      <option value="">Select Leader...</option>
                                      {potentialLeaders.map(l => (
                                          <option key={l.id} value={l.id}>
                                              {l.name} {l.groupId && l.groupId !== editingGroup?.id ? `(Currently in ${groups.find(g=>g.id===l.groupId)?.name})` : ''}
                                          </option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                      </div>

                      {/* Agent Selection */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Add Agents to Group</label>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                              {potentialAgents.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {potentialAgents.map(agent => {
                                          const isLeader = agent.id === formLeaderId;
                                          const isAssignedElsewhere = agent.groupId && agent.groupId !== editingGroup?.id;
                                          
                                          if (isLeader) return null; // Don't show selected leader in agent list

                                          return (
                                              <label key={agent.id} className={`flex items-center space-x-3 p-2 rounded hover:bg-white border border-transparent hover:border-gray-200 cursor-pointer transition-all ${isAssignedElsewhere ? 'opacity-50' : ''}`}>
                                                  <input 
                                                      type="checkbox"
                                                      checked={formAgentIds.includes(agent.id)}
                                                      onChange={() => toggleAgentSelection(agent.id)}
                                                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                  />
                                                  <div className="flex-1 overflow-hidden">
                                                      <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
                                                      <p className="text-xs text-gray-500 truncate">{agent.email}</p>
                                                      {isAssignedElsewhere && (
                                                          <p className="text-[10px] text-orange-600">
                                                              In: {groups.find(g => g.id === agent.groupId)?.name}
                                                          </p>
                                                      )}
                                                  </div>
                                              </label>
                                          );
                                      })}
                                  </div>
                              ) : (
                                  <p className="text-center text-gray-500 text-sm">No available agents found.</p>
                              )}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                              Selecting an agent already in another group will reassign them to this group.
                          </p>
                      </div>

                      <div className="pt-4 flex justify-end">
                          <button 
                             onClick={handleSave}
                             className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg"
                          >
                             {editingGroup ? 'Save Changes' : 'Create Group'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminGroups;