import { supabase } from '../lib/supabase';

/**
 * Compress an image file to standard web resolution and size
 * @param {File} file
 * @param {number} maxWidth
 * @param {number} quality
 * @returns {Promise<string>} Base64 data URL
 */
export function compressImageToBase64(file, maxWidth = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;

        const ctx = elem.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = elem.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Safe wrapper for localStorage.setItem to gracefully handle QuotaExceededError
 */
export function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
      console.warn('LocalStorage quota warning. Evicting temporary event logs...');
      try {
        localStorage.removeItem('agrolnk_live_escrow_events_v2');
        localStorage.setItem(key, value);
        return true;
      } catch (_evictErr) {
        console.warn('Storage quota fully saturated; skipping local cache for:', key);
        return false;
      }
    }
    return false;
  }
}

/**
 * Uploads a produce image to Supabase Storage if a bucket exists,
 * or safely falls back to compressed Base64 data URL.
 * 
 * @param {File} file - The image file selected by farmer
 * @param {string} [folder='produce'] - Subfolder or bucket name
 * @returns {Promise<string>} Permanent public URL or self-contained Base64 Data URL
 */
export async function uploadProduceImage(file, folder = 'listings') {
  if (!file) return null;

  try {
    // 1. First generate compressed Base64 representation (800px web optimized)
    const base64Data = await compressImageToBase64(file, 800, 0.72);

    // 2. Try uploading to Supabase Storage bucket 'listings' or 'produce'
    try {
      const ext = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const filePath = `${fileName}`;

      // Try 'listings' bucket first, then 'proof'
      const bucketsToTry = ['listings', 'produce', 'proof'];
      for (const bucket of bucketsToTry) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        }
      }
    } catch (storageErr) {
      console.info('Storage bucket not active, using web-optimized image storage:', storageErr);
    }

    // 3. Fallback: Base64 data URL is saved into DB row and renders everywhere
    return base64Data;
  } catch (err) {
    console.error('Failed to process image:', err);
    return null;
  }
}
