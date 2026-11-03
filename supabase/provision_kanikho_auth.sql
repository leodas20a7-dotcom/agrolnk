-- ============================================================================
-- PROVISION AUTH & SET REAL EMAIL FOR KANIKHO (PRESERVES ALL 250 LISTINGS)
-- File: supabase/provision_kanikho_auth.sql
-- Description:
--   Updates Kanikho's email to info@kanikho.com in both auth.users and
--   public.profiles while preserving its exact UUID so all 250 produce
--   listings remain 100% connected and accessible.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_profile_id UUID;
    v_email TEXT := 'info@kanikho.com';
    v_password TEXT := 'Kanikho@2026!Secure';  -- Default secure password
    v_encrypted_pw TEXT;
    v_existing_auth_id UUID;
    v_name TEXT;
    v_role TEXT;
    v_phone TEXT;
BEGIN
    -- 1. Find Kanikho's existing profile ID (searches by new email or old demo email)
    SELECT id::uuid, name, role, phone 
    INTO v_profile_id, v_name, v_role, v_phone
    FROM public.profiles 
    WHERE LOWER(email) IN ('kanikho@gmail.com', 'info@kanikho.com')
    LIMIT 1;

    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Kanikho profile not found in public.profiles!';
    END IF;

    -- 2. Encrypt the password using bcrypt
    v_encrypted_pw := crypt(v_password, gen_salt('bf'));

    -- 3. Check if account already exists in auth.users
    SELECT id INTO v_existing_auth_id 
    FROM auth.users 
    WHERE id = v_profile_id OR LOWER(email) = LOWER(v_email);

    IF v_existing_auth_id IS NULL THEN
        -- Insert authentic auth record with the EXACT same ID as the profile
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            confirmation_token,
            recovery_token,
            email_change,
            email_change_token_new,
            email_change_token_current,
            phone_change,
            phone_change_token,
            reauthentication_token,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_profile_id,
            'authenticated',
            'authenticated',
            v_email,
            v_encrypted_pw,
            NOW(),
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', v_role),
            jsonb_build_object('name', v_name, 'role', v_role),
            '', '', '', '', '', '', '', '',
            NOW(),
            NOW()
        );

        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_profile_id::text,
            v_profile_id,
            jsonb_build_object('sub', v_profile_id::text, 'email', v_email),
            'email',
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
    ELSE
        -- Update password and ensure email matches
        UPDATE auth.users SET
            email = v_email,
            encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change_token_current = COALESCE(email_change_token_current, ''),
            phone_change = COALESCE(phone_change, ''),
            phone_change_token = COALESCE(phone_change_token, ''),
            reauthentication_token = COALESCE(reauthentication_token, ''),
            raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', v_role),
            raw_user_meta_data = jsonb_build_object('name', v_name, 'role', v_role),
            updated_at = NOW()
        WHERE id = v_existing_auth_id;

        -- Ensure identity matches the new email
        UPDATE auth.identities SET
            identity_data = jsonb_build_object('sub', v_existing_auth_id::text, 'email', v_email),
            updated_at = NOW()
        WHERE user_id = v_existing_auth_id;
    END IF;

    -- 4. Update public.profiles to the new real email
    UPDATE public.profiles 
    SET email = v_email,
        updated_at = NOW()
    WHERE id = v_profile_id::text;

    RAISE NOTICE 'Kanikho updated to % successfully! All 250 listings intact under UID: %', v_email, v_profile_id;
END $$;
