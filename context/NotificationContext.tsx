import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppNotification } from '../types';

// ─── Mock notifications (used until backend /notifications endpoint is live) ──

const buildMockNotifications = (): AppNotification[] => [
  {
    id: 'n1',
    type: 'achievement',
    title: 'Bronze Badge Unlocked! 🏆',
    message: "Congratulations! You've reached 500 points and unlocked the Bronze tier badge. Keep up the great work!",
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    read_at: null,
    action_url: '/points',
    action_label: 'View My Points',
  },
  {
    id: 'n2',
    type: 'event',
    title: 'Team Meeting Tomorrow',
    message: 'You have a team meeting scheduled for tomorrow at 10:00 AM. Make sure to review your pipeline before attending.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read_at: null,
    action_url: '/events',
    action_label: 'View Calendar',
  },
  {
    id: 'n3',
    type: 'milestone',
    title: 'MDRT Progress Update',
    message: "You're currently at 37% of your annual MDRT target. You need RM 251,800 more in FYC to achieve MDRT this year. Stay focused!",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read_at: null,
    action_url: '/sales-report',
    action_label: 'View Sales Report',
  },
  {
    id: 'n4',
    type: 'coaching',
    title: 'Coaching Session Reminder',
    message: 'Your coaching session is starting in 1 hour. Prepare your questions and bring your prospect list.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read_at: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    action_url: '/coaching',
    action_label: 'View Session',
  },
  {
    id: 'n5',
    type: 'announcement',
    title: 'New: Sales Report is Live',
    message: "We've launched the new Sales Report page with MDRT tracking, productivity analytics, effectiveness scores, and more. Check it out!",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    read_at: null,
    action_url: '/sales-report',
    action_label: 'Explore Now',
  },
  {
    id: 'n6',
    type: 'etl',
    title: 'Sales Data Updated',
    message: 'The April 2026 ETL file has been processed successfully. 42 agent rows were imported, 2 rows were skipped due to unmatched agent codes.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    read_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    action_url: '/sales-report',
    action_label: 'View Report',
  },
  {
    id: 'n7',
    type: 'system',
    title: 'Scheduled Maintenance',
    message: 'VistaQ will undergo brief maintenance on Sunday, 4 May 2026 between 2:00 AM – 4:00 AM MYT. The app may be temporarily unavailable during this window.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    read_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
];

// ─── LocalStorage key for persisting read state ───────────────────────────────

const LS_KEY = 'vistaq_notification_reads';

const getStoredReads = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const saveRead = (id: string) => {
  const reads = getStoredReads();
  reads[id] = new Date().toISOString();
  localStorage.setItem(LS_KEY, JSON.stringify(reads));
};

const saveAllRead = (ids: string[]) => {
  const reads = getStoredReads();
  const now = new Date().toISOString();
  for (const id of ids) reads[id] = now;
  localStorage.setItem(LS_KEY, JSON.stringify(reads));
};

// ─── Context types ────────────────────────────────────────────────────────────

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: replace with apiCall('/notifications') when backend endpoint is ready
      // const res = await apiCall('/notifications');
      // const raw: AppNotification[] = Array.isArray(res.data) ? res.data : [];

      // Apply locally-persisted read timestamps to the mock data
      const raw = buildMockNotifications();
      const reads = getStoredReads();
      const merged = raw.map(n => ({
        ...n,
        read_at: n.read_at ?? reads[n.id] ?? null,
      }));
      setNotifications(merged);
    } catch (e) {
      console.error('[NotificationContext] loadNotifications:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) loadNotifications();
  }, [loadNotifications]);

  const markRead = useCallback((id: string) => {
    saveRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)
    );
  }, []);

  const markAllRead = useCallback(() => {
    const ids = notifications.filter(n => !n.read_at).map(n => n.id);
    saveAllRead(ids);
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => n.read_at ? n : { ...n, read_at: now }));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, isLoading, markRead, markAllRead, refetch: loadNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
