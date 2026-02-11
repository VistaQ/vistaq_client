
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
import { UserCircle, Mail, IdCard, Users, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

const Profile: React.FC = () => {
  const { currentUser, groups, updateUser, changePassword } = useAuth();
  
  const [formData, setFormData] = useState<Partial<User>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
      if (currentUser) {
          setFormData({
              name: currentUser.name,
              email: currentUser.email,
              agentCode: currentUser.agentCode || '',
          });
      }
  }, [currentUser]);

  if (!currentUser) return null;

  const currentGroup = groups.find(g => g.id === currentUser.groupId);

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus(null);
      
      try {
          await updateUser(currentUser.id, {
              name: formData.name,
              email: formData.email,
              agentCode: formData.agentCode
          });
          setStatus({ msg: 'Profile updated successfully!', type: 'success' });
      } catch (err) {
          setStatus({ msg: 'Failed to update profile.', type: 'error' });
      }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus(null);

      if (newPassword !== confirmPassword) {
          setStatus({ msg: 'Passwords do not match.', type: 'error' });
          return;
      }

      if (newPassword.length < 6) {
          setStatus({ msg: 'Password must be at least 6 characters.', type: 'error' });
          return;
      }

      try {
          await changePassword(newPassword);
          setStatus({ msg: 'Password changed successfully!', type: 'success' });
          setNewPassword('');
          setConfirmPassword('');
      } catch (err) {
          setStatus({ msg: 'Failed to change password.', type: 'error' });
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex justify-between items-center">
          <div>
             <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
             <p className="text-sm text-gray-500">Manage your account settings and preferences.</p>
          </div>
       </div>

       {status && (
           <div className={`p-4 rounded-lg flex items-center ${
               status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
           }`}>
               {status.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
               {status.msg}
           </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* General Information */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center border-b pb-2">
                   <UserCircle className="w-5 h-5 mr-2 text-blue-600" />
                   Personal Information
               </h3>
               
               <form onSubmit={handleUpdateProfile} className="space-y-4">
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                       <div className="relative">
                           <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                           <input 
                               type="text"
                               value={formData.name || ''}
                               onChange={e => setFormData({...formData, name: e.target.value})}
                               className="block w-full pl-10 bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus:ring-blue-500 focus:border-blue-500"
                           />
                       </div>
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                       <div className="relative">
                           <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                           <input 
                               type="email"
                               value={formData.email || ''}
                               onChange={e => setFormData({...formData, email: e.target.value})}
                               className="block w-full pl-10 bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus:ring-blue-500 focus:border-blue-500"
                           />
                       </div>
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agent Code</label>
                       <div className="relative">
                           <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                           <input 
                               type="text"
                               value={formData.agentCode || ''}
                               onChange={e => setFormData({...formData, agentCode: e.target.value})}
                               className="block w-full pl-10 bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus:ring-blue-500 focus:border-blue-500"
                           />
                       </div>
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assigned Group</label>
                       <div className="relative">
                           <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                           <input 
                               type="text"
                               disabled
                               value={currentGroup?.name || 'Unassigned'}
                               className="block w-full pl-10 bg-gray-100 border-gray-200 text-gray-500 rounded-lg border p-2.5 cursor-not-allowed"
                           />
                       </div>
                       <p className="text-xs text-gray-400 mt-1">Group assignment can only be changed by an administrator.</p>
                   </div>

                   <div className="pt-2">
                       <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm font-medium">
                           <Save className="w-4 h-4 mr-2" /> Save Changes
                       </button>
                   </div>
               </form>
           </div>

           {/* Security Settings */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
               <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center border-b pb-2">
                   <Lock className="w-5 h-5 mr-2 text-indigo-600" />
                   Security Settings
               </h3>

               <form onSubmit={handlePasswordReset} className="space-y-4">
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                       <input 
                           type="password"
                           value={newPassword}
                           onChange={e => setNewPassword(e.target.value)}
                           className="block w-full bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="••••••••"
                       />
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm New Password</label>
                       <input 
                           type="password"
                           value={confirmPassword}
                           onChange={e => setConfirmPassword(e.target.value)}
                           className="block w-full bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="••••••••"
                       />
                   </div>

                   <div className="pt-2">
                       <button 
                         type="submit" 
                         disabled={!newPassword}
                         className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center shadow-sm font-medium disabled:opacity-50"
                       >
                           Reset Password
                       </button>
                   </div>
               </form>
           </div>
       </div>
    </div>
  );
};

export default Profile;
