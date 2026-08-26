import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../services/api';

const AuthContext = createContext(null);

export const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => localStorage.getItem('dpa_token') || localStorage.getItem('token'));
  const [user, setUserState] = useState(() => {
    try {
      const stored = localStorage.getItem('user_profile');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    const currentToken = localStorage.getItem('dpa_token') || localStorage.getItem('token');
    return currentToken ? parseJwt(currentToken) : null;
  });
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((newUser) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('user_profile', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user_profile');
    }
  }, []);

  const setToken = useCallback((newToken) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('dpa_token', newToken);
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('dpa_token');
      localStorage.removeItem('token');
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('stagedEdits');
  }, [setToken, setUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [logout]);

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      if (token) {
        try {
          const res = await API.auth.getMe();
          if (isMounted && res.success && res.data) {
            setUser(res.data);
          }
        } catch (err) {
          console.warn('Profile hydration failed (using cached session):', err.message);
        }
      }
      if (isMounted) setLoading(false);
    };

    hydrate();
    return () => { isMounted = false; };
  }, [token, setUser]);

  const login = async (email, password) => {
    const res = await API.auth.login(email, password);
    const newToken = res.token || (res.data && res.data.token);
    const newUser = res.user || (res.data && res.data.user);

    if (newToken) {
      setToken(newToken);
      if (newUser) setUser(newUser);
    }
    return res;
  };

  const register = async (payload) => {
    const res = await API.auth.register(payload);
    const newToken = res.token || (res.data && res.data.token);
    const newUser = res.user || (res.data && res.data.user);

    if (newToken) {
      setToken(newToken);
      if (newUser) setUser(newUser);
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
