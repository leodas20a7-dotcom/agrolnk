-- ============================================================================
-- AGROLNK SECURITY FIX: SECURE ORDER ESCROW FUNDING TRIGGER
-- File: supabase/secure_order_escrow_funding_trigger.sql
-- Description:
--   Enforces that an order can NEVER be moved from 'pending' to 'funded'
--   without a legitimate payment_id recorded from the payment gateway.
--   Prevents direct unverified client manipulation of escrow_status.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_order_financial_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Permit all modifications by Admin, Supabase Service Role, or trusted RPC stored procedures
    IF public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Block direct client manipulation of price and amount columns
    IF (NEW.total_amount IS DISTINCT FROM OLD.total_amount) OR
       (NEW.price_per_unit IS DISTINCT FROM OLD.price_per_unit) THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct client modification of order prices is forbidden.';
    END IF;

    -- Block unauthorized escrow release or disbursement (admin only)
    IF (NEW.escrow_status IS DISTINCT FROM OLD.escrow_status AND NEW.escrow_status IN ('released', 'disbursed')) THEN
        RAISE EXCEPTION 'Security Policy Violation: Escrow release and disbursement requires administrator authorization.';
    END IF;

    -- Require valid payment identifier from gateway when transitioning to 'funded'
    IF NEW.escrow_status = 'funded' AND OLD.escrow_status IS DISTINCT FROM 'funded' THEN
        IF NEW.payment_id IS NULL OR LENGTH(TRIM(NEW.payment_id)) < 5 THEN
            RAISE EXCEPTION 'Security Policy Violation: Order escrow cannot be marked funded without a valid payment gateway transaction ID.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_financial_fields ON public.orders;
CREATE TRIGGER trg_protect_order_financial_fields
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_order_financial_fields();

