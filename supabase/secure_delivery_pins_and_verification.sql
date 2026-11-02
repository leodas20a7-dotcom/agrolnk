-- ============================================================================
-- AGROLNK CARRIER SECURITY FIX: MASK DELIVERY OTP & ATOMIC DROP-OFF HANDSHAKE
-- Run this script in Supabase SQL Editor.
-- ============================================================================

-- 1. Create Private Delivery Security Token Vault Table (Isolated from Transporters)
CREATE TABLE IF NOT EXISTS public.delivery_pins (
    delivery_id TEXT PRIMARY KEY,
    pickup_otp TEXT NOT NULL,
    delivery_otp TEXT NOT NULL,
    buyer_id TEXT,
    farmer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on delivery_pins
ALTER TABLE public.delivery_pins ENABLE ROW LEVEL SECURITY;

-- Security Policy: Transporters CANNOT access delivery_pins. 
-- Only Buyer (for delivery PIN), Farmer (for pickup PIN), and Admin can select.
DROP POLICY IF EXISTS "delivery_pins_buyer_select" ON public.delivery_pins;
CREATE POLICY "delivery_pins_buyer_select" ON public.delivery_pins
    FOR SELECT USING (auth.uid()::text = buyer_id OR public.is_admin());

DROP POLICY IF EXISTS "delivery_pins_farmer_select" ON public.delivery_pins;
CREATE POLICY "delivery_pins_farmer_select" ON public.delivery_pins
    FOR SELECT USING (auth.uid()::text = farmer_id OR public.is_admin());

-- 2. Populate delivery_pins with existing delivery tokens
INSERT INTO public.delivery_pins (delivery_id, pickup_otp, delivery_otp, buyer_id, farmer_id)
SELECT 
    id, 
    COALESCE(NULLIF(pickup_otp, ''), LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')), 
    COALESCE(NULLIF(delivery_otp, ''), LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')), 
    buyer_id, 
    farmer_id
FROM public.deliveries
ON CONFLICT (delivery_id) DO UPDATE SET
    pickup_otp = EXCLUDED.pickup_otp,
    delivery_otp = EXCLUDED.delivery_otp,
    buyer_id = COALESCE(EXCLUDED.buyer_id, delivery_pins.buyer_id),
    farmer_id = COALESCE(EXCLUDED.farmer_id, delivery_pins.farmer_id);

-- 3. Mask plaintext OTPs in public deliveries table so transporters never receive them in queries
UPDATE public.deliveries SET delivery_otp = NULL, pickup_otp = NULL;

-- 4. Trigger to automatically route OTPs to private vault and mask them in public deliveries table
CREATE OR REPLACE FUNCTION public.handle_secure_delivery_pins()
RETURNS TRIGGER AS $$
DECLARE
    v_pickup TEXT;
    v_delivery TEXT;
BEGIN
    -- Determine or generate PINs
    v_pickup := COALESCE(NULLIF(NEW.pickup_otp, ''), LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0'));
    v_delivery := COALESCE(NULLIF(NEW.delivery_otp, ''), LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0'));

    -- Store secret PINs in private vault
    INSERT INTO public.delivery_pins (delivery_id, pickup_otp, delivery_otp, buyer_id, farmer_id, updated_at)
    VALUES (NEW.id, v_pickup, v_delivery, NEW.buyer_id, NEW.farmer_id, NOW())
    ON CONFLICT (delivery_id) DO UPDATE SET
        pickup_otp = CASE WHEN EXCLUDED.pickup_otp IS NOT NULL AND EXCLUDED.pickup_otp <> '' THEN EXCLUDED.pickup_otp ELSE delivery_pins.pickup_otp END,
        delivery_otp = CASE WHEN EXCLUDED.delivery_otp IS NOT NULL AND EXCLUDED.delivery_otp <> '' THEN EXCLUDED.delivery_otp ELSE delivery_pins.delivery_otp END,
        buyer_id = COALESCE(EXCLUDED.buyer_id, delivery_pins.buyer_id),
        farmer_id = COALESCE(EXCLUDED.farmer_id, delivery_pins.farmer_id),
        updated_at = NOW();

    -- Strip plaintext OTPs from deliveries row before persisting to disk
    NEW.pickup_otp := NULL;
    NEW.delivery_otp := NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_secure_delivery_pins ON public.deliveries;
CREATE TRIGGER trg_secure_delivery_pins
    BEFORE INSERT OR UPDATE OF pickup_otp, delivery_otp ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_secure_delivery_pins();

-- 5. RPC: Authoritative Verification for Transporter Drop-Off
CREATE OR REPLACE FUNCTION public.verify_transporter_delivery_dropoff_atomic(
    p_delivery_id TEXT,
    p_input_otp TEXT,
    p_transporter_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_delivery RECORD;
    v_pin RECORD;
    v_caller_id TEXT := auth.uid()::TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Fetch and lock delivery record
    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id OR delivery_number = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery consignment % not found.', p_delivery_id;
    END IF;

    -- 2. Authorization check: caller must be assigned transporter or admin
    IF p_transporter_id IS NOT NULL AND p_transporter_id <> '' THEN
        IF v_delivery.transporter_id IS NOT NULL AND v_delivery.transporter_id <> p_transporter_id AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Consignment assigned to another transporter.';
        END IF;
    ELSIF v_caller_id IS NOT NULL AND v_caller_id <> '' THEN
        IF v_delivery.transporter_id IS NOT NULL AND v_delivery.transporter_id <> v_caller_id AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: You are not the assigned carrier for this load.';
        END IF;
    END IF;

    -- 3. Check if already delivered
    IF v_delivery.status = 'delivered' OR v_delivery.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_delivered', true,
            'delivery_id', v_delivery.id,
            'delivery_number', v_delivery.delivery_number,
            'status', v_delivery.status
        );
    END IF;

    -- 4. Fetch the real secret delivery PIN from private vault
    SELECT * INTO v_pin
    FROM public.delivery_pins
    WHERE delivery_id = v_delivery.id;

    IF NOT FOUND OR v_pin.delivery_otp IS NULL THEN
        RAISE EXCEPTION 'Security PIN record not initialized for this delivery.';
    END IF;

    -- 5. Strict comparison
    IF TRIM(v_pin.delivery_otp) <> TRIM(p_input_otp) THEN
        RAISE EXCEPTION 'Invalid Delivery PIN. Please confirm the 4-digit code provided by the recipient buyer.';
    END IF;

    -- 6. Atomically transition delivery status to 'delivered'
    UPDATE public.deliveries SET
        status = 'delivered',
        updated_at = v_now
    WHERE id = v_delivery.id;

    -- 7. Synchronize linked order to 'delivered' (escrow securely held until Admin Call Verification)
    IF v_delivery.order_id IS NOT NULL OR v_delivery.order_number IS NOT NULL THEN
        UPDATE public.orders SET
            status = 'delivered',
            admin_verification_status = 'pending',
            updated_at = v_now
        WHERE (id = v_delivery.order_id OR order_number = v_delivery.order_number);
    END IF;

    -- 8. Send notification to buyer and farmer
    INSERT INTO public.notifications (
        id, recipient_id, recipient_role, title, message, type, link, is_read, created_at
    ) VALUES (
        'notif_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
        v_delivery.buyer_id,
        'buyer',
        'Consignment Delivered! 📦',
        'Transporter ' || COALESCE(v_delivery.transporter_name, 'Carrier') || ' confirmed delivery using your handover PIN. Please inspect your produce.',
        'delivery',
        '/buyer-deliveries',
        false,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', v_delivery.id,
        'delivery_number', v_delivery.delivery_number,
        'order_id', v_delivery.order_id,
        'order_number', v_delivery.order_number,
        'status', 'delivered'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Secure PIN retrieval for Buyer (delivery PIN) and Farmer (pickup PIN)
CREATE OR REPLACE FUNCTION public.get_delivery_secret_pins(
    p_delivery_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_delivery RECORD;
    v_pin RECORD;
    v_caller TEXT := auth.uid()::TEXT;
    v_is_admin BOOLEAN := public.is_admin();
    v_is_buyer BOOLEAN := false;
    v_is_farmer BOOLEAN := false;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
