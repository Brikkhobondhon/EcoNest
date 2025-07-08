-- Enhanced RBAC Schema for EcoNest
-- This adds a proper Role-Based Access Control system

-- 1. Create user_role table for role management
CREATE TABLE user_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_description TEXT,
    permissions JSONB DEFAULT '{}', -- Store permissions as JSON
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Insert default roles
INSERT INTO user_role (role_name, role_description, permissions) VALUES
('admin', 'System Administrator', '{
    "users": ["create", "read", "update", "delete"],
    "departments": ["create", "read", "update", "delete"],
    "roles": ["create", "read", "update", "delete"],
    "reports": ["read", "export"],
    "system": ["configure", "backup", "restore"]
}'),
('employee', 'Regular Employee', '{
    "profile": ["read", "update"],
    "departments": ["read"],
    "reports": ["read_own"]
}'),
('hr', 'Human Resources', '{
    "users": ["create", "read", "update"],
    "departments": ["read", "update"],
    "reports": ["read", "export"],
    "employee_data": ["read", "update"]
}'),
('manager', 'Department Manager', '{
    "users": ["read", "update_department"],
    "departments": ["read"],
    "reports": ["read", "export"],
    "team": ["manage"]
}');

-- 3. Update users table to reference user_role
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users ADD COLUMN role_id UUID REFERENCES user_role(id);

-- 4. Create user_permissions table for additional user-specific permissions
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    permission_value BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, permission_name)
);

-- 5. Create user_sessions table for session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Update existing users to have proper roles
UPDATE users 
SET role_id = (SELECT id FROM user_role WHERE role_name = 'admin')
WHERE user_id = 'ADMIN001';

-- 7. Create indexes for better performance
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- 8. Create enhanced view for user profiles with role information
DROP VIEW IF EXISTS user_profiles;
CREATE VIEW user_profiles AS
SELECT 
    u.id,
    u.user_id,
    u.email,
    ur.role_name,
    ur.role_description,
    ur.permissions as role_permissions,
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
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN user_role ur ON u.role_id = ur.id;

-- 9. Create function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_permission VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    role_permissions JSONB;
    user_permission BOOLEAN;
BEGIN
    -- Check role-based permissions
    SELECT ur.permissions INTO role_permissions
    FROM users u
    JOIN user_role ur ON u.role_id = ur.id
    WHERE u.id = p_user_id AND ur.is_active = TRUE;
    
    -- Check if permission exists in role permissions (simplified check)
    IF role_permissions ? p_permission THEN
        has_permission := TRUE;
    END IF;
    
    -- Check user-specific permissions (override role permissions)
    SELECT permission_value INTO user_permission
    FROM user_permissions up
    WHERE up.user_id = p_user_id 
    AND up.permission_name = p_permission
    AND (up.expires_at IS NULL OR up.expires_at > NOW());
    
    IF user_permission IS NOT NULL THEN
        has_permission := user_permission;
    END IF;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    user_role_name VARCHAR(50);
BEGIN
    SELECT ur.role_name INTO user_role_name
    FROM users u
    JOIN user_role ur ON u.role_id = ur.id
    WHERE u.id = p_user_id AND ur.is_active = TRUE;
    
    RETURN user_role_name;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to update user_role timestamp
CREATE OR REPLACE FUNCTION update_user_role_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_role_updated_at
    BEFORE UPDATE ON user_role
    FOR EACH ROW
    EXECUTE FUNCTION update_user_role_timestamp();

-- 12. Update RLS policies for enhanced security

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- Create new enhanced policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_role ur ON u.role_id = ur.id
            WHERE u.id::text = auth.uid()::text 
            AND ur.role_name = 'admin'
            AND ur.is_active = TRUE
        )
    );

CREATE POLICY "HR can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_role ur ON u.role_id = ur.id
            WHERE u.id::text = auth.uid()::text 
            AND ur.role_name IN ('admin', 'hr')
            AND ur.is_active = TRUE
        )
    );

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Admins can update any user" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_role ur ON u.role_id = ur.id
            WHERE u.id::text = auth.uid()::text 
            AND ur.role_name = 'admin'
            AND ur.is_active = TRUE
        )
    );

-- Policies for user_role table
ALTER TABLE user_role ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active roles" ON user_role
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Only admins can modify roles" ON user_role
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_role ur ON u.role_id = ur.id
            WHERE u.id::text = auth.uid()::text 
            AND ur.role_name = 'admin'
            AND ur.is_active = TRUE
        )
    );

-- Policies for user_permissions table
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions" ON user_permissions
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Admins can manage all permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_role ur ON u.role_id = ur.id
            WHERE u.id::text = auth.uid()::text 
            AND ur.role_name = 'admin'
            AND ur.is_active = TRUE
        )
    );

-- Policies for user_sessions table
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_role ur ON u.role_id = ur.id
            WHERE u.id::text = auth.uid()::text 
            AND ur.role_name = 'admin'
            AND ur.is_active = TRUE
        )
    );

-- 13. Grant permissions
GRANT SELECT ON user_role TO authenticated;
GRANT SELECT ON user_permissions TO authenticated;
GRANT SELECT ON user_sessions TO authenticated;
GRANT ALL ON user_profiles TO authenticated;

-- 14. Create sample employee with different role
INSERT INTO users (
    user_id, 
    email, 
    password, 
    role_id, 
    name, 
    designation, 
    department_id,
    is_first_login
) VALUES (
    'EMP001',
    'employee@econest.com',
    'emp123',
    (SELECT id FROM user_role WHERE role_name = 'employee'),
    'John Doe',
    'Software Developer',
    (SELECT id FROM departments WHERE name = 'IT'),
    TRUE
);

-- 15. Create sample HR user
INSERT INTO users (
    user_id, 
    email, 
    password, 
    role_id, 
    name, 
    designation, 
    department_id,
    is_first_login
) VALUES (
    'HR001',
    'hr@econest.com',
    'hr123',
    (SELECT id FROM user_role WHERE role_name = 'hr'),
    'Jane Smith',
    'HR Manager',
    (SELECT id FROM departments WHERE name = 'HR'),
    FALSE
); 