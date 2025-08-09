import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  Platform,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

export default function NoRoleScreen() {
  const { user, signOut } = useAuth();

  const handleContactAdmin = () => {
    Alert.alert(
      'Contact Administrator',
      'Please contact your system administrator to assign you a role.\n\nEmail: admin@econest.com\nPhone: +1234567890',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handleLogout = async () => {
    console.log('NoRoleScreen: Logout button pressed!');
    
    // For web platform, use a simple confirmation
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (!confirmed) {
        console.log('NoRoleScreen: Logout cancelled');
        return;
      }
      
      try {
        console.log('NoRoleScreen: Logout confirmed, calling signOut()...');
        await signOut();
        console.log('NoRoleScreen: Sign out successful');
        // Navigation will be handled automatically by AuthContext
      } catch (error) {
        console.error('NoRoleScreen: Logout error:', error);
        alert('Failed to logout. Please try again.');
      }
    } else {
      // For mobile platforms, use Alert
      console.log('NoRoleScreen: Showing logout confirmation dialog...');
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('NoRoleScreen: Logout cancelled')
          },
          { 
            text: 'Logout', 
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('NoRoleScreen: Logout confirmation pressed');
                console.log('NoRoleScreen: About to call signOut()...');
                await signOut();
                console.log('NoRoleScreen: Sign out successful');
                // Navigation will be handled automatically by AuthContext
              } catch (error) {
                console.error('NoRoleScreen: Logout error:', error);
                Alert.alert(
                  'Logout Error', 
                  'Failed to logout. Please try again.',
                  [{ text: 'OK', style: 'default' }]
                );
              }
            }
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        bounces={Platform.OS !== 'web'}
        scrollEnabled={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to EcoNest</Text>
          <Text style={styles.subtitle}>Role Assignment Required</Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userStatus}>No role assigned</Text>
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>🔐 Access Restricted</Text>
          <Text style={styles.messageText}>
            Your account has been created but no role has been assigned yet. 
            Please contact your administrator to assign you a role so you can access the system.
          </Text>
        </View>

        {/* Available Roles Info */}
        <View style={styles.rolesContainer}>
          <Text style={styles.rolesTitle}>Available Roles:</Text>
          <View style={styles.rolesList}>
            <Text style={styles.roleItem}>👤 <Text style={styles.roleName}>Employee</Text> - Basic access</Text>
            <Text style={styles.roleItem}>👥 <Text style={styles.roleName}>Manager</Text> - Team management</Text>
            <Text style={styles.roleItem}>🏢 <Text style={styles.roleName}>HR</Text> - Human resources</Text>
            <Text style={styles.roleItem}>⚙️ <Text style={styles.roleName}>Admin</Text> - Full system access</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={handleContactAdmin}
          >
            <Text style={styles.contactButtonText}>📧 Contact Administrator</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Once your role is assigned, you'll be able to access your dashboard.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' && {
      flex: 1,
      overflow: 'auto',
      maxHeight: 'calc(100vh - 140px)', // Dynamic viewport height
      WebkitOverflowScrolling: 'touch', // Smooth scrolling
      scrollbarWidth: 'auto', // Custom scrollbar
      scrollbarColor: '#888 #f8f9fa',
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
    minHeight: '100%',
    ...(Platform.OS === 'web' && {
      paddingBottom: 100, // Extra padding for web
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  userInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  userStatus: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '500',
    backgroundColor: '#ffeaa7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  messageContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    textAlign: 'center',
  },
  rolesContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rolesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  rolesList: {
    gap: 8,
  },
  roleItem: {
    fontSize: 16,
    color: '#555',
    paddingVertical: 4,
  },
  roleName: {
    fontWeight: '600',
    color: '#333',
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  contactButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e74c3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#e74c3c',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 