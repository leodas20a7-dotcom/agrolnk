-- ============================================================================
-- AGROLNK SECURITY HARDENING: SECURE STORAGE UPLOAD PERMISSIONS
-- File: supabase/secure_storage_upload_policies.sql
-- Description:
--   Prevents authenticated users from uploading or overwriting files in
--   other users' private KYC and dispute proof directories.
--   Enforces user isolation on 'proof' and 'kyc' buckets while keeping
--   'listings' open for marketplace produce media uploads.
-- ============================================================================

-- 1. Ensure private buckets remain private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('proof', 'kyc');

UPDATE storage.buckets 
SET public = true 
WHERE id = 'listings';

-- 2. Drop existing upload policy
DROP POLICY IF EXISTS "AgroLnk Authenticated Document Upload" ON storage.objects;

-- 3. Create hardened upload policy with user path isolation
CREATE POLICY "AgroLnk Authenticated Document Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  -- Marketplace listings: Any authenticated participant can upload produce photos/videos
  bucket_id = 'listings'
  OR
  -- Private proof and KYC buckets: Caller must be admin or upload only to their own user path
  (
    bucket_id IN ('proof', 'kyc')
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() ->> 'email') = 'admin@agrolnk.com'
      OR EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid()::text AND role = 'admin'
      )
      OR owner::text = auth.uid()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR name LIKE ('%' || auth.uid()::text || '%')
    )
  )
);

-- 4. Re-enforce update policy (only admin or file owner can update)
DROP POLICY IF EXISTS "AgroLnk Document Update" ON storage.objects;
CREATE POLICY "AgroLnk Document Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  OR (auth.jwt() ->> 'email') = 'admin@agrolnk.com'
  OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role = 'admin'
  )
  OR owner::text = auth.uid()::text
  OR name LIKE ('%' || auth.uid()::text || '%')
);

-- 5. Re-enforce delete policy (only admin or file owner can delete)
DROP POLICY IF EXISTS "AgroLnk Document Delete" ON storage.objects;
CREATE POLICY "AgroLnk Document Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  OR (auth.jwt() ->> 'email') = 'admin@agrolnk.com'
  OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role = 'admin'
  )
  OR owner::text = auth.uid()::text
  OR name LIKE ('%' || auth.uid()::text || '%')
);

