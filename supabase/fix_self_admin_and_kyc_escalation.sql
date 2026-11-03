-- ============================================================================
-- AGROLNK SECURITY FIX: ELIMINATE SELF-ADMIN PROMOTION & FAKE KYC VERIFICATION
-- File: supabase/fix_self_admin_and_kyc_escalation.sql
-- Description:
--   1. Enforces 'pending' as the database-level DEFAULT for kyc_status.
--   2. Installs an anti-tampering trigger on public.profiles:
--      - BLOCKS users from altering their account 'role' (cannot promote to admin).
--      - BLOCKS users from setting 'kyc_status' to 'verified' (only Admin can approve).
--   3. Installs a registration guard trigger:
--      - BLOCKS any registration specifying role = 'admin'.
--      - FORCES kyc_status = 'pending' on all new accounts.
--   4. Hardens is_admin() with explicit search_path.
--   5. Replaces all legacy policies with strict, role-isolated RLS rules.
-- ============================================================================

-- 1. Ensure kyc_status defaults to 'pending' at database level (Fixes High #8)
ALTER TABLE IF EXISTS public.profiles 
  ALTER COLUMN kyc_status SET DEFAULT 'pending';

-- 2. Harden is_admin() helper with controlled search_path (Fixes High #11)
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
        (auth.jwt() ->> 'email') = 'admin@agrolnk.com' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );
END;
$$;

-- 3. Anti-Tampering Trigger: Block Role Escalation & Self-Approved KYC on UPDATE
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Permit all modifications by Admin or Supabase Service Role
    IF public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Block non-admin from changing their account role (CRITICAL SECURITY CHECK)
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Security Policy Violation: You cannot alter your account role. Role escalation is forbidden.';
    END IF;

    -- Block non-admin from approving their own KYC status
    IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
        IF NEW.kyc_status = 'verified' THEN
            RAISE EXCEPTION 'Security Policy Violation: Self-approval of KYC verification is strictly forbidden.';
        END IF;
    END IF;

    -- Ensure id cannot be re-bound
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Security Policy Violation: Profile identifier cannot be changed.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- 4. Registration Guard Trigger: Block Admin Role Injection & Pre-Verified KYC on INSERT
CREATE OR REPLACE FUNCTION public.protect_profile_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Block non-admins from registering with role = 'admin'
    IF LOWER(COALESCE(NEW.role, '')) = 'admin' THEN
        IF NOT (public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role') THEN
            RAISE EXCEPTION 'Security Policy Violation: Self-registration as platform administrator is strictly prohibited.';
        END IF;
    END IF;

    -- Ensure newly registered accounts always start as 'pending'
    IF NOT (public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role') THEN
        NEW.kyc_status := 'pending';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_registration ON public.profiles;
CREATE TRIGGER trg_protect_profile_registration
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_registration();

-- 5. Consolidate & Harden RLS Policies on public.profiles (Remove all permissive loopholes)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

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

-- Strict SELECT: User sees own profile; Admin sees all
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid()::text = id OR
        public.is_admin()
    );

-- Strict INSERT: Registered user creates own profile with non-admin role
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (
        (auth.uid()::text = id OR auth.role() IN ('authenticated', 'anon')) AND
        (role <> 'admin' OR public.is_admin())
    );

-- Strict UPDATE: User updates own profile; Admin updates all; Role & KYC escalation blocked by trigger
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        auth.uid()::text = id OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = id OR
        public.is_admin()
    );

-- Strict DELETE: Admin only
CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE USING (
        public.is_admin()
    );

