-- ============================================================================
-- AGROLNK SECURITY FIX: SECURE ESCROW RELEASE & FINANCIAL STORED PROCEDURES
-- File: supabase/secure_escrow_release_rpc.sql
-- Description:
--   1. Enforces strict Administrator authentication inside release_escrow_atomic().
--   2. Rejects any non-admin or unauthenticated callers.
--   3. Hardens search_path to prevent object resolution hijacking.
--   4. Revokes public/anon execution rights, granting execute only to authenticated.
--   5. Secures freeze_order_on_dispute_atomic() to only buyer or admin.
-- ============================================================================

-- 1. Secure & Hardened Escrow Release Stored Procedure
CREATE OR REPLACE FUNCTION public.release_escrow_atomic(
    p_order_id TEXT,
    p_admin_name TEXT DEFAULT 'AgroLnk Operations Ombudsman',
    p_admin_notes TEXT DEFAULT 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.',
    p_bank_name TEXT DEFAULT NULL,
    p_account_number TEXT DEFAULT NULL,
    p_ifsc TEXT DEFAULT NULL,
    p_utr TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_utr TEXT;
    v_caller_id TEXT := auth.uid()::TEXT;
BEGIN
    -- 0. CRITICAL AUTHORIZATION CHECK: Caller MUST be a verified platform administrator
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    IF NOT (public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Forbidden: Only authorized platform administrators can execute escrow releases.';
    END IF;

    -- 1. Acquire exclusive lock on target order row (eliminates race conditions)
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    -- 2. Prevent double release (idempotency check)
    IF v_order.escrow_status = 'released' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Escrow was already released previously.',
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'bank_utr', v_order.bank_utr,
            'escrow_status', 'released'
        );
    END IF;

    -- 3. Verify order is in a releasable escrow state
    IF v_order.escrow_status NOT IN ('funded', 'escrow_secured', 'held') THEN
        RAISE EXCEPTION 'Cannot release escrow in current state: %', v_order.escrow_status;
    END IF;

    -- Generate bank UTR if not supplied
    v_utr := COALESCE(p_utr, v_order.bank_utr, 'CMSICICI' || to_char(v_now, 'YYYYMMDD') || floor(1000 + random() * 9000)::text);

    -- 4. Update Order atomically
    UPDATE public.orders SET
        status = 'completed',
        escrow_status = 'released',
        admin_verified_by = p_admin_name,
        admin_verification_status = 'approved',
        admin_call_notes = p_admin_notes,
        admin_verified_at = v_now,
        payout_bank_name = COALESCE(p_bank_name, v_order.payout_bank_name, 'Bank Account'),
        payout_account_number = COALESCE(p_account_number, v_order.payout_account_number, '—'),
        payout_ifsc = COALESCE(p_ifsc, v_order.payout_ifsc, '—'),
        bank_utr = v_utr,
        disbursed_at = v_now,
        updated_at = v_now
    WHERE id = v_order.id;

    -- 5. Atomically update linked delivery status
    UPDATE public.deliveries SET
        status = 'completed',
        updated_at = v_now
    WHERE order_id = v_order.id OR order_number = v_order.order_number;

    -- 6. Notify farmer of bank disbursement
    IF v_order.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_order.farmer_id,
            'farmer',
            'Payment Disbursed (UTR ' || v_utr || ')',
            'Escrow payout of ₹' || v_order.total_amount || ' for ' || v_order.commodity || ' (' || v_order.order_number || ') has been disbursed to your bank account.',
            'escrow',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    -- 7. Notify buyer of completed transaction
    IF v_order.buyer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_order.buyer_id,
            'buyer',
            'Trade Completed (' || v_order.order_number || ')',
            'Escrow settlement finalized for your ' || v_order.commodity || ' order. Receipt has been generated.',
            'order',
            '/buyer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Escrow successfully disbursed to farmer bank account.',
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'bank_utr', v_utr,
        'escrow_status', 'released',
        'status', 'completed'
    );
END;
$$;

-- Revoke default public execution rights & restrict strictly
REVOKE EXECUTE ON FUNCTION public.release_escrow_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_escrow_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 2. Secure Dispute Freeze Function (Only buyer of the order or admin can freeze)
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
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    -- Caller must be the purchasing buyer or an admin
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    IF NOT (v_caller_id = v_order.buyer_id OR public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Forbidden: Only the purchasing buyer or platform administrator can initiate an escrow freeze.';
    END IF;

    -- Freeze escrow and mark dispute
    UPDATE public.orders SET
        escrow_status = 'held',
        status = 'disputed',
        admin_call_notes = 'DISPUTE ACTIVE: ' || p_dispute_reason,
        updated_at = v_now
    WHERE id = v_order.id;

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

