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
  FlatList,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

export default function EmployeeDashboard() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Function to clean up malformed URLs in database
  const cleanupMalformedUrl = async () => {
    try {
      if (userProfile?.photo_url && userProfile.photo_url.includes('blob:')) {
        console.log('🧹 Cleaning up malformed URL in database');
        console.log('❌ Malformed URL:', userProfile.photo_url);
        
        // Update database to remove malformed photo_url
        const { error } = await supabase
          .from('users')
          .update({ photo_url: null })
          .eq('id', userProfile.id);
        
        if (error) {
          console.error('Error cleaning up malformed URL:', error);
        } else {
          console.log('✅ Malformed URL cleaned up successfully');
          // Refresh profile data
          await fetchUserProfile();
        }
      }
    } catch (error) {
      console.error('Error in cleanupMalformedUrl:', error);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Auto-cleanup malformed URLs when profile is loaded
  useEffect(() => {
    if (userProfile?.photo_url && userProfile.photo_url.includes('blob:')) {
      console.log('🔍 Detected malformed URL, cleaning up automatically...');
      cleanupMalformedUrl();
    }
  }, [userProfile]);

  // Reset image error state when user profile photo URL changes
  useEffect(() => {
    setImageLoadError(false);
  }, [userProfile?.photo_url]);

  // Manual test function for debugging (can be called from console)
  const testDeleteImage = async (imageUrl) => {
    console.log('🧪 Manual test: trying to delete image:', imageUrl);
    await deletePreviousImageByUrl(imageUrl);
  };

  // Expose functions to global scope for testing
  if (typeof window !== 'undefined') {
    window.testDeleteImage = testDeleteImage;
    window.cleanupMalformedUrl = cleanupMalformedUrl;
  }



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
      
      // Validate required fields
      if (!editedProfile.name || !editedProfile.name.trim()) {
        Alert.alert('Validation Error', 'Name is required');
        return;
      }

      // Prepare update data (exclude read-only fields)
      const updateData = {
        name: editedProfile.name?.trim(),
        mobile_no: editedProfile.mobile_no?.trim() || null,
        secondary_mobile_no: editedProfile.secondary_mobile_no?.trim() || null,
        personal_email: editedProfile.personal_email?.trim() || null,
        official_email: editedProfile.official_email?.trim() || null,
        date_of_birth: editedProfile.date_of_birth || null,
        nationality: editedProfile.nationality?.trim() || null,
        nid_no: editedProfile.nid_no?.trim() || null,
        passport_no: editedProfile.passport_no?.trim() || null,
        current_address: editedProfile.current_address?.trim() || null,
        photo_url: editedProfile.photo_url || null,
        updated_at: new Date().toISOString()
      };

      // Try multiple update strategies to ensure save works
      let result = null;
      let updateMethod = '';

      // Strategy 1: Update by id (most reliable - using UUID primary key)
      if (userProfile.id) {
        console.log('Attempting update by id:', userProfile.id);
        result = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userProfile.id)
          .select();
        updateMethod = 'id';
      }

      // Strategy 2: Update by email if id fails
      if (result?.error && userProfile.email) {
        console.log('ID update failed, trying email:', userProfile.email);
        result = await supabase
          .from('users')
          .update(updateData)
          .eq('email', userProfile.email)
          .select();
        updateMethod = 'email';
      }

      // Strategy 3: Update by user_id if previous methods fail
      if (result?.error && userProfile.user_id) {
        console.log('Previous updates failed, trying user_id:', userProfile.user_id);
        result = await supabase
          .from('users')
          .update(updateData)
          .eq('user_id', userProfile.user_id)
          .select();
        updateMethod = 'user_id';
      }

      console.log(`Update result (${updateMethod}):`, result);

      if (result?.error) {
        console.error('All update methods failed:', result.error);
        
        // Try the custom SQL function as last resort
        console.log('Attempting custom SQL function update...');
        const { data: sqlResult, error: sqlError } = await supabase.rpc('update_user_profile', {
          user_email: userProfile.email,
          profile_data: updateData
        });
        
        if (sqlError) {
          console.error('SQL function also failed:', sqlError);
          Alert.alert('Error', `Failed to update profile: ${result.error.message}\n\nPlease check your internet connection and try again.`);
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
        console.log('Profile updated successfully:', result.data[0]);
        
        // Update local state immediately
        const updatedProfile = { ...userProfile, ...updateData };
        setUserProfile(updatedProfile);
        setEditedProfile(updatedProfile);
        setEditing(false);
        
        // Show success indicator
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        
        Alert.alert('Success', 'Profile updated successfully!');
        
        // Refresh profile data from the database
        setTimeout(async () => {
          await fetchUserProfile();
        }, 1000);
        
      } else {
        console.warn('No data returned from update operation');
        Alert.alert('Warning', 'Update may have failed. Please refresh to check if changes were saved.');
        
        // Still exit edit mode
        setEditing(false);
        
        // Refresh profile data
        await fetchUserProfile();
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', `Failed to update profile: ${error.message}`);
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

  const pickImage = async () => {
    try {
      console.log('pickImage function called');
      console.log('Platform:', Platform.OS);
      
      // For web, use HTML input element
      if (Platform.OS === 'web') {
        console.log('Using web file picker');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (event) => {
          const file = event.target.files[0];
          if (file) {
            console.log('File selected:', file);
            
            // Check file size (1MB = 1,048,576 bytes)
            if (file.size > 1048576) {
              Alert.alert('File Too Large', 'Please select an image smaller than 1MB.');
              return;
            }
            
            // Create a file URL for the image
            const fileURL = URL.createObjectURL(file);
            console.log('File URL created:', fileURL);
            
                         // Create asset object similar to expo-image-picker
             const asset = {
               uri: fileURL,
               type: file.type,
               fileSize: file.size,
               width: 0,
               height: 0,
               fileName: file.name  // Add original filename for proper extension extraction
             };
            
            setSelectedImage(asset);
            
            // Upload image immediately
            await uploadProfileImage(asset);
          }
        };
        input.click();
        return;
      }
      
      // For mobile, use expo-image-picker
      console.log('Using expo-image-picker for mobile');
      
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        base64: false,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (1MB = 1,048,576 bytes)
        if (asset.fileSize && asset.fileSize > 1048576) {
          Alert.alert('File Too Large', 'Please select an image smaller than 1MB.');
          return;
        }

        setSelectedImage(asset);
        
        // Upload image immediately
        await uploadProfileImage(asset);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const deletePreviousImageByUrl = async (photoUrl) => {
    try {
      console.log('=== DELETE PREVIOUS IMAGE DEBUG ===');
      console.log('🗑️ deletePreviousImageByUrl function called');
      console.log('photoUrl to delete:', photoUrl);
      
      if (!photoUrl) {
        console.log('❌ No previous image URL provided');
        return;
      }
      
      // Try multiple URL patterns for Supabase storage
      const urlPatterns = [
        /\/storage\/v1\/object\/public\/profile-images\/(.+)$/,  // Standard pattern
        /\/profile-images\/(.+)$/,                                // Simplified pattern
        /profile-images\/(.+)$/,                                  // Without leading slash
        /\/object\/public\/profile-images\/(.+)$/,                // Alternative pattern
      ];
      
      let fileName = null;
      let matchedPattern = null;
      
      for (const pattern of urlPatterns) {
        const match = photoUrl.match(pattern);
        if (match) {
          fileName = match[1];
          matchedPattern = pattern.toString();
          break;
        }
      }
      
      console.log('URL patterns tried:', urlPatterns.length);
      console.log('Matched pattern:', matchedPattern);
      console.log('Extracted filename:', fileName);
      
      if (!fileName) {
        console.log('Could not extract filename from URL:', photoUrl);
        console.log('URL structure not recognized, skipping deletion');
        return;
      }
      
      console.log('🗑️ Attempting to delete file:', fileName);
      console.log('🔗 From bucket: profile-images');
      
      // Delete from Supabase storage
      const { data, error } = await supabase.storage
        .from('profile-images')
        .remove([fileName]);
      
      console.log('📊 Delete operation result:', { data, error });
      
      if (error) {
        console.error('❌ Error deleting previous image:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        // Don't throw error, just log it - we still want to upload the new image
      } else {
        console.log('✅ Previous image deleted successfully');
        console.log('📄 Delete response data:', data);
        
        // Verify deletion worked
        if (data && data.length > 0) {
          console.log('🎯 Files confirmed deleted:', data.length);
          data.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.name || fileName}`);
          });
        } else {
          console.log('⚠️ No files were reported as deleted');
        }
      }
    } catch (error) {
      console.error('Error in deletePreviousImage:', error);
      // Don't throw error, just log it - we still want to upload the new image
    }
  };

  const uploadProfileImage = async (imageAsset) => {
    try {
      setUploadingImage(true);
      
      // Save the current photo URL before starting the upload (for cleanup later)
      const previousPhotoUrl = userProfile?.photo_url; // Always use userProfile (database state)
      console.log('Previous photo URL saved for cleanup:', previousPhotoUrl);
      
      // Create a unique filename
      const timestamp = Date.now();
      let fileExtension = 'jpg'; // default
      
      if (Platform.OS === 'web' && imageAsset.fileName) {
        // For web, use the original filename extension
        fileExtension = imageAsset.fileName.split('.').pop() || 'jpg';
      } else if (imageAsset.type) {
        // For mobile or when type is available, extract from MIME type
        const mimeToExt = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg', 
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp'
        };
        fileExtension = mimeToExt[imageAsset.type] || 'jpg';
      } else {
        // Last resort: try to get from URI (for mobile)
        const uriParts = imageAsset.uri.split('.');
        if (uriParts.length > 1 && !imageAsset.uri.includes('blob:')) {
          fileExtension = uriParts.pop();
        }
      }
      
      const fileName = `profile_${userProfile.id}_${timestamp}.${fileExtension}`;
      console.log('📁 Generated filename:', fileName);
      console.log('📎 File extension:', fileExtension);
      console.log('🔗 Original URI:', imageAsset.uri);
      
      console.log('Starting upload for file:', fileName);
      console.log('Image asset:', imageAsset);
      
      let blob;
      
      // Handle web vs mobile differently
      if (Platform.OS === 'web' && imageAsset.uri.startsWith('blob:')) {
        console.log('Processing web blob URL');
        // For web, the URI is already a blob URL, fetch it
        const response = await fetch(imageAsset.uri);
        if (!response.ok) {
          throw new Error('Failed to fetch image data from blob URL');
        }
        blob = await response.blob();
      } else {
        console.log('Processing mobile image URI');
        // For mobile, we need to use fetch to get the blob
        const response = await fetch(imageAsset.uri);
        if (!response.ok) {
          throw new Error('Failed to fetch image data');
        }
        blob = await response.blob();
      }
      
      console.log('Blob created, size:', blob.size, 'type:', blob.type);
      
      // Upload to Supabase Storage using blob
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageAsset.type || blob.type || 'image/jpeg',
        });

      console.log('Upload result:', { data, error });

      if (error) {
        console.error('Storage upload error:', error);
        Alert.alert('Upload Failed', `Failed to upload image: ${error.message}`);
        return;
      }

      console.log('Upload successful, getting public URL...');

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      console.log('Public URL data:', urlData);

      if (urlData?.publicUrl) {
        // Update local state with new image URL
        setEditedProfile(prev => ({
          ...prev,
          photo_url: urlData.publicUrl
        }));
        
        console.log('Profile updated with new image URL:', urlData.publicUrl);
        
        // Now delete the previous image after successful upload
        if (previousPhotoUrl) {
          await deletePreviousImageByUrl(previousPhotoUrl);
        }
        
        Alert.alert('Success', 'Profile image uploaded successfully! Remember to save your changes.');
      } else {
        console.error('Failed to get public URL');
        Alert.alert('Upload Error', 'Failed to get image URL. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', `Failed to upload image: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const getProfileImageOrInitials = () => {
    const imageUrl = editedProfile?.photo_url || userProfile?.photo_url;
    
    console.log('=== IMAGE LOADING DEBUG ===');
    console.log('editedProfile.photo_url:', editedProfile?.photo_url);
    console.log('userProfile.photo_url:', userProfile?.photo_url);
    console.log('Final imageUrl:', imageUrl);
    console.log('imageLoadError:', imageLoadError);
    
    // Generate initials from name
    const name = editedProfile?.name || userProfile?.name;
    const initials = name
      ?.split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'U';
    
    const showInitials = !imageUrl || imageLoadError;
    
    if (showInitials) {
      console.log('🔤 Showing initials because:', !imageUrl ? 'No image URL' : 'Image load error');
      return (
        <View style={styles.profileImagePlaceholder}>
          <Text style={styles.profileImageInitials}>{initials}</Text>
        </View>
      );
    } else {
      // Add cache-busting parameter to prevent browser caching
      const cacheBustingUrl = `${imageUrl}?t=${Date.now()}`;
      console.log('🖼️ Attempting to load image from:', cacheBustingUrl);
      
      return (
        <Image 
          source={{ uri: cacheBustingUrl }} 
          style={styles.profileImage}
          onError={(error) => {
            console.log('❌ Profile image failed to load from:', cacheBustingUrl);
            console.log('Error details:', error);
            console.log('🔄 Setting imageLoadError to true');
            setImageLoadError(true);
          }}
          onLoad={() => {
            console.log('✅ Profile image loaded successfully from:', cacheBustingUrl);
            setImageLoadError(false);
          }}
        />
      );
    }
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
        keyboardShouldPersistTaps="handled"
        bounces={Platform.OS !== 'web'}
        scrollEnabled={true}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileMainContent}>
            {/* Profile Image */}
            <View style={styles.profileImageContainer}>
              {getProfileImageOrInitials()}
            </View>
            
            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              <Text style={styles.profileRole}>{userProfile.role_name}</Text>
              <Text style={styles.profileDepartment}>{userProfile.department_name}</Text>
              {saveSuccess && (
                <Text style={styles.successMessage}>✓ Profile saved successfully!</Text>
              )}
            </View>
          </View>
          
          {/* Edit Button */}
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
                  {saving ? 'Saving...' : 'Save Changes'}
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
                 
                 {/* Profile Photo Section */}
                 <View style={styles.fieldContainer}>
                   <Text style={styles.fieldLabel}>Profile Photo</Text>
                   <View style={styles.photoSection}>
                     <View style={styles.currentPhotoContainer}>
                       {getProfileImageOrInitials()}
                     </View>
                     <TouchableOpacity 
                       style={[styles.changePhotoButton, uploadingImage && styles.disabledButton]} 
                       onPress={pickImage}
                       disabled={uploadingImage || saving}
                     >
                       <Text style={styles.changePhotoButtonText}>
                         {uploadingImage ? 'Uploading...' : 'Change Photo'}
                       </Text>
                     </TouchableOpacity>
                   </View>
                   <Text style={styles.photoHint}>
                     Select an image smaller than 1MB. Square images work best.
                   </Text>
                 </View>
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
  profileMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
  successMessage: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginTop: 8,
    backgroundColor: '#d4edda',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
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
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  currentPhotoContainer: {
    marginRight: 16,
  },
  changePhotoButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  changePhotoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  photoHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
}); 