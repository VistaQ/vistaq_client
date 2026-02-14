
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/apiClient';
import { Group } from '../types';
import { Lock, Mail, User, Users, AlertCircle, Loader2, IdCard } from 'lucide-react';

interface SignupProps {
  onSwitchToLogin: () => void;
  onNavigateToPolicy: (page: 'privacy' | 'pdpa') => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Signup: React.FC<SignupProps> = ({ onSwitchToLogin, onNavigateToPolicy }) => {
  const { register } = useAuth();

  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agentCode, setAgentCode] = useState('');
  const [password, setPassword] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);

  // Field-level errors
  const [nameError, setNameError] = useState('');
  const [agentCodeError, setAgentCodeError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [groupError, setGroupError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const fetchPublicGroups = () => {
    apiCall('/groups/public').then((data: any) => {
      const items: Group[] = Array.isArray(data) ? data : (data.groups || []);
      setPublicGroups(items);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchPublicGroups();
  }, []);

  const clearErrors = () => {
    setNameError('');
    setAgentCodeError('');
    setEmailError('');
    setPasswordError('');
    setGroupError('');
    setGeneralError('');
  };

  const validate = (): boolean => {
    let valid = true;
    if (name.trim().length < 2) {
      setNameError('Full name must be at least 2 characters.');
      valid = false;
    }
    if (!agentCode.trim()) {
      setAgentCodeError('Agent code is required.');
      valid = false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      valid = false;
    }
    if (!groupId) {
      setGroupError('Please select a group.');
      valid = false;
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!validate()) return;

    setLoading(true);
    try {
      // register() in AuthContext calls firebase.ts which saves token/user and
      // triggers onAuthStateChanged → sets currentUser → app auto-redirects to dashboard
      await register(name, email, password, groupId, agentCode);
    } catch (err: any) {
      const msg: string = err?.message || 'An error occurred. Please try again.';
      const status: number = err?.status;

      if (status === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 5000);
        setGeneralError(msg);
      } else if (status === 409) {
        setEmailError(msg);
      } else if (status === 404) {
        // Group no longer exists — reload list
        fetchPublicGroups();
        setGroupId('');
        setGroupError('That group is no longer available. Please select another.');
      } else if (status === 400 && msg.toLowerCase().includes('agent code')) {
        setAgentCodeError(msg);
      } else if (status === 400 && msg.toLowerCase().includes('email')) {
        setEmailError(msg);
      } else {
        setGeneralError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (hasError: boolean) =>
    `block w-full pl-10 pr-3 py-3 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-10 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
             <span className="font-brand text-4xl text-white font-bold italic">V</span>
          </div>
          <h1 className="text-3xl font-brand font-medium text-white mb-1">VistaQ</h1>
          <p className="text-blue-100 text-sm tracking-wide">Join the Sales Team</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {generalError}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(''); }}
                  className={fieldClass(!!nameError)}
                  placeholder="John Doe"
                />
              </div>
              {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
            </div>

            {/* Agent Code */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Agent Code</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={agentCode}
                  onChange={(e) => { setAgentCode(e.target.value); setAgentCodeError(''); }}
                  className={fieldClass(!!agentCodeError)}
                  placeholder="e.g. AGT-12345"
                />
              </div>
              {agentCodeError && <p className="text-xs text-red-500 mt-1">{agentCodeError}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  className={fieldClass(!!emailError)}
                  placeholder="you@company.com"
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-500 mt-1">
                  {emailError}{' '}
                  {emailError.toLowerCase().includes('already') && (
                    <button type="button" onClick={onSwitchToLogin} className="font-bold underline">Sign in instead</button>
                  )}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  className={fieldClass(!!passwordError)}
                  placeholder="Min. 6 characters"
                />
              </div>
              {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
            </div>

            {/* Group */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Assign Group</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={groupId}
                  onChange={(e) => { setGroupId(e.target.value); setGroupError(''); }}
                  className={`${fieldClass(!!groupError)} appearance-none`}
                >
                    <option value="" disabled>Select your group</option>
                    {publicGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
              </div>
              {groupError
                ? <p className="text-xs text-red-500 mt-1">{groupError}</p>
                : <p className="text-xs text-gray-500 mt-1">Select the group assigned by your trainer.</p>
              }
            </div>

            {/* Compliance Checkbox */}
            <div className="pt-2">
                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input
                            id="compliance"
                            type="checkbox"
                            checked={isAgreed}
                            onChange={(e) => setIsAgreed(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="compliance" className="text-gray-600 leading-tight">
                            I acknowledge that I have read and understood the{' '}
                            <button type="button" onClick={() => onNavigateToPolicy('privacy')} className="text-blue-600 font-bold hover:underline">Privacy Policy</button>
                            {' '}and{' '}
                            <button type="button" onClick={() => onNavigateToPolicy('pdpa')} className="text-blue-600 font-bold hover:underline">PDPA Notice</button>,
                            {' '}and I consent to the collection and processing of my Personal Data in accordance with the Personal Data Protection Act 2010 (Malaysia).
                        </label>
                    </div>
                </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isAgreed || rateLimited}
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Account'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p className="mb-2">Already have an account?</p>
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 font-bold hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
