import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  Platform,
  FlatList
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

export default function HRDashboard() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchEmployees();
  }, []);

  const fetchUserProfile = async () => {
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
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching employees:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        Alert.alert('Error', 'Failed to fetch employee data');
      } else {
        console.log('Fetched employees:', data?.length || 0, 'users');
        console.log('Employee data:', JSON.stringify(data, null, 2));
        setEmployees(data || []);
      }
    } catch (error) {
      console.error('Error in fetchEmployees:', error);
      Alert.alert('Error', 'Failed to fetch employee data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
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

  const EmployeeCard = ({ employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <Text style={styles.employeeName}>{employee.name || 'N/A'}</Text>
        <Text style={styles.employeeId}>ID: {employee.user_id}</Text>
      </View>
      
      <View style={styles.employeeDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role:</Text>
          <Text style={styles.detailValue}>{employee.role_name || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Department:</Text>
          <Text style={styles.detailValue}>{employee.department_name || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Designation:</Text>
          <Text style={styles.detailValue}>{employee.designation || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Official Email:</Text>
          <Text style={styles.detailValue}>{employee.official_email || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Personal Email:</Text>
          <Text style={styles.detailValue}>{employee.personal_email || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Mobile:</Text>
          <Text style={styles.detailValue}>{employee.mobile_no || 'N/A'}</Text>
        </View>
        
        {employee.secondary_mobile_no && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Secondary Mobile:</Text>
            <Text style={styles.detailValue}>{employee.secondary_mobile_no}</Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date of Birth:</Text>
          <Text style={styles.detailValue}>{formatDate(employee.date_of_birth)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Nationality:</Text>
          <Text style={styles.detailValue}>{employee.nationality || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>NID:</Text>
          <Text style={styles.detailValue}>{employee.nid_no || 'N/A'}</Text>
        </View>
        
        {employee.passport_no && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Passport:</Text>
            <Text style={styles.detailValue}>{employee.passport_no}</Text>
          </View>
        )}
        
        {employee.current_address && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>{employee.current_address}</Text>
          </View>
        )}
        
                 <View style={styles.detailRow}>
           <Text style={styles.detailLabel}>First Login:</Text>
           <Text style={[
             styles.detailValue, 
             { color: employee.is_first_login ? '#dc3545' : '#28a745' }
           ]}>
             {employee.is_first_login ? 'Pending' : 'Completed'}
           </Text>
         </View>
      </View>
    </View>
  );

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
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>HR Dashboard</Text>
          <Text style={styles.headerSubtitle}>Employee Management</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Fixed User Info */}
      {userProfile && (
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>Welcome, {userProfile.name}</Text>
          <Text style={styles.userInfoSubtext}>
            {userProfile.role_name} • {userProfile.department_name}
          </Text>
        </View>
      )}

      {/* Fixed Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Total Employees: {employees.length}</Text>
        <Text style={styles.statsSubtext}>
          Showing all users in the system
        </Text>
      </View>

      {/* Scrollable Employee List */}
      {Platform.OS === 'web' ? (
        <FlatList
          style={styles.employeeScrollView}
          contentContainerStyle={styles.employeeScrollContent}
          data={employees}
          renderItem={({ item }) => <EmployeeCard employee={item} />}
          keyExtractor={(item, index) => item.user_id || index.toString()}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No employees found</Text>
            </View>
          }
        />
      ) : (
        <ScrollView 
          style={styles.employeeScrollView}
          contentContainerStyle={styles.employeeScrollContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {employees.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No employees found</Text>
            </View>
          ) : (
            employees.map((employee, index) => (
              <View key={employee.user_id || index}>
                <EmployeeCard employee={employee} />
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    ...(Platform.OS === 'web' && {
      height: '100vh',
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
  },
  employeeScrollView: {
    flex: 1,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' && {
      height: 'auto',
      maxHeight: '60vh',
      overflowY: 'auto',
    }),
  },
  employeeScrollContent: {
    paddingVertical: 16,
  },
  webScrollView: {
    height: '100%',
    overflow: 'scroll',
    WebkitOverflowScrolling: 'touch',
  },
  webScrollContent: {
    minHeight: '100%',
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
    marginHorizontal: 16,
    marginTop: 12,
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
  employeeId: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
}); 