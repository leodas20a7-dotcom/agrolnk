import { createClient } from '@supabase/supabase-js';

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SERVICE_ROLE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error('Missing env vars. Set OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY, NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const oldSupa = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newSupa = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

async function listAllPaths(client, bucket, prefix = '') {
  const paths = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit, offset });
    if (error) throw new Error(`List failed for ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        const nested = await listAllPaths(client, bucket, fullPath);
        paths.push(...nested);
      } else {
        paths.push({ path: fullPath, contentType: item.metadata?.mimetype || 'application/octet-stream' });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }
  return paths;
}

async function fileExistsInNewS3(bucket, filePath) {
  try {
    if (bucket === 'listings') {
      const { data } = newSupa.storage.from(bucket).getPublicUrl(filePath);
      const res = await fetch(data.publicUrl, { method: 'HEAD' });
      return res.ok;
    }
    const { data, error } = await newSupa.storage.from(bucket).createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) return false;
    const res = await fetch(data.signedUrl, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function copyFileWithRetry(bucket, path, contentType, retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const { data: blob, error: dlErr } = await oldSupa.storage.from(bucket).download(path);
      if (dlErr || !blob) throw new Error(dlErr?.message || 'Empty download');

      const buffer = Buffer.from(await blob.arrayBuffer());
      const { error: upErr } = await newSupa.storage.from(bucket).upload(path, buffer, {
        contentType,
        upsert: true,
        cacheControl: bucket === 'listings' ? '31536000' : '3600',
      });
      if (upErr) throw new Error(upErr.message);
      return;
    } catch (err) {
      if (attempt > retries) throw err;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

async function copyBucket(bucket) {
  console.log(`\n=== Copying bucket: ${bucket} ===`);
  const files = await listAllPaths(oldSupa, bucket);
  console.log(`Found ${files.length} files in ${bucket}. Verifying & copying missing S3 objects...`);

  let copied = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const { path, contentType } = files[i];
    try {
      const exists = await fileExistsInNewS3(bucket, path);
      if (exists) {
        skipped++;
      } else {
        await copyFileWithRetry(bucket, path, contentType);
        copied++;
      }

      if ((i + 1) % 25 === 0 || i === files.length - 1) {
        console.log(`  [${bucket}] ${i + 1}/${files.length} checked (copied: ${copied}, already present: ${skipped}, failed: ${failed})`);
      }
    } catch (err) {
      failed++;
      console.warn(`  [${bucket}] Failed ${path}: ${err.message}`);
    }
  }

  console.log(`Done ${bucket}: ${copied} copied, ${skipped} already present, ${failed} failed.`);
}

for (const bucket of ['listings', 'proof', 'kyc']) {
  await copyBucket(bucket);
}
console.log('\nAll storage buckets processed!');
