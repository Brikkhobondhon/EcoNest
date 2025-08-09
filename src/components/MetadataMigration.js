import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { migrateUserMetadata, checkUserMetadata } from '../utils/migrateUserMetadata';

/**
 * Component to migrate existing users to metadata-based roles
 * Use this once to migrate all existing users
 */
const MetadataMigration = () => {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMigration = async () => {
    try {
      setIsLoading(true);
      setMigrationStatus('Starting migration...');
      
      const result = await migrateUserMetadata();
      
      if (result.success) {
        setMigrationStatus(`Migration completed successfully!\n\nResults:\n- Total users: ${result.summary.total}\n- Successful: ${result.summary.successful}\n- Failed: ${result.summary.failed}`);
        
        Alert.alert(
          'Migration Complete!',
          `Successfully migrated ${result.summary.successful} users to metadata-based roles.`,
          [{ text: 'OK' }]
        );
      } else {
        setMigrationStatus(`Migration failed: ${result.error}`);
        Alert.alert('Migration Failed', result.error);
      }
    } catch (error) {
      setMigrationStatus(`Migration error: ${error.message}`);
      Alert.alert('Migration Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckMetadata = async () => {
    try {
      setIsLoading(true);
      setMigrationStatus('Checking user metadata...');
      
      // This would need to be implemented to check all users
      setMigrationStatus('Check functionality needs implementation for specific user ID');
    } catch (error) {
      setMigrationStatus(`Check error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Metadata Migration</Text>
      <Text style={styles.description}>
        This will migrate all existing users from database roles to Supabase auth metadata for faster authentication.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleMigration}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Migrating...' : 'Start Migration'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleCheckMetadata}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Check Status
          </Text>
        </TouchableOpacity>
      </View>
      
      {migrationStatus && (
        <ScrollView style={styles.statusContainer}>
          <Text style={styles.statusText}>{migrationStatus}</Text>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#667eea',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#667eea',
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    maxHeight: 300,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
});

export default MetadataMigration;