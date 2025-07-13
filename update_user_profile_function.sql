-- Create a function to update user profile with better error handling
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
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = user_email) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found with email: ' || user_email
        );
    END IF;
    
    -- Update the user profile
    UPDATE users 
    SET 
        name = COALESCE((profile_data->>'name'), name),
        mobile_no = COALESCE((profile_data->>'mobile_no'), mobile_no),
        secondary_mobile_no = COALESCE((profile_data->>'secondary_mobile_no'), secondary_mobile_no),
        personal_email = COALESCE((profile_data->>'personal_email'), personal_email),
        official_email = COALESCE((profile_data->>'official_email'), official_email),
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
        'data', updated_user
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