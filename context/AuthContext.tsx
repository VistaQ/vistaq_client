
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, Group } from '../types';
import { 
  auth, 
  db,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot
} from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  login: (identifier: string, password?: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, groupId: string, agentCode: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  getGroupMembers: (groupId: string) => User[];
  groups: Group[];
  getUserById: (id: string) => User | undefined;
  users: User[]; // Exposed for Admin
  addUser: (user: Partial<User>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  // Group Management
  addGroup: (name: string, leaderId: string, trainerIds: string[], agentIds: string[]) => Promise<void>;
  updateGroup: (groupId: string, name: string, leaderId: string, trainerIds: string[], agentIds: string[]) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        // Fetch extended profile from Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setCurrentUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
        } else {
          // Fallback if doc doesn't exist yet (rare race condition on register)
          setCurrentUser(null); 
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 2. Real-time Listeners for Users and Groups (Sync State)
  useEffect(() => {
    // Listen to Users
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot: any) => {
      const loadedUsers = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(loadedUsers);
      
      // Update current user state if their profile changes in background
      if (auth.currentUser) {
        const me = loadedUsers.find(u => u.id === auth.currentUser?.uid);
        if (me) setCurrentUser(me);
      }
    });

    // Listen to Groups
    const unsubGroups = onSnapshot(collection(db, "groups"), (snapshot: any) => {
      const loadedGroups = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      setGroups(loadedGroups);
    });

    return () => {
      unsubUsers();
      unsubGroups();
    };
  }, []);

  const login = async (identifier: string, password?: string): Promise<boolean> => {
    try {
      if (!password) return false;
      
      let email = identifier;
      
      // Check if identifier looks like an email, if not, try to find user by Agent Code
      if (!identifier.includes('@')) {
          const userByCode = users.find(u => u.agentCode === identifier);
          if (userByCode) {
              email = userByCode.email;
          } else {
              // If agent code not found, let firebase handle it (likely fail) or return false
              console.warn("Agent Code not found locally, attempting login with input as-is...");
          }
      }

      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string, groupId: string, agentCode: string): Promise<boolean> => {
     try {
       // 1. Create Auth User
       const res = await createUserWithEmailAndPassword(auth, email, password);
       
       // 2. Create Firestore Profile
       const newUser: User = {
         id: res.user.uid,
         name,
         email,
         role: UserRole.AGENT, // Default role
         groupId,
         agentCode, // Agent Code
         avatarUrl: '',
         password: password // Storing password only for mock demo purposes (reset functionality)
       };

       await setDoc(doc(db, "users", res.user.uid), newUser);
       
       // 3. Send Welcome Email (Simulated)
       setTimeout(() => {
           alert(`Welcome Email Sent to ${email}:\n\n"Welcome to VistaQ, ${name}! Your account has been successfully created. Please login with your Agent Code (${agentCode}) or Email."`);
       }, 500);

       return true;
     } catch (error) {
       console.error("Registration failed:", error);
       return false;
     }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
      // Simulate API Call
      return new Promise((resolve) => {
          setTimeout(() => {
              // In a real app, sendPasswordResetEmail(auth, email);
              alert(`Password Recovery Email Sent to ${email}:\n\n"Click the link below to reset your password..."`);
              resolve(true);
          }, 1000);
      });
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const changePassword = async (newPassword: string) => {
      if (!currentUser) return;
      // In a real app, this would use updatePassword(auth.currentUser, newPassword)
      // For this mock, we update the user doc
      await updateDoc(doc(db, "users", currentUser.id), { password: newPassword });
  };

  const getGroupMembers = (groupId: string) => {
    return users.filter(u => u.groupId === groupId && u.role === UserRole.AGENT);
  };

  const getUserById = (id: string) => users.find(u => u.id === id);

  // --- ADMIN FUNCTIONS (Updating Firestore) ---
  const addUser = async (userData: Partial<User>) => {
    // Generates a placeholder ID if not provided
    const newId = userData.id || `user_${Date.now()}`;
    const newRef = doc(db, "users", newId); 
    
    await setDoc(newRef, {
      ...userData,
      id: newId,
      role: userData.role || UserRole.AGENT
    });
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const userRef = doc(db, "users", id);
    await updateDoc(userRef, updates);
  };

  const deleteUser = async (id: string) => {
    await deleteDoc(doc(db, "users", id));
  };

  // --- GROUP MANAGEMENT ---
  const addGroup = async (name: string, leaderId: string, trainerIds: string[], agentIds: string[]) => {
    const groupRef = doc(collection(db, "groups"));
    const groupId = groupRef.id;

    // 1. Create Group
    await setDoc(groupRef, { id: groupId, name, leaderId });

    // 2. Update Leader
    if (leaderId) {
      await updateDoc(doc(db, "users", leaderId), { groupId, role: UserRole.GROUP_LEADER });
    }

    // 3. Update Trainers (Handle multiple)
    // Loop all trainers in the system to ensure correct state (though for new group, mostly adding)
    const allTrainers = users.filter(u => u.role === UserRole.TRAINER);
    const trainerPromises = allTrainers.map(trainer => {
        const shouldHaveAccess = trainerIds.includes(trainer.id);
        const currentManaged = trainer.managedGroupIds || [];
        
        if (shouldHaveAccess && !currentManaged.includes(groupId)) {
            return updateDoc(doc(db, "users", trainer.id), { managedGroupIds: [...currentManaged, groupId] });
        }
        return Promise.resolve();
    });
    await Promise.all(trainerPromises);

    // 4. Update Agents
    const batchPromises = agentIds.map(agentId => 
      updateDoc(doc(db, "users", agentId), { groupId, role: UserRole.AGENT })
    );
    await Promise.all(batchPromises);
  };

  const updateGroup = async (groupId: string, name: string, leaderId: string, trainerIds: string[], agentIds: string[]) => {
    // 1. Update Group Meta
    await updateDoc(doc(db, "groups", groupId), { name, leaderId });

    // 2. Update Leader
    if (leaderId) {
      await updateDoc(doc(db, "users", leaderId), { groupId, role: UserRole.GROUP_LEADER });
    }

    // 3. Update Trainers (Handle Multiple: Add to selected, Remove from unselected)
    const allTrainers = users.filter(u => u.role === UserRole.TRAINER);
    const trainerPromises = allTrainers.map(trainer => {
        const shouldHaveAccess = trainerIds.includes(trainer.id);
        const currentManaged = trainer.managedGroupIds || [];
        const hasAccess = currentManaged.includes(groupId);

        if (shouldHaveAccess && !hasAccess) {
            // Add group
            return updateDoc(doc(db, "users", trainer.id), { managedGroupIds: [...currentManaged, groupId] });
        } else if (!shouldHaveAccess && hasAccess) {
            // Remove group
            return updateDoc(doc(db, "users", trainer.id), { managedGroupIds: currentManaged.filter(id => id !== groupId) });
        }
        return Promise.resolve();
    });
    await Promise.all(trainerPromises);

    // 4. Update Agents (Handle Add, Move, Remove)
    const agentPromises: Promise<void>[] = [];

    // 4a. Remove agents who are currently in this group but NOT in the new agentIds list
    const currentGroupMembers = users.filter(u => u.groupId === groupId && u.role === UserRole.AGENT);
    currentGroupMembers.forEach(user => {
        if (!agentIds.includes(user.id)) {
            // Unassign group
            agentPromises.push(updateDoc(doc(db, "users", user.id), { groupId: '' }));
        }
    });

    // 4b. Assign the selected agents to this group
    agentIds.forEach(agentId => {
        agentPromises.push(updateDoc(doc(db, "users", agentId), { groupId, role: UserRole.AGENT }));
    });

    await Promise.all(agentPromises);
  };

  const deleteGroup = async (groupId: string) => {
     await deleteDoc(doc(db, "groups", groupId));
     // Optional: Cleanup users' groupIds, but strict cleanup handled by manual updates for now
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, login, register, logout, changePassword, isAuthenticated: !!currentUser,
      getGroupMembers, groups, getUserById, users,
      addUser, updateUser, deleteUser,
      addGroup, updateGroup, deleteGroup,
      resetPassword
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
