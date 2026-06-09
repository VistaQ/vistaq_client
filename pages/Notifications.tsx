import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, Award, Calendar, TrendingUp, GraduationCap,
  Megaphone, Database, Settings, X, CheckCheck, ExternalLink,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { AppNotification, NotificationType } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff <= 7) return 'This week';
  if (diff <= 30) return 'This month';
  return 'Earlier';
};

const typeConfig: Record<NotificationType, { icon: React.ElementType; bg: string; color: string; label: string }> = {
  achievement:  { icon: Award,         bg: 'bg-yellow-50', color: 'text-yellow-600', label: 'Achievement'  },
  event:        { icon: Calendar,      bg: 'bg-blue-50',   color: 'text-blue-600',   label: 'Event'        },
  milestone:    { icon: TrendingUp,    bg: 'bg-green-50',  color: 'text-green-600',  label: 'Milestone'    },
  coaching:     { icon: GraduationCap, bg: 'bg-purple-50', color: 'text-purple-600', label: 'Coaching'     },
  announcement: { icon: Megaphone,     bg: 'bg-orange-50', color: 'text-orange-600', label: 'Announcement' },
  etl:          { icon: Database,      bg: 'bg-indigo-50', color: 'text-indigo-600', label: 'Data Update'  },
  system:       { icon: Settings,      bg: 'bg-gray-50',   color: 'text-gray-500',   label: 'System'       },
};

// ─── Notification detail modal ────────────────────────────────────────────────

const NotificationModal: React.FC<{
  notification: AppNotification;
  onClose: () => void;
  onAction: (url: string) => void;
}> = ({ notification, onClose, onAction }) => {
  const cfg = typeConfig[notification.type];
  const Icon = cfg.icon;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Colour bar */}
        <div className={`h-1.5 w-full ${
          notification.type === 'achievement' ? 'bg-yellow-400' :
          notification.type === 'event'       ? 'bg-blue-500' :
          notification.type === 'milestone'   ? 'bg-green-500' :
          notification.type === 'coaching'    ? 'bg-purple-500' :
          notification.type === 'announcement'? 'bg-orange-500' :
          notification.type === 'etl'         ? 'bg-indigo-500' :
          'bg-gray-400'
        }`} />

        <div className="p-6">
          {/* Close button */}
          <div className="flex justify-end mb-2">
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Icon + type label */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-2xl ${cfg.bg}`}>
              <Icon className={`w-6 h-6 ${cfg.color}`} />
            </div>
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(notification.created_at)} · {formatTime(notification.created_at)}</p>
            </div>
          </div>

          {/* Title + message */}
          <h2 className="text-xl font-bold text-gray-900 mb-3">{notification.title}</h2>
          <p className="text-gray-600 leading-relaxed">{notification.message}</p>

          {/* Action button */}
          {notification.action_url && notification.action_label && (
            <button
              onClick={() => onAction(notification.action_url!)}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              {notification.action_label}
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Notification card ────────────────────────────────────────────────────────

const NotificationCard: React.FC<{
  notification: AppNotification;
  onClick: (n: AppNotification) => void;
}> = ({ notification, onClick }) => {
  const cfg = typeConfig[notification.type];
  const Icon = cfg.icon;
  const isUnread = !notification.read_at;

  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full text-left flex items-start gap-4 p-5 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${
        isUnread
          ? 'bg-blue-50/60 border-blue-100 hover:border-blue-200'
          : 'bg-white border-gray-100 hover:border-gray-200'
      }`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 p-3 rounded-2xl ${cfg.bg}`}>
        <Icon className={`w-5 h-5 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm leading-snug ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
            {notification.title}
          </p>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">{timeAgo(notification.created_at)}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">{notification.message}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
          {notification.action_label && (
            <span className="text-xs font-semibold text-blue-600">{notification.action_label} →</span>
          )}
          {!isUnread && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> Read
            </span>
          )}
        </div>
      </div>

      {/* Unread dot */}
      {isUnread && <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5" />}
    </button>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount, markRead, markAllRead, isLoading } = useNotifications();

  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Auto-open a specific notification if navigated here with state
  useEffect(() => {
    const openId = (location.state as any)?.openId;
    if (openId) {
      const found = notifications.find(n => n.id === openId);
      if (found) setSelectedNotification(found);
    }
  }, [location.state, notifications]);

  const handleCardClick = (n: AppNotification) => {
    markRead(n.id);
    if (n.action_url) {
      // Has action — go directly
      navigate(n.action_url);
    } else {
      // Read-only — open modal with blur backdrop
      setSelectedNotification(n);
    }
  };

  const handleModalAction = (url: string) => {
    setSelectedNotification(null);
    navigate(url);
  };

  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.read_at)
    : notifications;

  // Group by day label
  const groups: Record<string, AppNotification[]> = {};
  for (const n of displayed) {
    const label = dayLabel(n.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'This month', 'Earlier'];

  return (
    <>
      {/* Detail modal */}
      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onAction={handleModalAction}
        />
      )}

      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : "You're all caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
                filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Bell className="w-6 h-6 mr-2 animate-pulse" />
            <span className="text-sm">Loading notifications…</span>
          </div>
        )}

        {/* Empty */}
        {!isLoading && displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="p-5 bg-gray-100 rounded-2xl mb-4">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-base font-semibold text-gray-500">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'unread' ? "You've read everything — nice work!" : "We'll notify you of important updates here."}
            </p>
          </div>
        )}

        {/* Grouped notification cards */}
        {!isLoading && GROUP_ORDER.filter(g => groups[g]?.length).map(groupKey => (
          <div key={groupKey}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">{groupKey}</h2>
            <div className="space-y-3">
              {groups[groupKey].map(n => (
                <NotificationCard key={n.id} notification={n} onClick={handleCardClick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default Notifications;
