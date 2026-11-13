-- ============================================================================
-- AGROLNK: Strict Admin-Only Update & Deletion Policy for Inspection & Dispute Records
-- Security Remediation: Removes `OR true` bypass and blocks buyers/farmers/anon
-- from tampering with or deleting inspection reports and dispute arbitrations.
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- 1. Update status constraint to safely allow 'cancelled' and 'deleted'
ALTER TABLE IF EXISTS public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE IF EXISTS public.inspections ADD CONSTRAINT inspections_status_check 
  CHECK (status IN ('requested', 'assigned', 'passed', 'failed', 'disputed', 'resolved', 'cancelled', 'deleted'));

-- 2. Ensure Row Level Security is active
ALTER TABLE IF EXISTS public.inspections ENABLE ROW LEVEL SECURITY;

-- 3. Drop any legacy/permissive policies on public.inspections
DROP POLICY IF EXISTS "Allow public read inspections" ON public.inspections;
DROP POLICY IF EXISTS "Allow public write inspections" ON public.inspections;
DROP POLICY IF EXISTS "Allow public insert/update inspections" ON public.inspections;
DROP POLICY IF EXISTS "inspections_insert_update_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_select_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_insert_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_update_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_delete_policy" ON public.inspections;

-- 4. Strict SELECT policy (Only involved buyer, order/listing farmer, or Admin)
CREATE POLICY "inspections_select_policy" ON public.inspections
    FOR SELECT TO authenticated USING (
        auth.uid()::text = buyer_id OR
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE (o.id = inspections.order_id OR o.order_number = inspections.order_number)
              AND (o.farmer_id = auth.uid()::text OR o.buyer_id = auth.uid()::text)
        ) OR
        EXISTS (
            SELECT 1 FROM public.listings l
            WHERE (l.id = inspections.order_id OR l.id = inspections.order_number)
              AND l.farmer_id = auth.uid()::text
        ) OR
        public.is_admin()
    );

-- 5. Strict INSERT policy (Buyers can only create inspection requests for themselves; Admin can insert any)
CREATE POLICY "inspections_insert_policy" ON public.inspections
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR
        auth.uid()::text = buyer_id
    );

-- 6. Strict Admin-Only UPDATE & DELETE policies (No `OR true`, no buyer self-edit/self-delete of reports)
CREATE POLICY "inspections_update_policy" ON public.inspections
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "inspections_delete_policy" ON public.inspections
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 7. Defense-in-Depth Integrity Trigger on public.inspections
CREATE OR REPLACE FUNCTION public.protect_inspections_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.is_admin()
       OR (auth.jwt() ->> 'role') = 'service_role'
       OR auth.role() = 'service_role' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.status, 'requested') <> 'requested' THEN
            RAISE EXCEPTION 'Security Policy Violation: New buyer inspection requests must start in requested status.';
        END IF;
        IF COALESCE(NEW.fee_status, 'unpaid') <> 'unpaid'
           OR NEW.fee_paid_at IS NOT NULL
           OR NEW.fee_payment_id IS NOT NULL THEN
            RAISE EXCEPTION 'Security Policy Violation: Inspection fee status can only be marked paid via verified payment gateway.';
        END IF;
        IF NEW.grade IS NOT NULL
           OR NEW.moisture IS NOT NULL
           OR NEW.foreign_matter IS NOT NULL
           OR NEW.verified_weight IS NOT NULL
           OR NEW.inspector_name IS NOT NULL
           OR NEW.inspector_notes IS NOT NULL
           OR (NEW.arbitration IS NOT NULL AND NEW.arbitration <> '{}'::jsonb) THEN
            RAISE EXCEPTION 'Security Policy Violation: Buyers cannot pre-populate lab assay metrics or arbitration rulings.';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Security Policy Violation: Only Platform Administrators or Verified Settlement Services can modify or delete quality inspection and dispute records.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_inspections_integrity ON public.inspections;
CREATE TRIGGER trg_protect_inspections_integrity
    BEFORE INSERT OR UPDATE OR DELETE ON public.inspections
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_inspections_integrity();
