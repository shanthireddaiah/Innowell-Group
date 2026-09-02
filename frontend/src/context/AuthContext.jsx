import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, getAuthToken, setAuthToken } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const userData = await apiFetch('/auth/me');
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setAuthToken('');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(res.access_token);
    await fetchCurrentUser();
    return res;
  };

  const signup = async (data) => {
    const res = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setAuthToken(res.access_token);
    await fetchCurrentUser();
    return res;
  };

  const logout = () => {
    setAuthToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
