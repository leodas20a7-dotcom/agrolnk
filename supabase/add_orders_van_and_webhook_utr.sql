-- ==============================================================================
-- AgroLnk: Smart Collect Virtual Account (VAN) & Webhook UTR Orders Schema
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
SELECT 'AgroLnk automated VAN & Webhook UTR schema applied successfully!' AS status;

