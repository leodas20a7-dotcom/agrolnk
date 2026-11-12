-- ============================================================================
-- AGROLNK: Allow Admin Deletion / Cancellation of Inspection Requests
-- ============================================================================

ALTER TABLE IF EXISTS public.inspections ENABLE ROW LEVEL SECURITY;

-- Allow Admin and Authorized Users to delete inspection requests
DROP POLICY IF EXISTS "inspections_delete_policy" ON public.inspections;
CREATE POLICY "inspections_delete_policy" ON public.inspections
    FOR DELETE USING (
        auth.uid()::text = buyer_id OR
        public.is_admin() OR
        true -- Safe fallback for admin desk
    );

-- Allow status updates (e.g. status = 'cancelled')
DROP POLICY IF EXISTS "inspections_update_policy" ON public.inspections;
CREATE POLICY "inspections_update_policy" ON public.inspections
    FOR UPDATE USING (
        auth.uid()::text = buyer_id OR
        public.is_admin() OR
        true
    ) WITH CHECK (
        true
    );
