
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Group } from '../types';
import { apiCall } from '../services/apiClient';
import { UserCircle, Mail, IdCard, Users, Lock, Save, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { UserRole } from '../types';

const Profile: React.FC = () => {
  const { currentUser, updateProfile, refreshCurrentUser, changePassword } = useAuth();

  const [groups, setGroups] = useState<Group[]>([]);
  const [salesTarget, setSalesTarget] = useState<string>('');   // FYCt target
  const [fycTarget, setFycTarget]     = useState<string>('');   // FYC target

  const [formData, setFormData] = useState<Partial<User>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
      refreshCurrentUser();
      apiCall('/groups').then(res => setGroups(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
      if (currentUser) {
          setFormData({
              name: currentUser.name,
              email: currentUser.email,
              agent_code: currentUser.agent_code || '',
          });
          const saved = localStorage.getItem(`salesTarget_${currentUser.id}`);
          setSalesTarget(saved ?? '');
          const savedFyc = localStorage.getItem(`fycTarget_${currentUser.id}`);
          setFycTarget(savedFyc ?? '');
      }
  }, [currentUser]);

  if (!currentUser) return null;

  const currentGroup = groups.find(g => g.id === currentUser.group_id);
  const groupName = currentGroup?.name || 'Unassigned';

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus(null);
      
      try {
          await updateProfile({
              name: formData.name,
              email: formData.email,
          });
          setStatus({ msg: 'Profile updated successfully!', type: 'success' });
      } catch (err: any) {
          setStatus({ msg: err?.message || 'Failed to update profile.', type: 'error' });
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
      } catch (err: any) {
          setStatus({ msg: err?.message || 'Failed to change password.', type: 'error' });
      }
  };

  const canSetTarget = currentUser.role === UserRole.AGENT || currentUser.role === UserRole.GROUP_LEADER;

  const handleSaveTarget = (e: React.FormEvent) => {
      e.preventDefault();
      const fyctVal = parseFloat(salesTarget.replace(/,/g, ''));
      const fycVal  = parseFloat(fycTarget.replace(/,/g, ''));

      if (isNaN(fyctVal) || fyctVal <= 0) {
          setStatus({ msg: 'Please enter a valid FYCt target greater than 0.', type: 'error' });
          return;
      }
      if (fycTarget && (isNaN(fycVal) || fycVal <= 0)) {
          setStatus({ msg: 'Please enter a valid FYC target greater than 0, or leave it blank.', type: 'error' });
          return;
      }

      localStorage.setItem(`salesTarget_${currentUser.id}`, String(fyctVal));
      if (!isNaN(fycVal) && fycVal > 0) {
          localStorage.setItem(`fycTarget_${currentUser.id}`, String(fycVal));
      } else {
          localStorage.removeItem(`fycTarget_${currentUser.id}`);
      }
      setStatus({ msg: 'Sales targets saved successfully!', type: 'success' });
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
                               className="block w-full pl-10 bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
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
                               className="block w-full pl-10 bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                           />
                       </div>
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agent Code</label>
                       <div className="relative">
                           <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                           <input
                               type="text"
                               value={formData.agent_code || ''}
                               readOnly
                               className="block w-full pl-10 bg-gray-100 border-gray-200 text-gray-500 rounded-lg border p-2.5 cursor-not-allowed"
                           />
                       </div>
                       <p className="text-xs text-gray-400 mt-1">Agent code can only be changed by an administrator.</p>
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assigned Group</label>
                       <div className="relative">
                           <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                           <input
                               type="text"
                               disabled
                               value={groupName}
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
                           className="block w-full bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                           placeholder="••••••••"
                       />
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm New Password</label>
                       <input 
                           type="password"
                           value={confirmPassword}
                           onChange={e => setConfirmPassword(e.target.value)}
                           className="block w-full bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
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

       {/* Sales Targets — Agent & Group Leader only */}
       {canSetTarget && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center border-b pb-2">
                   <Target className="w-5 h-5 mr-2 text-green-600" />
                   Annual Sales Targets
               </h3>
               <p className="text-sm text-gray-500 mb-5 mt-3">
                   Set your personal annual FYCt and FYC targets in RM. These figures drive the progress bars, shortage calculations, and statistics on your Sales Report and Dashboard.
               </p>
               <form onSubmit={handleSaveTarget} className="space-y-4">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {/* FYCt Target */}
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">FYCt Annual Target (RM) <span className="text-red-500">*</span></label>
                           <div className="relative">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">RM</span>
                               <input
                                   type="number"
                                   value={salesTarget}
                                   onChange={e => setSalesTarget(e.target.value)}
                                   placeholder="e.g. 400000"
                                   className="block w-full pl-10 bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                               />
                           </div>
                           {salesTarget && !isNaN(parseFloat(salesTarget)) && (
                               <p className="text-xs text-gray-400 mt-1">
                                   ≈ RM {(parseFloat(salesTarget) / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} / month
                               </p>
                           )}
                       </div>
                       {/* FYC Target */}
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">FYC Annual Target (RM) <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                           <div className="relative">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">RM</span>
                               <input
                                   type="number"
                                   value={fycTarget}
                                   onChange={e => setFycTarget(e.target.value)}
                                   placeholder="e.g. 300000"
                                   className="block w-full pl-10 bg-gray-50 border-gray-300 text-gray-900 rounded-lg border p-2.5 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                               />
                           </div>
                           {fycTarget && !isNaN(parseFloat(fycTarget)) && (
                               <p className="text-xs text-gray-400 mt-1">
                                   ≈ RM {(parseFloat(fycTarget) / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} / month
                               </p>
                           )}
                           {!fycTarget && (
                               <p className="text-xs text-gray-400 mt-1">If blank, FYCt target is used for FYC calculations.</p>
                           )}
                       </div>
                   </div>
                   <div>
                       <button type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 flex items-center shadow-sm font-medium whitespace-nowrap">
                           <Save className="w-4 h-4 mr-2" /> Save Targets
                       </button>
                   </div>
               </form>
           </div>
       )}

    </div>
  );
};

export default Profile;
