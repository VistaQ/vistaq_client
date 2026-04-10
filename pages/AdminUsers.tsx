
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole, getRoleLabel, Group } from '../types';
import { apiCall } from '../services/apiClient';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  GraduationCap, 
  UserCheck, 
  X,
  IdCard,
  Key,
  Globe
} from 'lucide-react';

/** Generate a secure temporary password with guaranteed mixed-character entropy. */
const generateTempPassword = (): string => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';
  const all = upper + lower + digits + special;
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  const required = [
    upper[arr[0] % upper.length],
    lower[arr[1] % lower.length],
    digits[arr[2] % digits.length],
    special[arr[3] % special.length],
  ];
  const rest = Array.from(arr.slice(4), n => all[n % all.length]);
  const combined = [...required, ...rest];
  const shuffleArr = new Uint32Array(combined.length);
  crypto.getRandomValues(shuffleArr);
  return combined
    .map((v, i) => ({ v, sort: shuffleArr[i] }))
    .sort((a, b) => a.sort - b.sort)
    .map(x => x.v)
    .join('');
};

const AdminUsers: React.FC = () => {
  const { currentUser, addUser, updateUser, deleteUser } = useAuth();
  if (!currentUser || currentUser.role !== UserRole.ADMIN) return null;

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const fetchData = async () => {
    const [usersRes, groupsRes] = await Promise.all([
      apiCall('/users').catch(() => ({ data: [] })),
      apiCall('/groups').catch(() => ({ data: [] })),
    ]);
    setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
  };

  useEffect(() => { fetchData(); }, []);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Local state for temporary password
  const [tempPassword, setTempPassword] = useState('');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser({ ...user });
      setTempPassword(''); // Don't show password on edit usually
    } else {
      // New User Default
      const randomPass = generateTempPassword();
      setTempPassword(randomPass);
      setEditingUser({
        name: '',
        email: '',
        role: UserRole.AGENT,
        password: '', 
        group_id: '',
        agent_code: '',
        managedGroupIds: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser || !editingUser.name || !editingUser.email) return;

    if (editingUser.id) {
      await updateUser(editingUser.id, editingUser);
    } else {
      await addUser({ ...editingUser, password: tempPassword });
    }
    setIsModalOpen(false);
    setEditingUser(null);
    fetchData();
  };

  const handleDeleteUser = async (id: string) => {
    await deleteUser(id);
    setConfirmDeleteId(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
           <p className="text-sm text-gray-500">Add, edit, and remove system users.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
           className="bg-gray-50 border border-gray-300 text-gray-900 rounded-md shadow-sm p-2"
           value={filterRole}
           onChange={(e) => setFilterRole(e.target.value)}
        >
            <option value="all">All Roles</option>
            <option value={UserRole.ADMIN}>{getRoleLabel(UserRole.ADMIN)}</option>
            <option value={UserRole.MASTER_TRAINER}>{getRoleLabel(UserRole.MASTER_TRAINER)}</option>
            <option value={UserRole.TRAINER}>{getRoleLabel(UserRole.TRAINER)}</option>
            <option value={UserRole.GROUP_LEADER}>{getRoleLabel(UserRole.GROUP_LEADER)}</option>
            <option value={UserRole.AGENT}>{getRoleLabel(UserRole.AGENT)}</option>
        </select>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
           <thead className="bg-gray-50 border-b">
              <tr>
                 <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                 <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Role</th>
                 <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Agent Code</th>
                 <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Group Assignment</th>
                 <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(user => (
                 <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                       <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold text-xs text-white
                             ${user.role === UserRole.ADMIN ? 'bg-red-500' : 
                               user.role === UserRole.MASTER_TRAINER ? 'bg-slate-800' :
                               user.role === UserRole.TRAINER ? 'bg-purple-500' : 'bg-blue-500'}`}>
                             {user.name.charAt(0)}
                          </div>
                          <div>
                             <div className="font-medium text-gray-900">{user.name}</div>
                             <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit
                          ${user.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' :
                            user.role === UserRole.MASTER_TRAINER ? 'bg-gray-100 text-gray-700' :
                            user.role === UserRole.TRAINER ? 'bg-purple-100 text-purple-700' : 
                            'bg-blue-100 text-blue-700'}`}>
                          {user.role === UserRole.MASTER_TRAINER && <Globe className="w-3 h-3 mr-1" />}
                          {getRoleLabel(user.role)}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                       {user.agent_code || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                       {user.role === UserRole.TRAINER ? (
                          user.managedGroupIds && user.managedGroupIds.length > 0 
                             ? <span className="text-purple-600">Manages {user.managedGroupIds.length} Groups</span>
                             : <span className="text-gray-400">No Groups Assigned</span>
                       ) : (
                          groups.find(g => g.id === user.group_id)?.name || '-'
                       )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       <button onClick={() => handleOpenModal(user)} className="text-blue-600 hover:text-blue-800">
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => setConfirmDeleteId(user.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                 </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <p className="font-medium">No users match your search.</p>
                    {(searchTerm || filterRole !== 'all') && (
                      <button
                        onClick={() => { setSearchTerm(''); setFilterRole('all'); }}
                        className="mt-2 text-sm text-blue-600 hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
           </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Confirm Delete">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-red-600 flex justify-between items-center">
              <h3 className="font-semibold text-white">Delete User</h3>
              <button onClick={() => setConfirmDeleteId(null)} aria-label="Close" className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700">Are you sure you want to delete this user? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
                <button onClick={() => handleDeleteUser(confirmDeleteId)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && editingUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={editingUser.id ? 'Edit User' : 'Add New User'}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="px-6 py-4 bg-blue-600 flex justify-between items-center">
                  <h3 className="font-semibold text-white">{editingUser.id ? 'Edit User' : 'Add New User'}</h3>
                  <button onClick={() => setIsModalOpen(false)} aria-label="Close" className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                        <input
                           type="text"
                           className="w-full bg-gray-50 border border-gray-300 text-gray-900 p-2 rounded"
                           value={editingUser.name}
                           onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                           required
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                        <input
                           type="email"
                           className="w-full bg-gray-50 border border-gray-300 text-gray-900 p-2 rounded"
                           value={editingUser.email}
                           onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                           required
                        />
                     </div>
                  </div>
                  
                  {/* Password Field (Only relevant for New Users usually, or resetting) */}
                  {!editingUser.id && (
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temporary Password</label>
                          <div className="relative">
                              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input 
                                 type="text" 
                                 className="w-full pl-9 bg-gray-50 border border-gray-300 text-gray-900 p-2 rounded font-mono" 
                                 value={tempPassword}
                                 onChange={e => setTempPassword(e.target.value)}
                              />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Credentials will be emailed to the user upon creation.</p>
                      </div>
                  )}

                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                     <select 
                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 p-2 rounded"
                        value={editingUser.role}
                        onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                     >
                        <option value={UserRole.AGENT}>{getRoleLabel(UserRole.AGENT)}</option>
                        <option value={UserRole.GROUP_LEADER}>{getRoleLabel(UserRole.GROUP_LEADER)}</option>
                        <option value={UserRole.TRAINER}>{getRoleLabel(UserRole.TRAINER)}</option>
                        <option value={UserRole.MASTER_TRAINER}>{getRoleLabel(UserRole.MASTER_TRAINER)}</option>
                        <option value={UserRole.ADMIN}>{getRoleLabel(UserRole.ADMIN)}</option>
                     </select>
                  </div>

                  {/* Agent Code - ONLY IF AGENT */}
                  {editingUser.role === UserRole.AGENT && (
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agent Code</label>
                          <div className="relative">
                              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input 
                                 type="text" 
                                 className="w-full pl-9 bg-gray-50 border border-gray-300 text-gray-900 p-2 rounded" 
                                 value={editingUser.agent_code || ''}
                                 onChange={e => setEditingUser({...editingUser, agent_code: e.target.value})}
                                 placeholder="e.g. AGT-12345"
                              />
                          </div>
                      </div>
                  )}

                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-700">
                      <strong>Note:</strong> Group assignment, Trainer assignment, and Member management are now handled centrally in the <strong>Group Management</strong> page.
                  </div>

                  <div className="flex justify-end pt-4">
                     <button 
                        onClick={handleSaveUser}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700"
                     >
                        Save User
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AdminUsers;
