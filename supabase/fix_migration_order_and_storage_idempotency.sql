-- ============================================================================
-- AGROLNK MIGRATION RECONCILIATION & STORAGE ORDER-INDEPENDENCE FIX
-- File: supabase/fix_migration_order_and_storage_idempotency.sql
-- Purpose:
--   Safely repairs any Supabase database regardless of which order legacy
--   storage or RLS patch files were executed:
--     1. Ensures 'listings' bucket is public and 'proof'/'kyc' are strictly private.
--     2. Drops ALL legacy/conflicting policies on storage.objects and installs
--        the canonical 5 agrolnk_* policies (SELECT + INSERT + UPDATE + DELETE).
--     3. Dynamically removes any lingering open USING(true)/WITH CHECK(true)
--        write policies across the public schema.
--     4. Verifies 0 open write policies remain and lists active storage rules.
-- Safe & Idempotent: Run directly in Supabase SQL Editor.
-- ============================================================================

-- 1. Enforce canonical bucket privacy
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('listings', 'listings', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('proof', 'proof', false, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']),
  ('kyc', 'kyc', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Dynamically clear ALL policies on storage.objects so no conflicting or wiped-out state persists
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

-- 3. Reinstall canonical 5 storage.objects policies
CREATE POLICY "agrolnk_public_listings_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

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

-- 4. Eliminate any leftover USING (true) / WITH CHECK (true) write policies on public schema tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
          AND (qual = 'true' OR with_check = 'true')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 5. Audit summary
SELECT
    'Public Open-Write Check' AS audit_check,
    COUNT(*)::TEXT AS result_value
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  AND (qual = 'true' OR with_check = 'true')
UNION ALL
SELECT
    'Storage Policy: ' || policyname AS audit_check,
    cmd || ' (' || array_to_string(roles, ',') || ')' AS result_value
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY audit_check;
