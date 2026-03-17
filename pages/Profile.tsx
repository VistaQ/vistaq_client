
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { UserCircle, Mail, IdCard, Users, Lock, Save, AlertCircle, CheckCircle, Bell, MessageSquare, Send } from 'lucide-react';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { sendWhatsApp } from '../services/whatsappService';

const Profile: React.FC = () => {
  const { currentUser, groups, updateProfile, refreshCurrentUser, changePassword } = useAuth();
  
  const [formData, setFormData] = useState<Partial<User>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Notification settings
  const { prefs, updatePrefs } = useNotificationPrefs();
  const [notifForm, setNotifForm] = useState(prefs);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleSaveNotifSettings = () => {
    updatePrefs(notifForm);
    setStatus({ msg: 'Notification settings saved!', type: 'success' });
  };

  const handleTestWhatsApp = async () => {
    setTestStatus('Sending...');
    try {
      await sendWhatsApp(
        notifForm.whatsappPhone,
        notifForm.whatsappApiKey,
        `VistaQ test message for ${currentUser?.name}. WhatsApp notifications are working!`
      );
      setTestStatus('Sent! Check your WhatsApp.');
    } catch {
      setTestStatus('Failed. Check your phone number and API key.');
    }
  };

  useEffect(() => {
      // Fetch fresh user data from API on load
      refreshCurrentUser();
  }, []);

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
  const groupName = currentUser.groupName || currentGroup?.name || 'Unassigned';

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

       {/* Notification Settings */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center border-b pb-2">
               <Bell className="w-5 h-5 mr-2 text-green-600" />
               Notification Settings
           </h3>

           <div className="space-y-6">
               {/* Channel toggles */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                       <div className="flex items-center gap-3">
                           <Mail className="w-5 h-5 text-blue-500" />
                           <div>
                               <p className="text-sm font-semibold text-gray-800">Email Notifications</p>
                               <p className="text-xs text-gray-400">Sent to {currentUser?.email}</p>
                           </div>
                       </div>
                       <input
                           type="checkbox"
                           checked={notifForm.emailEnabled}
                           onChange={e => setNotifForm({ ...notifForm, emailEnabled: e.target.checked })}
                           className="w-4 h-4 accent-blue-600"
                       />
                   </label>

                   <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                       <div className="flex items-center gap-3">
                           <MessageSquare className="w-5 h-5 text-green-500" />
                           <div>
                               <p className="text-sm font-semibold text-gray-800">WhatsApp Notifications</p>
                               <p className="text-xs text-gray-400">Via CallMeBot (free)</p>
                           </div>
                       </div>
                       <input
                           type="checkbox"
                           checked={notifForm.whatsappEnabled}
                           onChange={e => setNotifForm({ ...notifForm, whatsappEnabled: e.target.checked })}
                           className="w-4 h-4 accent-green-600"
                       />
                   </label>
               </div>

               {/* WhatsApp credentials — shown only when WhatsApp is on */}
               {notifForm.whatsappEnabled && (
                   <div className="bg-green-50 border border-green-100 rounded-lg p-4 space-y-3">
                       <div className="text-xs text-green-800 bg-green-100 rounded p-3 leading-relaxed">
                           <strong>One-time setup:</strong> Send a WhatsApp message to <strong>+34 644 59 98 32</strong> saying:<br />
                           <code className="bg-white px-1 rounded">I allow callmebot to send me messages</code><br />
                           You will receive your personal API key in reply. Enter it below.
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp Phone (no +, e.g. 60123456789)</label>
                           <input
                               type="tel"
                               value={notifForm.whatsappPhone}
                               onChange={e => setNotifForm({ ...notifForm, whatsappPhone: e.target.value })}
                               placeholder="60123456789"
                               className="block w-full bg-white border-gray-300 text-gray-900 rounded-lg border p-2.5 text-sm focus:ring-green-500 focus:border-green-500"
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CallMeBot API Key</label>
                           <input
                               type="text"
                               value={notifForm.whatsappApiKey}
                               onChange={e => setNotifForm({ ...notifForm, whatsappApiKey: e.target.value })}
                               placeholder="123456"
                               className="block w-full bg-white border-gray-300 text-gray-900 rounded-lg border p-2.5 text-sm focus:ring-green-500 focus:border-green-500"
                           />
                       </div>
                       <div className="flex items-center gap-3">
                           <button
                               type="button"
                               onClick={handleTestWhatsApp}
                               disabled={!notifForm.whatsappPhone || !notifForm.whatsappApiKey}
                               className="flex items-center gap-2 bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                           >
                               <Send className="w-4 h-4" /> Send Test Message
                           </button>
                           {testStatus && (
                               <span className="text-xs text-gray-600">{testStatus}</span>
                           )}
                       </div>
                   </div>
               )}

               {/* Trigger toggles */}
               <div>
                   <p className="text-xs font-bold text-gray-500 uppercase mb-3">Notify me when</p>
                   <div className="space-y-2">
                       <label className="flex items-center gap-3 cursor-pointer">
                           <input
                               type="checkbox"
                               checked={notifForm.triggers.salesAndAppointments}
                               onChange={e => setNotifForm({
                                   ...notifForm,
                                   triggers: { ...notifForm.triggers, salesAndAppointments: e.target.checked }
                               })}
                               className="w-4 h-4 accent-blue-600"
                           />
                           <span className="text-sm text-gray-700">I complete an appointment or make a sale</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer">
                           <input
                               type="checkbox"
                               checked={notifForm.triggers.coachingReminder}
                               onChange={e => setNotifForm({
                                   ...notifForm,
                                   triggers: { ...notifForm.triggers, coachingReminder: e.target.checked }
                               })}
                               className="w-4 h-4 accent-blue-600"
                           />
                           <span className="text-sm text-gray-700">I have a coaching session within 24 hours (WhatsApp only)</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer">
                           <input
                               type="checkbox"
                               checked={notifForm.triggers.staleProspects}
                               onChange={e => setNotifForm({
                                   ...notifForm,
                                   triggers: { ...notifForm.triggers, staleProspects: e.target.checked }
                               })}
                               className="w-4 h-4 accent-blue-600"
                           />
                           <span className="text-sm text-gray-700">I have prospects with no activity for 7+ days (email only)</span>
                       </label>
                   </div>
               </div>

               <div>
                   <button
                       type="button"
                       onClick={handleSaveNotifSettings}
                       className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center shadow-sm font-medium"
                   >
                       <Save className="w-4 h-4 mr-2" /> Save Notification Settings
                   </button>
               </div>
           </div>
       </div>
    </div>
  );
};

export default Profile;
