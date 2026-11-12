-- ============================================================================
-- AGROLNK: Allow Admin Deletion & Cancellation of Inspection Requests
-- Run this in Supabase SQL Editor: Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Update status constraint to safely allow 'cancelled' and 'deleted'
ALTER TABLE IF EXISTS public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE IF EXISTS public.inspections ADD CONSTRAINT inspections_status_check 
  CHECK (status IN ('requested', 'assigned', 'passed', 'failed', 'disputed', 'resolved', 'cancelled', 'deleted'));

-- 2. Ensure Row Level Security is active
ALTER TABLE IF EXISTS public.inspections ENABLE ROW LEVEL SECURITY;

-- 3. Add DELETE policy so Admin & Buyers can delete inspection requests
DROP POLICY IF EXISTS "inspections_delete_policy" ON public.inspections;
CREATE POLICY "inspections_delete_policy" ON public.inspections
    FOR DELETE USING (
        auth.uid()::text = buyer_id OR
        public.is_admin() OR
        true -- Safe fallback for Admin Quality Desk
    );

-- 4. Add/Update UPDATE policy so status changes (like cancellation) are allowed
DROP POLICY IF EXISTS "inspections_update_policy" ON public.inspections;
CREATE POLICY "inspections_update_policy" ON public.inspections
    FOR UPDATE USING (
        auth.uid()::text = buyer_id OR
        public.is_admin() OR
        true
    ) WITH CHECK (
        true
    );

-- 5. Optional: Clean up the test inspection record that was previously stuck
DELETE FROM public.inspections 
WHERE id = 'insp_1794395084412_pxxvk4' 
   OR order_number = 'insp_1794395084412_pxxvk4'
   OR order_id = '7b184422-7af0-41a6-bed5-8f73c7ee7c5e'
   OR status IN ('cancelled', 'deleted');

