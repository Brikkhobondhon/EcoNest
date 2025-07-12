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
  FlatList
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

export default function EmployeeDashboard() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Error', 'Failed to fetch profile data');
      } else {
        console.log('User profile data:', data);
        setUserProfile(data);
        setEditedProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      Alert.alert('Error', 'Failed to fetch profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditedProfile({ ...userProfile });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditedProfile({ ...userProfile });
    setEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare update data (exclude read-only fields)
      const updateData = {
        name: editedProfile.name,
        mobile_no: editedProfile.mobile_no,
        secondary_mobile_no: editedProfile.secondary_mobile_no,
        personal_email: editedProfile.personal_email,
        official_email: editedProfile.official_email,
        date_of_birth: editedProfile.date_of_birth,
        nationality: editedProfile.nationality,
        nid_no: editedProfile.nid_no,
        passport_no: editedProfile.passport_no,
        current_address: editedProfile.current_address,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userProfile.id)
        .select();

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile');
      } else {
        Alert.alert('Success', 'Profile updated successfully');
        setUserProfile({ ...userProfile, ...updateData });
        setEditing(false);
        // Refresh profile data
        await fetchUserProfile();
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = useCallback((field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

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

  const ReadOnlyField = ({ label, value, style = {} }) => (
    <View style={[styles.fieldContainer, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.input, styles.readOnlyInput]}>
        <Text style={styles.readOnlyText}>{value || 'Not provided'}</Text>
      </View>
    </View>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={styles.headerSubtitle}>Employee Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userProfile.name}</Text>
            <Text style={styles.profileRole}>{userProfile.role_name}</Text>
            <Text style={styles.profileDepartment}>{userProfile.department_name}</Text>
          </View>
          {!editing ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
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

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          {/* Read-only fields */}
          <ReadOnlyField label="User ID" value={userProfile.user_id} />
          <ReadOnlyField label="Designation" value={userProfile.designation} />
          <ReadOnlyField label="Department" value={userProfile.department_name} />
          <ReadOnlyField label="Role" value={userProfile.role_name} />
          
          {/* Editable fields */}
                       {editing ? (
               <EditableField
                 label="Full Name"
                 value={editedProfile.name}
                 onChangeText={(text) => handleInputChange('name', text)}
                 placeholder="Enter your full name"
                 fieldKey="name_scroll"
               />
             ) : (
               <ReadOnlyField label="Full Name" value={userProfile.name} />
             )}
        </View>

        {/* Contact Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {editing ? (
            <>
                               <EditableField
                   label="Mobile Number"
                   value={editedProfile.mobile_no}
                   onChangeText={(text) => handleInputChange('mobile_no', text)}
                   placeholder="Enter mobile number"
                   keyboardType="phone-pad"
                   fieldKey="mobile_no_scroll"
                 />
                 <EditableField
                   label="Secondary Mobile"
                   value={editedProfile.secondary_mobile_no}
                   onChangeText={(text) => handleInputChange('secondary_mobile_no', text)}
                   placeholder="Enter secondary mobile number"
                   keyboardType="phone-pad"
                   fieldKey="secondary_mobile_no_scroll"
                 />
                 <EditableField
                   label="Personal Email"
                   value={editedProfile.personal_email}
                   onChangeText={(text) => handleInputChange('personal_email', text)}
                   placeholder="Enter personal email"
                   keyboardType="email-address"
                   fieldKey="personal_email_scroll"
                 />
                 <EditableField
                   label="Official Email"
                   value={editedProfile.official_email}
                   onChangeText={(text) => handleInputChange('official_email', text)}
                   placeholder="Enter official email"
                   keyboardType="email-address"
                   fieldKey="official_email_scroll"
                 />
            </>
          ) : (
            <>
              <ReadOnlyField label="Mobile Number" value={userProfile.mobile_no} />
              <ReadOnlyField label="Secondary Mobile" value={userProfile.secondary_mobile_no} />
              <ReadOnlyField label="Personal Email" value={userProfile.personal_email} />
              <ReadOnlyField label="Official Email" value={userProfile.official_email} />
            </>
          )}
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {editing ? (
            <>
                              <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Date of Birth</Text>
                  <TextInput
                    key="date_of_birth"
                    style={styles.input}
                    value={formatDateForInput(editedProfile.date_of_birth)}
                    onChangeText={(text) => handleInputChange('date_of_birth', text)}
                    placeholder="YYYY-MM-DD"
                    autoCorrect={false}
                    autoCapitalize="none"
                    blurOnSubmit={true}
                  />
                </View>
                               <EditableField
                   label="Nationality"
                   value={editedProfile.nationality}
                   onChangeText={(text) => handleInputChange('nationality', text)}
                   placeholder="Enter nationality"
                   fieldKey="nationality_scroll"
                 />
                 <EditableField
                   label="National ID (NID)"
                   value={editedProfile.nid_no}
                   onChangeText={(text) => handleInputChange('nid_no', text)}
                   placeholder="Enter NID number"
                   fieldKey="nid_no_scroll"
                 />
                 <EditableField
                   label="Passport Number"
                   value={editedProfile.passport_no}
                   onChangeText={(text) => handleInputChange('passport_no', text)}
                   placeholder="Enter passport number"
                   fieldKey="passport_no_scroll"
                 />
                 <EditableField
                   label="Current Address"
                   value={editedProfile.current_address}
                   onChangeText={(text) => handleInputChange('current_address', text)}
                   placeholder="Enter current address"
                   multiline={true}
                   fieldKey="current_address_scroll"
                 />
            </>
          ) : (
            <>
              <ReadOnlyField label="Date of Birth" value={formatDate(userProfile.date_of_birth)} />
              <ReadOnlyField label="Nationality" value={userProfile.nationality} />
              <ReadOnlyField label="National ID (NID)" value={userProfile.nid_no} />
              <ReadOnlyField label="Passport Number" value={userProfile.passport_no} />
              <ReadOnlyField label="Current Address" value={userProfile.current_address} />
            </>
          )}
        </View>

        {/* Account Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <ReadOnlyField label="Login Email" value={userProfile.email} />
          <ReadOnlyField 
            label="First Login Status" 
            value={userProfile.is_first_login ? 'Pending' : 'Completed'} 
          />
          <ReadOnlyField 
            label="Account Created" 
            value={formatDate(userProfile.created_at)} 
          />
          <ReadOnlyField 
            label="Last Updated" 
            value={formatDate(userProfile.updated_at)} 
          />
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomPadding} />
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
  scrollContainer: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: 'calc(100vh - 120px)', // Subtract header height
      overflow: 'auto',
    }),
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    ...(Platform.OS === 'web' && {
      flexGrow: 1,
    }),
  },
  profileHeader: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  profileDepartment: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
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
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
}); 