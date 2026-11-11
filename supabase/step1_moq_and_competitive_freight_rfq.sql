-- ============================================================================
-- AGROLNK STEP 1 MIGRATION: MOQ & BUYER-PAID COMPETITIVE TRANSPORTER RFQ ENGINE
-- File: supabase/step1_moq_and_competitive_freight_rfq.sql
-- Description:
--   1. Adds min_order_quantity (MOQ) to public.listings
--   2. Adds freight_amount, freight_fee_amount, grand_total_amount, rfq_expires_at to public.orders
--   3. Adds rfq_expires_at, freight_quotes (JSONB multi-bid array), admin_escalated,
--      and admin_assigned_quote to public.deliveries
--   4. Updates RLS policies on public.deliveries so multiple verified transporters
--      can view and competitively quote on open RFQ loads during the 30-min window
--   5. Updates protect_order_financial_fields() trigger to permit trusted RPCs
--      and buyer freight-quote locking
--   6. Creates/Updates atomic RPC functions:
--      - create_direct_order_atomic (with MOQ validation & 30-min Freight RFQ creation)
--      - submit_transporter_quote_atomic (multi-transporter bidding, auto-selects lowest quote)
--      - lock_buyer_order_and_freight_escrow_atomic (combined Crop + Freight escrow lock)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD MINIMUM ORDER QUANTITY (MOQ) TO LISTINGS
-- ----------------------------------------------------------------------------
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS min_order_quantity NUMERIC DEFAULT 1 CHECK (min_order_quantity >= 0);

-- ----------------------------------------------------------------------------
-- 2. EXTEND ORDERS TABLE FOR COMBINED CROP + FREIGHT ESCROW
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS freight_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_fee_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rfq_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_utr TEXT;

-- Relax status & escrow_status check constraints on public.orders to allow RFQ states
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'awaiting_freight_quote',
    'freight_quoted',
    'pending',
    'payment_verification_pending',
    'order_placed',
    'confirmed',
    'ready_for_delivery',
    'transport_assigned',
    'dispatched',
    'in_transit',
    'delivered',
    'completed',
    'disputed',
    'cancelled'
  ));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_escrow_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_escrow_status_check
  CHECK (escrow_status IN (
    'awaiting_freight_quote',
    'freight_quoted',
    'pending',
    'pending_verification',
    'financing_pending',
    'funded',
    'escrow_secured',
    'held',
    'released',
    'refunded'
  ));

-- ----------------------------------------------------------------------------
-- 3. EXTEND DELIVERIES TABLE FOR MULTI-TRANSPORTER COMPETITIVE BIDDING (30-MIN RFQ)
-- ----------------------------------------------------------------------------
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS rfq_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_quotes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_escalated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_assigned_quote BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS freight_escrow_status TEXT DEFAULT 'unfunded',
  ADD COLUMN IF NOT EXISTS freight_payer_id TEXT,
  ADD COLUMN IF NOT EXISTS freight_payer_role TEXT DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS freight_base_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignor_freight_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_freight_payable NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transporter_commission_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transporter_net_payout NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_payment_mode TEXT DEFAULT 'direct_razorpay',
  ADD COLUMN IF NOT EXISTS freight_bank_utr TEXT,
  ADD COLUMN IF NOT EXISTS freight_deposited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_admin_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS freight_admin_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_disbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight_disbursal_utr TEXT;

-- If freight_payer_id was previously created as UUID, convert it safely to TEXT to match profiles.id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deliveries'
      AND column_name = 'freight_payer_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_freight_payer_id_fkey;
    ALTER TABLE public.deliveries ALTER COLUMN freight_payer_id TYPE TEXT USING freight_payer_id::text;
  END IF;
END $$;

ALTER TABLE public.deliveries ALTER COLUMN freight_payer_role SET DEFAULT 'buyer';

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check
  CHECK (status IN (
    'transport_requested',
    'price_offered',
    'assigned',
    'picked_up',
    'dispatched',
    'in_transit',
    'delivered',
    'completed',
    'cancelled'
  ));

-- ----------------------------------------------------------------------------
-- 4. UPDATE DELIVERIES RLS POLICIES FOR MULTI-TRANSPORTER COMPETITIVE BIDDING
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "deliveries_select_policy" ON public.deliveries;
CREATE POLICY "deliveries_select_policy" ON public.deliveries
    FOR SELECT USING (
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = transporter_id OR
        (status IN ('transport_requested', 'price_offered') AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'transporter' OR
            public.is_admin()
        )) OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "deliveries_insert_policy" ON public.deliveries;
CREATE POLICY "deliveries_insert_policy" ON public.deliveries
    FOR INSERT WITH CHECK (
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "deliveries_update_policy" ON public.deliveries;
CREATE POLICY "deliveries_update_policy" ON public.deliveries
    FOR UPDATE USING (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        (status IN ('transport_requested', 'price_offered') AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'transporter' OR
            public.is_admin()
        )) OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        (status IN ('transport_requested', 'price_offered', 'assigned') AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'transporter' OR
            public.is_admin()
        )) OR
        public.is_admin()
    );

-- ----------------------------------------------------------------------------
-- 5. UPDATE ORDER FINANCIAL TRIGGER TO ALLOW TRUSTED RPC & BUYER ESCROW LOCK
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_order_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Permit all modifications by Admin, Supabase Service Role, or trusted internal RPCs
    IF public.is_admin()
       OR (auth.jwt() ->> 'role') = 'service_role'
       OR auth.role() = 'service_role'
       OR current_setting('agrolnk.trusted_rpc', true) = 'true'
       OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Block any non-admin from altering unit price or base commodity total
    IF (NEW.total_amount IS DISTINCT FROM OLD.total_amount) OR
       (NEW.price_per_unit IS DISTINCT FROM OLD.price_per_unit) THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct modification of commodity unit price or base order total is forbidden.';
    END IF;

    -- Block any non-admin from self-releasing or refunding escrow to bank accounts
    IF (NEW.escrow_status IS DISTINCT FROM OLD.escrow_status)
       AND NEW.escrow_status IN ('released', 'refunded') THEN
        RAISE EXCEPTION 'Security Policy Violation: Only AgroLnk Admin can release or refund escrow funds.';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. ATOMIC RPC 1: CREATE DIRECT ORDER & OPTIONAL 30-MIN FREIGHT RFQ
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_direct_order_atomic(
    p_listing_id TEXT,
    p_buyer_id TEXT,
    p_buyer_name TEXT,
    p_quantity NUMERIC,
    p_delivery_location JSONB DEFAULT '{}'::jsonb,
    p_is_trade_credit BOOLEAN DEFAULT false,
    p_buyer_unit TEXT DEFAULT NULL,
    p_awaiting_freight_quote BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_listing RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_rfq_expiry TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '30 minutes';
    v_deduct_qty NUMERIC;
    v_effective_moq NUMERIC;
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
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    -- 1. Lock the listing row
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

    -- 2b. Prevent Self-Trading
    IF v_listing.farmer_id IS NOT NULL AND (
        v_listing.farmer_id = p_buyer_id OR
        (auth.uid() IS NOT NULL AND v_listing.farmer_id = auth.uid()::text)
    ) THEN
        RAISE EXCEPTION 'You cannot buy your own produce. Self-trading is not permitted on AgroLnk.';
    END IF;

    -- 2c. Convert requested volume into the listing's native unit
    IF p_buyer_unit IS NOT NULL AND TRIM(p_buyer_unit) <> '' AND LOWER(TRIM(p_buyer_unit)) <> LOWER(TRIM(COALESCE(v_listing.unit, 'kg'))) THEN
        v_deduct_qty := public.convert_agri_volume(p_quantity, p_buyer_unit, v_listing.unit);
    ELSE
        v_deduct_qty := p_quantity;
    END IF;

    -- 2d. Enforce Minimum Order Quantity (MOQ) with Smart Remainder Protection
    v_effective_moq := LEAST(COALESCE(NULLIF(v_listing.min_order_quantity, 0), 0), v_listing.quantity);
    IF v_effective_moq > 0 AND v_deduct_qty < v_effective_moq THEN
        RAISE EXCEPTION 'Minimum order quantity for this lot is % % (Requested: % %).',
            v_effective_moq, COALESCE(v_listing.unit, 'kg'), v_deduct_qty, COALESCE(v_listing.unit, 'kg');
    END IF;

    -- 3. Check inventory availability
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

    IF p_awaiting_freight_quote THEN
        v_escrow_status := 'awaiting_freight_quote';
        v_status := 'awaiting_freight_quote';
    ELSIF p_is_trade_credit THEN
        v_escrow_status := 'pending';
        v_status := 'order_placed';
    ELSE
        v_escrow_status := 'funded';
        v_status := 'order_placed';
    END IF;

    INSERT INTO public.orders (
        id, order_number, listing_id, auction_id, buyer_id, buyer_name,
        farmer_id, farmer_name, commodity, variety, grade, quantity, unit,
        price_per_unit, total_amount, buyer_fee_amount, seller_fee_amount,
        platform_commission_amount, net_seller_amount,
        freight_amount, freight_fee_amount, grand_total_amount, rfq_expires_at,
        delivery_location, state, district, escrow_status, status, created_at, updated_at
    ) VALUES (
        v_order_id, v_order_num, v_listing.id, NULL, p_buyer_id, COALESCE(p_buyer_name, 'Wholesale Buyer'),
        v_listing.farmer_id, COALESCE(v_listing.farmer_name, 'Verified Producer'), v_listing.commodity,
        v_listing.variety, v_listing.grade, p_quantity, COALESCE(p_buyer_unit, v_listing.unit),
        v_unit_price, v_total_amt, v_buyer_fee, v_seller_fee,
        v_platform_fee, v_net_seller,
        0, 0, (v_total_amt + v_buyer_fee), v_rfq_expiry,
        p_delivery_location,
        COALESCE(p_delivery_location->>'state', v_listing.state, ''),
        COALESCE(p_delivery_location->>'district', v_listing.district, ''),
        v_escrow_status, v_status, v_now, v_now
    );

    -- 7. Create linked Delivery RFQ record
    v_delivery_id := 'del_' || extract(epoch from v_now)::bigint || '_' || substr(md5(random()::text), 1, 9);
    v_delivery_num := 'DEL-' || floor(1000 + random() * 9000)::text;

    INSERT INTO public.deliveries (
        id, delivery_number, order_id, order_number, farmer_id, farmer_name,
        buyer_id, buyer_name, commodity, grade, variety, quantity, unit,
        pickup_location, delivery_location, estimated_distance_km, freight_amount,
        status, rfq_expires_at, freight_quotes, freight_payer_id, freight_payer_role,
        pickup_otp, delivery_otp, created_at, updated_at
    ) VALUES (
        v_delivery_id, v_delivery_num, v_order_id, v_order_num, v_listing.farmer_id, v_listing.farmer_name,
        p_buyer_id, p_buyer_name, v_listing.commodity, v_listing.grade, v_listing.variety, p_quantity, COALESCE(p_buyer_unit, v_listing.unit),
        jsonb_build_object(
            'state', v_listing.state,
            'district', v_listing.district,
            'address', COALESCE(v_listing.village, v_listing.district) || ' Farmgate Aggregation Hub'
        ),
        p_delivery_location, NULL, NULL,
        'transport_requested', v_rfq_expiry, '[]'::jsonb, p_buyer_id, 'buyer',
        floor(1000 + random() * 9000)::text,
        floor(1000 + random() * 9000)::text,
        v_now, v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_num,
        'delivery_id', v_delivery_id,
        'delivery_number', v_delivery_num,
        'listing_id', v_listing.id,
        'quantity', p_quantity,
        'remaining_stock', v_new_qty,
        'total_amount', v_total_amt,
        'rfq_expires_at', v_rfq_expiry,
        'escrow_status', v_escrow_status,
        'status', v_status
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. ATOMIC RPC 2: SUBMIT TRANSPORTER QUOTE (MULTI-BIDDING + AUTO-LOWEST SELECTION)
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
BEGIN
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    IF p_freight_amount IS NULL OR p_freight_amount <= 0 THEN
        RAISE EXCEPTION 'Freight quote amount must be greater than zero.';
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery job % not found.', p_delivery_id;
    END IF;

    IF v_delivery.status NOT IN ('transport_requested', 'price_offered') AND NOT p_is_admin_assigned THEN
        RAISE EXCEPTION 'This freight job is already assigned and no longer accepting quotes.';
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
        'isAdminAssigned', COALESCE(p_is_admin_assigned, false),
        'quotedAt', v_now
    );

    v_filtered_quotes := v_filtered_quotes || jsonb_build_array(v_new_quote);

    -- Determine the lowest quote across all submitted bids (if Admin assigned, Admin quote takes precedence)
    IF p_is_admin_assigned THEN
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
        admin_assigned_quote = COALESCE(p_is_admin_assigned, v_delivery.admin_assigned_quote, false),
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
-- 8. ATOMIC RPC 3: BUYER LOCKS COMBINED ESCROW (CROP + AGREED FREIGHT)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_buyer_order_and_freight_escrow_atomic(
    p_order_id TEXT,
    p_payment_mode TEXT DEFAULT 'direct_razorpay',
    p_payment_id TEXT DEFAULT NULL,
    p_bank_utr TEXT DEFAULT NULL,
    p_auto_verified BOOLEAN DEFAULT true
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_delivery RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_freight_amt NUMERIC;
    v_freight_fee NUMERIC;
    v_transporter_fee NUMERIC;
    v_transporter_net NUMERIC;
    v_buyer_fee NUMERIC;
    v_grand_total NUMERIC;
    v_is_bank_pending BOOLEAN;
    v_order_escrow_status TEXT;
    v_order_status TEXT;
    v_del_status TEXT;
    v_del_escrow_status TEXT;
BEGIN
    PERFORM set_config('agrolnk.trusted_rpc', 'true', true);

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id OR order_number = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE order_id = v_order.id OR order_number = v_order.order_number
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_freight_amt := COALESCE(v_delivery.freight_amount, v_order.freight_amount, 0);
    v_freight_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_fee := ROUND(v_freight_amt * 0.0025, 2);
    v_transporter_net := ROUND(v_freight_amt - v_transporter_fee, 2);
    v_buyer_fee := COALESCE(NULLIF(v_order.buyer_fee_amount, 0), ROUND(v_order.total_amount * 0.0025, 2));
    v_grand_total := ROUND(v_order.total_amount + v_buyer_fee + v_freight_amt + v_freight_fee, 2);

    v_is_bank_pending := (p_payment_mode = 'escrow_van' AND NOT COALESCE(p_auto_verified, false));

    IF p_payment_mode = 'trade_credit' THEN
        v_order_escrow_status := 'financing_pending';
        v_order_status := 'order_placed';
        v_del_status := 'assigned';
        v_del_escrow_status := 'escrow_locked';
    ELSIF v_is_bank_pending THEN
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

    UPDATE public.orders SET
        freight_amount = v_freight_amt,
        freight_fee_amount = v_freight_fee,
        grand_total_amount = v_grand_total,
        payment_mode = p_payment_mode,
        payment_id = COALESCE(p_payment_id, payment_id),
        bank_utr = COALESCE(p_bank_utr, bank_utr),
        escrow_status = v_order_escrow_status,
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
            freight_deposited_at = v_now,
            updated_at = v_now
        WHERE id = v_delivery.id;
    END IF;

    -- Notify Farmer that Order & Freight Escrow are Confirmed
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

    -- Notify Winning Transporter to Dispatch Truck
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
