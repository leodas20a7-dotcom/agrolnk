-- ============================================================================
-- AGROLNK SECURITY REMEDIATION MIGRATION
-- Issue: Anyone Can Unlock Pledged Warehouse Collateral (e-NWR) Without Repaying the Loan
-- Fixes:
--   1. Hardens release_warehouse_receipt_lien_atomic() and lock_warehouse_receipt_for_loan_atomic()
--      with strict caller role checks, lien-holder identity verification, loan-to-receipt binding,
--      and REVOKE EXECUTE FROM PUBLIC, anon.
--   2. Hardens guard_pledged_receipt_trade() and adds DELETE + listings guards so neither
--      farmers nor warehouse operators can clear lien_status, list, or dispatch pledged stock.
--   3. Hardens protect_financing_approval_fields() and adds INSERT/DELETE trigger guards so
--      borrowers cannot self-mark loans as 'repaid'/'settled'/'cancelled' to trigger collateral unlock.
-- Run this complete script in your Supabase SQL Editor.
-- ============================================================================

-- 1. Harden lock_warehouse_receipt_for_loan_atomic
CREATE OR REPLACE FUNCTION public.lock_warehouse_receipt_for_loan_atomic(
    p_loan_id TEXT,
    p_receipt_id TEXT,
    p_financier_id TEXT,
    p_financier_name TEXT,
    p_loan_number TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_receipt RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_is_service_or_admin BOOLEAN := FALSE;
    v_is_financier BOOLEAN := FALSE;
BEGIN
    v_is_service_or_admin := (
        (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
        OR public.is_admin()
    );
    v_is_financier := public.is_verified_financier();

    IF NOT v_is_service_or_admin AND NOT v_is_financier AND pg_trigger_depth() = 0 THEN
        RAISE EXCEPTION 'Security Policy Violation: Only a Verified Institutional Financier, Platform Admin, or Verified System Trigger can lock warehouse collateral.';
    END IF;

    IF NOT v_is_service_or_admin AND v_is_financier AND pg_trigger_depth() = 0 THEN
        IF p_financier_id IS NOT NULL AND p_financier_id <> '' AND p_financier_id <> auth.uid()::text THEN
            RAISE EXCEPTION 'Security Policy Violation: Financier identity mismatch when locking collateral.';
        END IF;
    END IF;

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

    IF COALESCE(v_receipt.status, '') = 'released' OR COALESCE(v_receipt.total_quantity, 0) <= 0 THEN
        RAISE EXCEPTION 'Collateral Error: Warehouse receipt % has already been physically released and cannot be pledged.',
            COALESCE(v_receipt.receipt_number, v_receipt.id);
    END IF;

    IF v_receipt.lien_status = 'pledged' AND v_receipt.lien_loan_id IS NOT NULL AND v_receipt.lien_loan_id <> p_loan_id THEN
        RAISE EXCEPTION 'Double-Pledging Security Violation: Warehouse receipt % is already pledged to % under active loan %. Multiple loans against the same commodity are strictly prohibited.',
            v_receipt.receipt_number,
            COALESCE(v_receipt.lien_holder_name, 'another institutional financier'),
            COALESCE(v_receipt.lien_loan_number, v_receipt.lien_loan_id);
    END IF;

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
$$;

REVOKE EXECUTE ON FUNCTION public.lock_warehouse_receipt_for_loan_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lock_warehouse_receipt_for_loan_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 2. Harden release_warehouse_receipt_lien_atomic
CREATE OR REPLACE FUNCTION public.release_warehouse_receipt_lien_atomic(
    p_loan_id TEXT,
    p_receipt_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_receipt RECORD;
    v_loan RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_is_service_or_admin BOOLEAN := FALSE;
    v_is_financier BOOLEAN := FALSE;
    v_caller_uid TEXT := auth.uid()::text;
    v_is_lien_holder BOOLEAN := FALSE;
    v_lookup_loan_id TEXT;
BEGIN
    v_is_service_or_admin := (
        (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
        OR public.is_admin()
    );
    v_is_financier := public.is_verified_financier();

    IF p_receipt_id IS NOT NULL AND p_receipt_id <> '' THEN
        SELECT * INTO v_receipt
        FROM public.warehouse_receipts
        WHERE id = p_receipt_id OR receipt_number = p_receipt_id
        FOR UPDATE;
    ELSE
        SELECT * INTO v_receipt
        FROM public.warehouse_receipts
        WHERE lien_loan_id = p_loan_id OR lien_loan_number = p_loan_id
        ORDER BY CASE WHEN lien_status = 'pledged' THEN 0 ELSE 1 END, pledged_at DESC NULLS LAST
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pledged warehouse receipt not found.');
    END IF;

    -- Prevent an unrelated loan from unlocking a receipt pledged to a different active loan
    IF v_receipt.lien_status = 'pledged'
       AND v_receipt.lien_loan_id IS NOT NULL
       AND p_loan_id IS NOT NULL
       AND p_loan_id <> ''
       AND v_receipt.lien_loan_id <> p_loan_id
       AND COALESCE(v_receipt.lien_loan_number, '') <> p_loan_id THEN
        IF pg_trigger_depth() > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'skipped', true,
                'message', 'Receipt is pledged to a different active loan.'
            );
        ELSIF NOT v_is_service_or_admin THEN
            RAISE EXCEPTION 'Security Policy Violation: Loan % does not hold the active lien on warehouse receipt %.',
                p_loan_id, v_receipt.receipt_number;
        END IF;
    END IF;

    v_lookup_loan_id := COALESCE(NULLIF(v_receipt.lien_loan_id, ''), NULLIF(p_loan_id, ''));
    IF v_lookup_loan_id IS NOT NULL THEN
        SELECT * INTO v_loan
        FROM public.financing_requests
        WHERE id = v_lookup_loan_id OR request_number = v_lookup_loan_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    v_is_lien_holder := (
        v_is_financier
        AND v_caller_uid IS NOT NULL
        AND (
            (v_receipt.lien_holder_id IS NOT NULL AND v_receipt.lien_holder_id = v_caller_uid)
            OR (v_loan.id IS NOT NULL AND v_loan.financier_id = v_caller_uid)
        )
    );

    -- Direct RPC calls require Admin, Service Role, or the exact lien-holding Verified Financier
    IF pg_trigger_depth() = 0 THEN
        IF NOT v_is_service_or_admin AND NOT v_is_lien_holder THEN
            RAISE EXCEPTION 'Security Policy Violation: Only the lien-holding Institutional Financier, Platform Admin, or Verified Settlement Engine can release warehouse collateral liens.';
        END IF;
    ELSE
        IF v_loan.id IS NULL OR v_loan.status NOT IN ('repaid', 'settled', 'rejected', 'cancelled') THEN
            RAISE EXCEPTION 'Security Policy Violation: Cannot release warehouse collateral while loan status is %.', COALESCE(v_loan.status, 'unknown');
        END IF;

        IF v_loan.status IN ('repaid', 'settled') AND NOT v_is_service_or_admin AND NOT v_is_lien_holder THEN
            RAISE EXCEPTION 'Security Policy Violation: Loan repayment clearance requires verified settlement authorization.';
        END IF;
    END IF;

    IF v_receipt.lien_status = 'unencumbered' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_released', true,
            'receipt_id', v_receipt.id,
            'receipt_number', v_receipt.receipt_number,
            'lien_status', 'unencumbered',
            'available_quantity', v_receipt.available_quantity
        );
    END IF;

    UPDATE public.warehouse_receipts SET
        lien_status = 'unencumbered',
        lien_released_at = v_now,
        locked_quantity = 0,
        available_quantity = CASE WHEN status = 'released' THEN 0 ELSE v_receipt.total_quantity END,
        updated_at = v_now
    WHERE id = v_receipt.id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt.id,
        'receipt_number', v_receipt.receipt_number,
        'lien_status', 'unencumbered',
        'available_quantity', CASE WHEN v_receipt.status = 'released' THEN 0 ELSE v_receipt.total_quantity END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_warehouse_receipt_lien_atomic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_warehouse_receipt_lien_atomic(TEXT, TEXT) TO authenticated, service_role;

-- 3. Harden handle_financing_lien_sync search_path
CREATE OR REPLACE FUNCTION public.handle_financing_lien_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_target_receipt_id TEXT;
BEGIN
    v_target_receipt_id := COALESCE(NULLIF(NEW.receipt_id, ''), NULLIF(NEW.receipt_number, ''));

    IF v_target_receipt_id IS NOT NULL THEN
        IF NEW.status IN ('offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured') THEN
            PERFORM public.lock_warehouse_receipt_for_loan_atomic(
                NEW.id,
                v_target_receipt_id,
                NEW.financier_id,
                NEW.financier_name,
                NEW.request_number
            );
        ELSIF NEW.status IN ('repaid', 'settled', 'rejected', 'cancelled') THEN
            PERFORM public.release_warehouse_receipt_lien_atomic(
                NEW.id,
                v_target_receipt_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_financing_receipt_lien ON public.financing_requests;
CREATE TRIGGER trg_sync_financing_receipt_lien
    AFTER INSERT OR UPDATE OF status, receipt_id, receipt_number, financier_id ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_financing_lien_sync();

-- 4. Harden warehouse_receipts UPDATE & DELETE guards
CREATE OR REPLACE FUNCTION public.guard_pledged_receipt_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_is_privileged BOOLEAN := FALSE;
    v_is_lien_holder BOOLEAN := FALSE;
BEGIN
    v_is_privileged := (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
        OR pg_trigger_depth() > 0
    );

    IF v_is_privileged THEN
        RETURN NEW;
    END IF;

    v_is_lien_holder := (
        public.is_verified_financier()
        AND OLD.lien_holder_id IS NOT NULL
        AND OLD.lien_holder_id = auth.uid()::text
    );

    IF OLD.lien_status = 'pledged' THEN
        IF (NEW.lien_status IS DISTINCT FROM OLD.lien_status) OR
           (NEW.lien_holder_id IS DISTINCT FROM OLD.lien_holder_id) OR
           (NEW.lien_holder_name IS DISTINCT FROM OLD.lien_holder_name) OR
           (NEW.lien_loan_id IS DISTINCT FROM OLD.lien_loan_id) OR
           (NEW.lien_loan_number IS DISTINCT FROM OLD.lien_loan_number) OR
           (NEW.pledged_at IS DISTINCT FROM OLD.pledged_at) OR
           (NEW.lien_released_at IS DISTINCT FROM OLD.lien_released_at) THEN
            IF NOT v_is_lien_holder THEN
                RAISE EXCEPTION 'Security Policy Violation: Direct modification of active institutional collateral lien fields on warehouse receipt % is forbidden.',
                    OLD.receipt_number;
            END IF;
        END IF;

        IF NEW.status IN ('listed', 'partially_listed', 'released')
           OR COALESCE(NEW.available_quantity, 0) > 0
           OR COALESCE(NEW.locked_quantity, 0) < COALESCE(OLD.locked_quantity, 0)
           OR COALESCE(NEW.total_quantity, 0) < COALESCE(OLD.total_quantity, 0) THEN
            RAISE EXCEPTION 'Cannot list, sell, or dispatch produce: Warehouse receipt % has an active institutional lien held by % under loan %. Please settle the loan to release collateral.',
                OLD.receipt_number,
                COALESCE(OLD.lien_holder_name, 'Financier'),
                COALESCE(OLD.lien_loan_number, 'Active Loan');
        END IF;
    ELSE
        IF (NEW.lien_status IS DISTINCT FROM OLD.lien_status) OR
           (NEW.lien_holder_id IS DISTINCT FROM OLD.lien_holder_id) OR
           (NEW.lien_holder_name IS DISTINCT FROM OLD.lien_holder_name) OR
           (NEW.lien_loan_id IS DISTINCT FROM OLD.lien_loan_id) OR
           (NEW.lien_loan_number IS DISTINCT FROM OLD.lien_loan_number) THEN
            RAISE EXCEPTION 'Security Policy Violation: Direct modification of institutional lien metadata on warehouse receipt % is forbidden.',
                OLD.receipt_number;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pledged_receipt_trade ON public.warehouse_receipts;
CREATE TRIGGER trg_guard_pledged_receipt_trade
    BEFORE UPDATE ON public.warehouse_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_pledged_receipt_trade();

CREATE OR REPLACE FUNCTION public.guard_pledged_receipt_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF OLD.lien_status = 'pledged' AND NOT (
        public.is_admin()
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR auth.role() = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot delete pledged warehouse receipt % while an institutional lien is active.',
            OLD.receipt_number;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pledged_receipt_delete ON public.warehouse_receipts;
CREATE TRIGGER trg_guard_pledged_receipt_delete
    BEFORE DELETE ON public.warehouse_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_pledged_receipt_delete();

-- 5. Block Marketplace Listing Creation Referencing Pledged e-NWR Collateral
CREATE OR REPLACE FUNCTION public.guard_listing_from_pledged_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_pledged_receipt RECORD;
BEGIN
    IF NEW.origin_receipt_number IS NOT NULL AND NEW.origin_receipt_number <> '' THEN
        SELECT receipt_number, lien_holder_name, lien_loan_number INTO v_pledged_receipt
        FROM public.warehouse_receipts
        WHERE (receipt_number = NEW.origin_receipt_number OR id = NEW.origin_receipt_number)
          AND lien_status = 'pledged'
        LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Cannot create marketplace listing: Warehouse receipt % has an active institutional lien held by % under loan %.',
                v_pledged_receipt.receipt_number,
                COALESCE(v_pledged_receipt.lien_holder_name, 'Financier'),
                COALESCE(v_pledged_receipt.lien_loan_number, 'Active Loan');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_listing_from_pledged_receipt ON public.listings;
CREATE TRIGGER trg_guard_listing_from_pledged_receipt
    BEFORE INSERT OR UPDATE OF origin_receipt_number ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_listing_from_pledged_receipt();

-- 6. Harden financing_requests against borrower self-repayment or post-pledge cancellation bypasses
CREATE OR REPLACE FUNCTION public.protect_financing_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_verified_financier() OR public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF (NEW.status IS DISTINCT FROM OLD.status) THEN
        IF NEW.status IN ('approved', 'disbursed', 'escrow_secured', 'repaid', 'settled') THEN
            RAISE EXCEPTION 'Security Policy Violation: Borrowers are not permitted to set loan status to % directly.', NEW.status;
        END IF;

        IF OLD.status IN ('borrower_accepted', 'approved', 'disbursed', 'escrow_secured', 'repaid', 'settled') THEN
            RAISE EXCEPTION 'Security Policy Violation: Cannot modify active/locked financing request from status % to %.', OLD.status, NEW.status;
        END IF;

        IF NOT (
            (OLD.status = 'offer_received' AND NEW.status = 'borrower_accepted') OR
            (OLD.status IN ('pending', 'under_review', 'offer_received') AND NEW.status IN ('rejected', 'cancelled'))
        ) THEN
            RAISE EXCEPTION 'Security Policy Violation: Unauthorized borrower financing status transition from % to %.', OLD.status, NEW.status;
        END IF;
    END IF;

    IF (NEW.approved_amount IS DISTINCT FROM OLD.approved_amount) OR
       (NEW.offered_amount IS DISTINCT FROM OLD.offered_amount) OR
       (NEW.interest_rate IS DISTINCT FROM OLD.interest_rate) OR
       (NEW.tenor_days IS DISTINCT FROM OLD.tenor_days) OR
       (NEW.disbursed_at IS DISTINCT FROM OLD.disbursed_at) OR
       (NEW.bank_utr IS DISTINCT FROM OLD.bank_utr) OR
       (NEW.financier_id IS DISTINCT FROM OLD.financier_id) OR
       (NEW.financier_name IS DISTINCT FROM OLD.financier_name) OR
       (NEW.financier_email IS DISTINCT FROM OLD.financier_email) OR
       (NEW.receipt_id IS DISTINCT FROM OLD.receipt_id) OR
       (NEW.receipt_number IS DISTINCT FROM OLD.receipt_number) OR
       (NEW.order_id IS DISTINCT FROM OLD.order_id) OR
       (NEW.order_number IS DISTINCT FROM OLD.order_number) OR
       (NEW.applicant_id IS DISTINCT FROM OLD.applicant_id) OR
       (NEW.repaid_at IS DISTINCT FROM OLD.repaid_at) OR
       (NEW.repayment_method IS DISTINCT FROM OLD.repayment_method) OR
       (NEW.repayment_transaction_id IS DISTINCT FROM OLD.repayment_transaction_id) OR
       (NEW.repayment_amount IS DISTINCT FROM OLD.repayment_amount) OR
       (NEW.repayment_principal IS DISTINCT FROM OLD.repayment_principal) OR
       (NEW.repayment_interest IS DISTINCT FROM OLD.repayment_interest) OR
       (NEW.repayment_notes IS DISTINCT FROM OLD.repayment_notes) THEN
        RAISE EXCEPTION 'Security Policy: Borrowers are not permitted to modify underwriting terms, collateral links, or settlement fields.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_financing_approval_fields ON public.financing_requests;
CREATE TRIGGER trg_protect_financing_approval_fields
    BEFORE UPDATE ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_financing_approval_fields();

CREATE OR REPLACE FUNCTION public.protect_financing_insert_and_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_verified_financier() OR public.is_admin() OR (auth.jwt() ->> 'role') = 'service_role' OR auth.role() = 'service_role' OR pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.status, 'pending') <> 'pending' THEN
            RAISE EXCEPTION 'Security Policy Violation: New financing requests must start in pending status.';
        END IF;
        IF NEW.approved_amount IS NOT NULL AND NEW.approved_amount IS DISTINCT FROM NEW.requested_amount THEN
            RAISE EXCEPTION 'Security Policy Violation: Borrowers cannot pre-set approved_amount.';
        END IF;
        IF NEW.financier_id IS NOT NULL OR NEW.disbursed_at IS NOT NULL OR NEW.repaid_at IS NOT NULL THEN
            RAISE EXCEPTION 'Security Policy Violation: Borrowers cannot pre-populate institutional disbursement or repayment fields.';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('offer_received', 'borrower_accepted', 'approved', 'disbursed', 'escrow_secured') THEN
            RAISE EXCEPTION 'Security Policy Violation: Cannot delete an active or collateral-locked financing record.';
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_financing_insert_and_delete ON public.financing_requests;
CREATE TRIGGER trg_protect_financing_insert_and_delete
    BEFORE INSERT OR DELETE ON public.financing_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_financing_insert_and_delete();
