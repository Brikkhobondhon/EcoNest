import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../config/supabase';

export default function DebugLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);

  const addDebugInfo = (message) => {
    console.log('Debug:', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    addDebugInfo('Starting login process...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        addDebugInfo(`Login error: ${error.message}`);
        Alert.alert('Login Failed', error.message);
      } else {
        addDebugInfo(`Login successful: ${data.user?.email}`);
        addDebugInfo(`User ID: ${data.user?.id}`);
        addDebugInfo(`Session: ${data.session ? 'Valid' : 'Invalid'}`);
        
        // Check user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', email)
          .single();
        
        if (profileError) {
          addDebugInfo(`Profile error: ${profileError.message}`);
        } else {
          addDebugInfo(`Profile found: ${profileData.role_name}`);
        }
        
        Alert.alert('Success', 'Login successful! Check debug info.');
      }
    } catch (error) {
      addDebugInfo(`Exception: ${error.message}`);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentUser = async () => {
    addDebugInfo('Checking current user...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      addDebugInfo(`Get user error: ${error.message}`);
    } else if (user) {
      addDebugInfo(`Current user: ${user.email}`);
    } else {
      addDebugInfo('No current user');
    }
  };

  const clearDebug = () => {
    setDebugInfo([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.debugButton}
        onPress={checkCurrentUser}
      >
        <Text style={styles.debugButtonText}>Check Current User</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.clearButton}
        onPress={clearDebug}
      >
        <Text style={styles.clearButtonText}>Clear Debug</Text>
      </TouchableOpacity>
      
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>Debug Info:</Text>
        {debugInfo.map((info, index) => (
          <Text key={index} style={styles.debugText}>{info}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  debugButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  clearButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
}); 