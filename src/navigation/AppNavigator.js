import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import HRDashboard from '../screens/HRDashboard';
import EmployeeDashboard from '../screens/EmployeeDashboard';
import AdminDashboard from '../screens/AdminDashboard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';



// EmployeeDashboard component moved to separate file

// HRDashboard component moved to separate file

function LoadingScreen() {
  return (
    <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{marginTop: 10}}>Loading...</Text>
    </View>
  );
}

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    } else {
      setRoleLoading(false);
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role_name')
        .eq('email', user.email)
        .single();
      
      if (!error && data) {
        setUserRole(data.role_name);
        console.log('User role fetched:', data.role_name);
      } else {
        console.log('Error fetching user role:', error);
        setUserRole('employee'); // Default to employee if role not found
      }
    } catch (error) {
      console.log('Error in fetchUserRole:', error);
      setUserRole('employee');
    } finally {
      setRoleLoading(false);
    }
  };

  const getDashboardComponent = () => {
    switch (userRole) {
      case 'admin':
        return AdminDashboard;
      case 'hr':
        return HRDashboard;
      case 'employee':
      case 'manager':
      default:
        return EmployeeDashboard;
    }
  };

  console.log('AppNavigator - User:', user?.email, 'Role:', userRole, 'Loading:', loading, 'Role Loading:', roleLoading);

  if (loading || roleLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Authenticated user - show appropriate dashboard based on role
          <Stack.Screen 
            name="Dashboard" 
            component={getDashboardComponent()} 
          />
        ) : (
          // Not authenticated - show login
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 