-- Test script to add more users for HR Dashboard testing
-- Run this in your Supabase SQL Editor

-- First, let's see what users currently exist
SELECT user_id, email, name, role_name, department_name FROM user_profiles;

-- Add more test users with different roles
INSERT INTO users (
    user_id, 
    email, 
    password, 
    role_id, 
    name, 
    designation, 
    department_id,
    mobile_no,
    personal_email,
    official_email,
    is_first_login
) VALUES 
(
    'EMP002',
    'john.doe@econest.com',
    'temp123',
    (SELECT id FROM user_role WHERE role_name = 'employee'),
    'John Doe',
    'Software Engineer',
    (SELECT id FROM departments WHERE name = 'IT'),
    '+1234567890',
    'john.personal@gmail.com',
    'john.doe@econest.com',
    TRUE
),
(
    'EMP003',
    'sarah.wilson@econest.com',
    'temp123',
    (SELECT id FROM user_role WHERE role_name = 'employee'),
    'Sarah Wilson',
    'UI/UX Designer',
    (SELECT id FROM departments WHERE name = 'IT'),
    '+1234567891',
    'sarah.personal@gmail.com',
    'sarah.wilson@econest.com',
    TRUE
),
(
    'MGR001',
    'mike.manager@econest.com',
    'temp123',
    (SELECT id FROM user_role WHERE role_name = 'manager'),
    'Mike Johnson',
    'IT Manager',
    (SELECT id FROM departments WHERE name = 'IT'),
    '+1234567892',
    'mike.personal@gmail.com',
    'mike.manager@econest.com',
    FALSE
),
(
    'FIN001',
    'lisa.finance@econest.com',
    'temp123',
    (SELECT id FROM user_role WHERE role_name = 'employee'),
    'Lisa Anderson',
    'Financial Analyst',
    (SELECT id FROM departments WHERE name = 'Finance'),
    '+1234567893',
    'lisa.personal@gmail.com',
    'lisa.finance@econest.com',
    TRUE
),
(
    'MKT001',
    'david.marketing@econest.com',
    'temp123',
    (SELECT id FROM user_role WHERE role_name = 'employee'),
    'David Chen',
    'Marketing Specialist',
    (SELECT id FROM departments WHERE name = 'Marketing'),
    '+1234567894',
    'david.personal@gmail.com',
    'david.marketing@econest.com',
    TRUE
)
ON CONFLICT (user_id) DO NOTHING;

-- Check the results
SELECT user_id, email, name, role_name, department_name FROM user_profiles ORDER BY name; 