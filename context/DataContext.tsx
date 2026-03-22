
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Prospect, User, UserRole, BadgeTier, Event, CoachingSession, PointConfig, Group, DashboardStats, GroupStats } from '../types';
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

  // Coaching Methods
  coachingSessions: CoachingSession[];
  addCoachingSession: (session: Partial<CoachingSession>) => Promise<void>;
  updateCoachingSession: (id: string, updates: Partial<CoachingSession>) => Promise<void>;
  deleteCoachingSession: (id: string) => Promise<void>;
  joinCoachingSession: (sessionId: string, user: User) => Promise<void>;
  getCoachingSessionsForUser: (user: User) => CoachingSession[];
  refetchCoachingSessions: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Default Milestones (Fallback)
const DEFAULT_MILESTONES: BadgeTier[] = [
  { id: 'b1', name: "Rookie", threshold: 0, color: "text-gray-400", bg: "bg-gray-100" },
  { id: 'b2', name: "Rising Star", threshold: 1000, color: "text-blue-500", bg: "bg-blue-100" },
  { id: 'b3', name: "Bronze Achiever", threshold: 3000, color: "text-amber-700", bg: "bg-amber-100" },
  { id: 'b4', name: "Silver Elite", threshold: 8000, color: "text-slate-400", bg: "bg-slate-100" },
  { id: 'b5', name: "Gold Master", threshold: 15000, color: "text-yellow-500", bg: "bg-yellow-100" },
  { id: 'b6', name: "Platinum Legend", threshold: 25000, color: "text-indigo-500", bg: "bg-indigo-100" }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [badgeTiers, setBadgeTiers] = useState<BadgeTier[]>(DEFAULT_MILESTONES);
  const [pointConfig, setPointConfig] = useState<PointConfig>(DEFAULT_POINT_CONFIG);
  const [events, setEvents] = useState<Event[]>([]);
  const [coachingSessions, setCoachingSessions] = useState<CoachingSession[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false);
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
    } catch (_e) { }
    return null;
  };

  const fetchProspects = async () => {
    if (!localStorage.getItem('authToken')) return;

    const userId = getCurrentUserId();
    if (!userId) return;

    setIsLoadingProspects(true);
    try {
      const res = await apiCall('/prospects');
      const raw: any[] = Array.isArray(res.data) ? res.data : [];
      setProspects(raw);
    } catch (_e) { } finally {
      setIsLoadingProspects(false);
    }
  };

  const fetchEvents = async () => {
    if (!localStorage.getItem('authToken')) {
      setEvents([]);
      return;
    }

    setIsLoadingEvents(true);
    try {
      const res = await apiCall('/events');
      const raw: any[] = Array.isArray(res.data) ? res.data : [];
      setEvents(raw);
    } catch (_e) {
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

    // Simulated Backend Storage Key (Global across all users for accurate simulation)
    const DB_KEY = 'mock_coaching_db';
    let raw: any[] = [];

    try {
      const storedDb = localStorage.getItem(DB_KEY);
      if (storedDb) {
        raw = JSON.parse(storedDb);
      }
    } catch (e) {
      raw = [];
    }

    setIsLoadingCoaching(true);
    const items: CoachingSession[] = raw.map(s => ({
      ...s,
      coachingType: s.coachingType || 'Individual Coaching',
      durationStart: s.durationStart || '09:00',
      durationEnd: s.durationEnd || '10:00',
      attendance: s.attendance || [],
      targetGroupIds: s.targetGroupIds || [],
      targetAgentIds: s.targetAgentIds || []
    }));

    setCoachingSessions(items);
    setIsLoadingCoaching(false);
  };

  const fetchDashboardStats = async () => {
    if (!localStorage.getItem('authToken')) return;
    setIsLoadingDashboardStats(true);
    try {
      const res = await apiCall('/dashboard/stats');
      if (res?.data) setDashboardStats(res.data);
    } catch (_e) { } finally {
      setIsLoadingDashboardStats(false);
    }
  };

  const fetchGroupStats = async () => {
    if (!localStorage.getItem('authToken')) return;
    try {
      const res = await apiCall('/groups/stats');
      const raw: GroupStats[] = Array.isArray(res.data) ? res.data : [];
      setGroupStats(raw);
    } catch (_e) { }
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
      } catch { }
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
  }, [authToken, userRole]);

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

  const addEvent = async (evt: any) => {
    const { date, time: startTimeUtc } = toUtcDateTime(evt.date, evt.startTime);
    const { time: endTimeUtc } = toUtcDateTime(evt.date, evt.endTime);
    const payload: Record<string, any> = {
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

  const updateEvent = async (id: string, evt: any) => {
    const payload: Record<string, any> = {};
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

  // --- COACHING SESSIONS (Mocked) ---
  const getMockDb = (): CoachingSession[] => {
    try {
      const stored = localStorage.getItem('mock_coaching_db');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const setMockDb = (data: CoachingSession[]) => {
    localStorage.setItem('mock_coaching_db', JSON.stringify(data));
  };

  const addCoachingSession = async (session: Partial<CoachingSession>) => {
    const newSession = {
      ...session,
      id: `coach_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      coachingType: session.coachingType || 'Individual Coaching',
      title: session.title || 'New Coaching Session',
      durationStart: session.durationStart || '09:00',
      durationEnd: session.durationEnd || '10:00',
      date: session.date || new Date().toISOString(),
      attendance: session.attendance || [],
      targetGroupIds: session.targetGroupIds || [],
      targetAgentIds: session.targetAgentIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: session.status || 'upcoming'
    } as CoachingSession;

    // Write to mock DB
    const db = getMockDb();
    db.push(newSession);
    setMockDb(db);

    await fetchCoachingSessions();
  };

  const updateCoachingSession = async (id: string, updates: Partial<CoachingSession>) => {
    // Update in mock DB
    const db = getMockDb();
    const index = db.findIndex(s => s.id === id);
    if (index >= 0) {
      db[index] = { ...db[index], ...updates, updatedAt: new Date().toISOString() };
      setMockDb(db);
    }

    await fetchCoachingSessions();
  };

  const deleteCoachingSession = async (id: string) => {
    // Delete from mock DB
    const db = getMockDb();
    const filtered = db.filter(s => s.id !== id);
    setMockDb(filtered);

    await fetchCoachingSessions();
  };

  const joinCoachingSession = async (sessionId: string, user: User) => {
    const db = getMockDb();
    const index = db.findIndex(s => s.id === sessionId);
    if (index < 0) return;

    const session = db[index];
    const existingIdx = session.attendance.findIndex((a: { agentId: string }) => a.agentId === user.id);

    if (existingIdx >= 0) {
      if (session.attendance[existingIdx].status === 'pending') {
        session.attendance[existingIdx] = {
          ...session.attendance[existingIdx],
          status: 'joined',
          joinedAt: new Date().toISOString(),
        };
      }
    } else {
      session.attendance.push({
        agentId: user.id,
        agentName: user.name || user.email,
        agentEmail: user.email,
        groupId: user.group_id,
        status: 'joined',
        joinedAt: new Date().toISOString(),
      });
    }

    db[index] = { ...session, updatedAt: new Date().toISOString() };
    setMockDb(db);

    await fetchCoachingSessions();
  };

  const getCoachingSessionsForUser = (user: User): CoachingSession[] => {
    if (!user) return [];

    return coachingSessions.filter(s => {
      // 1. Created by me?
      if (s.createdBy === user.id) return true;

      // 2. Is target audience "All" (empty arrays) and I am an agent/leader?
      if (s.targetGroupIds?.length === 0 && s.targetAgentIds?.length === 0) {
        return true;
      }

      // 3. Am I specifically targeted?
      if (s.targetAgentIds?.includes(user.id)) return true;

      // 4. Is my group targeted?
      if (user.group_id && s.targetGroupIds?.includes(user.group_id)) return true;

      // 5. Admin or Master Trainer sees all
      if (user.role === UserRole.ADMIN || user.role === UserRole.MASTER_TRAINER) {
        return true;
      }

      return false;
    });
  };

  return (
    <DataContext.Provider value={{
      prospects, badgeTiers, pointConfig, events,
      isLoadingProspects, isLoadingEvents, isLoadingCoaching,
      addProspect, updateProspect, importProspects, deleteProspect,
      getProspectsByScope, getGroupProspects, updateBadgeTiers, updatePointConfig,
      addEvent, updateEvent, deleteEvent, getEventsForUser, refetchEvents: fetchEvents,
      coachingSessions, addCoachingSession, updateCoachingSession, deleteCoachingSession,
      joinCoachingSession, getCoachingSessionsForUser, refetchCoachingSessions: fetchCoachingSessions,
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
