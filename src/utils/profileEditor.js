import { supabase } from '../config/supabase';

/**
 * Common profile editing functionality with role-based access control
 */
export class ProfileEditor {
  /**
   * Get the allowed fields for editing based on user role
   * @param {string} userRole - The role of the current user (admin, employee, hr, manager)
   * @param {boolean} isOwnProfile - Whether the user is editing their own profile
   * @returns {Object} - Object containing allowed fields for editing
   */
  static getAllowedFields(userRole, isOwnProfile = false) {
    const commonFields = {
      // Basic Information
      name: true,
      mobile_no: true,
      secondary_mobile_no: true,
      personal_email: true,
      official_email: true,
      
      // Personal Information
      date_of_birth: true,
      nationality: true,
      nid_no: true,
      passport_no: true,
      current_address: true,
      photo_url: true,
    };

    const adminOnlyFields = {
      designation: true,
      department_id: true,
      role_id: true,
      user_id: true,
      email: true, // Official system email
      is_first_login: true,
    };

    const hrFields = {
      designation: true,
      department_id: true,
      // HR can't change roles or system email
    };

    switch (userRole) {
      case 'admin':
        return { ...commonFields, ...adminOnlyFields };
      
      case 'hr':
        return isOwnProfile ? commonFields : { ...commonFields, ...hrFields };
      
      case 'manager':
        return isOwnProfile ? commonFields : {
          // Managers can edit basic info of their team members
          name: true,
          mobile_no: true,
          secondary_mobile_no: true,
          current_address: true,
        };
      
      case 'employee':
      default:
        return isOwnProfile ? commonFields : {}; // Employees can only edit their own profile
    }
  }

  /**
   * Validate if user has permission to edit a specific field
   * @param {string} fieldName - The field to check
   * @param {string} userRole - The role of the current user
   * @param {boolean} isOwnProfile - Whether the user is editing their own profile
   * @returns {boolean} - Whether the user can edit this field
   */
  static canEditField(fieldName, userRole, isOwnProfile = false) {
    const allowedFields = this.getAllowedFields(userRole, isOwnProfile);
    return allowedFields[fieldName] === true;
  }

  /**
   * Filter the update data based on user permissions
   * @param {Object} updateData - The data to be updated
   * @param {string} userRole - The role of the current user
   * @param {boolean} isOwnProfile - Whether the user is editing their own profile
   * @returns {Object} - Filtered update data
   */
  static filterUpdateData(updateData, userRole, isOwnProfile = false) {
    const allowedFields = this.getAllowedFields(userRole, isOwnProfile);
    const filteredData = {};

    // Only include fields that the user is allowed to edit
    Object.keys(updateData).forEach(key => {
      if (allowedFields[key] === true) {
        let value = updateData[key];
        
        // Handle string fields - trim and convert empty strings to null
        if (typeof value === 'string') {
          value = value.trim();
          if (value === '') {
            value = null;
          }
        }
        
        filteredData[key] = value;
      }
    });

    // Always include updated_at timestamp
    filteredData.updated_at = new Date().toISOString();

    return filteredData;
  }

  /**
   * Validate required fields based on user role
   * @param {Object} profileData - The profile data to validate
   * @param {string} userRole - The role of the current user
   * @returns {Object} - Validation result with isValid boolean and errors array
   */
  static validateProfileData(profileData, userRole) {
    const errors = [];
    
    // Basic validation - name is always required
    if (!profileData.name || !profileData.name.trim()) {
      errors.push('Name is required');
    }

    // Email validation if user can edit email
    if (this.canEditField('email', userRole)) {
      if (profileData.email && !this.isValidEmail(profileData.email)) {
        errors.push('Please enter a valid email address');
      }
    }

    // Personal email validation
    if (profileData.personal_email && !this.isValidEmail(profileData.personal_email)) {
      errors.push('Please enter a valid personal email address');
    }

    // Official email validation
    if (profileData.official_email && !this.isValidEmail(profileData.official_email)) {
      errors.push('Please enter a valid official email address');
    }

    // Mobile number validation
    if (profileData.mobile_no && profileData.mobile_no.trim() !== '') {
      if (!this.isValidMobile(profileData.mobile_no)) {
        errors.push('Please enter a valid mobile number (minimum 7 digits)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Email validation helper
   * @param {string} email - Email to validate
   * @returns {boolean} - Whether email is valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Mobile number validation helper
   * @param {string} mobile - Mobile number to validate
   * @returns {boolean} - Whether mobile number is valid
   */
  static isValidMobile(mobile) {
    // Allow empty/null values - they are optional
    if (!mobile || mobile.trim() === '') {
      return true;
    }
    
    // More flexible mobile number validation
    // Allow digits, plus signs, hyphens, spaces, parentheses, and dots
    // Length should be between 7-20 characters to accommodate international formats
    const mobileRegex = /^[0-9+\-\s()\.]{7,20}$/;
    const trimmedMobile = mobile.trim();
    
    // Check if the mobile number has at least 7 digits (minimum for any valid phone number)
    const digitCount = (trimmedMobile.match(/\d/g) || []).length;
    if (digitCount < 7) {
      return false;
    }
    
    return mobileRegex.test(trimmedMobile);
  }

  /**
   * Save profile with role-based access control
   * @param {Object} params - Parameters object
   * @param {Object} params.originalProfile - The original profile data
   * @param {Object} params.editedProfile - The edited profile data
   * @param {string} params.currentUserRole - The role of the current user
   * @param {boolean} params.isOwnProfile - Whether the user is editing their own profile
   * @param {Function} params.onSuccess - Success callback function
   * @param {Function} params.onError - Error callback function
   * @returns {Promise<Object>} - Result object with success status and data
   */
  static async saveProfile({
    originalProfile,
    editedProfile,
    currentUserRole,
    isOwnProfile = false,
    onSuccess,
    onError
  }) {
    try {
      // Validate required fields
      const validation = this.validateProfileData(editedProfile, currentUserRole);
      if (!validation.isValid) {
        const errorMessage = validation.errors.join(', ');
        // Don't show Alert.alert here, let the component handle the error display
        onError && onError(new Error(errorMessage));
        return { success: false, error: errorMessage };
      }

      // Prepare update data with role-based filtering
      const updateData = this.filterUpdateData(editedProfile, currentUserRole, isOwnProfile);

      console.log('=== PROFILE SAVE DEBUG ===');
      console.log('Original profile:', originalProfile);
      console.log('Edited profile:', editedProfile);
      console.log('Filtered update data:', updateData);
      console.log('User role:', currentUserRole);
      console.log('Is own profile:', isOwnProfile);

      // Special handling for role_id updates
      if (updateData.role_id) {
        console.log('Role ID being updated:', updateData.role_id);
        
        // Validate that the role_id exists in user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('id, role_name, display_name')
          .eq('id', updateData.role_id)
          .eq('is_active', true)
          .single();
        
        if (roleError || !roleData) {
          console.error('Invalid role_id:', updateData.role_id, 'Error:', roleError);
          const errorMessage = 'Selected role is not valid or has been deactivated';
          onError && onError(new Error(errorMessage));
          return { success: false, error: errorMessage };
        }
        
        console.log('Role validation successful:', roleData);
      }

      // Special handling for department_id updates
      if (updateData.department_id) {
        console.log('Department ID being updated:', updateData.department_id);
        
        // Validate that the department_id exists in departments table
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('id, name, description')
          .eq('id', updateData.department_id)
          .single();
        
        if (deptError || !deptData) {
          console.error('Invalid department_id:', updateData.department_id, 'Error:', deptError);
          const errorMessage = 'Selected department is not valid or has been removed';
          onError && onError(new Error(errorMessage));
          return { success: false, error: errorMessage };
        }
        
        console.log('Department validation successful:', deptData);
      }

      // Try multiple update strategies to ensure save works
      let result = null;
      let updateMethod = '';

      // Strategy 1: Update by id (most reliable - using UUID primary key)
      if (originalProfile.id) {
        console.log('Attempting update by id:', originalProfile.id);
        result = await supabase
          .from('users')
          .update(updateData)
          .eq('id', originalProfile.id)
          .select();
        updateMethod = 'id';
      }

      // Strategy 2: Update by email if id fails
      if (result?.error && originalProfile.email) {
        console.log('ID update failed, trying email:', originalProfile.email);
        result = await supabase
          .from('users')
          .update(updateData)
          .eq('email', originalProfile.email)
          .select();
        updateMethod = 'email';
      }

      // Strategy 3: Update by user_id if previous methods fail
      if (result?.error && originalProfile.user_id) {
        console.log('Previous updates failed, trying user_id:', originalProfile.user_id);
        result = await supabase
          .from('users')
          .update(updateData)
          .eq('user_id', originalProfile.user_id)
          .select();
        updateMethod = 'user_id';
      }

      console.log(`Update result (${updateMethod}):`, result);

      if (result?.error) {
        console.error('All update methods failed:', result.error);
        
        // Try the custom SQL function as last resort
        console.log('Attempting custom SQL function update...');
        const { data: sqlResult, error: sqlError } = await supabase.rpc('update_user_profile', {
          user_email: originalProfile.email,
          profile_data: updateData
        });
        
        if (sqlError) {
          console.error('SQL function also failed:', sqlError);
          const errorMessage = `Failed to update profile: ${result.error.message}`;
          // Alert.alert('Error', errorMessage); // Removed Alert import
          onError && onError(new Error(errorMessage));
          return { success: false, error: errorMessage };
        } else {
          console.log('SQL function succeeded:', sqlResult);
          if (sqlResult.success) {
            result = { data: [sqlResult.data], error: null };
          } else {
            const errorMessage = `SQL function failed: ${sqlResult.error}`;
            // Alert.alert('Error', errorMessage); // Removed Alert import
            onError && onError(new Error(errorMessage));
            return { success: false, error: errorMessage };
          }
        }
      }

      if (result?.data && result.data.length > 0) {
        console.log('Profile updated successfully:', result.data[0]);
        
        // If role was updated, fetch the role name for display
        let updatedProfile = { ...originalProfile, ...updateData };
        
        if (updateData.role_id) {
          try {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role_name, display_name')
              .eq('id', updateData.role_id)
              .single();
            
            if (roleData) {
              updatedProfile.role_name = roleData.role_name;
              updatedProfile.role_display_name = roleData.display_name;
              console.log('Updated profile with role info:', updatedProfile);
            }
          } catch (roleError) {
            console.warn('Could not fetch role name for updated profile:', roleError);
          }
        }

        // If department was updated, fetch the department name for display
        if (updateData.department_id) {
          try {
            const { data: deptData } = await supabase
              .from('departments')
              .select('name, description')
              .eq('id', updateData.department_id)
              .single();
            
            if (deptData) {
              updatedProfile.department_name = deptData.name;
              updatedProfile.department_description = deptData.description;
              console.log('Updated profile with department info:', updatedProfile);
            }
          } catch (deptError) {
            console.warn('Could not fetch department name for updated profile:', deptError);
          }
        }
        
        // Alert.alert('Success', 'Profile updated successfully!'); // Removed Alert import
        onSuccess && onSuccess(updatedProfile);
        
        console.log('=== PROFILE SAVE SUCCESS ===');
        return { 
          success: true, 
          data: updatedProfile,
          updatedFields: Object.keys(updateData)
        };
        
      } else {
        console.warn('No data returned from update operation');
        const warningMessage = 'Update may have failed. Please refresh to check if changes were saved.';
        // Alert.alert('Warning', warningMessage); // Removed Alert import
        onError && onError(new Error(warningMessage));
        return { success: false, error: warningMessage };
      }
    } catch (error) {
      console.error('Error in saveProfile:', error);
      const errorMessage = `Failed to update profile: ${error.message}`;
      // Alert.alert('Error', errorMessage); // Removed Alert import
      onError && onError(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get user-friendly field names for UI
   * @returns {Object} - Mapping of field names to display names
   */
  static getFieldDisplayNames() {
    return {
      name: 'Full Name',
      designation: 'Designation',
      department_id: 'Department',
      mobile_no: 'Mobile Number',
      secondary_mobile_no: 'Secondary Mobile',
      personal_email: 'Personal Email',
      official_email: 'Official Email',
      date_of_birth: 'Date of Birth',
      nationality: 'Nationality',
      nid_no: 'NID Number',
      passport_no: 'Passport Number',
      current_address: 'Current Address',
      photo_url: 'Profile Picture',
      role_id: 'Role',
      user_id: 'User ID',
      email: 'System Email',
      is_first_login: 'First Login Status'
    };
  }

  /**
   * Get role-based instructions for users
   * @param {string} userRole - The role of the current user
   * @param {boolean} isOwnProfile - Whether the user is editing their own profile
   * @returns {string} - Instructions for the user
   */
  static getEditingInstructions(userRole, isOwnProfile = false) {
    const instructions = {
      admin: isOwnProfile 
        ? "As an admin, you can edit all fields of your profile."
        : "As an admin, you can edit all fields including designation, department, and role.",
      hr: isOwnProfile
        ? "As HR, you can edit all your personal information."
        : "As HR, you can edit employee information except for roles and system email.",
      manager: isOwnProfile
        ? "As a manager, you can edit all your personal information."
        : "As a manager, you can edit basic information of your team members.",
      employee: isOwnProfile
        ? "You can edit your personal information, but not your role or designation."
        : "You can only edit your own profile."
    };

    return instructions[userRole] || instructions.employee;
  }
}

export default ProfileEditor; 