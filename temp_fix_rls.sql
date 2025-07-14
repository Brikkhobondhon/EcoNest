-- Temporary fix for RLS infinite recursion issue
-- This will allow profile updates to work immediately

-- Option 1: Temporarily disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Option 2: Alternative - Create very simple policies (use this if you want to keep RLS enabled)
-- Uncomment these lines if you prefer to keep RLS but with simpler policies:

/*
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "HR can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple policies that don't cause recursion
CREATE POLICY "Allow all authenticated users" ON users
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read access" ON users
    FOR SELECT TO anon USING (true);
*/

-- This will immediately fix the save issue by removing the problematic policies 