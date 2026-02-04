
// NOTE: Real Firebase imports are removed to resolve build errors in environments 
// where the firebase SDK is not correctly installed or configured.
// This service now runs exclusively in MOCK MODE using localStorage.

// import { initializeApp } from "firebase/app";
// import { ... } from "firebase/auth";
// import { ... } from "firebase/firestore";

// Configuration from environment variables (Unused in forced mock mode)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

let auth: any;
let db: any;

// Exportable functions interface
let signInWithEmailAndPassword: any;
let createUserWithEmailAndPassword: any;
let signOut: any;
let onAuthStateChanged: any;

let doc: any;
let getDoc: any;
let setDoc: any;
let updateDoc: any;
let deleteDoc: any;
let collection: any;
let onSnapshot: any;
let query: any;
let addDoc: any;
let writeBatch: any;

// --- MOCK BACKEND INITIALIZATION (LocalStorage) ---
console.warn("⚠️ Firebase imports removed: Running in DEMO MODE (LocalStorage Backend) ⚠️");

const MOCK_STORAGE_KEY = 'vistaq_mock_data';
const getStore = () => {
try {
    const data = localStorage.getItem(MOCK_STORAGE_KEY);
    return data ? JSON.parse(data) : { users: {}, groups: {}, prospects: {}, events: {} };
} catch (e) {
    return { users: {}, groups: {}, prospects: {}, events: {} };
}
};
const setStore = (data: any) => localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));

// --- SEED DATA GENERATION ---
if (!localStorage.getItem(MOCK_STORAGE_KEY)) {
    console.log("🌱 Seeding Dummy Data...");
    
    const users: Record<string, any> = {};
    const groups: Record<string, any> = {};
    const prospects: Record<string, any> = {};
    const events: Record<string, any> = {};

    // 1. Define Groups
    const groupDefs = [
        { id: 'g_star', name: 'MDRT STAR' },
        { id: 'g_legend', name: 'MDRT LEGEND' },
        { id: 'g_power', name: 'SALES POWER' },
        { id: 'g_avengers', name: 'AGENT AVENGERS' },
        { id: 'g_kpi', name: 'KPI BUSTERS' }
    ];

    // 2. Specific Personas
    // Restore Admin
    users['admin_1'] = {
        id: 'admin_1',
        name: 'System Admin',
        email: 'admin@sys.com',
        role: 'ADMIN',
        avatarUrl: 'https://ui-avatars.com/api/?name=System+Admin&background=ef4444&color=fff'
    };

    users['master_trainer'] = {
        id: 'master_trainer',
        name: 'Master Trainer',
        email: 'master@sys.com',
        role: 'TRAINER', // Can access all because we will give them all group IDs
        managedGroupIds: groupDefs.map(g => g.id),
        avatarUrl: 'https://ui-avatars.com/api/?name=Master+Trainer'
    };

    users['group_trainer'] = {
        id: 'group_trainer',
        name: 'Group Coach (Star)',
        email: 'coach@star.com',
        role: 'TRAINER',
        managedGroupIds: ['g_star'], // Only accesses MDRT STAR
        avatarUrl: 'https://ui-avatars.com/api/?name=Group+Coach'
    };

    // Helper: Generate Prospects for an Agent
    const generateProspects = (agentId: string, performanceTier: 'HIGH' | 'MID' | 'LOW' | 'TOP') => {
    let successCount = 0;
    let prospectCount = 0;
    
    if (performanceTier === 'TOP') { successCount = 25; prospectCount = 40; } // High Achiever
    else if (performanceTier === 'HIGH') { successCount = 12; prospectCount = 20; }
    else if (performanceTier === 'MID') { successCount = 5; prospectCount = 10; }
    else { successCount = 1; prospectCount = 5; } // LOW

    const products = ['Life Insurance', 'Medical Card', 'Investment Link', 'Takaful Family'];
    
    for (let i = 0; i < prospectCount; i++) {
        const pId = `p_${agentId}_${i}`;
        const isWin = i < successCount;
        const status = isWin ? 'SUCCESSFUL' : (Math.random() > 0.5 ? 'UNSUCCESSFUL' : 'APPOINTMENT'); // Mix of Won, Lost, Ongoing
        const amount = isWin ? Math.floor(Math.random() * 5000) + 2000 : 0; // RM 2000 - 7000 FYC
        
        // Random date in last 6 months
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 180));
        
        // Future Appointment for Demo
        let appointmentDate = date.toISOString();
        let apptStatus = 'Completed'; // was 'COMPLETED'

        // Make some appointments strictly in the future for "Upcoming" testing
        if (i === prospectCount - 1) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 2); // 2 days from now
            appointmentDate = futureDate.toISOString();
            apptStatus = 'Not done'; // was 'SCHEDULED'
        }
        
        // Mapping old stage logic to new enum:
        // INFO=1, APPT=2, MEETING=3, SALES=4, POINTS=5, CLOSED=6
        let currentStage = 1;
        if (isWin) currentStage = 5; // POINTS
        else if (status === 'UNSUCCESSFUL') currentStage = 6; // CLOSED
        else currentStage = 2; // APPOINTMENT

        prospects[pId] = {
            id: pId,
            agentId: agentId,
            name: `Client ${agentId.slice(-4)}_${i}`, // Simple names
            phone: `+6012${Math.floor(Math.random()*10000000)}`,
            email: `client${i}@mail.com`,
            currentStage: currentStage,
            saleStatus: (status === 'SUCCESSFUL' || status === 'UNSUCCESSFUL') ? status : undefined,
            saleReason: status === 'UNSUCCESSFUL' ? 'Price too high' : undefined,
            productType: products[Math.floor(Math.random() * products.length)],
            policyAmountMYR: amount,
            pointsAwarded: isWin ? Math.floor(amount * 0.1) : 0,
            appointmentStatus: apptStatus as any,
            appointmentDate: appointmentDate,
            paymentReceived: isWin,
            meetingChecklist: { rapport: true, factFinding: true, presentation: true }, // Assume done for seed
            createdAt: date.toISOString(),
            updatedAt: date.toISOString()
        };
    }
    };

    // 3. Generate Groups & Agents
    groupDefs.forEach(g => {
        // Create Group
        const leaderId = `leader_${g.id}`;
        groups[g.id] = { id: g.id, name: g.name, leaderId: leaderId };

        // --- Leader (Agent 01) ---
        // For MDRT STAR, we name them specifically as requested. For others, generic Leader.
        const isStarGroup = g.id === 'g_star';
        const leaderName = isStarGroup ? 'Agent 01 (Leader)' : `${g.name} Leader`;
        const leaderEmail = isStarGroup ? 'agent01@star.com' : `leader@${g.id}.com`;

        users[leaderId] = {
            id: leaderId,
            name: leaderName,
            email: leaderEmail,
            role: 'GROUP_LEADER',
            groupId: g.id
        };
        // Leaders are usually high performers
        generateProspects(leaderId, 'HIGH');

        // --- 19 Agents ---
        // One "High Achiever" per group (TOP tier)
        const topPerformerIndex = Math.floor(Math.random() * 19); 

        for (let i = 0; i < 19; i++) {
            const agentNum = i + 2; // Starts from Agent 02
            const agentId = `agent_${g.id}_${agentNum}`;
            
            let agentName = `${g.name} Agent ${agentNum}`;
            let agentEmail = `agent${agentNum}@${g.id}.com`;
            
            // Specific override for Agent 02 in MDRT STAR
            if (isStarGroup && agentNum === 2) {
                agentName = 'Agent 02';
                agentEmail = 'agent02@star.com';
            }

            // Determine Performance Tier
            let tier: any = 'LOW';
            if (i === topPerformerIndex) tier = 'TOP'; // The group Legend
            else if (i < 4) tier = 'HIGH';
            else if (i < 12) tier = 'MID';

            users[agentId] = {
                id: agentId,
                name: agentName,
                email: agentEmail,
                role: 'AGENT',
                groupId: g.id
            };
            
            generateProspects(agentId, tier);
        }
    });

    // 4. Generate Seed Events
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 5);

    events['evt_1'] = {
        id: 'evt_1',
        title: 'Weekly Sales Huddle',
        description: 'Reviewing pipeline and targets for the week. Please update your prospect list beforehand.',
        venue: 'Meeting Room A',
        date: tomorrow.toISOString(),
        createdBy: 'master_trainer',
        createdByName: 'Master Trainer',
        targetGroupIds: ['g_star', 'g_legend', 'g_power', 'g_avengers', 'g_kpi'] // For Everyone
    };

    events['evt_2'] = {
        id: 'evt_2',
        title: 'MDRT Star Strategy Session',
        description: 'Exclusive strategy planning for MDRT Star group members.',
        venue: 'Zoom Link',
        date: nextWeek.toISOString(),
        createdBy: 'group_trainer',
        createdByName: 'Group Coach (Star)',
        targetGroupIds: ['g_star'] // Only for Star group
    };

    setStore({ users, groups, prospects, events });
    console.log("✅ Seed Complete: 5 Groups, 100+ Users, ~1000 Prospects, 2 Events Generated.");
}

// Auth State
const mockUserKey = 'vistaq_mock_user';
let currentUser = JSON.parse(localStorage.getItem(mockUserKey) || 'null');
const authListeners = new Set<Function>();

const triggerAuth = (user: any) => {
    currentUser = user;
    if (user) {
    localStorage.setItem(mockUserKey, JSON.stringify(user));
    } else {
    localStorage.removeItem(mockUserKey);
    }
    authListeners.forEach(cb => cb(user));
}

// Mock Objects
auth = { currentUser }; 
db = { type: 'mock_db' }; 

// --- Auth Functions ---
onAuthStateChanged = (_auth: any, cb: any) => {
    authListeners.add(cb);
    setTimeout(() => cb(currentUser), 0); // Fire immediately
    return () => authListeners.delete(cb);
};

signInWithEmailAndPassword = async (_auth: any, email: string, pass: string) => {
    const store = getStore();
    const user = Object.values(store.users).find((u: any) => u.email === email) as any;
    
    if (user) {
        const authUser = { uid: user.id, email: user.email };
        triggerAuth(authUser);
        return { user: authUser };
    } else {
        // Fallback for demo: create dynamic session for unknown emails to allow testing
        const dynamicId = 'mock_' + Date.now();
        const authUser = { uid: dynamicId, email };
        triggerAuth(authUser);
        return { user: authUser };
    }
};

createUserWithEmailAndPassword = async (_auth: any, email: string, pass: string) => {
    const uid = 'user_' + Date.now();
    const authUser = { uid, email };
    triggerAuth(authUser);
    return { user: authUser };
};

signOut = async () => {
    triggerAuth(null);
};

// --- Firestore Functions ---

collection = (_db: any, path: string) => ({ type: 'collection', path });

// Robust doc() implementation to match real firebase signature
doc = (arg1: any, arg2?: string, arg3?: string) => {
    let path = '';
    let id = '';

    if (arg1?.type === 'collection') {
        // doc(collectionRef) or doc(collectionRef, id)
        if (arg2) {
            path = `${arg1.path}/${arg2}`;
            id = arg2;
        } else {
            id = 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            path = `${arg1.path}/${id}`;
        }
    } else {
        // doc(db, "collection", "id")
        path = arg3 ? `${arg2}/${arg3}` : arg2 || '';
        id = path.split('/').pop() || '';
    }
    return { type: 'doc', path, id };
};

getDoc = async (ref: any) => {
    const store = getStore();
    const [coll, id] = ref.path.split('/');
    const item = store[coll]?.[id];
    return {
        exists: () => !!item,
        data: () => item,
        id: id
    };
};

// Mock Listeners for Real-time updates
const listeners: Record<string, Set<Function>> = {};
const notifyListeners = (coll: string) => {
    if (listeners[coll]) {
        const store = getStore();
        const docs = Object.values(store[coll] || {}).map((d: any) => ({
            id: d.id,
            data: () => d
        }));
        listeners[coll].forEach(cb => cb({ docs }));
    }
};

setDoc = async (ref: any, data: any, options?: any) => {
    const store = getStore();
    const [coll, id] = ref.path.split('/');
    if (!store[coll]) store[coll] = {};
    
    if (options?.merge && store[coll][id]) {
        store[coll][id] = { ...store[coll][id], ...data };
    } else {
        store[coll][id] = data;
    }
    setStore(store);
    notifyListeners(coll);
};

updateDoc = async (ref: any, data: any) => {
    await setDoc(ref, data, { merge: true });
};

deleteDoc = async (ref: any) => {
    const store = getStore();
    const [coll, id] = ref.path.split('/');
    if (store[coll]) {
        delete store[coll][id];
        setStore(store);
        notifyListeners(coll);
    }
};

addDoc = async (collRef: any, data: any) => {
    const id = 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const path = `${collRef.path}/${id}`;
    await setDoc({ path }, { ...data, id });
    return { id, path };
};

onSnapshot = (ref: any, cb: any) => {
    // Extract collection name. Handles simple queries and collections.
    const path = ref.path || (ref.type === 'query' ? ref.sourceCollection : '');
    const coll = path.split('/')[0];

    if (!listeners[coll]) listeners[coll] = new Set();
    listeners[coll].add(cb);
    
    // Initial callback
    setTimeout(() => notifyListeners(coll), 0);
    
    return () => listeners[coll]?.delete(cb);
};

query = (collRef: any) => ({ ...collRef, type: 'query', sourceCollection: collRef.path });

writeBatch = (_db: any) => {
    const operations: Function[] = [];
    return {
        set: (ref: any, data: any, opts: any) => {
            operations.push(() => setDoc(ref, data, opts));
        },
        update: (ref: any, data: any) => {
            operations.push(() => updateDoc(ref, data));
        },
        delete: (ref: any) => {
            operations.push(() => deleteDoc(ref));
        },
        commit: async () => {
            for (const op of operations) await op();
        }
    }
};

export { 
  auth, db, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, onSnapshot, query, addDoc, writeBatch
};
