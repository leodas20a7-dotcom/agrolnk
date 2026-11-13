-- ============================================================================
-- AGROLNK CONSOLIDATED PRODUCTION DATABASE SECURITY & RLS CONSOLIDATION
-- File: supabase/consolidated_production_security_rls.sql
-- Resolves Audit Issues:
--   - Issue 12: Conflicting Supabase RLS policies eliminated
--   - Issue 13: Public database write access revoked across all business tables
--   - Issue 20: Verified production security state
-- Safe Execution: Uses dynamic inspection so it never fails on missing optional tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DYNAMICALLY DROP ALL DETECTED INSECURE WRITE POLICIES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
          AND (qual = 'true' OR with_check = 'true')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ENSURE ROW LEVEL SECURITY IS STRICTLY ENABLED
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warehouse_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.buyer_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.demand_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.listings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. ENSURE CHAT & DEMAND POLICIES ARE SECURED (IF TABLES EXIST)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- Chat Messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
        DROP POLICY IF EXISTS "chat_messages_select_policy" ON public.chat_messages;
        CREATE POLICY "chat_messages_select_policy" ON public.chat_messages
            FOR SELECT USING (
                auth.uid() IS NOT NULL AND (
                    sender_id = auth.uid()::text OR
                    public.is_admin() OR
                    thread_key LIKE '%' || auth.uid()::text || '%'
                )
            );

        DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;
        CREATE POLICY "chat_messages_insert_policy" ON public.chat_messages
            FOR INSERT WITH CHECK (
                auth.uid() IS NOT NULL AND (
                    sender_id = auth.uid()::text OR
                    public.is_admin()
                )
            );
    END IF;

    -- Buyer Demands
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buyer_demands') THEN
        DROP POLICY IF EXISTS "buyer_demands_write_policy" ON public.buyer_demands;
        CREATE POLICY "buyer_demands_write_policy" ON public.buyer_demands
            FOR ALL USING (
                auth.uid()::text = buyer_id OR
                public.is_admin()
            ) WITH CHECK (
                auth.uid()::text = buyer_id OR
                public.is_admin()
            );
    END IF;

    -- Demand Offers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'demand_offers') THEN
        DROP POLICY IF EXISTS "demand_offers_write_policy" ON public.demand_offers;
        CREATE POLICY "demand_offers_write_policy" ON public.demand_offers
            FOR ALL USING (
                auth.uid()::text = farmer_id OR
                public.is_admin()
            ) WITH CHECK (
                auth.uid()::text = farmer_id OR
                public.is_admin()
            );
    END IF;
    -- Listings (Public marketplace read, authenticated owner or admin write)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings') THEN
        DROP POLICY IF EXISTS "listings_read_policy" ON public.listings;
        CREATE POLICY "listings_read_policy" ON public.listings FOR SELECT USING (true);

        DROP POLICY IF EXISTS "listings_write_policy" ON public.listings;
        CREATE POLICY "listings_write_policy" ON public.listings
            FOR ALL TO authenticated
            USING (
                auth.uid()::text = farmer_id OR
                public.is_admin()
            ) WITH CHECK (
                auth.uid()::text = farmer_id OR
                public.is_admin()
            );
    END IF;

    -- Commodities Catalog (Public read, admin-only write)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commodities') THEN
        ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "commodities_select_all" ON public.commodities;
        CREATE POLICY "commodities_select_all" ON public.commodities FOR SELECT USING (true);

        DROP POLICY IF EXISTS "commodities_insert_admin_only" ON public.commodities;
        CREATE POLICY "commodities_insert_admin_only" ON public.commodities
            FOR INSERT TO authenticated
            WITH CHECK (public.is_admin());

        DROP POLICY IF EXISTS "commodities_update_admin_only" ON public.commodities;
        CREATE POLICY "commodities_update_admin_only" ON public.commodities
            FOR UPDATE TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());

        DROP POLICY IF EXISTS "commodities_delete_admin_only" ON public.commodities;
        CREATE POLICY "commodities_delete_admin_only" ON public.commodities
            FOR DELETE TO authenticated
            USING (public.is_admin());
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. VERIFICATION REPORT: Confirm 0 Insecure Write Policies Remain
-- ----------------------------------------------------------------------------
SELECT 
    'RLS Open Write Audit' AS check_name,
    COUNT(*) AS insecure_policies_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'SECURE (Zero unrestricted write policies exist)'
        ELSE 'ALERT: Insecure policies still detected'
    END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  AND (qual = 'true' OR with_check = 'true');
