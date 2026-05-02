import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '../lib/pb';

const AuthContext = createContext(null);

// Helper to safely get current user record (works on both old and new SDK versions)
const getCurrentUser = () => pb.authStore.record ?? pb.authStore.model ?? null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      setUser(getCurrentUser());
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      setUser(authData?.record ?? null);
      return { error: null, user: authData?.record ?? null };
    } catch (error) {
      console.error('Login error:', error);
      return { error, user: null };
    }
  };

  const register = async (email, password, name) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name.trim(),
        plan: 'free',
      });
      return await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      return { error, user: null };
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isPro: user?.plan === 'pro',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
