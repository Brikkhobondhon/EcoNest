import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, onAuthStateChange, clearSession } from '../config/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear any existing session and check auth state
    const initializeAuth = async () => {
      try {
        // Clear any cached session first
        await clearSession();
        
        // Now check if there's a valid user
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.log('Auth error:', error);
          setUser(null);
        } else {
          setUser(user);
        }
      } catch (error) {
        console.log('Error initializing auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('Sign out error:', error);
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 