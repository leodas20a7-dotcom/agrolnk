-- ============================================================================
-- AGROLNK SECURITY & WORKFLOW FIX: ATOMIC REVERSE DEMAND OFFER ACCEPTANCE
-- File: supabase/fix_reverse_demand_accept_atomic.sql
-- Fixes:
--   1. Prevents reverse demand orders from starting as status = 'order_placed'
--      while escrow_status = 'pending' (they now start in 'awaiting_freight_quote').
--   2. Computes authoritative 0.25% Buyer + 0.25% Seller platform fees (0.50% take-rate),
--      net_seller_amount, and grand_total_amount server-side.
--   3. Atomically creates a linked public.deliveries 30-minute freight RFQ
--      ('transport_requested') and notifies verified transporters + winning farmer.
--   4. Updates demand_offers ('accepted' + rejects competing offers) and
--      buyer_demands ('awarded') atomically in one transaction with buyer auth check.
-- Run this complete script in your Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_demand_offer_atomic(
    p_demand_id TEXT,
    p_offer_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_demand RECORD;
    v_offer RECORD;
    v_farmer RECORD;
    v_transporter RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_rfq_expiry TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '30 minutes';
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := false;
    v_qty NUMERIC;
    v_unit_price NUMERIC;
    v_unit TEXT;
    v_total_amt NUMERIC;
    v_buyer_fee NUMERIC;
    v_seller_fee NUMERIC;
    v_platform_fee NUMERIC;
    v_net_seller NUMERIC;
    v_grand_total NUMERIC;
    v_order_id TEXT;
    v_order_num TEXT;
    v_delivery_id TEXT;
    v_delivery_num TEXT;
    v_pickup_location JSONB;
    v_delivery_location JSONB;
BEGIN
    v_is_privileged := public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role';

    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required to accept a demand offer.';
    END IF;

    -- 1. Lock target buyer demand row
    SELECT * INTO v_demand
    FROM public.buyer_demands
    WHERE id = p_demand_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Requirement % not found.', p_demand_id;
    END IF;

    IF NOT v_is_privileged AND v_caller_id IS DISTINCT FROM v_demand.buyer_id THEN
        RAISE EXCEPTION 'Forbidden: Only the buyer who posted this demand or an administrator can accept an offer.';
    END IF;

    IF COALESCE(v_demand.status, 'open') <> 'open' THEN
        RAISE EXCEPTION 'Demand % is already % and can no longer accept offers.',
            COALESCE(v_demand.demand_number, p_demand_id), v_demand.status;
    END IF;

    -- 2. Lock target supplier offer row
    SELECT * INTO v_offer
    FROM public.demand_offers
    WHERE id = p_offer_id AND demand_id = p_demand_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer % not found for demand %.', p_offer_id, p_demand_id;
    END IF;

    IF COALESCE(v_offer.status, 'submitted') <> 'submitted' THEN
        RAISE EXCEPTION 'Offer % is already % and cannot be accepted.', p_offer_id, v_offer.status;
    END IF;

    IF v_offer.farmer_id IS NOT NULL AND v_demand.buyer_id IS NOT NULL AND v_offer.farmer_id = v_demand.buyer_id THEN
        RAISE EXCEPTION 'Security Policy Violation: You cannot accept your own supply offer.';
    END IF;

    -- 3. Authoritative quantity, price & 0.25% + 0.25% platform commission math
    v_qty := COALESCE(v_offer.quantity_offered, v_demand.quantity, 0);
    v_unit_price := COALESCE(v_offer.offer_price, 0);
    IF v_qty <= 0 OR v_unit_price <= 0 THEN
        RAISE EXCEPTION 'Invalid offer quantity (%) or unit price (%).', v_qty, v_unit_price;
    END IF;

    v_unit := COALESCE(NULLIF(trim(v_offer.unit), ''), NULLIF(trim(v_demand.unit), ''), 'kg');
    v_total_amt := ROUND(v_qty * v_unit_price, 2);
    v_buyer_fee := ROUND(v_total_amt * 0.0025, 2);
    v_seller_fee := ROUND(v_total_amt * 0.0025, 2);
    v_platform_fee := ROUND(v_buyer_fee + v_seller_fee, 2);
    v_net_seller := ROUND(v_total_amt - v_seller_fee, 2);
    v_grand_total := ROUND(v_total_amt + v_buyer_fee, 2);

    -- 4. Resolve pickup & delivery locations
    SELECT state, district, village, full_name, name
    INTO v_farmer
    FROM public.profiles
    WHERE id = v_offer.farmer_id
    LIMIT 1;

    v_delivery_location := jsonb_build_object(
        'state', COALESCE(v_demand.delivery_state, ''),
        'district', COALESCE(v_demand.delivery_district, ''),
        'pincode', COALESCE(v_demand.delivery_pincode, ''),
        'address', COALESCE(NULLIF(trim(v_demand.delivery_address), ''), NULLIF(trim(v_demand.delivery_district), ''), 'Buyer Delivery Hub'),
        'phone', COALESCE(v_demand.buyer_phone, '')
    );

    v_pickup_location := jsonb_build_object(
        'state', COALESCE(NULLIF(trim(v_farmer.state), ''), v_demand.delivery_state, ''),
        'district', COALESCE(NULLIF(trim(v_farmer.district), ''), v_demand.delivery_district, ''),
        'address', COALESCE(NULLIF(trim(v_farmer.village), ''), NULLIF(trim(v_farmer.district), ''), 'Verified Producer') || ' Farmgate Aggregation Hub'
    );

    -- 5. Authorize protected triggers strictly after all validation checks pass
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    v_order_id := 'ord_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
    v_delivery_id := 'del_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_delivery_num := 'DEL-' || floor(1000 + random() * 9000)::text;

    -- 6. Insert Order in 'awaiting_freight_quote' state with full platform fee breakdown
    INSERT INTO public.orders (
        id, order_number, listing_id, auction_id,
        buyer_id, buyer_name, farmer_id, farmer_name,
        commodity, variety, grade, quantity, unit,
        price_per_unit, total_amount,
        buyer_fee_amount, seller_fee_amount, platform_commission_amount, net_seller_amount,
        freight_amount, freight_fee_amount, grand_total_amount, rfq_expires_at,
        delivery_location, state, district,
        escrow_status, settlement_status, status, created_at, updated_at
    ) VALUES (
        v_order_id, v_order_num, NULL, NULL,
        v_demand.buyer_id, COALESCE(NULLIF(trim(v_demand.buyer_name), ''), 'Buyer Partner'),
        v_offer.farmer_id, COALESCE(NULLIF(trim(v_offer.farmer_name), ''), NULLIF(trim(v_farmer.full_name), ''), NULLIF(trim(v_farmer.name), ''), 'Farmer Partner'),
        v_demand.commodity, COALESCE(v_demand.variety, 'None'), COALESCE(v_demand.grade, 'A'),
        v_qty, v_unit, v_unit_price, v_total_amt,
        v_buyer_fee, v_seller_fee, v_platform_fee, v_net_seller,
        0, 0, v_grand_total, v_rfq_expiry,
        v_delivery_location, COALESCE(v_demand.delivery_state, ''), COALESCE(v_demand.delivery_district, ''),
        'awaiting_freight_quote', 'pending_deposit', 'awaiting_freight_quote', v_now, v_now
    );

    -- 7. Insert linked 30-Minute Competitive Freight RFQ in public.deliveries
    INSERT INTO public.deliveries (
        id, delivery_number, order_id, order_number,
        farmer_id, farmer_name, buyer_id, buyer_name,
        commodity, grade, variety, quantity, unit,
        pickup_location, delivery_location, estimated_distance_km, freight_amount,
        status, freight_escrow_status, rfq_expires_at, freight_quotes,
        freight_payer_id, freight_payer_role,
        pickup_otp, delivery_otp, created_at, updated_at
    ) VALUES (
        v_delivery_id, v_delivery_num, v_order_id, v_order_num,
        v_offer.farmer_id, COALESCE(NULLIF(trim(v_offer.farmer_name), ''), 'Farmer Partner'),
        v_demand.buyer_id, COALESCE(NULLIF(trim(v_demand.buyer_name), ''), 'Buyer Partner'),
        v_demand.commodity, COALESCE(v_demand.grade, 'A'), COALESCE(v_demand.variety, 'None'),
        v_qty, v_unit,
        v_pickup_location, v_delivery_location, NULL, NULL,
        'transport_requested', 'unfunded', v_rfq_expiry, '[]'::jsonb,
        v_demand.buyer_id, 'buyer',
        floor(1000 + random() * 9000)::text,
        floor(1000 + random() * 9000)::text,
        v_now, v_now
    );

    -- 8. Atomically accept winning offer, close competing offers, and mark demand awarded
    UPDATE public.demand_offers SET
        status = 'accepted'
    WHERE id = v_offer.id;

    UPDATE public.demand_offers SET
        status = 'rejected'
    WHERE demand_id = p_demand_id
      AND id <> v_offer.id
      AND COALESCE(status, 'submitted') = 'submitted';

    UPDATE public.buyer_demands SET
        status = 'awarded',
        updated_at = v_now
    WHERE id = p_demand_id;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    -- 9. Broadcast 30-Minute Freight RFQ notifications to all verified transporters
    FOR v_transporter IN
        SELECT id FROM public.profiles WHERE role = 'transporter'
    LOOP
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text || v_transporter.id), 1, 8),
            v_transporter.id,
            'transporter',
            'New 30-Min Freight RFQ: ' || v_demand.commodity,
            'Quote requested for ' || v_qty || ' ' || v_unit || ' from ' || COALESCE(NULLIF(trim(v_pickup_location->>'district'), ''), 'Origin') || ', ' || COALESCE(v_pickup_location->>'state', '') || ' to ' || COALESCE(NULLIF(trim(v_demand.delivery_district), ''), 'Destination') || ', ' || COALESCE(v_demand.delivery_state, '') || '. Lowest bid wins!',
            'delivery',
            '/transporter-dashboard',
            false,
            v_now
        );
    END LOOP;

    -- 10. Notify winning Farmer that supply quote was accepted & freight RFQ is live
    IF v_offer.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text || v_offer.farmer_id), 1, 8),
            v_offer.farmer_id,
            'farmer',
            'Demand Offer Accepted (' || v_order_num || ')',
            'Your offer of ₹' || v_unit_price || '/' || v_unit || ' for ' || v_qty || ' ' || v_unit || ' ' || v_demand.commodity || ' was accepted! Freight quotes are being collected before buyer escrow funding.',
            'order',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_order_id,
        'order_id', v_order_id,
        'order_number', v_order_num,
        'delivery_id', v_delivery_id,
        'delivery_number', v_delivery_num,
        'demand_id', p_demand_id,
        'offer_id', v_offer.id,
        'buyer_id', v_demand.buyer_id,
        'buyer_name', COALESCE(NULLIF(trim(v_demand.buyer_name), ''), 'Buyer Partner'),
        'farmer_id', v_offer.farmer_id,
        'farmer_name', COALESCE(NULLIF(trim(v_offer.farmer_name), ''), 'Farmer Partner'),
        'commodity', v_demand.commodity,
        'variety', COALESCE(v_demand.variety, 'None'),
        'grade', COALESCE(v_demand.grade, 'A'),
        'quantity', v_qty,
        'unit', v_unit,
        'price_per_unit', v_unit_price,
        'total_amount', v_total_amt,
        'buyer_fee_amount', v_buyer_fee,
        'seller_fee_amount', v_seller_fee,
        'platform_commission_amount', v_platform_fee,
        'net_seller_amount', v_net_seller,
        'freight_amount', 0,
        'freight_fee_amount', 0,
        'grand_total_amount', v_grand_total,
        'rfq_expires_at', v_rfq_expiry,
        'state', COALESCE(v_demand.delivery_state, ''),
        'district', COALESCE(v_demand.delivery_district, ''),
        'escrow_status', 'awaiting_freight_quote',
        'status', 'awaiting_freight_quote',
        'created_at', v_now,
        'updated_at', v_now
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_demand_offer_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_demand_offer_atomic(TEXT, TEXT) TO authenticated, service_role;
