import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '../lib/pb';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.model);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sync user state with PocketBase auth store
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      // setUser is handled by the onChange listener, but we set it here for immediate feedback if needed
      setUser(authData.record);
      return { error: null, user: authData.record };
    } catch (error) {
      console.error('Login error:', error);
      return { error, user: null };
    }
  };

  const register = async (email, password, name) => {
    try {
      // 1. Create the user record
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name.trim(),
        plan: 'free',
      });
      
      // 2. Log them in immediately
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      isPro: user?.plan === 'pro' 
    }}>
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