
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, Loader2, ChevronRight, User, X } from 'lucide-react';

interface LoginProps {
  onSwitchToSignup: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToSignup }) => {
  const { login, resetPassword } = useAuth();
  
  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(identifier, password);
      if (!success) {
        setError('Invalid credentials. Please check your Email and Password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail) return;
      
      setResetStatus('sending');
      try {
          await resetPassword(resetEmail);
          setResetStatus('sent');
          setTimeout(() => {
              setShowForgot(false);
              setResetStatus('idle');
              setResetEmail('');
          }, 3000);
      } catch (err) {
          setResetStatus('error');
      }
  };

  const fillCredentials = (id: string, p: string) => {
      setIdentifier(id);
      setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 relative z-10">
        <div className="bg-blue-600 p-10 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
             <span className="font-brand text-4xl text-white font-bold italic">V</span>
          </div>
          <h1 className="text-3xl font-brand font-medium text-white mb-1">VistaQ</h1>
          <p className="text-blue-100 text-sm tracking-wide">Sales Performance & Coaching</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
              <div className="flex justify-end mt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                      Forgot Password?
                  </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-70 flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p className="mb-2">Don't have an account?</p>
            <button 
              onClick={onSwitchToSignup}
              className="text-blue-600 font-bold hover:underline"
            >
              Register as a new Agent
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3 text-center">
                Quick Access (Mock Data)
             </p>
             <div className="space-y-2">
                 {[
                    { label: 'System Admin', id: 'admin@sys.com', role: 'System Config' },
                    { label: 'Master Trainer', id: 'master@sys.com', role: 'Full Access' },
                    { label: 'Group Trainer (MDRT STAR)', id: 'coach@star.com', role: 'Single Group Coach' },
                    { label: 'Group Leader (MDRT STAR)', id: 'agent01@star.com', role: 'Group Leader' },
                    { label: 'Agent (MDRT STAR)', id: 'agent02@star.com', role: 'Agent' },
                 ].map((cred, idx) => (
                     <button
                        key={idx}
                        type="button"
                        onClick={() => fillCredentials(cred.id, 'password')}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all text-left group"
                     >
                        <div className="flex items-center">
                           <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-3 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                              <User className="w-4 h-4" />
                           </div>
                           <div>
                              <p className="text-xs font-bold text-gray-700">{cred.label}</p>
                              <p className="text-[10px] text-gray-400">{cred.id}</p>
                           </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                     </button>
                 ))}
             </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
                      <button onClick={() => setShowForgot(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  {resetStatus === 'sent' ? (
                      <div className="text-center py-4">
                          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Loader2 className="w-6 h-6" /> 
                          </div>
                          <p className="text-green-700 font-medium">Recovery email sent!</p>
                          <p className="text-sm text-gray-500 mt-1">Check your inbox for instructions.</p>
                      </div>
                  ) : (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                          <p className="text-sm text-gray-500">Enter your email address and we'll send you a link to reset your password.</p>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                            <input
                                type="email"
                                required
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="block w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="you@company.com"
                            />
                          </div>
                          {resetStatus === 'error' && <p className="text-xs text-red-500">Failed to send email. Please try again.</p>}
                          <button
                            type="submit"
                            disabled={resetStatus === 'sending'}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center disabled:opacity-70"
                          >
                            {resetStatus === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                          </button>
                      </form>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;
