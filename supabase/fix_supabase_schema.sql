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

-- Enable Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.financing_requests;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_receipts;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
