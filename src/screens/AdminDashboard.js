import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  Modal,
  FlatList,
  TextInput,
  Platform,
  RefreshControl
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { ProfileEditor } from '../utils/profileEditor';
import { ProfileForm } from '../components/ProfileForm';
import MetadataMigration from '../components/MetadataMigration';
import HireEmployeeModal from '../components/HireEmployeeModal';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminDashboard({ navigation }) {
  const { user, signOut, syncEmailWithDatabase } = useAuth();
  const [adminProfile, setAdminProfile] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [saving, setSaving] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  const profileFormRef = useRef(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'warning' });
  const [showMigration, setShowMigration] = useState(false);
  const [syncingEmails, setSyncingEmails] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hiringLoading, setHiringLoading] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Function to show toast notifications
  const showToast = (message, type = 'warning') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'warning' });
    }, 4000);
  };

  // Add debug logging
  const addDebugInfo = (message) => {
    console.log('AdminDashboard Debug:', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addDebugInfo('AdminDashboard mounted');
    addDebugInfo(`User: ${user?.email}`);
    
    if (user) {
      fetchAdminProfile();
      fetchAllUsers();
      fetchDepartments();
    } else {
      setError('No user found');
      setLoading(false);
    }
  }, [user]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, allUsers]);

  const fetchAdminProfile = async () => {
    try {
      addDebugInfo('Fetching admin profile...');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (error) {
        addDebugInfo(`Error fetching admin profile: ${error.message}`);
        
        // Try alternative table if user_profiles doesn't exist
        addDebugInfo('Trying users table...');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();
          
        if (userError) {
          addDebugInfo(`Error fetching from users table: ${userError.message}`);
          setError(`Database error: ${userError.message}`);
        } else {
          addDebugInfo('Successfully fetched from users table');
          setAdminProfile(userData);
        }
      } else {
        addDebugInfo('Successfully fetched admin profile from user_profiles');
        setAdminProfile(data);
      }
    } catch (error) {
      addDebugInfo(`Catch error in fetchAdminProfile: ${error.message}`);
      setError(`Failed to fetch admin profile: ${error.message}`);
    }
  };

  const fetchAllUsers = async () => {
    try {
      addDebugInfo('Fetching all users...');
      setLoading(true);
      
      // Try the new comprehensive view first
      let { data, error } = await supabase
        .from('users_with_department_info')
        .select('*')
        .order('user_id', { ascending: true });
      
      if (error) {
        addDebugInfo(`Error fetching from users_with_department_info: ${error.message}`);
        
        // Fallback to user_profiles
        const fallbackResult = await supabase
        .from('user_profiles')
        .select('*')
        .order('name', { ascending: true });
      
        if (fallbackResult.error) {
          addDebugInfo(`Error fetching from user_profiles: ${fallbackResult.error.message}`);
        
          // Final fallback to users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .order('name', { ascending: true });
          
        if (userError) {
          addDebugInfo(`Error fetching from users table: ${userError.message}`);
          setError(`Failed to fetch users: ${userError.message}`);
        } else {
          addDebugInfo(`Successfully fetched ${userData.length} users from users table`);
          setAllUsers(userData || []);
        }
      } else {
          addDebugInfo(`Successfully fetched ${fallbackResult.data.length} users from user_profiles`);
          setAllUsers(fallbackResult.data || []);
        }
      } else {
        addDebugInfo(`Successfully fetched ${data.length} users from users_with_department_info`);
        setAllUsers(data || []);
      }
    } catch (error) {
      addDebugInfo(`Catch error in fetchAllUsers: ${error.message}`);
      setError(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      addDebugInfo('Fetching departments...');
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        addDebugInfo(`Error fetching departments: ${error.message}`);
        console.error('Error fetching departments:', error);
        return;
      }
      
      addDebugInfo(`Successfully fetched ${data?.length || 0} departments`);
      setDepartments(data || []);
    } catch (error) {
      addDebugInfo(`Catch error in fetchDepartments: ${error.message}`);
      console.error('Error in fetchDepartments:', error);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setEditedProfile(user);
    setShowUserModal(true);
  };

  const handleEditUser = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedProfile(selectedUser);
    setEditing(false);
  };

  const handleSaveUser = async () => {
    if (!selectedUser || !adminProfile) return;

    // Validate form data before saving
    if (profileFormRef.current && !profileFormRef.current.validateFormData()) {
      setSaving(false);
      return; // Stop saving if validation fails
    }

    setSaving(true);
    
    try {
      const adminRole = adminProfile.role_name || adminProfile.role || 'admin';
      const isOwnProfile = selectedUser?.id === adminProfile?.id;

      console.log('=== ADMIN SAVE USER DEBUG ===');
      console.log('Selected user:', selectedUser);
      console.log('Edited profile:', editedProfile);
      console.log('Admin role:', adminRole);
      console.log('Is own profile:', isOwnProfile);

      // Use the common ProfileEditor to save the profile
      const result = await ProfileEditor.saveProfile({
        originalProfile: selectedUser,
        editedProfile: editedProfile,
        currentUserRole: adminRole,
        isOwnProfile: isOwnProfile,
        onSuccess: (updatedProfile) => {
          console.log('Profile save success callback triggered');
          
          // Update selected user
          setSelectedUser(updatedProfile);
          setEditedProfile(updatedProfile);
          setEditing(false);
          
          // Update user in the list
          setAllUsers(prevUsers => 
            prevUsers.map(u => 
              u.id === updatedProfile.id ? updatedProfile : u
            )
          );
          
          // Show success message
          const successMessage = updatedProfile.role_id !== selectedUser.role_id 
            ? `User role updated successfully! New role: ${updatedProfile.role_name || 'Unknown'}`
            : 'User profile updated successfully!';
          
          showToast(successMessage, 'success');
          
          // Refresh the full user list
          setTimeout(() => {
            fetchAllUsers();
          }, 1000);
        },
        onError: (error) => {
          console.error('Error saving user:', error);
          showToast(`Failed to save user: ${error.message}`, 'error');
        }
      });

      // Log the result for debugging
      if (result.success) {
        console.log('Admin successfully updated user:', result.updatedFields);
        
        // Check if role was updated
        if (result.updatedFields.includes('role_id')) {
          console.log('Role was updated in this save operation');
        }
      } else {
        console.error('Save operation failed:', result.error);
        showToast(`Save failed: ${result.error}`, 'error');
      }

    } catch (error) {
      console.error('Unexpected error in handleSaveUser:', error);
      showToast(`Unexpected error: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!userId) {
      Alert.alert('Error', 'Cannot delete user: Invalid user ID');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Use the same table that exists
              const { error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', userId);

              if (error) {
                console.error('Error deleting user:', error);
                Alert.alert('Error', 'Failed to delete user');
              } else {
                Alert.alert('Success', 'User deleted successfully');
                setShowUserModal(false);
                fetchAllUsers();
              }
            } catch (error) {
              console.error('Error in handleDeleteUser:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const handleInputChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Manual email sync function
  const handleManualEmailSync = async () => {
    try {
      setSyncingEmails(true);
      addDebugInfo('Starting manual email sync...');
      
      const success = await syncEmailWithDatabase();
      
      if (success) {
        addDebugInfo('Manual email sync completed successfully');
        showToast('Email sync completed successfully!', 'success');
      } else {
        addDebugInfo('Manual email sync failed');
        showToast('Email sync failed. Check console for details.', 'error');
      }
    } catch (error) {
      addDebugInfo(`Error in manual email sync: ${error.message}`);
      showToast(`Email sync error: ${error.message}`, 'error');
    } finally {
      setSyncingEmails(false);
    }
  };

  // Hiring functions
  const handleOpenHireModal = () => {
    setShowHireModal(true);
  };

  const handleCloseHireModal = () => {
    setShowHireModal(false);
  };

  const handleRefreshAfterHire = () => {
    // Refresh the users list after successful hire
    fetchAllUsers();
    showToast('Employee hired successfully! Refreshing user list...', 'success');
  };

  // Sidebar functions
  const handleToggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const handleShowMigration = () => {
    setShowMigration(true);
  };

  // Refresh function for pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAllUsers();
      await fetchDepartments();
      showToast('Data refreshed successfully!', 'success');
    } catch (error) {
      showToast('Failed to refresh data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate user counts for sidebar
  const getUserCounts = () => {
    const counts = {
      total: allUsers.length,
      admin: 0,
      hr: 0,
      manager: 0,
      employee: 0
    };

    allUsers.forEach(user => {
      const role = (user.role_name || user.role || '').toLowerCase();
      if (counts[role] !== undefined) {
        counts[role]++;
      }
    });

    return counts;
  };

  // Error boundary
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Admin Dashboard Error</Text>
        <Text style={styles.errorMessage}>Error: {error}</Text>
        <Text style={styles.errorMessage}>User: {user?.email}</Text>
        
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            setDebugInfo([]);
            fetchAdminProfile();
            fetchAllUsers();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={signOut}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {toast.visible && (
        <View style={styles.toastOverlay}>
          <View style={[styles.toast, styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      )}

      {/* Gmail-like Layout */}
      <View style={styles.gmailLayout}>
        {/* Sidebar */}
        <AdminSidebar
          isExpanded={sidebarExpanded}
          onToggle={handleToggleSidebar}
          onHireEmployee={handleOpenHireModal}
          onSettings={() => navigation.navigate('AdminSettings')}
          onMigration={handleShowMigration}
          onEmailSync={handleManualEmailSync}
          onLogout={signOut}
          userCounts={getUserCounts()}
        />

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Admin Dashboard</Text>
              {adminProfile && (
                <Text style={styles.welcomeText}>Welcome, {adminProfile.name || 'Admin'}</Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.headerLogoutButton}
              onPress={signOut}
            >
              <Text style={styles.headerLogoutIcon}>🚪</Text>
              <Text style={styles.headerLogoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content with ScrollView */}
          <ScrollView
            style={styles.mainScrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            bounces={Platform.OS !== 'web'}
            scrollEnabled={true}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Migration Section - Conditional */}
            {showMigration && (
              <View style={styles.migrationSection}>
                <View style={styles.migrationHeader}>
                  <Text style={styles.migrationTitle}>Metadata Migration</Text>
                  <TouchableOpacity
                    style={styles.closeMigrationButton}
                    onPress={() => setShowMigration(false)}
                  >
                    <Text style={styles.closeMigrationText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.migrationContainer}>
                  <MetadataMigration />
                </View>
              </View>
            )}

            {/* Search Section */}
            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <Text style={styles.searchResults}>
                {filteredUsers.length} of {allUsers.length} users
              </Text>
            </View>

            {/* Users List Header */}
            <View style={styles.usersHeader}>
              <Text style={styles.sectionTitle}>All Users</Text>
            </View>

            {/* Users List */}
            {filteredUsers.length > 0 ? (
              filteredUsers.map((item, index) => (
                <TouchableOpacity 
                  key={item.id || item.email || index.toString()}
                  style={styles.userItem}
                  onPress={() => handleUserSelect(item)}
                >
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name || 'No Name'}</Text>
                    <Text style={styles.userRole}>{item.role_name || item.role || 'No Role'}</Text>
                    <Text style={styles.userEmail}>{item.email || 'No Email'}</Text>
                  </View>
                  <View style={styles.userActions}>
                    <Text style={styles.editIcon}>✏️</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No users found matching your search' : 'No users found'}
                </Text>
              </View>
            )}

            {/* Employee Statistics Section */}
            <View style={styles.extraContent}>
              <Text style={styles.extraContentText}>
                📊 Employee Statistics
              </Text>
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{allUsers.length}</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{filteredUsers.length}</Text>
                  <Text style={styles.statLabel}>Filtered Results</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{getUserCounts().admin}</Text>
                  <Text style={styles.statLabel}>Admins</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{getUserCounts().hr}</Text>
                  <Text style={styles.statLabel}>HR Staff</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{getUserCounts().manager}</Text>
                  <Text style={styles.statLabel}>Managers</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{getUserCounts().employee}</Text>
                  <Text style={styles.statLabel}>Employees</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* User Details Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editing ? 'Edit User' : 'User Details'}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowUserModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedUser && adminProfile && (
              <ProfileForm
                ref={profileFormRef}
                profile={selectedUser}
                editedProfile={editedProfile}
                onInputChange={handleInputChange}
                userRole={adminProfile?.role_name || adminProfile?.role || 'admin'}
                isOwnProfile={selectedUser?.id === adminProfile?.id}
                editing={editing}
                onValidationError={showToast}
              />
            )}
            {selectedUser && !adminProfile && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={styles.loadingText}>Loading admin profile...</Text>
              </View>
            )}
          </ScrollView>

          {selectedUser && adminProfile && (
            <View style={styles.modalActions}>
              {editing ? (
                <>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                    disabled={saving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSaveUser}
                    disabled={saving}
                  >
                    <Text style={styles.saveButtonText}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteUser(selectedUser?.id)}
                    disabled={selectedUser?.id === adminProfile?.id}
                  >
                    <Text style={styles.deleteButtonText}>Delete User</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={handleEditUser}
                  >
                    <Text style={styles.editButtonText}>Edit User</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* Hire Employee Modal */}
      <HireEmployeeModal
        visible={showHireModal}
        onClose={handleCloseHireModal}
        onHire={handleRefreshAfterHire}
        departments={departments}
        loading={hiringLoading}
        userProfile={adminProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      overflowY: 'auto',
    }),
  },
  gmailLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  welcomeText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 4,
  },
  headerLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e8eaed',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  headerLogoutIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  headerLogoutText: {
    fontSize: 14,
    color: '#d93025',
    fontWeight: '500',
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' && {
      flex: 1,
      overflow: 'auto',
      maxHeight: 'calc(100vh - 140px)',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'auto',
      scrollbarColor: '#dadce0 #f1f3f4',
    }),
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 50,
    ...(Platform.OS === 'web' && {
      paddingBottom: 100,
    }),
  },
  migrationSection: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginVertical: 16,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  migrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  migrationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
  },
  closeMigrationButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
  },
  closeMigrationText: {
    color: '#5f6368',
    fontSize: 14,
    fontWeight: 'bold',
  },
  migrationContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  searchSection: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  searchResults: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 8,
    textAlign: 'right',
  },
  usersHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  emptyContainer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#5f6368',
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },

  userItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: '#e8eaed',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
  },
  userRole: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  userActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 16,
  },
  editIcon: {
    fontSize: 16,
  },
  extraContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#fff',
    marginTop: 16,
  },
  extraContentText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minWidth: 100,
    flex: 1,
    maxWidth: '48%',
    borderWidth: 1,
    borderColor: '#e8eaed',
    ...(Platform.OS === 'web' && {
      minWidth: '30%',
      maxWidth: '32%',
    }),
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '400',
    color: '#1a73e8',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#5f6368',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#5f6368',
  },
  errorContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#d93025',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#d93025',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#d93025',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#202124',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 16,
  },
  closeButtonText: {
    color: '#5f6368',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8eaed',
  },
  editButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    marginLeft: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#34a853',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#5f6368',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#d93025',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Toast styles
  toastOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toast: {
    backgroundColor: '#333',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
    maxWidth: '90%',
    minWidth: 200,
  },
  toastWarning: {
    backgroundColor: '#ff9800',
  },
  toastSuccess: {
    backgroundColor: '#34a853',
  },
  toastError: {
    backgroundColor: '#d93025',
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});