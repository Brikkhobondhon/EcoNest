import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import AdminDashboard from '../screens/AdminDashboard';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminProfileScreen from '../screens/AdminProfileScreen';
import HRDashboard from '../screens/HRDashboard';
import EmployeeDashboard from '../screens/EmployeeDashboard';
import NoRoleScreen from '../screens/NoRoleScreen';

const Stack = createStackNavigator();

// Loading component to prevent white page
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#667eea" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

export default function AppNavigator() {
  const { user, userRole, loading } = useAuth();

  const getDashboardComponent = () => {
    // Handle users without roles
    if (!userRole) {
      console.log('AppNavigator: No role assigned, showing NoRoleScreen');
      return NoRoleScreen;
    }

    // Route based on role
    switch (userRole.toLowerCase()) {
      case 'admin':
        console.log('AppNavigator: Routing to AdminDashboard');
        return AdminDashboard;
      case 'hr':
        console.log('AppNavigator: Routing to HRDashboard');
        return HRDashboard;
      case 'manager':
      case 'employee':
        console.log('AppNavigator: Routing to EmployeeDashboard');
        return EmployeeDashboard;
      default:
        console.log('AppNavigator: Unknown role, routing to EmployeeDashboard');
        return EmployeeDashboard;
    }
  };

  // Show loading while auth is being determined
  if (loading) {
    console.log('AppNavigator: Showing loading state');
    return <LoadingScreen />;
  }

  console.log('AppNavigator: Rendering navigation - user:', !!user, 'role:', userRole);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={getDashboardComponent()} 
              options={{ 
                title: userRole ? `${userRole} Dashboard` : 'No Role Assigned'
              }}
            />
            {userRole === 'admin' && (
              <>
                <Stack.Screen 
                  name="AdminSettings" 
                  component={AdminSettingsScreen}
                  options={{ title: 'Admin Settings' }}
                />
                <Stack.Screen 
                  name="AdminProfile" 
                  component={AdminProfileScreen}
                  options={{ title: 'Admin Profile' }}
                />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F23',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});