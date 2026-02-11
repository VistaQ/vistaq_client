
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
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
  IdCard
} from 'lucide-react';

const AdminUsers: React.FC = () => {
  const { users, groups, addUser, updateUser, deleteUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser({ ...user });
    } else {
      setEditingUser({
        name: '',
        email: '',
        role: UserRole.AGENT,
        password: 'password', // Default
        groupId: '',
        agentCode: '',
        managedGroupIds: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!editingUser || !editingUser.name || !editingUser.email) return;

    if (editingUser.id) {
      updateUser(editingUser.id, editingUser);
    } else {
      addUser(editingUser);
    }
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUser(id);
    }
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
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.TRAINER}>Trainer</option>
            <option value={UserRole.GROUP_LEADER}>Group Leader</option>
            <option value={UserRole.AGENT}>Agent</option>
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
                       <span className={`px-2 py-1 rounded-full text-xs font-bold
                          ${user.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' :
                            user.role === UserRole.TRAINER ? 'bg-purple-100 text-purple-700' : 
                            'bg-blue-100 text-blue-700'}`}>
                          {user.role}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                       {user.agentCode || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                       {user.role === UserRole.TRAINER ? (
                          user.managedGroupIds && user.managedGroupIds.length > 0 
                             ? <span className="text-purple-600">Manages {user.managedGroupIds.length} Groups</span>
                             : <span className="text-gray-400">No Groups Assigned</span>
                       ) : (
                          groups.find(g => g.id === user.groupId)?.name || '-'
                       )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       <button onClick={() => handleOpenModal(user)} className="text-blue-600 hover:text-blue-800">
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                 </tr>
              ))}
           </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && editingUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-900">{editingUser.id ? 'Edit User' : 'Add New User'}</h3>
                  <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
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
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                        <input 
                           type="email" 
                           className="w-full bg-gray-50 border border-gray-300 text-gray-900 p-2 rounded" 
                           value={editingUser.email}
                           onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                        />
                     </div>
                  </div>
                  
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agent Code</label>
                      <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input 
                             type="text" 
                             className="w-full pl-9 bg-gray-50 border border-gray-300 text-gray-900 p-2 rounded" 
                             value={editingUser.agentCode || ''}
                             onChange={e => setEditingUser({...editingUser, agentCode: e.target.value})}
                             placeholder="e.g. AGT-12345"
                          />
                      </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                     <select 
                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 p-2 rounded"
                        value={editingUser.role}
                        onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                     >
                        <option value={UserRole.AGENT}>Agent</option>
                        <option value={UserRole.GROUP_LEADER}>Group Leader</option>
                        <option value={UserRole.TRAINER}>Trainer</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                     </select>
                  </div>

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
