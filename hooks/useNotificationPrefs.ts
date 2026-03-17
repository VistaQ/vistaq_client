import { useState } from 'react';
import { NotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from '../types';
import { useAuth } from '../context/AuthContext';

/** Pure helper — safe to call from non-React services. */
export const getNotifPrefs = (userId: string): NotificationPrefs => {
  try {
    const stored = localStorage.getItem(`notifPrefs_${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...parsed,
        triggers: { ...DEFAULT_NOTIFICATION_PREFS.triggers, ...(parsed.triggers || {}) },
      };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_NOTIFICATION_PREFS };
};

export const saveNotifPrefs = (userId: string, prefs: NotificationPrefs): void => {
  localStorage.setItem(`notifPrefs_${userId}`, JSON.stringify(prefs));
};

/** React hook for reading/writing the current user's notification preferences. */
export const useNotificationPrefs = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || '';

  const [prefs, setPrefs] = useState<NotificationPrefs>(() => getNotifPrefs(userId));

  const updatePrefs = (updates: Partial<NotificationPrefs>) => {
    const newPrefs: NotificationPrefs = { ...prefs, ...updates };
    saveNotifPrefs(userId, newPrefs);
    setPrefs(newPrefs);
  };

  return { prefs, updatePrefs };
};
