-- ============================================================================
-- AGROLNK TRADE FINANCING & INSTITUTIONAL QUOTATION SCHEMA UPDATE
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

CREATE POLICY "Allow public read financing_requests" ON public.financing_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update financing_requests" ON public.financing_requests FOR ALL USING (true) WITH CHECK (true);

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
