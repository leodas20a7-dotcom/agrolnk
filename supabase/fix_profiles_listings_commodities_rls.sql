-- ============================================================================
-- AGROLNK SECURITY HARDENING: PROFILES, LISTINGS & COMMODITIES RLS
-- Fixes:
--   1. public.profiles: Blocks anon & cross-user INSERTs while preserving signup
--      when email confirmation is enabled (via auth.users SECURITY DEFINER trigger).
--   2. public.listings: Drops all legacy open write policies (e.g. "Allow public
--      insert/update listings") and restricts mutations strictly to the farmer
--      owner or admin.
--   3. public.commodities: Restricts INSERT / UPDATE / DELETE strictly to admins
--      while preserving public SELECT for catalog/dropdown discovery.
-- Safe & Idempotent: Run directly in Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENSURE STRICT ROW LEVEL SECURITY IS ENABLED
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.commodities ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. DYNAMICALLY DROP ALL EXISTING POLICIES ON profiles, listings, commodities
--    So no legacy open policy ("Allow public insert/update listings", etc.)
--    can survive alongside newer policies.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'listings', 'commodities')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. LOCK DOWN TABLE PRIVILEGES (REVOKE ANON WRITES)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE ALL ON TABLE public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.listings FROM anon;
GRANT SELECT ON TABLE public.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.listings TO authenticated;
GRANT ALL ON TABLE public.listings TO service_role;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.commodities FROM anon;
GRANT SELECT ON TABLE public.commodities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.commodities TO authenticated;
GRANT ALL ON TABLE public.commodities TO service_role;

-- ----------------------------------------------------------------------------
-- 4. PROFILES: STRICT AUTHENTICATED SELF-OR-ADMIN POLICIES + SIGNUP TRIGGER
-- ----------------------------------------------------------------------------
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid()::text = id OR
        public.is_admin()
    );

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            auth.uid()::text = id AND
            COALESCE(LOWER(role), '') <> 'admin'
        ) OR
        public.is_admin()
    );

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid()::text = id OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = id OR
        public.is_admin()
    );

CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE TO authenticated
    USING (
        public.is_admin()
    );

-- Keep auth.users signup trigger synced with state, district & company_name so
-- registrations succeed securely without granting anon INSERT on public.profiles
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

-- ----------------------------------------------------------------------------
-- 5. LISTINGS: PUBLIC READ, AUTHENTICATED FARMER OWNER OR ADMIN WRITE
-- ----------------------------------------------------------------------------
CREATE POLICY "listings_read_policy" ON public.listings
    FOR SELECT
    USING (true);

CREATE POLICY "listings_insert_policy" ON public.listings
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid()::text = farmer_id OR
        public.is_admin()
    );

CREATE POLICY "listings_update_policy" ON public.listings
    FOR UPDATE TO authenticated
    USING (
        auth.uid()::text = farmer_id OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = farmer_id OR
        public.is_admin()
    );

CREATE POLICY "listings_delete_policy" ON public.listings
    FOR DELETE TO authenticated
    USING (
        auth.uid()::text = farmer_id OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 6. COMMODITIES CATALOG: PUBLIC READ, ADMIN-ONLY WRITE
-- ----------------------------------------------------------------------------
CREATE POLICY "commodities_select_all" ON public.commodities
    FOR SELECT
    USING (true);

CREATE POLICY "commodities_insert_admin_only" ON public.commodities
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "commodities_update_admin_only" ON public.commodities
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "commodities_delete_admin_only" ON public.commodities
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. VERIFICATION REPORT: Confirm 0 Insecure Write Policies Remain
-- ----------------------------------------------------------------------------
SELECT
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'listings', 'commodities')
ORDER BY tablename, cmd, policyname;
