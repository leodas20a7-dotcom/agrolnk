import { supabase } from '../lib/supabase';

/**
 * Resolves a secure, short-lived signed URL (default 15 minutes = 900 seconds)
 * for sensitive compliance, KYC, and warehouse documents stored in private buckets.
 * 
 * - If already a base64 Data URL or Blob URL, returns it immediately.
 * - If given a storage path or full URL, extracts the bucket and relative path,
 *   and generates a signed URL with HMAC token from Supabase Storage.
 *
 * @param {string} pathOrUrl - File path, legacy public URL, or base64 data URI
 * @param {number} [expiresIn=900] - Expiry in seconds (default 15 minutes)
 * @returns {Promise<string>} - Temporary signed URL or fallback string
 */
export async function getSecureDocumentUrl(pathOrUrl, expiresIn = 900) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const trimmed = pathOrUrl.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  try {
    let bucket = 'proof';
    let cleanPath = trimmed;

    // Detect if this is a full Supabase storage URL
    // e.g. https://<ref>.supabase.co/storage/v1/object/public/proof/kyc/filename.jpg
    if (trimmed.includes('/storage/v1/object/')) {
      const parts = trimmed.split('/storage/v1/object/');
      const after = parts[1] || '';
      const segments = after.split('/');
      // Remove 'public', 'authenticated', or 'sign' prefix if present
      if (['public', 'authenticated', 'sign'].includes(segments[0])) {
        segments.shift();
      }
      if (segments.length >= 2) {
        bucket = segments[0]; // e.g. 'proof' or 'kyc'
        cleanPath = segments.slice(1).join('/').split('?')[0]; // strip old query params
      }
    } else if (cleanPath.startsWith('kyc/') || cleanPath.startsWith('warehouse_')) {
      bucket = 'proof';
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expiresIn);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('getSecureDocumentUrl notice:', err);
  }

  return pathOrUrl;
}

