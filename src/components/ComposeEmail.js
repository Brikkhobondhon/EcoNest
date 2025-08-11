import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { emailService } from '../utils/emailService';

export default function ComposeEmail({ onClose, onEmailSent }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const deps = await emailService.getDepartments();
      setDepartments(deps || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load departments');
      console.error('Error loading departments:', error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!selectedDepartment) {
      Alert.alert('Error', 'Please select a recipient department');
      return;
    }

    try {
      setLoading(true);
      await emailService.sendDepartmentMail(
        subject.trim(),
        body.trim(),
        selectedDepartment.id,
        isUrgent
      );

      Alert.alert(
        'Success',
        'Email sent successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onEmailSent) onEmailSent();
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send email');
      console.error('Error sending email:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDepartmentItem = (department) => (
    <TouchableOpacity
      key={department.id}
      style={[
        styles.departmentItem,
        selectedDepartment?.id === department.id && styles.selectedDepartment
      ]}
      onPress={() => setSelectedDepartment(department)}
    >
      <Text style={styles.departmentName}>{department.name}</Text>
      {department.description && (
        <Text style={styles.departmentDescription}>{department.description}</Text>
      )}
      {selectedDepartment?.id === department.id && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedText}>✓ Selected</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Compose Email</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subject *</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Enter email subject"
            maxLength={100}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Message *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={body}
            onChangeText={setBody}
            placeholder="Enter your message"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
        </View>

        <View style={styles.urgentContainer}>
          <Text style={styles.label}>Mark as Urgent</Text>
          <Switch
            value={isUrgent}
            onValueChange={setIsUrgent}
            trackColor={{ false: '#e0e0e0', true: '#ff4444' }}
            thumbColor={isUrgent ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Department *</Text>
          {loadingDepartments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Loading departments...</Text>
            </View>
          ) : (
            <View style={styles.departmentsList}>
              {departments.map(renderDepartmentItem)}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.sendButtonText}>Send Email</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  urgentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  departmentsList: {
    marginTop: 8,
  },
  departmentItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  selectedDepartment: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  selectedIndicator: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
