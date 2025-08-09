import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform
} from 'react-native';
import { supabase } from '../config/supabase';

/**
 * AuthChangeModal - Clean implementation for email and password changes
 * 
 * Requirements:
 * 1. Email changes require email verification BEFORE database update
 * 2. Password changes are immediate with confirmation
 * 3. Clean, simple UI with clear instructions
 * 4. Proper error handling and user feedback
 */
export default function AuthChangeModal({ visible, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('email');
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetForm = () => {
    setCurrentPassword('');
    setNewEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setActiveTab('email');
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  // Verify current password
  const verifyCurrentPassword = async (currentUser) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword
    });
    
    if (error) {
      throw new Error('Current password is incorrect');
    }
  };

  /**
   * Handle Email Change - Verification First Approach
   * 1. Verify current password
   * 2. Send verification email to new address
   * 3. Database will be updated ONLY after user confirms email
   */
  const handleEmailChange = async () => {
    try {
      // Validation
      if (!currentPassword.trim()) {
        Alert.alert('Error', 'Please enter your current password');
        return;
      }
      
      if (!newEmail.trim()) {
        Alert.alert('Error', 'Please enter a new email address');
        return;
      }
      
      if (!validateEmail(newEmail)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      setLoading(true);

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Unable to get current user information');
      }

      // Verify current password
      await verifyCurrentPassword(currentUser);

      // Send verification email (does NOT update database yet)
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) {
        throw updateError;
      }

      // Success - show verification message
      Alert.alert(
        'Verification Email Sent!',
        `A verification email has been sent to: ${newEmail}\n\nPlease check your email and click the verification link to complete the email change.\n\nYour database will be updated automatically after verification.\n\nUntil then, continue using your current email: ${currentUser.email}`,
        [
          {
            text: 'OK',
            onPress: () => {
              handleClose();
              if (onSuccess) onSuccess();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Email change error:', error);
      Alert.alert('Error', error.message || 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Password Change - Immediate Update
   * 1. Verify current password
   * 2. Update password immediately
   * 3. Show success message
   */
  const handlePasswordChange = async () => {
    try {
      // Validation
      if (!currentPassword.trim()) {
        Alert.alert('Error', 'Please enter your current password');
        return;
      }
      
      if (!newPassword.trim()) {
        Alert.alert('Error', 'Please enter a new password');
        return;
      }
      
      if (!validatePassword(newPassword)) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'New passwords do not match');
        return;
      }

      setLoading(true);

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Unable to get current user information');
      }

      // Verify current password
      await verifyCurrentPassword(currentUser);

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Success
      Alert.alert(
        'Password Updated Successfully!',
        'Your password has been updated successfully!\n\nYou can now use your new password for future logins.',
        [
          {
            text: 'OK',
            onPress: () => {
              handleClose();
              if (onSuccess) onSuccess();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Password change error:', error);
      Alert.alert('Error', error.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Current Password *</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>New Email Address *</Text>
        <TextInput
          style={styles.input}
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="Enter new email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Email Change Process:</Text>
        <Text style={styles.instructionsText}>
          • A verification email will be sent to your new email address{'\n'}
          • Click the verification link in the email{'\n'}
          • Your database will be updated automatically after verification{'\n'}
          • Continue using your current email until verification is complete
        </Text>
      </View>
    </View>
  );

  const renderPasswordForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Current Password *</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>New Password *</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password (min 6 characters)"
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm New Password *</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Password Change Process:</Text>
        <Text style={styles.instructionsText}>
          • Your password will be updated immediately{'\n'}
          • No email verification required{'\n'}
          • Use your new password for future logins{'\n'}
          • Make sure to remember your new password
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Authentication</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'email' && styles.activeTab]}
                onPress={() => setActiveTab('email')}
                disabled={loading}
              >
                <Text style={[styles.tabText, activeTab === 'email' && styles.activeTabText]}>
                  Change Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'password' && styles.activeTab]}
                onPress={() => setActiveTab('password')}
                disabled={loading}
              >
                <Text style={[styles.tabText, activeTab === 'password' && styles.activeTabText]}>
                  Change Password
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Content */}
            {activeTab === 'email' ? renderEmailForm() : renderPasswordForm()}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, loading && styles.disabledButton]}
              onPress={activeTab === 'email' ? handleEmailChange : handlePasswordChange}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {activeTab === 'email' ? 'Send Verification Email' : 'Update Password'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    minHeight: 400,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  modalBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  activeTabText: {
    color: '#fff',
  },
  formContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  instructionsContainer: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});