import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [char, setChar] = useState(null);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const u = await api.getUser();
      setUser(u);
      try {
        const c = await api.getMyChar();
        setChar(c);
      } catch { setChar(null); }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const login = async (username, password) => {
    const result = await api.signin(username, password);
    localStorage.setItem('token', result.token);
    setUser({ id: result.id, username: result.username, role: result.role });
    return result;
  };

  const register = async (username, password) => {
    const result = await api.signup(username, password);
    localStorage.setItem('token', result.token);
    setUser({ id: result.id, username: result.username, role: 'player' });
    return result;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setChar(null);
  };

  const refreshChar = async () => {
    try {
      const c = await api.getMyChar();
      setChar(c);
      return c;
    } catch { setChar(null); return null; }
  };

  return (
    <AuthCtx.Provider value={{ user, char, loading, login, register, logout, refreshUser, refreshChar }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
