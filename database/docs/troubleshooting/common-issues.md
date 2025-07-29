# Common Issues & Solutions

## 🚨 Critical Issues

### 1. Hiring Function Errors

#### Issue: `column u.phone does not exist`
**Error Code**: `42703`
**Status**: ✅ RESOLVED (v1.1)

**Problem**: Hiring function referenced wrong column name
```sql
-- WRONG (v1.0)
SELECT 1 FROM users u WHERE u.phone = p_phone

-- CORRECT (v1.1)
SELECT 1 FROM users u WHERE u.mobile_no = p_phone
```

**Solution**: Use `hire_employee_fixed_v1.1.sql`
- Updates all column references to use `mobile_no`
- Maintains compatibility with `auth.users.phone`

#### Issue: `Key (phone)=() already exists`
**Error Code**: `23505`
**Status**: ✅ RESOLVED (v1.1)

**Problem**: Supabase `auth.users` has unique phone constraint
```sql
-- Multiple users with empty phone strings conflict
```

**Solution**: `generate_unique_phone()` function
- Creates unique phone numbers automatically
- Format: `PH_<timestamp>_<counter>`
- Prevents conflicts in auth system

### 2. Authentication Issues

#### Issue: User exists in `users` but not in `auth.users`
**Error**: 400 Bad Request on login
**Status**: ✅ RESOLVED

**Problem**: Incomplete user creation process
```sql
-- Check for mismatched records
SELECT u.id, u.email, au.id as auth_id
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;
```

**Solution**: Use proper hiring function
- Creates records in both tables
- Matches UUIDs between tables
- Sets proper auth metadata

#### Issue: Email confirmation required
**Error**: User cannot login despite correct credentials
**Status**: ✅ RESOLVED

**Problem**: `email_confirmed_at` not set
```sql
-- Check confirmation status
SELECT email, email_confirmed_at 
FROM auth.users 
WHERE email = 'user@example.com';
```

**Solution**: Hiring function sets `email_confirmed_at = now()`

## 🔧 Function Issues

### 3. Missing Functions

#### Issue: `function hire_employee_with_auth does not exist`
**Error Code**: `42883`
**Status**: ✅ RESOLVED

**Problem**: Function not created or wrong schema
```sql
-- Check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'hire_employee_with_auth';
```

**Solution**: Run the function creation script
```sql
-- Execute hire_employee_fixed_v1.1.sql
```

### 4. Permission Issues

#### Issue: `permission denied for function`
**Error Code**: `42501`
**Status**: ✅ RESOLVED

**Problem**: Function permissions not granted
```sql
-- Check permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'hire_employee_with_auth';
```

**Solution**: Grant proper permissions
```sql
GRANT EXECUTE ON FUNCTION hire_employee_with_auth(...) TO authenticated;
```

## 📊 Data Issues

### 5. Constraint Violations

#### Issue: `duplicate key value violates unique constraint`
**Error Code**: `23505`
**Status**: ✅ RESOLVED

**Common Causes**:
- Email already exists
- User ID already exists
- Phone number conflicts

**Solutions**:
```sql
-- Check for duplicates
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
SELECT user_id, COUNT(*) FROM users GROUP BY user_id HAVING COUNT(*) > 1;
```

### 6. Foreign Key Violations

#### Issue: `insert or update on table violates foreign key constraint`
**Error Code**: `23503`
**Status**: ✅ RESOLVED

**Common Causes**:
- Invalid `department_id`
- Invalid `role_id`
- Invalid `created_by`/`updated_by`

**Solutions**:
```sql
-- Verify foreign keys exist
SELECT d.id FROM departments d WHERE d.id = 'your-dept-id';
SELECT r.id FROM user_roles r WHERE r.id = 'your-role-id';
```

## 🔍 Debugging Procedures

### 7. Function Debugging

#### Step 1: Check Function Existence
```sql
SELECT proname, prosrc FROM pg_proc WHERE proname = 'hire_employee_with_auth';
```

#### Step 2: Check Table Structure
```sql
\d users;
\d auth.users;
```

#### Step 3: Test with Minimal Data
```sql
-- Test hiring with basic data
SELECT * FROM hire_employee_with_auth(
    'test@example.com',
    'password123',
    'Test User',
    'employee',
    (SELECT id FROM departments LIMIT 1),
    'Test Position'
);
```

#### Step 4: Check Error Logs
```sql
-- Check recent errors
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### 8. Data Validation

#### Check User Records
```sql
-- Verify user exists in both tables
SELECT 
    u.id,
    u.email,
    u.user_id,
    au.id as auth_id,
    au.email_confirmed_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'user@example.com';
```

#### Check Role Assignment
```sql
-- Verify role assignment
SELECT 
    u.name,
    u.email,
    ur.role_name,
    ur.display_name
FROM users u
JOIN user_roles ur ON u.role_id = ur.id
WHERE u.email = 'user@example.com';
```

## 🛠️ Maintenance Procedures

### 9. Regular Checks

#### Weekly Maintenance
```sql
-- Check for orphaned records
SELECT COUNT(*) as orphaned_users
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;

-- Check for duplicate emails
SELECT email, COUNT(*) as count
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;
```

#### Monthly Maintenance
```sql
-- Clean up old sessions
DELETE FROM user_sessions 
WHERE expires_at < NOW() - INTERVAL '30 days';

-- Archive old activity logs
-- (Implement based on retention policy)
```

## 📋 Quick Fixes

### 10. Emergency Procedures

#### Fix Phone Conflicts
```sql
-- Update existing empty phones
UPDATE auth.users 
SET phone = 'PH_' || id::text
WHERE phone = '' OR phone IS NULL;
```

#### Fix Missing Auth Records
```sql
-- Create auth record for existing user
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, phone
) VALUES (
    'user-uuid-here',
    'user@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    'PH_' || 'user-uuid-here'::text
);
```

#### Reset User Password
```sql
-- Update password in auth.users
UPDATE auth.users 
SET encrypted_password = crypt('new-password', gen_salt('bf'))
WHERE email = 'user@example.com';
```

---

**Last Updated**: Current
**Version**: 1.0
**Status**: ✅ Active 