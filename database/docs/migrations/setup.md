# Database Setup Guide

## 🚀 Initial Setup

### Prerequisites
- Supabase project created
- SQL Editor access
- Basic PostgreSQL knowledge

### Step 1: Create Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Core tables
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name character varying NOT NULL UNIQUE,
  display_name character varying NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.department_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL UNIQUE,
  code character varying NOT NULL UNIQUE CHECK (code::text ~ '^[0-9]{2}$'::text),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT department_codes_pkey PRIMARY KEY (id),
  CONSTRAINT department_codes_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  name character varying NOT NULL,
  designation character varying,
  department_id uuid,
  mobile_no character varying,
  secondary_mobile_no character varying,
  personal_email character varying,
  official_email character varying,
  date_of_birth date,
  nationality character varying,
  nid_no character varying,
  passport_no character varying,
  current_address text,
  photo_url text,
  is_first_login boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_by uuid,
  updated_by uuid,
  role_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- Supporting tables
CREATE TABLE public.user_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action character varying NOT NULL,
  field_name character varying,
  old_value text,
  new_value text,
  performed_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT user_activity_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id),
  CONSTRAINT user_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  permission_name character varying NOT NULL,
  permission_value boolean DEFAULT true,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone,
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id)
);

CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_token character varying NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_activity timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

### Step 2: Insert Default Data

```sql
-- Insert default roles
INSERT INTO user_roles (role_name, display_name, description) VALUES
('admin', 'Administrator', 'Full system access'),
('hr', 'Human Resources', 'HR management access'),
('manager', 'Manager', 'Team management access'),
('employee', 'Employee', 'Basic employee access')
ON CONFLICT (role_name) DO NOTHING;

-- Insert sample departments
INSERT INTO departments (name, description) VALUES
('IT', 'Information Technology Department'),
('HR', 'Human Resources Department'),
('Finance', 'Finance and Accounting Department'),
('Marketing', 'Marketing and Sales Department')
ON CONFLICT (name) DO NOTHING;

-- Insert department codes
INSERT INTO department_codes (department_id, code, description) VALUES
((SELECT id FROM departments WHERE name = 'IT'), '01', 'IT Department Code'),
((SELECT id FROM departments WHERE name = 'HR'), '02', 'HR Department Code'),
((SELECT id FROM departments WHERE name = 'Finance'), '03', 'Finance Department Code'),
((SELECT id FROM departments WHERE name = 'Marketing'), '04', 'Marketing Department Code')
ON CONFLICT (department_id) DO NOTHING;
```

### Step 3: Create Functions

**IMPORTANT**: Use the fixed v1.1 hiring function to avoid column name issues.

```sql
-- Copy and paste the entire content of hire_employee_fixed_v1.1.sql
-- This creates both generate_unique_phone() and hire_employee_with_auth() functions
```

### Step 4: Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "users_select_policy" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert_policy" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "users_update_policy" ON users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "users_delete_policy" ON users FOR DELETE TO authenticated USING (true);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" ON users 
FOR UPDATE TO authenticated 
USING (auth.uid() = id);
```

### Step 5: Create Views

```sql
-- Create user profiles view
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    u.id,
    u.user_id,
    u.email,
    u.name,
    u.department_id,
    d.name as department_name,
    u.role_id,
    ur.role_name,
    ur.display_name as role_display_name,
    u.designation,
    u.mobile_no,
    u.personal_email,
    u.official_email,
    u.is_first_login,
    u.created_at,
    u.updated_at,
    u.photo_url,
    u.date_of_birth,
    u.nationality,
    u.nid_no,
    u.passport_no,
    u.current_address,
    u.secondary_mobile_no
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN user_roles ur ON u.role_id = ur.id;
```

## 🔧 Configuration

### Environment Variables

Set these in your Supabase project settings:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=your_app_url
```

### Storage Setup

1. Create a `profile-images` bucket in Supabase Storage
2. Set it as public
3. Add storage policies for authenticated users

## ✅ Verification

### Test the Setup

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'departments', 'user_roles', 'department_codes');

-- Check if functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('hire_employee_with_auth', 'generate_unique_phone');

-- Test hiring function
SELECT * FROM hire_employee_with_auth(
    'test@econest.com',
    'password123',
    'Test User',
    'employee',
    (SELECT id FROM departments LIMIT 1),
    'Test Position'
);
```

### Expected Results

- ✅ All tables created successfully
- ✅ Default roles and departments inserted
- ✅ Functions created with proper permissions
- ✅ RLS policies active
- ✅ Hiring function works without errors

## 🚨 Common Setup Issues

### Issue: Function Creation Fails
**Solution**: Ensure you're using the v1.1 fixed function that uses correct column names

### Issue: Permission Denied
**Solution**: Check that RLS policies are properly configured

### Issue: Foreign Key Violations
**Solution**: Ensure default data is inserted before creating users

## 📋 Post-Setup Checklist

- [ ] All tables created successfully
- [ ] Default roles and departments inserted
- [ ] Hiring function v1.1 deployed
- [ ] RLS policies configured
- [ ] Storage bucket created
- [ ] Test hiring works
- [ ] Test login works
- [ ] Documentation updated

---

**Last Updated**: Current
**Version**: 1.1 (Fixed)
**Status**: ✅ Production Ready 