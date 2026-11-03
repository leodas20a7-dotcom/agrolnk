-- ============================================================================
-- AGROLNK SECURITY FIX #3: MAKE PROOF & KYC STORAGE BUCKETS STRICTLY PRIVATE
-- File: supabase/lock_down_storage_proof_bucket.sql
-- Description:
--   1. Converts 'proof' and 'kyc' storage buckets to private (public = false).
--      Prevents anonymous visitors from listing or downloading KYC IDs (Aadhaar/PAN)
--      and warehouse compliance documents (GST, WDRA, Insurance).
--   2. Keeps 'listings' bucket public (public = true) for crop produce lot photos.
--   3. Enforces strict Storage Row-Level Security on storage.objects:
--      - Public users can only read from 'listings'.
--      - Authenticated account owners and platform administrators can access
--        their respective documents in 'proof' and 'kyc' via signed URLs.
-- ============================================================================

-- 1. Ensure 'proof' and 'kyc' buckets are strictly private
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
    OR auth.uid()::text = owner
    OR name LIKE ('%' || auth.uid()::text || '%')
  )
);

-- 5. Policy: Authenticated File Uploads
DROP POLICY IF EXISTS "AgroLnk Authenticated Document Upload" ON storage.objects;
CREATE POLICY "AgroLnk Authenticated Document Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('listings', 'proof', 'kyc')
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
  OR auth.uid()::text = owner
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
  OR auth.uid()::text = owner
);
