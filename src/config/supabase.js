import { createClient } from '@supabase/supabase-js';

// Use environment variables for security
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://acdwhigckqxvwsoucfmc.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHdoaWdja3F4dndzb3VjZm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Nzk4MjIsImV4cCI6MjA2NzU1NTgyMn0.CIX6PzYI3KCHogUdEwNFLJY_G0bI_HDulh_W89pVN3c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Clear any existing session on app start
export const clearSession = async () => {
  await supabase.auth.signOut();
};

// Auth helper functions
export const signUp = async (email, password, userData) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData // Additional user metadata
    }
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
}; 