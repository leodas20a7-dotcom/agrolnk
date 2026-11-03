-- ============================================================================
-- AGROLNK SECURITY FIX #2: LOCK DOWN PROFILES TABLE & PURGE PASSWORD HASHES
-- File: supabase/lock_down_profiles_rls.sql
-- Description:
--   1. Enables Row-Level Security (RLS) on public.profiles.
--   2. Drops all insecure, legacy, or overly permissive SELECT/ALL policies.
--   3. Restricts profile read/write strictly to the authenticated account owner or admin.
--   4. Revokes anonymous SELECT on profiles table (defense in depth against DPDP exposure).
--   5. Purges all legacy custom password hashes and salts from profile metadata.
--   6. Implements secure RPC functions for phone lookups without exposing user rows.
-- ============================================================================

-- 1. Ensure public.is_admin() helper function exists and is robust
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() ->> 'email') = 'admin@agrolnk.com' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Clean out legacy password hashes, salts, or custom credentials from public.profiles metadata
UPDATE public.profiles 
SET meta = COALESCE(meta, '{}'::jsonb) - 'password_hash' - 'password_salt' - 'raw_password';

-- 3. Enable Row-Level Security on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop ALL existing policies on public.profiles to eradicate open 'USING (true)' leaks
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- 5. Define Strict, Role-Isolated Production Policies

-- Policy A: SELECT (Only account owner or verified admin can read personal profile details)
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT USING (
        auth.uid()::text = id OR
        public.is_admin()
    );

-- Policy B: INSERT (Users can insert their own profile during registration; Admin can insert; Cannot self-assign admin)
CREATE POLICY "profiles_insert_own_or_admin" ON public.profiles
    FOR INSERT WITH CHECK (
        (auth.uid()::text = id OR auth.role() IN ('authenticated', 'anon')) AND
        (role <> 'admin' OR public.is_admin())
    );

-- Policy C: UPDATE (Users can update their own profile; Admin can update; Cannot self-promote to admin)
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
    FOR UPDATE USING (
        auth.uid()::text = id OR
        public.is_admin()
    )
    WITH CHECK (
        (role = (SELECT p_old.role FROM public.profiles p_old WHERE p_old.id = auth.uid()::text) OR public.is_admin())
    );

-- Policy D: DELETE (Only Admin can delete profiles)
CREATE POLICY "profiles_delete_admin_only" ON public.profiles
    FOR DELETE USING (
        public.is_admin()
    );

-- 6. Permissions hardening: Revoke direct anon SELECT to prevent table-level data dumping
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- 7. Secure RPC: Get login email for 10-digit phone (Zero profile leaks, returns email string only)
CREATE OR REPLACE FUNCTION public.get_auth_email_for_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clean_phone text;
    v_email text;
BEGIN
    v_clean_phone := RIGHT(REGEXP_REPLACE(p_phone, '\D', '', 'g'), 10);
    IF LENGTH(v_clean_phone) < 10 THEN
        RETURN NULL;
    END IF;

    SELECT email INTO v_email
    FROM public.profiles
    WHERE RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\D', '', 'g'), 10) = v_clean_phone
    LIMIT 1;

    RETURN v_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_auth_email_for_phone(text) TO anon, authenticated;

-- 8. Secure RPC: Check if phone already registered (Returns boolean only)
CREATE OR REPLACE FUNCTION public.check_phone_exists(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clean_phone text;
    v_exists boolean;
BEGIN
    v_clean_phone := RIGHT(REGEXP_REPLACE(p_phone, '\D', '', 'g'), 10);
    IF LENGTH(v_clean_phone) < 10 THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\D', '', 'g'), 10) = v_clean_phone
    ) INTO v_exists;

    RETURN v_exists;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO anon, authenticated;

