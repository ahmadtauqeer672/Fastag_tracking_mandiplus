import React, { createContext, useContext, useEffect, useState } from 'react';
import { Api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const token = Api.getToken();
      if (token) {
        try {
          const { user } = await Api.me();
          setUser(user);
        } catch {
          Api.setToken(null);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  async function login(identifier, password) {
    const { token, user } = await Api.login({ identifier, password });
    Api.setToken(token);
    setUser(user);
  }

  async function register(payload) {
    const { token, user } = await Api.register(payload);
    Api.setToken(token);
    setUser(user);
  }

  function logout() {
    Api.setToken(null);
    setUser(null);
  }

  function updateCredits(balance) {
    setUser((u) => (u ? { ...u, credits: balance } : u));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
