-- =============================================================================
-- AgroLnk Supabase Storage Buckets & Access Security Configuration
-- Order-Independent & Idempotent:
--   Safe to run BEFORE or AFTER any storage hardening patch without leaving
--   public 'proof' reads or wiping out upload permissions.
-- Buckets:
--   1. listings (Public): Farmer crop produce lot photos & videos
--   2. proof (Private): Transporter e-way bills, weighbridge slips, lab reports
--   3. kyc (Private): Government ID proofs, GST certificates, bank documents
-- =============================================================================

-- 1. Create or reconcile storage buckets with canonical privacy settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'listings',
    'listings',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  ),
  (
    'proof',
    'proof',
    false,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']
  ),
  (
    'kyc',
    'kyc',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Dynamically clear all legacy/duplicate policies on storage.objects
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

-- 3. Canonical SELECT on public listings bucket
CREATE POLICY "agrolnk_public_listings_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- 4. Canonical SELECT on private proof & kyc buckets (Admins or Owners)
CREATE POLICY "agrolnk_private_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN ('proof', 'kyc')
    AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()::text AND role = 'admin'
        )
        OR owner::text = auth.uid()::text
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
        OR name LIKE (auth.uid()::text || '/%')
        OR name LIKE ('%/' || auth.uid()::text || '/%')
        OR name LIKE ('%' || auth.uid()::text || '%')
    )
);

-- 5. Canonical INSERT on listings + user-isolated private buckets
CREATE POLICY "agrolnk_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'listings'
    OR (
        bucket_id IN ('proof', 'kyc')
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid()::text AND role = 'admin'
            )
            OR owner::text = auth.uid()::text
            OR (storage.foldername(name))[1] = auth.uid()::text
            OR (storage.foldername(name))[2] = auth.uid()::text
            OR name LIKE (auth.uid()::text || '/%')
            OR name LIKE ('%/' || auth.uid()::text || '/%')
            OR name LIKE ('%' || auth.uid()::text || '%')
        )
    )
);

-- 6. Canonical UPDATE & DELETE (Admins or Owners)
CREATE POLICY "agrolnk_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()::text AND role = 'admin'
    )
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);

CREATE POLICY "agrolnk_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('agrolnkadmin@gmail.com', 'admin@agrolnk.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()::text AND role = 'admin'
    )
    OR owner::text = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE (auth.uid()::text || '/%')
    OR name LIKE ('%/' || auth.uid()::text || '/%')
    OR name LIKE ('%' || auth.uid()::text || '%')
);
