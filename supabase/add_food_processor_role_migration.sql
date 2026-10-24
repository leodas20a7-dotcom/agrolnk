-- ============================================================================
-- AGROLNK: ADD FOOD PROCESSOR ROLE & PRODUCT TYPE CLASSIFICATION MIGRATION
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
