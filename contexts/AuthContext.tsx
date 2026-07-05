import React from 'react';
import { apiFetch, ApiError } from '../services/localApiClient';

export interface AuthUser {
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadCurrentUser = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiFetch<{ user: AuthUser }>('/api/auth/me');
      setUser(payload.user);
    } catch (error) {
      if (error instanceof ApiError && error.status !== 401) {
        console.warn('[Auth] Session check failed, falling back to login screen', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const login = React.useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const payload = await apiFetch<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setUser(payload.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = React.useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
