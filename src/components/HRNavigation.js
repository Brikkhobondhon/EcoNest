import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform
} from 'react-native';
import HireEmployeeModal from './HireEmployeeModal';

export default function HRNavigation({ 
  userProfile, 
  departments, 
  onRefreshEmployees,
  onSignOut 
}) {
  const [showHireModal, setShowHireModal] = useState(false);
  const [hiringLoading, setHiringLoading] = useState(false);

  const handleOpenHireModal = () => {
    setShowHireModal(true);
  };

  const handleCloseHireModal = () => {
    setShowHireModal(false);
  };

  const handleRefreshAfterHire = () => {
    setShowHireModal(false);
    if (onRefreshEmployees) {
      onRefreshEmployees(); // Refresh the employee list
    }
  };

  return (
    <View style={styles.navigationContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>HR Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {userProfile?.name || 'HR Manager'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.hireButton}
            onPress={handleOpenHireModal}
          >
            <Text style={styles.hireButtonText}>👥 Hire Employee</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={onSignOut}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hire Employee Modal */}
      <HireEmployeeModal
        visible={showHireModal}
        onClose={handleCloseHireModal}
        onHire={handleRefreshAfterHire}
        departments={departments}
        loading={hiringLoading}
        userProfile={userProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navigationContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hireButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hireButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
});