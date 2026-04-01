
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Prospect, User, UserRole, BadgeTier, Event, CoachingSession, CoachingSessionCreateBody, CoachingSessionUpdateBody, PointConfig, Group, DashboardStats, GroupStats } from '../types';
import { apiCall } from '../services/apiClient';
import { DEFAULT_POINT_CONFIG } from '../services/points';

interface DataContextType {
  prospects: Prospect[];
  badgeTiers: BadgeTier[];
  pointConfig: PointConfig;
  events: Event[];
  addProspect: (p: Partial<Prospect>) => Promise<Prospect>;
  updateProspect: (id: string, updates: Partial<Prospect>) => Promise<void>;
  importProspects: (newData: Prospect[]) => Promise<void>;
  getProspectsByScope: (user: User) => Prospect[];
  getGroupProspects: (groupId: string) => Prospect[];
  deleteProspect: (id: string) => Promise<void>;
  updateBadgeTiers: (tiers: BadgeTier[]) => Promise<void>;
  updatePointConfig: (cfg: PointConfig) => Promise<void>;

  // Event Methods
  addEvent: (evt: Partial<Event>) => Promise<void>;
  updateEvent: (id: string, evt: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsForUser: (user: User) => Event[];
  refetchEvents: () => Promise<void>;

  // Stats
  dashboardStats: DashboardStats | null;
  groupStats: GroupStats[];
  refetchDashboardStats: () => Promise<void>;
  refetchGroupStats: () => Promise<void>;

  // Loading states
  isLoadingProspects: boolean;
  isLoadingEvents: boolean;
  isLoadingCoaching: boolean;
  isLoadingDashboardStats: boolean;

  // Error states
  eventsError: boolean;
  coachingError: boolean;

  // Coaching Methods
  coachingSessions: CoachingSession[];
  addCoachingSession: (session: CoachingSessionCreateBody) => Promise<void>;
  updateCoachingSession: (id: string, updates: CoachingSessionUpdateBody) => Promise<void>;
  deleteCoachingSession: (id: string) => Promise<void>;
  joinCoachingSession: (sessionId: string) => Promise<void>;
  markNonAttendees: (sessionId: string) => Promise<void>;
  refetchCoachingSessions: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

import { DEFAULT_BADGE_TIERS } from '../constants/tokens';
// Default Milestones (Fallback) — sourced from constants/tokens.ts
const DEFAULT_MILESTONES: BadgeTier[] = DEFAULT_BADGE_TIERS;

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [badgeTiers, setBadgeTiers] = useState<BadgeTier[]>(DEFAULT_MILESTONES);
  const [pointConfig, setPointConfig] = useState<PointConfig>(DEFAULT_POINT_CONFIG);
  const [events, setEvents] = useState<Event[]>([]);
  const [coachingSessions, setCoachingSessions] = useState<CoachingSession[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false);
  const [eventsError, setEventsError] = useState(false);
  const [coachingError, setCoachingError] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = useState(false);

  const getCurrentUserId = (): string | null => {
    try {
      const stored = localStorage.getItem('authUser');
      if (stored) {
        const user = JSON.parse(stored);
        return user.id || user.uid || null;
      }
    } catch (e) { console.error('[DataContext] getCurrentUserId:', e); }
    return null;
  };

  const fetchProspects = async () => {
    if (!localStorage.getItem('authToken')) return;

    const userId = getCurrentUserId();
    if (!userId) return;

    setIsLoadingProspects(true);
    try {
      const res = await apiCall('/prospects');
      const raw: unknown[] = Array.isArray(res.data) ? res.data : [];
      setProspects(raw as Prospect[]);
    } catch (e) { console.error('[DataContext] fetchProspects:', e); } finally {
      setIsLoadingProspects(false);
    }
  };

  const fetchEvents = async () => {
    if (!localStorage.getItem('authToken')) {
      setEvents([]);
      return;
    }

    setEventsError(false);
    setIsLoadingEvents(true);
    try {
      const res = await apiCall('/events');
      const raw: unknown[] = Array.isArray(res.data) ? res.data : [];
      setEvents(raw as Event[]);
    } catch (e) {
      console.error('[DataContext] fetchEvents:', e);
      setEventsError(true);
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const fetchCoachingSessions = async () => {
    if (!localStorage.getItem('authToken')) {
      setCoachingSessions([]);
      return;
    }

    setCoachingError(false);
    setIsLoadingCoaching(true);
    try {
      const res = await apiCall('/coaching-sessions');
      const raw: CoachingSession[] = Array.isArray(res.data) ? res.data : [];
      setCoachingSessions(raw);
    } catch (e) {
      console.error('[DataContext] fetchCoachingSessions:', e);
      setCoachingError(true);
      setCoachingSessions([]);
    } finally {
      setIsLoadingCoaching(false);
    }
  };

  const fetchDashboardStats = async () => {
    if (!localStorage.getItem('authToken')) return;
    setIsLoadingDashboardStats(true);
    try {
      const res = await apiCall('/dashboard/stats');
      if (res?.data) setDashboardStats(res.data);
    } catch (e) { console.error('[DataContext] fetchDashboardStats:', e); } finally {
      setIsLoadingDashboardStats(false);
    }
  };

  const fetchGroupStats = async () => {
    if (!localStorage.getItem('authToken')) return;
    try {
      const res = await apiCall('/groups/stats');
      const raw = Array.isArray(res.data) ? res.data as GroupStats[] : [];
      setGroupStats(raw);
    } catch (e) { console.error('[DataContext] fetchGroupStats:', e); }
  };

  // Track authentication state to trigger refetch on login
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [userRole, setUserRole] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('authUser');
      return stored ? JSON.parse(stored).role : null;
    } catch {
      return null;
    }
  });

  // Watch for auth token and user changes in localStorage
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      if (token !== authToken) {
        setAuthToken(token);
      }

      try {
        const stored = localStorage.getItem('authUser');
        const role = stored ? JSON.parse(stored).role : null;
        if (role !== userRole) {
          setUserRole(role);
        }
      } catch (e) { console.error('[DataContext] checkAuth:', e); }
    };

    // Check periodically for same-tab auth changes (cross-tab handled by storage event)
    const interval = setInterval(checkAuth, 1000);

    // Also listen to storage events (for cross-tab sync)
    window.addEventListener('storage', checkAuth);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkAuth);
    };
  }, [authToken, userRole]);

  // 1. Sync Prospects + config when authenticated or user role changes, clear on logout
  useEffect(() => {
    if (authToken) {
      fetchProspects();
      fetchPointConfig();
    } else {
      // Clear data on logout
      setProspects([]);
      setPointConfig(DEFAULT_POINT_CONFIG);
    }
  }, [authToken]);

  // 2. Clear events on logout (fetch is triggered by the Calendar/Events page on mount)
  useEffect(() => {
    if (!authToken) setEvents([]);
  }, [authToken]);

  // 3. Clear coaching sessions on logout (fetch is triggered by Coaching page on mount)
  useEffect(() => {
    if (!authToken) setCoachingSessions([]);
  }, [authToken]);

  // 4. Clear stats on logout (fetch is triggered by Dashboard on mount)
  useEffect(() => {
    if (!authToken) {
      setDashboardStats(null);
      setGroupStats([]);
    }
  }, [authToken]);

  const addProspect = async (data: Partial<Prospect>) => {
    const payload: Record<string, any> = {
      fullName: data.prospect_name || '',
    };
    if (data.prospect_email) payload.email = data.prospect_email;
    if (data.prospect_phone) payload.phoneNum = data.prospect_phone;

    try {
      const res = await apiCall('/prospects', { method: 'POST', data: payload });
      const created: Prospect = res.data;
      await fetchProspects();
      return created;
    } catch (e) {
      throw e;
    }
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    // Snapshot current prospect before the API call for transition detection
    const current = prospects.find(p => p.id === id);

    try {
      await apiCall(`/prospects/${id}`, {
        method: 'PUT',
        data: updates
      });


      await fetchProspects();
    } catch (e) {
      throw e;
    }
  };

  const importProspects = async (importedData: Prospect[]) => {
    try {
      for (const p of importedData) {
        if (p.id) {
          await apiCall(`/prospects/${p.id}`, { method: 'PUT', data: p });
        } else {
          await apiCall('/prospects', { method: 'POST', data: {
            fullName: p.prospect_name || '',
            email: p.prospect_email,
            phoneNum: p.prospect_phone,
          }});
        }
      }

      await fetchProspects();
    } catch (e) {
      throw e;
    }
  };

  const deleteProspect = async (id: string) => {
    try {
      await apiCall(`/prospects/${id}`, { method: 'DELETE' });

      await fetchProspects();
    } catch (e) {
      throw e;
    }
  };

  const updateBadgeTiers = async (tiers: BadgeTier[]) => {
    await apiCall('/config/badges', { method: 'PUT', data: { tiers } });
    setBadgeTiers(tiers);
  };

  const fetchPointConfig = async () => {
    try {
      const data = await apiCall('/config/points');
      if (data && typeof data === 'object') {
        setPointConfig({ ...DEFAULT_POINT_CONFIG, ...data });
      }
    } catch (_e) {
      // Use defaults if endpoint not available yet
    }
  };

  const updatePointConfig = async (cfg: PointConfig) => {
    await apiCall('/config/points', { method: 'PUT', data: cfg });
    setPointConfig(cfg);
  };

  // --- SCOPING HELPER ---
  const getGroupProspects = (groupId: string): Prospect[] => {
    return prospects.filter(p => p.group_id === groupId);
  };

  // --- MAIN SCOPE FUNCTION ---
  const getProspectsByScope = (user: User): Prospect[] => {
    // 1. Admin & Master Trainer (View All)
    if (user.role === UserRole.ADMIN || user.role === UserRole.MASTER_TRAINER) {
      return prospects;
    }

    // 2. Trainer (View All — managed groups handled server-side)
    if (user.role === UserRole.TRAINER) {
      return prospects;
    }

    // 3. Group Leader & Agent (Own Only)
    return prospects.filter(p => p.agent_id === user.id);
  };

  // --- EVENTS ---
  // Convert local date+time to UTC date+time before sending to the backend.
  // new Date('YYYY-MM-DDTHH:MM') is parsed as local time by JS, so toISOString() gives UTC.
  const toUtcDateTime = (date: string, time?: string): { date: string; time?: string } => {
    if (!date) return { date };
    const local = new Date(time ? `${date}T${time}` : `${date}T00:00`);
    if (isNaN(local.getTime())) return { date, time };
    const iso = local.toISOString();
    return {
      date: iso.slice(0, 10),            // YYYY-MM-DD in UTC
      time: time ? iso.slice(11, 16) : undefined, // HH:MM in UTC
    };
  };

  const addEvent = async (evt: Partial<Event>) => {
    const { date, time: startTimeUtc } = toUtcDateTime((evt as any).date, (evt as any).startTime);
    const { time: endTimeUtc } = toUtcDateTime((evt as any).date, (evt as any).endTime);
    const payload: Record<string, unknown> = {
      title: evt.event_title || 'New Event',
      date,
      description: evt.description || '',
      groupIds: evt.groupIds || [],
    };
    if (startTimeUtc) payload.startTime = startTimeUtc;
    if (endTimeUtc) payload.endTime = endTimeUtc;
    if (evt.type) payload.type = evt.type;
    if (evt.meeting_link) payload.link = evt.meeting_link;
    if (evt.venue) payload.venue = evt.venue;
    if (evt.agentIds?.length) payload.agentIds = evt.agentIds;
    await apiCall('/events', { method: 'POST', data: payload });
    await fetchEvents();
  };

  const updateEvent = async (id: string, evt: Partial<Event>) => {
    const payload: Record<string, unknown> = {};
    if (evt.event_title) payload.title = evt.event_title;
    if (evt.date) {
      const { date, time: startTimeUtc } = toUtcDateTime(evt.date, evt.startTime);
      const { time: endTimeUtc } = toUtcDateTime(evt.date, evt.endTime);
      payload.date = date;
      if (startTimeUtc) payload.startTime = startTimeUtc;
      if (endTimeUtc) payload.endTime = endTimeUtc;
    }
    if (evt.description) payload.description = evt.description;
    if (evt.type) payload.type = evt.type;
    if (evt.meeting_link) payload.link = evt.meeting_link;
    if (evt.venue) payload.venue = evt.venue;
    if (evt.groupIds) payload.groupIds = evt.groupIds;
    if (evt.agentIds?.length) payload.agentIds = evt.agentIds;
    await apiCall(`/events/${id}`, { method: 'PUT', data: payload });
    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await apiCall(`/events/${id}`, { method: 'DELETE' });
    await fetchEvents();
  };

  const getEventsForUser = (_user: User): Event[] => {
    // Backend RLS already scopes events to what the user is allowed to see.
    return events;
  };

  // --- COACHING SESSIONS ---
  const addCoachingSession = async (session: CoachingSessionCreateBody) => {
    const { date, time: startTimeUtc } = toUtcDateTime(session.date, session.startTime);
    const { time: endTimeUtc } = toUtcDateTime(session.date, session.endTime);
    await apiCall('/coaching-sessions', { method: 'POST', data: { ...session, date, startTime: startTimeUtc, endTime: endTimeUtc } });
    await fetchCoachingSessions();
  };

  const updateCoachingSession = async (id: string, updates: CoachingSessionUpdateBody) => {
    let payload: CoachingSessionUpdateBody = { ...updates };
    if (updates.date) {
      const { date, time: startTimeUtc } = toUtcDateTime(updates.date, updates.startTime);
      const { time: endTimeUtc } = toUtcDateTime(updates.date, updates.endTime);
      payload = { ...payload, date, startTime: startTimeUtc, endTime: endTimeUtc };
    }
    await apiCall(`/coaching-sessions/${id}`, { method: 'PUT', data: payload });
    await fetchCoachingSessions();
  };

  const deleteCoachingSession = async (id: string) => {
    await apiCall(`/coaching-sessions/${id}`, { method: 'DELETE' });
    await fetchCoachingSessions();
  };

  const joinCoachingSession = async (sessionId: string) => {
    await apiCall(`/coaching-sessions/${sessionId}/join`, { method: 'POST' });
    await fetchCoachingSessions();
  };

  const markNonAttendees = async (sessionId: string) => {
    await apiCall(`/coaching-sessions/${sessionId}/mark-non-attendees`, { method: 'POST' });
    await fetchCoachingSessions();
  };

  return (
    <DataContext.Provider value={{
      prospects, badgeTiers, pointConfig, events,
      isLoadingProspects, isLoadingEvents, isLoadingCoaching,
      eventsError, coachingError,
      addProspect, updateProspect, importProspects, deleteProspect,
      getProspectsByScope, getGroupProspects, updateBadgeTiers, updatePointConfig,
      addEvent, updateEvent, deleteEvent, getEventsForUser, refetchEvents: fetchEvents,
      coachingSessions, addCoachingSession, updateCoachingSession, deleteCoachingSession,
      joinCoachingSession, markNonAttendees, refetchCoachingSessions: fetchCoachingSessions,
      dashboardStats, groupStats, isLoadingDashboardStats,
      refetchDashboardStats: fetchDashboardStats, refetchGroupStats: fetchGroupStats
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within DataProvider');
  return context;
};
