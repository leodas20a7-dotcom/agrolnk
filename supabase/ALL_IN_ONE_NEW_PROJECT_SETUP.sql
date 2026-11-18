-- ============================================================================
-- AGROWLINK: ALL-IN-ONE NEW SUPABASE PROJECT SETUP
-- Generated from supabase/DEPLOY_ORDER.md + fix_orders_missing_fee_columns.sql
-- ============================================================================


-- >>> BEGIN supabase_schema.sql <<<
-- ============================================================================
-- AGROWLINK PRODUCTION DATABASE SCHEMA FOR SUPABASE (PostgreSQL)
-- Project: AGROWLINK Agri-Fintech & Digital Commodity Exchange
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE (Multi-Stakeholder Users)
-- Roles: farmer, buyer, transporter, warehouse, financier
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'transporter', 'warehouse', 'financier', 'admin', 'fpo')),
    company_name TEXT,
    state TEXT,
    district TEXT,
    address TEXT,
    pincode TEXT,
    landmark TEXT,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    route_account_id TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_beneficiary_name TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure admin and fpo roles are permitted in existing deployments
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('farmer', 'buyer', 'transporter', 'warehouse', 'financier', 'admin', 'fpo'));

-- ============================================================================
-- 2. DIRECT SPOT MARKET LISTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.listings (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    farmer_name TEXT NOT NULL,
    commodity TEXT NOT NULL,
    variety TEXT,
    grade TEXT NOT NULL DEFAULT 'A',
    quantity NUMERIC NOT NULL CHECK (quantity >= 0),
    unit TEXT NOT NULL DEFAULT 'kg',
    price NUMERIC NOT NULL CHECK (price >= 0),
    sale_type TEXT NOT NULL DEFAULT 'direct' CHECK (sale_type IN ('direct', 'auction')),
    state TEXT NOT NULL,
    district TEXT,
    harvest_date DATE,
    description TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'cancelled')),
    origin_warehouse_id TEXT,
    origin_receipt_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column additions for listings & auctions
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS village TEXT;

-- ============================================================================
-- 3. LIVE AUCTIONS & AUCTION BIDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.auctions (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    farmer_name TEXT NOT NULL,
    commodity TEXT NOT NULL,
    variety TEXT,
    grade TEXT NOT NULL DEFAULT 'A',
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'kg',
    base_price NUMERIC NOT NULL CHECK (base_price >= 0),
    reserve_price NUMERIC NOT NULL CHECK (reserve_price > 0),
    current_bid NUMERIC NOT NULL CHECK (current_bid > 0),
    highest_bidder_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    highest_bidder_name TEXT,
    total_bids INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('upcoming', 'live', 'completed', 'reserve_not_met', 'cancelled')),
    state TEXT,
    district TEXT,
    description TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column additions for auctions
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS public.auction_bids (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bidder_name TEXT NOT NULL,
    bid_amount NUMERIC NOT NULL CHECK (bid_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 4. ORDERS & ESCROW SETTLEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    listing_id TEXT,
    auction_id TEXT,
    buyer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    buyer_name TEXT NOT NULL,
    farmer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    farmer_name TEXT NOT NULL,
    commodity TEXT NOT NULL,
    variety TEXT,
    grade TEXT NOT NULL DEFAULT 'A',
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'kg',
    price_per_unit NUMERIC NOT NULL CHECK (price_per_unit > 0),
    total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
    state TEXT,
    district TEXT,
    escrow_status TEXT NOT NULL DEFAULT 'funded' CHECK (escrow_status IN ('pending', 'funded', 'held', 'released', 'refunded')),
    status TEXT NOT NULL DEFAULT 'order_placed' CHECK (status IN ('order_placed', 'transport_assigned', 'in_transit', 'delivered', 'completed', 'cancelled')),
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    razorpay_transfer_id TEXT,
    buyer_fee_amount NUMERIC DEFAULT 0,
    seller_fee_amount NUMERIC DEFAULT 0,
    platform_commission_amount NUMERIC DEFAULT 0,
    net_seller_amount NUMERIC DEFAULT 0,
    settlement_mode TEXT DEFAULT 'route_deferred',
    settlement_status TEXT DEFAULT 'pending_deposit' CHECK (settlement_status IN ('pending_deposit', 'captured_on_hold', 'released_to_seller', 'refunded_to_buyer')),
    delivery_otp TEXT,
    delivery_location JSONB DEFAULT '{}'::jsonb,
    buyer_phone TEXT,
    buyer_email TEXT,
    buyer_company TEXT,
    buyer_address TEXT,
    buyer_district TEXT,
    buyer_state TEXT,
    buyer_pincode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure delivery_location and buyer address columns exist on orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_location JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_company TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_district TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_state TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_pincode TEXT;

-- ============================================================================
-- 5. LOGISTICS & DELIVERIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
    id TEXT PRIMARY KEY,
    delivery_number TEXT UNIQUE NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    farmer_id TEXT,
    farmer_name TEXT,
    buyer_id TEXT,
    buyer_name TEXT,
    transporter_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    transporter_name TEXT,
    vehicle_type TEXT,
    vehicle_number TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    freight_amount NUMERIC,
    estimated_distance_km NUMERIC,
    commodity TEXT NOT NULL,
    grade TEXT,
    variety TEXT,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    pickup_location JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_location JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'transport_requested' CHECK (status IN ('transport_requested', 'price_offered', 'assigned', 'picked_up', 'dispatched', 'in_transit', 'delivered', 'completed')),
    notes TEXT,
    pickup_otp TEXT,
    delivery_otp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure newly added columns exist for existing deployments
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS freight_amount NUMERIC;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS estimated_distance_km NUMERIC;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check CHECK (status IN ('transport_requested', 'price_offered', 'assigned', 'picked_up', 'dispatched', 'in_transit', 'delivered', 'completed'));

-- ============================================================================
-- 6. WAREHOUSES & ELECTRONIC NEGOTIABLE WAREHOUSE RECEIPTS (e-NWR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    operator_name TEXT,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    address TEXT,
    capacity_total NUMERIC NOT NULL DEFAULT 5000,
    capacity_available NUMERIC NOT NULL DEFAULT 2500,
    unit TEXT NOT NULL DEFAULT 'MT',
    is_cold_storage BOOLEAN NOT NULL DEFAULT false,
    temperature_range TEXT,
    storage_fee_per_mt_monthly NUMERIC NOT NULL DEFAULT 350,
    chambers TEXT[] DEFAULT ARRAY[]::TEXT[],
    wdra_reg_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.warehouse_receipts (
    id TEXT PRIMARY KEY,
    receipt_number TEXT UNIQUE NOT NULL,
    farmer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    farmer_name TEXT NOT NULL,
    warehouse_id TEXT REFERENCES public.warehouses(id) ON DELETE SET NULL,
    warehouse_name TEXT NOT NULL,
    chamber TEXT NOT NULL,
    commodity TEXT NOT NULL,
    variety TEXT,
    grade TEXT NOT NULL DEFAULT 'A',
    total_quantity NUMERIC NOT NULL CHECK (total_quantity > 0),
    available_quantity NUMERIC NOT NULL CHECK (available_quantity >= 0),
    locked_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (locked_quantity >= 0),
    unit TEXT NOT NULL DEFAULT 'kg',
    estimated_value NUMERIC NOT NULL DEFAULT 0,
    storage_fee_monthly NUMERIC NOT NULL DEFAULT 0,
    assayed_quality JSONB NOT NULL DEFAULT '{}'::jsonb,
    deposited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'stored' CHECK (status IN ('stored', 'partially_listed', 'listed', 'released')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 7. TRADE CREDIT & e-NWR PLEDGE FINANCING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.financing_requests (
    id TEXT PRIMARY KEY,
    request_number TEXT UNIQUE NOT NULL,
    applicant_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    applicant_name TEXT NOT NULL,
    applicant_role TEXT NOT NULL CHECK (applicant_role IN ('farmer', 'buyer')),
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number TEXT,
    receipt_id TEXT REFERENCES public.warehouse_receipts(id) ON DELETE SET NULL,
    receipt_number TEXT,
    commodity TEXT NOT NULL,
    variety TEXT,
    grade TEXT,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    transaction_value NUMERIC NOT NULL,
    requested_amount NUMERIC NOT NULL CHECK (requested_amount > 0),
    approved_amount NUMERIC CHECK (approved_amount >= 0),
    purpose TEXT NOT NULL,
    purpose_label TEXT NOT NULL,
    repayment_option TEXT NOT NULL,
    repayment_label TEXT NOT NULL,
    notes TEXT,
    review_notes TEXT,
    margin_paid BOOLEAN DEFAULT false,
    escrow_funded BOOLEAN DEFAULT false,
    payment_id TEXT,
    margin_paid_at TIMESTAMP WITH TIME ZONE,
    offered_amount NUMERIC,
    interest_rate NUMERIC DEFAULT 0.85,
    tenor_days NUMERIC DEFAULT 30,
    offer_notes TEXT,
    offered_at TIMESTAMP WITH TIME ZONE,
    borrower_accepted_at TIMESTAMP WITH TIME ZONE,
    financier_id TEXT,
    financier_name TEXT,
    financier_email TEXT,
    bank_utr TEXT,
    disbursed_at TIMESTAMP WITH TIME ZONE,
    repaid_at TIMESTAMP WITH TIME ZONE,
    repayment_method TEXT,
    repayment_transaction_id TEXT,
    repayment_amount NUMERIC,
    repayment_principal NUMERIC,
    repayment_interest NUMERIC,
    repayment_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured', 'repaid', 'settled', 'rejected', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure newly added columns exist for existing deployments
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS offered_amount NUMERIC;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0.85;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS tenor_days NUMERIC DEFAULT 30;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS offer_notes TEXT;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS offered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS borrower_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS financier_id TEXT;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS financier_name TEXT;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS financier_email TEXT;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS bank_utr TEXT;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS repaid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS repayment_method TEXT;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS repayment_transaction_id TEXT;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS repayment_amount NUMERIC;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS repayment_principal NUMERIC;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS repayment_interest NUMERIC;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS repayment_notes TEXT;
ALTER TABLE public.financing_requests DROP CONSTRAINT IF EXISTS financing_requests_status_check;
ALTER TABLE public.financing_requests ADD CONSTRAINT financing_requests_status_check 
  CHECK (status IN ('pending', 'under_review', 'offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured', 'repaid', 'settled', 'rejected', 'cancelled'));

-- Ensure fpo is permitted as an applicant_role
ALTER TABLE public.financing_requests DROP CONSTRAINT IF EXISTS financing_requests_applicant_role_check;
ALTER TABLE public.financing_requests ADD CONSTRAINT financing_requests_applicant_role_check 
  CHECK (applicant_role IN ('farmer', 'buyer', 'fpo'));

-- ============================================================================
-- 8. QUALITY INSPECTION & ASSAY REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inspections (
    id TEXT PRIMARY KEY,
    report_number TEXT UNIQUE NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    buyer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    buyer_name TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    commodity TEXT NOT NULL,
    crop_name TEXT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    verified_weight NUMERIC,
    ordered_grade TEXT DEFAULT 'A',
    grade TEXT,
    moisture NUMERIC,
    foreign_matter NUMERIC,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'assigned', 'passed', 'disputed', 'resolved')),
    order_amount NUMERIC NOT NULL DEFAULT 0,
    inspector_name TEXT,
    inspector_notes TEXT,
    inspection_fee NUMERIC DEFAULT 500,
    fee_status TEXT DEFAULT 'unpaid' CHECK (fee_status IN ('unpaid', 'paid', 'waived')),
    fee_paid_at TIMESTAMP WITH TIME ZONE,
    fee_payment_id TEXT,
    fee_payment_method TEXT,
    dispute_reason TEXT,
    arbitration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure newly added columns exist for existing deployments
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_verified_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_verification_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_call_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS inspection_fee NUMERIC DEFAULT 500;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS fee_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS fee_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS fee_payment_id TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS fee_payment_method TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS arbitration JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.warehouse_receipts ADD COLUMN IF NOT EXISTS last_rent_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.warehouse_receipts ADD COLUMN IF NOT EXISTS storage_fee_monthly NUMERIC DEFAULT 0;

-- ============================================================================
-- 9. PRIVACY CHAT MESSAGES & REAL-TIME THREADS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    thread_key TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    raw_text TEXT,
    text TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure is_read column exists for existing tables
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Enable Realtime publication for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Core admin check helper (must exist before RLS policies reference public.is_admin())
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
        (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com') OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );
END;
$$;

-- Restricted RLS policies for profiles & listings
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert/update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated USING (auth.uid()::text = id OR public.is_admin());
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid()::text = id AND COALESCE(LOWER(role), '') <> 'admin') OR public.is_admin());
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()::text = id OR public.is_admin()) WITH CHECK (auth.uid()::text = id OR public.is_admin());

DROP POLICY IF EXISTS "Allow public read listings" ON public.listings;
DROP POLICY IF EXISTS "Allow public insert/update listings" ON public.listings;
DROP POLICY IF EXISTS "listings_read_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_write_policy" ON public.listings;
CREATE POLICY "listings_read_policy" ON public.listings FOR SELECT USING (true);
CREATE POLICY "listings_write_policy" ON public.listings FOR ALL TO authenticated USING (auth.uid()::text = farmer_id OR public.is_admin()) WITH CHECK (auth.uid()::text = farmer_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow public read auctions" ON public.auctions;
DROP POLICY IF EXISTS "Allow public insert/update auctions" ON public.auctions;
DROP POLICY IF EXISTS "auctions_read_policy" ON public.auctions;
DROP POLICY IF EXISTS "auctions_write_policy" ON public.auctions;
CREATE POLICY "auctions_read_policy" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "auctions_write_policy" ON public.auctions FOR ALL TO authenticated USING (auth.uid()::text = farmer_id OR public.is_admin()) WITH CHECK (auth.uid()::text = farmer_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow public read auction_bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Allow public insert/update auction_bids" ON public.auction_bids;
DROP POLICY IF EXISTS "bids_read_policy" ON public.auction_bids;
DROP POLICY IF EXISTS "bids_insert_policy" ON public.auction_bids;
CREATE POLICY "bids_read_policy" ON public.auction_bids FOR SELECT USING (true);
CREATE POLICY "bids_insert_policy" ON public.auction_bids FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = bidder_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert/update orders" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
CREATE POLICY "orders_select_policy" ON public.orders FOR SELECT TO authenticated USING (auth.uid()::text = buyer_id OR auth.uid()::text = farmer_id OR public.is_admin());
CREATE POLICY "orders_insert_policy" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = buyer_id OR public.is_admin());
CREATE POLICY "orders_update_policy" ON public.orders FOR UPDATE TO authenticated USING (auth.uid()::text = buyer_id OR auth.uid()::text = farmer_id OR public.is_admin()) WITH CHECK (auth.uid()::text = buyer_id OR auth.uid()::text = farmer_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow public read deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Allow public insert/update deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_select_policy" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_insert_policy" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_update_policy" ON public.deliveries;
CREATE POLICY "deliveries_select_policy" ON public.deliveries FOR SELECT TO authenticated USING (auth.uid()::text = farmer_id OR auth.uid()::text = buyer_id OR auth.uid()::text = transporter_id OR status IN ('transport_requested', 'price_offered') OR public.is_admin());
CREATE POLICY "deliveries_insert_policy" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = buyer_id OR auth.uid()::text = farmer_id OR public.is_admin());
CREATE POLICY "deliveries_update_policy" ON public.deliveries FOR UPDATE TO authenticated USING (auth.uid()::text = farmer_id OR auth.uid()::text = buyer_id OR auth.uid()::text = transporter_id OR public.is_admin()) WITH CHECK (auth.uid()::text = farmer_id OR auth.uid()::text = buyer_id OR auth.uid()::text = transporter_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow public read warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Allow public insert/update warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_select_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_write_policy" ON public.warehouses;
CREATE POLICY "warehouses_select_policy" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "warehouses_write_policy" ON public.warehouses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow public read warehouse_receipts" ON public.warehouse_receipts;
DROP POLICY IF EXISTS "Allow public insert/update warehouse_receipts" ON public.warehouse_receipts;
DROP POLICY IF EXISTS "warehouse_receipts_select_policy" ON public.warehouse_receipts;
DROP POLICY IF EXISTS "warehouse_receipts_write_policy" ON public.warehouse_receipts;
CREATE POLICY "warehouse_receipts_select_policy" ON public.warehouse_receipts FOR SELECT TO authenticated USING (auth.uid()::text = farmer_id OR public.is_admin());
CREATE POLICY "warehouse_receipts_write_policy" ON public.warehouse_receipts FOR ALL TO authenticated USING (auth.uid()::text = farmer_id OR public.is_admin()) WITH CHECK (auth.uid()::text = farmer_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow public read financing_requests" ON public.financing_requests;
DROP POLICY IF EXISTS "Allow public insert/update financing_requests" ON public.financing_requests;
DROP POLICY IF EXISTS "financing_select_policy" ON public.financing_requests;
DROP POLICY IF EXISTS "financing_insert_policy" ON public.financing_requests;
DROP POLICY IF EXISTS "financing_update_policy" ON public.financing_requests;
CREATE POLICY "financing_select_policy" ON public.financing_requests FOR SELECT TO authenticated USING (auth.uid()::text = applicant_id OR auth.uid()::text = financier_id OR public.is_admin());
CREATE POLICY "financing_insert_policy" ON public.financing_requests FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = applicant_id OR public.is_admin());
CREATE POLICY "financing_update_policy" ON public.financing_requests FOR UPDATE TO authenticated USING (auth.uid()::text = applicant_id OR auth.uid()::text = financier_id OR public.is_admin()) WITH CHECK (auth.uid()::text = applicant_id OR auth.uid()::text = financier_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow public read inspections" ON public.inspections;
DROP POLICY IF EXISTS "Allow public insert/update inspections" ON public.inspections;
DROP POLICY IF EXISTS "inspections_select_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_write_policy" ON public.inspections;
CREATE POLICY "inspections_select_policy" ON public.inspections FOR SELECT TO authenticated USING (auth.uid()::text = buyer_id OR public.is_admin());
CREATE POLICY "inspections_write_policy" ON public.inspections FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = buyer_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow public read chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public insert/update chat_messages" ON public.chat_messages;

-- ============================================================================
-- 11. INITIAL SEED DATA (Ready for Immediate Testing)
-- ============================================================================

-- Insert Demo Profiles
INSERT INTO public.profiles (id, name, email, phone, role, company_name, state, district, kyc_status)
VALUES
    ('usr_farmer_01', 'Sakthi Vel', 'farmer@agrolnk.com', '+91 98765 43210', 'farmer', 'Vel Farm Produce', 'Tamil Nadu', 'Salem', 'verified'),
    ('usr_buyer_02', 'Ananya Agro Foods', 'buyer@agrolnk.com', '+91 98765 43211', 'buyer', 'Ananya Agro Foods Pvt Ltd', 'Tamil Nadu', 'Chennai', 'verified'),
    ('usr_financier_03', 'Kisan Capital Partners', 'financier@agrolnk.com', '+91 98765 43212', 'financier', 'Kisan Capital NBFC', 'Maharashtra', 'Mumbai', 'verified'),
    ('usr_transporter_04', 'Venkatesh Freight Logistics', 'transporter@agrolnk.com', '+91 98765 43213', 'transporter', 'Venkatesh Road Carriers', 'Tamil Nadu', 'Coimbatore', 'verified'),
    ('usr_warehouse_05', 'Salem Central Agri Vault', 'warehouse@agrolnk.com', '+91 98765 43214', 'warehouse', 'Salem Agri Warehousing Corp', 'Tamil Nadu', 'Salem', 'verified')
ON CONFLICT (id) DO NOTHING;

-- Insert Warehouses
INSERT INTO public.warehouses (id, name, operator_name, state, district, address, capacity_total, capacity_available, unit, is_cold_storage, temperature_range, storage_fee_per_mt_monthly, chambers, wdra_reg_no)
VALUES
    ('wh_salem_01', 'Salem Agri Cold Storage Hub', 'Salem Agri Warehousing Corp', 'Tamil Nadu', 'Salem', 'Plot 14, Agri Industrial Estate, Salem', 5000, 2100, 'MT', true, '2°C to 8°C', 450, ARRAY['Chamber B4 (Cold 4°C)', 'Chamber A1 (Dry)', 'Vault C2 (Controlled ATM)'], 'WDRA-TN-SLM-2024-889'),
    ('wh_dindigul_02', 'Dindigul Central Silo Complex', 'TN State Warehousing Corp', 'Tamil Nadu', 'Dindigul', 'Bypass Road, Dindigul', 10000, 6500, 'MT', false, 'Ambient Dry', 320, ARRAY['Silo A (Wheat/Grains)', 'Silo B (Pulses)', 'Silo C (Oilseeds)'], 'WDRA-TN-DND-2023-412'),
    ('wh_nashik_03', 'Nashik Agro Climate Storage', 'MahaAgri Logistics Ltd', 'Maharashtra', 'Nashik', 'Lasalgaon APMC Road, Nashik', 8000, 3200, 'MT', true, '0°C to 4°C', 480, ARRAY['Chamber Onion-1', 'Chamber Onion-2', 'Chamber Grape-Cold'], 'WDRA-MH-NSK-2024-102')
ON CONFLICT (id) DO NOTHING;

-- Insert Stored Warehouse Receipts (e-NWR)
INSERT INTO public.warehouse_receipts (id, receipt_number, farmer_id, farmer_name, warehouse_id, warehouse_name, chamber, commodity, variety, grade, total_quantity, available_quantity, locked_quantity, unit, estimated_value, storage_fee_monthly, assayed_quality, valid_until, status)
VALUES
    ('inv_demo_1024', '#eNWR-1024', 'usr_farmer_01', 'Sakthi Vel', 'wh_salem_01', 'Salem Agri Cold Storage Hub', 'Chamber B4 (Cold 4°C)', 'Tomato', 'Hybrid Shivam', 'A', 2000, 1500, 500, 'kg', 84000, 450, '{"moisture": "88.5%", "foreignMatter": "0.1%", "grade": "Grade A Certified", "shelfLife": "45 Days"}'::jsonb, timezone('utc'::text, now() + interval '60 days'), 'partially_listed'),
    ('inv_demo_1025', '#eNWR-1025', 'usr_farmer_01', 'Sakthi Vel', 'wh_salem_01', 'Salem Agri Cold Storage Hub', 'Chamber A1 (Dry)', 'Turmeric', 'Salem Finger', 'A', 1000, 1000, 0, 'kg', 140000, 320, '{"moisture": "9.2%", "curcumin": "4.8%", "foreignMatter": "0.05%", "grade": "Export Grade A"}'::jsonb, timezone('utc'::text, now() + interval '180 days'), 'stored'),
    ('inv_demo_1026', '#eNWR-1026', 'usr_farmer_01', 'Sakthi Vel', 'wh_dindigul_02', 'Dindigul Central Silo Complex', 'Silo A (Wheat/Grains)', 'Maize / Corn', 'Pioneer Yellow', 'A', 5000, 5000, 0, 'kg', 115000, 850, '{"moisture": "12.0%", "brokenGrains": "1.2%", "aflatoxin": "Nil", "grade": "Poultry Grade A"}'::jsonb, timezone('utc'::text, now() + interval '120 days'), 'stored')
ON CONFLICT (id) DO NOTHING;

-- Insert Direct Listings
INSERT INTO public.listings (id, farmer_id, farmer_name, commodity, variety, grade, quantity, unit, price, sale_type, state, district, harvest_date, images, status)
VALUES
    ('lot_demo_101', 'usr_farmer_01', 'Sakthi Vel', 'Tomato', 'Hybrid Shivam', 'A', 2500, 'kg', 42, 'direct', 'Tamil Nadu', 'Salem', '2026-08-25', ARRAY['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'], 'active'),
    ('lot_demo_102', 'usr_farmer_01', 'Sakthi Vel', 'Potato', 'Kufri Jyoti', 'A', 4000, 'kg', 35, 'direct', 'Tamil Nadu', 'Dindigul', '2026-08-24', ARRAY['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80'], 'active'),
    ('lot_demo_103', 'usr_farmer_01', 'Sakthi Vel', 'Onion', 'Nashik Red', 'A', 3000, 'kg', 28, 'direct', 'Maharashtra', 'Nashik', '2026-08-26', ARRAY['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=80'], 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert Live Auctions
INSERT INTO public.auctions (id, farmer_id, farmer_name, commodity, variety, grade, quantity, unit, base_price, reserve_price, current_bid, highest_bidder_id, highest_bidder_name, total_bids, start_time, end_time, status, state, district, images)
VALUES
    ('auc_demo_201', 'usr_farmer_01', 'Sakthi Vel', 'Turmeric', 'Salem Finger Export Grade', 'A', 1500, 'kg', 120, 145, 138, 'usr_buyer_02', 'Ananya Agro Foods', 8, timezone('utc'::text, now() - interval '1 hour'), timezone('utc'::text, now() + interval '3 hours'), 'live', 'Tamil Nadu', 'Salem', ARRAY['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop&q=80']),
    ('auc_demo_202', 'usr_farmer_01', 'Sakthi Vel', 'Sharbati Wheat', 'Sehore Premium', 'A', 5000, 'kg', 38, 44, 42, 'usr_buyer_02', 'Ananya Agro Foods', 5, timezone('utc'::text, now() - interval '30 minutes'), timezone('utc'::text, now() + interval '4 hours'), 'live', 'Madhya Pradesh', 'Sehore', ARRAY['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop&q=80'])
ON CONFLICT (id) DO NOTHING;

-- Insert Financing Requests
INSERT INTO public.financing_requests (id, request_number, applicant_id, applicant_name, applicant_role, order_number, receipt_number, commodity, quantity, unit, transaction_value, requested_amount, approved_amount, purpose, purpose_label, repayment_option, repayment_label, notes, status)
VALUES
    ('fin_demo_1024', '#FIN-1024', 'usr_farmer_01', 'Sakthi Vel', 'farmer', '#AGM-1024', '#eNWR-1024', 'Tomato', 500, 'kg', 21000, 15000, NULL, 'working_capital', 'Working Capital & Liquidity', 'auto_escrow_deduction', 'Auto-deduction on escrow release', 'Advance liquidity required for immediate transport packing and seed procurement for next cycle.', 'pending'),
    ('fin_demo_1025', '#FIN-1025', 'usr_buyer_02', 'Ananya Agro Foods', 'buyer', '#AGM-1025', NULL, 'Turmeric', 1500, 'kg', 207000, 150000, NULL, 'trade_credit', 'Auction / Purchase Trade Settlement Credit', '30_day_settlement', '30-day post-delivery settlement', 'Wholesale procurement working capital credit.', 'under_review')
ON CONFLICT (id) DO NOTHING;

-- Insert Inspections Seed
INSERT INTO public.inspections (id, report_number, order_id, order_number, buyer_id, buyer_name, seller_name, commodity, crop_name, quantity, verified_weight, ordered_grade, grade, moisture, foreign_matter, status, order_amount, inspector_name, inspector_notes)
VALUES
    ('insp_101', 'INSP-2026-8821', NULL, 'AGM-6801', 'usr_buyer_02', 'Ananya Agro Foods', 'veerappan (Salem Producer)', 'Onion', 'Nashik Red Onion', 50, 50.0, 'A', 'A', 11.2, 0.5, 'requested', 1000, NULL, NULL),
    ('insp_102', 'INSP-2026-4419', NULL, 'AGM-9266', 'usr_buyer_02', 'Ananya Agro Foods', 'veerappan (Salem Producer)', 'Tomato', 'Hybrid Shivam Tomato', 100, 98.5, 'A', 'A', 9.4, 0.2, 'passed', 3000, 'AgrowLink Certified Assayer (Govind)', 'Physical inspection & moisture meter testing completed at farmgate hub.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. COMMODITIES REGISTRY TABLE (Platform & Community-Added Crops)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.commodities (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'Agriculture',
    image_url TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read commodities" ON public.commodities;
DROP POLICY IF EXISTS "Allow public insert commodities" ON public.commodities;
DROP POLICY IF EXISTS "Allow public update commodities" ON public.commodities;
DROP POLICY IF EXISTS "commodities_select_all" ON public.commodities;
DROP POLICY IF EXISTS "commodities_insert_admin_only" ON public.commodities;
DROP POLICY IF EXISTS "commodities_update_admin_only" ON public.commodities;
DROP POLICY IF EXISTS "commodities_delete_admin_only" ON public.commodities;
CREATE POLICY "commodities_select_all" ON public.commodities FOR SELECT USING (true);
CREATE POLICY "commodities_insert_admin_only" ON public.commodities FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "commodities_update_admin_only" ON public.commodities FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "commodities_delete_admin_only" ON public.commodities FOR DELETE TO authenticated USING (public.is_admin());

-- Enable Supabase Realtime for commodities
ALTER PUBLICATION supabase_realtime ADD TABLE public.commodities;

-- Insert Standard Seed Commodities
INSERT INTO public.commodities (id, name, image_url)
VALUES
    ('cmd_tomato', 'Tomato', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'),
    ('cmd_onion', 'Onion', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop&q=80'),
    ('cmd_potato', 'Potato', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80'),
    ('cmd_red_chilli', 'Red Chilli', 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80'),
    ('cmd_mango', 'Mango', 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80'),
    ('cmd_turmeric', 'Turmeric', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80'),
    ('cmd_basmati_rice', 'Basmati Rice', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80'),
    ('cmd_wheat', 'Wheat', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80'),
    ('cmd_cotton', 'Cotton', 'https://images.unsplash.com/photo-1594897030560-ab279cf66def?w=800&auto=format&fit=crop&q=80'),
    ('cmd_cardamom', 'Cardamom', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80'),
    ('cmd_ginger', 'Ginger', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&auto=format&fit=crop&q=80'),
    ('cmd_apple', 'Apple', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&auto=format&fit=crop&q=80'),
    ('cmd_maize', 'Maize', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&auto=format&fit=crop&q=80'),
    ('cmd_soybean', 'Soybean', 'https://images.unsplash.com/photo-1599420186946-7b6fb4e53799?w=800&auto=format&fit=crop&q=80'),
    ('cmd_banana', 'Banana', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80')
ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url;

-- ============================================================================
-- 12. SUPABASE STORAGE BUCKET CONFIGURATION (proof)
-- Used for KYC identity documents, certificates, bills of lading, and e-NWRs
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('proof', 'proof', true, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to KYC proof documents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Read KYC Proofs'
    ) THEN
        CREATE POLICY "Public Read KYC Proofs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'proof');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public & Auth Upload KYC Proofs'
    ) THEN
        CREATE POLICY "Public & Auth Upload KYC Proofs" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'proof');
    END IF;
END $$;

-- ============================================================================
-- 13. SUPABASE REALTIME REPLICATION (Instant Updates Without Refresh)
-- Enables WebSocket CDC for live orders, deliveries, loans & listings
-- ============================================================================
DO $$
BEGIN
    -- Enable realtime publication for core platform tables if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deliveries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'financing_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.financing_requests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'listings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'warehouse_receipts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_receipts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- ============================================================================
-- 14. NOTIFICATIONS REGISTRY TABLE
-- Strict role and user-targeted notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT,
    recipient_role TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    link TEXT,
    action_payload JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid()::text OR (recipient_id IS NULL AND recipient_role = (SELECT role FROM public.profiles WHERE id = auth.uid()::text)) OR public.is_admin());
CREATE POLICY "notifications_insert_policy" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notifications_update_policy" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid()::text OR public.is_admin()) WITH CHECK (recipient_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "notifications_delete_policy" ON public.notifications FOR DELETE TO authenticated USING (recipient_id = auth.uid()::text OR public.is_admin());

-- ============================================================================
-- 15. CHAT MESSAGES REGISTRY TABLE
-- Real-time in-app negotiation and support messaging
-- ============================================================================
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public insert chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public update chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public delete chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_select_policy" ON public.chat_messages FOR SELECT TO authenticated USING (sender_id = auth.uid()::text OR thread_key LIKE '%' || auth.uid()::text || '%' OR public.is_admin());
CREATE POLICY "chat_messages_insert_policy" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid()::text OR public.is_admin());

-- ============================================================================
-- 16. DUPLICATE ORDER PREVENTION & DEDUPLICATION
-- ============================================================================
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

-- ============================================================================
-- 17. COMPOSITE PERFORMANCE INDEXES
-- ============================================================================
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

-- ============================================================================
-- 18. COMPREHENSIVE SUPABASE REALTIME PUBLICATION
-- ============================================================================
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
END $$;

-- ============================================================================
-- 19. ATOMIC STORED PROCEDURES & FINANCIAL ENGINES
-- ============================================================================

-- 1. ATOMIC AUCTION BID PLACEMENT
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
    SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    IF v_auction.status != 'live' THEN
        RAISE EXCEPTION 'This auction is no longer live (Status: %).', v_auction.status;
    END IF;

    IF v_now >= v_auction.end_time THEN
        UPDATE public.auctions SET status = 'completed', updated_at = v_now WHERE id = p_auction_id;
        RAISE EXCEPTION 'This auction has ended and is no longer accepting bids.';
    END IF;

    IF v_auction.farmer_id IS NOT NULL AND v_auction.farmer_id = p_bidder_id THEN
        RAISE EXCEPTION 'Producers are not permitted to bid on their own auctions.';
    END IF;

    IF p_bid_amount <= v_auction.current_bid THEN
        RAISE EXCEPTION 'Your bid of ₹% must be higher than the current leading bid of ₹%.', p_bid_amount, v_auction.current_bid;
    END IF;

    v_prev_bidder_id := v_auction.highest_bidder_id;
    v_new_bid_id := 'bid_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.auction_bids (id, auction_id, bidder_id, bidder_name, bid_amount, created_at)
    VALUES (v_new_bid_id, p_auction_id, p_bidder_id, COALESCE(p_bidder_name, 'Buyer Partner'), p_bid_amount, v_now);

    UPDATE public.auctions SET
        current_bid = p_bid_amount,
        highest_bidder_id = p_bidder_id,
        highest_bidder_name = COALESCE(p_bidder_name, 'Buyer Partner'),
        total_bids = COALESCE(v_auction.total_bids, 0) + 1,
        updated_at = v_now
    WHERE id = p_auction_id;

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

-- 2. ATOMIC ESCROW RELEASE
CREATE OR REPLACE FUNCTION public.release_escrow_atomic(
    p_order_id TEXT,
    p_admin_name TEXT DEFAULT 'AgrowLink Operations Ombudsman',
    p_admin_notes TEXT DEFAULT 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.',
    p_bank_name TEXT DEFAULT NULL,
    p_account_number TEXT DEFAULT NULL,
    p_ifsc TEXT DEFAULT NULL,
    p_utr TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_utr TEXT;
BEGIN
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    IF v_order.escrow_status = 'released' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Escrow was already released previously.',
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'bank_utr', v_order.bank_utr,
            'escrow_status', 'released'
        );
    END IF;

    IF v_order.escrow_status NOT IN ('funded', 'escrow_secured', 'held') THEN
        RAISE EXCEPTION 'Cannot release escrow in current state: %', v_order.escrow_status;
    END IF;

    v_utr := COALESCE(p_utr, v_order.bank_utr, 'CMSICICI' || to_char(v_now, 'YYYYMMDD') || floor(1000 + random() * 9000)::text);

    UPDATE public.orders SET
        status = 'completed',
        escrow_status = 'released',
        admin_verified_by = p_admin_name,
        admin_verification_status = 'approved',
        admin_call_notes = p_admin_notes,
        admin_verified_at = v_now,
        payout_bank_name = COALESCE(p_bank_name, v_order.payout_bank_name, 'Bank Account'),
        payout_account_number = COALESCE(p_account_number, v_order.payout_account_number, '—'),
        payout_ifsc = COALESCE(p_ifsc, v_order.payout_ifsc, '—'),
        bank_utr = v_utr,
        disbursed_at = v_now,
        updated_at = v_now
    WHERE id = v_order.id;

    UPDATE public.deliveries SET
        status = 'completed',
        updated_at = v_now
    WHERE order_id = v_order.id OR order_number = v_order.order_number;

    IF v_order.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_order.farmer_id,
            'farmer',
            'Payment Disbursed (UTR ' || v_utr || ')',
            'Escrow payout of ₹' || v_order.total_amount || ' for ' || v_order.commodity || ' (' || v_order.order_number || ') has been disbursed to your bank account.',
            'escrow',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'escrow_status', 'released',
        'status', 'completed',
        'bank_utr', v_utr,
        'total_amount', v_order.total_amount,
        'disbursed_at', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATOMIC AUCTION FINALIZATION
CREATE OR REPLACE FUNCTION public.finalize_auction_atomic(
    p_auction_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_auction RECORD;
    v_existing_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_order_id TEXT;
    v_order_num TEXT;
    v_total_amt NUMERIC;
    v_delivery_id TEXT;
    v_delivery_num TEXT;
    v_final_status TEXT;
BEGIN
    SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    IF v_auction.status IN ('completed', 'reserve_not_met', 'cancelled') THEN
        RETURN jsonb_build_object('success', true, 'status', v_auction.status, 'message', 'Auction already settled.');
    END IF;

    IF v_auction.highest_bidder_id IS NULL OR v_auction.current_bid < v_auction.reserve_price THEN
        v_final_status := 'reserve_not_met';
        UPDATE public.auctions SET status = v_final_status, updated_at = v_now WHERE id = p_auction_id;

        IF v_auction.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_auction.farmer_id, 'farmer',
                'Auction Ended (Reserve Not Met)',
                'The bidding for ' || v_auction.commodity || ' concluded below your reserve price of ₹' || v_auction.reserve_price || '. No order was generated.',
                'order', '/farmer-my-auctions', false, v_now
            );
        END IF;

        RETURN jsonb_build_object('success', true, 'status', v_final_status);
    END IF;

    v_final_status := 'completed';
    UPDATE public.auctions SET status = v_final_status, updated_at = v_now WHERE id = p_auction_id;

    SELECT * INTO v_existing_order FROM public.orders WHERE auction_id = p_auction_id LIMIT 1;

    IF v_existing_order.id IS NULL THEN
        v_order_id := 'ord_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
        v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
        v_total_amt := v_auction.quantity * v_auction.current_bid;

        INSERT INTO public.orders (
            id, order_number, auction_id, listing_id, buyer_id, buyer_name,
            farmer_id, farmer_name, commodity, variety, grade, quantity, unit,
            price_per_unit, total_amount, state, district, escrow_status, status,
            created_at, updated_at
        ) VALUES (
            v_order_id, v_order_num, v_auction.id, NULL, v_auction.highest_bidder_id, COALESCE(v_auction.highest_bidder_name, 'Buyer Partner'),
            v_auction.farmer_id, COALESCE(v_auction.farmer_name, 'Farmer Partner'), v_auction.commodity, v_auction.variety, v_auction.grade, v_auction.quantity, v_auction.unit,
            v_auction.current_bid, v_total_amt, v_auction.state, v_auction.district, 'funded', 'order_placed',
            v_now, v_now
        );

        v_delivery_id := 'del_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
        v_delivery_num := 'DEL-' || floor(1000 + random() * 9000)::text;

        INSERT INTO public.deliveries (
            id, delivery_number, order_id, order_number, farmer_id, farmer_name,
            buyer_id, buyer_name, commodity, grade, variety, quantity, unit,
            pickup_location, delivery_location, distance_km, fare_amount, status,
            tracking_steps, created_at, updated_at
        ) VALUES (
            v_delivery_id, v_delivery_num, v_order_id, v_order_num, v_auction.farmer_id, v_auction.farmer_name,
            v_auction.highest_bidder_id, v_auction.highest_bidder_name, v_auction.commodity, v_auction.grade, v_auction.variety, v_auction.quantity, v_auction.unit,
            jsonb_build_object('state', v_auction.state, 'district', v_auction.district, 'address', v_auction.district || ' Farmgate Aggregation Depot'),
            jsonb_build_object('state', 'Tamil Nadu', 'district', 'Chennai', 'address', 'Buyer Central Receiving Hub'),
            180, 4500, 'transport_requested',
            jsonb_build_array(
                jsonb_build_object('step', 'Order Confirmed', 'completed', true, 'timestamp', v_now),
                jsonb_build_object('step', 'Transporter Assigned', 'completed', false),
                jsonb_build_object('step', 'Pickup Completed', 'completed', false),
                jsonb_build_object('step', 'In Transit', 'completed', false),
                jsonb_build_object('step', 'Delivered', 'completed', false)
            ),
            v_now, v_now
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'status', 'completed', 'order_id', COALESCE(v_order_id, v_existing_order.id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- >>> END supabase_schema.sql <<<

-- >>> BEGIN supabase/add_fpo_role_migration.sql <<<
-- ============================================================================
-- AGROWLINK: ADD FPO (FARMER PRODUCER ORGANISATION) ROLE MIGRATION
-- Run this script in your Supabase SQL Editor to enable 'fpo' accounts.
-- ============================================================================

-- 1. Update the role CHECK constraint on public.profiles
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('farmer', 'buyer', 'transporter', 'warehouse', 'financier', 'admin', 'fpo'));

-- 2. Update applicant_role CHECK constraint on public.financing_requests (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financing_requests'
  ) THEN
    ALTER TABLE public.financing_requests DROP CONSTRAINT IF EXISTS financing_requests_applicant_role_check;
    ALTER TABLE public.financing_requests ADD CONSTRAINT financing_requests_applicant_role_check 
      CHECK (applicant_role IN ('farmer', 'buyer', 'fpo'));
  END IF;
END $$;
-- >>> END supabase/add_fpo_role_migration.sql <<<

-- >>> BEGIN supabase/add_food_processor_role_migration.sql <<<
-- ============================================================================
-- AGROWLINK: ADD FOOD PROCESSOR ROLE & PRODUCT TYPE CLASSIFICATION MIGRATION
-- Run this script in your Supabase SQL Editor to enable 'food_processor' accounts.
-- ============================================================================

-- 1. Update the role CHECK constraint on public.profiles to include 'food_processor'
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('farmer', 'buyer', 'transporter', 'warehouse', 'financier', 'admin', 'fpo', 'food_processor'));

-- 2. Update applicant_role CHECK constraint on public.financing_requests (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financing_requests'
  ) THEN
    ALTER TABLE public.financing_requests DROP CONSTRAINT IF EXISTS financing_requests_applicant_role_check;
    ALTER TABLE public.financing_requests ADD CONSTRAINT financing_requests_applicant_role_check 
      CHECK (applicant_role IN ('farmer', 'buyer', 'fpo', 'food_processor'));
  END IF;
END $$;

-- 3. Add product_type column to public.listings for raw vs processed classification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'raw' CHECK (product_type IN ('raw', 'processed'));
    CREATE INDEX IF NOT EXISTS idx_listings_product_type ON public.listings(product_type);
  END IF;
END $$;

-- 4. Enable RLS and verify policies for food_processor access
-- Food Processors can act as both buyer and seller:
-- listings: insert/update where farmer_id = auth.uid()
-- orders: insert/select where buyer_id = auth.uid() OR farmer_id = auth.uid()
-- >>> END supabase/add_food_processor_role_migration.sql <<<

-- >>> BEGIN supabase/commodities_rls_and_columns.sql <<<
-- ============================================================================
-- AGROWLINK COMMODITY CATALOG & VARIETIES DATABASE SCHEMA & RLS
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
-- >>> END supabase/commodities_rls_and_columns.sql <<<

-- >>> BEGIN supabase/run_today_all_migrations.sql <<<
-- ==============================================================================
-- AGROWLINK CONSOLIDATED SCHEMA MIGRATION (TODAY'S ESCROW & REVENUE EXPANSIONS)
-- Run this single script in your Supabase Dashboard -> SQL Editor -> Run
-- Safe and Idempotent (uses IF NOT EXISTS, TEXT for profile IDs to match schema)
-- ==============================================================================

-- ==============================================================================
-- PART 1: VIRTUAL ACCOUNT NUMBER (VAN) BANKING PROVISION (public.profiles)
-- Adds ICICI/HDFC Virtual Account fields for high-value buyer deposits (≥ ₹50,000)
-- ==============================================================================
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS van_status TEXT DEFAULT 'pending_bank_approval',
  ADD COLUMN IF NOT EXISTS virtual_account_number TEXT,
  ADD COLUMN IF NOT EXISTS virtual_account_ifsc TEXT DEFAULT 'ICIC0000104',
  ADD COLUMN IF NOT EXISTS van_bank_name TEXT DEFAULT 'ICICI Bank Ltd.',
  ADD COLUMN IF NOT EXISTS van_notes TEXT,
  ADD COLUMN IF NOT EXISTS van_assigned_at TIMESTAMPTZ;

-- Performance indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_virtual_account_number 
  ON public.profiles(virtual_account_number) 
  WHERE virtual_account_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_van_status 
  ON public.profiles(van_status);

-- Safe check constraint on profiles van_status
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_van_status_check;
ALTER TABLE IF EXISTS public.profiles ADD CONSTRAINT profiles_van_status_check 
  CHECK (van_status IN ('pending_bank_approval', 'active', 'rejected', 'suspended'));


-- ==============================================================================
-- PART 2: TRANSPORT & LOGISTICS ESCROW ENGINE (public.deliveries)
-- Supports Freight Escrow, Dual-Tier Payer Deposit, and Admin Logistics Vault
-- NOTE: freight_payer_id uses TEXT to harmonize with profiles.id type
-- ==============================================================================
-- Drop any legacy foreign key constraint if it previously failed or partially bound
ALTER TABLE IF EXISTS public.deliveries DROP CONSTRAINT IF EXISTS deliveries_freight_payer_id_fkey;

ALTER TABLE IF EXISTS public.deliveries
  ADD COLUMN IF NOT EXISTS freight_escrow_status TEXT DEFAULT 'unfunded',
  ADD COLUMN IF NOT EXISTS freight_payer_id TEXT,
  ADD COLUMN IF NOT EXISTS freight_payer_role TEXT DEFAULT 'farmer',
  ADD COLUMN IF NOT EXISTS freight_base_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignor_freight_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_freight_payable NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transporter_commission_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transporter_net_payout NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_payment_mode TEXT DEFAULT 'direct_razorpay',
  ADD COLUMN IF NOT EXISTS freight_bank_utr TEXT,
  ADD COLUMN IF NOT EXISTS freight_deposited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_admin_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS freight_admin_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_disbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_disbursal_utr TEXT;

-- Safe check constraint on deliveries freight_escrow_status
ALTER TABLE IF EXISTS public.deliveries DROP CONSTRAINT IF EXISTS deliveries_freight_escrow_status_check;
ALTER TABLE IF EXISTS public.deliveries ADD CONSTRAINT deliveries_freight_escrow_status_check
  CHECK (freight_escrow_status IN ('unfunded', 'pending_bank_check', 'escrow_locked', 'released', 'disputed'));

-- Performance indexes for deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_freight_escrow_status 
  ON public.deliveries(freight_escrow_status);

CREATE INDEX IF NOT EXISTS idx_deliveries_freight_bank_utr 
  ON public.deliveries(freight_bank_utr);


-- ==============================================================================
-- PART 3: WAREHOUSE DIRECT COMMISSION & ACCUMULATION (public.warehouse_receipts)
-- Tracks 0.25% platform booking fee accumulation and net warehouse operator settlements
-- ==============================================================================
ALTER TABLE IF EXISTS public.warehouse_receipts
  ADD COLUMN IF NOT EXISTS total_commission_earned NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_settled_to_warehouse NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_rent_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rent_payment_history JSONB DEFAULT '[]'::jsonb;

-- Performance index for warehouse audit
CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_last_rent_paid_at 
  ON public.warehouse_receipts(last_rent_paid_at);

-- ==============================================================================
-- VERIFICATION CONFIRMATION
-- ==============================================================================
SELECT 'AgrowLink consolidated escrow & revenue schema migration completed successfully!' AS status;
-- >>> END supabase/run_today_all_migrations.sql <<<

-- >>> BEGIN supabase/add_orders_van_and_webhook_utr.sql <<<
-- ==============================================================================
-- AgrowLink: Smart Collect Virtual Account (VAN) & Webhook UTR Orders Schema
-- Run this safe script in Supabase SQL Editor
-- ==============================================================================

-- 1. Ensure public.orders has dedicated automated VAN & UTR columns
ALTER TABLE IF EXISTS public.orders 
  ADD COLUMN IF NOT EXISTS bank_utr TEXT,
  ADD COLUMN IF NOT EXISTS virtual_account_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'direct_razorpay',
  ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending_deposit',
  ADD COLUMN IF NOT EXISTS escrow_deposited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- 2. Performance indexes for instant bank webhook matching & polling
CREATE INDEX IF NOT EXISTS idx_orders_bank_utr 
  ON public.orders(bank_utr) 
  WHERE bank_utr IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_virtual_account_number 
  ON public.orders(virtual_account_number) 
  WHERE virtual_account_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_escrow_status 
  ON public.orders(escrow_status);

-- 3. Confirm installation
SELECT 'AgrowLink automated VAN & Webhook UTR schema applied successfully!' AS status;
-- >>> END supabase/add_orders_van_and_webhook_utr.sql <<<

-- >>> BEGIN supabase/update_financing_schema.sql <<<
-- ============================================================================
-- AGROWLINK TRADE FINANCING & INSTITUTIONAL QUOTATION SCHEMA UPDATE
-- Run this in your Supabase Project -> SQL Editor to enable term-sheet
-- quotations, lender lock, and multi-status escrow disbursement tracking.
-- ============================================================================

-- 1. Relax and widen status check constraint on financing_requests
ALTER TABLE IF EXISTS public.financing_requests DROP CONSTRAINT IF EXISTS financing_requests_status_check;

ALTER TABLE IF EXISTS public.financing_requests ADD CONSTRAINT financing_requests_status_check 
  CHECK (status IN (
    'pending',
    'under_review',
    'offer_received',
    'borrower_accepted',
    'approved',
    'disbursed',
    'escrow_secured',
    'repaid',
    'settled',
    'rejected',
    'cancelled'
  ));

-- 2. Add all missing Institutional Underwriting & Term-Sheet columns
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

-- 3. Ensure Row Level Security (RLS) policies permit public read and write
ALTER TABLE IF EXISTS public.financing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read financing_requests" ON public.financing_requests;
DROP POLICY IF EXISTS "Allow public insert/update financing_requests" ON public.financing_requests;
DROP POLICY IF EXISTS "Allow public read financing" ON public.financing_requests;
DROP POLICY IF EXISTS "Allow public write financing" ON public.financing_requests;

-- 4. Enable Supabase Realtime broadcast for financing_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'financing_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.financing_requests;
  END IF;
END $$;
-- >>> END supabase/update_financing_schema.sql <<<

-- >>> BEGIN supabase/step1_moq_and_competitive_freight_rfq.sql <<<
-- ============================================================================
-- AGROWLINK STEP 1 MIGRATION: MOQ & BUYER-PAID COMPETITIVE TRANSPORTER RFQ ENGINE
-- File: supabase/step1_moq_and_competitive_freight_rfq.sql
-- Description:
--   1. Adds min_order_quantity (MOQ) to public.listings
--   2. Adds freight_amount, freight_fee_amount, grand_total_amount, rfq_expires_at to public.orders
--   3. Adds rfq_expires_at, freight_quotes (JSONB multi-bid array), admin_escalated,
--      and admin_assigned_quote to public.deliveries
--   4. Updates RLS policies on public.deliveries so multiple verified transporters
--      can view and competitively quote on open RFQ loads during the 30-min window
--   5. Updates protect_order_financial_fields() trigger to permit trusted RPCs
--      and buyer freight-quote locking
--   6. Creates/Updates atomic RPC functions:
--      - create_direct_order_atomic (with MOQ validation & 30-min Freight RFQ creation)
--      - submit_transporter_quote_atomic (multi-transporter bidding, auto-selects lowest quote)
--      - lock_buyer_order_and_freight_escrow_atomic (combined Crop + Freight escrow lock)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD MINIMUM ORDER QUANTITY (MOQ) TO LISTINGS
-- ----------------------------------------------------------------------------
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS min_order_quantity NUMERIC DEFAULT 1 CHECK (min_order_quantity >= 0);

-- ----------------------------------------------------------------------------
-- 2. EXTEND ORDERS TABLE FOR COMBINED CROP + FREIGHT ESCROW
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS freight_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_fee_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rfq_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_utr TEXT;

-- Relax status & escrow_status check constraints on public.orders to allow RFQ states
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'awaiting_freight_quote',
    'freight_quoted',
    'pending',
    'payment_verification_pending',
    'order_placed',
    'confirmed',
    'ready_for_delivery',
    'transport_assigned',
    'dispatched',
    'in_transit',
    'delivered',
    'completed',
    'disputed',
    'cancelled'
  ));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_escrow_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_escrow_status_check
  CHECK (escrow_status IN (
    'awaiting_freight_quote',
    'freight_quoted',
    'pending',
    'pending_verification',
    'financing_pending',
    'funded',
    'escrow_secured',
    'held',
    'released',
    'refunded'
  ));

-- ----------------------------------------------------------------------------
-- 3. EXTEND DELIVERIES TABLE FOR MULTI-TRANSPORTER COMPETITIVE BIDDING (30-MIN RFQ)
-- ----------------------------------------------------------------------------
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS rfq_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_quotes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_escalated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_assigned_quote BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS freight_escrow_status TEXT DEFAULT 'unfunded',
  ADD COLUMN IF NOT EXISTS freight_payer_id TEXT,
  ADD COLUMN IF NOT EXISTS freight_payer_role TEXT DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS freight_base_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignor_freight_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_freight_payable NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transporter_commission_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transporter_net_payout NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_payment_mode TEXT DEFAULT 'direct_razorpay',
  ADD COLUMN IF NOT EXISTS freight_bank_utr TEXT,
  ADD COLUMN IF NOT EXISTS freight_deposited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_admin_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS freight_admin_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_disbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_disbursal_utr TEXT;

-- If freight_payer_id was previously created as UUID, convert it safely to TEXT to match profiles.id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deliveries'
      AND column_name = 'freight_payer_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_freight_payer_id_fkey;
    ALTER TABLE public.deliveries ALTER COLUMN freight_payer_id TYPE TEXT USING freight_payer_id::text;
  END IF;
END $$;

ALTER TABLE public.deliveries ALTER COLUMN freight_payer_role SET DEFAULT 'buyer';

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check
  CHECK (status IN (
    'transport_requested',
    'price_offered',
    'assigned',
    'picked_up',
    'dispatched',
    'in_transit',
    'delivered',
    'completed',
    'cancelled'
  ));

-- ----------------------------------------------------------------------------
-- 4. UPDATE DELIVERIES RLS POLICIES FOR MULTI-TRANSPORTER COMPETITIVE BIDDING
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "deliveries_select_policy" ON public.deliveries;
CREATE POLICY "deliveries_select_policy" ON public.deliveries
    FOR SELECT USING (
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = transporter_id OR
        (status IN ('transport_requested', 'price_offered') AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'transporter' OR
            public.is_admin()
        )) OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "deliveries_insert_policy" ON public.deliveries;
CREATE POLICY "deliveries_insert_policy" ON public.deliveries
    FOR INSERT WITH CHECK (
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "deliveries_update_policy" ON public.deliveries;
CREATE POLICY "deliveries_update_policy" ON public.deliveries
    FOR UPDATE USING (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        (status IN ('transport_requested', 'price_offered') AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'transporter' OR
            public.is_admin()
        )) OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        (status IN ('transport_requested', 'price_offered', 'assigned') AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'transporter' OR
            public.is_admin()
        )) OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 5. UPDATE ORDER FINANCIAL TRIGGER TO ALLOW TRUSTED RPC & BUYER ESCROW LOCK
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_order_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Permit all modifications by Admin, Supabase Service Role, or trusted internal RPCs
    IF public.is_admin()
       OR (auth.jwt() ->> 'role') = 'service_role'
       OR auth.role() = 'service_role'
       OR current_setting('agrolnk.trusted_rpc', true) = 'true'
       OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Block any non-admin from altering unit price or base commodity total
    IF (NEW.total_amount IS DISTINCT FROM OLD.total_amount) OR
       (NEW.price_per_unit IS DISTINCT FROM OLD.price_per_unit) THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct modification of commodity unit price or base order total is forbidden.';
    END IF;

    -- Block any non-admin from self-releasing or refunding escrow to bank accounts
    IF (NEW.escrow_status IS DISTINCT FROM OLD.escrow_status)
       AND NEW.escrow_status IN ('released', 'refunded') THEN
        RAISE EXCEPTION 'Security Policy Violation: Only AgrowLink Admin can release or refund escrow funds.';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. ATOMIC RPC 1: CREATE DIRECT ORDER & OPTIONAL 30-MIN FREIGHT RFQ
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_direct_order_atomic(
    p_listing_id TEXT,
    p_buyer_id TEXT,
    p_buyer_name TEXT,
    p_quantity NUMERIC,
    p_delivery_location JSONB DEFAULT '{}'::jsonb,
    p_is_trade_credit BOOLEAN DEFAULT false,
    p_buyer_unit TEXT DEFAULT NULL,
    p_awaiting_freight_quote BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_listing RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_rfq_expiry TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '30 minutes';
    v_deduct_qty NUMERIC;
    v_effective_moq NUMERIC;
    v_order_id TEXT;
    v_order_num TEXT;
    v_delivery_id TEXT;
    v_delivery_num TEXT;
    v_unit_price NUMERIC;
    v_total_amt NUMERIC;
    v_buyer_fee NUMERIC;
    v_seller_fee NUMERIC;
    v_platform_fee NUMERIC;
    v_net_seller NUMERIC;
    v_new_qty NUMERIC;
    v_escrow_status TEXT;
    v_status TEXT;
BEGIN
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    -- 1. Lock the listing row
    SELECT * INTO v_listing
    FROM public.listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing % not found.', p_listing_id;
    END IF;

    -- 2. Validate listing status
    IF v_listing.status = 'sold' OR v_listing.quantity <= 0 THEN
        RAISE EXCEPTION 'This lot is already sold out.';
    END IF;

    -- 2b. Prevent Self-Trading
    IF v_listing.farmer_id IS NOT NULL AND (
        v_listing.farmer_id = p_buyer_id OR
        (auth.uid() IS NOT NULL AND v_listing.farmer_id = auth.uid()::text)
    ) THEN
        RAISE EXCEPTION 'You cannot buy your own produce. Self-trading is not permitted on AgrowLink.';
    END IF;

    -- 2c. Convert requested volume into the listing's native unit
    IF p_buyer_unit IS NOT NULL AND TRIM(p_buyer_unit) <> '' AND LOWER(TRIM(p_buyer_unit)) <> LOWER(TRIM(COALESCE(v_listing.unit, 'kg'))) THEN
        v_deduct_qty := public.convert_agri_volume(p_quantity, p_buyer_unit, v_listing.unit);
    ELSE
        v_deduct_qty := p_quantity;
    END IF;

    -- 2d. Enforce Minimum Order Quantity (MOQ) with Smart Remainder Protection
    v_effective_moq := LEAST(COALESCE(NULLIF(v_listing.min_order_quantity, 0), 0), v_listing.quantity);
    IF v_effective_moq > 0 AND v_deduct_qty < v_effective_moq THEN
        RAISE EXCEPTION 'Minimum order quantity for this lot is % % (Requested: % %).',
            v_effective_moq, COALESCE(v_listing.unit, 'kg'), v_deduct_qty, COALESCE(v_listing.unit, 'kg');
    END IF;

    -- 3. Check inventory availability
    IF v_deduct_qty > v_listing.quantity THEN
        RAISE EXCEPTION 'Requested quantity (% %) exceeds available inventory (% %).',
            p_quantity, COALESCE(p_buyer_unit, v_listing.unit, 'kg'), v_listing.quantity, COALESCE(v_listing.unit, 'kg');
    END IF;

    -- 4. Compute financial breakdown using authoritative listing price
    v_unit_price := v_listing.price;
    v_total_amt := ROUND(v_deduct_qty * v_unit_price, 2);
    v_buyer_fee := ROUND(v_total_amt * 0.0025, 2);
    v_seller_fee := ROUND(v_total_amt * 0.0025, 2);
    v_platform_fee := v_buyer_fee + v_seller_fee;
    v_net_seller := v_total_amt - v_seller_fee;

    -- 5. Deduct inventory and update listing status
    v_new_qty := ROUND(v_listing.quantity - v_deduct_qty, 4);
    UPDATE public.listings SET
        quantity = v_new_qty,
        status = CASE WHEN v_new_qty <= 0 THEN 'sold' ELSE 'active' END,
        updated_at = v_now
    WHERE id = p_listing_id;

    -- 6. Create Order atomically
    v_order_id := 'ord_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;

    IF p_awaiting_freight_quote THEN
        v_escrow_status := 'awaiting_freight_quote';
        v_status := 'awaiting_freight_quote';
    ELSIF p_is_trade_credit THEN
        v_escrow_status := 'pending';
        v_status := 'order_placed';
    ELSE
        v_escrow_status := 'funded';
        v_status := 'order_placed';
    END IF;

    INSERT INTO public.orders (
        id, order_number, listing_id, auction_id, buyer_id, buyer_name,
        farmer_id, farmer_name, commodity, variety, grade, quantity, unit,
        price_per_unit, total_amount, buyer_fee_amount, seller_fee_amount,
        platform_commission_amount, net_seller_amount,
        freight_amount, freight_fee_amount, grand_total_amount, rfq_expires_at,
        delivery_location, state, district, escrow_status, status, created_at, updated_at
    ) VALUES (
        v_order_id, v_order_num, v_listing.id, NULL, p_buyer_id, COALESCE(p_buyer_name, 'Wholesale Buyer'),
        v_listing.farmer_id, COALESCE(v_listing.farmer_name, 'Verified Producer'), v_listing.commodity,
        v_listing.variety, v_listing.grade, p_quantity, COALESCE(p_buyer_unit, v_listing.unit),
        v_unit_price, v_total_amt, v_buyer_fee, v_seller_fee,
        v_platform_fee, v_net_seller,
        0, 0, (v_total_amt + v_buyer_fee), v_rfq_expiry,
        p_delivery_location,
        COALESCE(p_delivery_location->>'state', v_listing.state, ''),
        COALESCE(p_delivery_location->>'district', v_listing.district, ''),
        v_escrow_status, v_status, v_now, v_now
    );

    -- 7. Create linked Delivery RFQ record
    v_delivery_id := 'del_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_delivery_num := 'DEL-' || floor(1000 + random() * 9000)::text;

    INSERT INTO public.deliveries (
        id, delivery_number, order_id, order_number, farmer_id, farmer_name,
        buyer_id, buyer_name, commodity, grade, variety, quantity, unit,
        pickup_location, delivery_location, estimated_distance_km, freight_amount,
        status, rfq_expires_at, freight_quotes, freight_payer_id, freight_payer_role,
        pickup_otp, delivery_otp, created_at, updated_at
    ) VALUES (
        v_delivery_id, v_delivery_num, v_order_id, v_order_num, v_listing.farmer_id, v_listing.farmer_name,
        p_buyer_id, p_buyer_name, v_listing.commodity, v_listing.grade, v_listing.variety, p_quantity, COALESCE(p_buyer_unit, v_listing.unit),
        jsonb_build_object(
            'state', v_listing.state,
            'district', v_listing.district,
            'address', COALESCE(v_listing.village, v_listing.district) || ' Farmgate Aggregation Hub'
        ),
        p_delivery_location, NULL, NULL,
        'transport_requested', v_rfq_expiry, '[]'::jsonb, p_buyer_id, 'buyer',
        floor(1000 + random() * 9000)::text,
        floor(1000 + random() * 9000)::text,
        v_now, v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_num,
        'delivery_id', v_delivery_id,
        'delivery_number', v_delivery_num,
        'listing_id', v_listing.id,
        'quantity', p_quantity,
        'remaining_stock', v_new_qty,
        'total_amount', v_total_amt,
        'rfq_expires_at', v_rfq_expiry,
        'escrow_status', v_escrow_status,
        'status', v_status
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. ATOMIC RPC 2: SUBMIT TRANSPORTER QUOTE (MULTI-BIDDING + AUTO-LOWEST SELECTION)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_transporter_quote_atomic(
    p_delivery_id TEXT,
    p_transporter_id TEXT,
    p_transporter_name TEXT,
    p_vehicle_type TEXT,
    p_vehicle_number TEXT,
    p_driver_name TEXT,
    p_driver_phone TEXT,
    p_freight_amount NUMERIC,
    p_is_admin_assigned BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_delivery RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_existing_quotes JSONB;
    v_filtered_quotes JSONB := '[]'::jsonb;
    v_new_quote JSONB;
    v_elem JSONB;
    v_lowest_quote JSONB := NULL;
    v_lowest_amt NUMERIC := NULL;
    v_q_amt NUMERIC;
BEGIN
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    IF p_freight_amount IS NULL OR p_freight_amount <= 0 THEN
        RAISE EXCEPTION 'Freight quote amount must be greater than zero.';
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery job % not found.', p_delivery_id;
    END IF;

    IF v_delivery.status NOT IN ('transport_requested', 'price_offered') AND NOT p_is_admin_assigned THEN
        RAISE EXCEPTION 'This freight job is already assigned and no longer accepting quotes.';
    END IF;

    v_existing_quotes := COALESCE(v_delivery.freight_quotes, '[]'::jsonb);

    -- Remove previous quote from the same transporter (if updating their bid)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_existing_quotes)
    LOOP
        IF COALESCE(v_elem->>'transporterId', '') <> COALESCE(p_transporter_id, '') THEN
            v_filtered_quotes := v_filtered_quotes || jsonb_build_array(v_elem);
        END IF;
    END LOOP;

    v_new_quote := jsonb_build_object(
        'transporterId', COALESCE(p_transporter_id, 'transporter'),
        'transporterName', COALESCE(p_transporter_name, 'Verified Transporter'),
        'vehicleType', COALESCE(p_vehicle_type, 'Commercial Freight Carrier'),
        'vehicleNumber', UPPER(TRIM(COALESCE(p_vehicle_number, ''))),
        'driverName', COALESCE(p_driver_name, 'Assigned Driver'),
        'driverPhone', COALESCE(p_driver_phone, ''),
        'freightAmount', ROUND(p_freight_amount, 2),
        'isAdminAssigned', COALESCE(p_is_admin_assigned, false),
        'quotedAt', v_now
    );

    v_filtered_quotes := v_filtered_quotes || jsonb_build_array(v_new_quote);

    -- Determine the lowest quote across all submitted bids (if Admin assigned, Admin quote takes precedence)
    IF p_is_admin_assigned THEN
        v_lowest_quote := v_new_quote;
        v_lowest_amt := ROUND(p_freight_amount, 2);
    ELSE
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_filtered_quotes)
        LOOP
            v_q_amt := (v_elem->>'freightAmount')::numeric;
            IF v_lowest_amt IS NULL OR v_q_amt < v_lowest_amt THEN
                v_lowest_amt := v_q_amt;
                v_lowest_quote := v_elem;
            END IF;
        END LOOP;
    END IF;

    -- Update delivery with full quote history and current winning (lowest) quote
    UPDATE public.deliveries SET
        freight_quotes = v_filtered_quotes,
        transporter_id = v_lowest_quote->>'transporterId',
        transporter_name = v_lowest_quote->>'transporterName',
        vehicle_type = v_lowest_quote->>'vehicleType',
        vehicle_number = v_lowest_quote->>'vehicleNumber',
        driver_name = v_lowest_quote->>'driverName',
        driver_phone = v_lowest_quote->>'driverPhone',
        freight_amount = v_lowest_amt,
        freight_base_amount = v_lowest_amt,
        admin_assigned_quote = COALESCE(p_is_admin_assigned, v_delivery.admin_assigned_quote, false),
        status = 'price_offered',
        updated_at = v_now
    WHERE id = v_delivery.id;

    -- Sync lowest freight quote to linked order so Buyer immediately sees it at checkout
    UPDATE public.orders SET
        freight_amount = v_lowest_amt,
        freight_fee_amount = ROUND(v_lowest_amt * 0.0025, 2),
        grand_total_amount = ROUND(total_amount + COALESCE(buyer_fee_amount, ROUND(total_amount * 0.0025, 2)) + v_lowest_amt + ROUND(v_lowest_amt * 0.0025, 2), 2),
        status = CASE WHEN status = 'awaiting_freight_quote' THEN 'freight_quoted' ELSE status END,
        escrow_status = CASE WHEN escrow_status = 'awaiting_freight_quote' THEN 'freight_quoted' ELSE escrow_status END,
        updated_at = v_now
    WHERE id = v_delivery.order_id OR order_number = v_delivery.order_number;

    -- Notify Buyer that a competitive freight quote is ready
    IF v_delivery.buyer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_delivery.buyer_id,
            'buyer',
            'Lowest Freight Quote Ready: ₹' || v_lowest_amt || ' (' || v_delivery.order_number || ')',
            'Verified carrier (' || (v_lowest_quote->>'transporterName') || ') quoted ₹' || v_lowest_amt || ' for ' || v_delivery.commodity || '. Complete combined escrow payment to confirm order and dispatch.',
            'delivery',
            '/buyer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', v_delivery.id,
        'lowest_freight_amount', v_lowest_amt,
        'lowest_quote', v_lowest_quote,
        'total_quotes_count', jsonb_array_length(v_filtered_quotes)
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. ATOMIC RPC 3: BUYER LOCKS COMBINED ESCROW (CROP + AGREED FREIGHT)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(
    p_order_id TEXT,
    p_payment_mode TEXT DEFAULT 'direct_razorpay',
    p_payment_id TEXT DEFAULT NULL,
    p_bank_utr TEXT DEFAULT NULL,
    p_auto_verified BOOLEAN DEFAULT true
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_delivery RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_freight_amt NUMERIC;
    v_freight_fee NUMERIC;
    v_transporter_fee NUMERIC;
    v_transporter_net NUMERIC;
    v_buyer_fee NUMERIC;
    v_grand_total NUMERIC;
    v_is_bank_pending BOOLEAN;
    v_order_escrow_status TEXT;
    v_order_status TEXT;
    v_del_status TEXT;
    v_del_escrow_status TEXT;
BEGIN
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE order_id = v_order.id OR order_number = v_order.order_number
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_freight_amt := COALESCE(v_delivery.freight_amount, v_order.freight_amount, 0);
    v_freight_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_net := ROUND(v_freight_amt - v_transporter_fee, 2);
    v_buyer_fee := COALESCE(NULLIF(v_order.buyer_fee_amount, 0), ROUND(v_order.total_amount * 0.0025, 2));
    v_grand_total := ROUND(v_order.total_amount + v_buyer_fee + v_freight_amt + v_freight_fee, 2);

    v_is_bank_pending := (p_payment_mode = 'escrow_van' AND NOT COALESCE(p_auto_verified, false));

    IF p_payment_mode = 'trade_credit' THEN
        v_order_escrow_status := 'financing_pending';
        v_order_status := 'order_placed';
        v_del_status := 'assigned';
        v_del_escrow_status := 'escrow_locked';
    ELSIF v_is_bank_pending THEN
        v_order_escrow_status := 'pending';
        v_order_status := 'pending';
        v_del_status := 'price_offered';
        v_del_escrow_status := 'pending_bank_check';
    ELSE
        v_order_escrow_status := 'funded';
        v_order_status := 'order_placed';
        v_del_status := 'assigned';
        v_del_escrow_status := 'escrow_locked';
    END IF;

    UPDATE public.orders SET
        freight_amount = v_freight_amt,
        freight_fee_amount = v_freight_fee,
        grand_total_amount = v_grand_total,
        payment_mode = p_payment_mode,
        payment_id = COALESCE(p_payment_id, payment_id),
        bank_utr = COALESCE(p_bank_utr, bank_utr),
        escrow_status = v_order_escrow_status,
        status = v_order_status,
        updated_at = v_now
    WHERE id = v_order.id;

    IF v_delivery.id IS NOT NULL THEN
        UPDATE public.deliveries SET
            status = v_del_status,
            freight_escrow_status = v_del_escrow_status,
            freight_payer_id = v_order.buyer_id,
            freight_payer_role = 'buyer',
            freight_base_amount = v_freight_amt,
            consignor_freight_fee = v_freight_fee,
            total_freight_payable = ROUND(v_freight_amt + v_freight_fee, 2),
            transporter_commission_fee = v_transporter_fee,
            transporter_net_payout = v_transporter_net,
            freight_payment_mode = p_payment_mode,
            freight_bank_utr = COALESCE(p_bank_utr, p_payment_id),
            freight_deposited_at = v_now,
            updated_at = v_now
        WHERE id = v_delivery.id;
    END IF;

    -- Notify Farmer that Order & Freight Escrow are Confirmed
    IF v_order.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_order.farmer_id,
            'farmer',
            'Order & Freight Confirmed (' || v_order.order_number || ')',
            'Buyer locked ₹' || v_order.total_amount || ' produce payment + ₹' || v_freight_amt || ' freight in AgrowLink Escrow. Assigned vehicle (' || COALESCE(v_delivery.vehicle_number, 'Carrier') || ') will arrive for pickup.',
            'order',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    -- Notify Winning Transporter to Dispatch Truck
    IF v_delivery.transporter_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || (extract(epoch from v_now)::bigint + 1) || '_' || substr(md5(random()::text), 1, 6),
            v_delivery.transporter_id,
            'transporter',
            'Freight Quote Won & Escrow Locked! (' || v_delivery.delivery_number || ')',
            'Your quote of ₹' || v_freight_amt || ' for ' || v_order.commodity || ' won! Freight is secured in AgrowLink Escrow. Pickup address is now unlocked in My Active Trips.',
            'delivery',
            '/transporter-dashboard',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'delivery_id', v_delivery.id,
        'freight_amount', v_freight_amt,
        'grand_total_amount', v_grand_total,
        'escrow_status', v_order_escrow_status,
        'status', v_order_status
    );
END;
$$;
-- >>> END supabase/step1_moq_and_competitive_freight_rfq.sql <<<

-- >>> BEGIN supabase/fix_orders_missing_fee_columns.sql <<<
-- ============================================================================
-- AGROWLINK FIX: Ensure public.orders has buyer_fee_amount & freight columns
-- File: supabase/fix_orders_missing_fee_columns.sql
-- Fixes error: record "v_order" has no field "buyer_fee_amount"
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_commission_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_seller_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_arrival BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_arrival_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_verified_at TIMESTAMP WITH TIME ZONE;

-- Refresh lock_buyer_order_and_freight_escrow_atomic so v_order accesses are safe
CREATE OR REPLACE FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(
    p_order_id TEXT,
    p_payment_mode TEXT DEFAULT 'direct_razorpay',
    p_payment_id TEXT DEFAULT NULL,
    p_bank_utr TEXT DEFAULT NULL,
    p_auto_verified BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_delivery RECORD;
    v_fin RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_freight_amt NUMERIC;
    v_freight_fee NUMERIC;
    v_transporter_fee NUMERIC;
    v_transporter_net NUMERIC;
    v_buyer_fee NUMERIC;
    v_grand_total NUMERIC;
    v_is_privileged BOOLEAN;
    v_is_bank_pending BOOLEAN;
    v_order_escrow_status TEXT;
    v_order_status TEXT;
    v_del_status TEXT;
    v_del_escrow_status TEXT;
BEGIN
    v_is_privileged := (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
    );

    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    IF auth.uid() IS NOT NULL AND NOT v_is_privileged THEN
        IF v_order.buyer_id IS NOT NULL AND v_order.buyer_id <> auth.uid()::text THEN
            RAISE EXCEPTION 'Security Policy Violation: You can only lock escrow for your own purchase orders.';
        END IF;
    END IF;

    IF COALESCE(v_order.escrow_status, '') IN ('funded', 'held', 'escrow_secured', 'released') THEN
        SELECT * INTO v_delivery
        FROM public.deliveries
        WHERE order_id = v_order.id OR order_number = v_order.order_number
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_delivery.id IS NULL OR COALESCE(v_delivery.freight_escrow_status, '') IN ('escrow_locked', 'locked', 'released') THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_funded', true,
                'order_id', v_order.id,
                'order_number', v_order.order_number,
                'delivery_id', v_delivery.id,
                'freight_amount', COALESCE(v_order.freight_amount, v_delivery.freight_amount, 0),
                'grand_total_amount', COALESCE(v_order.grand_total_amount, v_order.total_amount),
                'escrow_status', v_order.escrow_status,
                'status', v_order.status
            );
        END IF;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE order_id = v_order.id OR order_number = v_order.order_number
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_freight_amt := COALESCE(v_delivery.freight_amount, v_order.freight_amount, 0);

    IF v_freight_amt IS NULL OR v_freight_amt <= 0 THEN
        RAISE EXCEPTION 'Cannot lock combined escrow before a verified transporter freight quote (> 0) is recorded.';
    END IF;

    v_freight_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_net := ROUND(v_freight_amt - v_transporter_fee, 2);
    v_buyer_fee := COALESCE(
        NULLIF((to_jsonb(v_order)->>'buyer_fee_amount')::numeric, 0),
        NULLIF((to_jsonb(v_order)->>'buyer_fee')::numeric, 0),
        ROUND(v_order.total_amount * 0.0025, 2)
    );
    v_grand_total := ROUND(v_order.total_amount + v_buyer_fee + v_freight_amt + v_freight_fee, 2);

    IF p_payment_mode = 'trade_credit' THEN
        SELECT * INTO v_fin
        FROM public.financing_requests
        WHERE (order_id = v_order.id OR order_number = v_order.order_number)
          AND (
              v_is_privileged
              OR applicant_id = v_order.buyer_id
              OR (auth.uid() IS NOT NULL AND applicant_id = auth.uid()::text)
          )
        ORDER BY created_at DESC
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Security Policy Violation: No trade credit financing request exists for order %.', v_order.order_number;
        END IF;

        v_order_escrow_status := 'financing_pending';
        v_order_status := 'order_placed';

        IF v_is_privileged OR COALESCE(v_fin.status, '') IN ('approved', 'disbursed', 'escrow_secured') THEN
            v_del_status := 'assigned';
            v_del_escrow_status := 'escrow_locked';
        ELSE
            v_del_status := COALESCE(v_delivery.status, 'price_offered');
            v_del_escrow_status := 'financing_pending';
        END IF;
    ELSIF p_payment_mode = 'escrow_van' THEN
        v_is_bank_pending := NOT (v_is_privileged AND COALESCE(p_auto_verified, false));
        IF v_is_bank_pending THEN
            v_order_escrow_status := 'pending';
            v_order_status := 'pending';
            v_del_status := 'price_offered';
            v_del_escrow_status := 'pending_bank_check';
        ELSE
            v_order_escrow_status := 'funded';
            v_order_status := 'order_placed';
            v_del_status := 'assigned';
            v_del_escrow_status := 'escrow_locked';
        END IF;
    ELSE
        IF NOT v_is_privileged AND COALESCE(v_order.escrow_status, '') NOT IN ('funded', 'held', 'escrow_secured') THEN
            RAISE EXCEPTION 'Security Policy Violation: Direct client funding of Razorpay escrow is forbidden. Payment must be verified server-side via the payment gateway.';
        END IF;

        v_order_escrow_status := 'funded';
        v_order_status := 'order_placed';
        v_del_status := 'assigned';
        v_del_escrow_status := 'escrow_locked';
    END IF;

    UPDATE public.orders SET
        freight_amount = v_freight_amt,
        freight_fee_amount = v_freight_fee,
        grand_total_amount = v_grand_total,
        payment_mode = p_payment_mode,
        payment_id = COALESCE(p_payment_id, payment_id),
        bank_utr = COALESCE(p_bank_utr, bank_utr),
        escrow_status = v_order_escrow_status,
        settlement_status = CASE WHEN v_order_escrow_status = 'funded' THEN 'captured_on_hold' ELSE COALESCE(settlement_status, 'pending_deposit') END,
        status = v_order_status,
        updated_at = v_now
    WHERE id = v_order.id;

    IF v_delivery.id IS NOT NULL THEN
        UPDATE public.deliveries SET
            status = v_del_status,
            freight_escrow_status = v_del_escrow_status,
            freight_payer_id = v_order.buyer_id,
            freight_payer_role = 'buyer',
            freight_base_amount = v_freight_amt,
            consignor_freight_fee = v_freight_fee,
            total_freight_payable = ROUND(v_freight_amt + v_freight_fee, 2),
            transporter_commission_fee = v_transporter_fee,
            transporter_net_payout = v_transporter_net,
            freight_payment_mode = p_payment_mode,
            freight_bank_utr = COALESCE(p_bank_utr, p_payment_id),
            freight_deposited_at = CASE WHEN v_del_escrow_status = 'escrow_locked' THEN v_now ELSE freight_deposited_at END,
            updated_at = v_now
        WHERE id = v_delivery.id;
    END IF;

    IF v_order_escrow_status = 'funded' AND v_del_escrow_status = 'escrow_locked' THEN
        IF v_order.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_order.farmer_id,
                'farmer',
                'Order & Freight Confirmed (' || v_order.order_number || ')',
                'Buyer locked ₹' || v_order.total_amount || ' produce payment + ₹' || v_freight_amt || ' freight in AgrowLink Escrow. Assigned vehicle (' || COALESCE(v_delivery.vehicle_number, 'Carrier') || ') will arrive for pickup.',
                'order',
                '/farmer-orders',
                false,
                v_now
            );
        END IF;

        IF v_delivery.transporter_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || (extract(epoch from v_now)::bigint + 1) || '_' || substr(md5(random()::text), 1, 6),
                v_delivery.transporter_id,
                'transporter',
                'Freight Quote Won & Escrow Locked! (' || v_delivery.delivery_number || ')',
                'Your quote of ₹' || v_freight_amt || ' for ' || v_order.commodity || ' won! Freight is secured in AgrowLink Escrow. Pickup address is now unlocked in My Active Trips.',
                'delivery',
                '/transporter-dashboard',
                false,
                v_now
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'delivery_id', v_delivery.id,
        'freight_amount', v_freight_amt,
        'grand_total_amount', v_grand_total,
        'escrow_status', v_order_escrow_status,
        'status', v_order_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;
-- >>> END supabase/fix_orders_missing_fee_columns.sql <<<

-- >>> BEGIN supabase/atomic_functions.sql <<<
-- ============================================================================
-- AGROWLINK PRODUCTION ATOMIC STORED PROCEDURES
-- Concurrency-safe, transactional functions for bidding, escrow release, and settlement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ATOMIC AUCTION BID PLACEMENT
-- Concurrency lock: FOR UPDATE on auctions row
-- Enforces:
--   1. Strict authentication & identity binding (auth.uid())
--   2. Enforces minimum bid step (bid_step) to stop 1-paisa sniping
--   3. Soft-close extension (+2 mins) if bid placed in final 2 minutes
--   4. Anti-shill self-bidding prevention
--   5. Forward vs Reverse auction logic & reserve floor checks
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_auction_bid_atomic(
    p_auction_id TEXT,
    p_bid_amount NUMERIC,
    p_bidder_id TEXT DEFAULT NULL,
    p_bidder_name TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_auction RECORD;
    v_new_bid_id TEXT;
    v_prev_bidder_id TEXT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_bidder_id TEXT;
    v_bidder_name TEXT;
    v_kyc_status TEXT;
    v_role TEXT;
    v_step NUMERIC;
    v_new_end_time TIMESTAMP WITH TIME ZONE;
    v_extended BOOLEAN := false;
BEGIN
    -- 1. Cryptographically bind bidder identity from Supabase Auth session
    v_bidder_id := auth.uid()::text;
    IF v_bidder_id IS NULL THEN
        -- Fallback for direct testing / service role if explicit param provided
        v_bidder_id := NULLIF(TRIM(p_bidder_id), '');
    END IF;

    IF v_bidder_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: You must be logged in to place a bid.';
    END IF;

    -- 2. Resolve authoritative bidder identity & KYC status from profiles
    SELECT 
        COALESCE(NULLIF(TRIM(full_name), ''), NULLIF(TRIM(name), ''), p_bidder_name, 'Verified Trader'),
        COALESCE(kyc_status, 'pending'),
        COALESCE(role, 'buyer')
    INTO v_bidder_name, v_kyc_status, v_role
    FROM public.profiles
    WHERE id = v_bidder_id;

    IF v_bidder_name IS NULL THEN
        v_bidder_name := COALESCE(NULLIF(TRIM(p_bidder_name), ''), 'Verified Trader');
    END IF;

    -- Enforce server-side KYC verification: Only verified traders or administrators can bid
    IF COALESCE(v_kyc_status, 'pending') NOT IN ('verified', 'approved') AND COALESCE(v_role, '') != 'admin' THEN
        RAISE EXCEPTION 'KYC verification required: Your account KYC must be approved by AgrowLink Operations before participating in live bidding.';
    END IF;

    -- 2. Acquire exclusive row lock on the auction to eliminate race conditions
    SELECT * INTO v_auction 
    FROM public.auctions 
    WHERE id = p_auction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    -- 3. Verify auction is strictly live
    IF v_auction.status != 'live' THEN
        RAISE EXCEPTION 'This auction is no longer live (Status: %).', v_auction.status;
    END IF;

    -- 4. Verify auction has not expired
    IF v_now >= v_auction.end_time THEN
        UPDATE public.auctions SET status = 'completed', updated_at = v_now WHERE id = p_auction_id;
        RAISE EXCEPTION 'This auction has ended and is no longer accepting bids.';
    END IF;

    -- 5. Prevent Shill-Bidding (Producers cannot bid on their own lot)
    IF v_auction.farmer_id IS NOT NULL AND v_auction.farmer_id = v_bidder_id THEN
        RAISE EXCEPTION 'Producers are not permitted to bid on their own auctions.';
    END IF;

    -- 6. Enforce Minimum Bid Step (bid_step)
    v_step := COALESCE(v_auction.bid_step, 1);
    IF v_step <= 0 THEN
        v_step := 1;
    END IF;

    IF COALESCE(v_auction.auction_type, 'forward') = 'reverse' THEN
        -- REVERSE AUCTION (Descending Bids: Suppliers undercut each other)
        IF COALESCE(v_auction.total_bids, 0) = 0 THEN
            IF p_bid_amount > v_auction.current_bid THEN
                RAISE EXCEPTION 'In a reverse auction, opening bid cannot exceed the starting ceiling price of ₹%.', v_auction.current_bid;
            END IF;
        ELSE
            IF p_bid_amount > (v_auction.current_bid - v_step) THEN
                RAISE EXCEPTION 'In a reverse auction, your bid of ₹% must reduce the current leading bid of ₹% by at least the bid step of ₹% (Maximum allowable bid: ₹%).',
                    p_bid_amount, v_auction.current_bid, v_step, (v_auction.current_bid - v_step);
            END IF;
        END IF;

        IF p_bid_amount <= 0 THEN
            RAISE EXCEPTION 'In a reverse auction, your bid must be greater than zero.';
        END IF;
    ELSE
        -- FORWARD AUCTION (Ascending Bids: Buyers bid upwards)
        IF COALESCE(v_auction.total_bids, 0) = 0 THEN
            IF p_bid_amount < v_auction.current_bid THEN
                RAISE EXCEPTION 'Opening bid of ₹% must be at least the starting price of ₹%.', p_bid_amount, v_auction.current_bid;
            END IF;
        ELSE
            IF p_bid_amount < (v_auction.current_bid + v_step) THEN
                RAISE EXCEPTION 'Your bid of ₹% must be at least ₹% higher than the current leading bid of ₹% (Minimum next bid: ₹%).',
                    p_bid_amount, v_step, v_auction.current_bid, (v_auction.current_bid + v_step);
            END IF;
        END IF;
    END IF;

    -- 7. Soft-Close Anti-Sniping Protection (Extend by 2 mins if bid placed in final 2 minutes)
    v_new_end_time := v_auction.end_time;
    IF (v_auction.end_time - v_now) < INTERVAL '2 minutes' THEN
        v_new_end_time := v_now + INTERVAL '2 minutes';
        v_extended := true;
    END IF;

    -- Save previous highest bidder for outbid notification
    v_prev_bidder_id := v_auction.highest_bidder_id;

    -- 8. Insert new bid record
    v_new_bid_id := 'bid_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6);
    INSERT INTO public.auction_bids (id, auction_id, bidder_id, bidder_name, bid_amount, created_at)
    VALUES (v_new_bid_id, p_auction_id, v_bidder_id, v_bidder_name, p_bid_amount, v_now);

    -- 9. Update auction current bid atomically
    UPDATE public.auctions SET
        current_bid = p_bid_amount,
        highest_bidder_id = v_bidder_id,
        highest_bidder_name = v_bidder_name,
        total_bids = COALESCE(v_auction.total_bids, 0) + 1,
        end_time = v_new_end_time,
        updated_at = v_now
    WHERE id = p_auction_id;

    -- 10. Instant outbid notification to previous leader
    IF v_prev_bidder_id IS NOT NULL AND v_prev_bidder_id != v_bidder_id THEN
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
        'highest_bidder_id', v_bidder_id,
        'highest_bidder_name', v_bidder_name,
        'total_bids', COALESCE(v_auction.total_bids, 0) + 1,
        'end_time', v_new_end_time,
        'extended', v_extended,
        'status', 'live'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 2. ATOMIC ESCROW RELEASE
-- Concurrency lock: FOR UPDATE on orders row
-- Enforces: idempotency (cannot be released twice), status check, syncs delivery and notifications
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_escrow_atomic(
    p_order_id TEXT,
    p_admin_name TEXT DEFAULT 'AgrowLink Operations Ombudsman',
    p_admin_notes TEXT DEFAULT 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.',
    p_bank_name TEXT DEFAULT NULL,
    p_account_number TEXT DEFAULT NULL,
    p_ifsc TEXT DEFAULT NULL,
    p_utr TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_utr TEXT;
    v_caller_id TEXT := auth.uid()::TEXT;
BEGIN
    -- 0. CRITICAL AUTHORIZATION CHECK: Caller MUST be a verified platform administrator
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    IF NOT (public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Forbidden: Only authorized platform administrators can execute escrow releases.';
    END IF;

    -- 1. Acquire exclusive lock on the target order row
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    -- 2. Prevent double release (idempotency check)
    IF v_order.escrow_status = 'released' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Escrow was already released previously.',
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'bank_utr', v_order.bank_utr,
            'escrow_status', 'released'
        );
    END IF;

    -- 3. Verify order is in a releasable escrow state
    IF v_order.escrow_status NOT IN ('funded', 'escrow_secured', 'held') THEN
        RAISE EXCEPTION 'Cannot release escrow in current state: %', v_order.escrow_status;
    END IF;

    -- Set bank UTR if supplied (treat empty/whitespace as NULL until settlement confirms)
    v_utr := COALESCE(NULLIF(TRIM(p_utr), ''), NULLIF(TRIM(v_order.bank_utr), ''));

    -- 4. Update Order atomically
    UPDATE public.orders SET
        status = 'completed',
        escrow_status = 'released',
        admin_verified_by = COALESCE(NULLIF(TRIM(p_admin_name), ''), 'AgrowLink Operations Ombudsman'),
        admin_verification_status = 'approved',
        admin_call_notes = COALESCE(NULLIF(TRIM(p_admin_notes), ''), 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.'),
        admin_verified_at = v_now,
        payout_bank_name = COALESCE(NULLIF(TRIM(p_bank_name), ''), NULLIF(TRIM(v_order.payout_bank_name), ''), 'Bank Account'),
        payout_account_number = COALESCE(NULLIF(TRIM(p_account_number), ''), NULLIF(TRIM(v_order.payout_account_number), ''), '—'),
        payout_ifsc = COALESCE(NULLIF(TRIM(p_ifsc), ''), NULLIF(TRIM(v_order.payout_ifsc), ''), '—'),
        bank_utr = v_utr,
        disbursed_at = v_now,
        updated_at = v_now
    WHERE id = v_order.id;

    -- 5. Atomically update linked delivery status
    UPDATE public.deliveries SET
        status = 'completed',
        updated_at = v_now
    WHERE order_id = v_order.id OR order_number = v_order.order_number;

    -- 6. Notify farmer of bank disbursement (NULL-safe when bank_utr is not yet available)
    IF v_order.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_order.farmer_id,
            'farmer',
            CASE
                WHEN v_utr IS NOT NULL THEN 'Payment Disbursed (UTR ' || v_utr || ')'
                ELSE 'Payment Disbursed (Bank Settlement Pending UTR)'
            END,
            'Escrow payout of ₹' || COALESCE(v_order.total_amount::TEXT, '0') || ' for ' || COALESCE(NULLIF(TRIM(v_order.commodity), ''), 'Produce') || ' (' || COALESCE(NULLIF(TRIM(v_order.order_number), ''), v_order.id) || ') has been disbursed to your bank account.',
            'escrow',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    -- 7. Notify buyer of completed transaction
    IF v_order.buyer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_order.buyer_id,
            'buyer',
            'Trade Completed (' || COALESCE(NULLIF(TRIM(v_order.order_number), ''), v_order.id) || ')',
            'Escrow settlement finalized for your ' || COALESCE(NULLIF(TRIM(v_order.commodity), ''), 'Produce') || ' order. Receipt has been generated.',
            'order',
            '/buyer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'escrow_status', 'released',
        'status', 'completed',
        'bank_utr', v_utr,
        'total_amount', v_order.total_amount,
        'disbursed_at', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 3. ATOMIC AUCTION FINALIZATION & ORDER KNOCKDOWN
-- Concurrency lock: FOR UPDATE on auctions row
-- Enforces: reserve price validation, single-order creation (no duplicates)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_auction_atomic(
    p_auction_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_auction RECORD;
    v_existing_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_order_id TEXT;
    v_order_num TEXT;
    v_total_amt NUMERIC;
    v_delivery_id TEXT;
    v_delivery_num TEXT;
    v_final_status TEXT;
BEGIN
    -- 1. Lock auction row
    SELECT * INTO v_auction 
    FROM public.auctions 
    WHERE id = p_auction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    -- If already concluded, return status idempotently
    IF v_auction.status IN ('completed', 'reserve_not_met', 'cancelled') THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', v_auction.status,
            'message', 'Auction already settled.'
        );
    END IF;

    -- 2. Evaluate Reserve Price based on Auction Type (Forward vs Reverse)
    IF v_auction.highest_bidder_id IS NULL THEN
        -- No bids placed at all
        v_final_status := 'reserve_not_met';
    ELSIF COALESCE(v_auction.auction_type, 'forward') = 'reverse' THEN
        -- REVERSE AUCTION (Procurement Tender): Prices descend towards buyer's target ceiling
        -- Reserve is unmet if the lowest bid remained HIGHER than the buyer's reserve target budget
        IF v_auction.reserve_price IS NOT NULL AND v_auction.reserve_price > 0 AND v_auction.current_bid > v_auction.reserve_price THEN
            v_final_status := 'reserve_not_met';
        ELSE
            v_final_status := 'completed';
        END IF;
    ELSE
        -- FORWARD AUCTION (Farmer Selling): Prices ascend towards seller's reserve floor
        -- Reserve is unmet if the highest bid remained LOWER than the seller's reserve floor
        IF v_auction.reserve_price IS NOT NULL AND v_auction.reserve_price > 0 AND v_auction.current_bid < v_auction.reserve_price THEN
            v_final_status := 'reserve_not_met';
        ELSE
            v_final_status := 'completed';
        END IF;
    END IF;

    IF v_final_status = 'reserve_not_met' THEN
        UPDATE public.auctions SET
            status = v_final_status,
            updated_at = v_now
        WHERE id = p_auction_id;

        -- Notify auction creator
        IF v_auction.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_auction.farmer_id,
                'farmer',
                'Auction Ended (Reserve Not Met)',
                CASE 
                    WHEN COALESCE(v_auction.auction_type, 'forward') = 'reverse' THEN
                        'The reverse bidding for ' || v_auction.commodity || ' concluded at ₹' || v_auction.current_bid || '/' || v_auction.unit || ', which did not reach your reserve target budget of ₹' || v_auction.reserve_price || '. No order was generated.'
                    ELSE
                        'The bidding for ' || v_auction.commodity || ' concluded below your reserve price of ₹' || v_auction.reserve_price || '/' || v_auction.unit || '. No order was generated.'
                END,
                'order',
                '/farmer-my-auctions',
                false,
                v_now
            );
        END IF;

        RETURN jsonb_build_object('success', true, 'status', v_final_status);
    END IF;

    -- 3. Mark auction completed
    v_final_status := 'completed';
    UPDATE public.auctions SET
        status = v_final_status,
        updated_at = v_now
    WHERE id = p_auction_id;

    -- 4. Check if an order already exists (idempotency against concurrent calls)
    SELECT * INTO v_existing_order FROM public.orders WHERE auction_id = p_auction_id LIMIT 1;

    IF v_existing_order.id IS NULL THEN
        v_order_id := 'ord_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
        v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
        v_total_amt := v_auction.quantity * v_auction.current_bid;

        -- Insert primary order with 'pending' escrow & 'pending' order status
        -- Produce pickup and dispatch must NOT be authorized until the winning bidder completes payment deposit
        INSERT INTO public.orders (
            id, order_number, auction_id, listing_id, buyer_id, buyer_name,
            farmer_id, farmer_name, commodity, variety, grade, quantity, unit,
            price_per_unit, total_amount, state, district, escrow_status, status,
            created_at, updated_at
        ) VALUES (
            v_order_id, v_order_num, v_auction.id, NULL, v_auction.highest_bidder_id, COALESCE(v_auction.highest_bidder_name, 'Buyer Partner'),
            v_auction.farmer_id, COALESCE(v_auction.farmer_name, 'Farmer Partner'), v_auction.commodity, v_auction.variety, v_auction.grade, v_auction.quantity, v_auction.unit,
            v_auction.current_bid, v_total_amt, v_auction.state, v_auction.district, 'pending', 'pending',
            v_now, v_now
        );

        -- Note: Deliveries are NOT inserted until escrow funding is completed by the buyer.
        -- This prevents false transporter dispatches and ghost bookings for unpaid lots.

        -- Notify buyer of auction win & required escrow deposit
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_auction.highest_bidder_id,
            'buyer',
            'Auction Won! Escrow Deposit Required (' || v_auction.commodity || ')',
            'Congratulations! You won the auction with a final bid of ₹' || v_auction.current_bid || '/' || v_auction.unit || '. Please complete your escrow deposit of ₹' || v_total_amt || ' to authorize packaging and dispatch.',
            'order',
            '/buyer-orders',
            false,
            v_now
        );

        -- Notify farmer of successful lot sale (escrow pending)
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_auction.farmer_id,
            'farmer',
            'Lot Sold! Awaiting Escrow (' || v_auction.commodity || ')',
            'Your auction closed successfully at ₹' || v_auction.current_bid || '/' || v_auction.unit || ' (Total: ₹' || v_total_amt || '). Order ' || v_order_num || ' created — awaiting buyer escrow deposit before dispatch.',
            'order',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'completed',
        'order_id', COALESCE(v_order_id, v_existing_order.id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 3A. ATOMIC EARLY AUCTION KNOCKDOWN (FOR UPDATE ROW LOCK)
-- Serializes strictly against place_auction_bid_atomic() so a concurrent higher
-- bid can never be overwritten or settled at an outdated price.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_auction_bid_early_atomic(
    p_auction_id TEXT,
    p_expected_bid NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_auction RECORD;
    v_updated_auction RECORD;
    v_existing_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := false;
    v_order_id TEXT;
    v_order_num TEXT;
    v_total_amt NUMERIC;
    v_buyer_fee NUMERIC;
    v_seller_fee NUMERIC;
    v_platform_fee NUMERIC;
    v_net_seller NUMERIC;
    v_grand_total NUMERIC;
BEGIN
    v_is_privileged := public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role';

    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    -- 1. Acquire exclusive row lock on the auction (serializes with place_auction_bid_atomic)
    SELECT * INTO v_auction
    FROM public.auctions
    WHERE id = p_auction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    -- 2. Verify caller owns the auction lot or holds admin/service authority
    IF NOT v_is_privileged AND v_caller_id IS DISTINCT FROM v_auction.farmer_id THEN
        RAISE EXCEPTION 'Forbidden: Only the auction creator or platform administrator can accept bids early.';
    END IF;

    -- 3. Guard against stale state or concurrent bid mismatch
    IF v_auction.status = 'completed' THEN
        IF p_expected_bid IS NOT NULL AND v_auction.current_bid IS DISTINCT FROM p_expected_bid THEN
            RAISE EXCEPTION 'Bid update conflict: Auction already concluded at updated bid ₹% by %.',
                v_auction.current_bid,
                COALESCE(NULLIF(TRIM(v_auction.highest_bidder_name), ''), 'Leading Buyer');
        END IF;

        SELECT * INTO v_existing_order
        FROM public.orders
        WHERE auction_id = v_auction.id
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'auction', to_jsonb(v_auction),
            'order', to_jsonb(v_existing_order)
        );
    END IF;

    IF v_auction.status <> 'live' THEN
        RAISE EXCEPTION 'Cannot accept bid early: auction is no longer live (Status: %).', v_auction.status;
    END IF;

    IF v_auction.highest_bidder_id IS NULL OR v_auction.current_bid IS NULL THEN
        RAISE EXCEPTION 'No bids have been placed on this auction yet.';
    END IF;

    IF p_expected_bid IS NOT NULL AND v_auction.current_bid IS DISTINCT FROM p_expected_bid THEN
        RAISE EXCEPTION 'Bid update conflict: A newer bid of ₹% by % just arrived. Please review the updated offer before closing the auction.',
            v_auction.current_bid,
            COALESCE(NULLIF(TRIM(v_auction.highest_bidder_name), ''), 'Leading Buyer');
    END IF;

    -- 4. Close auction atomically using ONLY authoritative locked row bid/bidder fields
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    UPDATE public.auctions SET
        status = 'completed',
        end_time = v_now,
        updated_at = v_now
    WHERE id = v_auction.id
    RETURNING * INTO v_updated_auction;

    -- 5. Idempotently create pending escrow order inside the same transaction
    SELECT * INTO v_existing_order
    FROM public.orders
    WHERE auction_id = v_auction.id
    LIMIT 1;

    IF v_existing_order.id IS NULL THEN
        v_order_id := 'ord_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 9);
        v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
        v_total_amt := ROUND(COALESCE(v_auction.quantity, 0) * v_auction.current_bid, 2);
        v_buyer_fee := ROUND(v_total_amt * 0.0025, 2);
        v_seller_fee := ROUND(v_total_amt * 0.0025, 2);
        v_platform_fee := v_buyer_fee + v_seller_fee;
        v_net_seller := v_total_amt - v_seller_fee;
        v_grand_total := v_total_amt + v_buyer_fee;

        INSERT INTO public.orders (
            id, order_number, auction_id, listing_id,
            buyer_id, buyer_name, farmer_id, farmer_name,
            commodity, variety, grade, quantity, unit,
            price_per_unit, total_amount,
            buyer_fee_amount, seller_fee_amount, platform_commission_amount, net_seller_amount,
            grand_total_amount, state, district,
            escrow_status, settlement_status, status,
            created_at, updated_at
        ) VALUES (
            v_order_id, v_order_num, v_auction.id, NULL,
            v_auction.highest_bidder_id, COALESCE(NULLIF(TRIM(v_auction.highest_bidder_name), ''), 'Buyer Partner'),
            v_auction.farmer_id, COALESCE(NULLIF(TRIM(v_auction.farmer_name), ''), 'Farmer Partner'),
            v_auction.commodity, COALESCE(v_auction.variety, 'None'), COALESCE(v_auction.grade, 'A'),
            v_auction.quantity, v_auction.unit,
            v_auction.current_bid, v_total_amt,
            v_buyer_fee, v_seller_fee, v_platform_fee, v_net_seller,
            v_grand_total, v_auction.state, v_auction.district,
            'pending', 'pending_deposit', 'pending',
            v_now, v_now
        )
        RETURNING * INTO v_existing_order;

        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_auction.highest_bidder_id,
            'buyer',
            'Bid Accepted! Escrow Deposit Required (' || COALESCE(NULLIF(TRIM(v_auction.commodity), ''), 'Produce') || ')',
            'Your offer of ₹' || COALESCE(v_auction.current_bid::TEXT, '0') || '/' || COALESCE(NULLIF(TRIM(v_auction.unit), ''), 'unit') || ' was accepted early! Please complete your escrow deposit of ₹' || COALESCE(v_grand_total::TEXT, '0') || ' for ' || v_order_num || '.',
            'order',
            '/buyer-orders',
            false,
            v_now
        );

        IF v_auction.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_auction.farmer_id,
                'farmer',
                'Early Sale Confirmed (' || COALESCE(NULLIF(TRIM(v_auction.commodity), ''), 'Produce') || ')',
                'You accepted the leading bid of ₹' || COALESCE(v_auction.current_bid::TEXT, '0') || '/' || COALESCE(NULLIF(TRIM(v_auction.unit), ''), 'unit') || '. Order ' || v_order_num || ' is awaiting buyer escrow funding.',
                'order',
                '/farmer-orders',
                false,
                v_now
            );
        END IF;
    END IF;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    RETURN jsonb_build_object(
        'success', true,
        'auction', to_jsonb(v_updated_auction),
        'order', to_jsonb(v_existing_order)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_auction_bid_early_atomic(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_auction_bid_early_atomic(TEXT, NUMERIC) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3B. BATCH AUTOMATED FINALIZATION FOR EXPIRED AUCTIONS
-- Concurrency lock: FOR UPDATE SKIP LOCKED
-- Settles all live auctions whose end_time has passed without blocking
-- Safe for concurrent execution via pg_cron, serverless daemon, or client RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_expired_auctions_batch()
RETURNS JSONB AS $$
DECLARE
    v_rec RECORD;
    v_finalized_count INT := 0;
    v_errors_count INT := 0;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    FOR v_rec IN 
        SELECT id 
        FROM public.auctions 
        WHERE status = 'live' 
          AND end_time <= v_now
        ORDER BY end_time ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            PERFORM public.finalize_auction_atomic(v_rec.id);
            v_finalized_count := v_finalized_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors_count := v_errors_count + 1;
            RAISE WARNING 'Failed to finalize expired auction %: %', v_rec.id, SQLERRM;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'finalized_count', v_finalized_count,
        'errors_count', v_errors_count,
        'timestamp', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 4. ATOMIC DIRECT MARKETPLACE PURCHASE & STOCK RESERVATION
-- Concurrency lock: FOR UPDATE on listings row
-- Enforces: stock availability check, atomic inventory reduction, duplicate prevention
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- AGRICULTURAL UNIT CONVERSION HELPER
-- Normalized factors: 1 MT = 10 Quintals = 1,000 kg
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_agri_volume(
    p_qty NUMERIC,
    p_from_unit TEXT,
    p_to_unit TEXT
) RETURNS NUMERIC AS $$
DECLARE
    v_from TEXT := LOWER(TRIM(COALESCE(p_from_unit, 'kg')));
    v_to TEXT := LOWER(TRIM(COALESCE(p_to_unit, 'kg')));
    v_factor_from NUMERIC := 1;
    v_factor_to NUMERIC := 1;
BEGIN
    IF p_qty IS NULL OR p_qty <= 0 THEN
        RETURN 0;
    END IF;

    IF v_from = v_to THEN
        RETURN p_qty;
    END IF;

    -- Factor to KG
    IF v_from IN ('mt', 'ton', 'tonne', 't') THEN
        v_factor_from := 1000;
    ELSIF v_from IN ('quintal', 'qtl') THEN
        v_factor_from := 100;
    ELSIF v_from IN ('kg', 'kgs', 'kilogram') THEN
        v_factor_from := 1;
    ELSE
        RETURN p_qty; -- non-weight or packaged unit, return as-is
    END IF;

    IF v_to IN ('mt', 'ton', 'tonne', 't') THEN
        v_factor_to := 1000;
    ELSIF v_to IN ('quintal', 'qtl') THEN
        v_factor_to := 100;
    ELSIF v_to IN ('kg', 'kgs', 'kilogram') THEN
        v_factor_to := 1;
    ELSE
        RETURN p_qty;
    END IF;

    RETURN ROUND((p_qty * v_factor_from) / v_factor_to, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- 5. ATOMIC DIRECT ORDER PURCHASE
-- Concurrency lock: FOR UPDATE on listings row
-- Enforces: stock availability check, unit conversion, atomic inventory reduction, duplicate prevention
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_direct_order_atomic(
    p_listing_id TEXT,
    p_buyer_id TEXT,
    p_buyer_name TEXT,
    p_quantity NUMERIC,
    p_delivery_location JSONB DEFAULT '{}'::jsonb,
    p_is_trade_credit BOOLEAN DEFAULT false,
    p_buyer_unit TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_listing RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_deduct_qty NUMERIC;
    v_order_id TEXT;
    v_order_num TEXT;
    v_delivery_id TEXT;
    v_delivery_num TEXT;
    v_unit_price NUMERIC;
    v_total_amt NUMERIC;
    v_buyer_fee NUMERIC;
    v_seller_fee NUMERIC;
    v_platform_fee NUMERIC;
    v_net_seller NUMERIC;
    v_new_qty NUMERIC;
    v_escrow_status TEXT;
    v_status TEXT;
BEGIN
    -- 1. Acquire exclusive lock on the listing row
    SELECT * INTO v_listing
    FROM public.listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing % not found.', p_listing_id;
    END IF;

    -- 2. Validate listing status
    IF v_listing.status = 'sold' OR v_listing.quantity <= 0 THEN
        RAISE EXCEPTION 'This lot is already sold out.';
    END IF;

    -- 2b. Prevent Self-Trading (Sellers cannot buy their own produce)
    IF v_listing.farmer_id IS NOT NULL AND (
        v_listing.farmer_id = p_buyer_id OR 
        (auth.uid() IS NOT NULL AND v_listing.farmer_id = auth.uid()::text)
    ) THEN
        RAISE EXCEPTION 'You cannot buy your own produce. Self-trading is not permitted on AgrowLink.';
    END IF;

    -- 2c. Canonical unit conversion to listing's native unit
    IF p_buyer_unit IS NOT NULL AND TRIM(p_buyer_unit) <> '' AND LOWER(TRIM(p_buyer_unit)) <> LOWER(TRIM(COALESCE(v_listing.unit, 'kg'))) THEN
        v_deduct_qty := public.convert_agri_volume(p_quantity, p_buyer_unit, v_listing.unit);
    ELSE
        v_deduct_qty := p_quantity;
    END IF;

    -- 3. Check inventory availability against converted volume
    IF v_deduct_qty > v_listing.quantity THEN
        RAISE EXCEPTION 'Requested quantity (% %) exceeds available inventory (% %).', 
            p_quantity, COALESCE(p_buyer_unit, v_listing.unit, 'kg'), v_listing.quantity, COALESCE(v_listing.unit, 'kg');
    END IF;

    -- 4. Compute financial breakdown using authoritative listing price
    v_unit_price := v_listing.price;
    v_total_amt := ROUND(v_deduct_qty * v_unit_price, 2);
    v_buyer_fee := ROUND(v_total_amt * 0.0025, 2);
    v_seller_fee := ROUND(v_total_amt * 0.0025, 2);
    v_platform_fee := v_buyer_fee + v_seller_fee;
    v_net_seller := v_total_amt - v_seller_fee;

    -- 5. Deduct inventory and update listing status
    v_new_qty := ROUND(v_listing.quantity - v_deduct_qty, 4);
    UPDATE public.listings SET
        quantity = v_new_qty,
        status = CASE WHEN v_new_qty <= 0 THEN 'sold' ELSE 'active' END,
        updated_at = v_now
    WHERE id = p_listing_id;

    -- 6. Create Order atomically
    v_order_id := 'ord_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
    v_escrow_status := CASE WHEN p_is_trade_credit THEN 'pending' ELSE 'funded' END;
    v_status := 'order_placed';

    INSERT INTO public.orders (
        id, order_number, listing_id, auction_id, buyer_id, buyer_name,
        farmer_id, farmer_name, commodity, variety, grade, quantity, unit,
        price_per_unit, total_amount, buyer_fee_amount, seller_fee_amount,
        platform_commission_amount, net_seller_amount, delivery_location,
        state, district, escrow_status, status, created_at, updated_at
    ) VALUES (
        v_order_id, v_order_num, v_listing.id, NULL, p_buyer_id, COALESCE(p_buyer_name, 'Wholesale Buyer'),
        v_listing.farmer_id, COALESCE(v_listing.farmer_name, 'Verified Producer'), v_listing.commodity,
        v_listing.variety, v_listing.grade, p_quantity, COALESCE(p_buyer_unit, v_listing.unit),
        v_unit_price, v_total_amt, v_buyer_fee, v_seller_fee,
        v_platform_fee, v_net_seller, p_delivery_location,
        COALESCE(p_delivery_location->>'state', v_listing.state, ''),
        COALESCE(p_delivery_location->>'district', v_listing.district, ''),
        v_escrow_status, v_status, v_now, v_now
    );

    -- 7. Create linked Delivery record
    v_delivery_id := 'del_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_delivery_num := 'DEL-' || floor(1000 + random() * 9000)::text;

    INSERT INTO public.deliveries (
        id, delivery_number, order_id, order_number, farmer_id, farmer_name,
        buyer_id, buyer_name, commodity, grade, variety, quantity, unit,
        pickup_location, delivery_location, distance_km, fare_amount, status,
        delivery_otp, created_at, updated_at
    ) VALUES (
        v_delivery_id, v_delivery_num, v_order_id, v_order_num, v_listing.farmer_id, v_listing.farmer_name,
        p_buyer_id, p_buyer_name, v_listing.commodity, v_listing.grade, v_listing.variety, p_quantity, COALESCE(p_buyer_unit, v_listing.unit),
        jsonb_build_object('state', v_listing.state, 'district', v_listing.district, 'address', v_listing.district || ' Farmgate Aggregation Hub'),
        p_delivery_location, NULL, NULL, 'transport_requested',
        floor(100000 + random() * 900000)::text, v_now, v_now
    );

    -- 8. Notify Producer
    IF v_listing.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_listing.farmer_id,
            'farmer',
            'New Purchase Order ' || v_order_num,
            'Order for ' || p_quantity || ' ' || v_listing.unit || ' of ' || v_listing.commodity || ' received from ' || COALESCE(p_buyer_name, 'Buyer') || '. Total: ₹' || v_total_amt || '.',
            'order',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_num,
        'listing_id', v_listing.id,
        'quantity', p_quantity,
        'remaining_stock', v_new_qty,
        'total_amount', v_total_amt,
        'escrow_status', v_escrow_status,
        'status', v_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 5. ATOMIC DISPUTE ESCROW FREEZING
-- Concurrency lock: FOR UPDATE on orders row
-- Enforces: caller authorization + active funded escrow preconditions before freezing
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.freeze_order_on_dispute_atomic(
    p_order_id TEXT,
    p_dispute_reason TEXT DEFAULT 'Quality / moisture grade discrepancy reported by buyer'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := false;
    v_escrow_status TEXT;
    v_order_status TEXT;
BEGIN
    v_is_privileged := public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role';

    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    IF NOT v_is_privileged AND v_caller_id IS DISTINCT FROM v_order.buyer_id THEN
        RAISE EXCEPTION 'Forbidden: Only the purchasing buyer or platform administrator can initiate an escrow freeze.';
    END IF;

    v_escrow_status := COALESCE(NULLIF(trim(v_order.escrow_status), ''), 'pending');
    v_order_status := COALESCE(NULLIF(trim(v_order.status), ''), 'pending');

    IF v_escrow_status IN ('released', 'refunded', 'settled')
       OR v_order_status IN ('completed', 'cancelled', 'refunded') THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot freeze order % because settlement is already closed (escrow_status: %, status: %).',
            v_order.order_number, v_escrow_status, v_order_status;
    END IF;

    IF v_escrow_status IN ('held', 'disputed') AND v_order_status = 'disputed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_disputed', true,
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'escrow_status', v_escrow_status,
            'status', 'disputed'
        );
    END IF;

    IF v_escrow_status NOT IN ('funded', 'escrow_secured', 'held')
       OR v_order_status IN ('pending', 'awaiting_freight_quote', 'freight_quoted') THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot freeze unpaid or unfunded order % (escrow_status: %, status: %). Only funded escrow orders can be placed on dispute hold.',
            v_order.order_number, v_escrow_status, v_order_status;
    END IF;

    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    -- Freeze escrow and mark dispute
    UPDATE public.orders SET
        escrow_status = 'held',
        status = 'disputed',
        admin_call_notes = 'DISPUTE ACTIVE: ' || COALESCE(NULLIF(trim(p_dispute_reason), ''), 'Quality / moisture grade discrepancy reported by buyer'),
        updated_at = v_now
    WHERE id = v_order.id;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'escrow_status', 'held',
        'status', 'disputed'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.freeze_order_on_dispute_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.freeze_order_on_dispute_atomic(TEXT, TEXT) TO authenticated, service_role;
-- >>> END supabase/atomic_functions.sql <<<

-- >>> BEGIN supabase/step5_security_hardening_patch.sql <<<
-- ============================================================================
-- AGROWLINK ANTI-TAMPERING & SECURITY HARDENING PATCH (STEP 5)
-- File: supabase/step5_security_hardening_patch.sql
-- Purpose:
--   Hardens PostgreSQL RPCs & Triggers against Chrome DevTools, Postman,
--   and 3rd-party Supabase REST client manipulation:
--   1. Adds protect_delivery_financial_fields() trigger on public.deliveries
--      (Blocks non-admins from releasing freight escrow or tampering with locked freight amounts)
--   2. Hardens submit_transporter_quote_atomic()
--      (Blocks quote changes once freight escrow is locked & verifies caller role)
--   3. Hardens lock_buyer_order_and_freight_escrow_atomic()
--      (Blocks locking combined escrow if freight_amount <= 0)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROTECT DELIVERIES FINANCIAL & ESCROW INTEGRITY TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_delivery_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Allow Admin, Service Role, or Trusted SECURITY DEFINER RPCs
    IF public.is_admin()
       OR (auth.jwt() ->> 'role') = 'service_role'
       OR auth.role() = 'service_role'
       OR current_setting('agrolnk.trusted_rpc', true) = 'true'
       OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Block non-admin/non-gateway from locking, funding, or releasing freight escrow
    IF (NEW.freight_escrow_status IS DISTINCT FROM OLD.freight_escrow_status)
       AND COALESCE(NEW.freight_escrow_status, '') IN ('escrow_locked', 'locked', 'funded', 'held', 'released') THEN
        RAISE EXCEPTION 'Security Policy Violation: Freight escrow state (%) can only be set by the verified payment gateway or AgrowLink Admin.', NEW.freight_escrow_status;
    END IF;

    IF (NEW.status IS DISTINCT FROM OLD.status)
       AND NEW.status = 'completed' THEN
        RAISE EXCEPTION 'Security Policy Violation: Only AgrowLink Admin can mark a delivery completed and settled.';
    END IF;

    -- Block client-side tampering with freight fee breakdown columns
    IF (NEW.freight_base_amount IS DISTINCT FROM OLD.freight_base_amount)
       OR (NEW.consignor_freight_fee IS DISTINCT FROM OLD.consignor_freight_fee)
       OR (NEW.total_freight_payable IS DISTINCT FROM OLD.total_freight_payable)
       OR (NEW.transporter_commission_fee IS DISTINCT FROM OLD.transporter_commission_fee)
       OR (NEW.transporter_net_payout IS DISTINCT FROM OLD.transporter_net_payout) THEN
        RAISE EXCEPTION 'Security Policy Violation: Freight commission and escrow breakdown columns cannot be modified directly.';
    END IF;

    -- Once freight escrow is locked, block anyone (except Admin/RPC) from altering the agreed freight_amount or winning transporter
    IF COALESCE(OLD.freight_escrow_status, '') IN ('locked', 'escrow_locked', 'released') THEN
        IF (NEW.freight_amount IS DISTINCT FROM OLD.freight_amount)
           OR (NEW.transporter_id IS DISTINCT FROM OLD.transporter_id) THEN
            RAISE EXCEPTION 'Security Policy Violation: Agreed freight quote and assigned carrier cannot be altered after escrow lock.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_delivery_financial_fields ON public.deliveries;
CREATE TRIGGER trg_protect_delivery_financial_fields
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_delivery_financial_fields();

-- ----------------------------------------------------------------------------
-- 2. HARDEN submit_transporter_quote_atomic AGAINST ROLE SPOOFING & POST-LOCK EDITS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_transporter_quote_atomic(
    p_delivery_id TEXT,
    p_transporter_id TEXT,
    p_transporter_name TEXT,
    p_vehicle_type TEXT,
    p_vehicle_number TEXT,
    p_driver_name TEXT,
    p_driver_phone TEXT,
    p_freight_amount NUMERIC,
    p_is_admin_assigned BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_delivery RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_existing_quotes JSONB;
    v_filtered_quotes JSONB := '[]'::jsonb;
    v_new_quote JSONB;
    v_elem JSONB;
    v_lowest_quote JSONB := NULL;
    v_lowest_amt NUMERIC := NULL;
    v_q_amt NUMERIC;
    v_effective_is_admin BOOLEAN;
BEGIN
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    IF p_freight_amount IS NULL OR p_freight_amount <= 0 THEN
        RAISE EXCEPTION 'Freight quote amount must be greater than zero.';
    END IF;

    -- Verify Admin flag cannot be spoofed by non-admin callers
    v_effective_is_admin := COALESCE(p_is_admin_assigned, false) AND public.is_admin();

    -- If authenticated user is neither transporter nor admin, reject
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()::text AND role IN ('transporter', 'admin')
        ) AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') NOT IN ('transporter', 'admin') THEN
            RAISE EXCEPTION 'Security Policy Violation: Only verified transporters or AgrowLink Admin can submit freight quotes.';
        END IF;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery job % not found.', p_delivery_id;
    END IF;

    IF (v_delivery.status NOT IN ('transport_requested', 'price_offered')
        OR COALESCE(v_delivery.freight_escrow_status, '') IN ('locked', 'escrow_locked', 'released'))
       AND NOT v_effective_is_admin THEN
        RAISE EXCEPTION 'This freight job is already locked in escrow and no longer accepting quotes.';
    END IF;

    v_existing_quotes := COALESCE(v_delivery.freight_quotes, '[]'::jsonb);

    -- Remove previous quote from the same transporter (if updating their bid)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_existing_quotes)
    LOOP
        IF COALESCE(v_elem->>'transporterId', '') <> COALESCE(p_transporter_id, '') THEN
            v_filtered_quotes := v_filtered_quotes || jsonb_build_array(v_elem);
        END IF;
    END LOOP;

    v_new_quote := jsonb_build_object(
        'transporterId', COALESCE(p_transporter_id, 'transporter'),
        'transporterName', COALESCE(p_transporter_name, 'Verified Transporter'),
        'vehicleType', COALESCE(p_vehicle_type, 'Commercial Freight Carrier'),
        'vehicleNumber', UPPER(TRIM(COALESCE(p_vehicle_number, ''))),
        'driverName', COALESCE(p_driver_name, 'Assigned Driver'),
        'driverPhone', COALESCE(p_driver_phone, ''),
        'freightAmount', ROUND(p_freight_amount, 2),
        'isAdminAssigned', v_effective_is_admin,
        'quotedAt', v_now
    );

    v_filtered_quotes := v_filtered_quotes || jsonb_build_array(v_new_quote);

    -- Determine the lowest quote across all submitted bids (if Admin assigned, Admin quote takes precedence)
    IF v_effective_is_admin THEN
        v_lowest_quote := v_new_quote;
        v_lowest_amt := ROUND(p_freight_amount, 2);
    ELSE
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_filtered_quotes)
        LOOP
            v_q_amt := (v_elem->>'freightAmount')::numeric;
            IF v_lowest_amt IS NULL OR v_q_amt < v_lowest_amt THEN
                v_lowest_amt := v_q_amt;
                v_lowest_quote := v_elem;
            END IF;
        END LOOP;
    END IF;

    -- Update delivery with full quote history and current winning (lowest) quote
    UPDATE public.deliveries SET
        freight_quotes = v_filtered_quotes,
        transporter_id = v_lowest_quote->>'transporterId',
        transporter_name = v_lowest_quote->>'transporterName',
        vehicle_type = v_lowest_quote->>'vehicleType',
        vehicle_number = v_lowest_quote->>'vehicleNumber',
        driver_name = v_lowest_quote->>'driverName',
        driver_phone = v_lowest_quote->>'driverPhone',
        freight_amount = v_lowest_amt,
        freight_base_amount = v_lowest_amt,
        admin_assigned_quote = COALESCE(v_effective_is_admin, v_delivery.admin_assigned_quote, false),
        status = 'price_offered',
        updated_at = v_now
    WHERE id = v_delivery.id;

    -- Sync lowest freight quote to linked order so Buyer immediately sees it at checkout
    UPDATE public.orders SET
        freight_amount = v_lowest_amt,
        freight_fee_amount = ROUND(v_lowest_amt * 0.0025, 2),
        grand_total_amount = ROUND(total_amount + COALESCE(buyer_fee_amount, ROUND(total_amount * 0.0025, 2)) + v_lowest_amt + ROUND(v_lowest_amt * 0.0025, 2), 2),
        status = CASE WHEN status = 'awaiting_freight_quote' THEN 'freight_quoted' ELSE status END,
        escrow_status = CASE WHEN escrow_status = 'awaiting_freight_quote' THEN 'freight_quoted' ELSE escrow_status END,
        updated_at = v_now
    WHERE id = v_delivery.order_id OR order_number = v_delivery.order_number;

    -- Notify Buyer that a competitive freight quote is ready
    IF v_delivery.buyer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_delivery.buyer_id,
            'buyer',
            'Lowest Freight Quote Ready: ₹' || v_lowest_amt || ' (' || v_delivery.order_number || ')',
            'Verified carrier (' || (v_lowest_quote->>'transporterName') || ') quoted ₹' || v_lowest_amt || ' for ' || v_delivery.commodity || '. Complete combined escrow payment to confirm order and dispatch.',
            'delivery',
            '/buyer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', v_delivery.id,
        'lowest_freight_amount', v_lowest_amt,
        'lowest_quote', v_lowest_quote,
        'total_quotes_count', jsonb_array_length(v_filtered_quotes)
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. HARDEN lock_buyer_order_and_freight_escrow_atomic AGAINST UNQUOTED LOCKS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(
    p_order_id TEXT,
    p_payment_mode TEXT DEFAULT 'direct_razorpay',
    p_payment_id TEXT DEFAULT NULL,
    p_bank_utr TEXT DEFAULT NULL,
    p_auto_verified BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_delivery RECORD;
    v_fin RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_freight_amt NUMERIC;
    v_freight_fee NUMERIC;
    v_transporter_fee NUMERIC;
    v_transporter_net NUMERIC;
    v_buyer_fee NUMERIC;
    v_grand_total NUMERIC;
    v_is_privileged BOOLEAN;
    v_is_bank_pending BOOLEAN;
    v_order_escrow_status TEXT;
    v_order_status TEXT;
    v_del_status TEXT;
    v_del_escrow_status TEXT;
BEGIN
    v_is_privileged := (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
    );

    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    -- Verify only the order's Buyer, Admin, or Service Role can operate on this order
    IF auth.uid() IS NOT NULL AND NOT v_is_privileged THEN
        IF v_order.buyer_id IS NOT NULL AND v_order.buyer_id <> auth.uid()::text THEN
            RAISE EXCEPTION 'Security Policy Violation: You can only lock escrow for your own purchase orders.';
        END IF;
    END IF;

    IF COALESCE(v_order.escrow_status, '') IN ('funded', 'held', 'escrow_secured', 'released') THEN
        SELECT * INTO v_delivery
        FROM public.deliveries
        WHERE order_id = v_order.id OR order_number = v_order.order_number
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_delivery.id IS NULL OR COALESCE(v_delivery.freight_escrow_status, '') IN ('escrow_locked', 'locked', 'released') THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_funded', true,
                'order_id', v_order.id,
                'order_number', v_order.order_number,
                'delivery_id', v_delivery.id,
                'freight_amount', COALESCE(v_order.freight_amount, v_delivery.freight_amount, 0),
                'grand_total_amount', COALESCE(v_order.grand_total_amount, v_order.total_amount),
                'escrow_status', v_order.escrow_status,
                'status', v_order.status
            );
        END IF;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE order_id = v_order.id OR order_number = v_order.order_number
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_freight_amt := COALESCE(v_delivery.freight_amount, v_order.freight_amount, 0);

    IF v_freight_amt IS NULL OR v_freight_amt <= 0 THEN
        RAISE EXCEPTION 'Cannot lock combined escrow before a verified transporter freight quote (> 0) is recorded.';
    END IF;

    v_freight_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_net := ROUND(v_freight_amt - v_transporter_fee, 2);
    v_buyer_fee := COALESCE(NULLIF(v_order.buyer_fee_amount, 0), ROUND(v_order.total_amount * 0.0025, 2));
    v_grand_total := ROUND(v_order.total_amount + v_buyer_fee + v_freight_amt + v_freight_fee, 2);

    IF p_payment_mode = 'trade_credit' THEN
        SELECT * INTO v_fin
        FROM public.financing_requests
        WHERE (order_id = v_order.id OR order_number = v_order.order_number)
          AND (
              v_is_privileged
              OR applicant_id = v_order.buyer_id
              OR (auth.uid() IS NOT NULL AND applicant_id = auth.uid()::text)
          )
        ORDER BY created_at DESC
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Security Policy Violation: No trade credit financing request exists for order %.', v_order.order_number;
        END IF;

        v_order_escrow_status := 'financing_pending';
        v_order_status := 'order_placed';
        IF v_is_privileged OR COALESCE(v_fin.status, '') IN ('approved', 'disbursed', 'escrow_secured') THEN
            v_del_status := 'assigned';
            v_del_escrow_status := 'escrow_locked';
        ELSE
            v_del_status := COALESCE(v_delivery.status, 'price_offered');
            v_del_escrow_status := 'financing_pending';
        END IF;
    ELSIF p_payment_mode = 'escrow_van' THEN
        v_is_bank_pending := NOT (v_is_privileged AND COALESCE(p_auto_verified, false));
        IF v_is_bank_pending THEN
            v_order_escrow_status := 'pending';
            v_order_status := 'pending';
            v_del_status := 'price_offered';
            v_del_escrow_status := 'pending_bank_check';
        ELSE
            v_order_escrow_status := 'funded';
            v_order_status := 'order_placed';
            v_del_status := 'assigned';
            v_del_escrow_status := 'escrow_locked';
        END IF;
    ELSE
        IF NOT v_is_privileged AND COALESCE(v_order.escrow_status, '') NOT IN ('funded', 'held', 'escrow_secured') THEN
            RAISE EXCEPTION 'Security Policy Violation: Direct client funding of Razorpay escrow is forbidden. Payment must be verified server-side via the payment gateway.';
        END IF;

        v_order_escrow_status := 'funded';
        v_order_status := 'order_placed';
        v_del_status := 'assigned';
        v_del_escrow_status := 'escrow_locked';
    END IF;

    UPDATE public.orders SET
        freight_amount = v_freight_amt,
        freight_fee_amount = v_freight_fee,
        grand_total_amount = v_grand_total,
        payment_mode = p_payment_mode,
        payment_id = COALESCE(p_payment_id, payment_id),
        bank_utr = COALESCE(p_bank_utr, bank_utr),
        escrow_status = v_order_escrow_status,
        settlement_status = CASE WHEN v_order_escrow_status = 'funded' THEN 'captured_on_hold' ELSE COALESCE(settlement_status, 'pending_deposit') END,
        status = v_order_status,
        updated_at = v_now
    WHERE id = v_order.id;

    IF v_delivery.id IS NOT NULL THEN
        UPDATE public.deliveries SET
            status = v_del_status,
            freight_escrow_status = v_del_escrow_status,
            freight_payer_id = v_order.buyer_id,
            freight_payer_role = 'buyer',
            freight_base_amount = v_freight_amt,
            consignor_freight_fee = v_freight_fee,
            total_freight_payable = ROUND(v_freight_amt + v_freight_fee, 2),
            transporter_commission_fee = v_transporter_fee,
            transporter_net_payout = v_transporter_net,
            freight_payment_mode = p_payment_mode,
            freight_bank_utr = COALESCE(p_bank_utr, p_payment_id),
            freight_deposited_at = CASE WHEN v_del_escrow_status = 'escrow_locked' THEN v_now ELSE freight_deposited_at END,
            updated_at = v_now
        WHERE id = v_delivery.id;
    END IF;

    IF v_order_escrow_status = 'funded' AND v_del_escrow_status = 'escrow_locked' THEN
        IF v_order.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_order.farmer_id,
                'farmer',
                'Order & Freight Confirmed (' || v_order.order_number || ')',
                'Buyer locked ₹' || v_order.total_amount || ' produce payment + ₹' || v_freight_amt || ' freight in AgrowLink Escrow. Assigned vehicle (' || COALESCE(v_delivery.vehicle_number, 'Carrier') || ') will arrive for pickup.',
                'order',
                '/farmer-orders',
                false,
                v_now
            );
        END IF;

        IF v_delivery.transporter_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || (extract(epoch from v_now)::bigint + 1) || '_' || substr(md5(random()::text), 1, 6),
                v_delivery.transporter_id,
                'transporter',
                'Freight Quote Won & Escrow Locked! (' || v_delivery.delivery_number || ')',
                'Your quote of ₹' || v_freight_amt || ' for ' || v_order.commodity || ' won! Freight is secured in AgrowLink Escrow. Pickup address is now unlocked in My Active Trips.',
                'delivery',
                '/transporter-dashboard',
                false,
                v_now
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'delivery_id', v_delivery.id,
        'freight_amount', v_freight_amt,
        'grand_total_amount', v_grand_total,
        'escrow_status', v_order_escrow_status,
        'status', v_order_status
    );
END;
$$;
-- >>> END supabase/step5_security_hardening_patch.sql <<<

-- >>> BEGIN supabase/fix_reverse_demand_accept_atomic.sql <<<
-- ============================================================================
-- AGROWLINK SECURITY & WORKFLOW FIX: ATOMIC REVERSE DEMAND OFFER ACCEPTANCE
-- File: supabase/fix_reverse_demand_accept_atomic.sql
-- Fixes:
--   1. Prevents reverse demand orders from starting as status = 'order_placed'
--      while escrow_status = 'pending' (they now start in 'awaiting_freight_quote').
--   2. Computes authoritative 0.25% Buyer + 0.25% Seller platform fees (0.50% take-rate),
--      net_seller_amount, and grand_total_amount server-side.
--   3. Atomically creates a linked public.deliveries 30-minute freight RFQ
--      ('transport_requested') and notifies verified transporters + winning farmer.
--   4. Updates demand_offers ('accepted' + rejects competing offers) and
--      buyer_demands ('awarded') atomically in one transaction with buyer auth check.
-- Run this complete script in your Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_demand_offer_atomic(
    p_demand_id TEXT,
    p_offer_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_demand RECORD;
    v_offer RECORD;
    v_farmer RECORD;
    v_transporter RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_rfq_expiry TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '30 minutes';
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := false;
    v_qty NUMERIC;
    v_unit_price NUMERIC;
    v_unit TEXT;
    v_total_amt NUMERIC;
    v_buyer_fee NUMERIC;
    v_seller_fee NUMERIC;
    v_platform_fee NUMERIC;
    v_net_seller NUMERIC;
    v_grand_total NUMERIC;
    v_order_id TEXT;
    v_order_num TEXT;
    v_delivery_id TEXT;
    v_delivery_num TEXT;
    v_pickup_location JSONB;
    v_delivery_location JSONB;
BEGIN
    v_is_privileged := public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role';

    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required to accept a demand offer.';
    END IF;

    -- 1. Lock target buyer demand row
    SELECT * INTO v_demand
    FROM public.buyer_demands
    WHERE id = p_demand_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Requirement % not found.', p_demand_id;
    END IF;

    IF NOT v_is_privileged AND v_caller_id IS DISTINCT FROM v_demand.buyer_id THEN
        RAISE EXCEPTION 'Forbidden: Only the buyer who posted this demand or an administrator can accept an offer.';
    END IF;

    IF COALESCE(v_demand.status, 'open') <> 'open' THEN
        RAISE EXCEPTION 'Demand % is already % and can no longer accept offers.',
            COALESCE(v_demand.demand_number, p_demand_id), v_demand.status;
    END IF;

    -- 2. Lock target supplier offer row
    SELECT * INTO v_offer
    FROM public.demand_offers
    WHERE id = p_offer_id AND demand_id = p_demand_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer % not found for demand %.', p_offer_id, p_demand_id;
    END IF;

    IF COALESCE(v_offer.status, 'submitted') <> 'submitted' THEN
        RAISE EXCEPTION 'Offer % is already % and cannot be accepted.', p_offer_id, v_offer.status;
    END IF;

    IF v_offer.farmer_id IS NOT NULL AND v_demand.buyer_id IS NOT NULL AND v_offer.farmer_id = v_demand.buyer_id THEN
        RAISE EXCEPTION 'Security Policy Violation: You cannot accept your own supply offer.';
    END IF;

    -- 3. Authoritative quantity, price & 0.25% + 0.25% platform commission math
    v_qty := COALESCE(v_offer.quantity_offered, v_demand.quantity, 0);
    v_unit_price := COALESCE(v_offer.offer_price, 0);
    IF v_qty <= 0 OR v_unit_price <= 0 THEN
        RAISE EXCEPTION 'Invalid offer quantity (%) or unit price (%).', v_qty, v_unit_price;
    END IF;

    v_unit := COALESCE(NULLIF(trim(v_offer.unit), ''), NULLIF(trim(v_demand.unit), ''), 'kg');
    v_total_amt := ROUND(v_qty * v_unit_price, 2);
    v_buyer_fee := ROUND(v_total_amt * 0.0025, 2);
    v_seller_fee := ROUND(v_total_amt * 0.0025, 2);
    v_platform_fee := ROUND(v_buyer_fee + v_seller_fee, 2);
    v_net_seller := ROUND(v_total_amt - v_seller_fee, 2);
    v_grand_total := ROUND(v_total_amt + v_buyer_fee, 2);

    -- 4. Resolve pickup & delivery locations
    SELECT state, district, village, full_name, name
    INTO v_farmer
    FROM public.profiles
    WHERE id = v_offer.farmer_id
    LIMIT 1;

    v_delivery_location := jsonb_build_object(
        'state', COALESCE(v_demand.delivery_state, ''),
        'district', COALESCE(v_demand.delivery_district, ''),
        'pincode', COALESCE(v_demand.delivery_pincode, ''),
        'address', COALESCE(NULLIF(trim(v_demand.delivery_address), ''), NULLIF(trim(v_demand.delivery_district), ''), 'Buyer Delivery Hub'),
        'phone', COALESCE(v_demand.buyer_phone, '')
    );

    v_pickup_location := jsonb_build_object(
        'state', COALESCE(NULLIF(trim(v_farmer.state), ''), v_demand.delivery_state, ''),
        'district', COALESCE(NULLIF(trim(v_farmer.district), ''), v_demand.delivery_district, ''),
        'address', COALESCE(NULLIF(trim(v_farmer.village), ''), NULLIF(trim(v_farmer.district), ''), 'Verified Producer') || ' Farmgate Aggregation Hub'
    );

    -- 5. Authorize protected triggers strictly after all validation checks pass
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    v_order_id := 'ord_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
    v_delivery_id := 'del_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_delivery_num := 'DEL-' || floor(1000 + random() * 9000)::text;

    -- 6. Insert Order in 'awaiting_freight_quote' state with full platform fee breakdown
    INSERT INTO public.orders (
        id, order_number, listing_id, auction_id,
        buyer_id, buyer_name, farmer_id, farmer_name,
        commodity, variety, grade, quantity, unit,
        price_per_unit, total_amount,
        buyer_fee_amount, seller_fee_amount, platform_commission_amount, net_seller_amount,
        freight_amount, freight_fee_amount, grand_total_amount, rfq_expires_at,
        delivery_location, state, district,
        escrow_status, settlement_status, status, created_at, updated_at
    ) VALUES (
        v_order_id, v_order_num, NULL, NULL,
        v_demand.buyer_id, COALESCE(NULLIF(trim(v_demand.buyer_name), ''), 'Buyer Partner'),
        v_offer.farmer_id, COALESCE(NULLIF(trim(v_offer.farmer_name), ''), NULLIF(trim(v_farmer.full_name), ''), NULLIF(trim(v_farmer.name), ''), 'Farmer Partner'),
        v_demand.commodity, COALESCE(v_demand.variety, 'None'), COALESCE(v_demand.grade, 'A'),
        v_qty, v_unit, v_unit_price, v_total_amt,
        v_buyer_fee, v_seller_fee, v_platform_fee, v_net_seller,
        0, 0, v_grand_total, v_rfq_expiry,
        v_delivery_location, COALESCE(v_demand.delivery_state, ''), COALESCE(v_demand.delivery_district, ''),
        'awaiting_freight_quote', 'pending_deposit', 'awaiting_freight_quote', v_now, v_now
    );

    -- 7. Insert linked 30-Minute Competitive Freight RFQ in public.deliveries
    INSERT INTO public.deliveries (
        id, delivery_number, order_id, order_number,
        farmer_id, farmer_name, buyer_id, buyer_name,
        commodity, grade, variety, quantity, unit,
        pickup_location, delivery_location, estimated_distance_km, freight_amount,
        status, freight_escrow_status, rfq_expires_at, freight_quotes,
        freight_payer_id, freight_payer_role,
        pickup_otp, delivery_otp, created_at, updated_at
    ) VALUES (
        v_delivery_id, v_delivery_num, v_order_id, v_order_num,
        v_offer.farmer_id, COALESCE(NULLIF(trim(v_offer.farmer_name), ''), 'Farmer Partner'),
        v_demand.buyer_id, COALESCE(NULLIF(trim(v_demand.buyer_name), ''), 'Buyer Partner'),
        v_demand.commodity, COALESCE(v_demand.grade, 'A'), COALESCE(v_demand.variety, 'None'),
        v_qty, v_unit,
        v_pickup_location, v_delivery_location, NULL, NULL,
        'transport_requested', 'unfunded', v_rfq_expiry, '[]'::jsonb,
        v_demand.buyer_id, 'buyer',
        floor(1000 + random() * 9000)::text,
        floor(1000 + random() * 9000)::text,
        v_now, v_now
    );

    -- 8. Atomically accept winning offer, close competing offers, and mark demand awarded
    UPDATE public.demand_offers SET
        status = 'accepted'
    WHERE id = v_offer.id;

    UPDATE public.demand_offers SET
        status = 'rejected'
    WHERE demand_id = p_demand_id
      AND id <> v_offer.id
      AND COALESCE(status, 'submitted') = 'submitted';

    UPDATE public.buyer_demands SET
        status = 'awarded',
        updated_at = v_now
    WHERE id = p_demand_id;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    -- 9. Broadcast 30-Minute Freight RFQ notifications to all verified transporters
    FOR v_transporter IN
        SELECT id FROM public.profiles WHERE role = 'transporter'
    LOOP
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text || v_transporter.id), 1, 8),
            v_transporter.id,
            'transporter',
            'New 30-Min Freight RFQ: ' || v_demand.commodity,
            'Quote requested for ' || v_qty || ' ' || v_unit || ' from ' || COALESCE(NULLIF(trim(v_pickup_location->>'district'), ''), 'Origin') || ', ' || COALESCE(v_pickup_location->>'state', '') || ' to ' || COALESCE(NULLIF(trim(v_demand.delivery_district), ''), 'Destination') || ', ' || COALESCE(v_demand.delivery_state, '') || '. Lowest bid wins!',
            'delivery',
            '/transporter-dashboard',
            false,
            v_now
        );
    END LOOP;

    -- 10. Notify winning Farmer that supply quote was accepted & freight RFQ is live
    IF v_offer.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text || v_offer.farmer_id), 1, 8),
            v_offer.farmer_id,
            'farmer',
            'Demand Offer Accepted (' || v_order_num || ')',
            'Your offer of ₹' || v_unit_price || '/' || v_unit || ' for ' || v_qty || ' ' || v_unit || ' ' || v_demand.commodity || ' was accepted! Freight quotes are being collected before buyer escrow funding.',
            'order',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_order_id,
        'order_id', v_order_id,
        'order_number', v_order_num,
        'delivery_id', v_delivery_id,
        'delivery_number', v_delivery_num,
        'demand_id', p_demand_id,
        'offer_id', v_offer.id,
        'buyer_id', v_demand.buyer_id,
        'buyer_name', COALESCE(NULLIF(trim(v_demand.buyer_name), ''), 'Buyer Partner'),
        'farmer_id', v_offer.farmer_id,
        'farmer_name', COALESCE(NULLIF(trim(v_offer.farmer_name), ''), 'Farmer Partner'),
        'commodity', v_demand.commodity,
        'variety', COALESCE(v_demand.variety, 'None'),
        'grade', COALESCE(v_demand.grade, 'A'),
        'quantity', v_qty,
        'unit', v_unit,
        'price_per_unit', v_unit_price,
        'total_amount', v_total_amt,
        'buyer_fee_amount', v_buyer_fee,
        'seller_fee_amount', v_seller_fee,
        'platform_commission_amount', v_platform_fee,
        'net_seller_amount', v_net_seller,
        'freight_amount', 0,
        'freight_fee_amount', 0,
        'grand_total_amount', v_grand_total,
        'rfq_expires_at', v_rfq_expiry,
        'state', COALESCE(v_demand.delivery_state, ''),
        'district', COALESCE(v_demand.delivery_district, ''),
        'escrow_status', 'awaiting_freight_quote',
        'status', 'awaiting_freight_quote',
        'created_at', v_now,
        'updated_at', v_now
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_demand_offer_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_demand_offer_atomic(TEXT, TEXT) TO authenticated, service_role;
-- >>> END supabase/fix_reverse_demand_accept_atomic.sql <<<

-- >>> BEGIN supabase/fix_early_auction_accept_atomic.sql <<<
-- ============================================================================
-- AGROWLINK SECURITY & CONCURRENCY FIX: ATOMIC EARLY AUCTION KNOCKDOWN
-- File: supabase/fix_early_auction_accept_atomic.sql
-- Purpose:
--   Replaces racy client-side SELECT -> UPDATE -> INSERT in acceptAuctionBidEarly()
--   with a single SERIALIZABLE row-locked PostgreSQL transaction.
--   - Acquires FOR UPDATE row lock on public.auctions (serializing directly with
--     place_auction_bid_atomic()).
--   - Verifies caller owns the auction lot (farmer_id) or is admin/service_role.
--   - Rejects stale acceptances if a concurrent bid altered current_bid.
--   - Closes the auction using ONLY authoritative database row values and creates
--     the pending escrow order & notifications atomically.
-- Safe & Idempotent: Run directly in Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_auction_bid_early_atomic(
    p_auction_id TEXT,
    p_expected_bid NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_auction RECORD;
    v_updated_auction RECORD;
    v_existing_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := false;
    v_order_id TEXT;
    v_order_num TEXT;
    v_total_amt NUMERIC;
    v_buyer_fee NUMERIC;
    v_seller_fee NUMERIC;
    v_platform_fee NUMERIC;
    v_net_seller NUMERIC;
    v_grand_total NUMERIC;
BEGIN
    v_is_privileged := public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role';

    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    -- 1. Acquire exclusive row lock on the auction (serializes with place_auction_bid_atomic)
    SELECT * INTO v_auction
    FROM public.auctions
    WHERE id = p_auction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    -- 2. Verify caller owns the auction lot or holds admin/service authority
    IF NOT v_is_privileged AND v_caller_id IS DISTINCT FROM v_auction.farmer_id THEN
        RAISE EXCEPTION 'Forbidden: Only the auction creator or platform administrator can accept bids early.';
    END IF;

    -- 3. Guard against stale state or concurrent bid mismatch
    IF v_auction.status = 'completed' THEN
        IF p_expected_bid IS NOT NULL AND v_auction.current_bid IS DISTINCT FROM p_expected_bid THEN
            RAISE EXCEPTION 'Bid update conflict: Auction already concluded at updated bid ₹% by %.',
                v_auction.current_bid,
                COALESCE(NULLIF(TRIM(v_auction.highest_bidder_name), ''), 'Leading Buyer');
        END IF;

        SELECT * INTO v_existing_order
        FROM public.orders
        WHERE auction_id = v_auction.id
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'auction', to_jsonb(v_auction),
            'order', to_jsonb(v_existing_order)
        );
    END IF;

    IF v_auction.status <> 'live' THEN
        RAISE EXCEPTION 'Cannot accept bid early: auction is no longer live (Status: %).', v_auction.status;
    END IF;

    IF v_auction.highest_bidder_id IS NULL OR v_auction.current_bid IS NULL THEN
        RAISE EXCEPTION 'No bids have been placed on this auction yet.';
    END IF;

    IF p_expected_bid IS NOT NULL AND v_auction.current_bid IS DISTINCT FROM p_expected_bid THEN
        RAISE EXCEPTION 'Bid update conflict: A newer bid of ₹% by % just arrived. Please review the updated offer before closing the auction.',
            v_auction.current_bid,
            COALESCE(NULLIF(TRIM(v_auction.highest_bidder_name), ''), 'Leading Buyer');
    END IF;

    -- 4. Close auction atomically using ONLY authoritative locked row bid/bidder fields
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    UPDATE public.auctions SET
        status = 'completed',
        end_time = v_now,
        updated_at = v_now
    WHERE id = v_auction.id
    RETURNING * INTO v_updated_auction;

    -- 5. Idempotently create pending escrow order inside the same transaction
    SELECT * INTO v_existing_order
    FROM public.orders
    WHERE auction_id = v_auction.id
    LIMIT 1;

    IF v_existing_order.id IS NULL THEN
        v_order_id := 'ord_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 9);
        v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
        v_total_amt := ROUND(COALESCE(v_auction.quantity, 0) * v_auction.current_bid, 2);
        v_buyer_fee := ROUND(v_total_amt * 0.0025, 2);
        v_seller_fee := ROUND(v_total_amt * 0.0025, 2);
        v_platform_fee := v_buyer_fee + v_seller_fee;
        v_net_seller := v_total_amt - v_seller_fee;
        v_grand_total := v_total_amt + v_buyer_fee;

        INSERT INTO public.orders (
            id, order_number, auction_id, listing_id,
            buyer_id, buyer_name, farmer_id, farmer_name,
            commodity, variety, grade, quantity, unit,
            price_per_unit, total_amount,
            buyer_fee_amount, seller_fee_amount, platform_commission_amount, net_seller_amount,
            grand_total_amount, state, district,
            escrow_status, settlement_status, status,
            created_at, updated_at
        ) VALUES (
            v_order_id, v_order_num, v_auction.id, NULL,
            v_auction.highest_bidder_id, COALESCE(NULLIF(TRIM(v_auction.highest_bidder_name), ''), 'Buyer Partner'),
            v_auction.farmer_id, COALESCE(NULLIF(TRIM(v_auction.farmer_name), ''), 'Farmer Partner'),
            v_auction.commodity, COALESCE(v_auction.variety, 'None'), COALESCE(v_auction.grade, 'A'),
            v_auction.quantity, v_auction.unit,
            v_auction.current_bid, v_total_amt,
            v_buyer_fee, v_seller_fee, v_platform_fee, v_net_seller,
            v_grand_total, v_auction.state, v_auction.district,
            'pending', 'pending_deposit', 'pending',
            v_now, v_now
        )
        RETURNING * INTO v_existing_order;

        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_auction.highest_bidder_id,
            'buyer',
            'Bid Accepted! Escrow Deposit Required (' || COALESCE(NULLIF(TRIM(v_auction.commodity), ''), 'Produce') || ')',
            'Your offer of ₹' || COALESCE(v_auction.current_bid::TEXT, '0') || '/' || COALESCE(NULLIF(TRIM(v_auction.unit), ''), 'unit') || ' was accepted early! Please complete your escrow deposit of ₹' || COALESCE(v_grand_total::TEXT, '0') || ' for ' || v_order_num || '.',
            'order',
            '/buyer-orders',
            false,
            v_now
        );

        IF v_auction.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_auction.farmer_id,
                'farmer',
                'Early Sale Confirmed (' || COALESCE(NULLIF(TRIM(v_auction.commodity), ''), 'Produce') || ')',
                'You accepted the leading bid of ₹' || COALESCE(v_auction.current_bid::TEXT, '0') || '/' || COALESCE(NULLIF(TRIM(v_auction.unit), ''), 'unit') || '. Order ' || v_order_num || ' is awaiting buyer escrow funding.',
                'order',
                '/farmer-orders',
                false,
                v_now
            );
        END IF;
    END IF;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    RETURN jsonb_build_object(
        'success', true,
        'auction', to_jsonb(v_updated_auction),
        'order', to_jsonb(v_existing_order)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_auction_bid_early_atomic(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_auction_bid_early_atomic(TEXT, NUMERIC) TO authenticated, service_role;
-- >>> END supabase/fix_early_auction_accept_atomic.sql <<<

-- >>> BEGIN supabase/fix_pledged_collateral_unlock_bypass.sql <<<
-- ============================================================================
-- AGROWLINK SECURITY REMEDIATION MIGRATION
-- Issue: Anyone Can Unlock Pledged Warehouse Collateral (e-NWR) Without Repaying the Loan
-- Fixes:
--   1. Hardens release_warehouse_receipt_lien_atomic() and lock_warehouse_receipt_for_loan_atomic()
--      with strict caller role checks, lien-holder identity verification, loan-to-receipt binding,
--      and REVOKE EXECUTE FROM PUBLIC, anon.
--   2. Hardens guard_pledged_receipt_trade() and adds DELETE + listings guards so neither
--      farmers nor warehouse operators can clear lien_status, list, or dispatch pledged stock.
--   3. Hardens protect_financing_approval_fields() and adds INSERT/DELETE trigger guards so
--      borrowers cannot self-mark loans as 'repaid'/'settled'/'cancelled' to trigger collateral unlock.
-- Run this complete script in your Supabase SQL Editor.
-- ============================================================================

-- 1. Harden lock_warehouse_receipt_for_loan_atomic
CREATE OR REPLACE FUNCTION public.lock_warehouse_receipt_for_loan_atomic(
    p_loan_id TEXT,
    p_receipt_id TEXT,
    p_financier_id TEXT,
    p_financier_name TEXT,
    p_loan_number TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_receipt RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_is_service_or_admin BOOLEAN := FALSE;
    v_is_financier BOOLEAN := FALSE;
BEGIN
    v_is_service_or_admin := (
        (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
        OR public.is_admin()
    );
    v_is_financier := public.is_verified_financier();

    IF NOT v_is_service_or_admin AND NOT v_is_financier AND pg_trigger_depth() = 0 THEN
        RAISE EXCEPTION 'Security Policy Violation: Only a Verified Institutional Financier, Platform Admin, or Verified System Trigger can lock warehouse collateral.';
    END IF;

    IF NOT v_is_service_or_admin AND v_is_financier AND pg_trigger_depth() = 0 THEN
        IF p_financier_id IS NOT NULL AND p_financier_id <> '' AND p_financier_id <> auth.uid()::text THEN
            RAISE EXCEPTION 'Security Policy Violation: Financier identity mismatch when locking collateral.';
        END IF;
    END IF;

    SELECT * INTO v_receipt
    FROM public.warehouse_receipts
    WHERE id = p_receipt_id OR receipt_number = p_receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Warehouse receipt ' || COALESCE(p_receipt_id, 'NULL') || ' not found.'
        );
    END IF;

    IF COALESCE(v_receipt.status, '') = 'released' OR COALESCE(v_receipt.total_quantity, 0) <= 0 THEN
        RAISE EXCEPTION 'Collateral Error: Warehouse receipt % has already been physically released and cannot be pledged.',
            COALESCE(v_receipt.receipt_number, v_receipt.id);
    END IF;

    IF v_receipt.lien_status = 'pledged' AND v_receipt.lien_loan_id IS NOT NULL AND v_receipt.lien_loan_id <> p_loan_id THEN
        RAISE EXCEPTION 'Double-Pledging Security Violation: Warehouse receipt % is already pledged to % under active loan %. Multiple loans against the same commodity are strictly prohibited.',
            v_receipt.receipt_number,
            COALESCE(v_receipt.lien_holder_name, 'another institutional financier'),
            COALESCE(v_receipt.lien_loan_number, v_receipt.lien_loan_id);
    END IF;

    UPDATE public.warehouse_receipts SET
        lien_status = 'pledged',
        lien_holder_id = p_financier_id,
        lien_holder_name = COALESCE(p_financier_name, 'Institutional Lender'),
        lien_loan_id = p_loan_id,
        lien_loan_number = COALESCE(p_loan_number, v_receipt.lien_loan_number),
        pledged_at = COALESCE(v_receipt.pledged_at, v_now),
        locked_quantity = v_receipt.total_quantity,
        available_quantity = 0,
        updated_at = v_now
    WHERE id = v_receipt.id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt.id,
        'receipt_number', v_receipt.receipt_number,
        'lien_status', 'pledged',
        'lien_holder', p_financier_name,
        'locked_quantity', v_receipt.total_quantity
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lock_warehouse_receipt_for_loan_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lock_warehouse_receipt_for_loan_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 2. Harden release_warehouse_receipt_lien_atomic
CREATE OR REPLACE FUNCTION public.release_warehouse_receipt_lien_atomic(
    p_loan_id TEXT,
    p_receipt_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_receipt RECORD;
    v_loan RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_is_service_or_admin BOOLEAN := FALSE;
    v_is_financier BOOLEAN := FALSE;
    v_caller_uid TEXT := auth.uid()::text;
    v_is_lien_holder BOOLEAN := FALSE;
    v_lookup_loan_id TEXT;
BEGIN
    v_is_service_or_admin := (
        (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
        OR public.is_admin()
    );
    v_is_financier := public.is_verified_financier();

    IF p_receipt_id IS NOT NULL AND p_receipt_id <> '' THEN
        SELECT * INTO v_receipt
        FROM public.warehouse_receipts
        WHERE id = p_receipt_id OR receipt_number = p_receipt_id
        FOR UPDATE;
    ELSE
        SELECT * INTO v_receipt
        FROM public.warehouse_receipts
        WHERE lien_loan_id = p_loan_id OR lien_loan_number = p_loan_id
        ORDER BY CASE WHEN lien_status = 'pledged' THEN 0 ELSE 1 END, pledged_at DESC NULLS LAST
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pledged warehouse receipt not found.');
    END IF;

    -- Prevent an unrelated loan from unlocking a receipt pledged to a different active loan
    IF v_receipt.lien_status = 'pledged'
       AND v_receipt.lien_loan_id IS NOT NULL
       AND p_loan_id IS NOT NULL
       AND p_loan_id <> ''
       AND v_receipt.lien_loan_id <> p_loan_id
       AND COALESCE(v_receipt.lien_loan_number, '') <> p_loan_id THEN
        IF pg_trigger_depth() > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'skipped', true,
                'message', 'Receipt is pledged to a different active loan.'
            );
        ELSIF NOT v_is_service_or_admin THEN
            RAISE EXCEPTION 'Security Policy Violation: Loan % does not hold the active lien on warehouse receipt %.',
                p_loan_id, v_receipt.receipt_number;
        END IF;
    END IF;

    v_lookup_loan_id := COALESCE(NULLIF(v_receipt.lien_loan_id, ''), NULLIF(p_loan_id, ''));
    IF v_lookup_loan_id IS NOT NULL THEN
        SELECT * INTO v_loan
        FROM public.financing_requests
        WHERE id = v_lookup_loan_id OR request_number = v_lookup_loan_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    v_is_lien_holder := (
        v_is_financier
        AND v_caller_uid IS NOT NULL
        AND (
            (v_receipt.lien_holder_id IS NOT NULL AND v_receipt.lien_holder_id = v_caller_uid)
            OR (v_loan.id IS NOT NULL AND v_loan.financier_id = v_caller_uid)
        )
    );

    -- Direct RPC calls require Admin, Service Role, or the exact lien-holding Verified Financier
    IF pg_trigger_depth() = 0 THEN
        IF NOT v_is_service_or_admin AND NOT v_is_lien_holder THEN
            RAISE EXCEPTION 'Security Policy Violation: Only the lien-holding Institutional Financier, Platform Admin, or Verified Settlement Engine can release warehouse collateral liens.';
        END IF;
    ELSE
        IF v_loan.id IS NULL OR v_loan.status NOT IN ('repaid', 'settled', 'rejected', 'cancelled') THEN
            RAISE EXCEPTION 'Security Policy Violation: Cannot release warehouse collateral while loan status is %.', COALESCE(v_loan.status, 'unknown');
        END IF;

        IF v_loan.status IN ('repaid', 'settled') AND NOT v_is_service_or_admin AND NOT v_is_lien_holder THEN
            RAISE EXCEPTION 'Security Policy Violation: Loan repayment clearance requires verified settlement authorization.';
        END IF;
    END IF;

    IF v_receipt.lien_status = 'unencumbered' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_released', true,
            'receipt_id', v_receipt.id,
            'receipt_number', v_receipt.receipt_number,
            'lien_status', 'unencumbered',
            'available_quantity', v_receipt.available_quantity
        );
    END IF;

    UPDATE public.warehouse_receipts SET
        lien_status = 'unencumbered',
        lien_released_at = v_now,
        locked_quantity = 0,
        available_quantity = CASE WHEN status = 'released' THEN 0 ELSE v_receipt.total_quantity END,
        updated_at = v_now
    WHERE id = v_receipt.id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt.id,
        'receipt_number', v_receipt.receipt_number,
        'lien_status', 'unencumbered',
        'available_quantity', CASE WHEN v_receipt.status = 'released' THEN 0 ELSE v_receipt.total_quantity END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_warehouse_receipt_lien_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_warehouse_receipt_lien_atomic(TEXT, TEXT) TO authenticated, service_role;

-- 3. Harden handle_financing_lien_sync search_path
CREATE OR REPLACE FUNCTION public.handle_financing_lien_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_target_receipt_id TEXT;
BEGIN
    v_target_receipt_id := COALESCE(NULLIF(NEW.receipt_id, ''), NULLIF(NEW.receipt_number, ''));

    IF v_target_receipt_id IS NOT NULL THEN
        IF NEW.status IN ('offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured') THEN
            PERFORM public.lock_warehouse_receipt_for_loan_atomic(
                NEW.id,
                v_target_receipt_id,
                NEW.financier_id,
                NEW.financier_name,
                NEW.request_number
            );
        ELSIF NEW.status IN ('repaid', 'settled', 'rejected', 'cancelled') THEN
            PERFORM public.release_warehouse_receipt_lien_atomic(
                NEW.id,
                v_target_receipt_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_financing_receipt_lien ON public.financing_requests;
CREATE TRIGGER trg_sync_financing_receipt_lien
    AFTER INSERT OR UPDATE OF status, receipt_id, receipt_number, financier_id ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_financing_lien_sync();

-- 4. Harden warehouse_receipts UPDATE & DELETE guards
CREATE OR REPLACE FUNCTION public.guard_pledged_receipt_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_is_privileged BOOLEAN := FALSE;
    v_is_lien_holder BOOLEAN := FALSE;
BEGIN
    v_is_privileged := (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
        OR pg_trigger_depth() > 0
    );

    IF v_is_privileged THEN
        RETURN NEW;
    END IF;

    v_is_lien_holder := (
        public.is_verified_financier()
        AND OLD.lien_holder_id IS NOT NULL
        AND OLD.lien_holder_id = auth.uid()::text
    );

    IF OLD.lien_status = 'pledged' THEN
        IF (NEW.lien_status IS DISTINCT FROM OLD.lien_status) OR
           (NEW.lien_holder_id IS DISTINCT FROM OLD.lien_holder_id) OR
           (NEW.lien_holder_name IS DISTINCT FROM OLD.lien_holder_name) OR
           (NEW.lien_loan_id IS DISTINCT FROM OLD.lien_loan_id) OR
           (NEW.lien_loan_number IS DISTINCT FROM OLD.lien_loan_number) OR
           (NEW.pledged_at IS DISTINCT FROM OLD.pledged_at) OR
           (NEW.lien_released_at IS DISTINCT FROM OLD.lien_released_at) THEN
            IF NOT v_is_lien_holder THEN
                RAISE EXCEPTION 'Security Policy Violation: Direct modification of active institutional collateral lien fields on warehouse receipt % is forbidden.',
                    OLD.receipt_number;
            END IF;
        END IF;

        IF NEW.status IN ('listed', 'partially_listed', 'released')
           OR COALESCE(NEW.available_quantity, 0) > 0
           OR COALESCE(NEW.locked_quantity, 0) < COALESCE(OLD.locked_quantity, 0)
           OR COALESCE(NEW.total_quantity, 0) < COALESCE(OLD.total_quantity, 0) THEN
            RAISE EXCEPTION 'Cannot list, sell, or dispatch produce: Warehouse receipt % has an active institutional lien held by % under loan %. Please settle the loan to release collateral.',
                OLD.receipt_number,
                COALESCE(OLD.lien_holder_name, 'Financier'),
                COALESCE(OLD.lien_loan_number, 'Active Loan');
        END IF;
    ELSE
        IF (NEW.lien_status IS DISTINCT FROM OLD.lien_status) OR
           (NEW.lien_holder_id IS DISTINCT FROM OLD.lien_holder_id) OR
           (NEW.lien_holder_name IS DISTINCT FROM OLD.lien_holder_name) OR
           (NEW.lien_loan_id IS DISTINCT FROM OLD.lien_loan_id) OR
           (NEW.lien_loan_number IS DISTINCT FROM OLD.lien_loan_number) THEN
            RAISE EXCEPTION 'Security Policy Violation: Direct modification of institutional lien metadata on warehouse receipt % is forbidden.',
                OLD.receipt_number;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pledged_receipt_trade ON public.warehouse_receipts;
CREATE TRIGGER trg_guard_pledged_receipt_trade
    BEFORE UPDATE ON public.warehouse_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_pledged_receipt_trade();

CREATE OR REPLACE FUNCTION public.guard_pledged_receipt_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF OLD.lien_status = 'pledged' AND NOT (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot delete pledged warehouse receipt % while an institutional lien is active.',
            OLD.receipt_number;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pledged_receipt_delete ON public.warehouse_receipts;
CREATE TRIGGER trg_guard_pledged_receipt_delete
    BEFORE DELETE ON public.warehouse_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_pledged_receipt_delete();

-- 5. Block Marketplace Listing Creation Referencing Pledged e-NWR Collateral
CREATE OR REPLACE FUNCTION public.guard_listing_from_pledged_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_pledged_receipt RECORD;
BEGIN
    IF NEW.origin_receipt_number IS NOT NULL AND NEW.origin_receipt_number <> '' THEN
        SELECT receipt_number, lien_holder_name, lien_loan_number INTO v_pledged_receipt
        FROM public.warehouse_receipts
        WHERE (receipt_number = NEW.origin_receipt_number OR id = NEW.origin_receipt_number)
          AND lien_status = 'pledged'
        LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Cannot create marketplace listing: Warehouse receipt % has an active institutional lien held by % under loan %.',
                v_pledged_receipt.receipt_number,
                COALESCE(v_pledged_receipt.lien_holder_name, 'Financier'),
                COALESCE(v_pledged_receipt.lien_loan_number, 'Active Loan');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_listing_from_pledged_receipt ON public.listings;
CREATE TRIGGER trg_guard_listing_from_pledged_receipt
    BEFORE INSERT OR UPDATE OF origin_receipt_number ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_listing_from_pledged_receipt();

-- 6. Harden financing_requests against borrower self-repayment or post-pledge cancellation bypasses
CREATE OR REPLACE FUNCTION public.protect_financing_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_verified_financier() OR public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF (NEW.status IS DISTINCT FROM OLD.status) THEN
        IF NEW.status IN ('approved', 'disbursed', 'escrow_secured', 'repaid', 'settled') THEN
            RAISE EXCEPTION 'Security Policy Violation: Borrowers are not permitted to set loan status to % directly.', NEW.status;
        END IF;

        IF OLD.status IN ('borrower_accepted', 'approved', 'disbursed', 'escrow_secured', 'repaid', 'settled') THEN
            RAISE EXCEPTION 'Security Policy Violation: Cannot modify active/locked financing request from status % to %.', OLD.status, NEW.status;
        END IF;

        IF NOT (
            (OLD.status = 'offer_received' AND NEW.status = 'borrower_accepted') OR
            (OLD.status IN ('pending', 'under_review', 'offer_received') AND NEW.status IN ('rejected', 'cancelled'))
        ) THEN
            RAISE EXCEPTION 'Security Policy Violation: Unauthorized borrower financing status transition from % to %.', OLD.status, NEW.status;
        END IF;
    END IF;

    IF (NEW.approved_amount IS DISTINCT FROM OLD.approved_amount) OR
       (NEW.offered_amount IS DISTINCT FROM OLD.offered_amount) OR
       (NEW.interest_rate IS DISTINCT FROM OLD.interest_rate) OR
       (NEW.tenor_days IS DISTINCT FROM OLD.tenor_days) OR
       (NEW.disbursed_at IS DISTINCT FROM OLD.disbursed_at) OR
       (NEW.bank_utr IS DISTINCT FROM OLD.bank_utr) OR
       (NEW.financier_id IS DISTINCT FROM OLD.financier_id) OR
       (NEW.financier_name IS DISTINCT FROM OLD.financier_name) OR
       (NEW.financier_email IS DISTINCT FROM OLD.financier_email) OR
       (NEW.receipt_id IS DISTINCT FROM OLD.receipt_id) OR
       (NEW.receipt_number IS DISTINCT FROM OLD.receipt_number) OR
       (NEW.order_id IS DISTINCT FROM OLD.order_id) OR
       (NEW.order_number IS DISTINCT FROM OLD.order_number) OR
       (NEW.applicant_id IS DISTINCT FROM OLD.applicant_id) OR
       (NEW.repaid_at IS DISTINCT FROM OLD.repaid_at) OR
       (NEW.repayment_method IS DISTINCT FROM OLD.repayment_method) OR
       (NEW.repayment_transaction_id IS DISTINCT FROM OLD.repayment_transaction_id) OR
       (NEW.repayment_amount IS DISTINCT FROM OLD.repayment_amount) OR
       (NEW.repayment_principal IS DISTINCT FROM OLD.repayment_principal) OR
       (NEW.repayment_interest IS DISTINCT FROM OLD.repayment_interest) OR
       (NEW.repayment_notes IS DISTINCT FROM OLD.repayment_notes) THEN
        RAISE EXCEPTION 'Security Policy: Borrowers are not permitted to modify underwriting terms, collateral links, or settlement fields.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_financing_approval_fields ON public.financing_requests;
CREATE TRIGGER trg_protect_financing_approval_fields
    BEFORE UPDATE ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_financing_approval_fields();

CREATE OR REPLACE FUNCTION public.protect_financing_insert_and_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_verified_financier() OR public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.status, 'pending') <> 'pending' THEN
            RAISE EXCEPTION 'Security Policy Violation: New financing requests must start in pending status.';
        END IF;
        IF NEW.approved_amount IS NOT NULL AND NEW.approved_amount IS DISTINCT FROM NEW.requested_amount THEN
            RAISE EXCEPTION 'Security Policy Violation: Borrowers cannot pre-set approved_amount.';
        END IF;
        IF NEW.financier_id IS NOT NULL OR NEW.disbursed_at IS NOT NULL OR NEW.repaid_at IS NOT NULL THEN
            RAISE EXCEPTION 'Security Policy Violation: Borrowers cannot pre-populate institutional disbursement or repayment fields.';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured') THEN
            RAISE EXCEPTION 'Security Policy Violation: Cannot delete an active or collateral-locked financing record.';
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_financing_insert_and_delete ON public.financing_requests;
CREATE TRIGGER trg_protect_financing_insert_and_delete
    BEFORE INSERT OR DELETE ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_financing_insert_and_delete();
-- >>> END supabase/fix_pledged_collateral_unlock_bypass.sql <<<

-- >>> BEGIN supabase/secure_delivery_verification_rpc.sql <<<
-- ============================================================================
-- AGROWLINK SECURITY FIX: SECURE DELIVERY VERIFICATION & TRANSPORTER BINDING
-- File: supabase/secure_delivery_verification_rpc.sql
-- Description:
--   1. Adds brute-force lockout protection to delivery PIN vault.
--   2. Binds verify_transporter_delivery_dropoff_atomic() strictly to auth.uid().
--      - Transporter ID is derived from authenticated session, never trusted from client.
--      - Consignment must be assigned to the caller before verification can occur.
--      - 5 invalid attempts trigger a 15-minute security lockout.
--   3. Restricts delivery table RLS:
--      - Only verified transporters can view transport-requested consignments.
--      - Only verified transporters can claim unassigned deliveries.
--   4. Hardens all functions with controlled search_path and revokes public execution.
-- ============================================================================

-- 1. Add Attempt Counter and Lockout Columns to delivery_pins vault
ALTER TABLE IF EXISTS public.delivery_pins 
    ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;

ALTER TABLE IF EXISTS public.delivery_pins 
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;

-- 2. Hardened Atomic Delivery Drop-off Verification Function
CREATE OR REPLACE FUNCTION public.verify_transporter_delivery_dropoff_atomic(
    p_delivery_id TEXT,
    p_input_otp TEXT,
    p_transporter_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_delivery RECORD;
    v_pin RECORD;
    v_caller_id TEXT := auth.uid()::TEXT;
    v_now TIMESTAMPTZ := NOW();
    v_remaining_attempts INT;
BEGIN
    -- 0. Authentication Check: Caller MUST have a valid Supabase authenticated session
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You must be signed in to verify delivery drop-off.';
    END IF;

    -- 1. Fetch and lock delivery record
    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery consignment % not found.', p_delivery_id;
    END IF;

    -- 2. Check if already delivered
    IF v_delivery.status = 'delivered' OR v_delivery.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_delivered', true,
            'delivery_id', v_delivery.id,
            'delivery_number', v_delivery.delivery_number,
            'status', v_delivery.status
        );
    END IF;

    -- 3. Strict Consignment Assignment & State Validation
    IF v_delivery.transporter_id IS NULL THEN
        RAISE EXCEPTION 'Consignment is not assigned to any transporter. Handover PIN cannot be verified.';
    END IF;

    -- Caller MUST be the assigned transporter bound to auth.uid() OR an administrator
    IF v_caller_id <> v_delivery.transporter_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: You are not the assigned carrier for this consignment.';
    END IF;

    -- 4. Fetch the secret delivery PIN from private vault with lock
    SELECT * INTO v_pin
    FROM public.delivery_pins
    WHERE delivery_id = v_delivery.id
    FOR UPDATE;

    IF NOT FOUND OR v_pin.delivery_otp IS NULL THEN
        RAISE EXCEPTION 'Security PIN record not initialized for this delivery.';
    END IF;

    -- 5. Brute-Force Rate Limiting & Lockout Check
    IF v_pin.locked_until IS NOT NULL AND v_pin.locked_until > v_now THEN
        RAISE EXCEPTION 'Security Lockout: Too many invalid PIN attempts. Delivery PIN locked until % UTC.', 
            to_char(v_pin.locked_until, 'HH24:MI:SS');
    END IF;

    -- 6. Strict PIN Comparison with Lockout Enforcement
    IF TRIM(v_pin.delivery_otp) <> TRIM(p_input_otp) THEN
        -- Increment failed attempts
        UPDATE public.delivery_pins SET
            failed_attempts = COALESCE(failed_attempts, 0) + 1,
            locked_until = CASE 
                WHEN COALESCE(failed_attempts, 0) + 1 >= 5 THEN v_now + INTERVAL '15 minutes' 
                ELSE NULL 
            END,
            updated_at = v_now
        WHERE delivery_id = v_delivery.id;

        v_remaining_attempts := 5 - (COALESCE(v_pin.failed_attempts, 0) + 1);

        IF v_remaining_attempts <= 0 THEN
            RAISE EXCEPTION 'Security Lockout: 5 invalid PIN attempts. Delivery PIN locked for 15 minutes.';
        ELSE
            RAISE EXCEPTION 'Invalid Delivery PIN. % attempts remaining before temporary lockout.', v_remaining_attempts;
        END IF;
    END IF;

    -- Reset failed attempts on successful verification
    UPDATE public.delivery_pins SET 
        failed_attempts = 0, 
        locked_until = NULL,
        updated_at = v_now
    WHERE delivery_id = v_delivery.id;

    -- 7. Atomically transition delivery status to 'delivered'
    UPDATE public.deliveries SET
        status = 'delivered',
        updated_at = v_now
    WHERE id = v_delivery.id;

    -- 8. Synchronize linked order to 'delivered' (escrow securely held until Admin Call Verification)
    IF v_delivery.order_id IS NOT NULL OR v_delivery.order_number IS NOT NULL THEN
        UPDATE public.orders SET
            status = 'delivered',
            admin_verification_status = 'pending',
            updated_at = v_now
        WHERE (id = v_delivery.order_id OR order_number = v_delivery.order_number);
    END IF;

    -- 9. Send notifications to buyer and farmer
    IF v_delivery.buyer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
            v_delivery.buyer_id,
            'buyer',
            'Consignment Delivered (' || v_delivery.delivery_number || ')',
            'Transporter has verified the delivery PIN and marked consignment as delivered. Please confirm produce condition.',
            'delivery',
            '/buyer-deliveries',
            false,
            v_now
        );
    END IF;

    IF v_delivery.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
            v_delivery.farmer_id,
            'farmer',
            'Delivery Drop-off Confirmed (' || v_delivery.delivery_number || ')',
            'Your produce consignment has been delivered to the buyer. Awaiting administrative settlement call.',
            'delivery',
            '/farmer-deliveries',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Delivery PIN verified. Consignment marked as delivered.',
        'delivery_id', v_delivery.id,
        'delivery_number', v_delivery.delivery_number,
        'status', 'delivered'
    );
END;
$$;

-- Revoke default public execution rights
REVOKE EXECUTE ON FUNCTION public.verify_transporter_delivery_dropoff_atomic(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_transporter_delivery_dropoff_atomic(TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 3. Hardened PIN Retrieval Function
CREATE OR REPLACE FUNCTION public.get_delivery_secret_pins(
    p_delivery_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_delivery RECORD;
    v_pin RECORD;
    v_caller TEXT := auth.uid()::TEXT;
    v_is_admin BOOLEAN := public.is_admin();
    v_is_buyer BOOLEAN := false;
    v_is_farmer BOOLEAN := false;
BEGIN
    IF v_caller IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_pin
    FROM public.delivery_pins
    WHERE delivery_id = v_delivery.id;

    v_is_buyer := (v_caller = v_delivery.buyer_id OR (v_pin IS NOT NULL AND v_caller = v_pin.buyer_id));
    v_is_farmer := (v_caller = v_delivery.farmer_id OR (v_pin IS NOT NULL AND v_caller = v_pin.farmer_id));

    IF v_pin IS NULL THEN
        RETURN jsonb_build_object(
            'delivery_id', v_delivery.id,
            'delivery_otp', NULL,
            'pickup_otp', NULL
        );
    END IF;

    -- Transporters will receive NULL for both OTPs!
    RETURN jsonb_build_object(
        'delivery_id', v_delivery.id,
        'delivery_otp', CASE WHEN (v_is_buyer OR v_is_admin) THEN v_pin.delivery_otp ELSE NULL END,
        'pickup_otp', CASE WHEN (v_is_farmer OR v_is_admin) THEN v_pin.pickup_otp ELSE NULL END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_delivery_secret_pins(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_secret_pins(TEXT) TO authenticated, service_role;

-- 4. Tighten Delivery RLS Policies on public.deliveries (Fixes High #6)
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_select_policy" ON public.deliveries;
DROP POLICY IF EXISTS "Allow public read deliveries" ON public.deliveries;

CREATE POLICY "deliveries_select_policy" ON public.deliveries
    FOR SELECT USING (
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = transporter_id OR
        -- Transport requests visible ONLY to verified transporters or admin
        (status = 'transport_requested' AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'transporter' OR
            public.is_admin()
        )) OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "deliveries_update_policy" ON public.deliveries;
DROP POLICY IF EXISTS "Allow public write deliveries" ON public.deliveries;

CREATE POLICY "deliveries_update_policy" ON public.deliveries
    FOR UPDATE USING (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        -- Claiming an unassigned consignment restricted strictly to verified transporters
        (transporter_id IS NULL AND status = 'transport_requested' AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            public.is_admin()
        )) OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        -- When claiming, transporter_id must match authenticated caller
        (transporter_id = auth.uid()::text AND status IN ('assigned', 'transport_requested')) OR
        public.is_admin()
    );
-- >>> END supabase/secure_delivery_verification_rpc.sql <<<

-- >>> BEGIN supabase/secure_escrow_release_rpc.sql <<<
-- ============================================================================
-- AGROWLINK SECURITY FIX: SECURE ESCROW RELEASE & FINANCIAL STORED PROCEDURES
-- File: supabase/secure_escrow_release_rpc.sql
-- Description:
--   1. Enforces strict Administrator authentication inside release_escrow_atomic().
--   2. Rejects any non-admin or unauthenticated callers.
--   3. Hardens search_path to prevent object resolution hijacking.
--   4. Revokes public/anon execution rights, granting execute only to authenticated.
--   5. Secures freeze_order_on_dispute_atomic() to only buyer or admin.
-- ============================================================================

-- 1. Secure & Hardened Escrow Release Stored Procedure
CREATE OR REPLACE FUNCTION public.release_escrow_atomic(
    p_order_id TEXT,
    p_admin_name TEXT DEFAULT 'AgrowLink Operations Ombudsman',
    p_admin_notes TEXT DEFAULT 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.',
    p_bank_name TEXT DEFAULT NULL,
    p_account_number TEXT DEFAULT NULL,
    p_ifsc TEXT DEFAULT NULL,
    p_utr TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_utr TEXT;
    v_caller_id TEXT := auth.uid()::TEXT;
BEGIN
    -- 0. CRITICAL AUTHORIZATION CHECK: Caller MUST be a verified platform administrator
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    IF NOT (public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Forbidden: Only authorized platform administrators can execute escrow releases.';
    END IF;

    -- 1. Acquire exclusive lock on target order row (eliminates race conditions)
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    -- 2. Prevent double release (idempotency check)
    IF v_order.escrow_status = 'released' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Escrow was already released previously.',
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'bank_utr', v_order.bank_utr,
            'escrow_status', 'released'
        );
    END IF;

    -- 3. Verify order is in a releasable escrow state
    IF v_order.escrow_status NOT IN ('funded', 'escrow_secured', 'held') THEN
        RAISE EXCEPTION 'Cannot release escrow in current state: %', v_order.escrow_status;
    END IF;

    -- Set bank UTR if supplied by gateway/admin (treat blank/whitespace as NULL until bank settlement confirms)
    v_utr := COALESCE(NULLIF(TRIM(p_utr), ''), NULLIF(TRIM(v_order.bank_utr), ''));

    -- 4. Update Order atomically
    UPDATE public.orders SET
        status = 'completed',
        escrow_status = 'released',
        admin_verified_by = COALESCE(NULLIF(TRIM(p_admin_name), ''), 'AgrowLink Operations Ombudsman'),
        admin_verification_status = 'approved',
        admin_call_notes = COALESCE(NULLIF(TRIM(p_admin_notes), ''), 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.'),
        admin_verified_at = v_now,
        payout_bank_name = COALESCE(NULLIF(TRIM(p_bank_name), ''), NULLIF(TRIM(v_order.payout_bank_name), ''), 'Bank Account'),
        payout_account_number = COALESCE(NULLIF(TRIM(p_account_number), ''), NULLIF(TRIM(v_order.payout_account_number), ''), '—'),
        payout_ifsc = COALESCE(NULLIF(TRIM(p_ifsc), ''), NULLIF(TRIM(v_order.payout_ifsc), ''), '—'),
        bank_utr = v_utr,
        disbursed_at = v_now,
        updated_at = v_now
    WHERE id = v_order.id;

    -- 5. Atomically update linked delivery status
    UPDATE public.deliveries SET
        status = 'completed',
        updated_at = v_now
    WHERE order_id = v_order.id OR order_number = v_order.order_number;

    -- 6. Notify farmer of bank disbursement (NULL-safe when bank_utr is not yet available)
    IF v_order.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_order.farmer_id,
            'farmer',
            CASE
                WHEN v_utr IS NOT NULL THEN 'Payment Disbursed (UTR ' || v_utr || ')'
                ELSE 'Payment Disbursed (Bank Settlement Pending UTR)'
            END,
            'Escrow payout of ₹' || COALESCE(v_order.total_amount::TEXT, '0') || ' for ' || COALESCE(NULLIF(TRIM(v_order.commodity), ''), 'Produce') || ' (' || COALESCE(NULLIF(TRIM(v_order.order_number), ''), v_order.id) || ') has been disbursed to your bank account.',
            'escrow',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    -- 7. Notify buyer of completed transaction
    IF v_order.buyer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_order.buyer_id,
            'buyer',
            'Trade Completed (' || COALESCE(NULLIF(TRIM(v_order.order_number), ''), v_order.id) || ')',
            'Escrow settlement finalized for your ' || COALESCE(NULLIF(TRIM(v_order.commodity), ''), 'Produce') || ' order. Receipt has been generated.',
            'order',
            '/buyer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Escrow successfully disbursed to farmer bank account.',
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'bank_utr', v_utr,
        'escrow_status', 'released',
        'status', 'completed'
    );
END;
$$;

-- Revoke default public execution rights & restrict strictly
REVOKE EXECUTE ON FUNCTION public.release_escrow_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_escrow_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 2. Secure Dispute Freeze Function (Only buyer of the order, admin, or service_role can freeze active funded escrow)
CREATE OR REPLACE FUNCTION public.freeze_order_on_dispute_atomic(
    p_order_id TEXT,
    p_dispute_reason TEXT DEFAULT 'Quality / moisture grade discrepancy reported by buyer'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := false;
    v_escrow_status TEXT;
    v_order_status TEXT;
BEGIN
    v_is_privileged := public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role';

    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    -- Caller must be the purchasing buyer, platform admin, or service_role
    IF NOT v_is_privileged AND v_caller_id IS DISTINCT FROM v_order.buyer_id THEN
        RAISE EXCEPTION 'Forbidden: Only the purchasing buyer or platform administrator can initiate an escrow freeze.';
    END IF;

    v_escrow_status := COALESCE(NULLIF(trim(v_order.escrow_status), ''), 'pending');
    v_order_status := COALESCE(NULLIF(trim(v_order.status), ''), 'pending');

    -- Block reopening settled, refunded, completed, or cancelled orders
    IF v_escrow_status IN ('released', 'refunded', 'settled')
       OR v_order_status IN ('completed', 'cancelled', 'refunded') THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot freeze order % because settlement is already closed (escrow_status: %, status: %).',
            v_order.order_number, v_escrow_status, v_order_status;
    END IF;

    -- Idempotency: already frozen in dispute
    IF v_escrow_status IN ('held', 'disputed') AND v_order_status = 'disputed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_disputed', true,
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'escrow_status', v_escrow_status,
            'status', 'disputed'
        );
    END IF;

    -- Require actively funded / secured escrow before allowing dispute freeze
    IF v_escrow_status NOT IN ('funded', 'escrow_secured', 'held')
       OR v_order_status IN ('pending', 'awaiting_freight_quote', 'freight_quoted') THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot freeze unpaid or unfunded order % (escrow_status: %, status: %). Only funded escrow orders can be placed on dispute hold.',
            v_order.order_number, v_escrow_status, v_order_status;
    END IF;

    -- Authorize trigger passage strictly after caller + escrow state checks succeed
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    -- Freeze escrow and mark dispute
    UPDATE public.orders SET
        escrow_status = 'held',
        status = 'disputed',
        admin_call_notes = 'DISPUTE ACTIVE: ' || COALESCE(NULLIF(trim(p_dispute_reason), ''), 'Quality / moisture grade discrepancy reported by buyer'),
        updated_at = v_now
    WHERE id = v_order.id;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'escrow_status', 'held',
        'status', 'disputed'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.freeze_order_on_dispute_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.freeze_order_on_dispute_atomic(TEXT, TEXT) TO authenticated, service_role;
-- >>> END supabase/secure_escrow_release_rpc.sql <<<

-- >>> BEGIN supabase/fix_dispute_freeze_state_guard.sql <<<
-- ============================================================================
-- AGROWLINK SECURITY FIX: PREVENT FREEZING UNPAID OR ALREADY-SETTLED ORDERS
-- File: supabase/fix_dispute_freeze_state_guard.sql
-- Purpose:
--   Hardens public.freeze_order_on_dispute_atomic() so neither buyers nor admins
--   can freeze unpaid/pending orders or reopen already-settled/refunded orders.
-- Run this script in your Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.freeze_order_on_dispute_atomic(
    p_order_id TEXT,
    p_dispute_reason TEXT DEFAULT 'Quality / moisture grade discrepancy reported by buyer'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := false;
    v_escrow_status TEXT;
    v_order_status TEXT;
BEGIN
    v_is_privileged := public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role';

    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    IF NOT v_is_privileged AND v_caller_id IS DISTINCT FROM v_order.buyer_id THEN
        RAISE EXCEPTION 'Forbidden: Only the purchasing buyer or platform administrator can initiate an escrow freeze.';
    END IF;

    v_escrow_status := COALESCE(NULLIF(trim(v_order.escrow_status), ''), 'pending');
    v_order_status := COALESCE(NULLIF(trim(v_order.status), ''), 'pending');

    IF v_escrow_status IN ('released', 'refunded', 'settled')
       OR v_order_status IN ('completed', 'cancelled', 'refunded') THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot freeze order % because settlement is already closed (escrow_status: %, status: %).',
            v_order.order_number, v_escrow_status, v_order_status;
    END IF;

    IF v_escrow_status IN ('held', 'disputed') AND v_order_status = 'disputed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_disputed', true,
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'escrow_status', v_escrow_status,
            'status', 'disputed'
        );
    END IF;

    IF v_escrow_status NOT IN ('funded', 'escrow_secured', 'held')
       OR v_order_status IN ('pending', 'awaiting_freight_quote', 'freight_quoted') THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot freeze unpaid or unfunded order % (escrow_status: %, status: %). Only funded escrow orders can be placed on dispute hold.',
            v_order.order_number, v_escrow_status, v_order_status;
    END IF;

    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    UPDATE public.orders SET
        escrow_status = 'held',
        status = 'disputed',
        admin_call_notes = 'DISPUTE ACTIVE: ' || COALESCE(NULLIF(trim(p_dispute_reason), ''), 'Quality / moisture grade discrepancy reported by buyer'),
        updated_at = v_now
    WHERE id = v_order.id;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'escrow_status', 'held',
        'status', 'disputed'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.freeze_order_on_dispute_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.freeze_order_on_dispute_atomic(TEXT, TEXT) TO authenticated, service_role;
-- >>> END supabase/fix_dispute_freeze_state_guard.sql <<<

-- >>> BEGIN supabase/production_rls_policies.sql <<<
-- ============================================================================
-- AGROWLINK PRODUCTION ROW-LEVEL SECURITY (RLS) POLICIES & ROLE ISOLATION
-- Run this script in your Supabase SQL Editor to enforce strict tenant isolation,
-- role boundaries, and privacy protection across all platform domains.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. HELPER FUNCTIONS FOR ROLE & ADMIN VERIFICATION
-- ----------------------------------------------------------------------------

-- Helper to check if the executing user has admin ombudsman role
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
-- 1. PROFILES TABLE RLS & ANTI-TAMPERING TRIGGERS
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles 
  ALTER COLUMN kyc_status SET DEFAULT 'pending';

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Anti-tampering trigger: strictly blocks users from altering their role or self-verifying KYC
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Security Policy Violation: You cannot alter your account role. Role escalation is forbidden.';
    END IF;

    IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
        IF NEW.kyc_status = 'verified' THEN
            RAISE EXCEPTION 'Security Policy Violation: Self-approval of KYC verification is strictly forbidden.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- Registration trigger: blocks self-registration as admin & forces initial kyc_status = 'pending'
CREATE OR REPLACE FUNCTION public.protect_profile_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF LOWER(COALESCE(NEW.role, '')) = 'admin' THEN
        IF NOT (public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role') THEN
            RAISE EXCEPTION 'Security Policy Violation: Self-registration as platform administrator is strictly prohibited.';
        END IF;
    END IF;

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

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid()::text = id OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            auth.uid()::text = id AND
            COALESCE(LOWER(role), '') <> 'admin'
        ) OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid()::text = id OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = id OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 2. ORDERS TABLE RLS & FINANCIAL FIELD PROTECTION
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS farmer_email TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS farmer_phone TEXT;

DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_read_policy" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public write orders" ON public.orders;

CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT USING (
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        (farmer_email IS NOT NULL AND auth.jwt() ->> 'email' = farmer_email) OR
        public.is_admin() OR
        public.is_verified_financier()
    );

DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT WITH CHECK (
        (auth.uid()::text = buyer_id AND (farmer_id IS NULL OR buyer_id <> farmer_id)) OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE USING (
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        (farmer_email IS NOT NULL AND auth.jwt() ->> 'email' = farmer_email) OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        (farmer_email IS NOT NULL AND auth.jwt() ->> 'email' = farmer_email) OR
        public.is_admin()
    );

-- Anti-tampering trigger: Prevents non-admin users from altering price, escrow, or payout fields directly
CREATE OR REPLACE FUNCTION public.protect_order_financial_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Permit all modifications by Admin, Supabase Service Role, or trusted RPC stored procedures
    IF public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Block direct client manipulation of sensitive financial & escrow columns
    IF (NEW.total_amount IS DISTINCT FROM OLD.total_amount) OR
       (NEW.price_per_unit IS DISTINCT FROM OLD.price_per_unit) OR
       (NEW.escrow_status IS DISTINCT FROM OLD.escrow_status AND NEW.escrow_status IN ('released', 'disbursed')) THEN
        RAISE EXCEPTION 'Security Policy: Direct client modification of protected financial & escrow fields is forbidden.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_order_financial_fields ON public.orders;
CREATE TRIGGER trg_protect_order_financial_fields
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_order_financial_fields();

-- ----------------------------------------------------------------------------
-- 3. DELIVERIES TABLE RLS (With Transporter & OTP Boundary)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_select_policy" ON public.deliveries;
DROP POLICY IF EXISTS "Allow public read deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Allow public write deliveries" ON public.deliveries;

CREATE POLICY "deliveries_select_policy" ON public.deliveries
    FOR SELECT USING (
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = transporter_id OR
        (status = 'transport_requested' AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'transporter' OR
            public.is_admin()
        )) OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "deliveries_insert_policy" ON public.deliveries;
CREATE POLICY "deliveries_insert_policy" ON public.deliveries
    FOR INSERT WITH CHECK (
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "deliveries_update_policy" ON public.deliveries;
CREATE POLICY "deliveries_update_policy" ON public.deliveries
    FOR UPDATE USING (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        (transporter_id IS NULL AND status = 'transport_requested' AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            public.is_admin()
        )) OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        (transporter_id = auth.uid()::text AND status IN ('assigned', 'transport_requested')) OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 4. FINANCING REQUESTS TABLE RLS & SELF-APPROVAL PREVENTION
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

-- Split Update Policies: Financiers have full underwriting authority; Borrowers can only submit acceptance/notes
DROP POLICY IF EXISTS "financing_financier_update_policy" ON public.financing_requests;
CREATE POLICY "financing_financier_update_policy" ON public.financing_requests
    FOR UPDATE USING (
        public.is_verified_financier() OR
        auth.uid()::text = financier_id OR
        public.is_admin()
    ) WITH CHECK (
        public.is_verified_financier() OR
        auth.uid()::text = financier_id OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "financing_borrower_update_policy" ON public.financing_requests;
CREATE POLICY "financing_borrower_update_policy" ON public.financing_requests
    FOR UPDATE USING (
        auth.uid()::text = applicant_id
    ) WITH CHECK (
        auth.uid()::text = applicant_id
    );

-- Anti-self-approval & anti-collateral-unlock trigger: Strictly blocks borrowers from self-approving, self-marking loans repaid, or cancelling pledged loans
CREATE OR REPLACE FUNCTION public.protect_financing_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Permit all underwriting & verified settlement actions by Verified Financier, Admin, Service Role, or trusted nested RPC routines
    IF public.is_verified_financier() OR public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- 1. Borrowers can NEVER self-approve, disburse, secure escrow, or self-mark a loan as repaid/settled
    IF (NEW.status IS DISTINCT FROM OLD.status) THEN
        IF NEW.status IN ('approved', 'disbursed', 'escrow_secured', 'repaid', 'settled') THEN
            RAISE EXCEPTION 'Security Policy Violation: Borrowers are not permitted to set loan status to % directly.', NEW.status;
        END IF;

        -- Once terms are accepted, approved, or disbursed (and collateral is pledged), borrowers cannot cancel/reject/revert status
        IF OLD.status IN ('borrower_accepted', 'approved', 'disbursed', 'escrow_secured', 'repaid', 'settled') THEN
            RAISE EXCEPTION 'Security Policy Violation: Cannot modify active/locked financing request from status % to %.', OLD.status, NEW.status;
        END IF;

        -- Before acceptance/approval, borrowers may only decline/cancel pending/offered requests or accept a received offer
        IF NOT (
            (OLD.status = 'offer_received' AND NEW.status = 'borrower_accepted') OR
            (OLD.status IN ('pending', 'under_review', 'offer_received') AND NEW.status IN ('rejected', 'cancelled'))
        ) THEN
            RAISE EXCEPTION 'Security Policy Violation: Unauthorized borrower financing status transition from % to %.', OLD.status, NEW.status;
        END IF;
    END IF;

    -- 2. Block borrowers from altering underwriting terms, lender binding, collateral linkage, or repayment fields
    IF (NEW.approved_amount IS DISTINCT FROM OLD.approved_amount) OR
       (NEW.offered_amount IS DISTINCT FROM OLD.offered_amount) OR
       (NEW.interest_rate IS DISTINCT FROM OLD.interest_rate) OR
       (NEW.tenor_days IS DISTINCT FROM OLD.tenor_days) OR
       (NEW.disbursed_at IS DISTINCT FROM OLD.disbursed_at) OR
       (NEW.bank_utr IS DISTINCT FROM OLD.bank_utr) OR
       (NEW.financier_id IS DISTINCT FROM OLD.financier_id) OR
       (NEW.financier_name IS DISTINCT FROM OLD.financier_name) OR
       (NEW.financier_email IS DISTINCT FROM OLD.financier_email) OR
       (NEW.receipt_id IS DISTINCT FROM OLD.receipt_id) OR
       (NEW.receipt_number IS DISTINCT FROM OLD.receipt_number) OR
       (NEW.order_id IS DISTINCT FROM OLD.order_id) OR
       (NEW.order_number IS DISTINCT FROM OLD.order_number) OR
       (NEW.applicant_id IS DISTINCT FROM OLD.applicant_id) OR
       (NEW.repaid_at IS DISTINCT FROM OLD.repaid_at) OR
       (NEW.repayment_method IS DISTINCT FROM OLD.repayment_method) OR
       (NEW.repayment_transaction_id IS DISTINCT FROM OLD.repayment_transaction_id) OR
       (NEW.repayment_amount IS DISTINCT FROM OLD.repayment_amount) OR
       (NEW.repayment_principal IS DISTINCT FROM OLD.repayment_principal) OR
       (NEW.repayment_interest IS DISTINCT FROM OLD.repayment_interest) OR
       (NEW.repayment_notes IS DISTINCT FROM OLD.repayment_notes) THEN
        RAISE EXCEPTION 'Security Policy: Borrowers are not permitted to modify underwriting terms, collateral links, or settlement fields.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_financing_approval_fields ON public.financing_requests;
CREATE TRIGGER trg_protect_financing_approval_fields
    BEFORE UPDATE ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_financing_approval_fields();

-- Prevent borrowers from inserting pre-approved/repaid financing rows or deleting active/pledged loans
CREATE OR REPLACE FUNCTION public.protect_financing_insert_and_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_verified_financier() OR public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.status, 'pending') <> 'pending' THEN
            RAISE EXCEPTION 'Security Policy Violation: New financing requests must start in pending status.';
        END IF;
        IF NEW.approved_amount IS NOT NULL AND NEW.approved_amount IS DISTINCT FROM NEW.requested_amount THEN
            RAISE EXCEPTION 'Security Policy Violation: Borrowers cannot pre-set approved_amount.';
        END IF;
        IF NEW.financier_id IS NOT NULL OR NEW.disbursed_at IS NOT NULL OR NEW.repaid_at IS NOT NULL THEN
            RAISE EXCEPTION 'Security Policy Violation: Borrowers cannot pre-populate institutional disbursement or repayment fields.';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured') THEN
            RAISE EXCEPTION 'Security Policy Violation: Cannot delete an active or collateral-locked financing record.';
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_financing_insert_and_delete ON public.financing_requests;
CREATE TRIGGER trg_protect_financing_insert_and_delete
    BEFORE INSERT OR DELETE ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_financing_insert_and_delete();

-- ----------------------------------------------------------------------------
-- 5. CHAT MESSAGES TABLE RLS (Thread Privacy & Anti-Leakage)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public read chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public write chat_messages" ON public.chat_messages;

CREATE POLICY "chat_select_policy" ON public.chat_messages
    FOR SELECT USING (
        thread_key ILIKE '%' || auth.uid()::text || '%' OR
        thread_key ILIKE '%' || (auth.jwt() ->> 'email') || '%' OR
        sender_id = auth.uid()::text OR
        sender_id = (auth.jwt() ->> 'email') OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "chat_insert_policy" ON public.chat_messages;
CREATE POLICY "chat_insert_policy" ON public.chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()::text OR
        sender_id = (auth.jwt() ->> 'email') OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 6. INSPECTIONS & ASSAY REPORTS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspections_select_policy" ON public.inspections;
DROP POLICY IF EXISTS "Allow public read inspections" ON public.inspections;
DROP POLICY IF EXISTS "Allow public write inspections" ON public.inspections;

CREATE POLICY "inspections_select_policy" ON public.inspections
    FOR SELECT USING (
        auth.uid()::text = buyer_id OR
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE (o.id = inspections.order_id OR o.order_number = inspections.order_number) 
              AND (o.farmer_id = auth.uid()::text OR o.buyer_id = auth.uid()::text)
        ) OR
        EXISTS (
            SELECT 1 FROM public.listings l 
            WHERE (l.id = inspections.order_id OR l.id = inspections.order_number) 
              AND l.farmer_id = auth.uid()::text
        ) OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "inspections_insert_update_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_insert_policy" ON public.inspections;
CREATE POLICY "inspections_insert_policy" ON public.inspections
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid()::text = buyer_id OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "inspections_update_policy" ON public.inspections;
CREATE POLICY "inspections_update_policy" ON public.inspections
    FOR UPDATE TO authenticated USING (
        public.is_admin()
    ) WITH CHECK (
        public.is_admin()
    );

DROP POLICY IF EXISTS "inspections_delete_policy" ON public.inspections;
CREATE POLICY "inspections_delete_policy" ON public.inspections
    FOR DELETE TO authenticated USING (
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
DROP POLICY IF EXISTS "Allow public insert/update listings" ON public.listings;
DROP POLICY IF EXISTS "listings_read_policy" ON public.listings;
CREATE POLICY "listings_read_policy" ON public.listings FOR SELECT USING (true);

DROP POLICY IF EXISTS "listings_write_policy" ON public.listings;
CREATE POLICY "listings_write_policy" ON public.listings
    FOR ALL TO authenticated
    USING (
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
-- >>> END supabase/production_rls_policies.sql <<<

-- >>> BEGIN supabase/fix_profiles_listings_commodities_rls.sql <<<
-- ============================================================================
-- AGROWLINK SECURITY HARDENING: PROFILES, LISTINGS & COMMODITIES RLS
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
-- >>> END supabase/fix_profiles_listings_commodities_rls.sql <<<

-- >>> BEGIN supabase/fix_inspections_rls_and_tampering.sql <<<
-- ============================================================================
-- AGROWLINK SECURITY REMEDIATION MIGRATION
-- Issue: Anyone Can Edit or Delete Quality Inspection & Dispute Records
-- Fixes:
--   1. Drops all permissive/public policies (including any `OR true` policies) on public.inspections.
--   2. Restricts UPDATE and DELETE strictly to Platform Admin (public.is_admin()).
--   3. Restricts INSERT to authenticated buyer creating their own uncertified 'requested' row (or Admin).
--   4. Adds BEFORE INSERT OR UPDATE OR DELETE trigger trg_protect_inspections_integrity
--      blocking unauthorized modifications, deletions, or pre-paid/pre-passed inspection inserts.
-- Run this complete script in your Supabase SQL Editor.
-- ============================================================================

-- 1. Ensure valid status constraint
ALTER TABLE IF EXISTS public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE IF EXISTS public.inspections ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('requested', 'assigned', 'passed', 'failed', 'disputed', 'resolved', 'cancelled', 'deleted'));

-- 2. Enable RLS
ALTER TABLE IF EXISTS public.inspections ENABLE ROW LEVEL SECURITY;

-- 3. Dynamically drop EVERY existing policy on public.inspections so no stale `OR true` policy survives
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'inspections'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.inspections', pol.policyname);
    END LOOP;
END $$;

-- 4. Strict SELECT policy (Only involved buyer, order/listing farmer, or Admin)
CREATE POLICY "inspections_select_policy" ON public.inspections
    FOR SELECT TO authenticated USING (
        auth.uid()::text = buyer_id OR
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE (o.id = inspections.order_id OR o.order_number = inspections.order_number)
              AND (o.farmer_id = auth.uid()::text OR o.buyer_id = auth.uid()::text)
        ) OR
        EXISTS (
            SELECT 1 FROM public.listings l
            WHERE (l.id = inspections.order_id OR l.id = inspections.order_number)
              AND l.farmer_id = auth.uid()::text
        ) OR
        public.is_admin()
    );

-- 5. Strict INSERT policy
CREATE POLICY "inspections_insert_policy" ON public.inspections
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR
        auth.uid()::text = buyer_id
    );

-- 6. Strict Admin-Only UPDATE & DELETE policies
CREATE POLICY "inspections_update_policy" ON public.inspections
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "inspections_delete_policy" ON public.inspections
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 7. Defense-in-Depth Integrity Trigger on public.inspections
CREATE OR REPLACE FUNCTION public.protect_inspections_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_admin()
       OR (auth.jwt() ->> 'role') = 'service_role'
       OR auth.role() = 'service_role' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.status, 'requested') <> 'requested' THEN
            RAISE EXCEPTION 'Security Policy Violation: New buyer inspection requests must start in requested status.';
        END IF;
        IF COALESCE(NEW.fee_status, 'unpaid') <> 'unpaid'
           OR NEW.fee_paid_at IS NOT NULL
           OR NEW.fee_payment_id IS NOT NULL THEN
            RAISE EXCEPTION 'Security Policy Violation: Inspection fee status can only be marked paid via verified payment gateway.';
        END IF;
        IF NEW.grade IS NOT NULL
           OR NEW.moisture IS NOT NULL
           OR NEW.foreign_matter IS NOT NULL
           OR NEW.verified_weight IS NOT NULL
           OR NEW.inspector_name IS NOT NULL
           OR NEW.inspector_notes IS NOT NULL
           OR (NEW.arbitration IS NOT NULL AND NEW.arbitration <> '{}'::jsonb) THEN
            RAISE EXCEPTION 'Security Policy Violation: Buyers cannot pre-populate lab assay metrics or arbitration rulings.';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Security Policy Violation: Only Platform Administrators or Verified Settlement Services can modify or delete quality inspection and dispute records.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_inspections_integrity ON public.inspections;
CREATE TRIGGER trg_protect_inspections_integrity
    BEFORE INSERT OR UPDATE OR DELETE ON public.inspections
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_inspections_integrity();
-- >>> END supabase/fix_inspections_rls_and_tampering.sql <<<

-- >>> BEGIN supabase/lock_warehouse_receipts_on_loan.sql <<<
-- ============================================================================
-- AGROWLINK COLLATERAL PROTECTION FIX: e-NWR WAREHOUSE RECEIPT LIEN LOCK
-- Prevents double-pledging, unauthorized collateral release, and illegal sale/dispatch of mortgaged produce.
-- Run this script in your Supabase SQL Editor.
-- ============================================================================

-- 1. Add Institutional Lien Columns to warehouse_receipts table
ALTER TABLE IF EXISTS public.warehouse_receipts 
    ADD COLUMN IF NOT EXISTS lien_status TEXT DEFAULT 'unencumbered' CHECK (lien_status IN ('unencumbered', 'pledged', 'released')),
    ADD COLUMN IF NOT EXISTS lien_holder_id TEXT,
    ADD COLUMN IF NOT EXISTS lien_holder_name TEXT,
    ADD COLUMN IF NOT EXISTS lien_loan_id TEXT,
    ADD COLUMN IF NOT EXISTS lien_loan_number TEXT,
    ADD COLUMN IF NOT EXISTS pledged_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS lien_released_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_lien_status ON public.warehouse_receipts(lien_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_lien_loan_id ON public.warehouse_receipts(lien_loan_id);

-- 2. Atomic Procedure: Lock Warehouse Receipt When Pledged for a Loan
CREATE OR REPLACE FUNCTION public.lock_warehouse_receipt_for_loan_atomic(
    p_loan_id TEXT,
    p_receipt_id TEXT,
    p_financier_id TEXT,
    p_financier_name TEXT,
    p_loan_number TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_receipt RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_is_service_or_admin BOOLEAN := FALSE;
    v_is_financier BOOLEAN := FALSE;
BEGIN
    v_is_service_or_admin := (
        (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
        OR public.is_admin()
    );
    v_is_financier := public.is_verified_financier();

    IF NOT v_is_service_or_admin AND NOT v_is_financier AND pg_trigger_depth() = 0 THEN
        RAISE EXCEPTION 'Security Policy Violation: Only a Verified Institutional Financier, Platform Admin, or Verified System Trigger can lock warehouse collateral.';
    END IF;

    IF NOT v_is_service_or_admin AND v_is_financier AND pg_trigger_depth() = 0 THEN
        IF p_financier_id IS NOT NULL AND p_financier_id <> '' AND p_financier_id <> auth.uid()::text THEN
            RAISE EXCEPTION 'Security Policy Violation: Financier identity mismatch when locking collateral.';
        END IF;
    END IF;

    -- 1. Fetch & lock warehouse receipt
    SELECT * INTO v_receipt
    FROM public.warehouse_receipts
    WHERE id = p_receipt_id OR receipt_number = p_receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Warehouse receipt ' || COALESCE(p_receipt_id, 'NULL') || ' not found.'
        );
    END IF;

    IF COALESCE(v_receipt.status, '') = 'released' OR COALESCE(v_receipt.total_quantity, 0) <= 0 THEN
        RAISE EXCEPTION 'Collateral Error: Warehouse receipt % has already been physically released and cannot be pledged.',
            COALESCE(v_receipt.receipt_number, v_receipt.id);
    END IF;

    -- 2. Anti-Double-Pledging Check: If already pledged to a DIFFERENT loan/lender, reject!
    IF v_receipt.lien_status = 'pledged' AND v_receipt.lien_loan_id IS NOT NULL AND v_receipt.lien_loan_id <> p_loan_id THEN
        RAISE EXCEPTION 'Double-Pledging Security Violation: Warehouse receipt % is already pledged to % under active loan %. Multiple loans against the same commodity are strictly prohibited.',
            v_receipt.receipt_number,
            COALESCE(v_receipt.lien_holder_name, 'another institutional financier'),
            COALESCE(v_receipt.lien_loan_number, v_receipt.lien_loan_id);
    END IF;

    -- 3. Lock receipt as collateral: move available_quantity to locked_quantity
    UPDATE public.warehouse_receipts SET
        lien_status = 'pledged',
        lien_holder_id = p_financier_id,
        lien_holder_name = COALESCE(p_financier_name, 'Institutional Lender'),
        lien_loan_id = p_loan_id,
        lien_loan_number = COALESCE(p_loan_number, v_receipt.lien_loan_number),
        pledged_at = COALESCE(v_receipt.pledged_at, v_now),
        locked_quantity = v_receipt.total_quantity,
        available_quantity = 0,
        updated_at = v_now
    WHERE id = v_receipt.id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt.id,
        'receipt_number', v_receipt.receipt_number,
        'lien_status', 'pledged',
        'lien_holder', p_financier_name,
        'locked_quantity', v_receipt.total_quantity
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lock_warehouse_receipt_for_loan_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lock_warehouse_receipt_for_loan_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 3. Atomic Procedure: Release Lien ONLY by Lien-Holding Financier, Admin, Service Role, or Validated Repayment Trigger
CREATE OR REPLACE FUNCTION public.release_warehouse_receipt_lien_atomic(
    p_loan_id TEXT,
    p_receipt_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_receipt RECORD;
    v_loan RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_is_service_or_admin BOOLEAN := FALSE;
    v_is_financier BOOLEAN := FALSE;
    v_caller_uid TEXT := auth.uid()::text;
    v_is_lien_holder BOOLEAN := FALSE;
    v_lookup_loan_id TEXT;
BEGIN
    v_is_service_or_admin := (
        (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
        OR public.is_admin()
    );
    v_is_financier := public.is_verified_financier();

    -- 1. Match by specific receipt or by loan ID (prioritize active pledged receipts)
    IF p_receipt_id IS NOT NULL AND p_receipt_id <> '' THEN
        SELECT * INTO v_receipt
        FROM public.warehouse_receipts
        WHERE id = p_receipt_id OR receipt_number = p_receipt_id
        FOR UPDATE;
    ELSE
        SELECT * INTO v_receipt
        FROM public.warehouse_receipts
        WHERE lien_loan_id = p_loan_id OR lien_loan_number = p_loan_id
        ORDER BY CASE WHEN lien_status = 'pledged' THEN 0 ELSE 1 END, pledged_at DESC NULLS LAST
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pledged warehouse receipt not found.');
    END IF;

    -- 2. Verify loan-to-receipt binding so an unrelated loan cannot unlock a different active pledge
    IF v_receipt.lien_status = 'pledged'
       AND v_receipt.lien_loan_id IS NOT NULL
       AND p_loan_id IS NOT NULL
       AND p_loan_id <> ''
       AND v_receipt.lien_loan_id <> p_loan_id
       AND COALESCE(v_receipt.lien_loan_number, '') <> p_loan_id THEN
        IF pg_trigger_depth() > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'skipped', true,
                'message', 'Receipt is pledged to a different active loan.'
            );
        ELSIF NOT v_is_service_or_admin THEN
            RAISE EXCEPTION 'Security Policy Violation: Loan % does not hold the active lien on warehouse receipt %.',
                p_loan_id, v_receipt.receipt_number;
        END IF;
    END IF;

    -- 3. Fetch authoritative financing_requests record linked to this pledge
    v_lookup_loan_id := COALESCE(NULLIF(v_receipt.lien_loan_id, ''), NULLIF(p_loan_id, ''));
    IF v_lookup_loan_id IS NOT NULL THEN
        SELECT * INTO v_loan
        FROM public.financing_requests
        WHERE id = v_lookup_loan_id OR request_number = v_lookup_loan_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    v_is_lien_holder := (
        v_is_financier
        AND v_caller_uid IS NOT NULL
        AND (
            (v_receipt.lien_holder_id IS NOT NULL AND v_receipt.lien_holder_id = v_caller_uid)
            OR (v_loan.id IS NOT NULL AND v_loan.financier_id = v_caller_uid)
        )
    );

    -- 4. Strict Caller & State Authorization:
    -- Borrowers, warehouse operators, anon, and unrelated financiers CANNOT call this RPC directly.
    IF pg_trigger_depth() = 0 THEN
        IF NOT v_is_service_or_admin AND NOT v_is_lien_holder THEN
            RAISE EXCEPTION 'Security Policy Violation: Only the lien-holding Institutional Financier, Platform Admin, or Verified Settlement Engine can release warehouse collateral liens.';
        END IF;
    ELSE
        -- Invoked via trigger on financing_requests: verify the loan actually transitioned to a terminal/released status
        IF v_loan.id IS NULL OR v_loan.status NOT IN ('repaid', 'settled', 'rejected', 'cancelled') THEN
            RAISE EXCEPTION 'Security Policy Violation: Cannot release warehouse collateral while loan status is %.', COALESCE(v_loan.status, 'unknown');
        END IF;

        IF v_loan.status IN ('repaid', 'settled') AND NOT v_is_service_or_admin AND NOT v_is_lien_holder THEN
            RAISE EXCEPTION 'Security Policy Violation: Loan repayment clearance requires verified settlement authorization.';
        END IF;
    END IF;

    IF v_receipt.lien_status = 'unencumbered' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_released', true,
            'receipt_id', v_receipt.id,
            'receipt_number', v_receipt.receipt_number,
            'lien_status', 'unencumbered',
            'available_quantity', v_receipt.available_quantity
        );
    END IF;

    -- 5. Release lien and restore available quantity
    UPDATE public.warehouse_receipts SET
        lien_status = 'unencumbered',
        lien_released_at = v_now,
        locked_quantity = 0,
        available_quantity = CASE WHEN status = 'released' THEN 0 ELSE v_receipt.total_quantity END,
        updated_at = v_now
    WHERE id = v_receipt.id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt.id,
        'receipt_number', v_receipt.receipt_number,
        'lien_status', 'unencumbered',
        'available_quantity', CASE WHEN v_receipt.status = 'released' THEN 0 ELSE v_receipt.total_quantity END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_warehouse_receipt_lien_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_warehouse_receipt_lien_atomic(TEXT, TEXT) TO authenticated, service_role;

-- 4. Automatic Synchronization Trigger on financing_requests
CREATE OR REPLACE FUNCTION public.handle_financing_lien_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_target_receipt_id TEXT;
BEGIN
    v_target_receipt_id := COALESCE(NULLIF(NEW.receipt_id, ''), NULLIF(NEW.receipt_number, ''));

    IF v_target_receipt_id IS NOT NULL THEN
        -- Case A: Loan is under active offer, approval, or disbursement -> LOCK COLLATERAL
        IF NEW.status IN ('offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured') THEN
            PERFORM public.lock_warehouse_receipt_for_loan_atomic(
                NEW.id,
                v_target_receipt_id,
                NEW.financier_id,
                NEW.financier_name,
                NEW.request_number
            );
        -- Case B: Loan is repaid, settled, rejected, or cancelled -> RELEASE COLLATERAL (only if pledged to this exact loan)
        ELSIF NEW.status IN ('repaid', 'settled', 'rejected', 'cancelled') THEN
            PERFORM public.release_warehouse_receipt_lien_atomic(
                NEW.id,
                v_target_receipt_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_financing_receipt_lien ON public.financing_requests;
CREATE TRIGGER trg_sync_financing_receipt_lien
    AFTER INSERT OR UPDATE OF status, receipt_id, receipt_number, financier_id ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_financing_lien_sync();

-- 5. Anti-Sale, Anti-Dispatch & Anti-Tamper Guard Trigger on warehouse_receipts
CREATE OR REPLACE FUNCTION public.guard_pledged_receipt_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_is_privileged BOOLEAN := FALSE;
    v_is_lien_holder BOOLEAN := FALSE;
BEGIN
    v_is_privileged := (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
        OR pg_trigger_depth() > 0
    );

    IF v_is_privileged THEN
        RETURN NEW;
    END IF;

    v_is_lien_holder := (
        public.is_verified_financier()
        AND OLD.lien_holder_id IS NOT NULL
        AND OLD.lien_holder_id = auth.uid()::text
    );

    -- Protect all pledged collateral against unauthorized lien clearance, listing, or physical withdrawal
    IF OLD.lien_status = 'pledged' THEN
        IF (NEW.lien_status IS DISTINCT FROM OLD.lien_status) OR
           (NEW.lien_holder_id IS DISTINCT FROM OLD.lien_holder_id) OR
           (NEW.lien_holder_name IS DISTINCT FROM OLD.lien_holder_name) OR
           (NEW.lien_loan_id IS DISTINCT FROM OLD.lien_loan_id) OR
           (NEW.lien_loan_number IS DISTINCT FROM OLD.lien_loan_number) OR
           (NEW.pledged_at IS DISTINCT FROM OLD.pledged_at) OR
           (NEW.lien_released_at IS DISTINCT FROM OLD.lien_released_at) THEN
            IF NOT v_is_lien_holder THEN
                RAISE EXCEPTION 'Security Policy Violation: Direct modification of active institutional collateral lien fields on warehouse receipt % is forbidden.',
                    OLD.receipt_number;
            END IF;
        END IF;

        IF NEW.status IN ('listed', 'partially_listed', 'released')
           OR COALESCE(NEW.available_quantity, 0) > 0
           OR COALESCE(NEW.locked_quantity, 0) < COALESCE(OLD.locked_quantity, 0)
           OR COALESCE(NEW.total_quantity, 0) < COALESCE(OLD.total_quantity, 0) THEN
            RAISE EXCEPTION 'Cannot list, sell, or dispatch produce: Warehouse receipt % has an active institutional lien held by % under loan %. Please settle the loan to release collateral.',
                OLD.receipt_number,
                COALESCE(OLD.lien_holder_name, 'Financier'),
                COALESCE(OLD.lien_loan_number, 'Active Loan');
        END IF;
    ELSE
        -- Non-privileged users cannot directly forge lien metadata on unencumbered receipts
        IF (NEW.lien_status IS DISTINCT FROM OLD.lien_status) OR
           (NEW.lien_holder_id IS DISTINCT FROM OLD.lien_holder_id) OR
           (NEW.lien_holder_name IS DISTINCT FROM OLD.lien_holder_name) OR
           (NEW.lien_loan_id IS DISTINCT FROM OLD.lien_loan_id) OR
           (NEW.lien_loan_number IS DISTINCT FROM OLD.lien_loan_number) THEN
            RAISE EXCEPTION 'Security Policy Violation: Direct modification of institutional lien metadata on warehouse receipt % is forbidden.',
                OLD.receipt_number;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pledged_receipt_trade ON public.warehouse_receipts;
CREATE TRIGGER trg_guard_pledged_receipt_trade
    BEFORE UPDATE ON public.warehouse_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_pledged_receipt_trade();

-- 6. Block Deletion of Pledged Warehouse Receipts
CREATE OR REPLACE FUNCTION public.guard_pledged_receipt_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF OLD.lien_status = 'pledged' AND NOT (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot delete pledged warehouse receipt % while an institutional lien is active.',
            OLD.receipt_number;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pledged_receipt_delete ON public.warehouse_receipts;
CREATE TRIGGER trg_guard_pledged_receipt_delete
    BEFORE DELETE ON public.warehouse_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_pledged_receipt_delete();

-- 7. Block Listing Creation Referencing Pledged e-NWR Collateral
CREATE OR REPLACE FUNCTION public.guard_listing_from_pledged_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_pledged_receipt RECORD;
BEGIN
    IF NEW.origin_receipt_number IS NOT NULL AND NEW.origin_receipt_number <> '' THEN
        SELECT receipt_number, lien_holder_name, lien_loan_number INTO v_pledged_receipt
        FROM public.warehouse_receipts
        WHERE (receipt_number = NEW.origin_receipt_number OR id = NEW.origin_receipt_number)
          AND lien_status = 'pledged'
        LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Cannot create marketplace listing: Warehouse receipt % has an active institutional lien held by % under loan %.',
                v_pledged_receipt.receipt_number,
                COALESCE(v_pledged_receipt.lien_holder_name, 'Financier'),
                COALESCE(v_pledged_receipt.lien_loan_number, 'Active Loan');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_listing_from_pledged_receipt ON public.listings;
CREATE TRIGGER trg_guard_listing_from_pledged_receipt
    BEFORE INSERT OR UPDATE OF origin_receipt_number ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_listing_from_pledged_receipt();
-- >>> END supabase/lock_warehouse_receipts_on_loan.sql <<<

-- >>> BEGIN supabase/fix_unpaid_escrow_funding_bypass.sql <<<
-- ============================================================================
-- AGROWLINK CRITICAL SECURITY FIX: PREVENT UNPAID ESCROW & FREIGHT SELF-FUNDING
-- File: supabase/fix_unpaid_escrow_funding_bypass.sql
-- Purpose:
--   Closes the vulnerability where authenticated buyers could mark orders
--   (`escrow_status = 'funded'`) and deliveries (`freight_escrow_status = 'escrow_locked'`)
--   without completing payment:
--   1. Adds BEFORE INSERT trigger on public.orders blocking pre-funded client inserts.
--   2. Hardens protect_order_financial_fields() BEFORE UPDATE trigger on public.orders.
--   3. Hardens protect_delivery_financial_fields() BEFORE UPDATE trigger on public.deliveries
--      to block client-side locking ('escrow_locked'/'locked'/'funded'/'held'/'released').
--   4. Hardens lock_buyer_order_and_freight_escrow_atomic() so ONLY service_role
--      (verified Razorpay Edge Function / webhook) or Admin can mark escrow funded/locked.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GUARD ORDERS INSERT AGAINST PRE-FUNDED CLIENT SPOOFING
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_order_insert_escrow_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_admin()
       OR (auth.jwt() ->> 'role') = 'service_role'
       OR auth.role() = 'service_role'
       OR current_setting('agrolnk.trusted_rpc', true) = 'true'
       OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF COALESCE(NEW.escrow_status, 'pending') NOT IN ('pending', 'awaiting_freight_quote', 'financing_pending') THEN
        RAISE EXCEPTION 'Security Policy Violation: New orders cannot be created with pre-funded escrow status (%).', NEW.escrow_status;
    END IF;

    IF COALESCE(NEW.settlement_status, 'pending_deposit') <> 'pending_deposit' THEN
        RAISE EXCEPTION 'Security Policy Violation: New orders must start with pending_deposit settlement status.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_insert_escrow_state ON public.orders;
CREATE TRIGGER trg_protect_order_insert_escrow_state
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_order_insert_escrow_state();

-- ----------------------------------------------------------------------------
-- 2. HARDEN ORDERS UPDATE TRIGGER (ALLOW TRUSTED RPCs WHILE BLOCKING CLIENT REST)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_order_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_admin()
       OR (auth.jwt() ->> 'role') = 'service_role'
       OR auth.role() = 'service_role'
       OR current_setting('agrolnk.trusted_rpc', true) = 'true'
       OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF (NEW.total_amount IS DISTINCT FROM OLD.total_amount) OR
       (NEW.price_per_unit IS DISTINCT FROM OLD.price_per_unit) OR
       (NEW.buyer_fee_amount IS DISTINCT FROM OLD.buyer_fee_amount) OR
       (NEW.seller_fee_amount IS DISTINCT FROM OLD.seller_fee_amount) OR
       (NEW.platform_commission_amount IS DISTINCT FROM OLD.platform_commission_amount) OR
       (NEW.net_seller_amount IS DISTINCT FROM OLD.net_seller_amount) OR
       (NEW.freight_amount IS DISTINCT FROM OLD.freight_amount) OR
       (NEW.freight_fee_amount IS DISTINCT FROM OLD.freight_fee_amount) OR
       (NEW.grand_total_amount IS DISTINCT FROM OLD.grand_total_amount) THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct client modification of order financial values or platform fees is forbidden.';
    END IF;

    IF (NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id) OR
       (NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id) OR
       (NEW.razorpay_signature IS DISTINCT FROM OLD.razorpay_signature) OR
       (NEW.razorpay_transfer_id IS DISTINCT FROM OLD.razorpay_transfer_id) THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct client modification of payment gateway identifiers is forbidden.';
    END IF;

    IF (NEW.escrow_status IS DISTINCT FROM OLD.escrow_status) OR
       (NEW.settlement_status IS DISTINCT FROM OLD.settlement_status) THEN
        RAISE EXCEPTION 'Security Policy Violation: Escrow status and settlement status can only be updated via the verified payment gateway.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_financial_fields ON public.orders;
CREATE TRIGGER trg_protect_order_financial_fields
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_order_financial_fields();

-- ----------------------------------------------------------------------------
-- 3. HARDEN DELIVERIES UPDATE TRIGGER AGAINST CLIENT ESCROW LOCKING
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_delivery_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_admin()
       OR (auth.jwt() ->> 'role') = 'service_role'
       OR auth.role() = 'service_role'
       OR current_setting('agrolnk.trusted_rpc', true) = 'true'
       OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Block non-admin/non-gateway from locking, funding, or releasing freight escrow
    IF (NEW.freight_escrow_status IS DISTINCT FROM OLD.freight_escrow_status)
       AND COALESCE(NEW.freight_escrow_status, '') IN ('escrow_locked', 'locked', 'funded', 'held', 'released') THEN
        RAISE EXCEPTION 'Security Policy Violation: Freight escrow state (%) can only be set by the verified payment gateway or AgrowLink Admin.', NEW.freight_escrow_status;
    END IF;

    IF (NEW.status IS DISTINCT FROM OLD.status)
       AND NEW.status = 'completed' THEN
        RAISE EXCEPTION 'Security Policy Violation: Only AgrowLink Admin can mark a delivery completed and settled.';
    END IF;

    -- Block client-side tampering with freight fee breakdown columns
    IF (NEW.freight_base_amount IS DISTINCT FROM OLD.freight_base_amount)
       OR (NEW.consignor_freight_fee IS DISTINCT FROM OLD.consignor_freight_fee)
       OR (NEW.total_freight_payable IS DISTINCT FROM OLD.total_freight_payable)
       OR (NEW.transporter_commission_fee IS DISTINCT FROM OLD.transporter_commission_fee)
       OR (NEW.transporter_net_payout IS DISTINCT FROM OLD.transporter_net_payout) THEN
        RAISE EXCEPTION 'Security Policy Violation: Freight commission and escrow breakdown columns cannot be modified directly.';
    END IF;

    -- Once freight escrow is locked, block altering agreed freight_amount or winning transporter
    IF COALESCE(OLD.freight_escrow_status, '') IN ('locked', 'escrow_locked', 'released') THEN
        IF (NEW.freight_amount IS DISTINCT FROM OLD.freight_amount)
           OR (NEW.transporter_id IS DISTINCT FROM OLD.transporter_id) THEN
            RAISE EXCEPTION 'Security Policy Violation: Agreed freight quote and assigned carrier cannot be altered after escrow lock.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_delivery_financial_fields ON public.deliveries;
CREATE TRIGGER trg_protect_delivery_financial_fields
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_delivery_financial_fields();

-- ----------------------------------------------------------------------------
-- 4. HARDEN lock_buyer_order_and_freight_escrow_atomic() AGAINST UNPAID FUNDING
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(
    p_order_id TEXT,
    p_payment_mode TEXT DEFAULT 'direct_razorpay',
    p_payment_id TEXT DEFAULT NULL,
    p_bank_utr TEXT DEFAULT NULL,
    p_auto_verified BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_delivery RECORD;
    v_fin RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_freight_amt NUMERIC;
    v_freight_fee NUMERIC;
    v_transporter_fee NUMERIC;
    v_transporter_net NUMERIC;
    v_buyer_fee NUMERIC;
    v_grand_total NUMERIC;
    v_is_privileged BOOLEAN;
    v_is_bank_pending BOOLEAN;
    v_order_escrow_status TEXT;
    v_order_status TEXT;
    v_del_status TEXT;
    v_del_escrow_status TEXT;
BEGIN
    v_is_privileged := (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
    );

    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    -- Verify only the order's Buyer, Admin, or Service Role can operate on this order
    IF auth.uid() IS NOT NULL AND NOT v_is_privileged THEN
        IF v_order.buyer_id IS NOT NULL AND v_order.buyer_id <> auth.uid()::text THEN
            RAISE EXCEPTION 'Security Policy Violation: You can only lock escrow for your own purchase orders.';
        END IF;
    END IF;

    -- Idempotency: if already funded/released and delivery already locked, return current state safely
    IF COALESCE(v_order.escrow_status, '') IN ('funded', 'held', 'escrow_secured', 'released') THEN
        SELECT * INTO v_delivery
        FROM public.deliveries
        WHERE order_id = v_order.id OR order_number = v_order.order_number
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_delivery.id IS NULL OR COALESCE(v_delivery.freight_escrow_status, '') IN ('escrow_locked', 'locked', 'released') THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_funded', true,
                'order_id', v_order.id,
                'order_number', v_order.order_number,
                'delivery_id', v_delivery.id,
                'freight_amount', COALESCE(v_order.freight_amount, v_delivery.freight_amount, 0),
                'grand_total_amount', COALESCE(v_order.grand_total_amount, v_order.total_amount),
                'escrow_status', v_order.escrow_status,
                'status', v_order.status
            );
        END IF;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE order_id = v_order.id OR order_number = v_order.order_number
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_freight_amt := COALESCE(v_delivery.freight_amount, v_order.freight_amount, 0);

    IF v_freight_amt IS NULL OR v_freight_amt <= 0 THEN
        RAISE EXCEPTION 'Cannot lock combined escrow before a verified transporter freight quote (> 0) is recorded.';
    END IF;

    v_freight_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_net := ROUND(v_freight_amt - v_transporter_fee, 2);
    v_buyer_fee := COALESCE(NULLIF(v_order.buyer_fee_amount, 0), ROUND(v_order.total_amount * 0.0025, 2));
    v_grand_total := ROUND(v_order.total_amount + v_buyer_fee + v_freight_amt + v_freight_fee, 2);

    IF p_payment_mode = 'trade_credit' THEN
        -- Require an authentic financing_requests record for this order & buyer
        SELECT * INTO v_fin
        FROM public.financing_requests
        WHERE (order_id = v_order.id OR order_number = v_order.order_number)
          AND (
              v_is_privileged
              OR applicant_id = v_order.buyer_id
              OR (auth.uid() IS NOT NULL AND applicant_id = auth.uid()::text)
          )
        ORDER BY created_at DESC
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Security Policy Violation: No trade credit financing request exists for order %.', v_order.order_number;
        END IF;

        v_order_escrow_status := 'financing_pending';
        v_order_status := 'order_placed';

        -- Only lock transporter escrow if financing is already approved/disbursed/secured (or called by Admin/service_role)
        IF v_is_privileged OR COALESCE(v_fin.status, '') IN ('approved', 'disbursed', 'escrow_secured') THEN
            v_del_status := 'assigned';
            v_del_escrow_status := 'escrow_locked';
        ELSE
            v_del_status := COALESCE(v_delivery.status, 'price_offered');
            v_del_escrow_status := 'financing_pending';
        END IF;
    ELSIF p_payment_mode = 'escrow_van' THEN
        -- Non-privileged callers can NEVER auto-verify a bank transfer; must wait for webhook (service_role) or Admin
        v_is_bank_pending := NOT (v_is_privileged AND COALESCE(p_auto_verified, false));
        IF v_is_bank_pending THEN
            v_order_escrow_status := 'pending';
            v_order_status := 'pending';
            v_del_status := 'price_offered';
            v_del_escrow_status := 'pending_bank_check';
        ELSE
            v_order_escrow_status := 'funded';
            v_order_status := 'order_placed';
            v_del_status := 'assigned';
            v_del_escrow_status := 'escrow_locked';
        END IF;
    ELSE
        -- Direct Razorpay / Card / UPI funding MUST be executed by service_role (verified Edge Function) or Admin
        IF NOT v_is_privileged AND COALESCE(v_order.escrow_status, '') NOT IN ('funded', 'held', 'escrow_secured') THEN
            RAISE EXCEPTION 'Security Policy Violation: Direct client funding of Razorpay escrow is forbidden. Payment must be verified server-side via the payment gateway.';
        END IF;

        v_order_escrow_status := 'funded';
        v_order_status := 'order_placed';
        v_del_status := 'assigned';
        v_del_escrow_status := 'escrow_locked';
    END IF;

    UPDATE public.orders SET
        freight_amount = v_freight_amt,
        freight_fee_amount = v_freight_fee,
        grand_total_amount = v_grand_total,
        payment_mode = p_payment_mode,
        payment_id = COALESCE(p_payment_id, payment_id),
        bank_utr = COALESCE(p_bank_utr, bank_utr),
        escrow_status = v_order_escrow_status,
        settlement_status = CASE WHEN v_order_escrow_status = 'funded' THEN 'captured_on_hold' ELSE COALESCE(settlement_status, 'pending_deposit') END,
        status = v_order_status,
        updated_at = v_now
    WHERE id = v_order.id;

    IF v_delivery.id IS NOT NULL THEN
        UPDATE public.deliveries SET
            status = v_del_status,
            freight_escrow_status = v_del_escrow_status,
            freight_payer_id = v_order.buyer_id,
            freight_payer_role = 'buyer',
            freight_base_amount = v_freight_amt,
            consignor_freight_fee = v_freight_fee,
            total_freight_payable = ROUND(v_freight_amt + v_freight_fee, 2),
            transporter_commission_fee = v_transporter_fee,
            transporter_net_payout = v_transporter_net,
            freight_payment_mode = p_payment_mode,
            freight_bank_utr = COALESCE(p_bank_utr, p_payment_id),
            freight_deposited_at = CASE WHEN v_del_escrow_status = 'escrow_locked' THEN v_now ELSE freight_deposited_at END,
            updated_at = v_now
        WHERE id = v_delivery.id;
    END IF;

    -- Dispatch notifications only when escrow is actually locked/funded
    IF v_order_escrow_status = 'funded' AND v_del_escrow_status = 'escrow_locked' THEN
        IF v_order.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_order.farmer_id,
                'farmer',
                'Order & Freight Confirmed (' || v_order.order_number || ')',
                'Buyer locked ₹' || v_order.total_amount || ' produce payment + ₹' || v_freight_amt || ' freight in AgrowLink Escrow. Assigned vehicle (' || COALESCE(v_delivery.vehicle_number, 'Carrier') || ') will arrive for pickup.',
                'order',
                '/farmer-orders',
                false,
                v_now
            );
        END IF;

        IF v_delivery.transporter_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || (extract(epoch from v_now)::bigint + 1) || '_' || substr(md5(random()::text), 1, 6),
                v_delivery.transporter_id,
                'transporter',
                'Freight Quote Won & Escrow Locked! (' || v_delivery.delivery_number || ')',
                'Your quote of ₹' || v_freight_amt || ' for ' || v_order.commodity || ' won! Freight is secured in AgrowLink Escrow. Pickup address is now unlocked in My Active Trips.',
                'delivery',
                '/transporter-dashboard',
                false,
                v_now
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'delivery_id', v_delivery.id,
        'freight_amount', v_freight_amt,
        'grand_total_amount', v_grand_total,
        'escrow_status', v_order_escrow_status,
        'status', v_order_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;
-- >>> END supabase/fix_unpaid_escrow_funding_bypass.sql <<<

-- >>> BEGIN supabase/secure_delivery_pins_and_verification.sql <<<
-- ============================================================================
-- AGROWLINK CARRIER SECURITY FIX: MASK DELIVERY OTP & ATOMIC DROP-OFF HANDSHAKE
-- Run this script in Supabase SQL Editor.
-- ============================================================================

-- 1. Create Private Delivery Security Token Vault Table (Isolated from Transporters)
CREATE TABLE IF NOT EXISTS public.delivery_pins (
    delivery_id TEXT PRIMARY KEY,
    pickup_otp TEXT NOT NULL,
    delivery_otp TEXT NOT NULL,
    buyer_id TEXT,
    farmer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on delivery_pins
ALTER TABLE public.delivery_pins ENABLE ROW LEVEL SECURITY;

-- Security Policy: Transporters CANNOT access delivery_pins. 
-- Only Buyer (for delivery PIN), Farmer (for pickup PIN), and Admin can select.
DROP POLICY IF EXISTS "delivery_pins_buyer_select" ON public.delivery_pins;
CREATE POLICY "delivery_pins_buyer_select" ON public.delivery_pins
    FOR SELECT USING (auth.uid()::text = buyer_id OR public.is_admin());

DROP POLICY IF EXISTS "delivery_pins_farmer_select" ON public.delivery_pins;
CREATE POLICY "delivery_pins_farmer_select" ON public.delivery_pins
    FOR SELECT USING (auth.uid()::text = farmer_id OR public.is_admin());

-- 2. Populate delivery_pins with existing delivery tokens
INSERT INTO public.delivery_pins (delivery_id, pickup_otp, delivery_otp, buyer_id, farmer_id)
SELECT 
    id, 
    COALESCE(NULLIF(pickup_otp, ''), LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')), 
    COALESCE(NULLIF(delivery_otp, ''), LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')), 
    buyer_id, 
    farmer_id
FROM public.deliveries
ON CONFLICT (delivery_id) DO UPDATE SET
    pickup_otp = EXCLUDED.pickup_otp,
    delivery_otp = EXCLUDED.delivery_otp,
    buyer_id = COALESCE(EXCLUDED.buyer_id, delivery_pins.buyer_id),
    farmer_id = COALESCE(EXCLUDED.farmer_id, delivery_pins.farmer_id);

-- 3. Mask plaintext OTPs in public deliveries table so transporters never receive them in queries
UPDATE public.deliveries SET delivery_otp = NULL, pickup_otp = NULL;

-- 4. Trigger to automatically route OTPs to private vault and mask them in public deliveries table
CREATE OR REPLACE FUNCTION public.handle_secure_delivery_pins()
RETURNS TRIGGER AS $$
DECLARE
    v_pickup TEXT;
    v_delivery TEXT;
BEGIN
    -- Determine or generate PINs
    v_pickup := COALESCE(NULLIF(NEW.pickup_otp, ''), LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0'));
    v_delivery := COALESCE(NULLIF(NEW.delivery_otp, ''), LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0'));

    -- Store secret PINs in private vault
    INSERT INTO public.delivery_pins (delivery_id, pickup_otp, delivery_otp, buyer_id, farmer_id, updated_at)
    VALUES (NEW.id, v_pickup, v_delivery, NEW.buyer_id, NEW.farmer_id, NOW())
    ON CONFLICT (delivery_id) DO UPDATE SET
        pickup_otp = CASE WHEN EXCLUDED.pickup_otp IS NOT NULL AND EXCLUDED.pickup_otp <> '' THEN EXCLUDED.pickup_otp ELSE delivery_pins.pickup_otp END,
        delivery_otp = CASE WHEN EXCLUDED.delivery_otp IS NOT NULL AND EXCLUDED.delivery_otp <> '' THEN EXCLUDED.delivery_otp ELSE delivery_pins.delivery_otp END,
        buyer_id = COALESCE(EXCLUDED.buyer_id, delivery_pins.buyer_id),
        farmer_id = COALESCE(EXCLUDED.farmer_id, delivery_pins.farmer_id),
        updated_at = NOW();

    -- Strip plaintext OTPs from deliveries row before persisting to disk
    NEW.pickup_otp := NULL;
    NEW.delivery_otp := NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_secure_delivery_pins ON public.deliveries;
CREATE TRIGGER trg_secure_delivery_pins
    BEFORE INSERT OR UPDATE OF pickup_otp, delivery_otp ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_secure_delivery_pins();

-- 5. RPC: Authoritative Verification for Transporter Drop-Off
CREATE OR REPLACE FUNCTION public.verify_transporter_delivery_dropoff_atomic(
    p_delivery_id TEXT,
    p_input_otp TEXT,
    p_transporter_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_delivery RECORD;
    v_pin RECORD;
    v_caller_id TEXT := auth.uid()::TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Fetch and lock delivery record
    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery consignment % not found.', p_delivery_id;
    END IF;

    -- 2. Authorization check: caller must be assigned transporter or admin
    IF p_transporter_id IS NOT NULL AND p_transporter_id <> '' THEN
        IF v_delivery.transporter_id IS NOT NULL AND v_delivery.transporter_id <> p_transporter_id AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Consignment assigned to another transporter.';
        END IF;
    ELSIF v_caller_id IS NOT NULL AND v_caller_id <> '' THEN
        IF v_delivery.transporter_id IS NOT NULL AND v_delivery.transporter_id <> v_caller_id AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: You are not the assigned carrier for this load.';
        END IF;
    END IF;

    -- 3. Check if already delivered
    IF v_delivery.status = 'delivered' OR v_delivery.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_delivered', true,
            'delivery_id', v_delivery.id,
            'delivery_number', v_delivery.delivery_number,
            'status', v_delivery.status
        );
    END IF;

    -- 4. Fetch the real secret delivery PIN from private vault
    SELECT * INTO v_pin
    FROM public.delivery_pins
    WHERE delivery_id = v_delivery.id;

    IF NOT FOUND OR v_pin.delivery_otp IS NULL THEN
        RAISE EXCEPTION 'Security PIN record not initialized for this delivery.';
    END IF;

    -- 5. Strict comparison
    IF TRIM(v_pin.delivery_otp) <> TRIM(p_input_otp) THEN
        RAISE EXCEPTION 'Invalid Delivery PIN. Please confirm the 4-digit code provided by the recipient buyer.';
    END IF;

    -- 6. Atomically transition delivery status to 'delivered'
    UPDATE public.deliveries SET
        status = 'delivered',
        updated_at = v_now
    WHERE id = v_delivery.id;

    -- 7. Synchronize linked order to 'delivered' (escrow securely held until Admin Call Verification)
    IF v_delivery.order_id IS NOT NULL OR v_delivery.order_number IS NOT NULL THEN
        UPDATE public.orders SET
            status = 'delivered',
            admin_verification_status = 'pending',
            updated_at = v_now
        WHERE (id = v_delivery.order_id OR order_number = v_delivery.order_number);
    END IF;

    -- 8. Send notification to buyer and farmer
    INSERT INTO public.notifications (
        id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
    ) VALUES (
        'notif_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
        v_delivery.buyer_id,
        'buyer',
        'Consignment Delivered! 📦',
        'Transporter ' || COALESCE(v_delivery.transporter_name, 'Carrier') || ' confirmed delivery using your handover PIN. Please inspect your produce.',
        'delivery',
        '/buyer-deliveries',
        false,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', v_delivery.id,
        'delivery_number', v_delivery.delivery_number,
        'order_id', v_delivery.order_id,
        'order_number', v_delivery.order_number,
        'status', 'delivered'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Secure PIN retrieval for Buyer (delivery PIN) and Farmer (pickup PIN)
CREATE OR REPLACE FUNCTION public.get_delivery_secret_pins(
    p_delivery_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_delivery RECORD;
    v_pin RECORD;
    v_caller TEXT := auth.uid()::TEXT;
    v_is_admin BOOLEAN := public.is_admin();
    v_is_buyer BOOLEAN := false;
    v_is_farmer BOOLEAN := false;
BEGIN
    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_pin
    FROM public.delivery_pins
    WHERE delivery_id = v_delivery.id;

    v_is_buyer := (v_caller = v_delivery.buyer_id OR (v_pin IS NOT NULL AND v_caller = v_pin.buyer_id));
    v_is_farmer := (v_caller = v_delivery.farmer_id OR (v_pin IS NOT NULL AND v_caller = v_pin.farmer_id));

    IF v_pin IS NULL THEN
        RETURN jsonb_build_object(
            'delivery_id', v_delivery.id,
            'delivery_otp', NULL,
            'pickup_otp', NULL
        );
    END IF;

    -- Transporters will receive NULL for both OTPs!
    RETURN jsonb_build_object(
        'delivery_id', v_delivery.id,
        'delivery_otp', CASE WHEN (v_is_buyer OR v_is_admin) THEN v_pin.delivery_otp ELSE NULL END,
        'pickup_otp', CASE WHEN (v_is_farmer OR v_is_admin) THEN v_pin.pickup_otp ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- >>> END supabase/secure_delivery_pins_and_verification.sql <<<

-- >>> BEGIN supabase/apply_audit_remediation_triggers_and_rls.sql <<<
-- ============================================================================
-- AGROWLINK: FINAL SECURITY AUDIT REMEDIATION (TRIGGERS & RLS HARDENING)
-- Run this in Supabase SQL Editor:
-- 1. Hardens public.orders financial field protection trigger (Issues 5 & 11)
-- 2. Restricts public.profiles insert policy to auth.uid() = id (Issue 14)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HARDEN ORDER FINANCIAL FIELDS TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_order_financial_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Permit all modifications by Admin, Supabase Service Role, or trusted internal procedures
    IF public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- 1. Block direct client manipulation of order prices, fee amounts, and financial balances
    IF (NEW.total_amount IS DISTINCT FROM OLD.total_amount) OR
       (NEW.price_per_unit IS DISTINCT FROM OLD.price_per_unit) OR
       (NEW.buyer_fee_amount IS DISTINCT FROM OLD.buyer_fee_amount) OR
       (NEW.seller_fee_amount IS DISTINCT FROM OLD.seller_fee_amount) OR
       (NEW.platform_commission_amount IS DISTINCT FROM OLD.platform_commission_amount) OR
       (NEW.net_seller_amount IS DISTINCT FROM OLD.net_seller_amount) THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct client modification of order financial values or platform fees is forbidden.';
    END IF;

    -- 2. Block direct client manipulation of payment gateway tracking identifiers
    IF (NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id) OR
       (NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id) OR
       (NEW.razorpay_signature IS DISTINCT FROM OLD.razorpay_signature) OR
       (NEW.razorpay_transfer_id IS DISTINCT FROM OLD.razorpay_transfer_id) THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct client modification of payment gateway identifiers is forbidden.';
    END IF;

    -- 3. Block direct client manipulation of escrow status and settlement status
    -- Only the server-side Edge Function (via service_role) or Platform Admin can update these
    IF (NEW.escrow_status IS DISTINCT FROM OLD.escrow_status) OR
       (NEW.settlement_status IS DISTINCT FROM OLD.settlement_status) THEN
        RAISE EXCEPTION 'Security Policy Violation: Escrow status and settlement status can only be updated via the secure payment verification gateway.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_financial_fields ON public.orders;
CREATE TRIGGER trg_protect_order_financial_fields
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_order_financial_fields();

-- ----------------------------------------------------------------------------
-- 2. STRICT PROFILES INSERTION POLICY (Enforce strict ownership & block admin self-assignment)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid()::text = id AND
        (role <> 'admin' OR public.is_admin())
    );

-- ----------------------------------------------------------------------------
-- 3. VERIFICATION QUERY
-- ----------------------------------------------------------------------------
SELECT 
    'Financial Field Protection Trigger' AS security_component,
    COUNT(*)::text AS count,
    CASE WHEN COUNT(*) >= 1 THEN 'SECURE (Trigger Active on public.orders)' ELSE 'INSECURE' END AS status
FROM pg_trigger
WHERE tgname = 'trg_protect_order_financial_fields'
UNION ALL
SELECT 
    'Profile Insert RLS Policy' AS security_component,
    COUNT(*)::text AS count,
    CASE WHEN COUNT(*) >= 1 THEN 'SECURE (Ownership check auth.uid() = id Active)' ELSE 'INSECURE' END AS status
FROM pg_policies
WHERE tablename = 'profiles' AND policyname = 'profiles_insert_policy';
-- >>> END supabase/apply_audit_remediation_triggers_and_rls.sql <<<

-- >>> BEGIN supabase/consolidated_production_security_rls.sql <<<
-- ============================================================================
-- AGROWLINK CONSOLIDATED PRODUCTION DATABASE SECURITY & RLS CONSOLIDATION
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
-- >>> END supabase/consolidated_production_security_rls.sql <<<

-- >>> BEGIN supabase/storage_buckets_setup.sql <<<
-- =============================================================================
-- AgrowLink Supabase Storage Buckets & Access Security Configuration
-- Order-Independent & Idempotent:
--   Safe to run BEFORE or AFTER any storage hardening patch without leaving
--   public 'proof' reads or wiping out upload permissions.
-- Buckets:
--   1. listings (Public): Farmer crop produce lot photos & videos
--   2. proof (Private): Transporter e-way bills, weighbridge slips, lab reports
--   3. kyc (Private): Government ID proofs, GST certificates, bank documents
-- =============================================================================

-- 1. Create or reconcile storage buckets with canonical privacy settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'listings',
    'listings',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  ),
  (
    'proof',
    'proof',
    false,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']
  ),
  (
    'kyc',
    'kyc',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Dynamically clear all legacy/duplicate policies on storage.objects
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- 3. Canonical SELECT on public listings bucket
CREATE POLICY "agrolnk_public_listings_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- 4. Canonical SELECT on private proof & kyc buckets (Admins or Owners)
CREATE POLICY "agrolnk_private_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN ('proof', 'kyc')
    AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()::text AND role = 'admin'
        )
        OR owner::text = auth.uid()::text
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
        OR name LIKE (auth.uid()::text || '/%')
        OR name LIKE ('%/' || auth.uid()::text || '/%')
        OR name LIKE ('%' || auth.uid()::text || '%')
    )
);

-- 5. Canonical INSERT on listings + user-isolated private buckets
CREATE POLICY "agrolnk_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'listings'
    OR (
        bucket_id IN ('proof', 'kyc')
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid()::text AND role = 'admin'
            )
            OR owner::text = auth.uid()::text
            OR (storage.foldername(name))[1] = auth.uid()::text
            OR (storage.foldername(name))[2] = auth.uid()::text
            OR name LIKE (auth.uid()::text || '/%')
            OR name LIKE ('%/' || auth.uid()::text || '/%')
            OR name LIKE ('%' || auth.uid()::text || '%')
        )
    )
);

-- 6. Canonical UPDATE & DELETE (Admins or Owners)
CREATE POLICY "agrolnk_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()::text AND role = 'admin'
    )
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);

CREATE POLICY "agrolnk_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()::text AND role = 'admin'
    )
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);
-- >>> END supabase/storage_buckets_setup.sql <<<

-- >>> BEGIN supabase/lock_down_storage_objects_security.sql <<<
-- ============================================================================
-- AGROWLINK: 100% BULLETPROOF STORAGE RLS LOCKDOWN (KYC & WAREHOUSE DOCUMENTS)
-- File: supabase/lock_down_storage_objects_security.sql
-- Description:
--   1. Ensures 'proof' and 'kyc' buckets are strictly private (public = false).
--   2. Dynamically drops ALL existing policies on storage.objects to eliminate any
--      legacy or open read policies.
--   3. Grants SELECT on 'listings' to public (for produce photos).
--   4. Grants SELECT on 'proof' and 'kyc' ONLY to Authenticated Admins and Document Owners.
--   5. BLOCKS all unauthenticated / anonymous visitors from listing or downloading KYC docs.
-- ============================================================================

-- 1. Ensure bucket privacy flags
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('proof', 'kyc');

UPDATE storage.buckets 
SET public = true 
WHERE id = 'listings';

-- 2. Dynamically DROP all existing policies on storage.objects (Eliminates all legacy leaks)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- 3. Policy: Public can ONLY view produce photos in 'listings' bucket
CREATE POLICY "agrolnk_public_listings_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- 4. Policy: Private KYC & Proof Documents (Strictly Authenticated Admins or Document Owners)
CREATE POLICY "agrolnk_private_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN ('proof', 'kyc')
    AND (
        -- Platform Admins have global inspection rights
        public.is_admin()
        OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        -- Document Owner can only read their own files
        OR owner::text = auth.uid()::text
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
        OR name LIKE (auth.uid()::text || '/%')
        OR name LIKE ('%/' || auth.uid()::text || '/%')
        OR name LIKE ('%' || auth.uid()::text || '%')
    )
);

-- 5. Policy: Authenticated File Uploads (Folder Isolation)
CREATE POLICY "agrolnk_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'listings'
    OR (
        bucket_id IN ('proof', 'kyc')
        AND (
            public.is_admin()
            OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
            OR owner::text = auth.uid()::text
            OR (storage.foldername(name))[1] = auth.uid()::text
            OR (storage.foldername(name))[2] = auth.uid()::text
            OR name LIKE (auth.uid()::text || '/%')
            OR name LIKE ('%/' || auth.uid()::text || '/%')
            OR name LIKE ('%' || auth.uid()::text || '%')
        )
    )
);

-- 6. Policy: Authenticated Updates (Admins & Document Owners ONLY)
CREATE POLICY "agrolnk_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);

-- 7. Policy: Authenticated Deletions (Admins & Document Owners ONLY)
CREATE POLICY "agrolnk_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    public.is_admin()
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);

-- 8. Verification Audit Query
SELECT 
    b.id AS bucket_name,
    b.public AS is_public,
    CASE WHEN b.public = false THEN 'SECURE (Private)' ELSE 'PUBLIC' END AS bucket_status,
    COUNT(p.policyname) AS active_policies
FROM storage.buckets b
LEFT JOIN pg_policies p ON p.schemaname = 'storage' AND p.tablename = 'objects'
WHERE b.id IN ('proof', 'kyc', 'listings')
GROUP BY b.id, b.public;
-- >>> END supabase/lock_down_storage_objects_security.sql <<<

-- >>> BEGIN supabase/create_master_admin.sql <<<
-- ============================================================================
-- AGROWLINK SECURITY FIX #1: PROVISION & SECURE AUTHENTIC MASTER ADMINISTRATOR
-- File: supabase/create_master_admin.sql
-- Description:
--   Removes hardcoded client-side admin passwords and provisions a genuine,
--   cryptographically hashed administrator inside Supabase Auth (auth.users)
--   with server-side role verification in public.profiles.
-- ============================================================================

-- Ensure pgcrypto extension is active for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_admin_id UUID;
    v_encrypted_pw TEXT;
    v_existing_auth_id UUID;
BEGIN
    -- Encrypt the initial strong admin password using bcrypt (Blowfish)
    -- Default secure password: AgrowLink@Admin2026!Secure (Change to your secret password if needed)
    v_encrypted_pw := crypt('AgrowLink@Admin2026!Secure', gen_salt('bf'));

    -- 1. Check if admin user already exists in auth.users
    SELECT id INTO v_existing_auth_id 
    FROM auth.users 
    WHERE LOWER(email) = 'admin@agrolnk.com';

    IF v_existing_auth_id IS NULL THEN
        v_admin_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            confirmation_token,
            recovery_token,
            email_change,
            email_change_token_new,
            email_change_token_current,
            phone_change,
            phone_change_token,
            reauthentication_token,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_admin_id,
            'authenticated',
            'authenticated',
            'admin@agrolnk.com',
            v_encrypted_pw,
            NOW(),
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'admin'),
            jsonb_build_object('name', 'System Administrator', 'role', 'admin'),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            NOW(),
            NOW()
        );

        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_admin_id::text,
            v_admin_id,
            jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@agrolnk.com'),
            'email',
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
    ELSE
        v_admin_id := v_existing_auth_id;
        
        -- Preserve existing admin password! Only update metadata, role, and prevent GoTrue token NULL scan crash
        UPDATE auth.users SET
            raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'admin'),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change_token_current = COALESCE(email_change_token_current, ''),
            phone_change = COALESCE(phone_change, ''),
            phone_change_token = COALESCE(phone_change_token, ''),
            reauthentication_token = COALESCE(reauthentication_token, ''),
            updated_at = NOW()
        WHERE id = v_admin_id;

        -- Ensure identity exists
        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_admin_id::text,
            v_admin_id,
            jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@agrolnk.com'),
            'email',
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
    END IF;

    -- 2. Clean up legacy dummy admin profiles to prevent email collision
    DELETE FROM public.profiles 
    WHERE LOWER(email) = 'admin@agrolnk.com' 
      AND id <> v_admin_id::text;

    -- 3. Ensure authoritative profile in public.profiles linked to auth UID
    INSERT INTO public.profiles (
        id,
        name,
        email,
        phone,
        role,
        state,
        district,
        company_name,
        kyc_status,
        created_at,
        updated_at
    ) VALUES (
        v_admin_id::text,
        'System Administrator',
        'admin@agrolnk.com',
        '9876500000',
        'admin',
        'Central Command',
        'HQ Operations',
        'AgrowLink Platform Ombudsman',
        'verified',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        email = 'admin@agrolnk.com',
        kyc_status = 'verified',
        updated_at = NOW();

    -- 4. Purge custom password hashes from profile metadata
    UPDATE public.profiles 
    SET meta = COALESCE(meta, '{}'::jsonb) - 'password_hash' - 'password_salt'
    WHERE id = v_admin_id::text OR role = 'admin';

    RAISE NOTICE 'Master Administrator provisioned successfully with UID: %', v_admin_id;
END $$;
-- >>> END supabase/create_master_admin.sql <<<

-- >>> BEGIN supabase/fix_migration_order_and_storage_idempotency.sql <<<
-- ============================================================================
-- AGROWLINK MIGRATION RECONCILIATION & STORAGE ORDER-INDEPENDENCE FIX
-- File: supabase/fix_migration_order_and_storage_idempotency.sql
-- Purpose:
--   Safely repairs any Supabase database regardless of which order legacy
--   storage or RLS patch files were executed:
--     1. Ensures 'listings' bucket is public and 'proof'/'kyc' are strictly private.
--     2. Drops ALL legacy/conflicting policies on storage.objects and installs
--        the canonical 5 agrolnk_* policies (SELECT + INSERT + UPDATE + DELETE).
--     3. Dynamically removes any lingering open USING(true)/WITH CHECK(true)
--        write policies across the public schema.
--     4. Verifies 0 open write policies remain and lists active storage rules.
-- Safe & Idempotent: Run directly in Supabase SQL Editor.
-- ============================================================================

-- 1. Enforce canonical bucket privacy
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('listings', 'listings', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('proof', 'proof', false, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']),
  ('kyc', 'kyc', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Dynamically clear ALL policies on storage.objects so no conflicting or wiped-out state persists
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- 3. Reinstall canonical 5 storage.objects policies
CREATE POLICY "agrolnk_public_listings_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

CREATE POLICY "agrolnk_private_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN ('proof', 'kyc')
    AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()::text AND role = 'admin'
        )
        OR owner::text = auth.uid()::text
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
        OR name LIKE (auth.uid()::text || '/%')
        OR name LIKE ('%/' || auth.uid()::text || '/%')
        OR name LIKE ('%' || auth.uid()::text || '%')
    )
);

CREATE POLICY "agrolnk_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'listings'
    OR (
        bucket_id IN ('proof', 'kyc')
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid()::text AND role = 'admin'
            )
            OR owner::text = auth.uid()::text
            OR (storage.foldername(name))[1] = auth.uid()::text
            OR (storage.foldername(name))[2] = auth.uid()::text
            OR name LIKE (auth.uid()::text || '/%')
            OR name LIKE ('%/' || auth.uid()::text || '/%')
            OR name LIKE ('%' || auth.uid()::text || '%')
        )
    )
);

CREATE POLICY "agrolnk_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()::text AND role = 'admin'
    )
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);

CREATE POLICY "agrolnk_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()::text AND role = 'admin'
    )
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);

-- 4. Eliminate any leftover USING (true) / WITH CHECK (true) write policies on public schema tables
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

-- 5. Audit summary
SELECT
    'Public Open-Write Check' AS audit_check,
    COUNT(*)::TEXT AS result_value
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  AND (qual = 'true' OR with_check = 'true')
UNION ALL
SELECT
    'Storage Policy: ' || policyname AS audit_check,
    cmd || ' (' || array_to_string(roles, ',') || ')' AS result_value
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY audit_check;
-- >>> END supabase/fix_migration_order_and_storage_idempotency.sql <<<
