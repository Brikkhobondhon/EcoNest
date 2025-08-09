import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { supabase } from '../config/supabase';
import { createUserWithMetadata } from '../utils/createUserWithMetadata';

const HireEmployeeModal = React.memo(({ 
  visible, 
  onClose, 
  onHire, 
  departments, 
  loading,
  userProfile // Pass the current user profile for context
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department_id: '',
    role_name: 'employee', // Default role
    designation: '',
    mobile_no: '',
    personal_email: ''
  });

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Fetch available roles when modal opens
  useEffect(() => {
    if (visible) {
      fetchRoles();
      checkDatabaseTables();
    }
  }, [visible]);

  const checkDatabaseTables = async () => {
    // Database validation can be added here if needed for debugging
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setFormData({
        name: '',
        email: '',
        password: '',
        department_id: '',
        role_name: 'employee',
        designation: '',
        mobile_no: '',
        personal_email: ''
      });
    }
  }, [visible]);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('role_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching roles:', error);
        Alert.alert('Error', 'Failed to fetch available roles');
        return;
      }
      setRoles(data || []);
    } catch (error) {
      console.error('Error in fetchRoles:', error);
      Alert.alert('Error', 'Failed to fetch roles');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHire = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.department_id || !formData.role_name) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, Password, Department, Role)');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      // Validate that the selected role and department exist
      const selectedRole = roles.find(r => r.role_name === formData.role_name);
      const selectedDept = departments.find(d => d.id === formData.department_id);
      
      if (!selectedRole) {
        Alert.alert('Error', `Role "${formData.role_name}" not found in available roles`);
        return;
      }
      
      if (!selectedDept) {
        Alert.alert('Error', `Selected department not found`);
        return;
      }


      
      // Use the new metadata-aware user creation function
      const result = await createUserWithMetadata({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role_name: formData.role_name,
        department_id: formData.department_id,
        designation: formData.designation || null,
        mobile_no: formData.mobile_no || null,
        personal_email: formData.personal_email || null,
        hired_by: userProfile?.email || 'admin@econest.com'
      });



      if (result.success) {
        Alert.alert(
          'Success! 🎉', 
          `${formData.role_name.charAt(0).toUpperCase() + formData.role_name.slice(1)} hired successfully!\n\n` +
          `Employee ID: ${result.user.user_id}\n` +
          `Name: ${result.user.name}\n` +
          `Email: ${result.user.email}\n` +
          `Role: ${result.user.role_name}\n` +
          `Department: ${result.user.department_name} (${result.user.department_code})\n\n` +
          `✅ User ID auto-generated following convention\n` +
          `✅ User created with metadata\n` +
          `✅ Profile saved to database\n` +
          `✅ Email confirmation sent\n` +
          `✅ Ready for fast login\n\n` +
          `The user will receive a confirmation email to activate their account.`,
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                if (onHire) {
                  onHire(); // Refresh the employee list
                }
              }
            }
          ]
        );
      } else {
        console.error('Hiring failed:', result);
        
        let errorMessage = result.error || result.message || 'Unknown error';
        
        // Check if it's a department code issue
        if (errorMessage.includes('Department code not found')) {
          errorMessage = 
            `❌ Department Setup Issue\n\n` +
            `The selected department doesn't have a department code assigned. ` +
            `Department codes are required for generating employee IDs.\n\n` +
            `Please contact your system administrator to:\n` +
            `• Add a department code for this department\n` +
            `• Ensure the department_codes table is properly configured\n\n` +
            `Department: ${errorMessage.split('Department code not found for department: ')[1]?.split('.')[0] || 'Unknown'}`;
        } else {
          errorMessage = 
            `Failed to hire employee.\n\nError: ${errorMessage}\n\n` +
            `Please check:\n• Email is not already in use\n• All required fields are filled\n• Database connection is working\n• You have proper permissions`;
        }
        
        Alert.alert('Hiring Failed', errorMessage);
      }
      
    } catch (error) {
      console.error('Error in handleHire:', error);
      Alert.alert(
        'Hiring Error', 
        `An unexpected error occurred while hiring the employee.\n\nError: ${error.message}\n\nPlease try again or contact support if the issue persists.`
      );
    }
  };

  const getRoleDisplayName = (role) => {
    if (!role || !role.role_name) return 'Unknown Role';
    const roleObj = roles.find(r => r && r.role_name === role.role_name);
    return roleObj?.display_name || role.role_name || 'Unknown Role';
  };

  const getDepartmentName = (deptId) => {
    if (!deptId) return 'Unknown Department';
    const dept = departments.find(d => d && d.id === deptId);
    return dept?.name || 'Unknown Department';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hire New Employee</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter full name"
                editable={!loading}
              />
              <Text style={styles.formLabel}>Work Email *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter work email"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
              <Text style={styles.formLabel}>Initial Password *</Text>
              <Text style={styles.formNote}>
                Must be at least 6 characters long.
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Enter initial password (min 6 chars)"
                secureTextEntry={true}
                editable={!loading}
              />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Role & Department</Text>
              <Text style={styles.formLabel}>Role *</Text>
              <View style={styles.dropdownContainer}>
                {rolesLoading ? (
                  <View style={styles.dropdownLoading}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.dropdownLoadingText}>Loading roles...</Text>
                  </View>
                ) : roles.length === 0 ? (
                  <View style={styles.dropdownEmpty}>
                    <Text style={styles.dropdownEmptyText}>No roles available</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                    {roles.filter(role => role && role.id && role.role_name).map((role) => (
                      <TouchableOpacity
                        key={role.id}
                        style={[
                          styles.dropdownOption,
                          formData.role_name === role.role_name && styles.dropdownOptionSelected
                        ]}
                        onPress={() => handleInputChange('role_name', role.role_name)}
                        disabled={loading}
                      >
                        <Text style={[
                          styles.dropdownOptionText,
                          formData.role_name === role.role_name && styles.dropdownOptionTextSelected
                        ]}>
                          {role.display_name || role.role_name || 'Unknown'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
              <Text style={styles.formLabel}>Department *</Text>
              <View style={styles.dropdownContainer}>
                {departments.length === 0 ? (
                  <View style={styles.dropdownEmpty}>
                    <Text style={styles.dropdownEmptyText}>No departments available</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                    {departments.filter(dept => dept && dept.id && dept.name).map((dept) => (
                      <TouchableOpacity
                        key={dept.id}
                        style={[
                          styles.dropdownOption,
                          formData.department_id === dept.id && styles.dropdownOptionSelected
                        ]}
                        onPress={() => handleInputChange('department_id', dept.id)}
                        disabled={loading}
                      >
                        <Text style={[
                          styles.dropdownOptionText,
                          formData.department_id === dept.id && styles.dropdownOptionTextSelected
                        ]}>
                          {`${dept.name}${dept.code ? ` (${dept.code})` : ''}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              <Text style={styles.formLabel}>Job Designation</Text>
              <TextInput
                style={styles.textInput}
                value={formData.designation}
                onChangeText={(value) => handleInputChange('designation', value)}
                placeholder="e.g., Senior Developer, Manager"
                editable={!loading}
              />
              <Text style={styles.formLabel}>Mobile Number</Text>
              <TextInput
                style={styles.textInput}
                value={formData.mobile_no}
                onChangeText={(value) => handleInputChange('mobile_no', value)}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
                editable={!loading}
              />
              <Text style={styles.formLabel}>Personal Email</Text>
              <TextInput
                style={styles.textInput}
                value={formData.personal_email}
                onChangeText={(value) => handleInputChange('personal_email', value)}
                placeholder="Enter personal email"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
{/* Temporarily disabled Summary to isolate text node issue */}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.hireButton, loading && styles.hireButtonDisabled]}
              onPress={handleHire}
              disabled={loading || !formData.name || !formData.email || !formData.password || formData.password.length < 6 || !formData.department_id || !formData.role_name}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.hireButtonText}>Hiring...</Text>
                </View>
              ) : (
                <Text style={styles.hireButtonText}>Hire Employee</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6c757d',
    borderRadius: 15,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#4a90e2',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  formNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
    marginTop: -4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  dropdownList: {
    maxHeight: 150,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownOptionTextSelected: {
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  dropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  dropdownLoadingText: {
    marginLeft: 8,
    color: '#555',
  },
  dropdownEmpty: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    color: '#888',
    fontSize: 14,
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#155724',
    marginBottom: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  hireButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  hireButtonDisabled: {
    backgroundColor: '#a7a7a7',
  },
  hireButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default HireEmployeeModal;
