
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Users, AlertCircle, Loader2, IdCard, CheckSquare } from 'lucide-react';

interface SignupProps {
  onSwitchToLogin: () => void;
  onNavigateToPolicy: (page: 'privacy' | 'pdpa') => void;
}

const Signup: React.FC<SignupProps> = ({ onSwitchToLogin, onNavigateToPolicy }) => {
  const { register, groups } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agentCode, setAgentCode] = useState('');
  const [password, setPassword] = useState('');
  const [groupId, setGroupId] = useState('');
  
  // Consent State
  const [isAgreed, setIsAgreed] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!groupId) {
        setError('Please select a group.');
        return;
    }
    
    if (!isAgreed) {
        setError('You must agree to the Privacy Policy and PDPA Notice to proceed.');
        return;
    }

    setLoading(true);

    try {
      const success = await register(name, email, password, groupId, agentCode);
      if (success) {
          // Redirect to login handled by parent or success message flow, but usually user logs in after.
          // For UX, we can switch them to login
          setTimeout(() => onSwitchToLogin(), 2000); 
      } else {
        setError('Account creation failed. Email might be already taken.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Agent Code</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  required
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g. AGT-12345"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Assign Group</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
                >
                    <option value="" disabled>Select your group</option>
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">Select the group assigned by your trainer.</p>
            </div>
            
            {/* COMPLIANCE CHECKBOX */}
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
                            I acknowledge that I have read and understood the <button type="button" onClick={() => onNavigateToPolicy('privacy')} className="text-blue-600 font-bold hover:underline">Privacy Policy</button> and <button type="button" onClick={() => onNavigateToPolicy('pdpa')} className="text-blue-600 font-bold hover:underline">PDPA Notice</button>, and I consent to the collection and processing of my Personal Data in accordance with the Personal Data Protection Act 2010 (Malaysia).
                        </label>
                    </div>
                </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isAgreed}
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
