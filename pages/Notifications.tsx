import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StoredNotification } from '../types';
import {
  Bell, CheckCheck, Trash2, ShoppingBag, CalendarCheck,
  GraduationCap, AlertCircle, Info
} from 'lucide-react';
import {
  getStoredNotifications,
  markAllRead,
  clearAllNotifications,
} from '../services/notificationService';

const typeConfig: Record<StoredNotification['type'], { icon: React.ReactNode; color: string; bg: string }> = {
  sale: {
    icon: <ShoppingBag className="w-5 h-5" />,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  appointment: {
    icon: <CalendarCheck className="w-5 h-5" />,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  coaching_reminder: {
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
  },
  stale_prospects: {
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'text-orange-500',
    bg: 'bg-orange-100',
  },
  test: {
    icon: <Info className="w-5 h-5" />,
    color: 'text-gray-500',
    bg: 'bg-gray-100',
  },
};

const formatRelative = (iso: string): string => {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
};

const Notifications: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);

  const load = () => {
    if (currentUser?.id) {
      setNotifications(getStoredNotifications(currentUser.id));
    }
  };

  useEffect(() => {
    load();
    // Mark all read when the page is opened
    if (currentUser?.id) markAllRead(currentUser.id);

    // Refresh list if a new notification fires while page is open
    window.addEventListener('vistaq-notification', load);
    return () => window.removeEventListener('vistaq-notification', load);
  }, [currentUser?.id]);

  const handleClearAll = () => {
    if (!currentUser?.id) return;
    clearAllNotifications(currentUser.id);
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notification Centre
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {notifications.length === 0
              ? 'No notifications yet.'
              : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}${unreadCount > 0 ? ` · ${unreadCount} unread` : ' · all read'}`}
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
          <Bell className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-medium text-gray-500">You're all caught up!</p>
          <p className="text-sm mt-1">Notifications about your activities will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {notifications.map(notif => {
            const cfg = typeConfig[notif.type] || typeConfig.test;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-4 px-6 py-4 transition-colors ${!notif.read ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${!notif.read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatRelative(notif.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{notif.message}</p>
                </div>

                {/* Unread dot */}
                {!notif.read && (
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {notifications.length > 0 && (
        <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <CheckCheck className="w-3.5 h-3.5" />
          Showing last {Math.min(notifications.length, 50)} notifications · stored on this device
        </p>
      )}
    </div>
  );
};

export default Notifications;
