-- ============================================================================
-- AGROLNK: ADD FPO (FARMER PRODUCER ORGANISATION) ROLE MIGRATION
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
