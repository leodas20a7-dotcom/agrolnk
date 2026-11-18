-- ============================================================================
-- AGROWLINK FIX: Ensure public.orders has buyer_fee_amount & freight columns
-- File: supabase/fix_orders_missing_fee_columns.sql
-- Fixes error: record "v_order" has no field "buyer_fee_amount"
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_commission_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_seller_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_arrival BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_arrival_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_verified_at TIMESTAMP WITH TIME ZONE;

-- Refresh lock_buyer_order_and_freight_escrow_atomic so v_order accesses are safe
CREATE OR REPLACE FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(
    p_order_id TEXT,
    p_payment_mode TEXT DEFAULT 'direct_razorpay',
    p_payment_id TEXT DEFAULT NULL,
    p_bank_utr TEXT DEFAULT NULL,
    p_auto_verified BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_delivery RECORD;
    v_fin RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_freight_amt NUMERIC;
    v_freight_fee NUMERIC;
    v_transporter_fee NUMERIC;
    v_transporter_net NUMERIC;
    v_buyer_fee NUMERIC;
    v_grand_total NUMERIC;
    v_is_privileged BOOLEAN;
    v_is_bank_pending BOOLEAN;
    v_order_escrow_status TEXT;
    v_order_status TEXT;
    v_del_status TEXT;
    v_del_escrow_status TEXT;
BEGIN
    v_is_privileged := (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
    );

    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    IF auth.uid() IS NOT NULL AND NOT v_is_privileged THEN
        IF v_order.buyer_id IS NOT NULL AND v_order.buyer_id <> auth.uid()::text THEN
            RAISE EXCEPTION 'Security Policy Violation: You can only lock escrow for your own purchase orders.';
        END IF;
    END IF;

    IF COALESCE(v_order.escrow_status, '') IN ('funded', 'held', 'escrow_secured', 'released') THEN
        SELECT * INTO v_delivery
        FROM public.deliveries
        WHERE order_id = v_order.id OR order_number = v_order.order_number
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_delivery.id IS NULL OR COALESCE(v_delivery.freight_escrow_status, '') IN ('escrow_locked', 'locked', 'released') THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_funded', true,
                'order_id', v_order.id,
                'order_number', v_order.order_number,
                'delivery_id', v_delivery.id,
                'freight_amount', COALESCE(v_order.freight_amount, v_delivery.freight_amount, 0),
                'grand_total_amount', COALESCE(v_order.grand_total_amount, v_order.total_amount),
                'escrow_status', v_order.escrow_status,
                'status', v_order.status
            );
        END IF;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE order_id = v_order.id OR order_number = v_order.order_number
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_freight_amt := COALESCE(v_delivery.freight_amount, v_order.freight_amount, 0);

    IF v_freight_amt IS NULL OR v_freight_amt <= 0 THEN
        RAISE EXCEPTION 'Cannot lock combined escrow before a verified transporter freight quote (> 0) is recorded.';
    END IF;

    v_freight_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_net := ROUND(v_freight_amt - v_transporter_fee, 2);
    v_buyer_fee := COALESCE(
        NULLIF((to_jsonb(v_order)->>'buyer_fee_amount')::numeric, 0),
        NULLIF((to_jsonb(v_order)->>'buyer_fee')::numeric, 0),
        ROUND(v_order.total_amount * 0.0025, 2)
    );
    v_grand_total := ROUND(v_order.total_amount + v_buyer_fee + v_freight_amt + v_freight_fee, 2);

    IF p_payment_mode = 'trade_credit' THEN
        SELECT * INTO v_fin
        FROM public.financing_requests
        WHERE (order_id = v_order.id OR order_number = v_order.order_number)
          AND (
              v_is_privileged
              OR applicant_id = v_order.buyer_id
              OR (auth.uid() IS NOT NULL AND applicant_id = auth.uid()::text)
          )
        ORDER BY created_at DESC
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Security Policy Violation: No trade credit financing request exists for order %.', v_order.order_number;
        END IF;

        v_order_escrow_status := 'financing_pending';
        v_order_status := 'order_placed';

        IF v_is_privileged OR COALESCE(v_fin.status, '') IN ('approved', 'disbursed', 'escrow_secured') THEN
            v_del_status := 'assigned';
            v_del_escrow_status := 'escrow_locked';
        ELSE
            v_del_status := COALESCE(v_delivery.status, 'price_offered');
            v_del_escrow_status := 'financing_pending';
        END IF;
    ELSIF p_payment_mode = 'escrow_van' THEN
        v_is_bank_pending := NOT (v_is_privileged AND COALESCE(p_auto_verified, false));
        IF v_is_bank_pending THEN
            v_order_escrow_status := 'pending';
            v_order_status := 'pending';
            v_del_status := 'price_offered';
            v_del_escrow_status := 'pending_bank_check';
        ELSE
            v_order_escrow_status := 'funded';
            v_order_status := 'order_placed';
            v_del_status := 'assigned';
            v_del_escrow_status := 'escrow_locked';
        END IF;
    ELSE
        IF NOT v_is_privileged AND COALESCE(v_order.escrow_status, '') NOT IN ('funded', 'held', 'escrow_secured') THEN
            RAISE EXCEPTION 'Security Policy Violation: Direct client funding of Razorpay escrow is forbidden. Payment must be verified server-side via the payment gateway.';
        END IF;

        v_order_escrow_status := 'funded';
        v_order_status := 'order_placed';
        v_del_status := 'assigned';
        v_del_escrow_status := 'escrow_locked';
    END IF;

    UPDATE public.orders SET
        freight_amount = v_freight_amt,
        freight_fee_amount = v_freight_fee,
        grand_total_amount = v_grand_total,
        payment_mode = p_payment_mode,
        payment_id = COALESCE(p_payment_id, payment_id),
        bank_utr = COALESCE(p_bank_utr, bank_utr),
        escrow_status = v_order_escrow_status,
        settlement_status = CASE WHEN v_order_escrow_status = 'funded' THEN 'captured_on_hold' ELSE COALESCE(settlement_status, 'pending_deposit') END,
        status = v_order_status,
        updated_at = v_now
    WHERE id = v_order.id;

    IF v_delivery.id IS NOT NULL THEN
        UPDATE public.deliveries SET
            status = v_del_status,
            freight_escrow_status = v_del_escrow_status,
            freight_payer_id = v_order.buyer_id,
            freight_payer_role = 'buyer',
            freight_base_amount = v_freight_amt,
            consignor_freight_fee = v_freight_fee,
            total_freight_payable = ROUND(v_freight_amt + v_freight_fee, 2),
            transporter_commission_fee = v_transporter_fee,
            transporter_net_payout = v_transporter_net,
            freight_payment_mode = p_payment_mode,
            freight_bank_utr = COALESCE(p_bank_utr, p_payment_id),
            freight_deposited_at = CASE WHEN v_del_escrow_status = 'escrow_locked' THEN v_now ELSE freight_deposited_at END,
            updated_at = v_now
        WHERE id = v_delivery.id;
    END IF;

    IF v_order_escrow_status = 'funded' AND v_del_escrow_status = 'escrow_locked' THEN
        IF v_order.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_order.farmer_id,
                'farmer',
                'Order & Freight Confirmed (' || v_order.order_number || ')',
                'Buyer locked ₹' || v_order.total_amount || ' produce payment + ₹' || v_freight_amt || ' freight in AgrowLink Escrow. Assigned vehicle (' || COALESCE(v_delivery.vehicle_number, 'Carrier') || ') will arrive for pickup.',
                'order',
                '/farmer-orders',
                false,
                v_now
            );
        END IF;

        IF v_delivery.transporter_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || (extract(epoch from v_now)::bigint + 1) || '_' || substr(md5(random()::text), 1, 6),
                v_delivery.transporter_id,
                'transporter',
                'Freight Quote Won & Escrow Locked! (' || v_delivery.delivery_number || ')',
                'Your quote of ₹' || v_freight_amt || ' for ' || v_order.commodity || ' won! Freight is secured in AgrowLink Escrow. Pickup address is now unlocked in My Active Trips.',
                'delivery',
                '/transporter-dashboard',
                false,
                v_now
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'delivery_id', v_delivery.id,
        'freight_amount', v_freight_amt,
        'grand_total_amount', v_grand_total,
        'escrow_status', v_order_escrow_status,
        'status', v_order_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;
