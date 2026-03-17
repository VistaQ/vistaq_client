import { User, Prospect, CoachingSession, Group, StoredNotification, StoredNotificationType } from '../types';
import { sendEmail } from './emailService';
import { sendWhatsApp } from './whatsappService';
import { getNotifPrefs } from '../hooks/useNotificationPrefs';

const AGENT_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_AGENT_ID || '';
const SUPERVISOR_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_SUPERVISOR_ID || '';
const HISTORY_MAX = 50;

// ---------------------------------------------------------------------------
// Notification History (localStorage)
// ---------------------------------------------------------------------------

export const storeNotification = (
  userId: string,
  data: { title: string; message: string; type: StoredNotificationType }
): void => {
  try {
    const key = `notifHistory_${userId}`;
    const existing: StoredNotification[] = JSON.parse(localStorage.getItem(key) || '[]');
    const entry: StoredNotification = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...data,
      timestamp: new Date().toISOString(),
      read: false,
    };
    localStorage.setItem(key, JSON.stringify([entry, ...existing].slice(0, HISTORY_MAX)));
    // Signal Layout badge and Dashboard widget to refresh
    window.dispatchEvent(new CustomEvent('vistaq-notification'));
  } catch { /* ignore storage errors */ }
};

export const getStoredNotifications = (userId: string): StoredNotification[] => {
  try {
    return JSON.parse(localStorage.getItem(`notifHistory_${userId}`) || '[]');
  } catch {
    return [];
  }
};

export const getUnreadCount = (userId: string): number =>
  getStoredNotifications(userId).filter(n => !n.read).length;

export const markAllRead = (userId: string): void => {
  try {
    const updated = getStoredNotifications(userId).map(n => ({ ...n, read: true }));
    localStorage.setItem(`notifHistory_${userId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('vistaq-notification'));
  } catch { /* ignore */ }
};

export const clearAllNotifications = (userId: string): void => {
  localStorage.removeItem(`notifHistory_${userId}`);
  window.dispatchEvent(new CustomEvent('vistaq-notification'));
};

// ---------------------------------------------------------------------------
// Browser Push Notifications
// ---------------------------------------------------------------------------

export const requestBrowserPermission = async (): Promise<void> => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const fireBrowserNotification = (title: string, body: string): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.ico' });
  } catch { /* some browsers block programmatic notifications */ }
};

// ---------------------------------------------------------------------------
// Internal delivery helpers
// ---------------------------------------------------------------------------

const getSupervisors = (agent: User, users: User[], groups: Group[]): User[] => {
  if (!agent.groupId) return [];
  const group = groups.find(g => g.id === agent.groupId);
  if (!group) return [];
  const ids = [group.leaderId, ...(group.trainerIds || [])].filter(Boolean) as string[];
  return users.filter(u => ids.includes(u.id) && u.id !== agent.id);
};

const fireEmail = (user: User, subject: string, message: string, templateId: string) => {
  sendEmail(user.email, templateId, { to_name: user.name, subject, message })
    .catch(() => { /* never block */ });
};

const fireWhatsApp = (phone: string, apiKey: string, message: string) => {
  sendWhatsApp(phone, apiKey, message).catch(() => { /* never block */ });
};

// ---------------------------------------------------------------------------
// Trigger: Appointment Completed
// ---------------------------------------------------------------------------

export const notifyAppointmentCompleted = (
  agent: User,
  prospect: Prospect,
  users: User[],
  groups: Group[]
): void => {
  const prefs = getNotifPrefs(agent.id);
  if (!prefs.triggers.salesAndAppointments) return;

  const title = 'Appointment Completed ✓';
  const agentMsg = `Great work ${agent.name}! Your appointment with ${prospect.prospectName} has been marked as completed. Keep building that pipeline!`;
  const supervisorMsg = `${agent.name} completed an appointment with ${prospect.prospectName}.`;

  // Store in history + browser push for the agent
  storeNotification(agent.id, { title, message: agentMsg, type: 'appointment' });
  fireBrowserNotification(title, agentMsg);

  if (prefs.emailEnabled) fireEmail(agent, title, agentMsg, AGENT_TEMPLATE);
  if (prefs.whatsappEnabled && prefs.whatsappPhone && prefs.whatsappApiKey) {
    fireWhatsApp(prefs.whatsappPhone, prefs.whatsappApiKey, agentMsg);
  }

  getSupervisors(agent, users, groups).forEach(sup => {
    const supPrefs = getNotifPrefs(sup.id);
    if (!supPrefs.triggers.salesAndAppointments) return;
    const supTitle = `Agent Activity: ${agent.name}`;
    storeNotification(sup.id, { title: supTitle, message: supervisorMsg, type: 'appointment' });
    fireBrowserNotification(supTitle, supervisorMsg);
    if (supPrefs.emailEnabled) fireEmail(sup, supTitle, supervisorMsg, SUPERVISOR_TEMPLATE);
    if (supPrefs.whatsappEnabled && supPrefs.whatsappPhone && supPrefs.whatsappApiKey) {
      fireWhatsApp(supPrefs.whatsappPhone, supPrefs.whatsappApiKey, supervisorMsg);
    }
  });
};

// ---------------------------------------------------------------------------
// Trigger: Sale Made
// ---------------------------------------------------------------------------

export const notifySaleMade = (
  agent: User,
  prospect: Prospect,
  users: User[],
  groups: Group[]
): void => {
  const prefs = getNotifPrefs(agent.id);
  if (!prefs.triggers.salesAndAppointments) return;

  const totalACE = (prospect.productsSold || []).reduce((s, p) => s + (p.aceAmount || 0), 0);
  const title = 'Sale Successful! 🎉';
  const agentMsg = `Congratulations ${agent.name}! You closed a SALE with ${prospect.prospectName}! Total ACE: RM ${totalACE.toLocaleString()}. Outstanding work!`;
  const supervisorMsg = `${agent.name} made a SALE! Prospect: ${prospect.prospectName}, ACE: RM ${totalACE.toLocaleString()}.`;

  storeNotification(agent.id, { title, message: agentMsg, type: 'sale' });
  fireBrowserNotification(title, agentMsg);

  if (prefs.emailEnabled) fireEmail(agent, title, agentMsg, AGENT_TEMPLATE);
  if (prefs.whatsappEnabled && prefs.whatsappPhone && prefs.whatsappApiKey) {
    fireWhatsApp(prefs.whatsappPhone, prefs.whatsappApiKey, agentMsg);
  }

  getSupervisors(agent, users, groups).forEach(sup => {
    const supPrefs = getNotifPrefs(sup.id);
    if (!supPrefs.triggers.salesAndAppointments) return;
    const supTitle = `SALE by ${agent.name}! 🎉`;
    storeNotification(sup.id, { title: supTitle, message: supervisorMsg, type: 'sale' });
    fireBrowserNotification(supTitle, supervisorMsg);
    if (supPrefs.emailEnabled) fireEmail(sup, supTitle, supervisorMsg, SUPERVISOR_TEMPLATE);
    if (supPrefs.whatsappEnabled && supPrefs.whatsappPhone && supPrefs.whatsappApiKey) {
      fireWhatsApp(supPrefs.whatsappPhone, supPrefs.whatsappApiKey, supervisorMsg);
    }
  });
};

// ---------------------------------------------------------------------------
// Trigger: Coaching Session Reminder (24 h before)
// ---------------------------------------------------------------------------

export const checkAndSendCoachingReminders = (
  user: User,
  sessions: CoachingSession[]
): void => {
  const prefs = getNotifPrefs(user.id);
  if (!prefs.triggers.coachingReminder) return;

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  sessions
    .filter(s => s.status === 'upcoming')
    .forEach(session => {
      try {
        const sessionDate = new Date(session.date);
        if (isNaN(sessionDate.getTime()) || sessionDate < now || sessionDate > in24h) return;

        const dedupKey = `notif_reminder_${session.id}_${user.id}`;
        if (localStorage.getItem(dedupKey)) return;

        const dateStr = sessionDate.toLocaleDateString('en-MY', {
          weekday: 'short', day: 'numeric', month: 'short',
        });
        const title = 'Coaching Session Reminder';
        const msg = `You have "${session.title}" on ${dateStr} at ${session.durationStart || ''}. Don't miss it!`;

        storeNotification(user.id, { title, message: msg, type: 'coaching_reminder' });
        fireBrowserNotification(title, msg);

        if (prefs.whatsappEnabled && prefs.whatsappPhone && prefs.whatsappApiKey) {
          fireWhatsApp(prefs.whatsappPhone, prefs.whatsappApiKey, msg);
        }
        localStorage.setItem(dedupKey, new Date().toISOString());
      } catch { /* skip malformed sessions */ }
    });
};

// ---------------------------------------------------------------------------
// Trigger: Stale Prospects (no activity for 7+ days)
// ---------------------------------------------------------------------------

export const checkAndSendStaleProspectAlert = (
  user: User,
  prospects: Prospect[]
): void => {
  const prefs = getNotifPrefs(user.id);
  if (!prefs.triggers.staleProspects) return;

  const dedupKey = `notif_stale_${user.id}`;
  const lastSent = localStorage.getItem(dedupKey);
  if (lastSent) {
    const hoursSince = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) return;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stale = prospects.filter(p => {
    if (p.salesOutcome === 'successful' || p.salesOutcome === 'unsuccessful') return false;
    const last = new Date(p.updatedAt || p.createdAt);
    return !isNaN(last.getTime()) && last < sevenDaysAgo;
  });
  if (stale.length === 0) return;

  const names = stale.slice(0, 3).map(p => p.prospectName).join(', ');
  const extra = stale.length > 3 ? ` and ${stale.length - 3} more` : '';
  const title = 'Prospects Need Your Attention';
  const msg = `You have ${stale.length} prospect(s) with no activity in 7+ days: ${names}${extra}. Time to follow up!`;

  storeNotification(user.id, { title, message: msg, type: 'stale_prospects' });
  fireBrowserNotification(title, msg);

  if (prefs.emailEnabled) fireEmail(user, title, msg, AGENT_TEMPLATE);
  localStorage.setItem(dedupKey, new Date().toISOString());
};
