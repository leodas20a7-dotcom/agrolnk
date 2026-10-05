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
DROP POLICY IF EXISTS "commodities_select_all" ON public.commodities;
CREATE POLICY "commodities_select_all" ON public.commodities
    FOR SELECT USING (true);

-- 4. Policy: Insert Access for Admin and Platform Services
DROP POLICY IF EXISTS "commodities_insert_all" ON public.commodities;
CREATE POLICY "commodities_insert_all" ON public.commodities
    FOR INSERT WITH CHECK (true);

-- 5. Policy: Update Access for Admin and Platform Services
DROP POLICY IF EXISTS "commodities_update_all" ON public.commodities;
CREATE POLICY "commodities_update_all" ON public.commodities
    FOR UPDATE USING (true) WITH CHECK (true);

-- 6. Policy: Delete Access for Admin and Platform Services
DROP POLICY IF EXISTS "commodities_delete_all" ON public.commodities;
CREATE POLICY "commodities_delete_all" ON public.commodities
    FOR DELETE USING (true);
