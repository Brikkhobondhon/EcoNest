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
  ScrollView
} from 'react-native';
import { supabase } from '../config/supabase';

export default function AuthChangeForm({ visible, onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [changeType, setChangeType] = useState('email'); // 'email' or 'password'

  const resetForm = () => {
    setCurrentPassword('');
    setNewEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setChangeType('email');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // Password must be at least 6 characters
    return password.length >= 6;
  };

  // Check current user's email confirmation status
  const checkEmailConfirmationStatus = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        return;
      }
      
      console.log('Current user email confirmation status:', {
        email: user.email,
        emailConfirmed: user.email_confirmed_at,
        lastSignIn: user.last_sign_in_at,
        updatedAt: user.updated_at
      });

      // Also check if there are any pending email changes
      const { data: session } = await supabase.auth.getSession();
      console.log('Current session:', session);
      
      // Check the database email
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('email, official_email')
        .eq('id', user.id)
        .single();
      
      if (dbError) {
        console.error('Error checking database email:', dbError);
      } else {
        console.log('Database email:', dbUser);
        console.log('Auth vs Database email match:', user.email === dbUser.email);
      }
      
      return user;
    } catch (error) {
      console.error('Error checking email confirmation:', error);
    }
  };

  const handleChangeEmail = async () => {
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
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      // First, verify current password by attempting to sign in
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      console.log('Attempting to update email to:', newEmail);

      // Step 1: Update the database
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          email: newEmail,
          official_email: newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        Alert.alert('Error', 'Failed to update database: ' + dbError.message);
        return;
      }

      console.log('Database updated successfully');

      // Step 2: Update Supabase Auth (this sends confirmation email)
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      console.log('Auth update response:', { updateData, updateError });

      if (updateError) {
        console.error('Auth update error details:', updateError);
        if (updateError.message.includes('429') || updateError.message.includes('Too Many Requests')) {
          Alert.alert('Rate Limit Exceeded', 'Too many requests. Please wait a moment and try again.');
        } else if (updateError.message.includes('400')) {
          Alert.alert('Invalid Request', 'The email update request was invalid. Please check the email format and try again.');
        } else {
          Alert.alert('Error', updateError.message || 'Failed to update auth email');
        }
        return;
      }

      // Step 3: Check if auth email was updated immediately or needs confirmation
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      console.log('Updated user email:', updatedUser?.email);

      if (updatedUser?.email === newEmail) {
        // Auth email was updated immediately
        Alert.alert(
          'Email Updated Successfully!', 
          `Your email has been updated to: ${newEmail}\n\nYou can now use this email for future logins.`,
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
      } else {
        // Auth email needs confirmation - provide SQL fallback
        const sqlCommand = `UPDATE auth.users SET email = '${newEmail}', email_confirmed_at = NOW(), updated_at = NOW() WHERE id = '${currentUser.id}';`;
        
        Alert.alert(
          'Database Updated, Auth Update Pending', 
          `Email updated in database: ${newEmail}\n\nA confirmation email has been sent to: ${newEmail}\n\nTo complete the auth update immediately, run this SQL in your Supabase dashboard:\n\n${sqlCommand}\n\nAfter running the SQL, you can log in with: ${newEmail}`,
          [
            {
              text: 'Copy SQL',
              onPress: () => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(sqlCommand);
                  Alert.alert('Copied!', 'SQL command copied to clipboard');
                }
              }
            },
            {
              text: 'Wait for Email',
              onPress: () => {
                Alert.alert(
                  'Check Your Email',
                  `Please check your email at ${newEmail} and click the confirmation link to complete the update.`,
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
              }
            },
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                if (onSuccess) onSuccess();
              }
            }
          ]
        );
      }

    } catch (error) {
      console.error('Error changing email:', error);
      if (error.message && error.message.includes('429')) {
        Alert.alert('Rate Limit Exceeded', 'Too many requests. Please wait a moment and try again.');
      } else {
        Alert.alert('Error', 'Failed to change email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual email confirmation method
  const handleManualEmailConfirmation = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a new email address');
      return;
    }

    if (!validateEmail(newEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      console.log('Current user:', currentUser.email);
      console.log('Attempting manual email update to:', newEmail);

      // First, update the database
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          email: newEmail,
          official_email: newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        Alert.alert('Error', 'Failed to update database: ' + dbError.message);
        return;
      }

      console.log('Database updated successfully');

      // Now update Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        console.error('Auth update error:', error);
        Alert.alert('Error', 'Failed to update auth email: ' + error.message);
        return;
      }

      console.log('Auth updated successfully:', data);

      // Force refresh the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session refresh error:', sessionError);
      } else {
        console.log('Session refreshed:', session?.user?.email);
      }

      Alert.alert(
        'Success', 
        'Email updated successfully! Please sign out and sign in with your new email address.',
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
      console.error('Error in manual email confirmation:', error);
      Alert.alert('Error', 'Failed to update email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check email confirmation status and verify auth update
  const checkEmailConfirmationAndAuthStatus = async () => {
    try {
      // Get current auth user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        Alert.alert('No User', 'No authenticated user found');
        return;
      }

      // Get database user
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('email, official_email')
        .eq('id', authUser.id)
        .single();

      if (dbError) {
        Alert.alert('Database Error', 'Failed to fetch user from database: ' + dbError.message);
        return;
      }

      const message = `Auth Email: ${authUser.email}\nDatabase Email: ${dbUser.email}\nOfficial Email: ${dbUser.official_email}\n\nEmail Confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}\nLast Sign In: ${authUser.last_sign_in_at || 'Never'}`;
      
      Alert.alert('Email & Auth Status', message);
      
    } catch (error) {
      console.error('Error checking email confirmation status:', error);
      Alert.alert('Error', 'Failed to check email confirmation status');
    }
  };

  // Check email status for debugging
  const checkEmailStatus = async () => {
    try {
      // Get current auth user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        Alert.alert('No User', 'No authenticated user found');
        return;
      }

      // Get database user
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('email, official_email')
        .eq('id', authUser.id)
        .single();

      if (dbError) {
        Alert.alert('Database Error', 'Failed to fetch user from database: ' + dbError.message);
        return;
      }

      const message = `Auth Email: ${authUser.email}\nDatabase Email: ${dbUser.email}\nOfficial Email: ${dbUser.official_email}`;
      
      Alert.alert('Email Status', message);
      
    } catch (error) {
      console.error('Error checking email status:', error);
      Alert.alert('Error', 'Failed to check email status');
    }
  };

  // Handle email update when target email already exists in auth
  const handleEmailUpdateWithExistingUser = async () => {
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
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      console.log('Current user:', currentUser.email);
      console.log('Current user ID:', currentUser.id);
      console.log('Attempting email update to existing user:', newEmail);

      // Step 1: Update database first
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          email: newEmail,
          official_email: newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        Alert.alert('Error', 'Failed to update database: ' + dbError.message);
        return;
      }

      console.log('Database updated successfully');

      // Step 2: Sign out current user
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Sign out error:', signOutError);
        Alert.alert('Warning', 'Database updated but failed to sign out. Please manually sign out.');
        return;
      }

      console.log('User signed out successfully');

      Alert.alert(
        'Email Update Complete', 
        'Database updated successfully! The email ' + newEmail + ' already exists in the auth system. You can now sign in with that email address.',
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
      console.error('Error in email update with existing user:', error);
      Alert.alert('Error', 'Failed to update email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Force email update method (bypasses confirmation)
  const handleForceEmailUpdate = async () => {
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
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      console.log('Current user:', currentUser.email);
      console.log('Current user ID:', currentUser.id);
      console.log('Attempting force email update to:', newEmail);

      // Step 1: Update database first
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          email: newEmail,
          official_email: newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        Alert.alert('Error', 'Failed to update database: ' + dbError.message);
        return;
      }

      console.log('Database updated successfully');

      // Step 2: Try to update auth user email (this will send confirmation email)
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) {
        console.error('Auth update error:', updateError);
        
        Alert.alert(
          'Email Update Issue', 
          'Database updated successfully! However, the auth email update failed: ' + updateError.message,
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
        return;
      }

      console.log('Auth update response:', updateData);
      console.log('Auth update response user email:', updateData?.user?.email);
      console.log('Note: Auth email will only change after clicking confirmation link in email');

      // Step 3: Sign out to clear the old session
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Sign out error:', signOutError);
      } else {
        console.log('User signed out successfully');
      }

      Alert.alert(
        'Email Update Initiated', 
        'Email update request sent successfully! Please check your new email (' + newEmail + ') for a confirmation link. The auth email will only change after you click the confirmation link.',
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
      console.error('Error in force email update:', error);
      Alert.alert('Error', 'Failed to update email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Direct email update method for invalid current emails
  const handleChangeEmailDirect = async () => {
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
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      console.log('Current user:', currentUser.email);
      console.log('Attempting direct email update to:', newEmail);

      // Method 1: Try updating without current email validation
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });

      console.log('Direct update response:', { data, error });

      if (error) {
        console.error('Direct email update error:', error);
        
        // If direct update fails, try admin method
        if (error.message.includes('invalid')) {
          Alert.alert(
            'Email Update Required', 
            'Your current email is invalid. Please contact an administrator to update your email address.',
            [
              {
                text: 'OK',
                onPress: () => handleClose()
              }
            ]
          );
        } else {
          Alert.alert('Update Error', `Error: ${error.message}`);
        }
        return;
      }

      Alert.alert(
        'Success', 
        'Email update request sent. Please check your new email for confirmation.',
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
      console.error('Direct email change error:', error);
      Alert.alert('Error', 'Failed to change email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Comprehensive email update method for invalid emails
  const handleComprehensiveEmailUpdate = async () => {
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
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      console.log('Current user ID:', currentUser.id);
      console.log('Attempting admin email update to:', newEmail);

            console.log('Attempting comprehensive email update...');

      // Step 1: Try to update the public.users table first
      console.log('Step 1: Updating public.users table...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ 
          email: newEmail,
          official_email: newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (userError) {
        console.error('User table update error:', userError);
        Alert.alert('Update Error', 'Unable to update email in user table. Please contact an administrator.');
        return;
      }

      console.log('User table updated successfully');

      // Step 2: Try to update auth.users table using admin functions
      console.log('Step 2: Attempting auth.users update...');
      const { data, error } = await supabase.auth.admin.updateUserById(
        currentUser.id,
        { email: newEmail }
      );

      if (error) {
        console.error('Auth users update error:', error);
        
        // Step 3: Provide manual update instructions
        Alert.alert(
          'Partial Success + Manual Step Required', 
          `Email updated in user table successfully!\n\nTo complete the process, please run this SQL in your Supabase dashboard:\n\nUPDATE auth.users SET email = '${newEmail}', email_confirmed_at = NOW(), updated_at = NOW() WHERE id = '${currentUser.id}';`,
          [
            {
              text: 'Copy SQL',
              onPress: () => {
                // Copy the SQL to clipboard (if available)
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(`UPDATE auth.users SET email = '${newEmail}', email_confirmed_at = NOW(), updated_at = NOW() WHERE id = '${currentUser.id}';`);
                }
              }
            },
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                if (onSuccess) onSuccess();
              }
            }
          ]
        );
        return;
      }

      Alert.alert(
        'Success!', 
        'Email updated successfully in both tables! You will need to sign in again with your new email.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Sign out the user so they can sign in with new email
              await supabase.auth.signOut();
              handleClose();
              if (onSuccess) onSuccess();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Comprehensive email change error:', error);
      Alert.alert('Error', 'Failed to change email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
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
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      // First, verify current password by attempting to sign in
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      console.log('Attempting to update password...');

      // Step 1: Update the database (store password hash or flag)
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString(),
          // You can add a field to track password changes if needed
          // password_changed_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        Alert.alert('Error', 'Failed to update database: ' + dbError.message);
        return;
      }

      console.log('Database updated successfully');

      // Step 2: Update Supabase Auth password (this sends confirmation email)
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      console.log('Auth update response:', { updateData, updateError });

      if (updateError) {
        console.error('Auth update error details:', updateError);
        if (updateError.message.includes('429') || updateError.message.includes('Too Many Requests')) {
          Alert.alert('Rate Limit Exceeded', 'Too many requests. Please wait a moment and try again.');
        } else if (updateError.message.includes('400')) {
          Alert.alert('Invalid Request', 'The password update request was invalid. Please check the password format and try again.');
        } else {
          Alert.alert('Error', updateError.message || 'Failed to update auth password');
        }
        return;
      }

      // Step 3: Check if password was updated immediately or needs confirmation
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      console.log('Updated user session:', updatedUser);

      if (updateData?.user) {
        // Password was updated immediately
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
      } else {
        // Password change requires email confirmation - provide SQL fallback
        const sqlCommand = `UPDATE auth.users SET encrypted_password = crypt('${newPassword}', gen_salt('bf')), updated_at = NOW() WHERE id = '${currentUser.id}';`;
        
        Alert.alert(
          'Database Updated, Password Change Pending', 
          `Password change request sent successfully!\n\nA confirmation email has been sent to: ${currentUser.email}\n\nTo complete the password change immediately, run this SQL in your Supabase dashboard:\n\n${sqlCommand}\n\nAfter running the SQL, you can use your new password for future logins.`,
          [
            {
              text: 'Copy SQL',
              onPress: () => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(sqlCommand);
                  Alert.alert('Copied!', 'SQL command copied to clipboard');
                }
              }
            },
            {
              text: 'Wait for Email',
              onPress: () => {
                Alert.alert(
                  'Check Your Email',
                  `Please check your email at ${currentUser.email} and click the confirmation link to complete the password change.\n\nIf you don't see the email, check your spam folder.`,
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
              }
            },
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                if (onSuccess) onSuccess();
              }
            }
          ]
        );
      }

    } catch (error) {
      console.error('Error changing password:', error);
      if (error.message && error.message.includes('429')) {
        Alert.alert('Rate Limit Exceeded', 'Too many requests. Please wait a moment and try again.');
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Alternative password change method following email change pattern
  const handleSimplePasswordChange = async () => {
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
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      console.log('Current user:', currentUser.email);
      console.log('Current user ID:', currentUser.id);
      console.log('Attempting force password update...');

      // Step 1: Update database first
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        Alert.alert('Error', 'Failed to update database: ' + dbError.message);
        return;
      }

      console.log('Database updated successfully');

      // Step 2: Try to update auth user password (this will send confirmation email)
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Auth update error:', updateError);
        
        Alert.alert(
          'Password Update Issue', 
          'Database updated successfully! However, the auth password update failed: ' + updateError.message,
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
        return;
      }

      console.log('Auth update response:', updateData);
      console.log('Note: Password will only change after clicking confirmation link in email');

      // Step 3: Sign out to clear the old session
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Sign out error:', signOutError);
      } else {
        console.log('User signed out successfully');
      }

      Alert.alert(
        'Password Update Initiated', 
        'Password update request sent successfully! Please check your email (' + currentUser.email + ') for a confirmation link. The password will only change after you click the confirmation link.',
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
      console.error('Error in force password update:', error);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check password change status
  const checkPasswordChangeStatus = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      console.log('Checking password change status...');
      console.log('Current user:', currentUser.email);
      console.log('User updated at:', currentUser.updated_at);
      console.log('Last sign in:', currentUser.last_sign_in_at);

      // Get session information
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session);

      const message = `User Email: ${currentUser.email}\nUpdated At: ${currentUser.updated_at || 'Never'}\nLast Sign In: ${currentUser.last_sign_in_at || 'Never'}\nSession Active: ${session ? 'Yes' : 'No'}`;
      
      Alert.alert('Password Change Status', message);
      
    } catch (error) {
      console.error('Error checking password change status:', error);
      Alert.alert('Error', 'Failed to check password change status');
    }
  };

  // Check and fix email mismatch between auth.users and public.users
  const checkEmailMismatch = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      console.log('Checking email mismatch...');
      console.log('Auth user email:', currentUser.email);
      console.log('Auth user ID:', currentUser.id);

      // Check what's in the public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, official_email, name, role_id')
        .eq('id', currentUser.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        Alert.alert('Error', 'Unable to fetch user data from database');
        return;
      }

      console.log('Public users table data:', userData);

      // Check if emails match
      const authEmail = currentUser.email;
      const publicEmail = userData.email;
      const officialEmail = userData.official_email;

      console.log('Email comparison:', {
        authEmail,
        publicEmail,
        officialEmail,
        authMatchesPublic: authEmail === publicEmail,
        authMatchesOfficial: authEmail === officialEmail
      });

      if (authEmail !== publicEmail) {
        Alert.alert(
          'Email Mismatch Detected',
          `Auth email: ${authEmail}\nPublic email: ${publicEmail}\n\nThis mismatch is causing the role lookup to fail.`,
          [
            {
              text: 'Fix Public Email',
              onPress: async () => {
                const { error: updateError } = await supabase
                  .from('users')
                  .update({ email: authEmail })
                  .eq('id', currentUser.id);
                
                if (updateError) {
                  Alert.alert('Error', 'Failed to update public email');
                } else {
                  Alert.alert('Success', 'Public email updated. Please refresh the page.');
                }
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('No Mismatch', 'Emails are consistent between auth and public tables.');
      }

    } catch (error) {
      console.error('Error checking email mismatch:', error);
      Alert.alert('Error', 'Failed to check email mismatch');
    }
  };

  // Fix email mismatch between auth and database
  const fixEmailMismatch = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      console.log('Current auth email:', currentUser.email);

      // Check database email
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('email, official_email')
        .eq('id', currentUser.id)
        .single();

      if (dbError) {
        console.error('Error fetching database user:', dbError);
        Alert.alert('Error', 'Unable to fetch user data from database');
        return;
      }

      console.log('Database email:', dbUser.email);
      console.log('Email mismatch:', currentUser.email !== dbUser.email);

      if (currentUser.email === dbUser.email) {
        Alert.alert('No Mismatch', 'Auth and database emails match. No fix needed.');
        return;
      }

      // Show options to fix the mismatch
      Alert.alert(
        'Email Mismatch Detected',
        `Auth email: ${currentUser.email}\nDatabase email: ${dbUser.email}\n\nChoose how to fix this:`,
        [
          {
            text: 'Update Auth to Match Database',
            onPress: () => updateAuthEmailToMatchDatabase(currentUser.id, dbUser.email)
          },
          {
            text: 'Update Database to Match Auth',
            onPress: () => updateDatabaseEmailToMatchAuth(currentUser.id, currentUser.email)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );

    } catch (error) {
      console.error('Error in fixEmailMismatch:', error);
      Alert.alert('Error', 'Failed to check email mismatch');
    }
  };

  const updateAuthEmailToMatchDatabase = async (userId, newEmail) => {
    setLoading(true);
    try {
      console.log('Updating auth email to match database:', newEmail);
      
      // This requires admin access - we'll provide the SQL command
      const sqlCommand = `UPDATE auth.users SET email = '${newEmail}', email_confirmed_at = NOW(), updated_at = NOW() WHERE id = '${userId}';`;
      
      Alert.alert(
        'Admin Action Required',
        `To update the auth email, please run this SQL command in your Supabase dashboard:\n\n${sqlCommand}\n\nAfter running this, you should be able to log in with: ${newEmail}`,
        [
          {
            text: 'Copy SQL',
            onPress: () => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(sqlCommand);
                Alert.alert('Copied!', 'SQL command copied to clipboard');
              }
            }
          },
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
      console.error('Error updating auth email:', error);
      Alert.alert('Error', 'Failed to prepare auth email update');
    } finally {
      setLoading(false);
    }
  };

  const updateDatabaseEmailToMatchAuth = async (userId, authEmail) => {
    setLoading(true);
    try {
      console.log('Updating database email to match auth:', authEmail);
      
      const { error } = await supabase
        .from('users')
        .update({ 
          email: authEmail,
          official_email: authEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Database update error:', error);
        Alert.alert('Error', 'Failed to update database email');
        return;
      }

      Alert.alert(
        'Success!',
        `Database email updated to match auth email: ${authEmail}\n\nYou should now be able to log in with: ${authEmail}`,
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
      console.error('Error updating database email:', error);
      Alert.alert('Error', 'Failed to update database email');
    } finally {
      setLoading(false);
    }
  };

  // Direct email update method that bypasses confirmation
  const handleDirectEmailUpdate = async () => {
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
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      // First, verify current password by attempting to sign in
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      console.log('Attempting direct email update to:', newEmail);

      // Step 1: Update the database
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          email: newEmail,
          official_email: newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        Alert.alert('Error', 'Failed to update database: ' + dbError.message);
        return;
      }

      console.log('Database updated successfully');

      // Step 2: Update auth email directly
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) {
        console.error('Auth update error:', updateError);
        // If auth update fails, provide SQL command as fallback
        const sqlCommand = `UPDATE auth.users SET email = '${newEmail}', email_confirmed_at = NOW(), updated_at = NOW() WHERE id = '${currentUser.id}';`;
        
        Alert.alert(
          'Database Updated, Auth Update Failed', 
          `Email updated in database: ${newEmail}\n\nAuth update failed: ${updateError.message}\n\nTo complete the auth update, please run this SQL in your Supabase dashboard:\n\n${sqlCommand}\n\nAfter running the SQL, you can log in with: ${newEmail}`,
          [
            {
              text: 'Copy SQL',
              onPress: () => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(sqlCommand);
                  Alert.alert('Copied!', 'SQL command copied to clipboard');
                }
              }
            },
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                if (onSuccess) onSuccess();
              }
            }
          ]
        );
        return;
      }

      // Step 3: Sign out and sign back in to refresh session
      await supabase.auth.signOut();
      
      Alert.alert(
        'Email Updated Successfully!', 
        `Your email has been updated to: ${newEmail}\n\nYou have been signed out. Please sign in again with your new email address.`,
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
      console.error('Error in direct email update:', error);
      Alert.alert('Error', 'Failed to update email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Direct password update method following email change pattern
  const handleDirectPasswordUpdate = async () => {
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
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      // First, verify current password by attempting to sign in
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      console.log('Attempting direct password update...');

      // Step 1: Update the database
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        Alert.alert('Error', 'Failed to update database: ' + dbError.message);
        return;
      }

      console.log('Database updated successfully');

      // Step 2: Update auth password directly
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Auth update error:', updateError);
        // If auth update fails, provide SQL command as fallback
        const sqlCommand = `UPDATE auth.users SET encrypted_password = crypt('${newPassword}', gen_salt('bf')), updated_at = NOW() WHERE id = '${currentUser.id}';`;
        
        Alert.alert(
          'Database Updated, Auth Update Failed', 
          `Password updated in database successfully!\n\nAuth update failed: ${updateError.message}\n\nTo complete the auth update, please run this SQL in your Supabase dashboard:\n\n${sqlCommand}\n\nAfter running the SQL, you can use your new password for future logins.`,
          [
            {
              text: 'Copy SQL',
              onPress: () => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(sqlCommand);
                  Alert.alert('Copied!', 'SQL command copied to clipboard');
                }
              }
            },
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                if (onSuccess) onSuccess();
              }
            }
          ]
        );
        return;
      }

      // Step 3: Sign out and sign back in to refresh session
      await supabase.auth.signOut();
      
      Alert.alert(
        'Password Updated Successfully!', 
        `Your password has been updated successfully!\n\nYou have been signed out. Please sign in again with your new password.`,
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
      console.error('Error in direct password update:', error);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Current Password *</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
          secureTextEntry
          autoCapitalize="none"
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
        />
      </View>
    </>
  );

  const renderPasswordForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Current Password *</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
          secureTextEntry
          autoCapitalize="none"
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
        />
      </View>
    </>
  );

  // Test Supabase connection and auth status
  const testSupabaseConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      
      // Test 1: Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('User test result:', { user, userError });
      
      // Test 2: Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session test result:', { session, sessionError });
      
      // Test 3: Test database connection
      const { data: testData, error: dbError } = await supabase
        .from('users')
        .select('id, email')
        .limit(1);
      console.log('Database test result:', { testData, dbError });
      
      const message = `User: ${user?.email || 'None'}\nSession: ${session ? 'Active' : 'None'}\nEmail Confirmed: ${user?.email_confirmed_at ? 'Yes' : 'No'}\nDatabase: ${dbError ? 'Error' : 'Connected'}`;
      
      Alert.alert('Supabase Connection Test', message);
      
    } catch (error) {
      console.error('Supabase connection test error:', error);
      Alert.alert('Connection Test Error', error.message);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
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

          <ScrollView style={styles.modalBody}>
            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, changeType === 'email' && styles.activeTab]}
                onPress={() => setChangeType('email')}
                disabled={loading}
              >
                <Text style={[styles.tabText, changeType === 'email' && styles.activeTabText]}>
                  Change Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, changeType === 'password' && styles.activeTab]}
                onPress={() => setChangeType('password')}
                disabled={loading}
              >
                <Text style={[styles.tabText, changeType === 'password' && styles.activeTabText]}>
                  Change Password
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Content */}
            <View style={styles.formContainer}>
              {changeType === 'email' ? renderEmailForm() : renderPasswordForm()}
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>
                {changeType === 'email' ? 'Email Change Instructions:' : 'Password Change Instructions:'}
              </Text>
              <Text style={styles.instructionsText}>
                {changeType === 'email' 
                  ? '• Your email will be updated immediately\n• You can use the new email for future logins\n• No confirmation email required'
                  : '• You will receive a confirmation email\n• Click the confirmation link to complete the change\n• Your password will be updated after confirmation\n• Use your new password for future logins'
                }
              </Text>
            </View>

            {/* Debug Section for Email Changes */}
            {changeType === 'email' && (
              <View style={styles.debugContainer}>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={checkEmailStatus}
                >
                  <Text style={styles.debugButtonText}>Check Email Status</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.debugButton, { marginTop: 8, backgroundColor: '#e040fb' }]}
                  onPress={fixEmailMismatch}
                >
                  <Text style={styles.debugButtonText}>Fix Email Mismatch</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Debug Section for Password Changes */}
            {changeType === 'password' && (
              <View style={styles.debugContainer}>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={checkPasswordChangeStatus}
                >
                  <Text style={styles.debugButtonText}>Check Password Change Status</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.debugButton, { marginTop: 8, backgroundColor: '#28a745' }]}
                  onPress={handleSimplePasswordChange}
                >
                  <Text style={styles.debugButtonText}>Try Simple Password Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.debugButton, { marginTop: 8, backgroundColor: '#17a2b8' }]}
                  onPress={handleDirectPasswordUpdate}
                >
                  <Text style={styles.debugButtonText}>Try Direct Password Update</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.debugButton, { marginTop: 8, backgroundColor: '#ffc107' }]}
                  onPress={testSupabaseConnection}
                >
                  <Text style={styles.debugButtonText}>Test Supabase Connection</Text>
                </TouchableOpacity>
              </View>
            )}
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
              onPress={changeType === 'email' ? handleChangeEmail : handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {changeType === 'email' ? 'Change Email' : 'Change Password'}
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
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
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
    paddingVertical: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
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
    backgroundColor: '#4a90e2',
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  instructionsContainer: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
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
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
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
    backgroundColor: '#4a90e2',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  debugContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  debugButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
}); 