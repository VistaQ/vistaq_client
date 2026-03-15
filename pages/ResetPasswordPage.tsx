import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { resetPassword } from '../services/auth.service';

interface ResetPasswordPageProps {
  onSwitchToLogin: () => void;
}

function validatePassword(password: string): string {
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.';
  return '';
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onSwitchToLogin }) => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const token = hashParams.get('access_token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        window.history.replaceState(null, '', '/');
        onSwitchToLogin();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onSwitchToLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwError = validatePassword(newPassword);
    if (pwError) { setNewPasswordError(pwError); return; }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return;
    }

    setStatus('loading');
    try {
      await resetPassword(token, newPassword);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      if (err?.status === 500) {
        setError('Reset link is invalid or expired.');
      } else {
        setError('Something went wrong. Please try again.');
      }
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
        </div>

        <div className="p-8">
          {/* No token — invalid link */}
          {!token && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Invalid reset link</h2>
              <p className="text-sm text-gray-500">Invalid or expired reset link.</p>
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 font-bold text-sm hover:underline"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Success state */}
          {token && status === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Password reset successful</h2>
              <p className="text-sm text-gray-500">Redirecting you to login...</p>
            </div>
          )}

          {/* Form */}
          {token && status !== 'success' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Set new password</h2>
                <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
              </div>

              {status === 'error' && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start text-sm border border-red-100">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setNewPasswordError(''); }}
                    className={`block w-full pl-10 pr-3 py-3 bg-white border text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${newPasswordError ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="••••••••"
                  />
                </div>
                {newPasswordError && <p className="text-xs text-red-500 mt-1">{newPasswordError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); }}
                    className={`block w-full pl-10 pr-3 py-3 bg-white border text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${confirmPasswordError ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="••••••••"
                  />
                </div>
                {confirmPasswordError && <p className="text-xs text-red-500 mt-1">{confirmPasswordError}</p>}
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-70 flex items-center justify-center"
              >
                {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
