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
    role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'transporter', 'warehouse', 'financier')),
    company_name TEXT,
    state TEXT,
    district TEXT,
    address TEXT,
    kyc_status TEXT DEFAULT 'verified' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    vehicle_number TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    commodity TEXT NOT NULL,
    grade TEXT,
    variety TEXT,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    pickup_location JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_location JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'transport_requested' CHECK (status IN ('transport_requested', 'assigned', 'dispatched', 'in_transit', 'delivered')),
    pickup_otp TEXT,
    delivery_otp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Permissive policies for prototype testing; can be restricted with Supabase Auth
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

-- Allow public read and write access for development and testing
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update profiles" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Allow public read listings" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update listings" ON public.listings FOR ALL USING (true);

CREATE POLICY "Allow public read auctions" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update auctions" ON public.auctions FOR ALL USING (true);

CREATE POLICY "Allow public read auction_bids" ON public.auction_bids FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update auction_bids" ON public.auction_bids FOR ALL USING (true);

CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update orders" ON public.orders FOR ALL USING (true);

CREATE POLICY "Allow public read deliveries" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update deliveries" ON public.deliveries FOR ALL USING (true);

CREATE POLICY "Allow public read warehouses" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update warehouses" ON public.warehouses FOR ALL USING (true);

CREATE POLICY "Allow public read warehouse_receipts" ON public.warehouse_receipts FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update warehouse_receipts" ON public.warehouse_receipts FOR ALL USING (true);

CREATE POLICY "Allow public read financing_requests" ON public.financing_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update financing_requests" ON public.financing_requests FOR ALL USING (true);

-- ============================================================================
-- 9. INITIAL SEED DATA (Ready for Immediate Testing)
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
