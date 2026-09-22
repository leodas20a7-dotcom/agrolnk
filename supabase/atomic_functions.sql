-- ============================================================================
-- AGROLNK PRODUCTION ATOMIC STORED PROCEDURES
-- Concurrency-safe, transactional functions for bidding, escrow release, and settlement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ATOMIC AUCTION BID PLACEMENT
-- Concurrency lock: FOR UPDATE on auctions row
-- Enforces: active status, expiry, anti-shill (no farmer self-bidding), strictly higher bid
-- Automatically notifies previous highest bidder
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_auction_bid_atomic(
    p_auction_id TEXT,
    p_bidder_id TEXT,
    p_bidder_name TEXT,
    p_bid_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_auction RECORD;
    v_new_bid_id TEXT;
    v_prev_bidder_id TEXT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- 1. Acquire exclusive row lock on the auction to eliminate race conditions
    SELECT * INTO v_auction 
    FROM public.auctions 
    WHERE id = p_auction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    -- 2. Verify auction is strictly live
    IF v_auction.status != 'live' THEN
        RAISE EXCEPTION 'This auction is no longer live (Status: %).', v_auction.status;
    END IF;

    -- 3. Verify auction has not expired
    IF v_now >= v_auction.end_time THEN
        -- Auto-close if expired
        UPDATE public.auctions SET status = 'completed', updated_at = v_now WHERE id = p_auction_id;
        RAISE EXCEPTION 'This auction has ended and is no longer accepting bids.';
    END IF;

    -- 4. Prevent Shill-Bidding (Producers cannot bid on their own lot)
    IF v_auction.farmer_id IS NOT NULL AND v_auction.farmer_id = p_bidder_id THEN
        RAISE EXCEPTION 'Producers are not permitted to bid on their own auctions.';
    END IF;

    -- 5. Verify bid amount is strictly higher than current leading bid
    IF p_bid_amount <= v_auction.current_bid THEN
        RAISE EXCEPTION 'Your bid of ₹% must be higher than the current leading bid of ₹%.', p_bid_amount, v_auction.current_bid;
    END IF;

    -- Save previous highest bidder for outbid notification
    v_prev_bidder_id := v_auction.highest_bidder_id;

    -- 6. Insert new bid record
    v_new_bid_id := 'bid_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6);
    INSERT INTO public.auction_bids (id, auction_id, bidder_id, bidder_name, bid_amount, created_at)
    VALUES (v_new_bid_id, p_auction_id, p_bidder_id, COALESCE(p_bidder_name, 'Buyer Partner'), p_bid_amount, v_now);

    -- 7. Update auction current bid atomically
    UPDATE public.auctions SET
        current_bid = p_bid_amount,
        highest_bidder_id = p_bidder_id,
        highest_bidder_name = COALESCE(p_bidder_name, 'Buyer Partner'),
        total_bids = COALESCE(v_auction.total_bids, 0) + 1,
        updated_at = v_now
    WHERE id = p_auction_id;

    -- 8. Disclose instant outbid notification to previous leader
    IF v_prev_bidder_id IS NOT NULL AND v_prev_bidder_id != p_bidder_id THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_prev_bidder_id,
            'buyer',
            'Outbid on ' || v_auction.commodity,
            'Another buyer placed a new leading bid of ₹' || p_bid_amount || '/' || v_auction.unit || '. Re-enter the arena to reclaim the lot.',
            'order',
            '/buyer-live-auctions',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'auction_id', p_auction_id,
        'bid_id', v_new_bid_id,
        'current_bid', p_bid_amount,
        'highest_bidder_id', p_bidder_id,
        'highest_bidder_name', COALESCE(p_bidder_name, 'Buyer Partner'),
        'total_bids', COALESCE(v_auction.total_bids, 0) + 1,
        'status', 'live'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 2. ATOMIC ESCROW RELEASE
-- Concurrency lock: FOR UPDATE on orders row
-- Enforces: idempotency (cannot be released twice), status check, syncs delivery and notifications
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_escrow_atomic(
    p_order_id TEXT,
    p_admin_name TEXT DEFAULT 'AgroLnk Operations Ombudsman',
    p_admin_notes TEXT DEFAULT 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.',
    p_bank_name TEXT DEFAULT NULL,
    p_account_number TEXT DEFAULT NULL,
    p_ifsc TEXT DEFAULT NULL,
    p_utr TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_utr TEXT;
BEGIN
    -- 1. Acquire exclusive lock on the target order row
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
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'escrow_status', 'released',
        'status', 'completed',
        'bank_utr', v_utr,
        'total_amount', v_order.total_amount,
        'disbursed_at', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 3. ATOMIC AUCTION FINALIZATION & ORDER KNOCKDOWN
-- Concurrency lock: FOR UPDATE on auctions row
-- Enforces: reserve price validation, single-order creation (no duplicates)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_auction_atomic(
    p_auction_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_auction RECORD;
    v_existing_order RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_order_id TEXT;
    v_order_num TEXT;
    v_total_amt NUMERIC;
    v_delivery_id TEXT;
    v_delivery_num TEXT;
    v_final_status TEXT;
BEGIN
    -- 1. Lock auction row
    SELECT * INTO v_auction 
    FROM public.auctions 
    WHERE id = p_auction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    -- If already concluded, return status idempotently
    IF v_auction.status IN ('completed', 'reserve_not_met', 'cancelled') THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', v_auction.status,
            'message', 'Auction already settled.'
        );
    END IF;

    -- 2. Evaluate Reserve Price
    IF v_auction.highest_bidder_id IS NULL OR v_auction.current_bid < v_auction.reserve_price THEN
        -- Reserve not met
        v_final_status := 'reserve_not_met';
        UPDATE public.auctions SET
            status = v_final_status,
            updated_at = v_now
        WHERE id = p_auction_id;

        -- Notify farmer
        IF v_auction.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_auction.farmer_id,
                'farmer',
                'Auction Ended (Reserve Not Met)',
                'The bidding for ' || v_auction.commodity || ' concluded below your reserve price of ₹' || v_auction.reserve_price || '. No order was generated.',
                'order',
                '/farmer-my-auctions',
                false,
                v_now
            );
        END IF;

        RETURN jsonb_build_object('success', true, 'status', v_final_status);
    END IF;

    -- 3. Mark auction completed
    v_final_status := 'completed';
    UPDATE public.auctions SET
        status = v_final_status,
        updated_at = v_now
    WHERE id = p_auction_id;

    -- 4. Check if an order already exists (idempotency against concurrent calls)
    SELECT * INTO v_existing_order FROM public.orders WHERE auction_id = p_auction_id LIMIT 1;

    IF v_existing_order.id IS NULL THEN
        v_order_id := 'ord_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
        v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
        v_total_amt := v_auction.quantity * v_auction.current_bid;

        -- Insert primary order
        INSERT INTO public.orders (
            id, order_number, auction_id, listing_id, buyer_id, buyer_name,
            farmer_id, farmer_name, commodity, variety, grade, quantity, unit,
            price_per_unit, total_amount, state, district, escrow_status, status,
            created_at, updated_at
        ) VALUES (
            v_order_id, v_order_num, v_auction.id, NULL, v_auction.highest_bidder_id, COALESCE(v_auction.highest_bidder_name, 'Buyer Partner'),
            v_auction.farmer_id, COALESCE(v_auction.farmer_name, 'Farmer Partner'), v_auction.commodity, v_auction.variety, v_auction.grade, v_auction.quantity, v_auction.unit,
            v_auction.current_bid, v_total_amt, v_auction.state, v_auction.district, 'funded', 'order_placed',
            v_now, v_now
        );

        -- Insert delivery request
        v_delivery_id := 'del_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
        v_delivery_num := 'DEL-' || floor(1000 + random() * 9000)::text;

        INSERT INTO public.deliveries (
            id, delivery_number, order_id, order_number, farmer_id, farmer_name,
            buyer_id, buyer_name, commodity, grade, variety, quantity, unit,
            pickup_location, delivery_location, distance_km, fare_amount, status,
            tracking_steps, created_at, updated_at
        ) VALUES (
            v_delivery_id, v_delivery_num, v_order_id, v_order_num, v_auction.farmer_id, v_auction.farmer_name,
            v_auction.highest_bidder_id, v_auction.highest_bidder_name, v_auction.commodity, v_auction.grade, v_auction.variety, v_auction.quantity, v_auction.unit,
            jsonb_build_object('state', v_auction.state, 'district', v_auction.district, 'address', v_auction.district || ' Farmgate Aggregation Depot'),
            jsonb_build_object('state', 'Tamil Nadu', 'district', 'Chennai', 'address', 'Buyer Central Receiving Hub'),
            180, 4500, 'transport_requested',
            jsonb_build_array(
                jsonb_build_object('step', 'Order Confirmed', 'completed', true, 'timestamp', v_now),
                jsonb_build_object('step', 'Transporter Assigned', 'completed', false),
                jsonb_build_object('step', 'Pickup Completed', 'completed', false),
                jsonb_build_object('step', 'In Transit', 'completed', false),
                jsonb_build_object('step', 'Delivered', 'completed', false)
            ),
            v_now, v_now
        );

        -- Notify buyer of auction win
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_auction.highest_bidder_id,
            'buyer',
            'Auction Won! (' || v_auction.commodity || ')',
            'Congratulations! You won the auction with a final bid of ₹' || v_auction.current_bid || '/' || v_auction.unit || '. Order ' || v_order_num || ' has been created.',
            'order',
            '/buyer-orders',
            false,
            v_now
        );

        -- Notify farmer of successful lot sale
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_auction.farmer_id,
            'farmer',
            'Lot Sold! (' || v_auction.commodity || ')',
            'Your auction closed successfully at ₹' || v_auction.current_bid || '/' || v_auction.unit || ' (Total: ₹' || v_total_amt || '). Order ' || v_order_num || ' created.',
            'order',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'completed',
        'order_id', COALESCE(v_order_id, v_existing_order.id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
