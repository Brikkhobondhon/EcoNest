import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert
} from 'react-native';
import { emailService } from '../utils/emailService';
import { useAuth } from '../context/AuthContext';

export default function EmailList({ onEmailPress, onRefresh }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const inboxData = await emailService.getInbox(user.id);
      setEmails(inboxData || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load emails');
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmails();
    setRefreshing(false);
    if (onRefresh) onRefresh();
  };

  const handleEmailPress = async (email) => {
    try {
      // Mark email as read when opened
      if (!email.is_read) {
        await emailService.markMailAsRead(email.mail_id);
        // Update local state
        setEmails(prevEmails =>
          prevEmails.map(e =>
            e.mail_id === email.mail_id ? { ...e, is_read: true } : e
          )
        );
      }
      onEmailPress(email);
    } catch (error) {
      console.error('Error marking email as read:', error);
      // Still open the email even if marking as read fails
      onEmailPress(email);
    }
  };

  const renderEmailItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.emailItem, item.is_urgent && styles.urgentEmail]}
      onPress={() => handleEmailPress(item)}
    >
      <View style={styles.emailHeader}>
        <Text
          style={[
            styles.subject,
            !item.is_read && styles.unreadSubject
          ]}
          numberOfLines={1}
        >
          {item.subject}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <Text
        style={[
          styles.sender,
          !item.is_read && styles.unreadText
        ]}
        numberOfLines={1}
      >
        From: {item.sender_department_name} - {item.sender_user_name}
      </Text>
      
      <Text
        style={[
          styles.preview,
          !item.is_read && styles.unreadText
        ]}
        numberOfLines={2}
      >
        {item.body}
      </Text>
      
      {item.is_urgent && (
        <View style={styles.urgentBadge}>
          <Text style={styles.urgentText}>URGENT</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading emails...</Text>
      </View>
    );
  }

  if (emails.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noEmailsText}>No emails yet</Text>
        <Text style={styles.noEmailsSubtext}>
          Department emails will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={emails}
      renderItem={renderEmailItem}
      keyExtractor={(item) => item.mail_id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  emailItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subject: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  unreadSubject: {
    fontWeight: 'bold',
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  sender: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  preview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  urgentEmail: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  urgentBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noEmailsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noEmailsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
