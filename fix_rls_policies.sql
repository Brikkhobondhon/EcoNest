-- Fix RLS Policies to Eliminate Infinite Recursion
-- This script fixes the circular dependency issue in user policies

-- 1. Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "HR can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- 2. Create simpler, non-recursive policies

-- Allow users to view their own profile (using auth.uid() directly)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (
        auth.uid()::text = id::text
    );

-- Allow users to update their own profile (using auth.uid() directly)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (
        auth.uid()::text = id::text
    ) WITH CHECK (
        auth.uid()::text = id::text
    );

-- Create a function that uses a direct database query without triggering RLS
CREATE OR REPLACE FUNCTION get_user_role_name(user_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        CASE 
            WHEN u.role IS NOT NULL THEN u.role  -- Use old role column if available
            WHEN ur.role_name IS NOT NULL THEN ur.role_name  -- Use new role_name from user_role table
            ELSE 'employee'  -- Default fallback
        END
    FROM users u
    LEFT JOIN user_role ur ON u.role_id = ur.id
    WHERE u.id = user_uuid;
$$;

-- Admin policy using the function (won't cause recursion because function uses SECURITY DEFINER)
CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        get_user_role_name(auth.uid()) = 'admin'
    );

-- HR policy using the function
CREATE POLICY "HR can view all users" ON users
    FOR SELECT USING (
        get_user_role_name(auth.uid()) IN ('admin', 'hr')
    );

CREATE POLICY "HR can update users" ON users
    FOR UPDATE USING (
        get_user_role_name(auth.uid()) IN ('admin', 'hr')
    ) WITH CHECK (
        get_user_role_name(auth.uid()) IN ('admin', 'hr')
    );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_role_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_name(uuid) TO anon; 