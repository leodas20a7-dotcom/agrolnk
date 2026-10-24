-- ============================================================================
-- AGROLNK COMPREHENSIVE SUPABASE SCHEMA REPAIR & CONSTRAINT HARMONIZATION
-- Run this script in your Supabase Project -> SQL Editor to resolve all
-- cross-portal synchronization issues, foreign key blocks, and check constraints.
-- ============================================================================

-- 1. ORDERS TABLE: Remove Restrictive Foreign Keys & Expand Constraints
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_farmer_id_fkey;
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_listing_id_fkey;
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_auction_id_fkey;
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_escrow_status_check;
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add updated flexible check constraints
ALTER TABLE IF EXISTS public.orders ADD CONSTRAINT orders_escrow_status_check 
  CHECK (escrow_status IN ('pending', 'financing_pending', 'funded', 'held', 'escrow_secured', 'released', 'refunded', 'disputed'));

ALTER TABLE IF EXISTS public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'order_placed', 'confirmed', 'ready_for_delivery', 'transport_assigned', 'dispatched', 'in_transit', 'delivered', 'completed', 'cancelled'));

-- Ensure all application columns exist on orders
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'direct';
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS financing_request_id TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS financing_request_number TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS financing_amount NUMERIC;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS buyer_margin_deposit NUMERIC;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS admin_verified_by TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS admin_verification_status TEXT DEFAULT 'pending';
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS admin_call_notes TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS admin_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payout_bank_name TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payout_account_number TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payout_ifsc TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS bank_utr TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE;

-- 2. DELIVERIES TABLE: Remove Foreign Keys & Widen Status Check
ALTER TABLE IF EXISTS public.deliveries DROP CONSTRAINT IF EXISTS deliveries_order_id_fkey;
ALTER TABLE IF EXISTS public.deliveries DROP CONSTRAINT IF EXISTS deliveries_transporter_id_fkey;
ALTER TABLE IF EXISTS public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;

ALTER TABLE IF EXISTS public.deliveries ADD CONSTRAINT deliveries_status_check 
  CHECK (status IN ('transport_requested', 'price_offered', 'assigned', 'picked_up', 'dispatched', 'in_transit', 'delivered', 'completed', 'cancelled'));

ALTER TABLE IF EXISTS public.deliveries ADD COLUMN IF NOT EXISTS freight_amount NUMERIC;
ALTER TABLE IF EXISTS public.deliveries ADD COLUMN IF NOT EXISTS estimated_distance_km NUMERIC;
ALTER TABLE IF EXISTS public.deliveries ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE IF EXISTS public.deliveries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS public.deliveries ADD COLUMN IF NOT EXISTS pickup_otp TEXT;
ALTER TABLE IF EXISTS public.deliveries ADD COLUMN IF NOT EXISTS delivery_otp TEXT;

-- 3. FINANCING REQUESTS TABLE: Ensure all columns & relaxed constraints
ALTER TABLE IF EXISTS public.financing_requests DROP CONSTRAINT IF EXISTS financing_requests_applicant_id_fkey;
ALTER TABLE IF EXISTS public.financing_requests DROP CONSTRAINT IF EXISTS financing_requests_order_id_fkey;
ALTER TABLE IF EXISTS public.financing_requests DROP CONSTRAINT IF EXISTS financing_requests_status_check;

ALTER TABLE IF EXISTS public.financing_requests ADD CONSTRAINT financing_requests_status_check 
  CHECK (status IN ('pending', 'under_review', 'offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured', 'repaid', 'settled', 'rejected', 'cancelled'));

ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS offered_amount NUMERIC;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0.85;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS tenor_days NUMERIC DEFAULT 30;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS offer_notes TEXT;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS offered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS borrower_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS financier_id TEXT;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS financier_name TEXT;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS financier_email TEXT;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS bank_utr TEXT;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS margin_paid BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS escrow_funded BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS margin_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS repaid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS repayment_method TEXT;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS repayment_transaction_id TEXT;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS repayment_amount NUMERIC;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS repayment_principal NUMERIC;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS repayment_interest NUMERIC;
ALTER TABLE IF EXISTS public.financing_requests ADD COLUMN IF NOT EXISTS repayment_notes TEXT;

-- 4. INSPECTIONS TABLE: Remove FK Blocks & Ensure Fee Columns
ALTER TABLE IF EXISTS public.inspections DROP CONSTRAINT IF EXISTS inspections_order_id_fkey;
ALTER TABLE IF EXISTS public.inspections DROP CONSTRAINT IF EXISTS inspections_buyer_id_fkey;
ALTER TABLE IF EXISTS public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;

ALTER TABLE IF EXISTS public.inspections ADD CONSTRAINT inspections_status_check 
  CHECK (status IN ('requested', 'assigned', 'passed', 'failed', 'disputed', 'resolved'));

ALTER TABLE IF EXISTS public.inspections ADD COLUMN IF NOT EXISTS inspection_fee NUMERIC DEFAULT 500;
ALTER TABLE IF EXISTS public.inspections ADD COLUMN IF NOT EXISTS fee_status TEXT DEFAULT 'unpaid';
ALTER TABLE IF EXISTS public.inspections ADD COLUMN IF NOT EXISTS fee_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.inspections ADD COLUMN IF NOT EXISTS fee_payment_id TEXT;
ALTER TABLE IF EXISTS public.inspections ADD COLUMN IF NOT EXISTS fee_payment_method TEXT;
ALTER TABLE IF EXISTS public.inspections ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE IF EXISTS public.inspections ADD COLUMN IF NOT EXISTS arbitration JSONB DEFAULT '{}'::jsonb;

-- 4B. AUCTIONS & BIDS TABLE: Support Forward/Reverse Auction Engine & Custom Bid Steps
ALTER TABLE IF EXISTS public.auctions ADD COLUMN IF NOT EXISTS auction_type TEXT DEFAULT 'forward';
ALTER TABLE IF EXISTS public.auctions ADD COLUMN IF NOT EXISTS bid_step NUMERIC DEFAULT 25;
ALTER TABLE IF EXISTS public.auctions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS public.auctions ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE IF EXISTS public.auctions DROP CONSTRAINT IF EXISTS auctions_status_check;
ALTER TABLE IF EXISTS public.auctions ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('draft', 'live', 'completed', 'reserve_not_met', 'ended_unsold', 'cancelled'));

-- Remove legacy forward-only check constraints to allow reverse auction bidding (reserve_price < base_price)
ALTER TABLE IF EXISTS public.auctions DROP CONSTRAINT IF EXISTS auctions_check;
ALTER TABLE IF EXISTS public.auctions DROP CONSTRAINT IF EXISTS auctions_reserve_price_check;
ALTER TABLE IF EXISTS public.auctions DROP CONSTRAINT IF EXISTS auctions_farmer_id_fkey;

-- 5. WAREHOUSE RECEIPTS TABLE: Create table if not exists & ensure all columns
CREATE TABLE IF NOT EXISTS public.warehouse_receipts (
  id TEXT PRIMARY KEY,
  receipt_number TEXT,
  farmer_id TEXT,
  farmer_name TEXT,
  farmer_phone TEXT,
  warehouse_id TEXT,
  warehouse_name TEXT,
  chamber TEXT,
  commodity TEXT,
  variety TEXT,
  grade TEXT DEFAULT 'A',
  total_quantity NUMERIC DEFAULT 0,
  available_quantity NUMERIC DEFAULT 0,
  locked_quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  estimated_value NUMERIC DEFAULT 0,
  storage_fee_monthly NUMERIC DEFAULT 0,
  assayed_quality JSONB DEFAULT '{}'::jsonb,
  deposited_at TIMESTAMP WITH TIME ZONE,
  last_rent_paid_at TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'stored',
  warehouse_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.warehouse_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warehouse_receipts DROP CONSTRAINT IF EXISTS warehouse_receipts_farmer_id_fkey;
ALTER TABLE IF EXISTS public.warehouse_receipts DROP CONSTRAINT IF EXISTS warehouse_receipts_warehouse_id_fkey;
ALTER TABLE IF EXISTS public.warehouse_receipts ADD COLUMN IF NOT EXISTS last_rent_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.warehouse_receipts ADD COLUMN IF NOT EXISTS storage_fee_monthly NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.warehouse_receipts ADD COLUMN IF NOT EXISTS farmer_phone TEXT;
ALTER TABLE IF EXISTS public.warehouse_receipts ADD COLUMN IF NOT EXISTS warehouse_notes TEXT;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES: Allow Read/Write for App Operation
-- Orders
DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write orders" ON public.orders;
CREATE POLICY "Allow public write orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- Deliveries
DROP POLICY IF EXISTS "Allow public read deliveries" ON public.deliveries;
CREATE POLICY "Allow public read deliveries" ON public.deliveries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write deliveries" ON public.deliveries;
CREATE POLICY "Allow public write deliveries" ON public.deliveries FOR ALL USING (true) WITH CHECK (true);

-- Financing Requests
DROP POLICY IF EXISTS "Allow public read financing" ON public.financing_requests;
CREATE POLICY "Allow public read financing" ON public.financing_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write financing" ON public.financing_requests;
CREATE POLICY "Allow public write financing" ON public.financing_requests FOR ALL USING (true) WITH CHECK (true);

-- Inspections
DROP POLICY IF EXISTS "Allow public read inspections" ON public.inspections;
CREATE POLICY "Allow public read inspections" ON public.inspections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write inspections" ON public.inspections;
CREATE POLICY "Allow public write inspections" ON public.inspections FOR ALL USING (true) WITH CHECK (true);

-- Warehouse Receipts
DROP POLICY IF EXISTS "Allow public read warehouse_receipts" ON public.warehouse_receipts;
CREATE POLICY "Allow public read warehouse_receipts" ON public.warehouse_receipts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write warehouse_receipts" ON public.warehouse_receipts;
CREATE POLICY "Allow public write warehouse_receipts" ON public.warehouse_receipts FOR ALL USING (true) WITH CHECK (true);

-- 7. CHAT MESSAGES TABLE: Create table & ensure RLS
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  thread_key TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  sender_role TEXT,
  raw_text TEXT,
  text TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read chat_messages" ON public.chat_messages;
CREATE POLICY "Allow public read chat_messages" ON public.chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write chat_messages" ON public.chat_messages;
CREATE POLICY "Allow public write chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- 8. DUPLICATE ORDER PREVENTION & DEDUPLICATION
-- Safely deduplicate any legacy test orders sharing the same auction_id before creating the unique index
DELETE FROM public.orders
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY auction_id ORDER BY created_at DESC, id DESC) as rn
    FROM public.orders
    WHERE auction_id IS NOT NULL
  ) duplicates
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_auction ON public.orders(auction_id) WHERE auction_id IS NOT NULL;

-- 9. COMPOSITE PERFORMANCE INDEXES
-- Profiles & Roles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);

-- Marketplace Listings & Auctions Columns
ALTER TABLE IF EXISTS public.listings ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE IF EXISTS public.auctions ADD COLUMN IF NOT EXISTS village TEXT;

-- Marketplace Listings
CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON public.listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_commodity ON public.listings(commodity);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);

-- Live Auctions & Bids
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_farmer_id ON public.auctions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON public.auction_bids(auction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder_id ON public.auction_bids(bidder_id);

-- Orders & Escrow Settlements
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON public.orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON public.orders(escrow_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Deliveries & Fleet Logistics
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_transporter_id ON public.deliveries(transporter_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON public.deliveries(created_at DESC);

-- Financing & Trade Credit
CREATE INDEX IF NOT EXISTS idx_financing_applicant_id ON public.financing_requests(applicant_id);
CREATE INDEX IF NOT EXISTS idx_financing_financier_id ON public.financing_requests(financier_id);
CREATE INDEX IF NOT EXISTS idx_financing_status ON public.financing_requests(status);
CREATE INDEX IF NOT EXISTS idx_financing_created_at ON public.financing_requests(created_at DESC);

-- Warehouse & Digital Receipts (e-NWR)
CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_warehouse_id ON public.warehouse_receipts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_farmer_id ON public.warehouse_receipts(farmer_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_status ON public.warehouse_receipts(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_created_at ON public.warehouse_receipts(created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON public.notifications(recipient_role, created_at DESC);

-- Chat Messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_key ON public.chat_messages(thread_key, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id, created_at DESC);

-- Inspections
CREATE INDEX IF NOT EXISTS idx_inspections_order_id ON public.inspections(order_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections(created_at DESC);

-- 10. COMPREHENSIVE SUPABASE REALTIME PUBLICATION
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'orders', 'deliveries', 'auctions', 'auction_bids', 
    'listings', 'warehouse_receipts', 'financing_requests', 
    'notifications', 'chat_messages', 'inspections',
    'buyer_demands', 'demand_offers'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add table % to supabase_realtime: %', tbl, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- 11. BUYER DEMANDS & HYBRID PROCUREMENT DESK (WANTED LIST)
CREATE TABLE IF NOT EXISTS public.buyer_demands (
  id TEXT PRIMARY KEY,
  demand_number TEXT,
  buyer_id TEXT,
  buyer_name TEXT,
  buyer_phone TEXT,
  commodity TEXT NOT NULL,
  variety TEXT DEFAULT 'None',
  grade TEXT DEFAULT 'A',
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'kg',
  procurement_mode TEXT DEFAULT 'direct_offers', -- 'direct_offers' | 'reverse_auction'
  target_price NUMERIC,
  price_unit TEXT DEFAULT 'Quintal',
  bid_step NUMERIC DEFAULT 25,
  current_lowest_bid NUMERIC,
  leading_bidder_id TEXT,
  leading_bidder_name TEXT,
  delivery_state TEXT,
  delivery_district TEXT,
  delivery_pincode TEXT,
  delivery_address TEXT,
  needed_by_date DATE,
  duration_hours NUMERIC DEFAULT 24,
  ends_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  total_offers INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open', -- 'open' | 'awarded' | 'closed' | 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.demand_offers (
  id TEXT PRIMARY KEY,
  demand_id TEXT,
  farmer_id TEXT,
  farmer_name TEXT,
  farmer_phone TEXT,
  offer_price NUMERIC NOT NULL,
  quantity_offered NUMERIC NOT NULL,
  unit TEXT DEFAULT 'kg',
  message TEXT,
  status TEXT DEFAULT 'submitted', -- 'submitted' | 'accepted' | 'rejected' | 'countered'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_demands_status ON public.buyer_demands(status);
CREATE INDEX IF NOT EXISTS idx_buyer_demands_commodity ON public.buyer_demands(commodity);
CREATE INDEX IF NOT EXISTS idx_buyer_demands_buyer ON public.buyer_demands(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_demands_created ON public.buyer_demands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demand_offers_demand ON public.demand_offers(demand_id);
CREATE INDEX IF NOT EXISTS idx_demand_offers_farmer ON public.demand_offers(farmer_id);

ALTER TABLE IF EXISTS public.buyer_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.demand_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read buyer_demands" ON public.buyer_demands;
CREATE POLICY "Allow public read buyer_demands" ON public.buyer_demands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write buyer_demands" ON public.buyer_demands;
CREATE POLICY "Allow public write buyer_demands" ON public.buyer_demands FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read demand_offers" ON public.demand_offers;
CREATE POLICY "Allow public read demand_offers" ON public.demand_offers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write demand_offers" ON public.demand_offers;
CREATE POLICY "Allow public write demand_offers" ON public.demand_offers FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. AUCTIONS TABLE: Harmonize Constraints For Reverse & Forward Auctions
-- ============================================================================
-- Drop restrictive forward-only check constraints (such as current_bid >= base_price)
ALTER TABLE IF EXISTS public.auctions DROP CONSTRAINT IF EXISTS auctions_check1;
ALTER TABLE IF EXISTS public.auctions DROP CONSTRAINT IF EXISTS auctions_check;
ALTER TABLE IF EXISTS public.auctions DROP CONSTRAINT IF EXISTS auctions_current_bid_check;
ALTER TABLE IF EXISTS public.auctions DROP CONSTRAINT IF EXISTS auctions_reserve_price_check;

-- Add updated flexible checks compatible with both forward & reverse auctions
ALTER TABLE IF EXISTS public.auctions ADD CONSTRAINT auctions_current_bid_check CHECK (current_bid > 0);
ALTER TABLE IF EXISTS public.auctions ADD CONSTRAINT auctions_reserve_price_check CHECK (reserve_price > 0);

-- Updated atomic bidding procedure with full reverse auction downward bidding support
CREATE OR REPLACE FUNCTION public.place_auction_bid_atomic(
    p_auction_id TEXT,
    p_bidder_id TEXT,
    p_bidder_name TEXT,
    p_bid_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_auction RECORD;
    v_new_bid_id TEXT;
    v_prev_bidder_id TEXT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- 1. Acquire exclusive row lock on the auction to eliminate race conditions
    SELECT * INTO v_auction 
    FROM public.auctions 
    WHERE id = p_auction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    -- 2. Verify auction is strictly live
    IF v_auction.status != 'live' THEN
        RAISE EXCEPTION 'This auction is no longer live (Status: %).', v_auction.status;
    END IF;

    -- 3. Verify auction has not expired
    IF v_now >= v_auction.end_time THEN
        UPDATE public.auctions SET status = 'completed', updated_at = v_now WHERE id = p_auction_id;
        RAISE EXCEPTION 'This auction has ended and is no longer accepting bids.';
    END IF;

    -- 4. Prevent Shill-Bidding (Producers cannot bid on their own lot)
    IF v_auction.farmer_id IS NOT NULL AND v_auction.farmer_id = p_bidder_id THEN
        RAISE EXCEPTION 'Producers are not permitted to bid on their own auctions.';
    END IF;

    -- 5. Verify bid amount based on auction type (Forward vs Reverse)
    IF COALESCE(v_auction.auction_type, 'forward') = 'reverse' THEN
        IF p_bid_amount >= v_auction.current_bid THEN
            RAISE EXCEPTION 'In a reverse auction, your bid of ₹% must be lower than the current leading bid of ₹%.', p_bid_amount, v_auction.current_bid;
        END IF;
        IF v_auction.reserve_price IS NOT NULL AND p_bid_amount < v_auction.reserve_price THEN
            RAISE EXCEPTION 'Bid cannot be lower than the farmer''s reserve floor price of ₹%.', v_auction.reserve_price;
        END IF;
    ELSE
        IF p_bid_amount <= v_auction.current_bid THEN
            RAISE EXCEPTION 'Your bid of ₹% must be higher than the current leading bid of ₹%.', p_bid_amount, v_auction.current_bid;
        END IF;
    END IF;

    -- Save previous highest bidder for outbid notification
    v_prev_bidder_id := v_auction.highest_bidder_id;

    -- 6. Insert new bid record
    v_new_bid_id := 'bid_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6);
    INSERT INTO public.auction_bids (id, auction_id, bidder_id, bidder_name, bid_amount, created_at)
    VALUES (v_new_bid_id, p_auction_id, p_bidder_id, COALESCE(p_bidder_name, 'Buyer Partner'), p_bid_amount, v_now);

    -- 7. Update auction current bid atomically
    UPDATE public.auctions SET
        current_bid = p_bid_amount,
        highest_bidder_id = p_bidder_id,
        highest_bidder_name = COALESCE(p_bidder_name, 'Buyer Partner'),
        total_bids = COALESCE(v_auction.total_bids, 0) + 1,
        updated_at = v_now
    WHERE id = p_auction_id;

    -- 8. Disclose instant outbid notification to previous leader
    IF v_prev_bidder_id IS NOT NULL AND v_prev_bidder_id != p_bidder_id THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_prev_bidder_id,
            'buyer',
            'Outbid on ' || v_auction.commodity,
            'Another buyer placed a new leading bid of ₹' || p_bid_amount || '/' || v_auction.unit || '. Re-enter the arena to reclaim the lot.',
            'order',
            '/buyer-live-auctions',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'auction_id', p_auction_id,
        'bid_id', v_new_bid_id,
        'current_bid', p_bid_amount,
        'highest_bidder_id', p_bidder_id,
        'highest_bidder_name', COALESCE(p_bidder_name, 'Buyer Partner'),
        'total_bids', COALESCE(v_auction.total_bids, 0) + 1,
        'status', 'live'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



