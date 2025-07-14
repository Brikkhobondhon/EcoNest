import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ProfileEditor } from '../utils/profileEditor';

/**
 * Reusable form component for profile editing with role-based access control
 */
export const ProfileForm = ({ 
  profile, 
  editedProfile, 
  onInputChange, 
  userRole, 
  isOwnProfile = false,
  editing = false,
  style = {} 
}) => {
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
      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          {ProfileEditor.getEditingInstructions(userRole, isOwnProfile)}
        </Text>
      </View>

      {/* Basic Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        {/* Name - always editable by allowed users */}
        {renderEditableField('name', 'Enter full name')}
        
        {/* Designation - only editable by admin/HR */}
        {renderEditableField('designation', 'Enter designation')}
        
        {/* Department - only editable by admin/HR */}
        {renderEditableField('department_id', 'Select department')}
        
        {/* Role - only editable by admin */}
        {renderEditableField('role_id', 'Select role')}
        
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
              onChangeText={(text) => onInputChange('date_of_birth', text)}
              placeholder="YYYY-MM-DD"
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
};

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
});

export default ProfileForm; 