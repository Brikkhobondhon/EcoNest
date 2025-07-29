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
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { ProfileEditor } from '../utils/profileEditor';
import { ProfileForm } from '../components/ProfileForm';

export default function AdminDashboard({ navigation }) {
  const { user, signOut } = useAuth();
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('AdminSettings')}
          >
            <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={signOut}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        bounces={Platform.OS !== 'web'}
        scrollEnabled={true}
      >
        {/* Admin Info */}
        {adminProfile && (
          <View style={styles.adminInfo}>
            <Text style={styles.adminName}>Welcome, {adminProfile.name || 'Admin'}</Text>
            <Text style={styles.adminRole}>{adminProfile.role_name || adminProfile.role || 'Admin'}</Text>
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

        {/* Users List */}
        <View style={styles.usersSection}>
          <Text style={styles.sectionTitle}>All Users</Text>
          
          {filteredUsers.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchQuery ? 'No users found matching your search' : 'No users found'}
            </Text>
          ) : (
            <View style={styles.usersContainer}>
              {filteredUsers.map((item) => (
                <TouchableOpacity 
                  key={item.id || item.email}
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
              ))}
            </View>
          )}
        </View>

        {/* Extra content to ensure scrolling */}
        <View style={styles.extraContent}>
          <Text style={styles.extraContentText}>
            📊 Dashboard Statistics
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
          </View>
        </View>
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      overflowY: 'auto',
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  adminInfo: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexShrink: 0,
  },
  adminName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#155724',
  },
  adminRole: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
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
      scrollbarColor: '#888 #f8f9fa',
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
    minHeight: '100%',
    ...(Platform.OS === 'web' && {
      paddingBottom: 100,
    }),
  },
  searchSection: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  searchResults: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  usersSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 20,
  },
  usersContainer: {
    width: '100%',
  },
  extraContent: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  extraContentText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minWidth: 100,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4a90e2',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  userRole: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  userActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 15,
  },
  editIcon: {
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  editButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  },
  toast: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '90%',
    minWidth: 200,
  },
  toastWarning: {
    backgroundColor: '#ff9800',
  },
  toastSuccess: {
    backgroundColor: '#4CAF50',
  },
  toastError: {
    backgroundColor: '#f44336',
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});