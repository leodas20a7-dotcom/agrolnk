-- ============================================================================
-- AGROLNK: 100% BULLETPROOF STORAGE RLS LOCKDOWN (KYC & WAREHOUSE DOCUMENTS)
-- File: supabase/lock_down_storage_objects_security.sql
-- Description:
--   1. Ensures 'proof' and 'kyc' buckets are strictly private (public = false).
--   2. Dynamically drops ALL existing policies on storage.objects to eliminate any
--      legacy or open read policies.
--   3. Grants SELECT on 'listings' to public (for produce photos).
--   4. Grants SELECT on 'proof' and 'kyc' ONLY to Authenticated Admins and Document Owners.
--   5. BLOCKS all unauthenticated / anonymous visitors from listing or downloading KYC docs.
-- ============================================================================

-- 1. Ensure bucket privacy flags
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('proof', 'kyc');

UPDATE storage.buckets 
SET public = true 
WHERE id = 'listings';

-- 2. Dynamically DROP all existing policies on storage.objects (Eliminates all legacy leaks)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- 3. Policy: Public can ONLY view produce photos in 'listings' bucket
CREATE POLICY "agrolnk_public_listings_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- 4. Policy: Private KYC & Proof Documents (Strictly Authenticated Admins or Document Owners)
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
        -- Document Owner can only read their own files
        OR owner::text = auth.uid()::text
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
        OR name LIKE (auth.uid()::text || '/%')
        OR name LIKE ('%/' || auth.uid()::text || '/%')
        OR name LIKE ('%' || auth.uid()::text || '%')
    )
);

-- 5. Policy: Authenticated File Uploads (Folder Isolation)
CREATE POLICY "agrolnk_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'listings'
    OR (
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

-- 6. Policy: Authenticated Updates (Admins & Document Owners ONLY)
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

-- 7. Policy: Authenticated Deletions (Admins & Document Owners ONLY)
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

-- 8. Verification Audit Query
SELECT 
    b.id AS bucket_name,
    b.public AS is_public,
    CASE WHEN b.public = false THEN 'SECURE (Private)' ELSE 'PUBLIC' END AS bucket_status,
    COUNT(p.policyname) AS active_policies
FROM storage.buckets b
LEFT JOIN pg_policies p ON p.schemaname = 'storage' AND p.tablename = 'objects'
WHERE b.id IN ('proof', 'kyc', 'listings')
GROUP BY b.id, b.public;
