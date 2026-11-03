-- ============================================================================
-- FIX: RESOLVE "permission denied for table profiles" ON USER SIGNUP
-- File: supabase/fix_profiles_permission_denied.sql
-- Description:
--   1. Grants necessary schema and table permissions on public.profiles to
--      both 'anon' and 'authenticated' roles so registration can insert profiles.
--   2. Installs an automated trigger on auth.users (SECURITY DEFINER) so that
--      every newly registered user automatically gets their public.profiles row
--      created with 100% guarantee.
--   3. Syncs any orphaned auth.users accounts (like Mani) into public.profiles
--      so they can log in immediately.
-- ============================================================================

-- 1. Grant table-level access to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- 2. Automated trigger to create profile in public.profiles whenever an auth.users record is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role TEXT;
    v_name TEXT;
    v_phone TEXT;
BEGIN
    -- Extract role, name, phone from user metadata
    v_role := LOWER(COALESCE(NEW.raw_user_meta_data ->> 'role', 'farmer'));
    -- Block non-admin from creating admin via signup
    IF v_role = 'admin' THEN
        v_role := 'farmer';
    END IF;

    v_name := COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1));
    v_phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');

    INSERT INTO public.profiles (
        id,
        name,
        email,
        phone,
        role,
        kyc_status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id::text,
        v_name,
        NEW.email,
        v_phone,
        v_role,
        'pending',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. Sync any existing auth.users that don't have a profile row yet (e.g. Mani's account)
INSERT INTO public.profiles (
    id,
    name,
    email,
    phone,
    role,
    kyc_status,
    created_at,
    updated_at
)
SELECT 
    u.id::text,
    COALESCE(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'phone', ''),
    LOWER(COALESCE(u.raw_user_meta_data ->> 'role', 'farmer')),
    'pending',
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id::text
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
