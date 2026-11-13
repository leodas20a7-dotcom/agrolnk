-- ============================================================================
-- AGROLNK PRODUCTION ATOMIC STORED PROCEDURES
-- Concurrency-safe, transactional functions for bidding, escrow release, and settlement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ATOMIC AUCTION BID PLACEMENT
-- Concurrency lock: FOR UPDATE on auctions row
-- Enforces:
--   1. Strict authentication & identity binding (auth.uid())
--   2. Enforces minimum bid step (bid_step) to stop 1-paisa sniping
--   3. Soft-close extension (+2 mins) if bid placed in final 2 minutes
--   4. Anti-shill self-bidding prevention
--   5. Forward vs Reverse auction logic & reserve floor checks
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_auction_bid_atomic(
    p_auction_id TEXT,
    p_bid_amount NUMERIC,
    p_bidder_id TEXT DEFAULT NULL,
    p_bidder_name TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_auction RECORD;
    v_new_bid_id TEXT;
    v_prev_bidder_id TEXT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_bidder_id TEXT;
    v_bidder_name TEXT;
    v_kyc_status TEXT;
    v_role TEXT;
    v_step NUMERIC;
    v_new_end_time TIMESTAMP WITH TIME ZONE;
    v_extended BOOLEAN := false;
BEGIN
    -- 1. Cryptographically bind bidder identity from Supabase Auth session
    v_bidder_id := auth.uid()::text;
    IF v_bidder_id IS NULL THEN
        -- Fallback for direct testing / service role if explicit param provided
        v_bidder_id := NULLIF(TRIM(p_bidder_id), '');
    END IF;

    IF v_bidder_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: You must be logged in to place a bid.';
    END IF;

    -- 2. Resolve authoritative bidder identity & KYC status from profiles
    SELECT 
        COALESCE(NULLIF(TRIM(full_name), ''), NULLIF(TRIM(name), ''), p_bidder_name, 'Verified Trader'),
        COALESCE(kyc_status, 'pending'),
        COALESCE(role, 'buyer')
    INTO v_bidder_name, v_kyc_status, v_role
    FROM public.profiles
    WHERE id = v_bidder_id;

    IF v_bidder_name IS NULL THEN
        v_bidder_name := COALESCE(NULLIF(TRIM(p_bidder_name), ''), 'Verified Trader');
    END IF;

    -- Enforce server-side KYC verification: Only verified traders or administrators can bid
    IF COALESCE(v_kyc_status, 'pending') NOT IN ('verified', 'approved') AND COALESCE(v_role, '') != 'admin' THEN
        RAISE EXCEPTION 'KYC verification required: Your account KYC must be approved by AgroLnk Operations before participating in live bidding.';
    END IF;

    -- 2. Acquire exclusive row lock on the auction to eliminate race conditions
    SELECT * INTO v_auction 
    FROM public.auctions 
    WHERE id = p_auction_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction lot not found.';
    END IF;

    -- 3. Verify auction is strictly live
    IF v_auction.status != 'live' THEN
        RAISE EXCEPTION 'This auction is no longer live (Status: %).', v_auction.status;
    END IF;

    -- 4. Verify auction has not expired
    IF v_now >= v_auction.end_time THEN
        UPDATE public.auctions SET status = 'completed', updated_at = v_now WHERE id = p_auction_id;
        RAISE EXCEPTION 'This auction has ended and is no longer accepting bids.';
    END IF;

    -- 5. Prevent Shill-Bidding (Producers cannot bid on their own lot)
    IF v_auction.farmer_id IS NOT NULL AND v_auction.farmer_id = v_bidder_id THEN
        RAISE EXCEPTION 'Producers are not permitted to bid on their own auctions.';
    END IF;

    -- 6. Enforce Minimum Bid Step (bid_step)
    v_step := COALESCE(v_auction.bid_step, 1);
    IF v_step <= 0 THEN
        v_step := 1;
    END IF;

    IF COALESCE(v_auction.auction_type, 'forward') = 'reverse' THEN
        -- REVERSE AUCTION (Descending Bids: Suppliers undercut each other)
        IF COALESCE(v_auction.total_bids, 0) = 0 THEN
            IF p_bid_amount > v_auction.current_bid THEN
                RAISE EXCEPTION 'In a reverse auction, opening bid cannot exceed the starting ceiling price of ₹%.', v_auction.current_bid;
            END IF;
        ELSE
            IF p_bid_amount > (v_auction.current_bid - v_step) THEN
                RAISE EXCEPTION 'In a reverse auction, your bid of ₹% must reduce the current leading bid of ₹% by at least the bid step of ₹% (Maximum allowable bid: ₹%).',
                    p_bid_amount, v_auction.current_bid, v_step, (v_auction.current_bid - v_step);
            END IF;
        END IF;

        IF p_bid_amount <= 0 THEN
            RAISE EXCEPTION 'In a reverse auction, your bid must be greater than zero.';
        END IF;
    ELSE
        -- FORWARD AUCTION (Ascending Bids: Buyers bid upwards)
        IF COALESCE(v_auction.total_bids, 0) = 0 THEN
            IF p_bid_amount < v_auction.current_bid THEN
                RAISE EXCEPTION 'Opening bid of ₹% must be at least the starting price of ₹%.', p_bid_amount, v_auction.current_bid;
            END IF;
        ELSE
            IF p_bid_amount < (v_auction.current_bid + v_step) THEN
                RAISE EXCEPTION 'Your bid of ₹% must be at least ₹% higher than the current leading bid of ₹% (Minimum next bid: ₹%).',
                    p_bid_amount, v_step, v_auction.current_bid, (v_auction.current_bid + v_step);
            END IF;
        END IF;
    END IF;

    -- 7. Soft-Close Anti-Sniping Protection (Extend by 2 mins if bid placed in final 2 minutes)
    v_new_end_time := v_auction.end_time;
    IF (v_auction.end_time - v_now) < INTERVAL '2 minutes' THEN
        v_new_end_time := v_now + INTERVAL '2 minutes';
        v_extended := true;
    END IF;

    -- Save previous highest bidder for outbid notification
    v_prev_bidder_id := v_auction.highest_bidder_id;

    -- 8. Insert new bid record
    v_new_bid_id := 'bid_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6);
    INSERT INTO public.auction_bids (id, auction_id, bidder_id, bidder_name, bid_amount, created_at)
    VALUES (v_new_bid_id, p_auction_id, v_bidder_id, v_bidder_name, p_bid_amount, v_now);

    -- 9. Update auction current bid atomically
    UPDATE public.auctions SET
        current_bid = p_bid_amount,
        highest_bidder_id = v_bidder_id,
        highest_bidder_name = v_bidder_name,
        total_bids = COALESCE(v_auction.total_bids, 0) + 1,
        end_time = v_new_end_time,
        updated_at = v_now
    WHERE id = p_auction_id;

    -- 10. Instant outbid notification to previous leader
    IF v_prev_bidder_id IS NOT NULL AND v_prev_bidder_id != v_bidder_id THEN
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
        'highest_bidder_id', v_bidder_id,
        'highest_bidder_name', v_bidder_name,
        'total_bids', COALESCE(v_auction.total_bids, 0) + 1,
        'end_time', v_new_end_time,
        'extended', v_extended,
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

    -- Set bank UTR if supplied (treat empty/whitespace as NULL until settlement confirms)
    v_utr := COALESCE(NULLIF(TRIM(p_utr), ''), NULLIF(TRIM(v_order.bank_utr), ''));

    -- 4. Update Order atomically
    UPDATE public.orders SET
        status = 'completed',
        escrow_status = 'released',
        admin_verified_by = COALESCE(NULLIF(TRIM(p_admin_name), ''), 'AgroLnk Operations Ombudsman'),
        admin_verification_status = 'approved',
        admin_call_notes = COALESCE(NULLIF(TRIM(p_admin_notes), ''), 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.'),
        admin_verified_at = v_now,
        payout_bank_name = COALESCE(NULLIF(TRIM(p_bank_name), ''), NULLIF(TRIM(v_order.payout_bank_name), ''), 'Bank Account'),
        payout_account_number = COALESCE(NULLIF(TRIM(p_account_number), ''), NULLIF(TRIM(v_order.payout_account_number), ''), '—'),
        payout_ifsc = COALESCE(NULLIF(TRIM(p_ifsc), ''), NULLIF(TRIM(v_order.payout_ifsc), ''), '—'),
        bank_utr = v_utr,
        disbursed_at = v_now,
        updated_at = v_now
    WHERE id = v_order.id;

    -- 5. Atomically update linked delivery status
    UPDATE public.deliveries SET
        status = 'completed',
        updated_at = v_now
    WHERE order_id = v_order.id OR order_number = v_order.order_number;

    -- 6. Notify farmer of bank disbursement (NULL-safe when bank_utr is not yet available)
    IF v_order.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_order.farmer_id,
            'farmer',
            CASE
                WHEN v_utr IS NOT NULL THEN 'Payment Disbursed (UTR ' || v_utr || ')'
                ELSE 'Payment Disbursed (Bank Settlement Pending UTR)'
            END,
            'Escrow payout of ₹' || COALESCE(v_order.total_amount::TEXT, '0') || ' for ' || COALESCE(NULLIF(TRIM(v_order.commodity), ''), 'Produce') || ' (' || COALESCE(NULLIF(TRIM(v_order.order_number), ''), v_order.id) || ') has been disbursed to your bank account.',
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
            'Trade Completed (' || COALESCE(NULLIF(TRIM(v_order.order_number), ''), v_order.id) || ')',
            'Escrow settlement finalized for your ' || COALESCE(NULLIF(TRIM(v_order.commodity), ''), 'Produce') || ' order. Receipt has been generated.',
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

    -- 2. Evaluate Reserve Price based on Auction Type (Forward vs Reverse)
    IF v_auction.highest_bidder_id IS NULL THEN
        -- No bids placed at all
        v_final_status := 'reserve_not_met';
    ELSIF COALESCE(v_auction.auction_type, 'forward') = 'reverse' THEN
        -- REVERSE AUCTION (Procurement Tender): Prices descend towards buyer's target ceiling
        -- Reserve is unmet if the lowest bid remained HIGHER than the buyer's reserve target budget
        IF v_auction.reserve_price IS NOT NULL AND v_auction.reserve_price > 0 AND v_auction.current_bid > v_auction.reserve_price THEN
            v_final_status := 'reserve_not_met';
        ELSE
            v_final_status := 'completed';
        END IF;
    ELSE
        -- FORWARD AUCTION (Farmer Selling): Prices ascend towards seller's reserve floor
        -- Reserve is unmet if the highest bid remained LOWER than the seller's reserve floor
        IF v_auction.reserve_price IS NOT NULL AND v_auction.reserve_price > 0 AND v_auction.current_bid < v_auction.reserve_price THEN
            v_final_status := 'reserve_not_met';
        ELSE
            v_final_status := 'completed';
        END IF;
    END IF;

    IF v_final_status = 'reserve_not_met' THEN
        UPDATE public.auctions SET
            status = v_final_status,
            updated_at = v_now
        WHERE id = p_auction_id;

        -- Notify auction creator
        IF v_auction.farmer_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
            ) VALUES (
                'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
                v_auction.farmer_id,
                'farmer',
                'Auction Ended (Reserve Not Met)',
                CASE 
                    WHEN COALESCE(v_auction.auction_type, 'forward') = 'reverse' THEN
                        'The reverse bidding for ' || v_auction.commodity || ' concluded at ₹' || v_auction.current_bid || '/' || v_auction.unit || ', which did not reach your reserve target budget of ₹' || v_auction.reserve_price || '. No order was generated.'
                    ELSE
                        'The bidding for ' || v_auction.commodity || ' concluded below your reserve price of ₹' || v_auction.reserve_price || '/' || v_auction.unit || '. No order was generated.'
                END,
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

        -- Insert primary order with 'pending' escrow & 'pending' order status
        -- Produce pickup and dispatch must NOT be authorized until the winning bidder completes payment deposit
        INSERT INTO public.orders (
            id, order_number, auction_id, listing_id, buyer_id, buyer_name,
            farmer_id, farmer_name, commodity, variety, grade, quantity, unit,
            price_per_unit, total_amount, state, district, escrow_status, status,
            created_at, updated_at
        ) VALUES (
            v_order_id, v_order_num, v_auction.id, NULL, v_auction.highest_bidder_id, COALESCE(v_auction.highest_bidder_name, 'Buyer Partner'),
            v_auction.farmer_id, COALESCE(v_auction.farmer_name, 'Farmer Partner'), v_auction.commodity, v_auction.variety, v_auction.grade, v_auction.quantity, v_auction.unit,
            v_auction.current_bid, v_total_amt, v_auction.state, v_auction.district, 'pending', 'pending',
            v_now, v_now
        );

        -- Note: Deliveries are NOT inserted until escrow funding is completed by the buyer.
        -- This prevents false transporter dispatches and ghost bookings for unpaid lots.

        -- Notify buyer of auction win & required escrow deposit
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_auction.highest_bidder_id,
            'buyer',
            'Auction Won! Escrow Deposit Required (' || v_auction.commodity || ')',
            'Congratulations! You won the auction with a final bid of ₹' || v_auction.current_bid || '/' || v_auction.unit || '. Please complete your escrow deposit of ₹' || v_total_amt || ' to authorize packaging and dispatch.',
            'order',
            '/buyer-orders',
            false,
            v_now
        );

        -- Notify farmer of successful lot sale (escrow pending)
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_auction.farmer_id,
            'farmer',
            'Lot Sold! Awaiting Escrow (' || v_auction.commodity || ')',
            'Your auction closed successfully at ₹' || v_auction.current_bid || '/' || v_auction.unit || ' (Total: ₹' || v_total_amt || '). Order ' || v_order_num || ' created — awaiting buyer escrow deposit before dispatch.',
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


-- ----------------------------------------------------------------------------
-- 3A. ATOMIC EARLY AUCTION KNOCKDOWN (FOR UPDATE ROW LOCK)
-- Serializes strictly against place_auction_bid_atomic() so a concurrent higher
-- bid can never be overwritten or settled at an outdated price.
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 3B. BATCH AUTOMATED FINALIZATION FOR EXPIRED AUCTIONS
-- Concurrency lock: FOR UPDATE SKIP LOCKED
-- Settles all live auctions whose end_time has passed without blocking
-- Safe for concurrent execution via pg_cron, serverless daemon, or client RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_expired_auctions_batch()
RETURNS JSONB AS $$
DECLARE
    v_rec RECORD;
    v_finalized_count INT := 0;
    v_errors_count INT := 0;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    FOR v_rec IN 
        SELECT id 
        FROM public.auctions 
        WHERE status = 'live' 
          AND end_time <= v_now
        ORDER BY end_time ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            PERFORM public.finalize_auction_atomic(v_rec.id);
            v_finalized_count := v_finalized_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors_count := v_errors_count + 1;
            RAISE WARNING 'Failed to finalize expired auction %: %', v_rec.id, SQLERRM;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'finalized_count', v_finalized_count,
        'errors_count', v_errors_count,
        'timestamp', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 4. ATOMIC DIRECT MARKETPLACE PURCHASE & STOCK RESERVATION
-- Concurrency lock: FOR UPDATE on listings row
-- Enforces: stock availability check, atomic inventory reduction, duplicate prevention
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- AGRICULTURAL UNIT CONVERSION HELPER
-- Normalized factors: 1 MT = 10 Quintals = 1,000 kg
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_agri_volume(
    p_qty NUMERIC,
    p_from_unit TEXT,
    p_to_unit TEXT
) RETURNS NUMERIC AS $$
DECLARE
    v_from TEXT := LOWER(TRIM(COALESCE(p_from_unit, 'kg')));
    v_to TEXT := LOWER(TRIM(COALESCE(p_to_unit, 'kg')));
    v_factor_from NUMERIC := 1;
    v_factor_to NUMERIC := 1;
BEGIN
    IF p_qty IS NULL OR p_qty <= 0 THEN
        RETURN 0;
    END IF;

    IF v_from = v_to THEN
        RETURN p_qty;
    END IF;

    -- Factor to KG
    IF v_from IN ('mt', 'ton', 'tonne', 't') THEN
        v_factor_from := 1000;
    ELSIF v_from IN ('quintal', 'qtl') THEN
        v_factor_from := 100;
    ELSIF v_from IN ('kg', 'kgs', 'kilogram') THEN
        v_factor_from := 1;
    ELSE
        RETURN p_qty; -- non-weight or packaged unit, return as-is
    END IF;

    IF v_to IN ('mt', 'ton', 'tonne', 't') THEN
        v_factor_to := 1000;
    ELSIF v_to IN ('quintal', 'qtl') THEN
        v_factor_to := 100;
    ELSIF v_to IN ('kg', 'kgs', 'kilogram') THEN
        v_factor_to := 1;
    ELSE
        RETURN p_qty;
    END IF;

    RETURN ROUND((p_qty * v_factor_from) / v_factor_to, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- 5. ATOMIC DIRECT ORDER PURCHASE
-- Concurrency lock: FOR UPDATE on listings row
-- Enforces: stock availability check, unit conversion, atomic inventory reduction, duplicate prevention
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_direct_order_atomic(
    p_listing_id TEXT,
    p_buyer_id TEXT,
    p_buyer_name TEXT,
    p_quantity NUMERIC,
    p_delivery_location JSONB DEFAULT '{}'::jsonb,
    p_is_trade_credit BOOLEAN DEFAULT false,
    p_buyer_unit TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_listing RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_deduct_qty NUMERIC;
    v_order_id TEXT;
    v_order_num TEXT;
    v_delivery_id TEXT;
    v_delivery_num TEXT;
    v_unit_price NUMERIC;
    v_total_amt NUMERIC;
    v_buyer_fee NUMERIC;
    v_seller_fee NUMERIC;
    v_platform_fee NUMERIC;
    v_net_seller NUMERIC;
    v_new_qty NUMERIC;
    v_escrow_status TEXT;
    v_status TEXT;
BEGIN
    -- 1. Acquire exclusive lock on the listing row
    SELECT * INTO v_listing
    FROM public.listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing % not found.', p_listing_id;
    END IF;

    -- 2. Validate listing status
    IF v_listing.status = 'sold' OR v_listing.quantity <= 0 THEN
        RAISE EXCEPTION 'This lot is already sold out.';
    END IF;

    -- 2b. Prevent Self-Trading (Sellers cannot buy their own produce)
    IF v_listing.farmer_id IS NOT NULL AND (
        v_listing.farmer_id = p_buyer_id OR 
        (auth.uid() IS NOT NULL AND v_listing.farmer_id = auth.uid()::text)
    ) THEN
        RAISE EXCEPTION 'You cannot buy your own produce. Self-trading is not permitted on AgroLnk.';
    END IF;

    -- 2c. Canonical unit conversion to listing's native unit
    IF p_buyer_unit IS NOT NULL AND TRIM(p_buyer_unit) <> '' AND LOWER(TRIM(p_buyer_unit)) <> LOWER(TRIM(COALESCE(v_listing.unit, 'kg'))) THEN
        v_deduct_qty := public.convert_agri_volume(p_quantity, p_buyer_unit, v_listing.unit);
    ELSE
        v_deduct_qty := p_quantity;
    END IF;

    -- 3. Check inventory availability against converted volume
    IF v_deduct_qty > v_listing.quantity THEN
        RAISE EXCEPTION 'Requested quantity (% %) exceeds available inventory (% %).', 
            p_quantity, COALESCE(p_buyer_unit, v_listing.unit, 'kg'), v_listing.quantity, COALESCE(v_listing.unit, 'kg');
    END IF;

    -- 4. Compute financial breakdown using authoritative listing price
    v_unit_price := v_listing.price;
    v_total_amt := ROUND(v_deduct_qty * v_unit_price, 2);
    v_buyer_fee := ROUND(v_total_amt * 0.0025, 2);
    v_seller_fee := ROUND(v_total_amt * 0.0025, 2);
    v_platform_fee := v_buyer_fee + v_seller_fee;
    v_net_seller := v_total_amt - v_seller_fee;

    -- 5. Deduct inventory and update listing status
    v_new_qty := ROUND(v_listing.quantity - v_deduct_qty, 4);
    UPDATE public.listings SET
        quantity = v_new_qty,
        status = CASE WHEN v_new_qty <= 0 THEN 'sold' ELSE 'active' END,
        updated_at = v_now
    WHERE id = p_listing_id;

    -- 6. Create Order atomically
    v_order_id := 'ord_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_order_num := '#AGM-' || floor(1000 + random() * 9000)::text;
    v_escrow_status := CASE WHEN p_is_trade_credit THEN 'pending' ELSE 'funded' END;
    v_status := 'order_placed';

    INSERT INTO public.orders (
        id, order_number, listing_id, auction_id, buyer_id, buyer_name,
        farmer_id, farmer_name, commodity, variety, grade, quantity, unit,
        price_per_unit, total_amount, buyer_fee_amount, seller_fee_amount,
        platform_commission_amount, net_seller_amount, delivery_location,
        state, district, escrow_status, status, created_at, updated_at
    ) VALUES (
        v_order_id, v_order_num, v_listing.id, NULL, p_buyer_id, COALESCE(p_buyer_name, 'Wholesale Buyer'),
        v_listing.farmer_id, COALESCE(v_listing.farmer_name, 'Verified Producer'), v_listing.commodity,
        v_listing.variety, v_listing.grade, p_quantity, COALESCE(p_buyer_unit, v_listing.unit),
        v_unit_price, v_total_amt, v_buyer_fee, v_seller_fee,
        v_platform_fee, v_net_seller, p_delivery_location,
        COALESCE(p_delivery_location->>'state', v_listing.state, ''),
        COALESCE(p_delivery_location->>'district', v_listing.district, ''),
        v_escrow_status, v_status, v_now, v_now
    );

    -- 7. Create linked Delivery record
    v_delivery_id := 'del_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_delivery_num := 'DEL-' || floor(1000 + random() * 9000)::text;

    INSERT INTO public.deliveries (
        id, delivery_number, order_id, order_number, farmer_id, farmer_name,
        buyer_id, buyer_name, commodity, grade, variety, quantity, unit,
        pickup_location, delivery_location, distance_km, fare_amount, status,
        delivery_otp, created_at, updated_at
    ) VALUES (
        v_delivery_id, v_delivery_num, v_order_id, v_order_num, v_listing.farmer_id, v_listing.farmer_name,
        p_buyer_id, p_buyer_name, v_listing.commodity, v_listing.grade, v_listing.variety, p_quantity, COALESCE(p_buyer_unit, v_listing.unit),
        jsonb_build_object('state', v_listing.state, 'district', v_listing.district, 'address', v_listing.district || ' Farmgate Aggregation Hub'),
        p_delivery_location, NULL, NULL, 'transport_requested',
        floor(100000 + random() * 900000)::text, v_now, v_now
    );

    -- 8. Notify Producer
    IF v_listing.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 6),
            v_listing.farmer_id,
            'farmer',
            'New Purchase Order ' || v_order_num,
            'Order for ' || p_quantity || ' ' || v_listing.unit || ' of ' || v_listing.commodity || ' received from ' || COALESCE(p_buyer_name, 'Buyer') || '. Total: ₹' || v_total_amt || '.',
            'order',
            '/farmer-orders',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_num,
        'listing_id', v_listing.id,
        'quantity', p_quantity,
        'remaining_stock', v_new_qty,
        'total_amount', v_total_amt,
        'escrow_status', v_escrow_status,
        'status', v_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 5. ATOMIC DISPUTE ESCROW FREEZING
-- Concurrency lock: FOR UPDATE on orders row
-- Enforces: caller authorization + active funded escrow preconditions before freezing
-- ----------------------------------------------------------------------------
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

    -- Freeze escrow and mark dispute
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
