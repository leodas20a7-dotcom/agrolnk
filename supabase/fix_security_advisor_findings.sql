-- =============================================================================
-- Fix Supabase Security Advisor Errors & Warnings on mgifyqdssdhjfilvvwbl
-- 1. Enable RLS & owner/admin-only policies on public.user_bank_accounts
--    (resolves "RLS Disabled in Public" + "Sensitive Columns Exposed")
-- 2. Pin search_path = public, pg_temp on all public functions/procedures
--    (resolves "Function Search Path Mutable" warnings)
-- =============================================================================

-- 1. Lock down public.user_bank_accounts
DO $$
DECLARE
  v_owner_col TEXT;
  v_owner_expr TEXT;
  v_admin_expr TEXT := $adm$EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id::text = auth.uid()::text AND LOWER(COALESCE(pr.role, '')) = 'admin')$adm$;
  v_pol RECORD;
BEGIN
  IF to_regclass('public.user_bank_accounts') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.user_bank_accounts FROM anon, PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_bank_accounts TO authenticated;

    ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;

    -- Drop any old policies on user_bank_accounts
    FOR v_pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'user_bank_accounts'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_bank_accounts;', v_pol.policyname);
    END LOOP;

    -- Detect owner column safely
    SELECT c.column_name
    INTO v_owner_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'user_bank_accounts'
      AND c.column_name IN ('user_id', 'profile_id', 'owner_id')
    ORDER BY CASE c.column_name
      WHEN 'user_id' THEN 1
      WHEN 'profile_id' THEN 2
      WHEN 'owner_id' THEN 3
    END
    LIMIT 1;

    IF v_owner_col IS NOT NULL THEN
      v_owner_expr := format('%I::text = auth.uid()::text', v_owner_col);
    ELSE
      -- Fail closed to admin-only if no standard owner column exists
      v_owner_expr := 'false';
    END IF;

    EXECUTE format(
      'CREATE POLICY agrolnk_user_bank_accounts_select ON public.user_bank_accounts FOR SELECT TO authenticated USING ((%s) OR (%s));',
      v_owner_expr,
      v_admin_expr
    );
    EXECUTE format(
      'CREATE POLICY agrolnk_user_bank_accounts_insert ON public.user_bank_accounts FOR INSERT TO authenticated WITH CHECK ((%s) OR (%s));',
      v_owner_expr,
      v_admin_expr
    );
    EXECUTE format(
      'CREATE POLICY agrolnk_user_bank_accounts_update ON public.user_bank_accounts FOR UPDATE TO authenticated USING ((%s) OR (%s)) WITH CHECK ((%s) OR (%s));',
      v_owner_expr,
      v_admin_expr,
      v_owner_expr,
      v_admin_expr
    );
    EXECUTE format(
      'CREATE POLICY agrolnk_user_bank_accounts_delete ON public.user_bank_accounts FOR DELETE TO authenticated USING ((%s) OR (%s));',
      v_owner_expr,
      v_admin_expr
    );
  END IF;
END $$;

-- 2. Pin search_path on all public functions & procedures missing search_path
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      p.prokind,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    IF r.prokind = 'p' THEN
      EXECUTE format('ALTER PROCEDURE public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.identity_args);
    ELSE
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.identity_args);
    END IF;
  END LOOP;
END $$;

-- 3. Verification output
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_bank_accounts';
