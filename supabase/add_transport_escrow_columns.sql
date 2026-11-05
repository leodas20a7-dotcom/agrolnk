-- AgroLnk Phase 1 Migration: Add Transport Freight Escrow Columns to deliveries table
-- Extends public.deliveries with comprehensive escrow tracking, dual-tier payment mode, and audit trails.

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS freight_escrow_status TEXT DEFAULT 'unfunded'
    CHECK (freight_escrow_status IN ('unfunded', 'pending_bank_check', 'escrow_locked', 'released', 'disputed')),
  ADD COLUMN IF NOT EXISTS freight_payer_id UUID REFERENCES public.profiles(id),
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

-- Create performance index for fast filtering in Admin Escrow Ledger
CREATE INDEX IF NOT EXISTS idx_deliveries_freight_escrow_status ON public.deliveries(freight_escrow_status);
CREATE INDEX IF NOT EXISTS idx_deliveries_freight_bank_utr ON public.deliveries(freight_bank_utr);

