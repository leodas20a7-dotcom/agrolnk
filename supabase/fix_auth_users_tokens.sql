-- ============================================================================
-- AGROLNK AUTH REPAIR: RESOLVE "Database error querying schema" (GoTrue NULL Token Scan)
-- File: supabase/fix_auth_users_tokens.sql
-- Description:
--   Fixes GoTrue auth scanner crashing when internal token columns in auth.users
--   contain NULL instead of empty strings ('').
-- ============================================================================

UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
  confirmation_token IS NULL 
  OR recovery_token IS NULL
  OR email_change IS NULL 
  OR email_change_token_new IS NULL 
  OR email_change_token_current IS NULL
  OR phone_change IS NULL
  OR phone_change_token IS NULL
  OR reauthentication_token IS NULL;
