-- Allow authenticated farmers to update their own warehouse_receipts
-- (accepting/declining quotes, marking in_transit after Razorpay advance, and recording rent payments).
DROP POLICY IF EXISTS "warehouse_receipts_farmer_update_policy" ON public.warehouse_receipts;
CREATE POLICY "warehouse_receipts_farmer_update_policy" ON public.warehouse_receipts
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = farmer_id)
  WITH CHECK (
    auth.uid()::text = farmer_id
    AND COALESCE(status, 'quote_requested') IN (
      'quote_requested', 'quote_provided', 'in_transit', 'stored', 'partially_listed', 'listed', 'rejected'
    )
  );
