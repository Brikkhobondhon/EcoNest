import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { emailService } from '../utils/emailService';
import { useAuth } from '../context/AuthContext';

export default function EmailDetail({ email, onBack, onRefresh }) {
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    checkIfDepartmentHead();
  }, []);

  const checkIfDepartmentHead = async () => {
    try {
      const isHead = await emailService.isDepartmentHead(user.id);
      if (isHead) {
        setShowAnalytics(true);
      }
    } catch (error) {
      console.error('Error checking department head status:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const analyticsData = await emailService.getMailAnalytics(email.mail_id);
      setAnalytics(analyticsData || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load mail analytics');
      console.error('Error loading analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const renderAnalytics = () => {
    if (!showAnalytics) return null;

    return (
      <View style={styles.analyticsSection}>
        <TouchableOpacity
          style={styles.analyticsHeader}
          onPress={() => {
            if (!analytics) {
              loadAnalytics();
            } else {
              setAnalytics(null);
            }
          }}
        >
          <Text style={styles.analyticsTitle}>
            📊 Mail Analytics
          </Text>
          <Text style={styles.analyticsSubtitle}>
            {analytics ? 'Tap to hide' : 'Tap to view read status'}
          </Text>
        </TouchableOpacity>

        {loadingAnalytics && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        )}

        {analytics && (
          <View style={styles.analyticsContent}>
            <Text style={styles.analyticsSubtitle}>
              Department Staff Read Status:
            </Text>
            {analytics.map((staff, index) => (
              <View key={index} style={styles.staffRow}>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{staff.user_name}</Text>
                  <Text style={styles.staffEmail}>{staff.user_email}</Text>
                </View>
                <View style={styles.readStatus}>
                  {staff.is_read ? (
                    <View style={styles.readBadge}>
                      <Text style={styles.readText}>✓ Read</Text>
                      <Text style={styles.readTime}>
                        {formatDate(staff.read_at)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>Unread</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        {email.is_urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>

      <View style={styles.emailContent}>
        <Text style={styles.subject}>{email.subject}</Text>
        
        <View style={styles.metaInfo}>
          <Text style={styles.sender}>
            From: {email.sender_department_name} - {email.sender_user_name}
          </Text>
          <Text style={styles.timestamp}>
            Sent: {formatDate(email.created_at)}
          </Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={styles.bodyText}>{email.body}</Text>
        </View>

        {renderAnalytics()}
      </View>
    </ScrollView>
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
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  urgentBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  urgentText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emailContent: {
    padding: 16,
  },
  subject: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    lineHeight: 32,
  },
  metaInfo: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  sender: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  bodyContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  analyticsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  analyticsHeader: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  analyticsSubtitle: {
    fontSize: 14,
    color: '#666',
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
  analyticsContent: {
    padding: 16,
  },
  staffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  staffEmail: {
    fontSize: 14,
    color: '#666',
  },
  readStatus: {
    alignItems: 'flex-end',
  },
  readBadge: {
    alignItems: 'center',
  },
  readText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
    marginBottom: 2,
  },
  readTime: {
    fontSize: 10,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
});
