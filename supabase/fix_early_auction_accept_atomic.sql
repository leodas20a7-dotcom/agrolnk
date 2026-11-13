-- ============================================================================
-- AGROLNK SECURITY & CONCURRENCY FIX: ATOMIC EARLY AUCTION KNOCKDOWN
-- File: supabase/fix_early_auction_accept_atomic.sql
-- Purpose:
--   Replaces racy client-side SELECT -> UPDATE -> INSERT in acceptAuctionBidEarly()
--   with a single SERIALIZABLE row-locked PostgreSQL transaction.
--   - Acquires FOR UPDATE row lock on public.auctions (serializing directly with
--     place_auction_bid_atomic()).
--   - Verifies caller owns the auction lot (farmer_id) or is admin/service_role.
--   - Rejects stale acceptances if a concurrent bid altered current_bid.
--   - Closes the auction using ONLY authoritative database row values and creates
--     the pending escrow order & notifications atomically.
-- Safe & Idempotent: Run directly in Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_auction_bid_early_atomic(
    p_auction_id TEXT,
    p_expected_bid NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_auction RECORD;
    v_updated_auction RECORD;
    v_existing_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_caller_id TEXT := auth.uid()::TEXT;
    v_is_privileged BOOLEAN := false;
    v_order_id TEXT;
    v_order_num TEXT;
    v_total_amt NUMERIC;
    v_buyer_fee NUMERIC;
    v_seller_fee NUMERIC;
    v_platform_fee NUMERIC;
    v_net_seller NUMERIC;
    v_grand_total NUMERIC;
BEGIN
    v_is_privileged := public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role';

    IF NOT v_is_privileged AND v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    -- 1. Acquire exclusive row lock on the auction (serializes with place_auction_bid_atomic)
    SELECT * INTO v_auction
    FROM public.auctions
    WHERE id = p_auction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    -- 2. Verify caller owns the auction lot or holds admin/service authority
    IF NOT v_is_privileged AND v_caller_id IS DISTINCT FROM v_auction.farmer_id THEN
        RAISE EXCEPTION 'Forbidden: Only the auction creator or platform administrator can accept bids early.';
    END IF;

    -- 3. Guard against stale state or concurrent bid mismatch
    IF v_auction.status = 'completed' THEN
        IF p_expected_bid IS NOT NULL AND v_auction.current_bid IS DISTINCT FROM p_expected_bid THEN
            RAISE EXCEPTION 'Bid update conflict: Auction already concluded at updated bid ₹% by %.',
                v_auction.current_bid,
                COALESCE(NULLIF(TRIM(v_auction.highest_bidder_name), ''), 'Leading Buyer');
        END IF;

        SELECT * INTO v_existing_order
        FROM public.orders
        WHERE auction_id = v_auction.id
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'auction', to_jsonb(v_auction),
            'order', to_jsonb(v_existing_order)
        );
    END IF;

    IF v_auction.status <> 'live' THEN
        RAISE EXCEPTION 'Cannot accept bid early: auction is no longer live (Status: %).', v_auction.status;
    END IF;

    IF v_auction.highest_bidder_id IS NULL OR v_auction.current_bid IS NULL THEN
        RAISE EXCEPTION 'No bids have been placed on this auction yet.';
    END IF;

    IF p_expected_bid IS NOT NULL AND v_auction.current_bid IS DISTINCT FROM p_expected_bid THEN
        RAISE EXCEPTION 'Bid update conflict: A newer bid of ₹% by % just arrived. Please review the updated offer before closing the auction.',
            v_auction.current_bid,
            COALESCE(NULLIF(TRIM(v_auction.highest_bidder_name), ''), 'Leading Buyer');
    END IF;

    -- 4. Close auction atomically using ONLY authoritative locked row bid/bidder fields
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    UPDATE public.auctions SET
        status = 'completed',
        end_time = v_now,
        updated_at = v_now
    WHERE id = v_auction.id
    RETURNING * INTO v_updated_auction;

    -- 5. Idempotently create pending escrow order inside the same transaction
    SELECT * INTO v_existing_order
    FROM public.orders
    WHERE auction_id = v_auction.id
    LIMIT 1;

    IF v_existing_order.id IS NULL THEN
        v_order_id := 'ord_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 9);
        v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
        v_total_amt := ROUND(COALESCE(v_auction.quantity, 0) * v_auction.current_bid, 2);
        v_buyer_fee := ROUND(v_total_amt * 0.0025, 2);
        v_seller_fee := ROUND(v_total_amt * 0.0025, 2);
        v_platform_fee := v_buyer_fee + v_seller_fee;
        v_net_seller := v_total_amt - v_seller_fee;
        v_grand_total := v_total_amt + v_buyer_fee;

        INSERT INTO public.orders (
            id, order_number, auction_id, listing_id,
            buyer_id, buyer_name, farmer_id, farmer_name,
            commodity, variety, grade, quantity, unit,
            price_per_unit, total_amount,
            buyer_fee_amount, seller_fee_amount, platform_commission_amount, net_seller_amount,
            grand_total_amount, state, district,
            escrow_status, settlement_status, status,
            created_at, updated_at
        ) VALUES (
            v_order_id, v_order_num, v_auction.id, NULL,
            v_auction.highest_bidder_id, COALESCE(NULLIF(TRIM(v_auction.highest_bidder_name), ''), 'Buyer Partner'),
            v_auction.farmer_id, COALESCE(NULLIF(TRIM(v_auction.farmer_name), ''), 'Farmer Partner'),
            v_auction.commodity, COALESCE(v_auction.variety, 'None'), COALESCE(v_auction.grade, 'A'),
            v_auction.quantity, v_auction.unit,
            v_auction.current_bid, v_total_amt,
            v_buyer_fee, v_seller_fee, v_platform_fee, v_net_seller,
            v_grand_total, v_auction.state, v_auction.district,
            'pending', 'pending_deposit', 'pending',
            v_now, v_now
        )
        RETURNING * INTO v_existing_order;

        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_auction.highest_bidder_id,
            'buyer',
            'Bid Accepted! Escrow Deposit Required (' || COALESCE(NULLIF(TRIM(v_auction.commodity), ''), 'Produce') || ')',
            'Your offer of ₹' || COALESCE(v_auction.current_bid::TEXT, '0') || '/' || COALESCE(NULLIF(TRIM(v_auction.unit), ''), 'unit') || ' was accepted early! Please complete your escrow deposit of ₹' || COALESCE(v_grand_total::TEXT, '0') || ' for ' || v_order_num || '.',
            'order',
            '/buyer-orders',
            false,
            v_now
        );

        IF v_auction.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_auction.farmer_id,
                'farmer',
                'Early Sale Confirmed (' || COALESCE(NULLIF(TRIM(v_auction.commodity), ''), 'Produce') || ')',
                'You accepted the leading bid of ₹' || COALESCE(v_auction.current_bid::TEXT, '0') || '/' || COALESCE(NULLIF(TRIM(v_auction.unit), ''), 'unit') || '. Order ' || v_order_num || ' is awaiting buyer escrow funding.',
                'order',
                '/farmer-orders',
                false,
                v_now
            );
        END IF;
    END IF;

    PERFORM set_config('agrolnk.trusted_rpc', 'false', true);

    RETURN jsonb_build_object(
        'success', true,
        'auction', to_jsonb(v_updated_auction),
        'order', to_jsonb(v_existing_order)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_auction_bid_early_atomic(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_auction_bid_early_atomic(TEXT, NUMERIC) TO authenticated, service_role;
