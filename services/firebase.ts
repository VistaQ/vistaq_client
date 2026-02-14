
import { apiRequest } from './apiClient';

/**
 * SERVICE ADAPTER
 * This file bridges the existing "Firebase-like" syntax used in the Contexts
 * to the real REST API at https://stg-api.vistaq.co/
 */

// --- AUTHENTICATION ---

const auth = { currentUser: null }; // Placeholder, state managed via AuthContext

// Internal listener storage to simulate Firebase's real-time auth updates
let authStateListeners: Array<(user: any) => void> = [];

const triggerAuthChange = (user: any) => {
    authStateListeners.forEach(cb => cb(user));
};

// 1. Login
const signInWithEmailAndPassword = async (_auth: any, email: string, pass: string) => {
  try {
    // API Call: POST /auth/login
    // Expected response: { user: UserObject, token: string }
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      data: { email, password: pass }
    });

    if (response.token) {
      localStorage.setItem('vistaq_token', response.token);
      localStorage.setItem('vistaq_user', JSON.stringify(response.user));
      
      const authUser = { uid: response.user.id, ...response.user };
      triggerAuthChange(authUser); // Notify listeners immediately

      return { user: authUser };
    }
    throw new Error("No token received");
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
};

// 2. Register
const createUserWithEmailAndPassword = async (_auth: any, email: string, pass: string) => {
  try {
    // API Call: POST /auth/register
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      data: { email, password: pass }
    });
    
    // Auto login on register if API provides token
    if (response.token) {
        localStorage.setItem('vistaq_token', response.token);
        localStorage.setItem('vistaq_user', JSON.stringify(response.user));
        
        const authUser = { uid: response.user.id, ...response.user };
        triggerAuthChange(authUser); // Notify listeners immediately

        return { user: authUser };
    }
    
    // Fallback if no token returned immediately
    return { user: { uid: response.id || 'new_user', email } };
  } catch (error) {
    console.error("Registration Error:", error);
    throw error;
  }
};

// 3. Logout
const signOut = async () => {
  localStorage.removeItem('vistaq_token');
  localStorage.removeItem('vistaq_user');
  triggerAuthChange(null); // Notify listeners
};

// 4. Auth State Listener
const onAuthStateChanged = (_auth: any, callback: (user: any) => void) => {
  const token = localStorage.getItem('vistaq_token');
  const storedUser = localStorage.getItem('vistaq_user');

  // 1. Immediate check on mount
  if (token && storedUser) {
    try {
        const user = JSON.parse(storedUser);
        // Optimistically verify user exists
        callback({ uid: user.id, ...user });
        
        // Verify token validity with API in background
        apiRequest('/users/me')
          .then(data => {
              // The API returns { user: ... } usually
              const freshUser = data.user || data; 
              localStorage.setItem('vistaq_user', JSON.stringify(freshUser));
          })
          .catch((err) => {
              console.warn("Token validation failed, logging out:", err.message);
              // Token invalid - force logout
              localStorage.removeItem('vistaq_token');
              localStorage.removeItem('vistaq_user');
              triggerAuthChange(null);
              callback(null);
          });
    } catch(e) {
        callback(null);
    }
  } else {
    callback(null);
  }

  // 2. Register listener for future updates
  authStateListeners.push(callback);
  
  // 3. Return unsubscribe function
  return () => {
      authStateListeners = authStateListeners.filter(cb => cb !== callback);
  };
};

// --- DATA STORE (FIRESTORE SHIM) ---

const db = { type: 'api_db' };

// Event system to simulate real-time updates when a write happens
const collectionListeners: Record<string, Set<Function>> = {};

const triggerUpdate = (collectionName: string) => {
    if (collectionListeners[collectionName]) {
        collectionListeners[collectionName].forEach(cb => cb());
    }
};

// Collection Reference
const collection = (_db: any, path: string) => ({ type: 'collection', path });

// Doc Reference
const doc = (arg1: any, arg2?: string, arg3?: string) => {
    let path = '';
    let id = '';

    if (arg1?.type === 'collection') {
        if (arg2) {
            path = `${arg1.path}/${arg2}`; // collection/id
            id = arg2;
        } else {
            // New doc without ID yet
            path = arg1.path; 
        }
    } else {
        path = arg3 ? `${arg2}/${arg3}` : arg2 || '';
        id = path.split('/').pop() || '';
    }
    return { type: 'doc', path, id, collectionName: path.split('/')[0] };
};

// Get Single Doc
const getDoc = async (ref: any) => {
    try {
        const data = await apiRequest(`/${ref.path}`);
        // Handle nested response format if necessary (e.g. { user: ... })
        const docData = data.user || data.group || data.prospect || data.event || data;
        
        return {
            exists: () => !!data,
            data: () => docData,
            id: ref.id
        };
    } catch (e) {
        return { exists: () => false, data: () => undefined };
    }
};

// Write: Set/Create (PUT or POST)
const setDoc = async (ref: any, data: any, options?: any) => {
    try {
        const method = ref.id ? 'PUT' : 'POST'; // Assuming PUT for upsert at specific ID
        const endpoint = ref.id ? `/${ref.collectionName}/${ref.id}` : `/${ref.collectionName}`;
        
        await apiRequest(endpoint, {
            method,
            data
        });
        
        triggerUpdate(ref.collectionName);
    } catch (e) {
        console.error("setDoc Error", e);
        throw e;
    }
};

// Write: Update (PATCH)
const updateDoc = async (ref: any, data: any) => {
    try {
        await apiRequest(`/${ref.collectionName}/${ref.id}`, {
            method: 'PATCH',
            data
        });
        triggerUpdate(ref.collectionName);
    } catch (e) {
        console.error("updateDoc Error", e);
        throw e;
    }
};

// Write: Delete (DELETE)
const deleteDoc = async (ref: any) => {
    try {
        await apiRequest(`/${ref.collectionName}/${ref.id}`, {
            method: 'DELETE'
        });
        triggerUpdate(ref.collectionName);
    } catch (e) {
        console.error("deleteDoc Error", e);
        throw e;
    }
};

// Write: Add (POST) -> Returns ref with ID
const addDoc = async (collRef: any, data: any) => {
    try {
        const response = await apiRequest(`/${collRef.path}`, {
            method: 'POST',
            data
        });
        
        triggerUpdate(collRef.path);
        
        // Assume API returns the created object with an ID or generated ID
        const newId = response.id || response.userId || response.prospectId || response.eventId || 'unknown'; 
        return { 
            id: newId, 
            path: `${collRef.path}/${newId}` 
        };
    } catch (e) {
        console.error("addDoc Error", e);
        throw e;
    }
};

/**
 * onSnapshot Shim
 * Since REST APIs don't have built-in sockets, we fetch data immediately 
 * and register a listener that re-fetches whenever the app triggers a local write.
 */
const onSnapshot = (ref: any, callback: any) => {
    const collName = ref.path;

    const fetchData = () => {
        // If no token, skip fetch to avoid 401s on login screen
        if (!localStorage.getItem('vistaq_token')) {
            return; 
        }

        apiRequest(`/${collName}`)
            .then(data => {
                let items: any[] = [];
                
                // CRITICAL FIX: Handle null/undefined data safely
                if (data) {
                    if (Array.isArray(data)) items = data;
                    else if (data.users) items = data.users;
                    else if (data.groups) items = data.groups;
                    else if (data.prospects) items = data.prospects;
                    else if (data.events) items = data.events;
                }
                
                // Format to match Firestore snapshot structure
                const snapshot = {
                    docs: items.map((item: any) => ({
                        id: item.id || 'unknown',
                        data: () => item
                    }))
                };
                callback(snapshot);
            })
            .catch(err => {
                // Log warning instead of error to avoid flooding console if auth/network issue
                // 401s are handled by apiClient now, so this catches other issues
                if (err.message && !err.message.includes('401')) {
                    console.warn(`[Data Sync] Could not fetch ${collName}`, err.message);
                }
            });
    };

    // 1. Initial Fetch
    fetchData();

    // 2. Register listener for local updates
    if (!collectionListeners[collName]) collectionListeners[collName] = new Set();
    collectionListeners[collName].add(fetchData);

    // 3. Return Unsubscribe
    return () => {
        collectionListeners[collName]?.delete(fetchData);
    };
};

const query = (collRef: any) => ({ ...collRef, type: 'query' });

// Batch writes handled sequentially for REST API
const writeBatch = (_db: any) => {
    const operations: Function[] = [];
    return {
        set: (ref: any, data: any, options?: any) => operations.push(() => setDoc(ref, data, options)),
        update: (ref: any, data: any) => operations.push(() => updateDoc(ref, data)),
        delete: (ref: any) => operations.push(() => deleteDoc(ref)),
        commit: async () => {
            // Execute all operations sequentially
            for (const op of operations) await op();
        }
    }
};

export { 
  auth, db, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, onSnapshot, query, addDoc, writeBatch
};
