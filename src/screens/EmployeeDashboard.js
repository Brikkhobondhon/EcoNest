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
import { ProfileEditor } from '../utils/profileEditor';

export default function EmployeeDashboard() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'warning' });
  const [mobileValidationTimeout, setMobileValidationTimeout] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Date picker state
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  // Function to parse date string into components
  const parseDateComponents = (dateString) => {
    if (!dateString) return { year: '', month: '', day: '' };
    const date = new Date(dateString);
    return {
      year: date.getFullYear().toString(),
      month: (date.getMonth() + 1).toString(), // getMonth() returns 0-11
      day: date.getDate().toString()
    };
  };

  // Function to combine date components into ISO date string
  const combineDateComponents = (year, month, day) => {
    if (!year || !month || !day) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Function to get days in a month (handles leap years)
  const getDaysInMonth = (month, year) => {
    if (!month || !year) return 31;
    return new Date(year, month, 0).getDate();
  };

  // Generate dropdown options
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 80; year <= currentYear; year++) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    return years.reverse(); // Most recent years first
  };

  const generateMonthOptions = () => {
    const months = [
      { value: '1', label: 'January' },
      { value: '2', label: 'February' },
      { value: '3', label: 'March' },
      { value: '4', label: 'April' },
      { value: '5', label: 'May' },
      { value: '6', label: 'June' },
      { value: '7', label: 'July' },
      { value: '8', label: 'August' },
      { value: '9', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' }
    ];
    return months;
  };

  const generateDayOptions = () => {
    const maxDays = getDaysInMonth(birthMonth, birthYear);
    const days = [];
    for (let day = 1; day <= maxDays; day++) {
      days.push({ value: day.toString(), label: day.toString() });
    }
    return days;
  };

  // Handle date picker changes
  const handleDateChange = (component, value) => {
    let newYear = birthYear;
    let newMonth = birthMonth;
    let newDay = birthDay;
    
    if (component === 'year') {
      newYear = value;
      setBirthYear(value);
      // If current day is invalid for the new year/month, reset to 1
      if (newMonth && newDay) {
        const maxDays = getDaysInMonth(newMonth, value);
        if (parseInt(newDay) > maxDays) {
          newDay = '1';
          setBirthDay('1');
        }
      }
    } else if (component === 'month') {
      newMonth = value;
      setBirthMonth(value);
      // If current day is invalid for the new month, reset to 1
      if (newYear && newDay) {
        const maxDays = getDaysInMonth(value, newYear);
        if (parseInt(newDay) > maxDays) {
          newDay = '1';
          setBirthDay('1');
        }
      }
    } else if (component === 'day') {
      newDay = value;
      setBirthDay(value);
    }
    
    // Update the editedProfile with the combined date
    const combinedDate = combineDateComponents(newYear, newMonth, newDay);
    if (combinedDate) {
      setEditedProfile(prev => ({
        ...prev,
        date_of_birth: combinedDate
      }));
    }
  };

  // Function to show toast notifications
  const showToast = (message, type = 'warning') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'warning' });
    }, 4000);
  };

  // Function to clean up malformed URLs in database
  const cleanupMalformedUrl = async () => {
    try {
      if (userProfile?.photo_url && userProfile.photo_url.includes('blob:')) {
        console.log('🧹 Cleaning up malformed URL in database');
        console.log('❌ Malformed URL:', userProfile.photo_url);
        
        // Update database to remove malformed photo_url
        const { error } = await supabase
          .from('user_profiles')
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

  useEffect(() => {
    if (userProfile) {
      setEditedProfile(userProfile);
      
      // Initialize date picker components
      const dateComponents = parseDateComponents(userProfile.date_of_birth);
      setBirthYear(dateComponents.year);
      setBirthMonth(dateComponents.month);
      setBirthDay(dateComponents.day);
      
      // Removed automatic testDeleteImage call - this was deleting images!
      // if (userProfile.photo_url) {
      //   testDeleteImage(userProfile.photo_url);
      // }
    }
  }, [userProfile]);

  // Cleanup mobile validation timeout on unmount
  useEffect(() => {
    return () => {
      if (mobileValidationTimeout) {
        clearTimeout(mobileValidationTimeout);
      }
    };
  }, [mobileValidationTimeout]);

  // Auto-cleanup malformed URLs when profile is loaded
  useEffect(() => {
    // Removed automatic cleanupMalformedUrl call - this was removing photo URLs!
    // cleanupMalformedUrl();
  }, [userProfile?.photo_url]);

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
    console.log('🔥 handleSave function called');
    console.log('📊 Current userProfile:', userProfile);
    console.log('✏️ Current editedProfile:', editedProfile);
    
    setSaving(true);
    
    try {
      // Get current user's role from profile
      const currentUserRole = userProfile.role_name || userProfile.role || 'employee';
      console.log('👤 Current user role:', currentUserRole);
      
      // Use the common ProfileEditor to save the profile
      const result = await ProfileEditor.saveProfile({
        originalProfile: userProfile,
        editedProfile: editedProfile,
        currentUserRole: currentUserRole,
        isOwnProfile: true, // Employee is always editing their own profile
        onSuccess: (updatedProfile) => {
          console.log('✅ ProfileEditor success callback called');
          // Update local state immediately
          setUserProfile(updatedProfile);
          setEditedProfile(updatedProfile);
          setEditing(false);
          
          // Show success indicator
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
          
          // Refresh profile data from the database
          setTimeout(async () => {
            await fetchUserProfile();
          }, 1000);
        },
        onError: (error) => {
          console.error('❌ ProfileEditor error callback:', error);
          
          // Check if it's a mobile number validation error
          if (error.message && error.message.includes('mobile number')) {
            showToast('Please enter a valid mobile number (minimum 7 digits)', 'warning');
          } else {
            // For other errors, show generic alert
            Alert.alert('Validation Error', error.message || 'An error occurred while saving your profile.');
          }
        }
      });
      
      console.log('📋 ProfileEditor result:', result);
      
      // If save was successful, log the updated fields
      if (result.success) {
        console.log('🎉 Updated fields:', result.updatedFields);
      }
      
    } catch (error) {
      console.error('💥 Unexpected error in handleSave:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving your profile.');
    } finally {
      console.log('🏁 handleSave finally block');
      setSaving(false);
    }
  };

  const handleInputChange = useCallback((field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Real-time validation for mobile number with debouncing
    if (field === 'mobile_no') {
      // Clear existing timeout
      if (mobileValidationTimeout) {
        clearTimeout(mobileValidationTimeout);
      }
      
      // Only validate if there's actual content
      if (value && value.trim() !== '') {
        // Set new timeout to validate after user stops typing
        const timeoutId = setTimeout(() => {
          const isValid = ProfileEditor.isValidMobile(value);
          if (!isValid) {
            showToast('Please enter a valid mobile number (minimum 7 digits)', 'warning');
          }
        }, 1000); // Wait 1 second after user stops typing
        
        setMobileValidationTimeout(timeoutId);
      }
    }
  }, [mobileValidationTimeout]);

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
        
        // Automatically save the photo_url to database
        console.log('🔄 Auto-saving photo_url to database...');
        try {
          const { error: dbError } = await supabase
            .from('user_profiles')
            .update({ photo_url: urlData.publicUrl })
            .eq('id', userProfile.id);
          
          if (dbError) {
            console.error('❌ Error saving photo_url to database:', dbError);
            // Update userProfile state for immediate display
            setUserProfile(prev => ({
              ...prev,
              photo_url: urlData.publicUrl
            }));
            showToast('Image uploaded but not saved to database. Please click Save Changes.', 'warning');
          } else {
            console.log('✅ Photo URL saved to database successfully');
            // Update userProfile state to reflect database changes
            setUserProfile(prev => ({
              ...prev,
              photo_url: urlData.publicUrl
            }));
            showToast('Profile image uploaded and saved successfully!', 'success');
          }
        } catch (saveError) {
          console.error('💥 Unexpected error saving to database:', saveError);
          showToast('Image uploaded but not saved to database. Please click Save Changes.', 'warning');
        }
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

  // Custom Dropdown Component for Date Picker
  const CustomDropdown = ({ label, value, options, onValueChange, placeholder = "Select..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <View style={styles.expandableDropdown}>
        <TouchableOpacity 
          style={styles.expandableButton}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text style={[styles.expandableText, !value && styles.expandablePlaceholder]}>
            {value ? (options.find(opt => opt.value === value)?.label || value) : placeholder}
          </Text>
          <Text style={styles.expandableArrow}>{isOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {isOpen && (
          <View style={styles.expandableContent}>
            <View style={styles.expandableList}>
              <ScrollView 
                style={styles.expandableScrollView}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.expandableOption,
                      option.value === value && styles.expandableOptionSelected
                    ]}
                    onPress={() => {
                      onValueChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <Text style={[
                      styles.expandableOptionText,
                      option.value === value && styles.expandableOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    );
  };

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
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerRow}>
                      <View style={styles.datePickerColumn}>
                        <Text style={styles.datePickerLabel}>Day</Text>
                        <CustomDropdown
                          value={birthDay}
                          options={generateDayOptions()}
                          onValueChange={(value) => handleDateChange('day', value)}
                          placeholder="Day"
                        />
                      </View>
                      <View style={styles.datePickerColumn}>
                        <Text style={styles.datePickerLabel}>Month</Text>
                        <CustomDropdown
                          value={birthMonth}
                          options={generateMonthOptions()}
                          onValueChange={(value) => handleDateChange('month', value)}
                          placeholder="Month"
                        />
                      </View>
                      <View style={styles.datePickerColumn}>
                        <Text style={styles.datePickerLabel}>Year</Text>
                        <CustomDropdown
                          value={birthYear}
                          options={generateYearOptions()}
                          onValueChange={(value) => handleDateChange('year', value)}
                          placeholder="Year"
                        />
                      </View>
                    </View>
                  </View>
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

      {/* Toast Notification */}
      {toast.visible && (
        <View style={styles.toastContainer}>
          <View style={[
            styles.toast, 
            toast.type === 'warning' && styles.toastWarning,
            toast.type === 'success' && styles.toastSuccess
          ]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
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
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden', // Hide horizontal overflow only
      overflowY: 'auto',   // Allow vertical scrolling
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
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 1000,
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
  },
  toastWarning: {
    backgroundColor: '#ff9800',
  },
  toastSuccess: {
    backgroundColor: '#4CAF50', // A green color for success
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
    expandableDropdown: {
    marginBottom: 16,
  },
  expandableButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  expandableText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  expandablePlaceholder: {
    color: '#999',
    fontStyle: 'italic',
  },
  expandableArrow: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  expandableContent: {
    marginTop: 4,
  },
  expandableList: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expandableScrollView: {
    maxHeight: 300,
  },
  expandableOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
    minHeight: 44,
  },
  expandableOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderBottomColor: '#007AFF',
  },
  expandableOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  expandableOptionTextSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  datePickerContainer: {
    marginTop: 8,
    position: 'relative',
    zIndex: 1,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 1,
  },
  datePickerColumn: {
    flex: 1,
    marginHorizontal: 5,
    position: 'relative',
    zIndex: 1,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    textAlign: 'center',
  },
}); 