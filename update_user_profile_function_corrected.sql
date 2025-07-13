-- Corrected User Profile Update Function
-- Fixed to match your actual database schema with proper UUID handling

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
    
    -- Validate department_id if provided (UUID format)
    IF profile_data->>'department_id' IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM departments WHERE id = (profile_data->>'department_id')::UUID) INTO dept_exists;
        IF NOT dept_exists THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid department_id: ' || (profile_data->>'department_id')
            );
        END IF;
    END IF;
    
    -- Validate role_id if provided (UUID format)
    IF profile_data->>'role_id' IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM user_role WHERE id = (profile_data->>'role_id')::UUID) INTO role_exists;
        IF NOT role_exists THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid role_id: ' || (profile_data->>'role_id')
            );
        END IF;
    END IF;
    
    -- Update the user profile (only fields that exist in your schema)
    UPDATE users 
    SET 
        -- Basic Information
        name = COALESCE((profile_data->>'name'), name),
        designation = COALESCE((profile_data->>'designation'), designation),
        
        -- Department (UUID)
        department_id = CASE 
            WHEN profile_data->>'department_id' IS NOT NULL 
            THEN (profile_data->>'department_id')::UUID 
            ELSE department_id 
        END,
        
        -- Role (UUID) - Note: This updates the role_id, not the old role column
        role_id = CASE 
            WHEN profile_data->>'role_id' IS NOT NULL 
            THEN (profile_data->>'role_id')::UUID 
            ELSE role_id 
        END,
        
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
        
        -- Photo
        photo_url = COALESCE((profile_data->>'photo_url'), photo_url),
        
        -- System Fields
        updated_at = NOW(),
        updated_by = CASE 
            WHEN profile_data->>'updated_by' IS NOT NULL 
            THEN (profile_data->>'updated_by')::UUID 
            ELSE updated_by 
        END
        
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

-- Create an index for better performance on email lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_profile(TEXT, JSONB) TO authenticated;

-- Create a simpler version for basic employee updates
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