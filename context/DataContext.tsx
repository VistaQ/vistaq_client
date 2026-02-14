
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Prospect, ProspectStage, User, UserRole, BadgeTier, Event } from '../types';
import { 
  db,
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from '../services/firebase';

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

  // 1. Sync Prospects from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "prospects"), (snapshot: any) => {
      const loadedData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Prospect[];
      setProspects(loadedData);
    });
    return unsubscribe;
  }, []);

  // 2. Sync Badge Tiers from Firestore (Optional collection)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "config"), (snapshot: any) => {
        // Assume we store badges in a single doc config/badges
        const badgesDoc = snapshot.docs.find((d: any) => d.id === 'badges');
        if (badgesDoc) {
            setBadgeTiers(badgesDoc.data().tiers as BadgeTier[]);
        }
    });
    return unsubscribe;
  }, []);

  // 3. Sync Events from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot: any) => {
      const loadedEvents = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(loadedEvents);
    });
    return unsubscribe;
  }, []);

  const addProspect = async (data: Partial<Prospect>) => {
    // Generate a new reference
    const newRef = doc(collection(db, "prospects"));
    const newProspect: Prospect = {
      id: newRef.id, // Use Firestore generated ID
      agentId: data.agentId || 'unknown',
      name: data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      currentStage: ProspectStage.INFO,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    } as Prospect;
    
    await setDoc(newRef, newProspect);
    return newProspect;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    const prospectRef = doc(db, "prospects", id);
    await updateDoc(prospectRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  };

  // Sync / Import function using Batch Writes
  const importProspects = async (importedData: Prospect[]) => {
    const batch = writeBatch(db);
    
    importedData.forEach((p) => {
      // Use the provided ID from CSV or generate one if missing
      const docId = p.id || doc(collection(db, "prospects")).id;
      const docRef = doc(db, "prospects", docId);
      
      batch.set(docRef, {
        ...p,
        id: docId,
        // Ensure timestamp exists if not provided
        updatedAt: new Date().toISOString(),
        createdAt: p.createdAt || new Date().toISOString()
      }, { merge: true }); // Upsert logic
    });

    await batch.commit();
  };

  const deleteProspect = async (id: string) => {
    await deleteDoc(doc(db, "prospects", id));
  };
  
  const updateBadgeTiers = async (tiers: BadgeTier[]) => {
    // Corrected: setDoc takes (ref, data) as used here, removing options if definition mismatch
    await setDoc(doc(db, "config", "badges"), { tiers });
    setBadgeTiers(tiers); // Optimistic update
  };

  // --- SCOPING HELPER ---
  const getGroupProspects = (groupId: string): Prospect[] => {
    return prospects.filter(p => {
        // 1. Standard Convention: ID contains group (e.g. agent_g1_1)
        const matchesGroup = p.agentId.includes(groupId);
        
        // 2. Leader Convention: ID is leader_X where X is group suffix
        const matchesLeader = p.agentId.includes(`leader_${groupId.replace('g','')}`);
        
        // 3. SPECIAL DEMO MAPPING: agent_1 is in g1
        const matchesDemoAgent = (groupId === 'g1' && p.agentId === 'agent_1');

        return matchesGroup || matchesLeader || matchesDemoAgent;
    });
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
        // Filter prospects belonging to any of the managed groups
        return prospects.filter(p => {
          return user.managedGroupIds?.some(gid => {
             // Reuse the logic from getGroupProspects via direct checks for efficiency
             const matchesGroup = p.agentId.includes(gid);
             const leaderSuffix = gid.replace('g', ''); 
             const matchesLeader = p.agentId === `leader_${leaderSuffix}`;
             return matchesGroup || matchesLeader;
          });
        });
      }
      // If trainer has no groups assigned, view all by default or none. 
      // Assuming behavior same as Master Trainer if unassigned, but safer to return prospects for demo.
      return prospects;
    }

    // 3. Group Leader & Agent (Own Only)
    // Group Leaders are restricted to seeing ONLY their own prospects in lists.
    // Team performance is viewed via the Group Dashboard aggregates using getGroupProspects directly in those pages.
    return prospects.filter(p => p.agentId === user.id);
  };

  // --- EVENTS ---
  const addEvent = async (evt: Partial<Event>) => {
      const ref = doc(collection(db, "events"));
      const newEvent = {
          ...evt,
          id: ref.id,
          // Defaults
          title: evt.title || 'New Event',
          date: evt.date || new Date().toISOString()
      };
      await setDoc(ref, newEvent);
  };

  const updateEvent = async (id: string, evt: Partial<Event>) => {
      const ref = doc(db, "events", id);
      await updateDoc(ref, evt);
  };

  const deleteEvent = async (id: string) => {
      await deleteDoc(doc(db, "events", id));
  };

  const getEventsForUser = (user: User): Event[] => {
      if (!user) return [];
      
      // Admin & Master Trainer sees all
      if (user.role === UserRole.ADMIN || user.role === UserRole.MASTER_TRAINER) return events;

      return events.filter(e => {
          const targetGroups = e.targetGroupIds || [];
          
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

          // 4. For Trainer: Do managed groups overlap with target groups?
          if (user.role === UserRole.TRAINER && user.managedGroupIds) {
               return targetGroups.some(gid => user.managedGroupIds!.includes(gid));
          }

          return false;
      });
  };

  return (
    <DataContext.Provider value={{ 
      prospects, badgeTiers, events, 
      addProspect, updateProspect, importProspects, deleteProspect,
      getProspectsByScope, getGroupProspects, updateBadgeTiers,
      addEvent, updateEvent, deleteEvent, getEventsForUser
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
