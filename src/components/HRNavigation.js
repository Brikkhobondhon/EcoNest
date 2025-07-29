import React, { useState } from 'react';
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

// Separate component for the hire employee modal
const HireEmployeeModal = React.memo(({ 
  visible, 
  onClose, 
  onHire, 
  departments, 
  loading 
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
  React.useEffect(() => {
    if (visible) {
      fetchRoles();
    }
  }, [visible]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
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
      console.log('Fetching roles...');
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role_name, display_name')
        .eq('is_active', true)
        .order('role_name');
      
      if (error) {
        console.error('Error fetching roles:', error);
        // Fallback to default roles if database fails
        setRoles([
          { role_name: 'admin', role_description: 'System Administrator' },
          { role_name: 'employee', role_description: 'Regular Employee' },
          { role_name: 'hr', role_description: 'Human Resources' },
          { role_name: 'manager', role_description: 'Department Manager' }
        ]);
      } else if (data) {
        console.log('Roles fetched:', data);
        setRoles(data);
      } else {
        console.log('No roles found, using fallback');
        // Fallback to default roles
        setRoles([
          { role_name: 'admin', role_description: 'System Administrator' },
          { role_name: 'employee', role_description: 'Regular Employee' },
          { role_name: 'hr', role_description: 'Human Resources' },
          { role_name: 'manager', role_description: 'Department Manager' }
        ]);
      }
    } catch (error) {
      console.error('Error in fetchRoles:', error);
      // Fallback to default roles
      setRoles([
        { role_name: 'admin', role_description: 'System Administrator' },
        { role_name: 'employee', role_description: 'Regular Employee' },
        { role_name: 'hr', role_description: 'Human Resources' },
        { role_name: 'manager', role_description: 'Department Manager' }
      ]);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    console.log('Input change:', field, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHire = () => {
    console.log('Hiring with data:', formData);
    onHire(formData);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hire New Employee</Text>
            <TouchableOpacity 
              onPress={handleCancel}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Debug Info - Remove this after fixing */}
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>Roles loaded: {roles.length}</Text>
                <Text style={styles.debugText}>Departments loaded: {departments?.length || 0}</Text>
                <Text style={styles.debugText}>Selected role: {formData.role_name}</Text>
                <Text style={styles.debugText}>Selected dept: {formData.department_id}</Text>
              </View>

              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholder="Enter full name"
              />

              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>Password *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Enter temporary password"
                secureTextEntry
              />

              <Text style={styles.formLabel}>Role *</Text>
              <View style={styles.dropdownContainer}>
                {rolesLoading ? (
                  <View style={styles.dropdownLoading}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.dropdownLoadingText}>Loading roles...</Text>
                  </View>
                ) : roles.length > 0 ? (
                  <ScrollView style={styles.dropdownList}>
                    {roles.map((role) => (
                      <TouchableOpacity
                        key={role.role_name}
                        style={[
                          styles.dropdownOption,
                          formData.role_name === role.role_name && styles.dropdownOptionSelected
                        ]}
                        onPress={() => handleInputChange('role_name', role.role_name)}
                      >
                        <Text style={[
                          styles.dropdownOptionText,
                          formData.role_name === role.role_name && styles.dropdownOptionTextSelected
                        ]}>
                          {role.role_name.charAt(0).toUpperCase() + role.role_name.slice(1)} - {role.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.dropdownEmpty}>
                    <Text style={styles.dropdownEmptyText}>No roles available</Text>
                  </View>
                )}
              </View>

              <Text style={styles.formLabel}>Department *</Text>
              <View style={styles.dropdownContainer}>
                {departments && departments.length > 0 ? (
                  <ScrollView style={styles.dropdownList}>
                    {departments.map((dept) => (
                      <TouchableOpacity
                        key={dept.id}
                        style={[
                          styles.dropdownOption,
                          formData.department_id === dept.id && styles.dropdownOptionSelected
                        ]}
                        onPress={() => handleInputChange('department_id', dept.id)}
                      >
                        <Text style={[
                          styles.dropdownOptionText,
                          formData.department_id === dept.id && styles.dropdownOptionTextSelected
                        ]}>
                          {dept.code ? `${dept.code} - ${dept.name}` : dept.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.dropdownEmpty}>
                    <Text style={styles.dropdownEmptyText}>No departments available</Text>
                  </View>
                )}
              </View>

              <Text style={styles.formLabel}>Designation</Text>
              <TextInput
                style={styles.textInput}
                value={formData.designation}
                onChangeText={(text) => handleInputChange('designation', text)}
                placeholder="Enter job designation"
              />

              <Text style={styles.formLabel}>Mobile Number</Text>
              <TextInput
                style={styles.textInput}
                value={formData.mobile_no}
                onChangeText={(text) => handleInputChange('mobile_no', text)}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
              />

              <Text style={styles.formLabel}>Personal Email</Text>
              <TextInput
                style={styles.textInput}
                value={formData.personal_email}
                onChangeText={(text) => handleInputChange('personal_email', text)}
                placeholder="Enter personal email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </ScrollView>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.hireButton, loading && styles.hireButtonDisabled]}
              onPress={handleHire}
              disabled={loading}
            >
              <Text style={styles.hireButtonText}>
                {loading ? 'Hiring...' : 'Hire Employee'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

export default function HRNavigation({ 
  userProfile, 
  departments, 
  onRefreshEmployees,
  onSignOut 
}) {
  const [showHireModal, setShowHireModal] = useState(false);
  const [hiringLoading, setHiringLoading] = useState(false);

  const hireNewEmployee = async (formData) => {
    if (!formData.name || !formData.email || !formData.password || !formData.department_id || !formData.role_name) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, Password, Department, Role)');
      return;
    }

    try {
      setHiringLoading(true);
      
      const { data, error } = await supabase.rpc('hire_employee_with_auth', {
        p_email: formData.email,
        p_password: formData.password,
        p_name: formData.name,
        p_role_name: formData.role_name,
        p_department_id: formData.department_id,
        p_description: formData.designation || null,
        p_phone: formData.mobile_no || null
      });

      if (error) {
        console.error('Error hiring employee:', error);
        Alert.alert('Error', error.message || 'Failed to hire employee');
      } else if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          Alert.alert(
            'Success!', 
            `${result.role_name} hired successfully!\n\nUser ID: ${result.user_id}\nName: ${result.employee_name}\nRole: ${result.role_name}\nDepartment: ${result.department_name}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setShowHireModal(false);
                  onRefreshEmployees(); // Refresh the list
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', result.message || 'Failed to hire employee');
        }
      }
    } catch (error) {
      console.error('Error in hireNewEmployee:', error);
      Alert.alert('Error', 'Failed to hire employee');
    } finally {
      setHiringLoading(false);
    }
  };

  const handleOpenHireModal = () => {
    setShowHireModal(true);
  };

  const handleCloseHireModal = () => {
    setShowHireModal(false);
  };

  return (
    <View style={styles.navigationContainer}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <Text style={styles.navTitle}>HR Dashboard</Text>
          {userProfile && (
            <Text style={styles.navSubtitle}>
              {userProfile.name} • {userProfile.role_name}
            </Text>
          )}
        </View>
        
        <View style={styles.navRight}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={handleOpenHireModal}
          >
            <Text style={styles.navButtonText}>+ Hire</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={onSignOut}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hire Employee Modal */}
      <HireEmployeeModal
        visible={showHireModal}
        onClose={handleCloseHireModal}
        onHire={hireNewEmployee}
        departments={departments}
        loading={hiringLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navigationContainer: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLeft: {
    flex: 1,
  },
  navTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  navSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxWidth: 450,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    padding: 16,
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
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
    backgroundColor: '#e0f7fa',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownOptionTextSelected: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  hireButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
  },
  hireButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  hireButtonDisabled: {
    backgroundColor: '#a7a7a7',
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
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
}); 