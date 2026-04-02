
import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/apiClient';
import { Group } from '../types';
import { Lock, Mail, User, Users, AlertCircle, Loader2, IdCard, MapPin, WifiOff } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getRegisterErrorMessage = (err: any): { field: 'general' | 'email' | 'agentCode' | 'group'; message: string } => {
  const msg: string = err?.message || 'An error occurred. Please try again.';
  const status: number = err?.status;

  if (!status && (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('failed to'))) {
    return { field: 'general', message: 'Unable to connect. Please check your internet connection and try again.' };
  }
  switch (status) {
    case 409:
      return { field: 'email', message: 'An account with this email already exists.' };
    case 404:
      return { field: 'group', message: 'That group is no longer available. Please select another.' };
    case 429:
      return { field: 'general', message: 'Too many registration attempts. Please wait a moment and try again.' };
    case 400:
      if (msg.toLowerCase().includes('agent code')) return { field: 'agentCode', message: msg };
      if (msg.toLowerCase().includes('email')) return { field: 'email', message: msg };
      return { field: 'general', message: msg };
    case 500:
    case 502:
    case 503:
      return { field: 'general', message: 'Our servers are experiencing issues. Please try again in a few minutes.' };
    default:
      return { field: 'general', message: msg };
  }
};

const Signup: React.FC = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // All hooks must be declared before any conditional return
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agentCode, setAgentCode] = useState('');
  const [password, setPassword] = useState('');
  const [groupId, setGroupId] = useState('');
  const [location, setLocation] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);

  // Field-level errors
  const [nameError, setNameError] = useState('');
  const [agentCodeError, setAgentCodeError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [groupError, setGroupError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [groupsLoadError, setGroupsLoadError] = useState(false);

  const fetchPublicGroups = () => {
    setGroupsLoadError(false);
    apiCall('/groups').then((res: any) => {
      const items: Group[] = Array.isArray(res.data) ? res.data : [];
      setPublicGroups(items);
    }).catch(() => {
      setGroupsLoadError(true);
    });
  };

  useEffect(() => {
    fetchPublicGroups();
  }, []);

  // Redirect authenticated users away from signup
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const clearErrors = () => {
    setNameError('');
    setAgentCodeError('');
    setEmailError('');
    setPasswordError('');
    setGroupError('');
    setLocationError('');
    setGeneralError('');
    setIsNetworkError(false);
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
    if (!location.trim()) {
      setLocationError('Location is required.');
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
      await register(name, email, password, groupId, agentCode, location);
      // register() sets currentUser — navigate directly to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const { field, message } = getRegisterErrorMessage(err);

      if (err?.status === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 30000);
      }
      if (err?.status === 404) {
        fetchPublicGroups();
        setGroupId('');
      }

      if (field === 'email') setEmailError(message);
      else if (field === 'agentCode') setAgentCodeError(message);
      else if (field === 'group') setGroupError(message);
      else {
        setGeneralError(message);
        if (!err?.status) setIsNetworkError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (hasError: boolean) =>
    `block w-full pl-10 pr-3 py-3 bg-white border rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 ${hasError ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-10 text-center">
          <div className="flex justify-center mb-4">
            <img src="/vistaq-logo.png" alt="VistaQ" className="h-16 w-auto" />
          </div>
          <p className="text-blue-100 text-sm tracking-wide">Join the Sales Team</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 text-sm border border-red-200">
                {isNetworkError
                  ? <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="font-semibold mb-0.5">{isNetworkError ? 'Connection Error' : 'Registration Failed'}</p>
                  <p>{generalError}</p>
                </div>
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
              {agentCodeError
                ? <p className="text-xs text-red-500 mt-1">{agentCodeError}</p>
                : <p className="text-xs text-gray-400 mt-1">Provided by your group leader or administrator.</p>
              }
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
                    <button type="button" onClick={() => navigate('/login')} className="font-bold underline">Sign in instead</button>
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
                : groupsLoadError
                  ? <p className="text-xs text-amber-600 mt-1">Groups could not be loaded. Please contact your administrator or trainer to complete registration.</p>
                  : <p className="text-xs text-gray-400 mt-1">Select the group assigned by your trainer.</p>
              }
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setLocationError(''); }}
                  className={fieldClass(!!locationError)}
                  placeholder="e.g. Kuala Lumpur"
                />
              </div>
              {locationError && <p className="text-xs text-red-500 mt-1">{locationError}</p>}
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
                    <button type="button" onClick={() => navigate('/privacy-policy')} className="text-blue-600 font-bold hover:underline">Privacy Policy</button>,
                    {' '}and I consent to the collection and processing of my Personal Data in accordance with the Personal Data Protection Act 2010 (Malaysia).
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isAgreed || rateLimited}
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating account...</> : 'Register Account'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p className="mb-2">Already have an account?</p>
            <button onClick={() => navigate('/login')} className="text-blue-600 font-bold hover:underline">
              Sign In
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Need help?{' '}
              <Link to="/support" className="text-blue-500 hover:text-blue-700 hover:underline font-medium">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
