import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch user role from metadata (fast) or database (fallback)
  const fetchUserRole = async (userId, userEmail, userObject = null) => {
    try {
      console.log('AuthContext: Fetching user role for:', userId, userEmail);
      
      // Step 1: Try to get role from user metadata first (fastest)
      console.log('AuthContext: Checking user metadata for role...');
      
      let user = userObject;
      
      // Only call getUser() if we don't have the user object already
      if (!user) {
        console.log('AuthContext: No user object provided, fetching from auth...');
        
        // Add timeout for metadata check (reduced for faster response)
        const metadataTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Metadata check timeout after 2 seconds')), 2000)
        );
        
        const metadataPromise = supabase.auth.getUser();
        
        const result = await Promise.race([metadataPromise, metadataTimeoutPromise]);
        user = result.data?.user;
        
        if (result.error) {
          console.log('AuthContext: Error getting user for metadata check:', result.error);
        }
      } else {
        console.log('AuthContext: Using provided user object for metadata check');
      }
      
      console.log('AuthContext: User metadata:', user?.user_metadata);
      
      if (user?.user_metadata?.role) {
        console.log('AuthContext: Found role in metadata:', user.user_metadata.role);
        return user.user_metadata.role;
      }
      
      console.log('AuthContext: No role in metadata, fetching from database...');
      
      // Step 2: Auto-migrate user by fetching from database and updating metadata
      console.log('AuthContext: Auto-migrating user from database to metadata...');
      
      // Get user's role_id from users table with timeout (reduced for faster response)
      const dbTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout after 2 seconds')), 2000)
      );
      
      const dbPromise = supabase
        .from('users')
        .select('role_id')
        .eq('id', userId)
        .single();
      
      const { data: userData, error: userDbError } = await Promise.race([dbPromise, dbTimeoutPromise]);
      
      if (userDbError) {
        console.log('AuthContext: Error fetching user from database:', userDbError.message);
        
        // If user doesn't exist in database, return null (no role assignment)
        if (userDbError.code === 'PGRST116') {
          console.log('AuthContext: User not found in database, no role available');
          return null;
        }
        
        // For other database errors, return null (no role assignment)
        console.log('AuthContext: Database error - no role available');
        return null;
      }
      
      if (!userData?.role_id) {
        console.log('AuthContext: User has no role_id in database, no role available');
        return null;
      }
      
      // Get role name from user_roles table
      console.log('AuthContext: Querying user_roles table for role_id:', userData.role_id);
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role_name, display_name')
        .eq('id', userData.role_id)
        .single();
      
      if (roleError) {
        console.log('AuthContext: Error fetching role from user_roles:', roleError.message);
        return null;
      }
      
      const role = roleData?.role_name;
      
      if (role) {
        console.log('AuthContext: Found role in database:', role);
        console.log('AuthContext: Updating user metadata with database role...');
        
        // Update current user's metadata for future fast access
        await supabase.auth.updateUser({
          data: { 
            role: role,
            role_display_name: roleData.display_name,
            migrated_at: new Date().toISOString(),
            migrated_from_database: true,
            source: 'database'
          }
        });
        
        console.log(`AuthContext: Successfully migrated ${role} role to user metadata`);
        return role;
      }
      
      console.log('AuthContext: No role found in database');
      return null;
      
    } catch (error) {
      console.error('AuthContext: Error in fetchUserRole:', error);
      
      // No fallback role assignment - return null if error occurs
      console.log('AuthContext: Error in role fetching, no role available');
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing auth...');
        
        // Add timeout to prevent infinite loading (reduced for faster response)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout after 3 seconds')), 3000)
        );
        
        const authPromise = supabase.auth.getSession();
        
        const { data: { session }, error } = await Promise.race([authPromise, timeoutPromise]);
        
        if (error) {
          console.log('AuthContext: Error getting session:', error);
          if (mounted) {
            setUser(null);
            setUserRole(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('AuthContext: Found existing session for:', session.user.email);
          
          if (mounted) {
            setUser(session.user);
            
            // Fetch user role
            try {
              const role = await fetchUserRole(session.user.id, session.user.email, session.user);
              setUserRole(role);
            } catch (roleError) {
              console.error('AuthContext: Error fetching role:', roleError);
              setUserRole(null);
            }
            setLoading(false);
          }
        } else {
          console.log('AuthContext: No existing session found');
          if (mounted) {
            setUser(null);
            setUserRole(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.log('AuthContext: Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    };
    
    initializeAuth();

    // Set up periodic email sync check (every 15 minutes when user is active - reduced frequency)
    let syncInterval;
    if (user) {
      syncInterval = setInterval(async () => {
        try {
          await syncEmailWithDatabase();
        } catch (error) {
          console.error('AuthContext: Error in periodic email sync:', error);
        }
      }, 15 * 60 * 1000); // 15 minutes (reduced frequency)
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event, session?.user?.email);

      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        console.log('AuthContext: User signed out');
        setUser(null);
        setUserRole(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          console.log('AuthContext: User signed in:', session.user.email);
          
          // Auto-sync emails in background (non-blocking)
          setTimeout(async () => {
            try {
              await syncEmailWithDatabase(session.user);
            } catch (syncError) {
              console.error('AuthContext: Error during background email sync:', syncError);
            }
          }, 100); // Run in background after 100ms
          
          setUser(session.user);
          
          // Fetch user role
          try {
            console.log('AuthContext: About to fetch user role...');
            const role = await fetchUserRole(session.user.id, session.user.email, session.user);
            console.log('AuthContext: Setting user role to:', role);
            setUserRole(role);
            setLoading(false);
          } catch (error) {
            console.error('AuthContext: Error in fetchUserRole call:', error);
            setUserRole(null);
            setLoading(false);
          }
        }
      }
    });

    return () => {
      mounted = false;
      if (syncInterval) {
        clearInterval(syncInterval);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      console.log('AuthContext: Signing out...');
      
      // Clear state immediately
      setUser(null);
      setUserRole(null);
      setLoading(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthContext: Sign out error:', error);
        throw error;
      }
      
      console.log('AuthContext: Sign out successful');
    } catch (error) {
      console.error('AuthContext: Error in signOut:', error);
      throw error;
    }
  };

  // Auto-sync email between Auth and Database
  const syncEmailWithDatabase = async (authUser = null) => {
    try {
      console.log('AuthContext: Starting email sync check...');
      
      // Get current auth user if not provided
      let currentAuthUser = authUser;
      if (!currentAuthUser) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.log('AuthContext: No auth user found for email sync');
          return false;
        }
        currentAuthUser = user;
      }
      
      console.log('AuthContext: Auth email:', currentAuthUser.email);
      
      // Get database user record
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('email, official_email')
        .eq('id', currentAuthUser.id)
        .single();
      
      if (dbError) {
        console.error('AuthContext: Error fetching database user for email sync:', dbError);
        return false;
      }
      
      if (!dbUser) {
        console.log('AuthContext: No database user found for email sync');
        return false;
      }
      
      console.log('AuthContext: Database email:', dbUser.email);
      console.log('AuthContext: Database official_email:', dbUser.official_email);
      
      // Check for mismatches
      const authEmail = currentAuthUser.email;
      const dbEmail = dbUser.email;
      const dbOfficialEmail = dbUser.official_email;
      
      const emailMismatch = dbEmail !== authEmail;
      const officialEmailMismatch = dbOfficialEmail !== authEmail;
      
      if (!emailMismatch && !officialEmailMismatch) {
        console.log('AuthContext: All emails are in sync, no action needed');
        return true;
      }
      
      console.log('AuthContext: Email mismatch detected!');
      console.log(`AuthContext: Auth email: ${authEmail}`);
      console.log(`AuthContext: DB email: ${dbEmail} ${emailMismatch ? '(MISMATCH)' : '(OK)'}`);
      console.log(`AuthContext: DB official_email: ${dbOfficialEmail} ${officialEmailMismatch ? '(MISMATCH)' : '(OK)'}`);
      
      // Update database to match auth
      const updateData = {};
      if (emailMismatch) {
        updateData.email = authEmail;
        console.log(`AuthContext: Will update email from ${dbEmail} to ${authEmail}`);
      }
      if (officialEmailMismatch) {
        updateData.official_email = authEmail;
        console.log(`AuthContext: Will update official_email from ${dbOfficialEmail} to ${authEmail}`);
      }
      
      updateData.updated_at = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', currentAuthUser.id);
      
      if (updateError) {
        console.error('AuthContext: Error updating database emails:', updateError);
        return false;
      }
      
      console.log('AuthContext: Database emails updated successfully!');
      
      // Also update metadata if it exists
      if (currentAuthUser.user_metadata) {
        try {
          const updatedMetadata = {
            ...currentAuthUser.user_metadata,
            email: authEmail,
            last_synced_at: new Date().toISOString()
          };
          
          await supabase.auth.updateUser({
            data: updatedMetadata
          });
          
          console.log('AuthContext: User metadata updated with synced email');
        } catch (metadataError) {
          console.warn('AuthContext: Failed to update metadata during email sync:', metadataError);
          // Non-critical error, don't fail the sync
        }
      }
      
      // Show notification if this was a significant change
      if (emailMismatch || officialEmailMismatch) {
        Alert.alert(
          'Email Sync Completed! ✅', 
          `Database emails have been synchronized with your authentication email:\n\n${authEmail}\n\nAll records are now consistent.`
        );
      }
      
      return true;
      
    } catch (error) {
      console.error('AuthContext: Error in syncEmailWithDatabase:', error);
      return false;
    }
  };

  const value = {
    user,
    userRole,
    loading,
    signOut,
    syncEmailWithDatabase,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};