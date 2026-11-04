-- ============================================================================
-- AGROLNK SECURITY FIX: ELIMINATE PHONE-TO-EMAIL ENUMERATION LEAK
-- File: supabase/lock_down_phone_auth_leak.sql
-- ============================================================================

-- 1. DROP the insecure lookup function that leaked emails without credentials
DROP FUNCTION IF EXISTS public.get_auth_email_for_phone(text);
DROP FUNCTION IF EXISTS public.check_phone_exists(text);

-- 2. CREATE secure authentication RPC: Only returns email if password crypt matches
CREATE OR REPLACE FUNCTION public.authenticate_phone_credentials(
    p_phone TEXT,
    p_password TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_clean_phone TEXT;
    v_email TEXT;
    v_encrypted_pwd TEXT;
    v_matched BOOLEAN := FALSE;
BEGIN
    -- Extract clean 10-digit Indian mobile number
    v_clean_phone := RIGHT(REGEXP_REPLACE(p_phone, '\D', '', 'g'), 10);
    IF LENGTH(v_clean_phone) < 10 OR p_password IS NULL OR LENGTH(p_password) = 0 THEN
        RETURN NULL;
    END IF;

    -- Look up matching profile and corresponding auth.users encrypted password
    SELECT p.email, u.encrypted_password
    INTO v_email, v_encrypted_pwd
    FROM public.profiles p
    JOIN auth.users u ON u.id::text = p.id
    WHERE RIGHT(REGEXP_REPLACE(COALESCE(p.phone, ''), '\D', '', 'g'), 10) = v_clean_phone
    LIMIT 1;

    IF v_email IS NULL OR v_encrypted_pwd IS NULL THEN
        RETURN NULL;
    END IF;

    -- Verify password using pgcrypto gen_salt / crypt
    IF v_encrypted_pwd = crypt(p_password, v_encrypted_pwd) THEN
        RETURN v_email;
    END IF;

    -- Return NULL on incorrect password - NEVER leaks whether the phone exists
    RETURN NULL;
END;
$$;

-- Allow anon and authenticated to execute this authenticated RPC
GRANT EXECUTE ON FUNCTION public.authenticate_phone_credentials(TEXT, TEXT) TO anon, authenticated;

