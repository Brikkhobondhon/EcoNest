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
  const { user, signOut, refreshAuthState } = useAuth();

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
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            console.log('=== LOGOUT TEST START ===');
            
            try {
              // Get current user before logout
              const { data: { user: userBefore } } = await supabase.auth.getUser();
              console.log('Current user before logout:', userBefore?.email || 'No user');
              
              // Get current session before logout
              const { data: { session: sessionBefore } } = await supabase.auth.getSession();
              console.log('Session exists before logout:', !!sessionBefore);
              
              // Use AuthContext signOut function
              console.log('Attempting to sign out...');
              await signOut();
              
              console.log('Sign out successful');
              
              // Force refresh auth state
              await refreshAuthState();
              
              // Wait a moment for state to update
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Check user after logout
              try {
                const { data: { user: userAfter } } = await supabase.auth.getUser();
                console.log('User after logout:', userAfter?.email || 'No user');
              } catch (error) {
                console.log('Error getting user after logout:', error.message);
              }
              
              // Check session after logout
              try {
                const { data: { session: sessionAfter } } = await supabase.auth.getSession();
                console.log('Session after logout:', sessionAfter ? 'Exists' : 'No session');
              } catch (error) {
                console.log('Error getting session after logout:', error.message);
              }
              
              console.log('=== LOGOUT TEST END ===');
              
              // The navigation should automatically redirect to login screen
            } catch (error) {
              console.error('Test error:', error);
              console.log('=== LOGOUT TEST END WITH ERROR ===');
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

          {/* Debug button to check auth state */}
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#f39c12', marginTop: 10 }]}
            onPress={async () => {
              console.log('=== AUTH STATE CHECK ===');
              const { data: { user } } = await supabase.auth.getUser();
              const { data: { session } } = await supabase.auth.getSession();
              console.log('Current user:', user?.email);
              console.log('Session exists:', !!session);
              console.log('User from context:', user?.email);
              console.log('=== END AUTH CHECK ===');
            }}
          >
            <Text style={[styles.logoutButtonText, { color: '#fff' }]}>🔍 Check Auth State</Text>
          </TouchableOpacity>

          {/* Direct logout button for testing */}
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#e74c3c', marginTop: 10 }]}
            onPress={async () => {
              console.log('Direct logout button pressed');
              try {
                await supabase.auth.signOut();
                console.log('Direct logout successful');
              } catch (error) {
                console.error('Direct logout error:', error);
              }
            }}
          >
            <Text style={[styles.logoutButtonText, { color: '#fff' }]}>🚪 Direct Logout (No Confirmation)</Text>
          </TouchableOpacity>

          {/* Clear session button to go to login */}
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#9b59b6', marginTop: 10 }]}
            onPress={async () => {
              console.log('Clear session button pressed');
              try {
                // Clear all auth data
                await supabase.auth.signOut();
                // Also clear any stored session data
                await supabase.auth.setSession(null);
                console.log('Session cleared successfully');
                
                // Force a state reset by calling refreshAuthState
                await refreshAuthState();
                
                // For web, also reload the page
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              } catch (error) {
                console.error('Clear session error:', error);
              }
            }}
          >
            <Text style={[styles.logoutButtonText, { color: '#fff' }]}>🔄 Clear Session & Go to Login</Text>
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