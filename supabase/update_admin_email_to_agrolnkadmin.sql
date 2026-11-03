-- ============================================================================
-- AGROLNK: UPDATE MASTER ADMINISTRATOR EMAIL TO agrolnkadmin@gmail.com
-- File: supabase/update_admin_email_to_agrolnkadmin.sql
-- Description:
--   Updates the master admin email from admin@agrolnk.com to agrolnkadmin@gmail.com
--   in auth.users, auth.identities, and public.profiles, while preserving your existing
--   admin password, UID, and updating is_admin() and storage policies.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_admin_id UUID;
    v_old_email TEXT := 'admin@agrolnk.com';
    v_new_email TEXT := 'agrolnkadmin@gmail.com';
BEGIN
    -- 1. Locate the existing admin UID
    SELECT id::uuid INTO v_admin_id 
    FROM public.profiles 
    WHERE role = 'admin' OR LOWER(email) = LOWER(v_old_email) OR LOWER(email) = LOWER(v_new_email)
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id 
        FROM auth.users 
        WHERE LOWER(email) = LOWER(v_old_email) OR LOWER(email) = LOWER(v_new_email)
        LIMIT 1;
    END IF;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin user could not be found to update!';
    END IF;

    -- 2. Update auth.users email and metadata (preserves your existing encrypted password)
    UPDATE auth.users SET
        email = v_new_email,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'admin'),
        raw_user_meta_data = jsonb_build_object('name', 'System Administrator', 'role', 'admin'),
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

    -- 3. Update auth.identities to match the new email
    UPDATE auth.identities SET
        identity_data = jsonb_build_object('sub', v_admin_id::text, 'email', v_new_email),
        updated_at = NOW()
    WHERE user_id = v_admin_id;

    -- 4. Update public.profiles
    UPDATE public.profiles SET
        email = v_new_email,
        role = 'admin',
        kyc_status = 'verified',
        updated_at = NOW()
    WHERE id = v_admin_id::text;

    RAISE NOTICE 'Admin email successfully updated to % with UID: %', v_new_email, v_admin_id;
END $$;

-- 5. Update public.is_admin() helper to recognize agrolnkadmin@gmail.com
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
    RETURN (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com') OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );
END;
$$;

-- 6. Update storage policies to recognize the new admin email
DROP POLICY IF EXISTS "AgroLnk Authenticated Document Access" ON storage.objects;
CREATE POLICY "AgroLnk Authenticated Document Access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('proof', 'kyc')
  AND (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR public.is_admin()
    OR owner::text = auth.uid()::text
    OR name LIKE ('%' || auth.uid()::text || '%')
  )
);

DROP POLICY IF EXISTS "AgroLnk Authenticated Document Upload" ON storage.objects;
CREATE POLICY "AgroLnk Authenticated Document Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listings'
  OR
  (
    bucket_id IN ('proof', 'kyc')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
      OR public.is_admin()
      OR owner::text = auth.uid()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR name LIKE ('%' || auth.uid()::text || '%')
    )
  )
);

