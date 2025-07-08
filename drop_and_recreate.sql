-- Drop and Recreate Script for EcoNest Database
-- Run this in your Supabase SQL Editor to replace the existing table

-- 1. Drop existing tables and dependencies (in correct order)
DROP VIEW IF EXISTS user_profiles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_user_login();
DROP FUNCTION IF EXISTS log_user_activity(UUID, VARCHAR(50), VARCHAR(50), TEXT, TEXT);
DROP TABLE IF EXISTS user_activity_log;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;

-- 2. Now run the complete schema from database_schema.sql
-- (Copy and paste the entire content from database_schema.sql here)

-- EcoNest User Management Database Schema
-- This schema creates the necessary tables for the user management system

-- 1. Create departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create users table with all required fields
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) UNIQUE NOT NULL, -- Unique, unchangeable user ID
    email VARCHAR(255) UNIQUE NOT NULL, -- For Supabase auth
    password VARCHAR(255) NOT NULL, -- Temporary password initially
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    
    -- Basic Information
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    department_id UUID REFERENCES departments(id),
    
    -- Contact Information
    mobile_no VARCHAR(20),
    secondary_mobile_no VARCHAR(20),
    personal_email VARCHAR(255),
    official_email VARCHAR(255),
    
    -- Personal Information
    date_of_birth DATE,
    nationality VARCHAR(50),
    nid_no VARCHAR(50),
    passport_no VARCHAR(50),
    current_address TEXT,
    
    -- Profile Photo
    photo_url TEXT,
    
    -- System Fields
    is_first_login BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- 3. Create user_activity_log table for tracking changes
CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'login', 'logout'
    field_name VARCHAR(50), -- which field was changed
    old_value TEXT,
    new_value TEXT,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Insert default departments
INSERT INTO departments (name, description) VALUES
('IT', 'Information Technology Department'),
('HR', 'Human Resources Department'),
('Finance', 'Finance and Accounting Department'),
('Marketing', 'Marketing and Sales Department'),
('Operations', 'Operations Department'),
('Management', 'Management and Administration');

-- 5. Create default admin user (you should change this password)
INSERT INTO users (
    user_id, 
    email, 
    password, 
    role, 
    name, 
    designation, 
    department_id,
    is_first_login
) VALUES (
    'ADMIN001',
    'admin@econest.com',
    'admin123', -- Change this password
    'admin',
    'System Administrator',
    'Administrator',
    (SELECT id FROM departments WHERE name = 'Management'),
    FALSE
);

-- 6. Create indexes for better performance
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_created_at ON user_activity_log(created_at);

-- 7. Create RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Users can update their own profile (except restricted fields)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text)
    WITH CHECK (
        auth.uid()::text = id::text 
        AND role != 'admin' -- Prevent role escalation
    );

-- Admins can update any user
CREATE POLICY "Admins can update any user" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Departments policies
CREATE POLICY "Everyone can view departments" ON departments
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify departments" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Activity log policies
CREATE POLICY "Users can view own activity" ON user_activity_log
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Admins can view all activity" ON user_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- 8. Create functions for common operations

-- Function to update user's last login
CREATE OR REPLACE FUNCTION update_user_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on user updates
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_login();

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action VARCHAR(50),
    p_field_name VARCHAR(50) DEFAULT NULL,
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_log (
        user_id, 
        action, 
        field_name, 
        old_value, 
        new_value, 
        performed_by
    ) VALUES (
        p_user_id,
        p_action,
        p_field_name,
        p_old_value,
        p_new_value,
        auth.uid()
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Create views for easier data access

-- View for user profiles with department info
CREATE VIEW user_profiles AS
SELECT 
    u.id,
    u.user_id,
    u.email,
    u.role,
    u.name,
    u.designation,
    d.name as department_name,
    u.mobile_no,
    u.secondary_mobile_no,
    u.personal_email,
    u.official_email,
    u.date_of_birth,
    u.nationality,
    u.nid_no,
    u.passport_no,
    u.current_address,
    u.photo_url,
    u.is_first_login,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN departments d ON u.department_id = d.id;

-- Grant permissions
GRANT SELECT ON user_profiles TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON departments TO authenticated;
GRANT ALL ON user_activity_log TO authenticated; 