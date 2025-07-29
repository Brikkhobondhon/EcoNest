import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { signIn } from '../config/supabase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getErrorMessage = (error) => {
    if (!error) return '';
    
    const errorMessage = error.message || error.toString();
    
    // Check for specific error types
    if (errorMessage.includes('Invalid login credentials') || 
        errorMessage.includes('Invalid email or password') ||
        errorMessage.includes('Email not confirmed')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (errorMessage.includes('User not found') || 
        errorMessage.includes('No user found') ||
        errorMessage.includes('Account does not exist')) {
      return 'Account not found. Please check your email address or create a new account.';
    }
    
    if (errorMessage.includes('Email not confirmed') || 
        errorMessage.includes('Please check your email')) {
      return 'Please check your email and click the confirmation link before logging in.';
    }
    
    if (errorMessage.includes('Too many requests') || 
        errorMessage.includes('Rate limit')) {
      return 'Too many login attempts. Please wait a moment before trying again.';
    }
    
    if (errorMessage.includes('Network') || 
        errorMessage.includes('Connection')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    // Default error message
    return 'Login failed. Please try again.';
  };

  const handleLogin = async () => {
    // Clear previous error message
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signIn(email.trim(), password);
      
      if (error) {
        const message = getErrorMessage(error);
        setErrorMessage(message);
        console.log('Login error:', error);
      } else {
        // Navigation will be handled by the auth state change
        console.log('Login successful:', data.user);
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setErrorMessage('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>EcoNest Login</Text>
        
        {/* Error Message Display */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity onPress={clearError} style={styles.errorCloseButton}>
              <Text style={styles.errorCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={[styles.input, errorMessage && styles.inputError]}
            placeholder="Enter your email address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) clearError();
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={[styles.input, errorMessage && styles.inputError]}
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) clearError();
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Don't have an account? Contact your administrator to get access.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1,
    justifyContent: 'center', 
    padding: 24,
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 32, 
    textAlign: 'center',
    color: '#2c3e50'
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: '#fcc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  errorCloseButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCloseText: {
    color: '#c33',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 16,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#2c3e50',
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    color: '#7f8c8d',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 