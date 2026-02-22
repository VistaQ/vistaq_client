
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, Group, Notification } from '../types';
import { apiCall } from '../services/apiClient';

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
  users: User[];
  refreshCurrentUser: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  addUser: (user: Partial<User>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addGroup: (name: string, leaderId: string, trainerIds: string[], memberIds: string[]) => Promise<void>;
  updateGroup: (groupId: string, name: string, leaderId: string, trainerIds: string[], memberIds: string[]) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  notification: Notification | null;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  closeNotification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ title, message, type });
  };
  const closeNotification = () => setNotification(null);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (token && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (_e) {}

      apiCall('/users/me')
        .then(data => {
          const raw = data.user || data;
          const fresh: User = { ...raw, id: raw.uid || raw.id };
          setCurrentUser(fresh);
          localStorage.setItem('authUser', JSON.stringify(fresh));
        })
        .catch(() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          setCurrentUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch users + groups whenever the current user changes
  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      setGroups([]);
      return;
    }
    fetchUsers();
    fetchGroups();
  }, [currentUser?.id]);

  const fetchUsers = async () => {
    try {
      const data = await apiCall('/users');
      const list: any[] = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : []);
      setUsers(list.map(u => ({ ...u, id: u.uid || u.id, name: u.name || u.email || '' })));
    } catch (_e) {}
  };

  const fetchGroups = async () => {
    try {
      const data = await apiCall('/groups');
      const list = data.groups || data;
      setGroups(Array.isArray(list) ? list : []);
    } catch (_e) {}
  };

  const login = async (identifier: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    const response = await apiCall('/auth/login', {
      method: 'POST',
      data: { email: identifier, password }
    });
    localStorage.setItem('authToken', response.token);

    // Fetch complete user data from /users/me instead of using login response
    // This ensures we have all fields including managedGroupIds
    const meData = await apiCall('/users/me');
    const raw = meData.user || meData;
    const user: User = { ...raw, id: raw.uid || raw.id };
    localStorage.setItem('authUser', JSON.stringify(user));
    setCurrentUser(user);
    return true;
  };

  const register = async (name: string, email: string, password: string, groupId: string, agentCode: string): Promise<boolean> => {
    const response = await apiCall('/auth/register', {
      method: 'POST',
      data: { email, password, fullName: name, agentCode, groupId, acknowledged: true }
    });
    const raw = response.user;
    const user: User = { ...raw, id: raw.uid || raw.id };
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('authUser', JSON.stringify(user));
    setCurrentUser(user);
    setTimeout(() => {
      showNotification(
        "Registration Successful",
        `Welcome to VistaQ, ${name}! Your account has been successfully created. Please login with your Email Address (${email}).`,
        'success'
      );
    }, 500);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setCurrentUser(null);
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      await apiCall('/auth/forgot-password', { method: 'POST', data: { email } });
    } catch (err: any) {
      if (err?.status === 400) throw err;
    }
    showNotification(
      "Reset Email Sent",
      "If an account with that email exists, a password reset link has been sent.",
      'success'
    );
    return true;
  };

  const changePassword = async (newPassword: string) => {
    if (!currentUser) return;
    await apiCall('/users/me/password', { method: 'PATCH', data: { newPassword } });
  };

  const refreshCurrentUser = async () => {
    try {
      const data = await apiCall('/users/me');
      const raw = data.user || data;
      const fresh: User = { ...raw, id: raw.uid || raw.id };
      setCurrentUser(fresh);
      localStorage.setItem('authUser', JSON.stringify(fresh));
    } catch (_e) {}
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    await apiCall(`/users/${currentUser.id}`, { method: 'PUT', data: updates });
    await refreshCurrentUser();
  };

  const getGroupMembers = (groupId: string) =>
    users.filter((u: User) => u.groupId === groupId && u.role === UserRole.AGENT);

  const getUserById = (id: string) => users.find((u: User) => u.id === id);

  // --- ADMIN: USERS ---
  const addUser = async (userData: Partial<User>) => {
    await apiCall('/admin/users', {
      method: 'POST',
      data: { ...userData, role: userData.role || UserRole.AGENT }
    });
    showNotification(
      "User Created Successfully",
      `Account has been created for ${userData.name}.\n\nLogin ID: Email: ${userData.email}\nPassword: ${userData.password}`,
      'success'
    );
    await fetchUsers();
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    await apiCall(`/admin/users/${id}`, { method: 'PUT', data: updates });
    showNotification("User Updated", "User profile has been updated successfully.", "success");
    await fetchUsers();
  };

  const deleteUser = async (id: string) => {
    await apiCall(`/admin/users/${id}`, { method: 'DELETE' });
    showNotification("User Deleted", "The user has been removed from the system.", "info");
    await fetchUsers();
  };

  // --- ADMIN: GROUPS ---
  const addGroup = async (name: string, leaderId: string, trainerIds: string[], memberIds: string[]) => {
    await apiCall('/admin/groups', {
      method: 'POST',
      data: { name, leaderId, trainerIds, memberIds }
    });
    showNotification("Group Created", `Group "${name}" has been created with assigned members.`, "success");
    await fetchGroups();
  };

  const updateGroup = async (groupId: string, name: string, leaderId: string, trainerIds: string[], memberIds: string[]) => {
    await apiCall(`/admin/groups/${groupId}`, {
      method: 'PUT',
      data: { name, leaderId, trainerIds, memberIds }
    });
    showNotification("Group Updated", `Group configuration for "${name}" has been saved.`, "success");
    await fetchGroups();
  };

  const deleteGroup = async (groupId: string) => {
    await apiCall(`/admin/groups/${groupId}`, { method: 'DELETE' });
    showNotification("Group Deleted", "The group has been disbanded.", "info");
    await fetchGroups();
  };

  return (
    <AuthContext.Provider value={{
      currentUser, login, register, logout, changePassword, isAuthenticated: !!currentUser,
      refreshCurrentUser, updateProfile,
      getGroupMembers, groups, getUserById, users,
      addUser, updateUser, deleteUser,
      addGroup, updateGroup, deleteGroup,
      resetPassword,
      notification, showNotification, closeNotification
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
