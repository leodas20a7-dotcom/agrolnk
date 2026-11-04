-- ============================================================================
-- AGROLNK PRODUCTION SECURITY: COMPREHENSIVE FINANCIAL FIELD PROTECTION TRIGGER
-- File: supabase/secure_order_escrow_funding_trigger.sql
-- Description:
--   Guards all 12 sensitive financial, gateway, and escrow settlement columns
--   from direct client-side tampering.
--   Enforces that financial changes can ONLY be performed by Supabase Service Role
--   (Edge Functions) or authenticated Platform Admins.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_order_financial_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Permit all modifications by Admin, Supabase Service Role, or trusted internal procedures
    IF public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- 1. Block direct client manipulation of order prices, fee amounts, and financial balances
    IF (NEW.total_amount IS DISTINCT FROM OLD.total_amount) OR
       (NEW.price_per_unit IS DISTINCT FROM OLD.price_per_unit) OR
       (NEW.buyer_fee_amount IS DISTINCT FROM OLD.buyer_fee_amount) OR
       (NEW.seller_fee_amount IS DISTINCT FROM OLD.seller_fee_amount) OR
       (NEW.platform_commission_amount IS DISTINCT FROM OLD.platform_commission_amount) OR
       (NEW.net_seller_amount IS DISTINCT FROM OLD.net_seller_amount) THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct client modification of order financial values or platform fees is forbidden.';
    END IF;

    -- 2. Block direct client manipulation of payment gateway tracking identifiers
    IF (NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id) OR
       (NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id) OR
       (NEW.razorpay_signature IS DISTINCT FROM OLD.razorpay_signature) OR
       (NEW.razorpay_transfer_id IS DISTINCT FROM OLD.razorpay_transfer_id) THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct client modification of payment gateway identifiers is forbidden.';
    END IF;

    -- 3. Block direct client manipulation of escrow status and settlement status
    -- Only the server-side Edge Function (via service_role) or Platform Admin can update these
    IF (NEW.escrow_status IS DISTINCT FROM OLD.escrow_status) OR
       (NEW.settlement_status IS DISTINCT FROM OLD.settlement_status) THEN
        RAISE EXCEPTION 'Security Policy Violation: Escrow status and settlement status can only be updated via the secure payment verification gateway.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_financial_fields ON public.orders;
CREATE TRIGGER trg_protect_order_financial_fields
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_order_financial_fields();
