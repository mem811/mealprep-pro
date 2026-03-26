import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '../lib/pb';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.model);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = pb.authStore.onChange((token, model) => {
      setUser(model);
    });
    return () => unsub();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      setUser(authData.record);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name) => {
    setLoading(true);
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name.trim(),
        plan: 'free',
      });
      const authData = await pb.collection('users').authWithPassword(email, password);
      setUser(authData.record);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  const isPro = user?.plan === 'pro';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isPro }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);