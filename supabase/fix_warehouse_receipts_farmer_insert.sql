-- Allow authenticated farmers to submit their own storage quote / deposit requests
-- while preventing them from self-issuing an official 'stored' e-NWR.
DROP POLICY IF EXISTS "warehouse_receipts_farmer_insert_policy" ON public.warehouse_receipts;
CREATE POLICY "warehouse_receipts_farmer_insert_policy" ON public.warehouse_receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = farmer_id
    AND COALESCE(status, 'quote_requested') IN ('quote_requested', 'pending_approval', 'pending_deposit')
  );
