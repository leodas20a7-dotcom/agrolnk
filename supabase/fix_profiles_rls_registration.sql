-- ==============================================================================
-- AGROLNK: PERMANENT FIX FOR "new row violates row-level security policy for table profiles"
-- File: supabase/fix_profiles_rls_registration.sql
-- Description:
--   1. Ensures RLS on public.profiles permits user signups (anon & authenticated).
--   2. Installs an automated background trigger on auth.users so profile creation
--      ALWAYS succeeds via SECURITY DEFINER even if client-side RLS has latency.
-- ==============================================================================

-- 1. Enable RLS on public.profiles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop all conflicting insert policies on public.profiles
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        IF pol.policyname LIKE '%insert%' THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
        END IF;
    END LOOP;
END $$;

-- 3. Strict INSERT policy for profiles
-- Unauthenticated 'anon' clients CANNOT insert into public.profiles directly;
-- newly signed up users get their row created atomically by the SECURITY DEFINER trigger below.
DROP POLICY IF EXISTS "profiles_registration_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            auth.uid()::text = id AND
            COALESCE(LOWER(role), '') <> 'admin'
        ) OR
        public.is_admin()
    );

-- 4. Automated Profile Creation Trigger on auth.users (SECURITY DEFINER)
-- This ensures that whenever Supabase Auth registers an email/password (even with
-- email confirmation enabled where session is null), the profile is safely created.
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role TEXT;
    v_name TEXT;
    v_phone TEXT;
    v_state TEXT;
    v_district TEXT;
    v_company TEXT;
BEGIN
    v_role := LOWER(COALESCE(NEW.raw_user_meta_data ->> 'role', 'farmer'));
    IF v_role = 'admin' THEN
        v_role := 'farmer';
    END IF;

    v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''), split_part(NEW.email, '@', 1));
    v_phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');
    v_state := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'state'), ''), 'Tamil Nadu');
    v_district := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'district'), ''), 'Coimbatore');
    v_company := COALESCE(NEW.raw_user_meta_data ->> 'company_name', '');

    INSERT INTO public.profiles (
        id,
        name,
        email,
        phone,
        role,
        company_name,
        state,
        district,
        kyc_status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id::text,
        v_name,
        NEW.email,
        v_phone,
        v_role,
        v_company,
        v_state,
        v_district,
        'pending',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
        company_name = COALESCE(NULLIF(EXCLUDED.company_name, ''), public.profiles.company_name),
        state = COALESCE(NULLIF(EXCLUDED.state, ''), public.profiles.state),
        district = COALESCE(NULLIF(EXCLUDED.district, ''), public.profiles.district),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_registration();

-- 5. Lock down table-level execution permissions (revoke anonymous writes)
REVOKE ALL ON TABLE public.profiles FROM anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

SELECT 'Profile registration RLS policies & automatic trigger successfully installed!' AS status;

