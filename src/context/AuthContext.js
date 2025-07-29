import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, onAuthStateChange, clearSession } from '../config/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to check current auth state
  const checkAuthState = async () => {
    try {
      console.log('AuthContext: Checking auth state...');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.log('AuthContext: Auth error:', error);
        setUser(null);
      } else {
        console.log('AuthContext: User found:', user?.email);
        setUser(user);
      }
    } catch (error) {
      console.log('AuthContext: Error checking auth state:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check auth state without clearing session
    const initializeAuth = async () => {
      await checkAuthState();
      
      // Check if user just confirmed email change
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        // Check if the URL contains email confirmation parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hasEmailConfirmation = urlParams.get('type') === 'email_change';
        
        if (hasEmailConfirmation) {
          console.log('AuthContext: Detected email confirmation, updating database...');
          await handleEmailConfirmation();
        }
      }
    };
    
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('AuthContext: Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_OUT') {
        console.log('AuthContext: User signed out, clearing state');
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        console.log('AuthContext: User signed in:', session?.user?.email);
        setUser(session?.user ?? null);
        setLoading(false);
      } else if (event === 'USER_UPDATED') {
        console.log('AuthContext: User updated:', session?.user?.email);
        setUser(session?.user ?? null);
        setLoading(false);
        // Force refresh the user data to ensure consistency
        setTimeout(() => {
          checkAuthState();
        }, 1000);
      } else {
        // Handle other events (TOKEN_REFRESHED, etc.)
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to handle email confirmation and update database
  const handleEmailConfirmation = async () => {
    try {
      console.log('AuthContext: Handling email confirmation...');
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('AuthContext: Error getting user after email confirmation:', error);
        return;
      }
      
      if (currentUser) {
        console.log('AuthContext: User after email confirmation:', currentUser.email);
        
        // Update the users table with the new email
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            email: currentUser.email,
            official_email: currentUser.email,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id);
        
        if (updateError) {
          console.error('AuthContext: Error updating database:', updateError);
        } else {
          console.log('AuthContext: Database updated successfully');
        }
        
        // Refresh auth state
        await checkAuthState();
      }
    } catch (error) {
      console.error('AuthContext: Error in handleEmailConfirmation:', error);
    }
  };

  // Function to check current email in database
  const checkCurrentEmail = async () => {
    try {
      console.log('AuthContext: Checking current email in database...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        // Check what's in the users table
        const { data: userData, error } = await supabase
          .from('users')
          .select('email, official_email')
          .eq('id', currentUser.id)
          .single();
        
        if (error) {
          console.error('AuthContext: Error checking database email:', error);
        } else {
          console.log('AuthContext: Database email:', userData);
          console.log('AuthContext: Auth email:', currentUser.email);
          console.log('AuthContext: Email match:', userData.email === currentUser.email);
        }
      }
    } catch (error) {
      console.error('AuthContext: Error in checkCurrentEmail:', error);
    }
  };

  const value = {
    user,
    loading,
    signOut: async () => {
      try {
        console.log('AuthContext: Attempting to sign out...');
        setLoading(true); // Set loading during logout
        
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('AuthContext: Sign out error:', error);
          setLoading(false);
          throw error;
        } else {
          console.log('AuthContext: Sign out successful');
          // Force check auth state after logout
          await checkAuthState();
        }
      } catch (error) {
        console.error('AuthContext: Error in signOut:', error);
        setLoading(false);
        throw error;
      }
    },
    // Add a function to force refresh auth state
    refreshAuthState: checkAuthState,
    // Add function to handle email confirmation
    handleEmailConfirmation,
    // Add function to check current email
    checkCurrentEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 