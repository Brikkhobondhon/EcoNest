import { supabase } from '../config/supabase';

/**
 * Migration script to update existing users with role metadata
 * Run this once to migrate existing users from database roles to auth metadata
 */
export const migrateUserMetadata = async () => {
  try {
    console.log('Starting user metadata migration...');
    
    // Step 1: Get all users from database
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, email, role_id');
    
    if (queryError) {
      console.error('Error fetching users:', queryError);
      return { success: false, error: queryError };
    }
    
    console.log(`Found ${users.length} users to migrate`);
    
    // Step 2: Update each user's auth metadata
    const results = [];
    
    for (const user of users) {
      try {
        // Get role name from user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role_name, display_name')
          .eq('id', user.role_id)
          .single();
        
        if (roleError) {
          console.log(`No role found for user ${user.email}, defaulting to employee`);
          // Default to employee if no role found
          roleData = { role_name: 'employee', display_name: 'Employee' };
        }
        
        console.log(`Migrating user: ${user.email} with role: ${roleData.role_name}`);
        
        // Update user metadata in Supabase Auth
        const { data: authUser, error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              role: roleData.role_name,
              role_display_name: roleData.display_name,
              migrated_at: new Date().toISOString(),
              migrated_from_database: true
            }
          }
        );
        
        if (updateError) {
          console.error(`Error updating user ${user.email}:`, updateError);
          results.push({
            email: user.email,
            success: false,
            error: updateError.message
          });
        } else {
          console.log(`Successfully migrated user: ${user.email}`);
          results.push({
            email: user.email,
            success: true,
            role: roleData.role_name
          });
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        results.push({
          email: user.email,
          success: false,
          error: error.message
        });
      }
    }
    
    // Step 3: Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Migration completed: ${successful} successful, ${failed} failed`);
    
    return {
      success: true,
      results,
      summary: {
        total: users.length,
        successful,
        failed
      }
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Utility function to check if a user has metadata
 */
export const checkUserMetadata = async (userId) => {
  try {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    
    return {
      hasMetadata: !!user?.user_metadata?.role,
      metadata: user?.user_metadata,
      email: user?.email
    };
  } catch (error) {
    console.error('Error checking user metadata:', error);
    return null;
  }
};

/**
 * Function to update a single user's metadata
 */
export const updateUserMetadata = async (userId, role, additionalData = {}) => {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          role: role,
          updated_at: new Date().toISOString(),
          ...additionalData
        }
      }
    );
    
    if (error) {
      console.error('Error updating user metadata:', error);
      return { success: false, error };
    }
    
    console.log('User metadata updated successfully');
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Error in updateUserMetadata:', error);
    return { success: false, error: error.message };
  }
};