-- ============================================================================
-- AGROLNK SECURITY FIX: REVOKE VISITOR WRITE RIGHTS & SECURE RESET RPC
-- File: supabase/lock_down_visitor_rights_and_secure_reset.sql
-- ============================================================================

-- 1. REVOKE all change and delete privileges from unauthenticated (anon) visitors
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE 
    public.orders,
    public.listings,
    public.deliveries,
    public.financing_requests,
    public.warehouse_receipts,
    public.warehouses,
    public.auctions,
    public.auction_bids,
    public.user_bank_accounts,
    public.chat_messages,
    public.notifications,
    public.inspections,
    public.commodities
FROM anon;

-- Revoke TRUNCATE across public schema for both anon and normal authenticated users
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Ensure authenticated users have standard DML permissions subject to RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE 
    public.orders,
    public.listings,
    public.deliveries,
    public.financing_requests,
    public.warehouse_receipts,
    public.warehouses,
    public.auctions,
    public.auction_bids,
    public.user_bank_accounts,
    public.chat_messages,
    public.notifications,
    public.inspections,
    public.commodities
TO authenticated;

-- Allow anon only SELECT on public marketplace tables (listings, auctions, commodities)
GRANT SELECT ON TABLE 
    public.listings,
    public.auctions,
    public.auction_bids,
    public.commodities
TO anon;

-- 2. CREATE SECURE SERVER-SIDE ADMIN-ONLY DATA RESET RPC
CREATE OR REPLACE FUNCTION public.admin_reset_testing_data_atomic()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_calling_email TEXT;
    v_calling_role TEXT;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- Extract caller identity from JWT
    v_calling_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
    v_calling_role := LOWER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', ''));

    -- Strict server-side verification: Must be platform admin
    IF public.is_admin() 
       OR v_calling_email IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
       OR v_calling_role = 'admin' THEN
        v_is_authorized := TRUE;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Security Policy Violation: Only platform administrators can trigger platform data resets.';
    END IF;

    -- Atomically wipe tables in child-to-parent order to respect foreign key constraints
    DELETE FROM public.auction_bids;
    DELETE FROM public.inspections;
    DELETE FROM public.deliveries;
    DELETE FROM public.financing_requests;
    DELETE FROM public.orders;
    DELETE FROM public.warehouse_receipts;
    DELETE FROM public.warehouses;
    DELETE FROM public.auctions;
    DELETE FROM public.listings;
    DELETE FROM public.commodities;
    DELETE FROM public.user_bank_accounts;
    DELETE FROM public.chat_messages;
    DELETE FROM public.notifications;

    -- Delete non-admin profiles, preserving master admin and Kanikho FPO
    DELETE FROM public.profiles
    WHERE role <> 'admin'
      AND LOWER(email) NOT IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com', 'info@kanikho.com');

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'AgroLnk system testing data successfully wiped by administrator.',
        'timestamp', NOW()
    );
END;
$$;

-- Revoke execute from public and anon; grant only to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.admin_reset_testing_data_atomic() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_testing_data_atomic() TO authenticated, service_role;

