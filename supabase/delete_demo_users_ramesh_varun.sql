-- ============================================================================
-- AGROLNK: SAFELY REMOVE DUMMY DEMO ACCOUNTS (Ramesh & Varun)
-- File: supabase/delete_demo_users_ramesh_varun.sql
-- Description:
--   Deletes dummy demo accounts (ramesh@gmail.com and varun@gmail.com)
--   from both public.profiles and auth.users.
--   Leaves agrolnkadmin@gmail.com and info@kanikho.com (all 250 listings) 100% intact.
-- ============================================================================

DO $$
DECLARE
    v_target_emails TEXT[] := ARRAY['ramesh@gmail.com', 'varun@gmail.com'];
    v_ids TEXT[];
BEGIN
    -- 1. Collect target profile IDs for clean deletion
    SELECT ARRAY_AGG(id) INTO v_ids
    FROM public.profiles
    WHERE LOWER(email) = ANY(v_target_emails);

    -- 2. Safely delete from public.profiles
    DELETE FROM public.profiles 
    WHERE LOWER(email) = ANY(v_target_emails);

    -- 3. Safely delete from auth.users (cascades to auth.identities)
    DELETE FROM auth.users 
    WHERE LOWER(email) = ANY(v_target_emails)
       OR (v_ids IS NOT NULL AND id::text = ANY(v_ids));

    RAISE NOTICE 'Demo accounts ramesh@gmail.com and varun@gmail.com deleted safely!';
END $$;

