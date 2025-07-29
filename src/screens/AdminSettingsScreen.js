import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { supabase } from '../config/supabase';

export default function AdminSettingsScreen({ navigation }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);
  const [nextDepartmentCode, setNextDepartmentCode] = useState('01');

  useEffect(() => {
    fetchDepartments();
  }, []);



  const fetchDepartments = async () => {
    try {
      setLoading(true);
      
      // Fetch departments and codes separately for better debugging
      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (deptError) {
        console.error('Error fetching departments:', deptError);
        Alert.alert('Error', 'Failed to load departments');
        return;
      }
      
      const { data: codesData, error: codesError } = await supabase
        .from('department_codes')
        .select('*')
        .order('code');
      
      if (codesError) {
        console.error('Error fetching department codes:', codesError);
        Alert.alert('Error', 'Failed to load department codes');
        return;
      }
      
      // Combine departments with their codes
      const combinedData = departmentsData.map(dept => {
        const deptCode = codesData.find(code => code.department_id === dept.id);
        return {
          ...dept,
          department_codes: deptCode ? [deptCode] : []
        };
      });
      setDepartments(combinedData || []);
      
      // Calculate next department code
      if (codesData && codesData.length > 0) {
        const codes = codesData
          .map(code => parseInt(code.code))
          .sort((a, b) => b - a);
        
        const nextCode = codes.length > 0 ? (codes[0] + 1).toString().padStart(2, '0') : '01';
        setNextDepartmentCode(nextCode);
      }
      
    } catch (error) {
      console.error('Error in fetchDepartments:', error);
      Alert.alert('Error', 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDepartment.name.trim()) {
      Alert.alert('Error', 'Department name is required');
      return;
    }

    setCreating(true);
    
    try {
      // Start a transaction by creating the department first
      const { data: departmentData, error: departmentError } = await supabase
        .from('departments')
        .insert({
          name: newDepartment.name.trim(),
          description: newDepartment.description.trim() || null
        })
        .select()
        .single();

      if (departmentError) {
        console.error('Error creating department:', departmentError);
        Alert.alert('Error', 'Failed to create department');
        return;
      }

      // Create the department code
      const { error: codeError } = await supabase
        .from('department_codes')
        .insert({
          department_id: departmentData.id,
          code: nextDepartmentCode,
          description: `Department code for ${newDepartment.name}`
        });

      if (codeError) {
        console.error('Error creating department code:', codeError);
        // Try to delete the department if code creation fails
        await supabase
          .from('departments')
          .delete()
          .eq('id', departmentData.id);
        Alert.alert('Error', 'Failed to create department code');
        return;
      }

      Alert.alert('Success', `Department "${newDepartment.name}" created with code ${nextDepartmentCode}`);
      
      // Reset form and refresh data
      setNewDepartment({ name: '', description: '' });
      setShowCreateModal(false);
      fetchDepartments();
      
    } catch (error) {
      console.error('Error in handleCreateDepartment:', error);
      Alert.alert('Error', 'Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDepartment = async (departmentId, departmentName) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${departmentName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete department code first (due to foreign key constraint)
              const { error: codeError } = await supabase
                .from('department_codes')
                .delete()
                .eq('department_id', departmentId);

              if (codeError) {
                console.error('Error deleting department code:', codeError);
                Alert.alert('Error', 'Failed to delete department code');
                return;
              }

              // Delete the department
              const { error: departmentError } = await supabase
                .from('departments')
                .delete()
                .eq('id', departmentId);

              if (departmentError) {
                console.error('Error deleting department:', departmentError);
                Alert.alert('Error', 'Failed to delete department');
                return;
              }

              Alert.alert('Success', `Department "${departmentName}" deleted successfully`);
              fetchDepartments();
              
            } catch (error) {
              console.error('Error in handleDeleteDepartment:', error);
              Alert.alert('Error', 'Failed to delete department');
            }
          }
        }
      ]
    );
  };

  const renderDepartmentItem = ({ item }) => (
    <View style={styles.departmentItem}>
      <View style={styles.departmentInfo}>
        <Text style={styles.departmentName}>{item.name}</Text>
        <Text style={styles.departmentCode}>
          Code: {item.department_codes?.[0]?.code || 'N/A'}
        </Text>
        {item.description && (
          <Text style={styles.departmentDescription}>{item.description}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteDepartment(item.id, item.name)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Loading departments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        bounces={Platform.OS !== 'web'}
        scrollEnabled={true}
      >
        {/* Department Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Department Management</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createButtonText}>+ Create Department</Text>
            </TouchableOpacity>
          </View>

          {departments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No departments found</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first department to get started
              </Text>
            </View>
          ) : (
            <FlatList
              data={departments}
              renderItem={renderDepartmentItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.departmentList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            />
          )}
        </View>
      </ScrollView>

      {/* Create Department Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Department</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Department Name *</Text>
              <TextInput
                style={styles.input}
                value={newDepartment.name}
                onChangeText={(text) => setNewDepartment(prev => ({ ...prev, name: text }))}
                placeholder="Enter department name"
                maxLength={100}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newDepartment.description}
                onChangeText={(text) => setNewDepartment(prev => ({ ...prev, description: text }))}
                placeholder="Enter department description"
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            <View style={styles.codePreview}>
              <Text style={styles.codePreviewLabel}>Department Code:</Text>
              <Text style={styles.codePreviewValue}>{nextDepartmentCode}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewDepartment({ name: '', description: '' });
                }}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createModalButton, creating && styles.disabledButton]}
                onPress={handleCreateDepartment}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createModalButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4a90e2',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 60,
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
    padding: 20,
    ...(Platform.OS === 'web' && {
      paddingBottom: 100, // Extra padding for web
    }),
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  createButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  departmentList: {
    marginTop: 10,
  },
  departmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  departmentCode: {
    fontSize: 14,
    color: '#4a90e2',
    fontWeight: '500',
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  codePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  codePreviewLabel: {
    fontSize: 14,
    color: '#666',
  },
  codePreviewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  createModalButton: {
    backgroundColor: '#4a90e2',
  },
  createModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 