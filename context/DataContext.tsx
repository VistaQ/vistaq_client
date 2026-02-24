
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Prospect, ProspectStage, User, UserRole, BadgeTier, Event } from '../types';
import { apiCall } from '../services/apiClient';
import { getCache, setCache, invalidateCache, buildCacheKey } from '../services/cache';

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

  const getCurrentUserId = (): string | null => {
    try {
      const stored = localStorage.getItem('authUser');
      if (stored) {
        const user = JSON.parse(stored);
        return user.id || user.uid || null;
      }
    } catch (_e) {}
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
    } catch (_e) {}
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
    const cacheKey = buildCacheKey(userId, `prospects_${endpoint}`);

    // Try to get from cache first
    const cached = getCache<Prospect[]>(cacheKey, userId);
    if (cached) {
      setProspects(cached);
      return;
    }

    // Fetch from API if cache miss or stale
    try {
      const data = await apiCall(endpoint);
      const raw: any[] = Array.isArray(data) ? data : (data.prospects || []);
      const normalized = raw.map(normalizeProspect);
      setProspects(normalized);
      setCache(cacheKey, normalized, userId);
    } catch (_e) {}
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

    const cacheKey = buildCacheKey(userId, 'events');

    // Try to get from cache first
    const cached = getCache<Event[]>(cacheKey, userId);
    if (cached) {
      setEvents(cached);
      return;
    }

    // Fetch from API if cache miss or stale
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
      setCache(cacheKey, items, userId);
    } catch (_e) {
      setEvents([]);
    }
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
      } catch {}
    };

    // Check periodically for auth changes
    const interval = setInterval(checkAuth, 100);

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

  // 2. Sync Events when authenticated, clear on logout
  useEffect(() => {
    if (authToken) {
      fetchEvents();
    } else {
      // Clear data on logout
      setEvents([]);
    }
  }, [authToken]);

  const addProspect = async (data: Partial<Prospect>) => {
    const payload: Record<string, any> = {
      prospectName: data.prospectName || '',
    };
    if (data.prospectEmail) payload.prospectEmail = data.prospectEmail;
    if (data.prospectPhone) payload.prospectPhone = data.prospectPhone;

    const response = await apiCall('/prospects', { method: 'POST', data: payload });
    const prospectId = response.prospectId || response.id;

    // Fetch the full created prospect from the API
    const detail = await apiCall(`/prospects/${prospectId}`);
    const created: Prospect = normalizeProspect(detail.prospect || detail);

    // Invalidate cache before refetching
    const userId = getCurrentUserId();
    if (userId) {
      const endpoint = getProspectsEndpoint();
      invalidateCache(buildCacheKey(userId, `prospects_${endpoint}`));
    }

    await fetchProspects();
    return created;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    await apiCall(`/prospects/${id}`, {
      method: 'PUT',
      data: { ...updates, updatedAt: new Date().toISOString() }
    });

    // Invalidate cache before refetching
    const userId = getCurrentUserId();
    if (userId) {
      const endpoint = getProspectsEndpoint();
      invalidateCache(buildCacheKey(userId, `prospects_${endpoint}`));
    }

    await fetchProspects();
  };

  const importProspects = async (importedData: Prospect[]) => {
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

    // Invalidate cache before refetching
    const userId = getCurrentUserId();
    if (userId) {
      const endpoint = getProspectsEndpoint();
      invalidateCache(buildCacheKey(userId, `prospects_${endpoint}`));
    }

    await fetchProspects();
  };

  const deleteProspect = async (id: string) => {
    await apiCall(`/prospects/${id}`, { method: 'DELETE' });

    // Invalidate cache before refetching
    const userId = getCurrentUserId();
    if (userId) {
      const endpoint = getProspectsEndpoint();
      invalidateCache(buildCacheKey(userId, `prospects_${endpoint}`));
    }

    await fetchProspects();
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

      // Invalidate cache before refetching
      const userId = getCurrentUserId();
      if (userId) {
        invalidateCache(buildCacheKey(userId, 'events'));
      }

      await fetchEvents();
  };

  const updateEvent = async (id: string, evt: Partial<Event>) => {
      await apiCall(`/events/${id}`, { method: 'PUT', data: evt });

      // Invalidate cache before refetching
      const userId = getCurrentUserId();
      if (userId) {
        invalidateCache(buildCacheKey(userId, 'events'));
      }

      await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
      await apiCall(`/events/${id}`, { method: 'DELETE' });

      // Invalidate cache before refetching
      const userId = getCurrentUserId();
      if (userId) {
        invalidateCache(buildCacheKey(userId, 'events'));
      }

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

  return (
    <DataContext.Provider value={{
      prospects, badgeTiers, events,
      addProspect, updateProspect, importProspects, deleteProspect,
      getProspectsByScope, getGroupProspects, updateBadgeTiers,
      addEvent, updateEvent, deleteEvent, getEventsForUser, refetchEvents: fetchEvents
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
