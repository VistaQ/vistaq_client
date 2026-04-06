
import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, Loader2, WifiOff } from 'lucide-react';

const getLoginErrorMessage = (err: any): { message: string; isNetwork: boolean } => {
  // Network / connectivity failure
  if (!err?.status && (err?.message?.toLowerCase().includes('network') || err?.message?.toLowerCase().includes('fetch') || err?.message?.toLowerCase().includes('failed to'))) {
    return { message: 'Unable to connect. Please check your internet connection and try again.', isNetwork: true };
  }
  switch (err?.status) {
    case 401:
    case 403:
      return { message: 'Incorrect email or password. Please try again.', isNetwork: false };
    case 404:
      return { message: 'No account found with that email address.', isNetwork: false };
    case 429:
      return { message: 'Too many sign-in attempts. Please wait a moment and try again.', isNetwork: false };
    case 500:
    case 502:
    case 503:
      return { message: 'Our servers are experiencing issues. Please try again in a few minutes.', isNetwork: false };
    default:
      return { message: err?.message || 'Something went wrong. Please try again.', isNetwork: false };
  }
};

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsNetworkError(false);
    setLoading(true);

    try {
      await login(identifier, password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      if (err?.status === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 30000);
      }
      const { message, isNetwork } = getLoginErrorMessage(err);
      setError(message);
      setIsNetworkError(isNetwork);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-10 text-center">
          <div className="flex justify-center mb-4">
            <img src="/vistaq-logo.png" alt="VistaQ" className="h-16 w-auto" />
          </div>
          <p className="text-blue-100 text-sm tracking-wide">Sales Performance & Coaching</p>
          <p className="text-blue-200/70 text-sm mt-1">Version 2.0</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6" aria-label="Sign in form">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 text-sm border border-red-200">
                {isNetworkError
                  ? <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                }
                <div className="flex-1">
                  <p className="font-semibold mb-0.5">{isNetworkError ? 'Connection Error' : 'Sign In Failed'}</p>
                  <p>{error}</p>
                  {!isNetworkError && (
                    <Link to="/forgot-password" className="inline-block mt-1.5 text-red-600 underline font-medium text-xs">
                      Forgot your password?
                    </Link>
                  )}
                </div>
              </div>
            )}

            {rateLimited && !error && (
              <div className="bg-amber-50 text-amber-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-amber-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Too many attempts. Please wait before trying again.
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || rateLimited}
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p className="mb-2">Don't have an account?</p>
            <Link to="/signup" className="text-blue-600 font-bold hover:underline">
              Register as a new Agent
            </Link>
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

export default Login;
