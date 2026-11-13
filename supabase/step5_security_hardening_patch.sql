-- ============================================================================
-- AGROLNK ANTI-TAMPERING & SECURITY HARDENING PATCH (STEP 5)
-- File: supabase/step5_security_hardening_patch.sql
-- Purpose:
--   Hardens PostgreSQL RPCs & Triggers against Chrome DevTools, Postman,
--   and 3rd-party Supabase REST client manipulation:
--   1. Adds protect_delivery_financial_fields() trigger on public.deliveries
--      (Blocks non-admins from releasing freight escrow or tampering with locked freight amounts)
--   2. Hardens submit_transporter_quote_atomic()
--      (Blocks quote changes once freight escrow is locked & verifies caller role)
--   3. Hardens lock_buyer_order_and_freight_escrow_atomic()
--      (Blocks locking combined escrow if freight_amount <= 0)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROTECT DELIVERIES FINANCIAL & ESCROW INTEGRITY TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_delivery_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Allow Admin, Service Role, or Trusted SECURITY DEFINER RPCs
    IF public.is_admin()
       OR (auth.jwt() ->> 'role') = 'service_role'
       OR auth.role() = 'service_role'
       OR current_setting('agrolnk.trusted_rpc', true) = 'true'
       OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Block non-admin/non-gateway from locking, funding, or releasing freight escrow
    IF (NEW.freight_escrow_status IS DISTINCT FROM OLD.freight_escrow_status)
       AND COALESCE(NEW.freight_escrow_status, '') IN ('escrow_locked', 'locked', 'funded', 'held', 'released') THEN
        RAISE EXCEPTION 'Security Policy Violation: Freight escrow state (%) can only be set by the verified payment gateway or AgroLnk Admin.', NEW.freight_escrow_status;
    END IF;

    IF (NEW.status IS DISTINCT FROM OLD.status)
       AND NEW.status = 'completed' THEN
        RAISE EXCEPTION 'Security Policy Violation: Only AgroLnk Admin can mark a delivery completed and settled.';
    END IF;

    -- Block client-side tampering with freight fee breakdown columns
    IF (NEW.freight_base_amount IS DISTINCT FROM OLD.freight_base_amount)
       OR (NEW.consignor_freight_fee IS DISTINCT FROM OLD.consignor_freight_fee)
       OR (NEW.total_freight_payable IS DISTINCT FROM OLD.total_freight_payable)
       OR (NEW.transporter_commission_fee IS DISTINCT FROM OLD.transporter_commission_fee)
       OR (NEW.transporter_net_payout IS DISTINCT FROM OLD.transporter_net_payout) THEN
        RAISE EXCEPTION 'Security Policy Violation: Freight commission and escrow breakdown columns cannot be modified directly.';
    END IF;

    -- Once freight escrow is locked, block anyone (except Admin/RPC) from altering the agreed freight_amount or winning transporter
    IF COALESCE(OLD.freight_escrow_status, '') IN ('locked', 'escrow_locked', 'released') THEN
        IF (NEW.freight_amount IS DISTINCT FROM OLD.freight_amount)
           OR (NEW.transporter_id IS DISTINCT FROM OLD.transporter_id) THEN
            RAISE EXCEPTION 'Security Policy Violation: Agreed freight quote and assigned carrier cannot be altered after escrow lock.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_delivery_financial_fields ON public.deliveries;
CREATE TRIGGER trg_protect_delivery_financial_fields
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_delivery_financial_fields();

-- ----------------------------------------------------------------------------
-- 2. HARDEN submit_transporter_quote_atomic AGAINST ROLE SPOOFING & POST-LOCK EDITS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_transporter_quote_atomic(
    p_delivery_id TEXT,
    p_transporter_id TEXT,
    p_transporter_name TEXT,
    p_vehicle_type TEXT,
    p_vehicle_number TEXT,
    p_driver_name TEXT,
    p_driver_phone TEXT,
    p_freight_amount NUMERIC,
    p_is_admin_assigned BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_delivery RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_existing_quotes JSONB;
    v_filtered_quotes JSONB := '[]'::jsonb;
    v_new_quote JSONB;
    v_elem JSONB;
    v_lowest_quote JSONB := NULL;
    v_lowest_amt NUMERIC := NULL;
    v_q_amt NUMERIC;
    v_effective_is_admin BOOLEAN;
BEGIN
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    IF p_freight_amount IS NULL OR p_freight_amount <= 0 THEN
        RAISE EXCEPTION 'Freight quote amount must be greater than zero.';
    END IF;

    -- Verify Admin flag cannot be spoofed by non-admin callers
    v_effective_is_admin := COALESCE(p_is_admin_assigned, false) AND public.is_admin();

    -- If authenticated user is neither transporter nor admin, reject
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()::text AND role IN ('transporter', 'admin')
        ) AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') NOT IN ('transporter', 'admin') THEN
            RAISE EXCEPTION 'Security Policy Violation: Only verified transporters or AgroLnk Admin can submit freight quotes.';
        END IF;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery job % not found.', p_delivery_id;
    END IF;

    IF (v_delivery.status NOT IN ('transport_requested', 'price_offered')
        OR COALESCE(v_delivery.freight_escrow_status, '') IN ('locked', 'escrow_locked', 'released'))
       AND NOT v_effective_is_admin THEN
        RAISE EXCEPTION 'This freight job is already locked in escrow and no longer accepting quotes.';
    END IF;

    v_existing_quotes := COALESCE(v_delivery.freight_quotes, '[]'::jsonb);

    -- Remove previous quote from the same transporter (if updating their bid)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_existing_quotes)
    LOOP
        IF COALESCE(v_elem->>'transporterId', '') <> COALESCE(p_transporter_id, '') THEN
            v_filtered_quotes := v_filtered_quotes || jsonb_build_array(v_elem);
        END IF;
    END LOOP;

    v_new_quote := jsonb_build_object(
        'transporterId', COALESCE(p_transporter_id, 'transporter'),
        'transporterName', COALESCE(p_transporter_name, 'Verified Transporter'),
        'vehicleType', COALESCE(p_vehicle_type, 'Commercial Freight Carrier'),
        'vehicleNumber', UPPER(TRIM(COALESCE(p_vehicle_number, ''))),
        'driverName', COALESCE(p_driver_name, 'Assigned Driver'),
        'driverPhone', COALESCE(p_driver_phone, ''),
        'freightAmount', ROUND(p_freight_amount, 2),
        'isAdminAssigned', v_effective_is_admin,
        'quotedAt', v_now
    );

    v_filtered_quotes := v_filtered_quotes || jsonb_build_array(v_new_quote);

    -- Determine the lowest quote across all submitted bids (if Admin assigned, Admin quote takes precedence)
    IF v_effective_is_admin THEN
        v_lowest_quote := v_new_quote;
        v_lowest_amt := ROUND(p_freight_amount, 2);
    ELSE
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_filtered_quotes)
        LOOP
            v_q_amt := (v_elem->>'freightAmount')::numeric;
            IF v_lowest_amt IS NULL OR v_q_amt < v_lowest_amt THEN
                v_lowest_amt := v_q_amt;
                v_lowest_quote := v_elem;
            END IF;
        END LOOP;
    END IF;

    -- Update delivery with full quote history and current winning (lowest) quote
    UPDATE public.deliveries SET
        freight_quotes = v_filtered_quotes,
        transporter_id = v_lowest_quote->>'transporterId',
        transporter_name = v_lowest_quote->>'transporterName',
        vehicle_type = v_lowest_quote->>'vehicleType',
        vehicle_number = v_lowest_quote->>'vehicleNumber',
        driver_name = v_lowest_quote->>'driverName',
        driver_phone = v_lowest_quote->>'driverPhone',
        freight_amount = v_lowest_amt,
        freight_base_amount = v_lowest_amt,
        admin_assigned_quote = COALESCE(v_effective_is_admin, v_delivery.admin_assigned_quote, false),
        status = 'price_offered',
        updated_at = v_now
    WHERE id = v_delivery.id;

    -- Sync lowest freight quote to linked order so Buyer immediately sees it at checkout
    UPDATE public.orders SET
        freight_amount = v_lowest_amt,
        freight_fee_amount = ROUND(v_lowest_amt * 0.0025, 2),
        grand_total_amount = ROUND(total_amount + COALESCE(buyer_fee_amount, ROUND(total_amount * 0.0025, 2)) + v_lowest_amt + ROUND(v_lowest_amt * 0.0025, 2), 2),
        status = CASE WHEN status = 'awaiting_freight_quote' THEN 'freight_quoted' ELSE status END,
        escrow_status = CASE WHEN escrow_status = 'awaiting_freight_quote' THEN 'freight_quoted' ELSE escrow_status END,
        updated_at = v_now
    WHERE id = v_delivery.order_id OR order_number = v_delivery.order_number;

    -- Notify Buyer that a competitive freight quote is ready
    IF v_delivery.buyer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_delivery.buyer_id,
            'buyer',
            'Lowest Freight Quote Ready: ₹' || v_lowest_amt || ' (' || v_delivery.order_number || ')',
            'Verified carrier (' || (v_lowest_quote->>'transporterName') || ') quoted ₹' || v_lowest_amt || ' for ' || v_delivery.commodity || '. Complete combined escrow payment to confirm order and dispatch.',
            'delivery',
            '/buyer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', v_delivery.id,
        'lowest_freight_amount', v_lowest_amt,
        'lowest_quote', v_lowest_quote,
        'total_quotes_count', jsonb_array_length(v_filtered_quotes)
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. HARDEN lock_buyer_order_and_freight_escrow_atomic AGAINST UNQUOTED LOCKS
-- ----------------------------------------------------------------------------
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

    -- Verify only the order's Buyer, Admin, or Service Role can operate on this order
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
    v_buyer_fee := COALESCE(NULLIF(v_order.buyer_fee_amount, 0), ROUND(v_order.total_amount * 0.0025, 2));
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
                'Buyer locked ₹' || v_order.total_amount || ' produce payment + ₹' || v_freight_amt || ' freight in AgroLnk Escrow. Assigned vehicle (' || COALESCE(v_delivery.vehicle_number, 'Carrier') || ') will arrive for pickup.',
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
                'Your quote of ₹' || v_freight_amt || ' for ' || v_order.commodity || ' won! Freight is secured in AgroLnk Escrow. Pickup address is now unlocked in My Active Trips.',
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
