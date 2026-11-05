-- ==============================================================================
-- AGROLNK CONSOLIDATED SCHEMA MIGRATION (TODAY'S ESCROW & REVENUE EXPANSIONS)
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
SELECT 'AgroLnk consolidated escrow & revenue schema migration completed successfully!' AS status;
