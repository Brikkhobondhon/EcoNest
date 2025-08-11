# Department Email System Implementation

This document explains how to implement the department-based email system for EcoNest, allowing department heads to send emails to other departments and track read status.

## 🗄️ Database Changes

### 1. Run the SQL Migration

Execute the SQL migration file located at `database/migrations/department_email_system.sql` in your Supabase database. This will:

- Create new tables for employee types, department heads, emails, and read status
- Add necessary foreign key constraints
- Create database functions for email operations
- Set up Row Level Security (RLS) policies
- Create performance indexes

### 2. Database Schema Overview

#### New Tables Created:

1. **`employee_types`** - Defines department head vs staff roles
2. **`department_heads`** - Links users to departments as heads
3. **`department_mails`** - Stores department-to-department emails
4. **`mail_read_status`** - Tracks which users have read which emails

#### Modified Tables:

1. **`users`** - Added `employee_type_id` field

### 3. Key Database Functions

- `send_department_mail()` - Allows department heads to send emails
- `mark_mail_as_read()` - Marks emails as read when opened
- `get_department_mail_analytics()` - Shows read status for department heads
- `get_user_inbox()` - Retrieves user's inbox

## 🚀 Implementation Steps

### Step 1: Database Setup

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `database/migrations/department_email_system.sql`
4. Execute the script

### Step 2: Set Employee Types

After running the migration, you need to assign employee types to existing users:

```sql
-- Example: Assign a user as department head
UPDATE users 
SET employee_type_id = (SELECT id FROM employee_types WHERE type_name = 'department_head')
WHERE id = 'user-uuid-here';

-- Example: Assign a user as staff
UPDATE users 
SET employee_type_id = (SELECT id FROM employee_types WHERE type_name = 'staff')
WHERE id = 'user-uuid-here';
```

### Step 3: Assign Department Heads

```sql
-- Example: Assign a user as head of a department
INSERT INTO department_heads (department_id, user_id, assigned_by)
VALUES (
  (SELECT id FROM departments WHERE name = 'IT Department'),
  'user-uuid-here',
  'admin-user-uuid-here'
);
```

## 📱 Frontend Components

### 1. Email Service (`src/utils/emailService.js`)

Provides functions for:
- Getting user inbox
- Sending department emails
- Marking emails as read
- Getting mail analytics
- Checking user roles

### 2. Email List (`src/components/EmailList.js`)

Displays the user's inbox with:
- Gmail-like UI
- Unread emails shown in bold
- Pull-to-refresh functionality
- Email preview with sender info

### 3. Email Detail (`src/components/EmailDetail.js`)

Shows full email content with:
- Email body and metadata
- Analytics for department heads (read status tracking)
- Back navigation

### 4. Compose Email (`src/components/ComposeEmail.js`)

Allows department heads to:
- Write emails with subject and body
- Select recipient department
- Mark emails as urgent
- Send emails to any department

### 5. Updated Employee Dashboard (`src/screens/EmployeeDashboard.js`)

Main dashboard with:
- Email inbox view
- Email detail view
- Compose email (for department heads)
- Profile view
- Role-based UI elements

## 🔐 Security Features

### Row Level Security (RLS)

- Users can only see emails sent to their department
- Users can only see their own read status
- Department heads can only view analytics for their department

### Permission Checks

- Only department heads can send emails
- Only department heads can view mail analytics
- Users can only mark their own emails as read

## 🎯 Key Features Implemented

### 1. Department Head Capabilities

- ✅ Send emails to any department (including own)
- ✅ View read status analytics for emails they sent
- ✅ Mark emails as urgent
- ✅ Access to compose email interface

### 2. Staff Member Capabilities

- ✅ View emails sent to their department
- ✅ Read emails (automatically marked as read)
- ✅ See sender department and user information
- ✅ No compose access

### 3. Email System Features

- ✅ Gmail-like inbox interface
- ✅ Unread emails shown in bold
- ✅ Email preview with sender info
- ✅ Full email detail view
- ✅ Read status tracking
- ✅ Urgent email highlighting
- ✅ Department-based email distribution

### 4. Analytics for Department Heads

- ✅ View which staff members have read emails
- ✅ Read timestamps
- ✅ Staff member details (name, email)
- ✅ Unread status indicators

## 🧪 Testing the System

### 1. Test Email Sending

1. Login as a department head
2. Click "Compose" button
3. Fill in subject, body, and select recipient department
4. Send email
5. Verify email appears in recipient department's inbox

### 2. Test Email Reading

1. Login as a staff member
2. Open an unread email
3. Verify email is marked as read
4. Check that bold formatting disappears

### 3. Test Analytics

1. Login as a department head
2. Send an email to another department
3. Have staff members read the email
4. Check analytics to see read status

## 🐛 Troubleshooting

### Common Issues:

1. **"Only department heads can send department mails" error**
   - Ensure user has `employee_type_id` set to department head
   - Check `department_heads` table has correct assignment

2. **Emails not appearing in inbox**
   - Verify RLS policies are enabled
   - Check user's department assignment
   - Ensure `mail_read_status` records were created

3. **Analytics not showing**
   - Verify user is department head
   - Check department assignment
   - Ensure proper permissions

### Debug Queries:

```sql
-- Check user's employee type
SELECT u.name, et.type_name 
FROM users u 
JOIN employee_types et ON u.employee_type_id = et.id 
WHERE u.id = 'user-uuid-here';

-- Check department head assignment
SELECT * FROM department_heads WHERE user_id = 'user-uuid-here';

-- Check user's department
SELECT u.name, d.name as department_name 
FROM users u 
JOIN departments d ON u.department_id = d.id 
WHERE u.id = 'user-uuid-here';
```

## 🔄 Future Enhancements

### Potential Improvements:

1. **Email Templates** - Pre-defined email templates for common communications
2. **Email Attachments** - Support for file uploads
3. **Email Categories** - Organize emails by type (announcements, updates, etc.)
4. **Email Scheduling** - Send emails at specific times
5. **Email Notifications** - Push notifications for new emails
6. **Email Search** - Search functionality within inbox
7. **Email Forwarding** - Forward emails to other departments
8. **Email Threading** - Group related emails in conversations

## 📞 Support

If you encounter any issues during implementation:

1. Check the database logs in Supabase
2. Verify all SQL statements executed successfully
3. Check browser console for JavaScript errors
4. Ensure proper user permissions and role assignments
5. Verify RLS policies are working correctly

The system is designed to be robust and secure, with proper error handling and user feedback throughout the interface.
