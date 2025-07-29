# Hiring Functions Documentation

## 🎯 Overview

The hiring system consists of functions that create new employees with proper authentication integration between the `users` table and Supabase's `auth.users` table.

## 🔧 Active Functions

### 1. hire_employee_with_auth() - v1.1 ✅ FIXED

**Purpose**: Create new employees with full authentication setup

**Parameters**:
- `p_email` (VARCHAR) - Employee email address
- `p_password` (VARCHAR) - Employee password
- `p_name` (VARCHAR) - Employee full name
- `p_role_name` (VARCHAR) - Role name (admin, hr, manager, employee)
- `p_department_id` (UUID) - Department UUID
- `p_description` (VARCHAR) - Job designation/description
- `p_phone` (VARCHAR) - Phone number (optional)

**Returns**:
- `user_id` - Generated employee ID
- `employee_name` - Employee name
- `role_name` - Assigned role
- `department_name` - Department name
- `success` - Boolean success flag
- `message` - Success/error message

**Process**:
1. Validates email uniqueness in both tables
2. Generates unique phone number if needed
3. Creates record in `auth.users` with hashed password
4. Creates record in `users` table with business data
5. Verifies both records were created successfully

**Key Fixes in v1.1**:
- ✅ Fixed column name references (`mobile_no` instead of `phone`)
- ✅ Proper phone uniqueness handling
- ✅ Correct table structure alignment

### 2. generate_unique_phone()

**Purpose**: Generate unique phone numbers for auth system

**Returns**: Unique phone string in format `PH_<timestamp>_<counter>`

**Usage**: Called automatically by hiring function when phone conflicts occur

## ✅ Resolved Issues

### ~~Column Name Mismatch~~ - FIXED v1.1
- **Issue**: Function referenced `u.phone` but table has `mobile_no`
- **Error**: `column u.phone does not exist`
- **Solution**: Updated all references to use correct column names
- **Status**: ✅ RESOLVED

### ~~Phone Constraint Violations~~ - FIXED v1.1
- **Issue**: `auth.users` phone uniqueness conflicts
- **Error**: `Key (phone)=() already exists`
- **Solution**: `generate_unique_phone()` function
- **Status**: ✅ RESOLVED

## 📋 Function History

### Version 1.0 (DEPRECATED)
- ❌ Had column name mismatch (`u.phone` vs `mobile_no`)
- ❌ Phone constraint violations
- ❌ Incomplete error handling

### Version 1.1 (CURRENT - WORKING) ✅
- ✅ Correct column references (`mobile_no`)
- ✅ Proper phone handling with `generate_unique_phone()`
- ✅ Full auth integration
- ✅ Comprehensive error handling
- ✅ Proper permissions granted

## 🔍 Troubleshooting

### Common Issues:
1. **Email already exists** - Check both `users` and `auth.users`
2. **Role not found** - Ensure role exists in `user_roles` table
3. **Department not found** - Verify department UUID is valid
4. **Permission denied** - Check function execution permissions

### Debug Steps:
1. Check function exists: `SELECT * FROM pg_proc WHERE proname = 'hire_employee_with_auth';`
2. Verify table structure: `\d users;`
3. Test with minimal data
4. Check error logs

### Function Verification:
```sql
-- Check if function exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'hire_employee_with_auth';

-- Check permissions
SELECT grantee, privilege_type FROM information_schema.routine_privileges 
WHERE routine_name = 'hire_employee_with_auth';
```

## 📝 Usage Examples

### Basic Hiring:
```sql
SELECT * FROM hire_employee_with_auth(
    'john@econest.com',
    'password123',
    'John Doe',
    'employee',
    'department-uuid-here',
    'Software Engineer'
);
```

### Hiring with Phone:
```sql
SELECT * FROM hire_employee_with_auth(
    'jane@econest.com',
    'password123',
    'Jane Smith',
    'manager',
    'department-uuid-here',
    'Team Lead',
    '+1234567890'
);
```

### Testing the Function:
```sql
-- Test with a new employee
SELECT * FROM hire_employee_with_auth(
    'test@econest.com',
    'test123',
    'Test User',
    'employee',
    (SELECT id FROM departments LIMIT 1),
    'Test Position'
);
```

## 🔐 Security Considerations

- Passwords are hashed using `crypt()` with bcrypt
- Email confirmation is automatically set
- Phone numbers are made unique to avoid auth conflicts
- All operations are logged for audit purposes
- Function runs with `SECURITY DEFINER` for proper permissions

## 📊 Performance Notes

- Function generates unique phone numbers efficiently
- User ID generation uses optimized regex patterns
- Database operations are minimal and focused
- Proper indexing on email and user_id columns

---

**Last Updated**: Current
**Version**: 1.1 (Working)
**Status**: ✅ Production Ready 