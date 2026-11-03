-- ============================================================================
-- AGROLNK SECURITY FIX #3: MAKE PROOF & KYC STORAGE BUCKETS STRICTLY PRIVATE
-- File: supabase/lock_down_storage_proof_bucket.sql
-- ============================================================================

-- 1. Ensure 'proof' and 'kyc' buckets are strictly private (Blocks anonymous listing & downloads)
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('proof', 'kyc');

-- Ensure 'listings' bucket remains public for marketplace produce photos
UPDATE storage.buckets 
SET public = true 
WHERE id = 'listings';

-- 2. Drop all insecure / open SELECT policies on storage.objects
DROP POLICY IF EXISTS "AgroLnk Public View Listings and Proof" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read proof" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read kyc" ON storage.objects;

-- 3. Policy: Public Read ONLY for produce listings photos
DROP POLICY IF EXISTS "AgroLnk Public View Listings" ON storage.objects;
CREATE POLICY "AgroLnk Public View Listings"
ON storage.objects FOR SELECT
USING (bucket_id = 'listings');

-- 4. Policy: Authenticated Private Access for Proof and KYC documents
-- (Only document owner or platform administrator can read or create signed URLs)
DROP POLICY IF EXISTS "AgroLnk Authenticated Document Access" ON storage.objects;
CREATE POLICY "AgroLnk Authenticated Document Access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('proof', 'kyc')
  AND (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') = 'admin@agrolnk.com'
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid()::text AND role = 'admin'
    )
    OR owner::text = auth.uid()::text
    OR name LIKE ('%' || auth.uid()::text || '%')
  )
);

-- 5. Policy: Authenticated File Uploads (Strict isolation for KYC and Proof documents)
DROP POLICY IF EXISTS "AgroLnk Authenticated Document Upload" ON storage.objects;
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

-- 6. Policy: Owners and Admins can Update their objects
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

-- 7. Policy: Owners and Admins can Delete their objects
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
