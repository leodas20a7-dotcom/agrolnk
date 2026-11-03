-- ============================================================================
-- AGROLNK SECURITY FIX: SECURE DELIVERY VERIFICATION & TRANSPORTER BINDING
-- File: supabase/secure_delivery_verification_rpc.sql
-- Description:
--   1. Adds brute-force lockout protection to delivery PIN vault.
--   2. Binds verify_transporter_delivery_dropoff_atomic() strictly to auth.uid().
--      - Transporter ID is derived from authenticated session, never trusted from client.
--      - Consignment must be assigned to the caller before verification can occur.
--      - 5 invalid attempts trigger a 15-minute security lockout.
--   3. Restricts delivery table RLS:
--      - Only verified transporters can view transport-requested consignments.
--      - Only verified transporters can claim unassigned deliveries.
--   4. Hardens all functions with controlled search_path and revokes public execution.
-- ============================================================================

-- 1. Add Attempt Counter and Lockout Columns to delivery_pins vault
ALTER TABLE IF EXISTS public.delivery_pins 
    ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;

ALTER TABLE IF EXISTS public.delivery_pins 
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;

-- 2. Hardened Atomic Delivery Drop-off Verification Function
CREATE OR REPLACE FUNCTION public.verify_transporter_delivery_dropoff_atomic(
    p_delivery_id TEXT,
    p_input_otp TEXT,
    p_transporter_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_delivery RECORD;
    v_pin RECORD;
    v_caller_id TEXT := auth.uid()::TEXT;
    v_now TIMESTAMPTZ := NOW();
    v_remaining_attempts INT;
BEGIN
    -- 0. Authentication Check: Caller MUST have a valid Supabase authenticated session
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You must be signed in to verify delivery drop-off.';
    END IF;

    -- 1. Fetch and lock delivery record
    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery consignment % not found.', p_delivery_id;
    END IF;

    -- 2. Check if already delivered
    IF v_delivery.status = 'delivered' OR v_delivery.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_delivered', true,
            'delivery_id', v_delivery.id,
            'delivery_number', v_delivery.delivery_number,
            'status', v_delivery.status
        );
    END IF;

    -- 3. Strict Consignment Assignment & State Validation
    IF v_delivery.transporter_id IS NULL THEN
        RAISE EXCEPTION 'Consignment is not assigned to any transporter. Handover PIN cannot be verified.';
    END IF;

    -- Caller MUST be the assigned transporter bound to auth.uid() OR an administrator
    IF v_caller_id <> v_delivery.transporter_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: You are not the assigned carrier for this consignment.';
    END IF;

    -- 4. Fetch the secret delivery PIN from private vault with lock
    SELECT * INTO v_pin
    FROM public.delivery_pins
    WHERE delivery_id = v_delivery.id
    FOR UPDATE;

    IF NOT FOUND OR v_pin.delivery_otp IS NULL THEN
        RAISE EXCEPTION 'Security PIN record not initialized for this delivery.';
    END IF;

    -- 5. Brute-Force Rate Limiting & Lockout Check
    IF v_pin.locked_until IS NOT NULL AND v_pin.locked_until > v_now THEN
        RAISE EXCEPTION 'Security Lockout: Too many invalid PIN attempts. Delivery PIN locked until % UTC.', 
            to_char(v_pin.locked_until, 'HH24:MI:SS');
    END IF;

    -- 6. Strict PIN Comparison with Lockout Enforcement
    IF TRIM(v_pin.delivery_otp) <> TRIM(p_input_otp) THEN
        -- Increment failed attempts
        UPDATE public.delivery_pins SET
            failed_attempts = COALESCE(failed_attempts, 0) + 1,
            locked_until = CASE 
                WHEN COALESCE(failed_attempts, 0) + 1 >= 5 THEN v_now + INTERVAL '15 minutes' 
                ELSE NULL 
            END,
            updated_at = v_now
        WHERE delivery_id = v_delivery.id;

        v_remaining_attempts := 5 - (COALESCE(v_pin.failed_attempts, 0) + 1);

        IF v_remaining_attempts <= 0 THEN
            RAISE EXCEPTION 'Security Lockout: 5 invalid PIN attempts. Delivery PIN locked for 15 minutes.';
        ELSE
            RAISE EXCEPTION 'Invalid Delivery PIN. % attempts remaining before temporary lockout.', v_remaining_attempts;
        END IF;
    END IF;

    -- Reset failed attempts on successful verification
    UPDATE public.delivery_pins SET 
        failed_attempts = 0, 
        locked_until = NULL,
        updated_at = v_now
    WHERE delivery_id = v_delivery.id;

    -- 7. Atomically transition delivery status to 'delivered'
    UPDATE public.deliveries SET
        status = 'delivered',
        updated_at = v_now
    WHERE id = v_delivery.id;

    -- 8. Synchronize linked order to 'delivered' (escrow securely held until Admin Call Verification)
    IF v_delivery.order_id IS NOT NULL OR v_delivery.order_number IS NOT NULL THEN
        UPDATE public.orders SET
            status = 'delivered',
            admin_verification_status = 'pending',
            updated_at = v_now
        WHERE (id = v_delivery.order_id OR order_number = v_delivery.order_number);
    END IF;

    -- 9. Send notifications to buyer and farmer
    IF v_delivery.buyer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
            v_delivery.buyer_id,
            'buyer',
            'Consignment Delivered (' || v_delivery.delivery_number || ')',
            'Transporter has verified the delivery PIN and marked consignment as delivered. Please confirm produce condition.',
            'delivery',
            '/buyer-deliveries',
            false,
            v_now
        );
    END IF;

    IF v_delivery.farmer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
        ) VALUES (
            'notif_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
            v_delivery.farmer_id,
            'farmer',
            'Delivery Drop-off Confirmed (' || v_delivery.delivery_number || ')',
            'Your produce consignment has been delivered to the buyer. Awaiting administrative settlement call.',
            'delivery',
            '/farmer-deliveries',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Delivery PIN verified. Consignment marked as delivered.',
        'delivery_id', v_delivery.id,
        'delivery_number', v_delivery.delivery_number,
        'status', 'delivered'
    );
END;
$$;

-- Revoke default public execution rights
REVOKE EXECUTE ON FUNCTION public.verify_transporter_delivery_dropoff_atomic(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_transporter_delivery_dropoff_atomic(TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 3. Hardened PIN Retrieval Function
CREATE OR REPLACE FUNCTION public.get_delivery_secret_pins(
    p_delivery_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_delivery RECORD;
    v_pin RECORD;
    v_caller TEXT := auth.uid()::TEXT;
    v_is_admin BOOLEAN := public.is_admin();
    v_is_buyer BOOLEAN := false;
    v_is_farmer BOOLEAN := false;
BEGIN
    IF v_caller IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_pin
    FROM public.delivery_pins
    WHERE delivery_id = v_delivery.id;

    v_is_buyer := (v_caller = v_delivery.buyer_id OR (v_pin IS NOT NULL AND v_caller = v_pin.buyer_id));
    v_is_farmer := (v_caller = v_delivery.farmer_id OR (v_pin IS NOT NULL AND v_caller = v_pin.farmer_id));

    IF v_pin IS NULL THEN
        RETURN jsonb_build_object(
            'delivery_id', v_delivery.id,
            'delivery_otp', NULL,
            'pickup_otp', NULL
        );
    END IF;

    -- Transporters will receive NULL for both OTPs!
    RETURN jsonb_build_object(
        'delivery_id', v_delivery.id,
        'delivery_otp', CASE WHEN (v_is_buyer OR v_is_admin) THEN v_pin.delivery_otp ELSE NULL END,
        'pickup_otp', CASE WHEN (v_is_farmer OR v_is_admin) THEN v_pin.pickup_otp ELSE NULL END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_delivery_secret_pins(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_secret_pins(TEXT) TO authenticated, service_role;

-- 4. Tighten Delivery RLS Policies on public.deliveries (Fixes High #6)
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_select_policy" ON public.deliveries;
DROP POLICY IF EXISTS "Allow public read deliveries" ON public.deliveries;

CREATE POLICY "deliveries_select_policy" ON public.deliveries
    FOR SELECT USING (
        auth.uid()::text = buyer_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = transporter_id OR
        -- Transport requests visible ONLY to verified transporters or admin
        (status = 'transport_requested' AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'transporter' OR
            public.is_admin()
        )) OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "deliveries_update_policy" ON public.deliveries;
DROP POLICY IF EXISTS "Allow public write deliveries" ON public.deliveries;

CREATE POLICY "deliveries_update_policy" ON public.deliveries
    FOR UPDATE USING (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        -- Claiming an unassigned consignment restricted strictly to verified transporters
        (transporter_id IS NULL AND status = 'transport_requested' AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'transporter') OR
            public.is_admin()
        )) OR
        public.is_admin()
    ) WITH CHECK (
        auth.uid()::text = transporter_id OR
        auth.uid()::text = farmer_id OR
        auth.uid()::text = buyer_id OR
        -- When claiming, transporter_id must match authenticated caller
        (transporter_id = auth.uid()::text AND status IN ('assigned', 'transport_requested')) OR
        public.is_admin()
    );

