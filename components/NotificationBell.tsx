import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Award, Calendar, TrendingUp, GraduationCap, Megaphone, Database, Settings, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { AppNotification, NotificationType } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
};

const typeConfig: Record<NotificationType, { icon: React.ElementType; bg: string; color: string }> = {
  achievement:  { icon: Award,         bg: 'bg-yellow-50', color: 'text-yellow-600' },
  event:        { icon: Calendar,      bg: 'bg-blue-50',   color: 'text-blue-600'   },
  milestone:    { icon: TrendingUp,    bg: 'bg-green-50',  color: 'text-green-600'  },
  coaching:     { icon: GraduationCap, bg: 'bg-purple-50', color: 'text-purple-600' },
  announcement: { icon: Megaphone,     bg: 'bg-orange-50', color: 'text-orange-600' },
  etl:          { icon: Database,      bg: 'bg-indigo-50', color: 'text-indigo-600' },
  system:       { icon: Settings,      bg: 'bg-gray-50',   color: 'text-gray-500'   },
};

// ─── component ────────────────────────────────────────────────────────────────

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const preview = notifications.slice(0, 5);

  const handleNotificationClick = (n: AppNotification) => {
    markRead(n.id);
    setOpen(false);
    if (n.action_url) {
      navigate(n.action_url);
    } else {
      navigate('/notifications', { state: { openId: n.id } });
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-7 h-7" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-600 rounded-full">{unreadCount} new</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
            {preview.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                You're all caught up!
              </div>
            ) : (
              preview.map(n => {
                const cfg = typeConfig[n.type];
                const Icon = cfg.icon;
                const isUnread = !n.read_at;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left flex items-start gap-3 px-5 py-4 transition-colors hover:bg-gray-50 ${isUnread ? 'bg-blue-50/40' : ''}`}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 p-2 rounded-xl ${cfg.bg} mt-0.5`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {n.title}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                      {n.action_label && (
                        <span className="inline-block mt-1.5 text-xs font-semibold text-blue-600">{n.action_label} →</span>
                      )}
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={handleViewAll}
              className="w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors py-1"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
