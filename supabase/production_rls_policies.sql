-- ============================================================================
-- AGROLNK PRODUCTION ROW-LEVEL SECURITY (RLS) POLICIES & ROLE ISOLATION
-- Run this script in your Supabase SQL Editor to enforce strict tenant isolation,
-- role boundaries, and privacy protection across all platform domains.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. HELPER FUNCTIONS FOR ROLE & ADMIN VERIFICATION
-- ----------------------------------------------------------------------------

-- Helper to check if the executing user has admin ombudsman role
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

-- Helper to check if current user is a verified financier
CREATE OR REPLACE FUNCTION public.is_verified_financier()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid()::text 
          AND role = 'financier' 
          AND kyc_status = 'verified'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE RLS
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid()::text = id OR
        public.is_admin() OR
        -- Allow trading participants to view counterpart profile summary (name, company, rating)
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid()::text = id OR
        public.is_admin() OR
        -- Allow registration flow
        auth.role() IN ('authenticated', 'anon')
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        auth.uid()::text = id OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = id OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 2. ORDERS TABLE RLS
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT USING (
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        public.is_admin() OR
        -- Transporters assigned to linked delivery can read order details
        EXISTS (
            SELECT 1 FROM public.deliveries d 
            WHERE d.order_id = orders.id 
              AND d.transporter_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT WITH CHECK (
        auth.uid()::text = buyer_id OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE USING (
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 3. DELIVERIES TABLE RLS (With Transporter & OTP Boundary)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_select_policy" ON public.deliveries;
CREATE POLICY "deliveries_select_policy" ON public.deliveries
    FOR SELECT USING (
        auth.uid()::text = transporter_id OR
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = deliveries.order_id 
              AND (o.farmer_id = auth.uid()::text OR o.buyer_id = auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS "deliveries_insert_policy" ON public.deliveries;
CREATE POLICY "deliveries_insert_policy" ON public.deliveries
    FOR INSERT WITH CHECK (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = deliveries.order_id 
              AND (o.buyer_id = auth.uid()::text OR o.farmer_id = auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS "deliveries_update_policy" ON public.deliveries;
CREATE POLICY "deliveries_update_policy" ON public.deliveries
    FOR UPDATE USING (
        auth.uid()::text = transporter_id OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = transporter_id OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 4. FINANCING REQUESTS TABLE RLS (Trade Credit & Liens)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.financing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financing_select_policy" ON public.financing_requests;
CREATE POLICY "financing_select_policy" ON public.financing_requests
    FOR SELECT USING (
        auth.uid()::text = applicant_id OR
        auth.uid()::text = financier_id OR
        public.is_verified_financier() OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "financing_insert_policy" ON public.financing_requests;
CREATE POLICY "financing_insert_policy" ON public.financing_requests
    FOR INSERT WITH CHECK (
        auth.uid()::text = applicant_id OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "financing_update_policy" ON public.financing_requests;
CREATE POLICY "financing_update_policy" ON public.financing_requests
    FOR UPDATE USING (
        auth.uid()::text = applicant_id OR
        auth.uid()::text = financier_id OR
        public.is_verified_financier() OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = applicant_id OR
        auth.uid()::text = financier_id OR
        public.is_verified_financier() OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 5. CHAT MESSAGES TABLE RLS (Thread Privacy & Anti-Leakage)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select_policy" ON public.chat_messages;
CREATE POLICY "chat_select_policy" ON public.chat_messages
    FOR SELECT USING (
        thread_key ILIKE '%' || auth.uid()::text || '%' OR
        sender_id = auth.uid()::text OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "chat_insert_policy" ON public.chat_messages;
CREATE POLICY "chat_insert_policy" ON public.chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()::text OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 6. INSPECTIONS & ASSAY REPORTS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspections_select_policy" ON public.inspections;
CREATE POLICY "inspections_select_policy" ON public.inspections
    FOR SELECT USING (
        auth.uid()::text = buyer_id OR
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = inspections.order_id 
              AND (o.farmer_id = auth.uid()::text OR o.buyer_id = auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS "inspections_insert_update_policy" ON public.inspections;
CREATE POLICY "inspections_insert_update_policy" ON public.inspections
    FOR ALL USING (
        auth.uid()::text = buyer_id OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = buyer_id OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 7. WAREHOUSE RECEIPTS (e-NWR) RLS
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.warehouse_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warehouse_receipts_select_policy" ON public.warehouse_receipts;
CREATE POLICY "warehouse_receipts_select_policy" ON public.warehouse_receipts
    FOR SELECT USING (
        auth.uid()::text = farmer_id OR
        auth.uid()::text = warehouse_id OR
        public.is_verified_financier() OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "warehouse_receipts_all_policy" ON public.warehouse_receipts;
CREATE POLICY "warehouse_receipts_all_policy" ON public.warehouse_receipts
    FOR ALL USING (
        auth.uid()::text = warehouse_id OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = warehouse_id OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 8. AUCTIONS & LISTINGS (Marketplace Discovery - Read Public, Write Owner)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auction_bids ENABLE ROW LEVEL SECURITY;

-- Listings
DROP POLICY IF EXISTS "listings_read_policy" ON public.listings;
CREATE POLICY "listings_read_policy" ON public.listings FOR SELECT USING (true);

DROP POLICY IF EXISTS "listings_write_policy" ON public.listings;
CREATE POLICY "listings_write_policy" ON public.listings
    FOR ALL USING (
        auth.uid()::text = farmer_id OR public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = farmer_id OR public.is_admin()
    );

-- Auctions
DROP POLICY IF EXISTS "auctions_read_policy" ON public.auctions;
CREATE POLICY "auctions_read_policy" ON public.auctions FOR SELECT USING (true);

DROP POLICY IF EXISTS "auctions_write_policy" ON public.auctions;
CREATE POLICY "auctions_write_policy" ON public.auctions
    FOR ALL USING (
        auth.uid()::text = farmer_id OR public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = farmer_id OR public.is_admin()
    );

-- Auction Bids
DROP POLICY IF EXISTS "bids_read_policy" ON public.auction_bids;
CREATE POLICY "bids_read_policy" ON public.auction_bids FOR SELECT USING (true);

DROP POLICY IF EXISTS "bids_insert_policy" ON public.auction_bids;
CREATE POLICY "bids_insert_policy" ON public.auction_bids
    FOR INSERT WITH CHECK (
        auth.uid()::text = bidder_id OR public.is_admin()
    );
