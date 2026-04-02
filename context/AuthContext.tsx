
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, Notification } from '../types';
import { apiCall, getTenantSlug } from '../services/apiClient';

interface AuthContextType {
  currentUser: User | null;
  login: (identifier: string, password?: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, groupId: string, agentCode: string, location: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  refreshCurrentUser: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  addUser: (user: Partial<User>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addGroup: (name: string, leaderId: string | undefined, trainerIds: string[], memberIds: string[]) => Promise<void>;
  updateGroup: (groupId: string, name: string, leaderId: string | undefined, trainerIds: string[], memberIds: string[]) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  notification: Notification | null;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  closeNotification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (raw: any): User => ({
  ...raw,
  managedGroupIds: raw.managed_group_ids ?? [],
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);

        // Validate token is still valid by fetching fresh user data
        apiCall('/auth/me')
          .then(res => {
            const fresh = normalizeUser(res.data);
            setCurrentUser(fresh);
            localStorage.setItem('authUser', JSON.stringify(fresh));
          })
          .catch(() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            setCurrentUser(null);
          })
          .finally(() => setLoading(false));
      } catch (_e) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier: string, password?: string): Promise<boolean> => {
    if (!password) return false;

    const response = await apiCall('/auth/login', {
      method: 'POST',
      data: { email: identifier, password },
      headers: { 'X-Tenant-Slug': getTenantSlug() }
    });
    const { user: rawUser, token } = response.data;
    localStorage.setItem('authToken', token);
    const user = normalizeUser(rawUser);
    localStorage.setItem('authUser', JSON.stringify(user));
    setCurrentUser(user);
    return true;
  };

  const register = async (name: string, email: string, password: string, groupId: string, agentCode: string, location: string): Promise<boolean> => {
    const response = await apiCall('/auth/register', {
      method: 'POST',
      data: { email, password, fullName: name, agentCode, groupId, location },
      headers: { 'X-Tenant-Slug': getTenantSlug() }
    });
    const { user: rawUser, token } = response.data;
    if (token) {
      localStorage.setItem('authToken', token);
      const user = normalizeUser(rawUser);
      localStorage.setItem('authUser', JSON.stringify(user));
      setCurrentUser(user);
    }
    setTimeout(() => {
      showNotification(
        "Registration Successful",
        `Welcome to VistaQ, ${name}! Your account has been successfully created. Please login with your Email Address (${email}).`,
        'success'
      );
    }, 500);
    return true;
  };

  const logout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (_e) {
      // Still clear local state even if server call fails
    }
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
    if (!currentUser) return;
    try {
      const res = await apiCall('/auth/me');
      const fresh = normalizeUser(res.data);
      setCurrentUser(fresh);
      localStorage.setItem('authUser', JSON.stringify(fresh));
    } catch (e) {
      console.error('[AuthContext] refreshCurrentUser failed:', e);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    await apiCall(`/users/${currentUser.id}`, { method: 'PUT', data: updates });
    await refreshCurrentUser();
  };

  // --- ADMIN: USERS ---
  const addUser = async (userData: Partial<User>) => {
    await apiCall('/users', {
      method: 'POST',
      data: {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role || UserRole.AGENT,
        ...(userData.role === UserRole.AGENT && userData.agent_code ? { agentCode: userData.agent_code } : {}),
      }
    });
    showNotification(
      "User Created Successfully",
      `Account has been created for ${userData.name}.\n\nLogin ID: Email: ${userData.email}\nPassword: ${userData.password}`,
      'success'
    );
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { name, email, role } = updates;
    const payload = { name, email, role };
    await apiCall(`/users/${id}`, { method: 'PUT', data: payload });
    showNotification("User Updated", "User profile has been updated successfully.", "success");
  };

  const deleteUser = async (id: string) => {
    await apiCall(`/users/${id}`, { method: 'DELETE' });
    showNotification("User Deleted", "The user has been removed from the system.", "info");
  };

  // --- ADMIN: GROUPS ---
  const addGroup = async (name: string, leaderId: string | undefined, trainerIds: string[], memberIds: string[]) => {
    await apiCall('/groups', {
      method: 'POST',
      data: {
        name,
        leader_id: leaderId,
        trainer_ids: trainerIds.length > 0 ? trainerIds : undefined,
      }
    });
    showNotification("Group Created", `Group "${name}" has been created.`, "success");
  };

  const updateGroup = async (groupId: string, name: string, leaderId: string | undefined, trainerIds: string[], memberIds: string[]) => {
    await apiCall(`/groups/${groupId}`, {
      method: 'PUT',
      data: {
        name,
        leader_id: leaderId,
        trainer_ids: trainerIds.length > 0 ? trainerIds : undefined,
        member_ids: memberIds.length > 0 ? memberIds : undefined,
      }
    });
    showNotification("Group Updated", `Group configuration for "${name}" has been saved.`, "success");
  };

  const deleteGroup = async (groupId: string) => {
    await apiCall(`/groups/${groupId}`, { method: 'DELETE' });
    showNotification("Group Deleted", "The group has been disbanded.", "info");
  };

  return (
    <AuthContext.Provider value={{
      currentUser, login, register, logout, changePassword, isAuthenticated: !!currentUser,
      refreshCurrentUser, updateProfile,
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
