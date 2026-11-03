-- ============================================================================
-- AGROLNK SECURITY FIX #1: PROVISION & SECURE AUTHENTIC MASTER ADMINISTRATOR
-- File: supabase/create_master_admin.sql
-- Description:
--   Removes hardcoded client-side admin passwords and provisions a genuine,
--   cryptographically hashed administrator inside Supabase Auth (auth.users)
--   with server-side role verification in public.profiles.
-- ============================================================================

-- Ensure pgcrypto extension is active for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_admin_id UUID;
    v_encrypted_pw TEXT;
    v_existing_auth_id UUID;
BEGIN
    -- Encrypt the initial strong admin password using bcrypt (Blowfish)
    -- Default secure password: AgroLnk@Admin2026!Secure (Change to your secret password if needed)
    v_encrypted_pw := crypt('AgroLnk@Admin2026!Secure', gen_salt('bf'));

    -- 1. Check if admin user already exists in auth.users
    SELECT id INTO v_existing_auth_id 
    FROM auth.users 
    WHERE LOWER(email) = 'admin@agrolnk.com';

    IF v_existing_auth_id IS NULL THEN
        v_admin_id := gen_random_uuid();

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
            v_admin_id,
            'authenticated',
            'authenticated',
            'admin@agrolnk.com',
            v_encrypted_pw,
            NOW(),
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'admin'),
            jsonb_build_object('name', 'System Administrator', 'role', 'admin'),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
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
            v_admin_id::text,
            v_admin_id,
            jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@agrolnk.com'),
            'email',
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
    ELSE
        v_admin_id := v_existing_auth_id;
        
        -- Preserve existing admin password! Only update metadata, role, and prevent GoTrue token NULL scan crash
        UPDATE auth.users SET
            raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'admin'),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change_token_current = COALESCE(email_change_token_current, ''),
            phone_change = COALESCE(phone_change, ''),
            phone_change_token = COALESCE(phone_change_token, ''),
            reauthentication_token = COALESCE(reauthentication_token, ''),
            updated_at = NOW()
        WHERE id = v_admin_id;

        -- Ensure identity exists
        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_admin_id::text,
            v_admin_id,
            jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@agrolnk.com'),
            'email',
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
    END IF;

    -- 2. Clean up legacy dummy admin profiles to prevent email collision
    DELETE FROM public.profiles 
    WHERE LOWER(email) = 'admin@agrolnk.com' 
      AND id <> v_admin_id::text;

    -- 3. Ensure authoritative profile in public.profiles linked to auth UID
    INSERT INTO public.profiles (
        id,
        name,
        email,
        phone,
        role,
        state,
        district,
        company_name,
        kyc_status,
        created_at,
        updated_at
    ) VALUES (
        v_admin_id::text,
        'System Administrator',
        'admin@agrolnk.com',
        '9876500000',
        'admin',
        'Central Command',
        'HQ Operations',
        'AgroLnk Platform Ombudsman',
        'verified',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        email = 'admin@agrolnk.com',
        kyc_status = 'verified',
        updated_at = NOW();

    -- 4. Purge custom password hashes from profile metadata
    UPDATE public.profiles 
    SET meta = COALESCE(meta, '{}'::jsonb) - 'password_hash' - 'password_salt'
    WHERE id = v_admin_id::text OR role = 'admin';

    RAISE NOTICE 'Master Administrator provisioned successfully with UID: %', v_admin_id;
END $$;
