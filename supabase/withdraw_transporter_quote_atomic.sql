-- ============================================================================
-- AgrowLink Atomic Transporter Quote Withdrawal RPC
-- Allows a transporter to withdraw their unaccepted freight quote before
-- escrow is locked, recomputes the next lowest quote (or reopens the load),
-- and notifies whoever booked the transport with a short reason.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.withdraw_transporter_quote_atomic(
    p_delivery_id TEXT,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_delivery RECORD;
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := (public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role');
    v_caller_role TEXT;
    v_caller_name TEXT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_existing_quotes JSONB;
    v_filtered_quotes JSONB := '[]'::jsonb;
    v_removed_quote JSONB := NULL;
    v_elem JSONB;
    v_lowest_quote JSONB := NULL;
    v_lowest_amt NUMERIC := NULL;
    v_q_amt NUMERIC;
    v_booker_id TEXT;
    v_booker_role TEXT;
    v_clean_reason TEXT;
    v_booker_link TEXT;
BEGIN
    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required to withdraw a freight quote.';
    END IF;

    IF NOT v_is_privileged THEN
        SELECT LOWER(COALESCE(role, '')), COALESCE(name, 'Transporter')
        INTO v_caller_role, v_caller_name
        FROM public.profiles
        WHERE id = v_caller_id;

        IF v_caller_role <> 'transporter' THEN
            RAISE EXCEPTION 'Forbidden: Only registered Transporter accounts can withdraw freight quotes.';
        END IF;
    ELSE
        v_caller_name := 'Transporter';
    END IF;

    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery job % not found.', p_delivery_id;
    END IF;

    IF v_delivery.status NOT IN ('transport_requested', 'price_offered')
       OR COALESCE(v_delivery.freight_escrow_status, 'unpaid') IN ('locked', 'escrow_locked', 'released') THEN
        RAISE EXCEPTION 'Cannot withdraw quote: Freight escrow is already locked or trip is assigned.';
    END IF;

    v_existing_quotes := COALESCE(v_delivery.freight_quotes, '[]'::jsonb);

    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_existing_quotes)
    LOOP
        IF COALESCE(v_elem->>'transporterId', '') = COALESCE(v_caller_id, '') THEN
            v_removed_quote := v_elem;
        ELSE
            v_filtered_quotes := v_filtered_quotes || jsonb_build_array(v_elem);
        END IF;
    END LOOP;

    IF v_removed_quote IS NULL THEN
        PERFORM set_config('agrolnk.trusted_rpc', 'false', true);
        RAISE EXCEPTION 'No active quote from your account was found on this load.';
    END IF;

    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_filtered_quotes)
    LOOP
        v_q_amt := (v_elem->>'freightAmount')::numeric;
        IF v_lowest_amt IS NULL OR v_q_amt < v_lowest_amt THEN
            v_lowest_amt := v_q_amt;
            v_lowest_quote := v_elem;
        END IF;
    END LOOP;

    IF v_lowest_quote IS NOT NULL THEN
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
            status = 'price_offered',
            updated_at = v_now
        WHERE id = v_delivery.id;

        UPDATE public.orders SET
            freight_amount = v_lowest_amt,
            freight_fee_amount = ROUND(v_lowest_amt * 0.0025, 2),
            grand_total_amount = ROUND(total_amount + COALESCE(buyer_fee_amount, ROUND(total_amount * 0.0025, 2)) + v_lowest_amt + ROUND(v_lowest_amt * 0.0025, 2), 2),
            updated_at = v_now
        WHERE id = v_delivery.order_id OR order_number = v_delivery.order_number;
    ELSE
        UPDATE public.deliveries SET
            freight_quotes = '[]'::jsonb,
            transporter_id = NULL,
            transporter_name = NULL,
            vehicle_type = NULL,
            vehicle_number = NULL,
            driver_name = NULL,
            driver_phone = NULL,
            freight_amount = 0,
            freight_base_amount = 0,
            admin_assigned_quote = false,
            status = 'transport_requested',
            updated_at = v_now
        WHERE id = v_delivery.id;

        UPDATE public.orders SET
            freight_amount = 0,
            freight_fee_amount = 0,
            grand_total_amount = ROUND(total_amount + COALESCE(buyer_fee_amount, ROUND(total_amount * 0.0025, 2)), 2),
            status = CASE WHEN status = 'freight_quoted' THEN 'awaiting_freight_quote' ELSE status END,
            escrow_status = CASE WHEN escrow_status = 'freight_quoted' THEN 'awaiting_freight_quote' ELSE escrow_status END,
            updated_at = v_now
        WHERE id = v_delivery.order_id OR order_number = v_delivery.order_number;
    END IF;

    v_booker_id := COALESCE(
        NULLIF(TRIM(v_delivery.freight_payer_id), ''),
        NULLIF(TRIM(v_delivery.farmer_id), ''),
        NULLIF(TRIM(v_delivery.buyer_id), '')
    );
    v_booker_role := COALESCE(NULLIF(TRIM(v_delivery.freight_payer_role), ''), 'farmer');
    v_clean_reason := COALESCE(NULLIF(TRIM(p_reason), ''), 'Truck unavailable');
    v_booker_link := CASE
        WHEN v_booker_role = 'buyer' THEN '/buyer-deliveries'
        WHEN v_booker_role = 'warehouse' THEN '/warehouse-requests'
        ELSE '/farmer-deliveries'
    END;

    IF v_booker_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_booker_id,
            v_booker_role,
            'Transporter Withdrew Quote (' || COALESCE(v_delivery.delivery_number, v_delivery.order_number, 'Load') || ')',
            COALESCE(v_removed_quote->>'transporterName', v_caller_name) || ' cancelled their ₹' || COALESCE(v_removed_quote->>'freightAmount', '0') || ' quote (' || v_clean_reason || '). ' ||
            CASE
                WHEN v_lowest_amt IS NOT NULL THEN 'Next lowest quote ₹' || v_lowest_amt || ' is available.'
                ELSE 'Your load is still open for new quotes from other transporters.'
            END,
            'warning',
            v_booker_link,
            false,
            v_now
        );
    END IF;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', v_delivery.id,
        'remaining_quotes_count', jsonb_array_length(v_filtered_quotes),
        'lowest_freight_amount', v_lowest_amt
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.withdraw_transporter_quote_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_transporter_quote_atomic(TEXT, TEXT) TO authenticated, service_role;
