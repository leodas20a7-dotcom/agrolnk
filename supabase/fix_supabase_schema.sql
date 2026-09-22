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
DO $$
BEGIN
  -- Orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow public read orders') THEN
    CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow public write orders') THEN
    CREATE POLICY "Allow public write orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Deliveries
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deliveries' AND policyname = 'Allow public read deliveries') THEN
    CREATE POLICY "Allow public read deliveries" ON public.deliveries FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deliveries' AND policyname = 'Allow public write deliveries') THEN
    CREATE POLICY "Allow public write deliveries" ON public.deliveries FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Financing Requests
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financing_requests' AND policyname = 'Allow public read financing') THEN
    CREATE POLICY "Allow public read financing" ON public.financing_requests FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financing_requests' AND policyname = 'Allow public write financing') THEN
    CREATE POLICY "Allow public write financing" ON public.financing_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Inspections
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'Allow public read inspections') THEN
    CREATE POLICY "Allow public read inspections" ON public.inspections FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'Allow public write inspections') THEN
    CREATE POLICY "Allow public write inspections" ON public.inspections FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Warehouse Receipts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouse_receipts' AND policyname = 'Allow public read warehouse_receipts') THEN
    CREATE POLICY "Allow public read warehouse_receipts" ON public.warehouse_receipts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouse_receipts' AND policyname = 'Allow public write warehouse_receipts') THEN
    CREATE POLICY "Allow public write warehouse_receipts" ON public.warehouse_receipts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Allow public read chat_messages') THEN
    CREATE POLICY "Allow public read chat_messages" ON public.chat_messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Allow public write chat_messages') THEN
    CREATE POLICY "Allow public write chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

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
    'notifications', 'chat_messages', 'inspections'
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

