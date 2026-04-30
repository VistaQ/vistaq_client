
import React, { useEffect, useState, useRef } from 'react';
import { Clock, LogIn, LogOut, ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Gap between warning and forced expiry (must match IDLE_EXPIRE_MS - IDLE_WARN_MS in AuthContext)
const WARNING_COUNTDOWN_SECS = 5 * 60; // 5 minutes

const SessionTimeoutModal: React.FC = () => {
  const { sessionModalState, extendSession, sessionExpiredRedirect } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(WARNING_COUNTDOWN_SECS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown when warning appears; reset when modal closes
  useEffect(() => {
    if (sessionModalState === 'warning') {
      setSecondsLeft(WARNING_COUNTDOWN_SECS);
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSecondsLeft(WARNING_COUNTDOWN_SECS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionModalState]);

  // When countdown hits zero, trigger the expired redirect
  useEffect(() => {
    if (sessionModalState === 'warning' && secondsLeft === 0) {
      sessionExpiredRedirect();
    }
  }, [secondsLeft, sessionModalState, sessionExpiredRedirect]);

  if (!sessionModalState) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  // ── Warning state ─────────────────────────────────────────────────────────
  if (sessionModalState === 'warning') {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-labelledby="session-warning-title"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
          {/* Amber top bar */}
          <div className="h-2 w-full bg-amber-400" />

          <div className="p-8 text-center">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-amber-100 text-amber-600">
              <Clock className="w-8 h-8" />
            </div>

            <h3 id="session-warning-title" className="text-2xl font-bold text-gray-900 mb-2">
              Session Expiring Soon
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              You've been inactive for a while. For your security, you'll be automatically logged out in:
            </p>

            {/* Countdown */}
            <div className="inline-flex items-center justify-center gap-1 bg-amber-50 border border-amber-200 rounded-xl px-6 py-3 mb-2">
              <span className="text-3xl font-black text-amber-700 tabular-nums">{mm}:{ss}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Click "Stay Logged In" to continue your session.</p>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
            <button
              onClick={sessionExpiredRedirect}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
            <button
              onClick={extendSession}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm shadow-indigo-200 active:scale-95"
            >
              <Clock className="w-4 h-4" />
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Expired state ─────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-labelledby="session-expired-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        {/* Red top bar */}
        <div className="h-2 w-full bg-red-500" />

        <div className="p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-red-100 text-red-600">
            <ShieldOff className="w-8 h-8" />
          </div>

          <h3 id="session-expired-title" className="text-2xl font-bold text-gray-900 mb-2">
            Session Expired
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Your session has ended. Please log in again to continue using VistaQ.
          </p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={sessionExpiredRedirect}
            className="flex items-center gap-2 bg-gray-900 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            Log In Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;
