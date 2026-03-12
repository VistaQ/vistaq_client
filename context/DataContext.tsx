
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Prospect, ProspectStage, User, UserRole, BadgeTier, Event, CoachingSession } from '../types';
import { apiCall } from '../services/apiClient';

interface DataContextType {
  prospects: Prospect[];
  badgeTiers: BadgeTier[];
  events: Event[]; // New
  addProspect: (p: Partial<Prospect>) => Promise<Prospect>;
  updateProspect: (id: string, updates: Partial<Prospect>) => Promise<void>;
  importProspects: (newData: Prospect[]) => Promise<void>;
  getProspectsByScope: (user: User) => Prospect[];
  getGroupProspects: (groupId: string) => Prospect[];
  deleteProspect: (id: string) => Promise<void>;
  updateBadgeTiers: (tiers: BadgeTier[]) => Promise<void>;

  // Event Methods
  addEvent: (evt: Partial<Event>) => Promise<void>;
  updateEvent: (id: string, evt: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsForUser: (user: User) => Event[];
  refetchEvents: () => Promise<void>;

  // Loading states
  isLoadingProspects: boolean;
  isLoadingEvents: boolean;
  isLoadingCoaching: boolean;

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
  const [events, setEvents] = useState<Event[]>([]);
  const [coachingSessions, setCoachingSessions] = useState<CoachingSession[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false);

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

  const getProspectsEndpoint = () => {
    try {
      const stored = localStorage.getItem('authUser');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role === 'admin' || user.role === 'master_trainer') {
          return '/admin/all-prospects';
        }
        if (user.role === 'trainer') {
          return '/prospects/managed-groups';
        }
      }
    } catch (_e) { }
    return '/prospects/my-prospects';
  };

  const toISO = (ts: any): string | undefined => {
    if (!ts) return undefined;
    if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toISOString();
    return undefined;
  };

  const normalizeProspect = (p: any): Prospect => ({
    ...p,
    id: p.id || p.prospectId,
    prospectName: p.prospectName || '',
    appointmentDate: toISO(p.appointmentDate),
    appointmentCompletedAt: toISO(p.appointmentCompletedAt),
    salesCompletedAt: toISO(p.salesCompletedAt),
    createdAt: toISO(p.createdAt),
    updatedAt: toISO(p.updatedAt),
    productsSold: (p.productsSold || []).map((prod: any, i: number) => ({
      ...prod,
      id: prod.id || `prod_${i}`,
    })),
  });

  const fetchProspects = async () => {
    if (!localStorage.getItem('authToken')) return;

    const userId = getCurrentUserId();
    if (!userId) return;

    const endpoint = getProspectsEndpoint();

    setIsLoadingProspects(true);
    try {
      const data = await apiCall(endpoint);
      const raw: any[] = Array.isArray(data) ? data : (data.prospects || []);
      const normalized = raw.map(normalizeProspect);
      setProspects(normalized);
    } catch (_e) { } finally {
      setIsLoadingProspects(false);
    }
  };

  const fetchEvents = async () => {
    if (!localStorage.getItem('authToken')) {
      setEvents([]);
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      setEvents([]);
      return;
    }

    setIsLoadingEvents(true);
    try {
      const data = await apiCall('/events/my-events');
      const raw: any[] = Array.isArray(data) ? data : (data.events || []);
      const items: Event[] = raw.map(e => ({
        ...e,
        date: toISO(e.date) || e.date,
        createdAt: toISO(e.createdAt) || e.createdAt,
        updatedAt: toISO(e.updatedAt) || e.updatedAt,
      }));
      setEvents(items);
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
      date: toISO(s.date) || s.date,
      createdAt: toISO(s.createdAt) || s.createdAt,
      updatedAt: toISO(s.updatedAt) || s.updatedAt,
      attendance: s.attendance || [],
      targetGroupIds: s.targetGroupIds || [],
      targetAgentIds: s.targetAgentIds || []
    }));

    setCoachingSessions(items);
    setIsLoadingCoaching(false);
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

  // 1. Sync Prospects when authenticated or user role changes, clear on logout
  useEffect(() => {
    if (authToken) {
      fetchProspects();
    } else {
      // Clear data on logout
      setProspects([]);
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

  const addProspect = async (data: Partial<Prospect>) => {
    const payload: Record<string, any> = {
      prospectName: data.prospectName || '',
    };
    if (data.prospectEmail) payload.prospectEmail = data.prospectEmail;
    if (data.prospectPhone) payload.prospectPhone = data.prospectPhone;

    try {
      const response = await apiCall('/prospects', { method: 'POST', data: payload });
      const prospectId = response.prospectId || response.id;

      const detail = await apiCall(`/prospects/${prospectId}`);
      const created: Prospect = normalizeProspect(detail.prospect || detail);

      await fetchProspects();
      return created;
    } catch (e) {
      throw e;
    }
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    try {
      await apiCall(`/prospects/${id}`, {
        method: 'PUT',
        data: { ...updates, updatedAt: new Date().toISOString() }
      });

      await fetchProspects();
    } catch (e) {
      throw e;
    }
  };

  const importProspects = async (importedData: Prospect[]) => {
    try {
      for (const p of importedData) {
        const payload = {
          ...p,
          updatedAt: new Date().toISOString(),
          createdAt: p.createdAt || new Date().toISOString()
        };
        if (p.id) {
          await apiCall(`/prospects/${p.id}`, { method: 'PUT', data: payload });
        } else {
          await apiCall('/prospects', { method: 'POST', data: payload });
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

  // --- SCOPING HELPER ---
  const getGroupProspects = (groupId: string): Prospect[] => {
    return prospects.filter(p => p.groupId === groupId);
  };

  // --- MAIN SCOPE FUNCTION ---
  const getProspectsByScope = (user: User): Prospect[] => {
    // 1. Admin & Master Trainer (View All)
    if (user.role === UserRole.ADMIN || user.role === UserRole.MASTER_TRAINER) {
      return prospects;
    }

    // 2. Trainer (Managed Groups)
    if (user.role === UserRole.TRAINER) {
      if (user.managedGroupIds && user.managedGroupIds.length > 0) {
        return prospects.filter(p => user.managedGroupIds!.includes(p.groupId || ''));
      }
      return prospects;
    }

    // 3. Group Leader & Agent (Own Only)
    return prospects.filter(p => p.uid === user.id);
  };

  // --- EVENTS ---
  const addEvent = async (evt: Partial<Event>) => {
    const payload = {
      ...evt,
      eventTitle: evt.eventTitle || 'New Event',
      date: evt.date || new Date().toISOString()
    };
    await apiCall('/events', { method: 'POST', data: payload });
    await fetchEvents();
  };

  const updateEvent = async (id: string, evt: Partial<Event>) => {
    await apiCall(`/events/${id}`, { method: 'PUT', data: evt });
    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await apiCall(`/events/${id}`, { method: 'DELETE' });
    await fetchEvents();
  };

  const getEventsForUser = (user: User): Event[] => {
    if (!user) return [];

    // Admin, Master Trainer, and Trainer see all events
    if (user.role === UserRole.ADMIN ||
      user.role === UserRole.MASTER_TRAINER ||
      user.role === UserRole.TRAINER) {
      return events;
    }

    return events.filter(e => {
      const targetGroups = e.groupIds || [];

      // 1. Created by me?
      if (e.createdBy === user.id) return true;

      // 2. For Agent: Is my group in target?
      if (user.role === UserRole.AGENT && user.groupId) {
        return targetGroups.includes(user.groupId);
      }

      // 3. For Leader: Is my group in target?
      if (user.role === UserRole.GROUP_LEADER && user.groupId) {
        return targetGroups.includes(user.groupId);
      }

      return false;
    });
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
        groupId: user.groupId,
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
      if (user.groupId && s.targetGroupIds?.includes(user.groupId)) return true;

      // 5. Admin or Master Trainer sees all
      if (user.role === UserRole.ADMIN || user.role === UserRole.MASTER_TRAINER) {
        return true;
      }

      return false;
    });
  };

  return (
    <DataContext.Provider value={{
      prospects, badgeTiers, events,
      isLoadingProspects, isLoadingEvents, isLoadingCoaching,
      addProspect, updateProspect, importProspects, deleteProspect,
      getProspectsByScope, getGroupProspects, updateBadgeTiers,
      addEvent, updateEvent, deleteEvent, getEventsForUser, refetchEvents: fetchEvents,
      coachingSessions, addCoachingSession, updateCoachingSession, deleteCoachingSession,
      joinCoachingSession, getCoachingSessionsForUser, refetchCoachingSessions: fetchCoachingSessions
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
