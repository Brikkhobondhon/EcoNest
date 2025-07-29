# Database Tables Documentation

## 📊 Table Overview

The EcoNest database consists of 8 main tables organized into core business tables and supporting infrastructure tables.

## 🏢 Core Business Tables

### 1. users
**Purpose**: Main employee accounts and profile information

**Structure**:
```sql
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
  role_id uuid
);
```

**Key Features**:
- **user_id**: Auto-generated format YYYYDD#### (Year + Department Code + Sequence)
- **email**: Must be unique across both `users` and `auth.users`
- **photo_url**: Links to Supabase Storage for profile pictures
- **is_first_login**: Tracks if user has completed initial setup

**Relationships**:
- `department_id` → `departments.id`
- `role_id` → `user_roles.id`
- `created_by` → `users.id` (self-reference)
- `updated_by` → `users.id` (self-reference)

### 2. departments
**Purpose**: Company organizational structure

**Structure**:
```sql
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

**Key Features**:
- **name**: Must be unique across all departments
- **description**: Optional detailed description

**Relationships**:
- Referenced by `users.department_id`
- Referenced by `department_codes.department_id`

### 3. user_roles
**Purpose**: Role definitions and permissions

**Structure**:
```sql
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name character varying NOT NULL UNIQUE,
  display_name character varying NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Default Roles**:
- **admin**: Full system access
- **hr**: Human Resources management
- **manager**: Team management
- **employee**: Basic employee access

**Key Features**:
- **permissions**: JSONB field for granular permissions
- **is_active**: Soft delete capability
- **display_name**: User-friendly role names

**Relationships**:
- Referenced by `users.role_id`

### 4. department_codes
**Purpose**: Department coding system for user ID generation

**Structure**:
```sql
CREATE TABLE public.department_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL UNIQUE,
  code character varying NOT NULL UNIQUE CHECK (code::text ~ '^[0-9]{2}$'::text),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

**Key Features**:
- **code**: Must be exactly 2 digits (00-99)
- **department_id**: One-to-one relationship with departments
- **is_active**: Soft delete capability

**Constraints**:
- `code` must match regex `^[0-9]{2}$`
- `department_id` must be unique (one code per department)

## 🔧 Supporting Infrastructure Tables

### 5. user_activity_log
**Purpose**: Audit trail for all user actions

**Structure**:
```sql
CREATE TABLE public.user_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action character varying NOT NULL,
  field_name character varying,
  old_value text,
  new_value text,
  performed_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

**Key Features**:
- **action**: Type of action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)
- **field_name**: Specific field changed (for updates)
- **old_value/new_value**: Before/after values for changes
- **performed_by**: Who performed the action

**Relationships**:
- `user_id` → `users.id` (target user)
- `performed_by` → `users.id` (actor)

### 6. user_permissions
**Purpose**: Granular user permissions beyond role-based access

**Structure**:
```sql
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  permission_name character varying NOT NULL,
  permission_value boolean DEFAULT true,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone
);
```

**Key Features**:
- **permission_value**: Boolean flag for permission
- **expires_at**: Optional expiration date
- **granted_by**: Who granted the permission

**Relationships**:
- `user_id` → `users.id`
- `granted_by` → `users.id`

### 7. user_sessions
**Purpose**: User session management and tracking

**Structure**:
```sql
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_token character varying NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_activity timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

**Key Features**:
- **session_token**: Unique session identifier
- **ip_address**: Client IP address
- **user_agent**: Browser/client information
- **is_active**: Session status
- **expires_at**: Session expiration
- **last_activity**: Last activity timestamp

**Relationships**:
- `user_id` → `users.id`

## 🔐 Authentication Table

### 8. auth.users (Supabase Built-in)
**Purpose**: Supabase's authentication system

**Key Features**:
- **phone**: Has unique constraint (causes hiring issues)
- **email**: Must be unique
- **encrypted_password**: Hashed passwords
- **email_confirmed_at**: Email verification status

**Integration**:
- Linked to `users` table via matching UUIDs
- Both tables must have matching records for authentication to work

## 📈 Data Flow

1. **User Creation**: `hire_employee_with_auth()` creates records in both `auth.users` and `users`
2. **Authentication**: Supabase Auth validates against `auth.users`
3. **Authorization**: Application checks `users.role_id` for permissions
4. **Audit**: All actions logged in `user_activity_log`
5. **Sessions**: User sessions tracked in `user_sessions`

## 🔍 Important Notes

- **Phone Uniqueness**: `auth.users.phone` has unique constraint, handled by `generate_unique_phone()`
- **Email Uniqueness**: Must be unique across both `users` and `auth.users`
- **User ID Generation**: Automatic based on year + department code + sequence
- **Soft Deletes**: `is_active` flags used instead of hard deletes
- **Audit Trail**: All changes tracked in `user_activity_log` 