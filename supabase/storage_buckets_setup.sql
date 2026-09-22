-- =============================================================================
-- AgroLnk Supabase Storage Buckets & Access Security Configuration
-- Buckets:
--   1. listings (Public): Farmer crop produce lot photos & videos
--   2. proof (Public): Transporter e-way bills, warehouse weighbridge slips, lab assay reports
--   3. kyc (Private): Government ID proofs, GST certificates, Bank account passes
-- =============================================================================

-- 1. Create or ensure buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'listings', 
    'listings', 
    true, 
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  ),
  (
    'proof', 
    'proof', 
    true, 
    15728640, -- 15MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']
  ),
  (
    'kyc', 
    'kyc', 
    false, -- Strictly private
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Ensure RLS is active on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public Read for Public Buckets ('listings', 'proof')
DROP POLICY IF EXISTS "AgroLnk Public View Listings and Proof" ON storage.objects;
CREATE POLICY "AgroLnk Public View Listings and Proof"
ON storage.objects FOR SELECT
USING (bucket_id IN ('listings', 'proof'));

-- 4. Policy: Authenticated Upload to Allowed Buckets
DROP POLICY IF EXISTS "AgroLnk Authenticated Upload" ON storage.objects;
CREATE POLICY "AgroLnk Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('listings', 'proof', 'kyc')
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- 5. Policy: Private KYC Document Access (Only file owner or verified Admin can view)
DROP POLICY IF EXISTS "AgroLnk KYC Private Access" ON storage.objects;
CREATE POLICY "AgroLnk KYC Private Access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc'
  AND (
    auth.uid() = owner
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
);

-- 6. Policy: Owners can update their own uploads
DROP POLICY IF EXISTS "AgroLnk Owners Update Objects" ON storage.objects;
CREATE POLICY "AgroLnk Owners Update Objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner);

-- 7. Policy: Owners can delete their own uploads
DROP POLICY IF EXISTS "AgroLnk Owners Delete Objects" ON storage.objects;
CREATE POLICY "AgroLnk Owners Delete Objects"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid() = owner);
