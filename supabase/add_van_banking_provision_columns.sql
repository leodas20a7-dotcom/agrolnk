-- ==============================================================================
-- AgroLnk: Virtual Account Number (VAN) Banking Provision Schema Extension
-- Run this in your Supabase SQL Editor to support direct VAN queries & reporting
-- ==============================================================================

-- 1. Add dedicated VAN banking provision columns to public.profiles
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS van_status TEXT DEFAULT 'pending_bank_approval',
  ADD COLUMN IF NOT EXISTS virtual_account_number TEXT,
  ADD COLUMN IF NOT EXISTS virtual_account_ifsc TEXT DEFAULT 'ICIC0000104',
  ADD COLUMN IF NOT EXISTS van_bank_name TEXT DEFAULT 'ICICI Bank Ltd.',
  ADD COLUMN IF NOT EXISTS van_notes TEXT,
  ADD COLUMN IF NOT EXISTS van_assigned_at TIMESTAMPTZ;

-- 2. Performance index for instant lookup when bank webhooks or deposits arrive
CREATE INDEX IF NOT EXISTS idx_profiles_virtual_account_number 
  ON public.profiles(virtual_account_number) 
  WHERE virtual_account_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_van_status 
  ON public.profiles(van_status);

-- 3. Check constraint to prevent arbitrary status values
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_van_status_check;
ALTER TABLE IF EXISTS public.profiles ADD CONSTRAINT profiles_van_status_check 
  CHECK (van_status IN ('pending_bank_approval', 'active', 'rejected', 'suspended'));

