import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { emailService } from '../utils/emailService';
import EmailList from '../components/EmailList';
import EmailDetail from '../components/EmailDetail';
import ComposeEmail from '../components/ComposeEmail';
import ProfileComponent from '../components/ProfileComponent';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('inbox'); // 'inbox', 'email', 'compose', 'profile'
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);
  const [userEmployeeType, setUserEmployeeType] = useState(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const isHead = await emailService.isDepartmentHead(user.id);
      setIsDepartmentHead(isHead);
      
      const employeeType = await emailService.getUserEmployeeType(user.id);
      setUserEmployeeType(employeeType);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const handleEmailPress = (email) => {
    setSelectedEmail(email);
    setCurrentView('email');
  };

  const handleComposePress = () => {
    setCurrentView('compose');
  };

  const handleBackToInbox = () => {
    setCurrentView('inbox');
    setSelectedEmail(null);
  };

  const handleEmailSent = () => {
    // Refresh the email list
    setCurrentView('inbox');
  };

  const handleProfilePress = () => {
    setCurrentView('profile');
  };

  const handleBackToInboxFromProfile = () => {
    setCurrentView('inbox');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>
        {currentView === 'inbox' && '📧 Department Inbox'}
        {currentView === 'email' && '📧 Email'}
        {currentView === 'compose' && '✍️ Compose Email'}
        {currentView === 'profile' && '👤 My Profile'}
      </Text>
      
      {currentView === 'inbox' && (
        <View style={styles.headerActions}>
          {isDepartmentHead && (
            <TouchableOpacity
              style={styles.composeButton}
              onPress={handleComposePress}
            >
              <Text style={styles.composeButtonText}>✍️ Compose</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfilePress}
          >
            <Text style={styles.profileButtonText}>👤 Profile</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {currentView === 'email' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToInbox}
        >
          <Text style={styles.backButtonText}>← Inbox</Text>
        </TouchableOpacity>
      )}
      
      {currentView === 'compose' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToInbox}
        >
          <Text style={styles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
      )}
      
      {currentView === 'profile' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToInboxFromProfile}
        >
          <Text style={styles.backButtonText}>← Back to Inbox</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderUserInfo = () => (
    <View style={styles.userInfo}>
      <Text style={styles.userName}>{user.name}</Text>
      <Text style={styles.userRole}>
        {userEmployeeType?.display_name || 'Employee'}
      </Text>
      {isDepartmentHead && (
        <View style={styles.departmentHeadBadge}>
          <Text style={styles.departmentHeadText}>Department Head</Text>
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'inbox':
        return (
          <View style={styles.content}>
            {renderUserInfo()}
            <EmailList
              onEmailPress={handleEmailPress}
              onRefresh={() => checkUserRole()}
            />
          </View>
        );
      
      case 'email':
        return (
          <EmailDetail
            email={selectedEmail}
            onBack={handleBackToInbox}
            onRefresh={() => setCurrentView('inbox')}
          />
        );
      
      case 'compose':
        return (
          <ComposeEmail
            onClose={handleBackToInbox}
            onEmailSent={handleEmailSent}
          />
        );
      
      case 'profile':
        return (
          <ProfileComponent
            headerTitle="My Profile"
            headerSubtitle="Employee Dashboard"
            showBackButton={true}
            showLogoutButton={true}
            onBackPress={handleBackToInboxFromProfile}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  composeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  composeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  profileButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  userInfo: {
    backgroundColor: '#ffffff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  departmentHeadBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  departmentHeadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
