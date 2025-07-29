import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import AdminDashboard from '../screens/AdminDashboard';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import HRDashboard from '../screens/HRDashboard';
import EmployeeDashboard from '../screens/EmployeeDashboard';
import NoRoleScreen from '../screens/NoRoleScreen'; // New screen for users without roles

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AppNavigator: Auth state changed - user:', user?.email || 'null', 'loading:', authLoading);
    
    if (authLoading) {
      console.log('AppNavigator: Auth still loading, waiting...');
      return;
    }
    
    if (user) {
      console.log('AppNavigator: User exists, fetching role...');
      fetchUserRole();
    } else {
      console.log('AppNavigator: No user, clearing role and stopping loading');
      setUserRole(null);
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchUserRole = async () => {
    try {
      console.log('AppNavigator: Fetching role for user:', user.email);
      console.log('AppNavigator: User ID:', user.id);
      
      // First, try to find the user by ID in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role_id, name, email, official_email')
        .eq('id', user.id)
        .single();

      console.log('AppNavigator: User data from users table:', userData);

      if (userError) {
        console.error('AppNavigator: Error fetching user by ID:', userError);
        
        // Fallback: try to find by email in user_profiles
        console.log('AppNavigator: Trying fallback search by email...');
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('role_name, name')
          .eq('email', user.email)
          .single();

        if (profileError) {
          console.error('AppNavigator: Error fetching user role by email:', profileError);
          if (profileError.message && profileError.message.includes('429')) {
            console.log('AppNavigator: Rate limit hit, retrying in 5 seconds...');
            setTimeout(() => {
              fetchUserRole();
            }, 5000);
            return;
          }
          setUserRole(null);
          return;
        }

        console.log('AppNavigator: User role fetched from profiles:', profileData?.role_name);
        setUserRole(profileData?.role_name || null);
        return;
      }

      // If we found the user by ID, get their role
      if (!userData.role_id) {
        console.log('AppNavigator: No role_id found for user');
        setUserRole(null);
        return;
      }

      // Fetch role details
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role_name, display_name')
        .eq('id', userData.role_id)
        .single();

      if (roleError) {
        console.error('AppNavigator: Error fetching role details:', roleError);
        setUserRole(null);
        return;
      }

      console.log('AppNavigator: User role fetched:', roleData.role_name);
      setUserRole(roleData.role_name);
    } catch (error) {
      console.error('AppNavigator: Error in fetchUserRole:', error);
      if (error.message && error.message.includes('429')) {
        console.log('AppNavigator: Rate limit hit, retrying in 5 seconds...');
        setTimeout(() => {
          fetchUserRole();
        }, 5000);
        return;
      }
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const getDashboardComponent = () => {
    // Handle users without roles
    if (!userRole) {
      console.log('AppNavigator: No role assigned, showing NoRoleScreen');
      return NoRoleScreen; // Show special screen for users without roles
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
        // Fallback for unknown roles
        console.log('AppNavigator: Unknown role, routing to EmployeeDashboard');
        return EmployeeDashboard;
    }
  };

  // Show loading while auth is being determined
  if (authLoading || loading) {
    console.log('AppNavigator: Showing loading state - authLoading:', authLoading, 'loading:', loading);
    return null; // Or a loading screen
  }

  console.log('AppNavigator: Rendering navigation - user:', !!user, 'role:', userRole, 'should show login:', !user);

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
              <Stack.Screen 
                name="AdminSettings" 
                component={AdminSettingsScreen}
                options={{ title: 'Admin Settings' }}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 