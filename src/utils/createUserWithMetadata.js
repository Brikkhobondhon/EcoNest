import { supabase } from '../config/supabase';

/**
 * Create a new user with role metadata during hiring process
 * This creates the user with metadata in Supabase Auth and syncs to database
 */
export const createUserWithMetadata = async (userData) => {
  const {
    email,
    password,
    name,
    role_name,
    department_id,
    designation = null,
    mobile_no = null,
    personal_email = null,
    hired_by = 'hr@econest.com'
  } = userData;

  try {
    // Step 1: Get role and department information for metadata
    
    const [roleResult, deptResult] = await Promise.all([
      supabase
        .from('user_roles')
        .select('id, role_name, display_name')
        .eq('role_name', role_name)
        .single(),
      supabase
        .from('departments')
        .select(`
          id,
          name,
          description,
          department_codes!inner (
            code,
            is_active
          )
        `)
        .eq('id', department_id)
        .eq('department_codes.is_active', true)
        .single()
    ]);

    if (roleResult.error) {
      throw new Error(`Failed to fetch role: ${roleResult.error.message}`);
    }

    if (deptResult.error) {
      throw new Error(`Failed to fetch department: ${deptResult.error.message}`);
    }

    const roleData = roleResult.data;
    const deptData = deptResult.data;
    

    
    // Handle both array and single object cases
    let departmentCode;
    if (Array.isArray(deptData.department_codes)) {
      departmentCode = deptData.department_codes?.[0]?.code;
    } else if (deptData.department_codes && typeof deptData.department_codes === 'object') {
      departmentCode = deptData.department_codes.code;
    }


    if (!departmentCode) {
      console.error('HR: No department code found for department:', deptData.name);
      console.error('HR: Available department_codes:', deptData.department_codes);
      console.error('HR: Type of department_codes:', typeof deptData.department_codes);
      console.error('HR: Is array:', Array.isArray(deptData.department_codes));
      throw new Error(
        `Department code not found for department: ${deptData.name}. ` +
        `Please ensure this department has a code assigned in the department_codes table. ` +
        `Contact your system administrator to add a department code for this department.`
      );
    }

    // Step 2: Generate user ID following YYYY-DD-NNNN convention
    const currentYear = new Date().getFullYear();
    
    // Count existing employees in this department to get the next sequence number
    const { data: existingUsers, error: countError } = await supabase
      .from('users')
      .select('user_id')
      .eq('department_id', department_id);
    
    if (countError) {
      console.error('HR: Error counting existing users:', countError);
      throw new Error(`Failed to count existing users: ${countError.message}`);
    }
    
    const nextSequence = (existingUsers?.length || 0) + 1;
    const generatedUserId = `${currentYear}${departmentCode.padStart(2, '0')}${nextSequence.toString().padStart(4, '0')}`;

    // Step 3: Prepare comprehensive metadata
    const userMetadata = {
      role: role_name,
      role_display_name: roleData.display_name,
      role_id: roleData.id,
      department_id: deptData.id,
      department_name: deptData.name,
      department_code: departmentCode,
      name: name,
      designation,
      mobile_no,
      personal_email,
      hired_by,
      hired_at: new Date().toISOString(),
      is_first_login: true,
      source: 'hr_hiring',
      has_metadata: true,
      generated_user_id: generatedUserId
    };

    // Step 3: Create user in Supabase Auth with metadata
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081'}/login`
      }
    });

    if (authError) {
      console.error('HR: Error creating user in auth:', authError);
      throw new Error(`Auth creation failed: ${authError.message}`);
    }

    // Step 5: Create user profile in database
    
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        user_id: generatedUserId,
        email,
        name,
        password, // Required by database schema, though auth handles actual authentication
        role_id: roleData.id,
        department_id: deptData.id,
        designation,
        mobile_no,
        personal_email,
        is_first_login: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('HR: Error creating user profile:', profileError);
      // Note: We can't easily clean up the auth user from client-side
      // The user will still exist in auth but without database profile
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }



    return {
      success: true,
      user: {
        id: authData.user.id,
        user_id: generatedUserId,
        email,
        name,
        role_name,
        department_name: deptData.name,
        department_code: departmentCode,
        metadata: userMetadata
      },
      auth_user: authData.user,
      profile: profileData,
      message: 'User created successfully with metadata'
    };

  } catch (error) {
    console.error('HR: Error in createUserWithMetadata:', error);
    console.error('HR: Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message,
      message: `Failed to create user: ${error.message}`,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint
    };
  }
};

/**
 * Update existing user's role metadata
 */
export const updateUserRole = async (userId, newRole, updatedBy = 'hr') => {
  try {

    
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          role: newRole,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        }
      }
    );
    
    if (error) {
      console.error('Error updating user role:', error);
      return { success: false, error };
    }
    

    return { success: true, user: data.user };
    
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user with metadata
 */
export const getUserWithMetadata = async (userId) => {
  try {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      return { success: false, error };
    }
    
    return {
      success: true,
      user: user,
      metadata: user?.user_metadata,
      hasRole: !!user?.user_metadata?.role
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * List all users with their metadata roles
 */
export const listUsersWithMetadata = async (page = 1, perPage = 50) => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: perPage
    });
    
    if (error) {
      return { success: false, error };
    }
    
    const usersWithRoles = data.users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'no_role',
      full_name: user.user_metadata?.full_name,
      department: user.user_metadata?.department,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      hasMetadata: !!user.user_metadata?.role
    }));
    
    return {
      success: true,
      users: usersWithRoles,
      pagination: {
        page: page,
        perPage: perPage,
        total: data.users.length
      }
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};