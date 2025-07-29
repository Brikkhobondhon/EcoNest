# EcoNest Database Documentation

This folder contains comprehensive documentation for the EcoNest database system, including schemas, functions, and operational procedures.

## 📁 Folder Structure

```
database/
├── docs/
│   ├── README.md                    # This file - main documentation
│   ├── schema/
│   │   ├── tables.md               # Table definitions and relationships
│   │   ├── constraints.md          # Database constraints and indexes
│   │   └── views.md                # Database views and their purposes
│   ├── functions/
│   │   ├── hiring.md               # Employee hiring functions
│   │   ├── auth.md                 # Authentication functions
│   │   └── utilities.md            # Utility and helper functions
│   ├── policies/
│   │   ├── rls.md                  # Row Level Security policies
│   │   └── permissions.md          # User permissions and roles
│   ├── migrations/
│   │   ├── setup.md                # Initial database setup
│   │   └── fixes.md                # Database fixes and patches
│   └── troubleshooting/
│       ├── common-issues.md        # Common problems and solutions
│       └── debugging.md            # Debugging procedures
```

## 🏗️ Database Overview

The EcoNest database is built on **Supabase** and consists of:

### Core Tables
- **users** - Employee accounts and profiles
- **departments** - Company organizational structure
- **user_roles** - Role definitions and permissions
- **department_codes** - Department coding system

### Supporting Tables
- **user_activity_log** - Audit trail for user actions
- **user_permissions** - Granular user permissions
- **user_sessions** - User session management

### Authentication
- **auth.users** - Supabase's built-in authentication system
- Integrated with the main **users** table via UUID matching

## 🔑 Key Features

1. **Role-Based Access Control (RBAC)**
   - Admin, HR, Manager, Employee roles
   - Granular permissions system
   - Row Level Security (RLS) policies

2. **Employee Management**
   - Automated user ID generation
   - Department-based organization
   - Profile management with photo uploads

3. **Audit Trail**
   - Activity logging for all user actions
   - Session tracking
   - Change history

4. **Authentication Integration**
   - Seamless integration with Supabase Auth
   - Password hashing and security
   - Email confirmation system

## 📋 Quick Reference

### Default Roles
- **admin** - Full system access
- **hr** - Human Resources management
- **manager** - Team management
- **employee** - Basic employee access

### Important Functions
- `hire_employee_with_auth()` - Create new employees with auth
- `generate_unique_phone()` - Generate unique phone numbers
- Various utility functions for data management

### Key Constraints
- Email uniqueness across both `users` and `auth.users`
- Phone uniqueness in `auth.users` (handled automatically)
- Department codes must be 2-digit numbers
- User IDs follow pattern: YYYYDD####

## 🚀 Getting Started

1. **Setup**: See `migrations/setup.md`
2. **Functions**: See `functions/` directory
3. **Troubleshooting**: See `troubleshooting/` directory

## 🔧 Maintenance

- Regular backups via Supabase
- Monitor activity logs for security
- Update functions as needed
- Test hiring process regularly

---

*Last Updated: $(date)*
*Version: 1.0* 