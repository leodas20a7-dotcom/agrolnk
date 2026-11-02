-- ============================================================================
-- AGROLNK COLLATERAL PROTECTION FIX: e-NWR WAREHOUSE RECEIPT LIEN LOCK
-- Prevents double-pledging and illegal marketplace sale of mortgaged produce.
-- Run this script in your Supabase SQL Editor.
-- ============================================================================

-- 1. Add Institutional Lien Columns to warehouse_receipts table
ALTER TABLE IF EXISTS public.warehouse_receipts 
    ADD COLUMN IF NOT EXISTS lien_status TEXT DEFAULT 'unencumbered' CHECK (lien_status IN ('unencumbered', 'pledged', 'released')),
    ADD COLUMN IF NOT EXISTS lien_holder_id TEXT,
    ADD COLUMN IF NOT EXISTS lien_holder_name TEXT,
    ADD COLUMN IF NOT EXISTS lien_loan_id TEXT,
    ADD COLUMN IF NOT EXISTS lien_loan_number TEXT,
    ADD COLUMN IF NOT EXISTS pledged_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS lien_released_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_lien_status ON public.warehouse_receipts(lien_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_lien_loan_id ON public.warehouse_receipts(lien_loan_id);

-- 2. Atomic Procedure: Lock Warehouse Receipt When Pledged for a Loan
CREATE OR REPLACE FUNCTION public.lock_warehouse_receipt_for_loan_atomic(
    p_loan_id TEXT,
    p_receipt_id TEXT,
    p_financier_id TEXT,
    p_financier_name TEXT,
    p_loan_number TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_receipt RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Fetch & lock warehouse receipt
    SELECT * INTO v_receipt
    FROM public.warehouse_receipts
    WHERE id = p_receipt_id OR receipt_number = p_receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Warehouse receipt ' || COALESCE(p_receipt_id, 'NULL') || ' not found.'
        );
    END IF;

    -- 2. Anti-Double-Pledging Check: If already pledged to a DIFFERENT loan/lender, reject!
    IF v_receipt.lien_status = 'pledged' AND v_receipt.lien_loan_id IS NOT NULL AND v_receipt.lien_loan_id <> p_loan_id THEN
        RAISE EXCEPTION 'Double-Pledging Security Violation: Warehouse receipt % is already pledged to % under active loan %. Multiple loans against the same commodity are strictly prohibited.',
            v_receipt.receipt_number,
            COALESCE(v_receipt.lien_holder_name, 'another institutional financier'),
            COALESCE(v_receipt.lien_loan_number, v_receipt.lien_loan_id);
    END IF;

    -- 3. Lock receipt as collateral: move available_quantity to locked_quantity
    UPDATE public.warehouse_receipts SET
        lien_status = 'pledged',
        lien_holder_id = p_financier_id,
        lien_holder_name = COALESCE(p_financier_name, 'Institutional Lender'),
        lien_loan_id = p_loan_id,
        lien_loan_number = COALESCE(p_loan_number, v_receipt.lien_loan_number),
        pledged_at = COALESCE(v_receipt.pledged_at, v_now),
        locked_quantity = v_receipt.total_quantity,
        available_quantity = 0,
        updated_at = v_now
    WHERE id = v_receipt.id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt.id,
        'receipt_number', v_receipt.receipt_number,
        'lien_status', 'pledged',
        'lien_holder', p_financier_name,
        'locked_quantity', v_receipt.total_quantity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic Procedure: Release Lien on Loan Repayment / Cancellation
CREATE OR REPLACE FUNCTION public.release_warehouse_receipt_lien_atomic(
    p_loan_id TEXT,
    p_receipt_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_receipt RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Match by specific receipt or by loan ID
    IF p_receipt_id IS NOT NULL AND p_receipt_id <> '' THEN
        SELECT * INTO v_receipt
        FROM public.warehouse_receipts
        WHERE id = p_receipt_id OR receipt_number = p_receipt_id
        FOR UPDATE;
    ELSE
        SELECT * INTO v_receipt
        FROM public.warehouse_receipts
        WHERE lien_loan_id = p_loan_id OR lien_loan_number = p_loan_id
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pledged warehouse receipt not found.');
    END IF;

    -- Release lien and restore available quantity
    UPDATE public.warehouse_receipts SET
        lien_status = 'unencumbered',
        lien_released_at = v_now,
        locked_quantity = 0,
        available_quantity = v_receipt.total_quantity,
        updated_at = v_now
    WHERE id = v_receipt.id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt.id,
        'receipt_number', v_receipt.receipt_number,
        'lien_status', 'unencumbered',
        'available_quantity', v_receipt.total_quantity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Automatic Synchronization Trigger on financing_requests
CREATE OR REPLACE FUNCTION public.handle_financing_lien_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_target_receipt_id TEXT;
BEGIN
    v_target_receipt_id := COALESCE(NULLIF(NEW.receipt_id, ''), NULLIF(NEW.receipt_number, ''));

    IF v_target_receipt_id IS NOT NULL THEN
        -- Case A: Loan is under active offer, approval, or disbursement -> LOCK COLLATERAL
        IF NEW.status IN ('offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured') THEN
            PERFORM public.lock_warehouse_receipt_for_loan_atomic(
                NEW.id,
                v_target_receipt_id,
                NEW.financier_id,
                NEW.financier_name,
                NEW.request_number
            );
        -- Case B: Loan is repaid, settled, rejected, or cancelled -> RELEASE COLLATERAL
        ELSIF NEW.status IN ('repaid', 'settled', 'rejected', 'cancelled') THEN
            PERFORM public.release_warehouse_receipt_lien_atomic(
                NEW.id,
                v_target_receipt_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_financing_receipt_lien ON public.financing_requests;
CREATE TRIGGER trg_sync_financing_receipt_lien
    AFTER INSERT OR UPDATE OF status, receipt_id, receipt_number, financier_id ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_financing_lien_sync();

-- 5. Anti-Sale Guard Trigger: Block direct marketplace listing on pledged receipts
CREATE OR REPLACE FUNCTION public.guard_pledged_receipt_trade()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.lien_status = 'pledged' AND (NEW.status IN ('listed', 'partially_listed') OR NEW.available_quantity > 0) THEN
        IF NEW.lien_status = 'pledged' THEN
            RAISE EXCEPTION 'Cannot list or sell produce: Warehouse receipt % has an active institutional lien held by % under loan %. Please settle the loan to release collateral.',
                OLD.receipt_number,
                COALESCE(OLD.lien_holder_name, 'Financier'),
                COALESCE(OLD.lien_loan_number, 'Active Loan');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_guard_pledged_receipt_trade ON public.warehouse_receipts;
CREATE TRIGGER trg_guard_pledged_receipt_trade
    BEFORE UPDATE ON public.warehouse_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_pledged_receipt_trade();
