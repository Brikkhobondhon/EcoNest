import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { ProfileEditor } from '../utils/profileEditor';
import { supabase } from '../config/supabase';

/**
 * Reusable form component for profile editing with role-based access control
 */
export const ProfileForm = forwardRef(({ 
  profile, 
  editedProfile, 
  onInputChange, 
  userRole, 
  isOwnProfile = false,
  editing = false,
  style = {},
  onValidationError = null
}, ref) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'warning' });
  const [roleOptions, setRoleOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Function to show toast notifications
  const showToast = (message, type = 'warning') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'warning' });
    }, 4000);
  };

  // Fetch available roles from database
  useEffect(() => {
    if (editing && userRole === 'admin') {
      fetchRoles();
    }
  }, [editing, userRole]);

  // Fetch available departments from database
  useEffect(() => {
    if (editing && (userRole === 'admin' || userRole === 'hr')) {
      fetchDepartments();
    }
  }, [editing, userRole]);

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      console.log('Fetching roles from database...');
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, role_name, display_name')
        .eq('is_active', true)
        .order('display_name');
      
      if (error) {
        console.error('Error fetching roles:', error);
        showToast('Failed to load roles', 'error');
        return;
      }
      
      console.log('Fetched roles:', data);
      
      // Transform the data to match the dropdown format
      const transformedRoles = data.map(role => ({
        value: role.id, // Use UUID as value
        label: role.display_name || role.role_name, // Use display_name or fallback to role_name
        role_name: role.role_name // Keep original role_name for reference
      }));
      
      setRoleOptions(transformedRoles);
      console.log('Transformed role options:', transformedRoles);
      
    } catch (error) {
      console.error('Error in fetchRoles:', error);
      showToast('Failed to load roles', 'error');
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      console.log('Fetching departments from database...');
      
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description')
        .order('name');
      
      if (error) {
        console.error('Error fetching departments:', error);
        showToast('Failed to load departments', 'error');
        return;
      }
      
      console.log('Fetched departments:', data);
      
      // Transform the data to match the dropdown format
      const transformedDepartments = data.map(dept => ({
        value: dept.id, // Use UUID as value
        label: dept.name, // Use department name as label
        description: dept.description // Keep description for reference
      }));
      
      setDepartmentOptions(transformedDepartments);
      console.log('Transformed department options:', transformedDepartments);
      
    } catch (error) {
      console.error('Error in fetchDepartments:', error);
      showToast('Failed to load departments', 'error');
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Function to validate date format
  const validateDateFormat = (dateString) => {
    if (!dateString || dateString.trim() === '') return true; // Empty is valid
    
    // Check if it matches YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    
    // Check if it's a valid date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return false;
    }
    
    // Check if the date is not in the future
    const today = new Date();
    if (date > today) {
      return false;
    }
    
    return true;
  };

  // Handle date input change (no validation during typing)
  const handleDateChange = (field, value) => {
    onInputChange(field, value);
  };

  // Function to validate all form data before save
  const validateFormData = () => {
    const dateOfBirth = editedProfile.date_of_birth;
    
    if (dateOfBirth && dateOfBirth.trim() !== '') {
      if (!validateDateFormat(dateOfBirth)) {
        const errorMessage = 'Invalid date format. Please use YYYY-MM-DD format (e.g., 1990-05-15)';
        showToast(errorMessage, 'warning');
        if (onValidationError) {
          onValidationError(errorMessage);
        }
        return false;
      }
    }
    
    return true;
  };

  // Expose validation function to parent component
  useImperativeHandle(ref, () => ({
    validateFormData
  }));

  // Test function to verify toast is working
  const testToast = () => {
    showToast('This is a test toast message!', 'warning');
  };

  // Custom Dropdown Component
  const CustomDropdown = ({ label, value, options, onValueChange, placeholder = "Select...", loading = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Find the selected option for display
    const selectedOption = options.find(opt => opt.value === value);
    const displayValue = selectedOption ? selectedOption.label : value;
    
    return (
      <View style={styles.dropdownContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TouchableOpacity 
          style={[styles.dropdownButton, loading && styles.dropdownButtonDisabled]}
          onPress={() => !loading && setIsOpen(!isOpen)}
          disabled={loading}
        >
          <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}>
            {loading ? 'Loading...' : (displayValue || placeholder)}
          </Text>
          <Text style={styles.dropdownArrow}>{isOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {isOpen && !loading && (
          <View style={styles.dropdownContent}>
            <View style={styles.dropdownList}>
              <ScrollView 
                style={styles.dropdownScrollView}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownOption,
                      option.value === value && styles.dropdownOptionSelected
                    ]}
                    onPress={() => {
                      console.log('Role selected:', option);
                      onValueChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      option.value === value && styles.dropdownOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    );
  };

  const allowedFields = ProfileEditor.getAllowedFields(userRole, isOwnProfile);
  const fieldDisplayNames = ProfileEditor.getFieldDisplayNames();
  
  /**
   * Render an editable field if the user has permission
   */
  const renderEditableField = (fieldName, placeholder, keyboardType = 'default', multiline = false) => {
    if (!allowedFields[fieldName]) return null;
    
    const displayName = fieldDisplayNames[fieldName] || fieldName;
    const value = editedProfile[fieldName] || '';
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{displayName}</Text>
        {editing ? (
          <TextInput
            style={[styles.input, multiline && styles.multilineInput]}
            value={value}
            onChangeText={(text) => onInputChange(fieldName, text)}
            placeholder={placeholder}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
          />
        ) : (
          <Text style={styles.fieldValue}>{value || 'Not provided'}</Text>
        )}
      </View>
    );
  };

  /**
   * Render a read-only field
   */
  const renderReadOnlyField = (fieldName, value) => {
    const displayName = fieldDisplayNames[fieldName] || fieldName;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{displayName}</Text>
        <Text style={styles.readOnlyValue}>{value || 'Not provided'}</Text>
      </View>
    );
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Toast Notification */}
      {toast.visible && (
        <View style={styles.toastOverlay}>
          <View style={[styles.toast, styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          {ProfileEditor.getEditingInstructions(userRole, isOwnProfile)}
        </Text>
        {editing && (
          <TouchableOpacity style={styles.testButton} onPress={testToast}>
            <Text style={styles.testButtonText}>Test Toast</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Basic Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        {/* Name - always editable by allowed users */}
        {renderEditableField('name', 'Enter full name')}
        
        {/* Designation - only editable by admin/HR */}
        {renderEditableField('designation', 'Enter designation')}
        
        {/* Department - only editable by admin/HR */}
        {editing && allowedFields.department_id ? (
          <CustomDropdown
            label="Department"
            value={editedProfile.department_id}
            options={departmentOptions}
            onValueChange={(value) => {
              console.log('Department value changed to:', value);
              onInputChange('department_id', value);
            }}
            placeholder="Select department"
            loading={loadingDepartments}
          />
        ) : (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Department</Text>
            <Text style={styles.fieldValue}>{profile.department_name || 'Not provided'}</Text>
          </View>
        )}
        
        {/* Role - only editable by admin */}
        {editing && allowedFields.role_id ? (
          <CustomDropdown
            label="Role"
            value={editedProfile.role_id || editedProfile.role}
            options={roleOptions}
            onValueChange={(value) => {
              console.log('Role value changed to:', value);
              onInputChange('role_id', value);
            }}
            placeholder="Select role"
            loading={loadingRoles}
          />
        ) : (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Role</Text>
            <Text style={styles.fieldValue}>{profile.role_name || profile.role || 'Not provided'}</Text>
          </View>
        )}
        
        {/* System Email - only editable by admin */}
        {renderEditableField('email', 'Enter system email', 'email-address')}
        
        {/* Read-only fields */}
        {!allowedFields.user_id && profile.user_id && renderReadOnlyField('user_id', profile.user_id)}
        {!allowedFields.designation && profile.designation && renderReadOnlyField('designation', profile.designation)}
        {!allowedFields.department_id && profile.department_name && renderReadOnlyField('department_id', profile.department_name)}
        {!allowedFields.role_id && profile.role_name && renderReadOnlyField('role_id', profile.role_name)}
      </View>

      {/* Contact Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        {renderEditableField('mobile_no', 'Enter mobile number', 'phone-pad')}
        {renderEditableField('secondary_mobile_no', 'Enter secondary mobile number', 'phone-pad')}
        {renderEditableField('personal_email', 'Enter personal email', 'email-address')}
        {renderEditableField('official_email', 'Enter official email', 'email-address')}
      </View>

      {/* Personal Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        {/* Date of Birth */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Date of Birth</Text>
          {editing && allowedFields.date_of_birth ? (
            <TextInput
              style={styles.input}
              value={editedProfile.date_of_birth ? editedProfile.date_of_birth.split('T')[0] : ''}
              onChangeText={(text) => handleDateChange('date_of_birth', text)}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />
          ) : (
            <Text style={styles.fieldValue}>
              {formatDate(profile.date_of_birth)}
            </Text>
          )}
        </View>

        {renderEditableField('nationality', 'Enter nationality')}
        {renderEditableField('nid_no', 'Enter NID number')}
        {renderEditableField('passport_no', 'Enter passport number')}
        {renderEditableField('current_address', 'Enter current address', 'default', true)}
      </View>

      {/* Admin-only fields */}
      {userRole === 'admin' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>
          
          {/* First login status */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>First Login Status</Text>
            {editing ? (
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={() => onInputChange('is_first_login', !editedProfile.is_first_login)}
              >
                <Text style={styles.toggleButtonText}>
                  {editedProfile.is_first_login ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.fieldValue}>
                {profile.is_first_login ? 'Yes' : 'No'}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Permission Summary for Admins */}
      {userRole === 'admin' && !isOwnProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Editing Permissions</Text>
          <View style={styles.permissionSummary}>
            <Text style={styles.permissionText}>✅ All fields editable</Text>
            <Text style={styles.permissionText}>⚠️ Role changes require careful consideration</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructionsContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  instructionsText: {
    color: '#2c3e50',
    fontSize: 14,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#4a90e2',
    paddingBottom: 5,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldValue: {
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  readOnlyValue: {
    fontSize: 16,
    color: '#6c757d',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    fontStyle: 'italic',
  },
  toggleButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionSummary: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  permissionText: {
    color: '#155724',
    fontSize: 14,
    marginBottom: 5,
  },
  // Dropdown styles
  dropdownContainer: {
    marginBottom: 15,
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dropdownButtonDisabled: {
    backgroundColor: '#f8f9fa',
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#95a5a6',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  dropdownContent: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    marginTop: 2,
    zIndex: 9999,
    elevation: 10,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
    }),
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownScrollView: {
    flex: 1,
  },
  dropdownOption: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  dropdownOptionSelected: {
    backgroundColor: '#4a90e2',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  // Toast styles
  toastOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  toast: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  toastWarning: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  toastError: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  toastSuccess: {
    backgroundColor: '#d4edda',
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ProfileForm; 