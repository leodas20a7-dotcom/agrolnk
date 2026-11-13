-- ============================================================================
-- AGROLNK COMMODITY CATALOG & VARIETIES DATABASE SCHEMA & RLS
-- Run this script in your Supabase SQL Editor to enable full CRUD permissions
-- for the platform commodity catalog and commercial varieties.
-- ============================================================================

-- 1. Ensure required columns exist on the commodities table
ALTER TABLE IF EXISTS public.commodities ADD COLUMN IF NOT EXISTS varieties JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.commodities ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'Agriculture';

-- 2. Enable Row Level Security (RLS)
ALTER TABLE IF EXISTS public.commodities ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public & Authenticated Read Access
DROP POLICY IF EXISTS "Allow public read commodities" ON public.commodities;
DROP POLICY IF EXISTS "commodities_select_all" ON public.commodities;
CREATE POLICY "commodities_select_all" ON public.commodities
    FOR SELECT USING (true);

-- 4. Policy: Admin-only Insert Access (blocks anon & non-admin catalog poisoning)
DROP POLICY IF EXISTS "Allow public insert commodities" ON public.commodities;
DROP POLICY IF EXISTS "Allow public insert/update commodities" ON public.commodities;
DROP POLICY IF EXISTS "commodities_insert_all" ON public.commodities;
DROP POLICY IF EXISTS "commodities_insert_admin_only" ON public.commodities;
CREATE POLICY "commodities_insert_admin_only" ON public.commodities
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

-- 5. Policy: Admin-only Update Access
DROP POLICY IF EXISTS "Allow public update commodities" ON public.commodities;
DROP POLICY IF EXISTS "commodities_update_all" ON public.commodities;
DROP POLICY IF EXISTS "commodities_update_admin_only" ON public.commodities;
CREATE POLICY "commodities_update_admin_only" ON public.commodities
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. Policy: Admin-only Delete Access
DROP POLICY IF EXISTS "commodities_delete_all" ON public.commodities;
DROP POLICY IF EXISTS "commodities_delete_admin_only" ON public.commodities;
CREATE POLICY "commodities_delete_admin_only" ON public.commodities
    FOR DELETE TO authenticated
    USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON TABLE public.commodities FROM anon;
GRANT SELECT ON TABLE public.commodities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.commodities TO authenticated;
GRANT ALL ON TABLE public.commodities TO service_role;
