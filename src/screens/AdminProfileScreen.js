import React from 'react';
import ProfileComponent from '../components/ProfileComponent';

export default function AdminProfileScreen({ navigation }) {
  return (
    <ProfileComponent
      headerTitle="Admin Profile"
      headerSubtitle="Personal Information"
      showBackButton={true}
      onBack={() => navigation.goBack()}
      showLogoutButton={true}
    />
  );
}