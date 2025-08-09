import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import HRNavigation from '../components/HRNavigation';

// Separate component for user cards to prevent re-renders
const UserCard = React.memo(({ user }) => (
  <View style={styles.employeeCard}>
    <View style={styles.employeeHeader}>
      <Text style={styles.employeeName}>{user.name || 'N/A'}</Text>
      <View style={styles.employeeIdContainer}>
        <Text style={styles.employeeId}>ID: {user.user_id}</Text>
        {user.department_code && (
          <Text style={styles.departmentCode}>Dept: {user.department_code}</Text>
        )}
      </View>
    </View>
    <View style={styles.employeeDetails}>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Role:</Text>
        <Text style={[
          styles.detailValue,
          { 
            color: user.role === 'admin' ? '#dc3545' : 
                   user.role === 'hr' ? '#007bff' : 
                   user.role === 'manager' ? '#28a745' : '#6c757d'
          }
        ]}>
          {user.role || user.role_name || 'N/A'}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Department:</Text>
        <Text style={styles.detailValue}>{user.department_name || 'N/A'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Designation:</Text>
        <Text style={styles.detailValue}>{user.designation || 'N/A'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Email:</Text>
        <Text style={styles.detailValue}>{user.email || 'N/A'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Mobile:</Text>
        <Text style={styles.detailValue}>{user.mobile_no || 'N/A'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>First Login:</Text>
        <Text style={[
          styles.detailValue, 
          { color: user.is_first_login ? '#dc3545' : '#28a745' }
        ]}>
          {user.is_first_login ? 'Pending' : 'Completed'}
        </Text>
      </View>
    </View>
  </View>
));

export default function HRDashboard() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchUserProfile = useCallback(async () => {
    if (user) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (!error && data) {
        setUserProfile(data);
      }
    }
  }, [user]);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      // Try the new comprehensive view first
      let { data, error } = await supabase
        .from('users_with_department_info')
        .select('*')
        .order('user_id', { ascending: true });
      
      if (error) {
        console.log('Falling back to employees_with_department_info view:', error.message);
        // Fallback to employee-specific view
        const fallbackResult = await supabase
          .from('employees_with_department_info')
          .select('*')
          .order('user_id', { ascending: true });
        
        if (fallbackResult.error) {
          console.log('Falling back to user_profiles view:', fallbackResult.error.message);
          // Final fallback to user_profiles
          const finalFallback = await supabase
            .from('user_profiles')
            .select('*')
            .order('user_id', { ascending: true });
          
          if (finalFallback.error) {
            console.error('Error fetching users:', finalFallback.error);
            Alert.alert('Error', 'Failed to fetch user data');
            return;
          }
          data = finalFallback.data;
        } else {
          data = fallbackResult.data;
        }
      }
      

      setEmployees(data || []);
    } catch (error) {
      console.error('Error in fetchEmployees:', error);
      Alert.alert('Error', 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {

      // Join departments with department_codes to get the codes
      const { data, error } = await supabase
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
        .eq('department_codes.is_active', true)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching departments:', error);
        return;
      }
      
      // Transform the data to include code directly
      const departmentsWithCodes = data?.map(dept => {
        let code = null;
        if (Array.isArray(dept.department_codes)) {
          code = dept.department_codes?.[0]?.code || null;
        } else if (dept.department_codes && typeof dept.department_codes === 'object') {
          code = dept.department_codes.code || null;
        }
        return {
          ...dept,
          code
        };
      }) || [];
      

      setDepartments(departmentsWithCodes);
    } catch (error) {
      console.error('Error in fetchDepartments:', error);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  }, [fetchEmployees]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // Memoize the render item function to prevent re-renders
  const renderUserCard = useCallback(({ item }) => (
    <UserCard user={item} />
  ), []);

  // Memoize the key extractor
  const keyExtractor = useCallback((item, index) => item.user_id || index.toString(), []);

  // Prepare data for SectionList
  const sectionData = useMemo(() => {
    if (employees.length === 0) return [];
    
    // Group employees by role
    const groupedEmployees = employees.reduce((acc, employee) => {
      const role = employee.role || employee.role_name || 'Other';
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(employee);
      return acc;
    }, {});

    // Convert to SectionList format
    return Object.keys(groupedEmployees).map(role => ({
      title: role.charAt(0).toUpperCase() + role.slice(1),
      data: groupedEmployees[role]
    }));
  }, [employees]);

  // Render section header
  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      <Text style={styles.sectionHeaderCount}>{section.data.length} employee(s)</Text>
    </View>
  ), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading employee data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Bar with Hire functionality */}
      <HRNavigation
        userProfile={userProfile}
        departments={departments}
        onRefreshEmployees={fetchEmployees}
        onSignOut={signOut}
      />

      {/* Content Area */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        bounces={Platform.OS !== 'web'}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Fixed Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Total Users: {employees.length}</Text>
          <Text style={styles.statsSubtext}>
            Showing all users (Admin, Manager, HR, Employee) with automatic ID generation
          </Text>
        </View>

        {/* Employee List */}
        <View style={styles.employeeListContainer}>
          {Platform.OS === 'web' ? (
            // Web: Use SectionList content structure
            <>
              {sectionData.map((section) => (
                <View key={section.title}>
                  {renderSectionHeader({ section })}
                  {section.data.map((user, index) => (
                    <View key={user.user_id || index}>
                      <UserCard user={user} />
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : (
            // Mobile: Use regular list
            <>
              {employees.length === 0 ? (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No users found</Text>
                </View>
              ) : (
                employees.map((user, index) => (
                  <View key={user.user_id || index}>
                    <UserCard user={user} />
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
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
      overflowX: 'hidden',
      overflowY: 'auto',
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
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' && {
      flex: 1,
      overflow: 'auto',
      maxHeight: 'calc(100vh - 140px)',
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
    }),
  },
  employeeListContainer: {
    width: '100%',
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
  userInfo: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userInfoSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  employeeCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  employeeIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeId: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  departmentCode: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  employeeDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    flex: 1,
    marginRight: 12,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
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
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
  },
  actionContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  hireButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hireButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  hireButtonDisabled: {
    backgroundColor: '#a7a7a7',
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
  sectionHeader: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
  },
  sectionHeaderCount: {
    fontSize: 14,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
}); 