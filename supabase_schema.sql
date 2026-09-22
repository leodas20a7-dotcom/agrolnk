-- ============================================================================
-- AGROLNK PRODUCTION DATABASE SCHEMA FOR SUPABASE (PostgreSQL)
-- Project: AGROLNK Agri-Fintech & Digital Commodity Exchange
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
    role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'transporter', 'warehouse', 'financier', 'admin')),
    company_name TEXT,
    state TEXT,
    district TEXT,
    address TEXT,
    pincode TEXT,
    landmark TEXT,
    kyc_status TEXT DEFAULT 'verified' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    route_account_id TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_beneficiary_name TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure admin role is permitted in existing deployments
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('farmer', 'buyer', 'transporter', 'warehouse', 'financier', 'admin'));

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
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'cancelled')),
    origin_warehouse_id TEXT,
    origin_receipt_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    reserve_price NUMERIC NOT NULL CHECK (reserve_price >= base_price),
    current_bid NUMERIC NOT NULL CHECK (current_bid >= base_price),
    highest_bidder_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    highest_bidder_name TEXT,
    total_bids INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('upcoming', 'live', 'completed', 'reserve_not_met', 'cancelled')),
    state TEXT,
    district TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- Allow public read and write access for development, testing & API sync
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert/update profiles" ON public.profiles;
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update profiles" ON public.profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read listings" ON public.listings;
DROP POLICY IF EXISTS "Allow public insert/update listings" ON public.listings;
CREATE POLICY "Allow public read listings" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update listings" ON public.listings FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read auctions" ON public.auctions;
DROP POLICY IF EXISTS "Allow public insert/update auctions" ON public.auctions;
CREATE POLICY "Allow public read auctions" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update auctions" ON public.auctions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read auction_bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Allow public insert/update auction_bids" ON public.auction_bids;
CREATE POLICY "Allow public read auction_bids" ON public.auction_bids FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update auction_bids" ON public.auction_bids FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert/update orders" ON public.orders;
CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update orders" ON public.orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Allow public insert/update deliveries" ON public.deliveries;
CREATE POLICY "Allow public read deliveries" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update deliveries" ON public.deliveries FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Allow public insert/update warehouses" ON public.warehouses;
CREATE POLICY "Allow public read warehouses" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update warehouses" ON public.warehouses FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read warehouse_receipts" ON public.warehouse_receipts;
DROP POLICY IF EXISTS "Allow public insert/update warehouse_receipts" ON public.warehouse_receipts;
CREATE POLICY "Allow public read warehouse_receipts" ON public.warehouse_receipts FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update warehouse_receipts" ON public.warehouse_receipts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read financing_requests" ON public.financing_requests;
DROP POLICY IF EXISTS "Allow public insert/update financing_requests" ON public.financing_requests;
CREATE POLICY "Allow public read financing_requests" ON public.financing_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update financing_requests" ON public.financing_requests FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read inspections" ON public.inspections;
DROP POLICY IF EXISTS "Allow public insert/update inspections" ON public.inspections;
CREATE POLICY "Allow public read inspections" ON public.inspections FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update inspections" ON public.inspections FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public insert/update chat_messages" ON public.chat_messages;
CREATE POLICY "Allow public read chat_messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update chat_messages" ON public.chat_messages FOR ALL USING (true);

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
    ('insp_102', 'INSP-2026-4419', NULL, 'AGM-9266', 'usr_buyer_02', 'Ananya Agro Foods', 'veerappan (Salem Producer)', 'Tomato', 'Hybrid Shivam Tomato', 100, 98.5, 'A', 'A', 9.4, 0.2, 'passed', 3000, 'AgroLnk Certified Assayer (Govind)', 'Physical inspection & moisture meter testing completed at farmgate hub.')
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
CREATE POLICY "Allow public read commodities" ON public.commodities FOR SELECT USING (true);
CREATE POLICY "Allow public insert commodities" ON public.commodities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update commodities" ON public.commodities FOR UPDATE USING (true);

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
CREATE POLICY "Allow public read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update notifications" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete notifications" ON public.notifications FOR DELETE USING (true);

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
CREATE POLICY "Allow public read chat_messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update chat_messages" ON public.chat_messages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete chat_messages" ON public.chat_messages FOR DELETE USING (true);

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
    p_admin_name TEXT DEFAULT 'AgroLnk Operations Ombudsman',
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





