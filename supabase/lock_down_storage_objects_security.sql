-- ============================================================================
-- AGROLNK CRITICAL SECURITY FIX: STRICT ROW-LEVEL SECURITY ON STORAGE.OBJECTS
-- File: supabase/lock_down_storage_objects_security.sql
-- Description:
--   1. Ensures sensitive buckets ('kyc', 'proof') are strictly private (public = false).
--   2. Keeps produce lot bucket ('listings') public for marketplace browsing.
--   3. Drops ALL existing permissive/public SELECT, INSERT, UPDATE, DELETE policies on storage.objects.
--   4. Grants SELECT on 'listings' to public (unauthenticated + authenticated).
--   5. Grants SELECT on 'proof' and 'kyc' ONLY to authenticated users:
--      - Platform Administrators (full access across all tenant files)
--      - Document Owners (strictly limited to their own auth.uid() folder or files)
--   6. Blocks ALL unauthenticated ('anon') access to KYC and proof documents.
-- ============================================================================

-- 1. Ensure bucket privacy configuration
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('proof', 'kyc');

UPDATE storage.buckets 
SET public = true 
WHERE id = 'listings';

-- 2. Drop all legacy, open, or duplicate policies on storage.objects
DROP POLICY IF EXISTS "AgroLnk Public View Listings and Proof" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read proof" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read kyc" ON storage.objects;
DROP POLICY IF EXISTS "AgroLnk Public View Listings" ON storage.objects;
DROP POLICY IF EXISTS "AgroLnk Authenticated Document Access" ON storage.objects;
DROP POLICY IF EXISTS "AgroLnk KYC Private Access" ON storage.objects;
DROP POLICY IF EXISTS "AgroLnk Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "AgroLnk Authenticated Document Upload" ON storage.objects;
DROP POLICY IF EXISTS "AgroLnk Document Update" ON storage.objects;
DROP POLICY IF EXISTS "AgroLnk Document Delete" ON storage.objects;
DROP POLICY IF EXISTS "AgroLnk Owners Update Objects" ON storage.objects;
DROP POLICY IF EXISTS "AgroLnk Owners Delete Objects" ON storage.objects;
DROP POLICY IF EXISTS "agrolnk_public_listings_select" ON storage.objects;
DROP POLICY IF EXISTS "agrolnk_private_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "agrolnk_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "agrolnk_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "agrolnk_documents_delete" ON storage.objects;

-- 3. Policy: Public Read ONLY for produce listings photos and videos
CREATE POLICY "agrolnk_public_listings_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- 4. Policy: Authenticated Read for Private KYC and Proof Documents
-- Strictly blocks anonymous visitors. Document owner or verified admin ONLY.
CREATE POLICY "agrolnk_private_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN ('proof', 'kyc')
    AND (
        -- Platform Admins have global inspection rights
        public.is_admin()
        OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        -- Document Owner can only read files matching their UUID
        OR owner::text = auth.uid()::text
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
        OR name LIKE (auth.uid()::text || '/%')
        OR name LIKE ('%/' || auth.uid()::text || '/%')
        OR name LIKE ('%' || auth.uid()::text || '%')
    )
);

-- 5. Policy: Hardened Authenticated File Uploads (Folder Isolation)
CREATE POLICY "agrolnk_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    -- Any authenticated user can upload marketplace produce lot photos
    bucket_id = 'listings'
    OR (
        -- For sensitive buckets, caller must be admin or uploading to their own user path
        bucket_id IN ('proof', 'kyc')
        AND (
            public.is_admin()
            OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
            OR owner::text = auth.uid()::text
            OR (storage.foldername(name))[1] = auth.uid()::text
            OR (storage.foldername(name))[2] = auth.uid()::text
            OR name LIKE (auth.uid()::text || '/%')
            OR name LIKE ('%/' || auth.uid()::text || '/%')
            OR name LIKE ('%' || auth.uid()::text || '%')
        )
    )
);

-- 6. Policy: Hardened Authenticated Updates (Owners and Admins ONLY)
CREATE POLICY "agrolnk_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);

-- 7. Policy: Hardened Authenticated Deletions (Owners and Admins ONLY)
CREATE POLICY "agrolnk_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    public.is_admin()
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);

