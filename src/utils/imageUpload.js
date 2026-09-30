import { supabase } from '../lib/supabase';

/**
 * Downscale and compress an image file using an HTML5 <canvas> element.
 * Downscales images to a maximum width/height (default 1200px) and applies
 * 80% compression quality (WebP preferred, JPEG fallback).
 * 
 * @param {File|Blob} file - The raw input file from camera or file picker
 * @param {Object} [options]
 * @param {number} [options.maxWidth=1200] - Max bounding width
 * @param {number} [options.maxHeight=1200] - Max bounding height
 * @param {number} [options.quality=0.80] - Compression quality (0.0 to 1.0)
 * @param {string} [options.preferredMimeType='image/webp'] - Target format
 * @returns {Promise<{ file: File, blob: Blob, dataUrl: string, width: number, height: number, originalSize: number, compressedSize: number, compressionRatio: number }>}
 */
export function compressImageToFile(
  file,
  {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.80,
    preferredMimeType = 'image/webp',
  } = {}
) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided for compression.'));
    }

    const originalSize = file.size || 0;
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          let { width, height } = img;

          // Downscale proportionally if dimensions exceed thresholds
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;
            const bestRatio = Math.min(widthRatio, heightRatio);

            width = Math.round(width * bestRatio);
            height = Math.round(height * bestRatio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            return reject(new Error('Could not obtain canvas 2D rendering context.'));
          }

          // Use high quality image smoothing for crisp produce textures
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // White background fallback for transparent PNGs converted to JPEG/WebP
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);

          // Verify WebP support; fallback to image/jpeg if needed
          let targetMime = preferredMimeType;
          try {
            const testUrl = canvas.toDataURL('image/webp', 0.5);
            if (!testUrl.startsWith('data:image/webp')) {
              targetMime = 'image/jpeg';
            }
          } catch {
            targetMime = 'image/jpeg';
          }

          const dataUrl = canvas.toDataURL(targetMime, quality);

          // Convert canvas to binary Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Canvas toBlob conversion produced null blob.'));
              }

              const ext = targetMime === 'image/webp' ? 'webp' : 'jpg';
              const rawName = file.name || 'produce_photo';
              const baseName = rawName.replace(/\.[^/.]+$/, '');
              const compressedFileName = `${baseName}_1200w.${ext}`;

              const compressedFile = new File([blob], compressedFileName, {
                type: targetMime,
                lastModified: Date.now(),
              });

              const compressedSize = blob.size;
              const ratio = originalSize > 0
                ? Number(((compressedSize / originalSize) * 100).toFixed(1))
                : 100;

              resolve({
                file: compressedFile,
                blob,
                dataUrl,
                width,
                height,
                originalSize,
                compressedSize,
                compressionRatio: ratio,
              });
            },
            targetMime,
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (err) => reject(new Error('Failed to load image into memory: ' + err));
      img.src = event.target.result;
    };

    reader.onerror = (err) => reject(new Error('Failed to read file buffer: ' + err));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress an image file to standard web resolution Base64 data URL
 * @param {File|Blob} file
 * @param {number} maxWidth
 * @param {number} quality
 * @returns {Promise<string>} Base64 data URL
 */
export async function compressImageToBase64(file, maxWidth = 1200, quality = 0.80) {
  const result = await compressImageToFile(file, { maxWidth, maxHeight: maxWidth, quality });
  return result.dataUrl;
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
 * Pre-compresses a produce photo using HTML5 Canvas (max 1200px width, 80% quality)
 * and uploads the optimized binary to Supabase Storage, or safely falls back to
 * the compressed WebP/JPEG Base64 data URL.
 * 
 * @param {File|Blob} file - The image file selected by farmer
 * @param {string} [folder='listings'] - Supabase storage subfolder or bucket name
 * @param {Object} [options]
 * @param {number} [options.maxWidth=1200]
 * @param {number} [options.quality=0.80]
 * @returns {Promise<string>} Permanent Supabase public URL or compressed Data URL
 */
export async function uploadProduceImage(file, folder = 'listings', options = {}) {
  if (!file) return null;

  try {
    const maxWidth = options.maxWidth || 1200;
    const quality = options.quality || 0.80;

    // 1. Client-Side HTML5 Canvas Downscaling and Compression
    const compression = await compressImageToFile(file, {
      maxWidth,
      maxHeight: maxWidth,
      quality,
    });

    const compressedFile = compression.file;
    const compressedBase64 = compression.dataUrl;

    if (process.env.NODE_ENV !== 'production') {
      console.info(
        `[AgroLnk Image Compressor] Compressed "${file.name || 'image'}" from ${(compression.originalSize / 1024).toFixed(1)} KB down to ${(compression.compressedSize / 1024).toFixed(1)} KB (${compression.width}x${compression.height}px, ${compression.compressionRatio}% of original).`
      );
    }

    // 2. Upload the COMPRESSED binary file to Supabase Storage
    try {
      const ext = compressedFile.type === 'image/webp' ? 'webp' : 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const filePath = `${fileName}`;

      // Try designated folder/bucket, with fallbacks to other common agrolnk buckets
      const bucketsToTry = Array.from(new Set([folder, 'listings', 'produce', 'proof']));

      for (const bucket of bucketsToTry) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, compressedFile, {
            contentType: compressedFile.type,
            cacheControl: '31536000', // 1 year cache
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
      console.info('Supabase Storage bucket not available, utilizing optimized Base64 data URL:', storageErr);
    }

    // 3. Fallback: Base64 data URL (now pre-compressed to ~100-250KB instead of raw 10MB)
    return compressedBase64;
  } catch (err) {
    console.error('Failed to pre-compress and upload produce image:', err);
    // As last resort, attempt basic fallback if available
    try {
      return await compressImageToBase64(file, 800, 0.70);
    } catch {
      return null;
    }
  }
}
