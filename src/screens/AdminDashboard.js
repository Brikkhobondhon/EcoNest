import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Platform,
  Modal,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState({});

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [searchQuery, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching employees:', error);
        Alert.alert('Error', 'Failed to fetch employee data');
      } else {
        setEmployees(data || []);
        setFilteredEmployees(data || []);
      }
    } catch (error) {
      console.error('Error in fetchEmployees:', error);
      Alert.alert('Error', 'Failed to fetch employee data');
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = employees.filter(employee => 
      employee.user_id?.toLowerCase().includes(query) ||
      employee.name?.toLowerCase().includes(query)
    );
    setFilteredEmployees(filtered);
  }, [searchQuery, employees]);

  const openEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
    setEditedEmployee({ ...employee });
    setIsModalVisible(true);
    setEditing(false);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedEmployee(null);
    setEditedEmployee({});
    setEditing(false);
  };

  const handleEdit = () => {
    setEditedEmployee({ ...selectedEmployee });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditedEmployee({ ...selectedEmployee });
    setEditing(false);
  };

  const handleInputChange = useCallback((field, value) => {
    setEditedEmployee(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!editedEmployee.name || !editedEmployee.name.trim()) {
        Alert.alert('Validation Error', 'Name is required');
        return;
      }

      // Prepare update data
      const updateData = {
        name: editedEmployee.name?.trim(),
        personal_email: editedEmployee.personal_email?.trim() || null,
        official_email: editedEmployee.official_email?.trim() || null,
        mobile_no: editedEmployee.mobile_no?.trim() || null,
        secondary_mobile_no: editedEmployee.secondary_mobile_no?.trim() || null,
        current_address: editedEmployee.current_address?.trim() || null,
        date_of_birth: editedEmployee.date_of_birth || null,
        nationality: editedEmployee.nationality?.trim() || null,
        nid_no: editedEmployee.nid_no?.trim() || null,
        passport_no: editedEmployee.passport_no?.trim() || null,
        designation: editedEmployee.designation?.trim() || null,
        updated_at: new Date().toISOString()
      };

      console.log('Updating employee:', editedEmployee.user_id, updateData);

      // Try multiple update strategies to ensure save works (same as EmployeeDashboard)
      let result = null;
      let updateMethod = '';

      // Strategy 1: Update by email (most reliable)
      if (editedEmployee.email) {
        console.log('Attempting update by email:', editedEmployee.email);
        result = await supabase
          .from('users')
          .update(updateData)
          .eq('email', editedEmployee.email)
          .select();
        updateMethod = 'email';
      }

      // Strategy 2: Update by user_id if email fails
      if (result?.error && editedEmployee.user_id) {
        console.log('Email update failed, trying user_id:', editedEmployee.user_id);
        result = await supabase
          .from('users')
          .update(updateData)
          .eq('user_id', editedEmployee.user_id)
          .select();
        updateMethod = 'user_id';
      }

      // Strategy 3: Update by id if previous methods fail
      if (result?.error && editedEmployee.id) {
        console.log('Previous updates failed, trying id:', editedEmployee.id);
        result = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editedEmployee.id)
          .select();
        updateMethod = 'id';
      }

      console.log(`Update result (${updateMethod}):`, result);

      if (result?.error) {
        console.error('All update methods failed:', result.error);
        
        // Try the custom SQL function as last resort
        console.log('Attempting custom SQL function update...');
        const { data: sqlResult, error: sqlError } = await supabase.rpc('update_user_profile', {
          user_email: editedEmployee.email,
          profile_data: updateData
        });
        
        if (sqlError) {
          console.error('SQL function also failed:', sqlError);
          Alert.alert('Error', `Failed to update employee: ${result.error.message}\n\nPlease check your internet connection and try again.`);
          return;
        } else {
          console.log('SQL function succeeded:', sqlResult);
          if (sqlResult.success) {
            result = { data: [sqlResult.data], error: null };
          } else {
            Alert.alert('Error', `SQL function failed: ${sqlResult.error}`);
            return;
          }
        }
      }

      if (result?.data && result.data.length > 0) {
        console.log('Employee updated successfully:', result.data[0]);
        
        Alert.alert('Success', 'Employee updated successfully!');
        
        // Update local state
        const updatedEmployee = { ...selectedEmployee, ...updateData };
        setSelectedEmployee(updatedEmployee);
        setEditedEmployee(updatedEmployee);
        setEditing(false);
        
        // Refresh employee list
        await fetchEmployees();
        
      } else {
        console.warn('No data returned from update operation');
        Alert.alert('Warning', 'Update may have failed. Please refresh to check if changes were saved.');
        
        // Still exit edit mode
        setEditing(false);
        
        // Refresh employee list
        await fetchEmployees();
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', `Failed to update employee: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const EmployeeCard = ({ employee }) => (
    <TouchableOpacity 
      style={styles.employeeCard} 
      onPress={() => openEmployeeDetails(employee)}
    >
      <View style={styles.employeeCardContent}>
        <View style={styles.employeeMainInfo}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeId}>ID: {employee.user_id}</Text>
          <Text style={styles.employeeDesignation}>{employee.designation}</Text>
        </View>
        <View style={styles.employeeSecondaryInfo}>
          <Text style={styles.employeeDepartment}>{employee.department_name}</Text>
          <Text style={styles.employeeRole}>{employee.role_name}</Text>
          <Text style={styles.employeeEmail}>{employee.email}</Text>
        </View>
      </View>
      <View style={styles.employeeCardArrow}>
        <Text style={styles.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );

  const EditableField = useCallback(({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default', fieldKey }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        key={fieldKey}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value || ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        editable={!saving}
        autoCorrect={false}
        autoCapitalize="none"
        blurOnSubmit={!multiline}
      />
    </View>
  ), [saving]);

  const ReadOnlyField = ({ label, value }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.input, styles.readOnlyInput]}>
        <Text style={styles.readOnlyText}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Employee Management</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by User ID or Name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Employee Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredEmployees.length} {filteredEmployees.length === 1 ? 'Employee' : 'Employees'}
          {searchQuery ? ` (filtered from ${employees.length} total)` : ''}
        </Text>
      </View>

      {/* Employee List */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
        bounces={Platform.OS !== 'web'}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {filteredEmployees.map((employee) => (
          <EmployeeCard key={employee.user_id} employee={employee} />
        ))}
        {filteredEmployees.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No employees found matching your search.' : 'No employees found.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Employee Detail Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Employee Details</Text>
            {!editing ? (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]} 
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.saveButton]} 
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Modal Content */}
          <ScrollView 
            style={styles.modalScrollContainer}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {selectedEmployee && (
              <>
                {/* Basic Information */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                  
                  <ReadOnlyField label="User ID" value={selectedEmployee.user_id} />
                  <ReadOnlyField label="Email" value={selectedEmployee.email} />
                  <ReadOnlyField label="Role" value={selectedEmployee.role_name} />
                  
                  {editing ? (
                    <EditableField
                      label="Full Name"
                      value={editedEmployee.name}
                      onChangeText={(text) => handleInputChange('name', text)}
                      placeholder="Enter full name"
                      fieldKey="name_field"
                    />
                  ) : (
                    <ReadOnlyField label="Full Name" value={selectedEmployee.name} />
                  )}
                  
                  {editing ? (
                    <EditableField
                      label="Designation"
                      value={editedEmployee.designation}
                      onChangeText={(text) => handleInputChange('designation', text)}
                      placeholder="Enter designation"
                      fieldKey="designation_field"
                    />
                  ) : (
                    <ReadOnlyField label="Designation" value={selectedEmployee.designation} />
                  )}
                </View>

                {/* Contact Information */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  
                  {editing ? (
                    <>
                      <EditableField
                        label="Mobile Number"
                        value={editedEmployee.mobile_no}
                        onChangeText={(text) => handleInputChange('mobile_no', text)}
                        placeholder="Enter mobile number"
                        keyboardType="phone-pad"
                        fieldKey="mobile_no_field"
                      />
                      <EditableField
                        label="Secondary Mobile"
                        value={editedEmployee.secondary_mobile_no}
                        onChangeText={(text) => handleInputChange('secondary_mobile_no', text)}
                        placeholder="Enter secondary mobile number"
                        keyboardType="phone-pad"
                        fieldKey="secondary_mobile_no_field"
                      />
                      <EditableField
                        label="Personal Email"
                        value={editedEmployee.personal_email}
                        onChangeText={(text) => handleInputChange('personal_email', text)}
                        placeholder="Enter personal email"
                        keyboardType="email-address"
                        fieldKey="personal_email_field"
                      />
                      <EditableField
                        label="Official Email"
                        value={editedEmployee.official_email}
                        onChangeText={(text) => handleInputChange('official_email', text)}
                        placeholder="Enter official email"
                        keyboardType="email-address"
                        fieldKey="official_email_field"
                      />
                    </>
                  ) : (
                    <>
                      <ReadOnlyField label="Mobile Number" value={selectedEmployee.mobile_no} />
                      <ReadOnlyField label="Secondary Mobile" value={selectedEmployee.secondary_mobile_no} />
                      <ReadOnlyField label="Personal Email" value={selectedEmployee.personal_email} />
                      <ReadOnlyField label="Official Email" value={selectedEmployee.official_email} />
                    </>
                  )}
                </View>

                {/* Personal Information */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  
                  {editing ? (
                    <>
                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Date of Birth</Text>
                        <TextInput
                          key="date_of_birth_field"
                          style={styles.input}
                          value={formatDateForInput(editedEmployee.date_of_birth)}
                          onChangeText={(text) => handleInputChange('date_of_birth', text)}
                          placeholder="YYYY-MM-DD"
                          autoCorrect={false}
                          autoCapitalize="none"
                          blurOnSubmit={true}
                        />
                      </View>
                      <EditableField
                        label="Nationality"
                        value={editedEmployee.nationality}
                        onChangeText={(text) => handleInputChange('nationality', text)}
                        placeholder="Enter nationality"
                        fieldKey="nationality_field"
                      />
                      <EditableField
                        label="National ID (NID)"
                        value={editedEmployee.nid_no}
                        onChangeText={(text) => handleInputChange('nid_no', text)}
                        placeholder="Enter NID number"
                        fieldKey="nid_no_field"
                      />
                      <EditableField
                        label="Passport Number"
                        value={editedEmployee.passport_no}
                        onChangeText={(text) => handleInputChange('passport_no', text)}
                        placeholder="Enter passport number"
                        fieldKey="passport_no_field"
                      />
                      <EditableField
                        label="Current Address"
                        value={editedEmployee.current_address}
                        onChangeText={(text) => handleInputChange('current_address', text)}
                        placeholder="Enter current address"
                        multiline={true}
                        fieldKey="current_address_field"
                      />
                    </>
                  ) : (
                    <>
                      <ReadOnlyField label="Date of Birth" value={formatDate(selectedEmployee.date_of_birth)} />
                      <ReadOnlyField label="Nationality" value={selectedEmployee.nationality} />
                      <ReadOnlyField label="National ID (NID)" value={selectedEmployee.nid_no} />
                      <ReadOnlyField label="Passport Number" value={selectedEmployee.passport_no} />
                      <ReadOnlyField label="Current Address" value={selectedEmployee.current_address} />
                    </>
                  )}
                </View>

                {/* System Information */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>System Information</Text>
                  <ReadOnlyField label="Department" value={selectedEmployee.department_name} />
                  <ReadOnlyField 
                    label="First Login Status" 
                    value={selectedEmployee.is_first_login ? 'Pending' : 'Completed'} 
                  />
                  <ReadOnlyField 
                    label="Account Created" 
                    value={formatDate(selectedEmployee.created_at)} 
                  />
                  <ReadOnlyField 
                    label="Last Updated" 
                    value={formatDate(selectedEmployee.updated_at)} 
                  />
                </View>

                {/* Bottom spacing */}
                <View style={styles.bottomPadding} />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }),
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
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
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexShrink: 0,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexShrink: 0,
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' && {
      flex: 1,
      overflow: 'auto',
      maxHeight: 'calc(100vh - 200px)', // Subtract header + search + count containers
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'auto',
      scrollbarColor: '#888 #f5f5f5',
    }),
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    flexGrow: 1,
    ...(Platform.OS === 'web' && {
      paddingBottom: 100,
      minHeight: 'fit-content',
    }),
  },
  employeeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  employeeMainInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  employeeDesignation: {
    fontSize: 14,
    color: '#666',
  },
  employeeSecondaryInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  employeeDepartment: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 12,
    color: '#666',
  },
  employeeCardArrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 20,
    color: '#ccc',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    backgroundColor: 'white',
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 36,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  modalScrollContainer: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#333',
  },
  bottomPadding: {
    height: 20,
  },
}); 