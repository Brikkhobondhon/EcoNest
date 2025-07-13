-- Enhanced User Profile Update Function
-- This function supports updating all user profile fields for different dashboards
-- (Employee Dashboard, Admin Dashboard, HR Dashboard, etc.)

CREATE OR REPLACE FUNCTION update_user_profile(
    user_email TEXT,
    profile_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_user JSONB;
    user_exists BOOLEAN;
    dept_exists BOOLEAN;
    role_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = user_email) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found with email: ' || user_email
        );
    END IF;
    
    -- Validate department_id if provided
    IF profile_data->>'department_id' IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM departments WHERE id = (profile_data->>'department_id')::INTEGER) INTO dept_exists;
        IF NOT dept_exists THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid department_id: ' || (profile_data->>'department_id')
            );
        END IF;
    END IF;
    
    -- Validate role_id if provided
    IF profile_data->>'role_id' IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM user_role WHERE id = (profile_data->>'role_id')::INTEGER) INTO role_exists;
        IF NOT role_exists THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid role_id: ' || (profile_data->>'role_id')
            );
        END IF;
    END IF;
    
    -- Update the user profile with all possible fields
    UPDATE users 
    SET 
        -- Basic Information
        name = COALESCE((profile_data->>'name'), name),
        
        -- Contact Information
        mobile_no = COALESCE((profile_data->>'mobile_no'), mobile_no),
        secondary_mobile_no = COALESCE((profile_data->>'secondary_mobile_no'), secondary_mobile_no),
        personal_email = COALESCE((profile_data->>'personal_email'), personal_email),
        official_email = COALESCE((profile_data->>'official_email'), official_email),
        
        -- Personal Information
        date_of_birth = CASE 
            WHEN profile_data->>'date_of_birth' IS NOT NULL 
            THEN (profile_data->>'date_of_birth')::DATE 
            ELSE date_of_birth 
        END,
        nationality = COALESCE((profile_data->>'nationality'), nationality),
        nid_no = COALESCE((profile_data->>'nid_no'), nid_no),
        passport_no = COALESCE((profile_data->>'passport_no'), passport_no),
        current_address = COALESCE((profile_data->>'current_address'), current_address),
        
        -- Professional Information (Admin/HR Dashboard)
        designation = COALESCE((profile_data->>'designation'), designation),
        department_id = CASE 
            WHEN profile_data->>'department_id' IS NOT NULL 
            THEN (profile_data->>'department_id')::INTEGER 
            ELSE department_id 
        END,
        role_id = CASE 
            WHEN profile_data->>'role_id' IS NOT NULL 
            THEN (profile_data->>'role_id')::INTEGER 
            ELSE role_id 
        END,
        
        -- Employment Information (Admin/HR Dashboard)
        hire_date = CASE 
            WHEN profile_data->>'hire_date' IS NOT NULL 
            THEN (profile_data->>'hire_date')::DATE 
            ELSE hire_date 
        END,
        salary = CASE 
            WHEN profile_data->>'salary' IS NOT NULL 
            THEN (profile_data->>'salary')::DECIMAL 
            ELSE salary 
        END,
        employee_status = COALESCE((profile_data->>'employee_status'), employee_status),
        
        -- Emergency Contact (All Dashboards)
        emergency_contact_name = COALESCE((profile_data->>'emergency_contact_name'), emergency_contact_name),
        emergency_contact_phone = COALESCE((profile_data->>'emergency_contact_phone'), emergency_contact_phone),
        emergency_contact_relationship = COALESCE((profile_data->>'emergency_contact_relationship'), emergency_contact_relationship),
        
        -- Manager/Organizational (Admin/HR Dashboard)
        manager_id = CASE 
            WHEN profile_data->>'manager_id' IS NOT NULL 
            THEN (profile_data->>'manager_id')::INTEGER 
            ELSE manager_id 
        END,
        
        -- Additional Fields
        work_location = COALESCE((profile_data->>'work_location'), work_location),
        employee_type = COALESCE((profile_data->>'employee_type'), employee_type), -- Full-time, Part-time, Contract
        probation_end_date = CASE 
            WHEN profile_data->>'probation_end_date' IS NOT NULL 
            THEN (profile_data->>'probation_end_date')::DATE 
            ELSE probation_end_date 
        END,
        
        -- Skills and Qualifications
        skills = COALESCE((profile_data->>'skills'), skills),
        qualifications = COALESCE((profile_data->>'qualifications'), qualifications),
        certifications = COALESCE((profile_data->>'certifications'), certifications),
        
        -- System Fields
        updated_at = NOW(),
        updated_by = user_email -- Track who made the update
        
    WHERE email = user_email
    RETURNING to_jsonb(users.*) INTO updated_user;
    
    -- Return success response with updated data
    RETURN jsonb_build_object(
        'success', true,
        'data', updated_user,
        'message', 'User profile updated successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE,
            'message', 'Failed to update user profile'
        );
END;
$$;

-- Create an index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_profile(TEXT, JSONB) TO authenticated;

-- Optional: Create a simpler version for basic updates (Employee Dashboard)
CREATE OR REPLACE FUNCTION update_user_profile_basic(
    user_email TEXT,
    profile_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_user JSONB;
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = user_email) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found with email: ' || user_email
        );
    END IF;
    
    -- Update only basic fields that employees can modify
    UPDATE users 
    SET 
        name = COALESCE((profile_data->>'name'), name),
        mobile_no = COALESCE((profile_data->>'mobile_no'), mobile_no),
        secondary_mobile_no = COALESCE((profile_data->>'secondary_mobile_no'), secondary_mobile_no),
        personal_email = COALESCE((profile_data->>'personal_email'), personal_email),
        date_of_birth = CASE 
            WHEN profile_data->>'date_of_birth' IS NOT NULL 
            THEN (profile_data->>'date_of_birth')::DATE 
            ELSE date_of_birth 
        END,
        nationality = COALESCE((profile_data->>'nationality'), nationality),
        nid_no = COALESCE((profile_data->>'nid_no'), nid_no),
        passport_no = COALESCE((profile_data->>'passport_no'), passport_no),
        current_address = COALESCE((profile_data->>'current_address'), current_address),
        emergency_contact_name = COALESCE((profile_data->>'emergency_contact_name'), emergency_contact_name),
        emergency_contact_phone = COALESCE((profile_data->>'emergency_contact_phone'), emergency_contact_phone),
        emergency_contact_relationship = COALESCE((profile_data->>'emergency_contact_relationship'), emergency_contact_relationship),
        updated_at = NOW()
    WHERE email = user_email
    RETURNING to_jsonb(users.*) INTO updated_user;
    
    -- Return success response with updated data
    RETURN jsonb_build_object(
        'success', true,
        'data', updated_user,
        'message', 'User profile updated successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_profile_basic(TEXT, JSONB) TO authenticated; 