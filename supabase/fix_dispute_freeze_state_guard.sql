-- ============================================================================
-- AGROLNK SECURITY FIX: PREVENT FREEZING UNPAID OR ALREADY-SETTLED ORDERS
-- File: supabase/fix_dispute_freeze_state_guard.sql
-- Purpose:
--   Hardens public.freeze_order_on_dispute_atomic() so neither buyers nor admins
--   can freeze unpaid/pending orders or reopen already-settled/refunded orders.
-- Run this script in your Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.freeze_order_on_dispute_atomic(
    p_order_id TEXT,
    p_dispute_reason TEXT DEFAULT 'Quality / moisture grade discrepancy reported by buyer'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := false;
    v_escrow_status TEXT;
    v_order_status TEXT;
BEGIN
    v_is_privileged := public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role';

    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    IF NOT v_is_privileged AND v_caller_id IS DISTINCT FROM v_order.buyer_id THEN
        RAISE EXCEPTION 'Forbidden: Only the purchasing buyer or platform administrator can initiate an escrow freeze.';
    END IF;

    v_escrow_status := COALESCE(NULLIF(trim(v_order.escrow_status), ''), 'pending');
    v_order_status := COALESCE(NULLIF(trim(v_order.status), ''), 'pending');

    IF v_escrow_status IN ('released', 'refunded', 'settled')
       OR v_order_status IN ('completed', 'cancelled', 'refunded') THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot freeze order % because settlement is already closed (escrow_status: %, status: %).',
            v_order.order_number, v_escrow_status, v_order_status;
    END IF;

    IF v_escrow_status IN ('held', 'disputed') AND v_order_status = 'disputed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_disputed', true,
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'escrow_status', v_escrow_status,
            'status', 'disputed'
        );
    END IF;

    IF v_escrow_status NOT IN ('funded', 'escrow_secured', 'held')
       OR v_order_status IN ('pending', 'awaiting_freight_quote', 'freight_quoted') THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot freeze unpaid or unfunded order % (escrow_status: %, status: %). Only funded escrow orders can be placed on dispute hold.',
            v_order.order_number, v_escrow_status, v_order_status;
    END IF;

    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    UPDATE public.orders SET
        escrow_status = 'held',
        status = 'disputed',
        admin_call_notes = 'DISPUTE ACTIVE: ' || COALESCE(NULLIF(trim(p_dispute_reason), ''), 'Quality / moisture grade discrepancy reported by buyer'),
        updated_at = v_now
    WHERE id = v_order.id;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'escrow_status', 'held',
        'status', 'disputed'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.freeze_order_on_dispute_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.freeze_order_on_dispute_atomic(TEXT, TEXT) TO authenticated, service_role;
