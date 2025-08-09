import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Animated
} from 'react-native';

const AdminSidebar = ({ 
  isExpanded, 
  onToggle, 
  onHireEmployee,
  onSettings,
  onMigration,
  onEmailSync,
  onLogout,
  userCounts = {}
}) => {
  const [activeSection, setActiveSection] = useState(null);

  const menuItems = [
    {
      id: 'hire',
      icon: '👥',
      label: 'Hire Employee',
      action: onHireEmployee,
      color: '#28a745'
    },
    {
      id: 'users',
      icon: '📊',
      label: 'User Management',
      hasSubmenu: true,
      items: [
        { id: 'all-users', label: 'All Users', count: userCounts.total || 0 },
        { id: 'admins', label: 'Admins', count: userCounts.admin || 0 },
        { id: 'hr', label: 'HR Staff', count: userCounts.hr || 0 },
        { id: 'managers', label: 'Managers', count: userCounts.manager || 0 },
        { id: 'employees', label: 'Employees', count: userCounts.employee || 0 }
      ]
    },
    {
      id: 'tools',
      icon: '🛠️',
      label: 'Admin Tools',
      hasSubmenu: true,
      items: [
        { id: 'migration', label: 'Migrate Users to Metadata', action: onMigration },
        { id: 'email-sync', label: 'Sync Email Mismatches', action: onEmailSync }
      ]
    },
    {
      id: 'settings',
      icon: '⚙️',
      label: 'Settings',
      action: onSettings,
      color: '#4a90e2'
    }
  ];

  const handleItemPress = (item) => {
    if (item.hasSubmenu) {
      setActiveSection(activeSection === item.id ? null : item.id);
    } else if (item.action) {
      item.action();
    }
  };

  const handleSubmenuPress = (parentItem, subItem) => {
    if (subItem.action) {
      subItem.action();
    }
  };

  const renderMenuItem = (item) => (
    <View key={item.id}>
      <TouchableOpacity
        style={[
          styles.menuItem,
          !isExpanded && styles.menuItemCollapsed,
          item.color && { borderLeftColor: item.color, borderLeftWidth: 3 }
        ]}
        onPress={() => handleItemPress(item)}
      >
        <Text style={styles.menuIcon}>{item.icon}</Text>
        {isExpanded && (
          <>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.hasSubmenu && (
              <Text style={[
                styles.expandIcon,
                activeSection === item.id && styles.expandIconRotated
              ]}>
                ▶
              </Text>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Submenu */}
      {isExpanded && item.hasSubmenu && activeSection === item.id && (
        <View style={styles.submenu}>
          {item.items.map((subItem) => (
            <TouchableOpacity
              key={subItem.id}
              style={styles.submenuItem}
              onPress={() => handleSubmenuPress(item, subItem)}
            >
              <Text style={styles.submenuLabel}>{subItem.label}</Text>
              {subItem.count !== undefined && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{subItem.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[
      styles.sidebar,
      isExpanded ? styles.sidebarExpanded : styles.sidebarCollapsed
    ]}>
      {/* Header */}
      <View style={styles.sidebarHeader}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={onToggle}
        >
          <Text style={styles.toggleIcon}>☰</Text>
        </TouchableOpacity>
        {isExpanded && (
          <Text style={styles.headerTitle}>Admin Panel</Text>
        )}
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {menuItems.map(renderMenuItem)}
      </ScrollView>

      {/* Footer */}
      <View style={styles.sidebarFooter}>
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={onLogout}
        >
          <Text style={styles.menuIcon}>🚪</Text>
          {isExpanded && (
            <Text style={[styles.menuLabel, styles.logoutLabel]}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    flexDirection: 'column',
    ...Platform.select({
      web: {
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
  },
  sidebarExpanded: {
    width: 280,
  },
  sidebarCollapsed: {
    width: 60,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f1f3f4',
  },
  toggleIcon: {
    fontSize: 18,
    color: '#5f6368',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#202124',
    marginLeft: 16,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  menuItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  menuIcon: {
    fontSize: 20,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 14,
    color: '#3c4043',
    marginLeft: 16,
    flex: 1,
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 12,
    color: '#5f6368',
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '90deg' }],
  },
  submenu: {
    marginLeft: 24,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#e8eaed',
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 6,
  },
  submenuLabel: {
    fontSize: 13,
    color: '#5f6368',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#e8f0fe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    color: '#1a73e8',
    fontWeight: '600',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingVertical: 8,
  },
  logoutItem: {
    backgroundColor: 'transparent',
  },
  logoutLabel: {
    color: '#d93025',
    fontWeight: '500',
  },
});

export default AdminSidebar;
