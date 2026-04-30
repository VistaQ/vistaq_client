import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppNotification } from '../types';

// ─── Mock notifications (used until backend /notifications endpoint is live) ──

// Shorthand: minutes / hours / days ago from now
const minsAgo  = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo  = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

const buildMockNotifications = (): AppNotification[] => [

  // ── TODAY ────────────────────────────────────────────────────────────────

  // Achievement — just now
  {
    id: 'n1',
    type: 'achievement',
    title: 'Silver Badge Unlocked! 🥈',
    message: "Outstanding work! You've reached 1,000 points and earned the Silver tier badge. Your consistency in managing prospects and attending coaching sessions is paying off. Keep pushing!",
    created_at: minsAgo(8),
    read_at: null,
    action_url: '/points',
    action_label: 'View My Points',
  },

  // Milestone — unread, earlier today
  {
    id: 'n2',
    type: 'milestone',
    title: 'April MDRT Target: 37% Achieved',
    message: "Great progress! Your FYC for April stands at RM 148,200 — 37% of your RM 400,000 MDRT target. You need RM 251,800 more across the remaining 8 months. That's RM 31,475 per month. You've got this!",
    created_at: minsAgo(45),
    read_at: null,
    action_url: '/sales-report',
    action_label: 'View Sales Report',
  },

  // Event — unread, a few hours ago
  {
    id: 'n3',
    type: 'event',
    title: 'Group Meeting in 2 Hours',
    message: "Reminder: Your group meeting with Team Alpha starts at 3:00 PM today. Agenda includes pipeline review, Q2 targets, and product training on the new Medical Card plan. Please be on time.",
    created_at: hoursAgo(1),
    read_at: null,
    action_url: '/events',
    action_label: 'View Calendar',
  },

  // Coaching — unread, this morning
  {
    id: 'n4',
    type: 'coaching',
    title: 'Coaching Session Starting Soon',
    message: "Your personal coaching session with your trainer begins in 30 minutes. Topics: closing techniques and handling objections. Bring your top 3 stalled prospects for role-play practice.",
    created_at: hoursAgo(3),
    read_at: null,
    action_url: '/coaching',
    action_label: 'Join Session',
  },

  // ── YESTERDAY ─────────────────────────────────────────────────────────────

  // Achievement — read
  {
    id: 'n5',
    type: 'achievement',
    title: 'Bronze Badge Unlocked! 🥉',
    message: "Congratulations! You've reached 500 points and unlocked the Bronze tier badge. This marks your first milestone on the VistaQ leaderboard. Keep up the great momentum!",
    created_at: hoursAgo(28),
    read_at: hoursAgo(27),
    action_url: '/points',
    action_label: 'View My Points',
  },

  // ETL — unread (admin uploaded data)
  {
    id: 'n6',
    type: 'etl',
    title: 'April 2026 Sales Data Uploaded',
    message: "Your admin has uploaded the April 2026 ETL production file. 42 agent records were imported successfully. 2 rows were skipped due to unmatched agent codes (T99012X, T88441Z). Your personal figures have been updated.",
    created_at: hoursAgo(30),
    read_at: null,
    action_url: '/sales-report',
    action_label: 'View Updated Report',
  },

  // Announcement — read
  {
    id: 'n7',
    type: 'announcement',
    title: 'New Feature: Group Sales Report',
    message: "Group Leaders and Trainers can now access the Group Sales Report under the Group section in the sidebar. View MDRT progress per agent, compare FYC/ACE/NOC across your team, and download the report as Excel or CSV.",
    created_at: hoursAgo(36),
    read_at: hoursAgo(34),
    action_url: '/group-sales-report',
    action_label: 'Open Group Report',
  },

  // ── THIS WEEK ─────────────────────────────────────────────────────────────

  // Milestone — read
  {
    id: 'n8',
    type: 'milestone',
    title: 'March Productivity: RM 31,250/month',
    message: "Your YTD productivity rate as of March is RM 31,250 per month (ACE ÷ 3 months). This is 6% above the group average of RM 29,400. Your Average Case Size (ACS) is RM 34,722 — excellent work on policy sizing!",
    created_at: daysAgo(3),
    read_at: daysAgo(3),
    action_url: '/sales-report',
    action_label: 'View Productivity',
  },

  // Event — unread
  {
    id: 'n9',
    type: 'event',
    title: 'Product Training: Investment-Linked Plans',
    message: "You're registered for the Investment-Linked Plan product training this Friday at 9:00 AM in Meeting Room B. Attendance is mandatory. Refreshments provided. Please confirm your attendance by replying to your Group Leader.",
    created_at: daysAgo(4),
    read_at: null,
    action_url: '/events',
    action_label: 'View Event',
  },

  // Coaching — read
  {
    id: 'n10',
    type: 'coaching',
    title: 'Coaching Session Completed ✓',
    message: "Your coaching session on Wednesday has been marked as completed. You've earned 50 points for your attendance. Your trainer has noted: 'Great improvement on fact-finding. Focus area for next session: presentation flow.' Well done!",
    created_at: daysAgo(5),
    read_at: daysAgo(4),
    action_url: '/coaching',
    action_label: 'View Session Notes',
  },

  // System — read
  {
    id: 'n11',
    type: 'system',
    title: 'Scheduled Maintenance Completed',
    message: "VistaQ maintenance on Sunday, 27 April 2026 has been completed successfully. All services are fully operational. If you experience any issues, please contact support via the Help section.",
    created_at: daysAgo(6),
    read_at: daysAgo(6),
  },

  // ── THIS MONTH ────────────────────────────────────────────────────────────

  // Announcement — read
  {
    id: 'n12',
    type: 'announcement',
    title: 'New Feature: In-App Notifications',
    message: "You can now receive real-time updates directly in VistaQ — no more checking emails for platform alerts! Notifications cover achievements, coaching reminders, sales milestones, event alerts, and system updates. Access your full notification history anytime under Help → Notifications.",
    created_at: daysAgo(10),
    read_at: daysAgo(9),
  },

  // ETL — read
  {
    id: 'n13',
    type: 'etl',
    title: 'March 2026 Sales Data Uploaded',
    message: "The March 2026 ETL production file has been processed. 41 agent records imported. 0 rows skipped. Your YTD figures are now current through end of March. ACE YTD: RM 255,000 · NOC YTD: 8.",
    created_at: daysAgo(14),
    read_at: daysAgo(13),
    action_url: '/sales-report',
    action_label: 'View March Report',
  },

  // Milestone — read
  {
    id: 'n14',
    type: 'milestone',
    title: 'Q1 Wrap-Up: 28% MDRT Progress',
    message: "Q1 is done! Your FYC as of March stands at RM 112,500 — 28.1% of your RM 400,000 MDRT target. You're tracking slightly below the monthly pace of 25% per quarter. April is your opportunity to catch up. Your next key milestone: 50% by end of June.",
    created_at: daysAgo(18),
    read_at: daysAgo(17),
    action_url: '/sales-report',
    action_label: 'View Full Report',
  },

  // Achievement — read
  {
    id: 'n15',
    type: 'achievement',
    title: '10 Prospects Milestone Reached 🎯',
    message: "You've successfully added your 10th prospect this month! Each prospect brings you closer to your sales goals. You've also earned 20 bonus points for hitting this milestone. Your current prospects pipeline is looking healthy — keep converting!",
    created_at: daysAgo(20),
    read_at: daysAgo(19),
    action_url: '/prospects',
    action_label: 'View Prospects',
  },

  // ── EARLIER ───────────────────────────────────────────────────────────────

  // Announcement — read
  {
    id: 'n16',
    type: 'announcement',
    title: 'New Feature: Sales Report is Live',
    message: "We've launched the brand-new Sales Report page with full MDRT tracking (FYC & FYCt), productivity analytics, effectiveness scores, efficiency ratios, product summary, and a monthly progress chart. It's powered by your admin's monthly ETL upload. Head over to take a look!",
    created_at: daysAgo(35),
    read_at: daysAgo(34),
    action_url: '/sales-report',
    action_label: 'Explore Now',
  },

  // System — read
  {
    id: 'n17',
    type: 'system',
    title: 'VistaQ 2.0 is Here 🚀',
    message: "Welcome to VistaQ 2.0! This major update includes a redesigned interface, the new Sales Report with MDRT tracking, Group Sales Report for leaders, in-app notifications, improved coaching session management, and performance improvements across the board. Thank you for being part of the VistaQ community.",
    created_at: daysAgo(45),
    read_at: daysAgo(44),
  },

  // ETL — read (earliest)
  {
    id: 'n18',
    type: 'etl',
    title: 'February 2026 Sales Data Uploaded',
    message: "The February 2026 ETL file has been processed. 39 agent records imported, 1 skipped (T55210B — agent code not found in system). Your YTD ACE: RM 103,000 · FYC: RM 52,500 · NOC: 3. Contact your admin if your figures look incorrect.",
    created_at: daysAgo(50),
    read_at: daysAgo(49),
    action_url: '/sales-report',
    action_label: 'View February Report',
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
