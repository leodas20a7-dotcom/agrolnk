// AgroLnk Commodities & Commercial Varieties Database Engine
import { supabase } from '../lib/supabase';
import {
  COMMODITY_TAXONOMY,
  COMMODITY_GROUPS,
  CATEGORY_FALLBACK_IMAGES,
} from '../data/commodityTaxonomy';
import { COMMODITY_IMAGES } from './listings';

const COMMODITIES_CUSTOM_STORAGE_KEY = 'agrolnk_commodities_custom_store_v1';

/**
 * Normalizes varieties to a uniform array of objects: { name: string, imageUrl: string }
 */
export function normalizeVarietyList(varieties) {
  if (!Array.isArray(varieties)) return [];
  return varieties
    .map((v) => {
      if (!v) return null;
      if (typeof v === 'string') {
        const name = v.trim();
        return name ? { name, imageUrl: '' } : null;
      }
      if (typeof v === 'object') {
        const name = (v.name || '').trim();
        const imageUrl = (v.imageUrl || v.image_url || '').trim();
        return name ? { name, imageUrl } : null;
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Retrieve local overrides/custom commodities
 */
function getStoredCustomStore() {
  if (typeof localStorage === 'undefined') return { overrides: {}, additions: [], deletions: [] };
  try {
    const raw = localStorage.getItem(COMMODITIES_CUSTOM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { overrides: {}, additions: [], deletions: [] };
  } catch {
    return { overrides: {}, additions: [], deletions: [] };
  }
}

/**
 * Save local overrides/custom commodities
 */
function saveStoredCustomStore(store) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(COMMODITIES_CUSTOM_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Failed to save commodities custom store:', err);
  }
}

/**
 * Build a canonical merged list of all commodities and their varieties
 */
export async function getAdminCommoditiesList() {
  const store = getStoredCustomStore();
  let dbRows = [];

  try {
    const { data, error } = await supabase
      .from('commodities')
      .select('*')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data)) {
      dbRows = data;
    }
  } catch (err) {
    console.warn('Supabase commodities query fallback to taxonomy:', err);
  }

  // Create a map indexed by lowercase name
  const resultMap = new Map();

  // 1. Populate base taxonomy items
  COMMODITY_TAXONOMY.forEach((item) => {
    const key = item.name.trim().toLowerCase();
    const id = 'cmd_' + item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const group = item.group || 'Agriculture';
    const fallbackImage = COMMODITY_IMAGES[item.name] || CATEGORY_FALLBACK_IMAGES[group] || CATEGORY_FALLBACK_IMAGES.Other;

    resultMap.set(key, {
      id,
      name: item.name,
      group,
      varieties: normalizeVarietyList(item.varieties),
      imageUrl: fallbackImage,
      isCustom: false,
      source: 'taxonomy',
    });
  });

  // 2. Merge database rows from Supabase
  dbRows.forEach((row) => {
    if (!row || !row.name) return;
    const key = row.name.trim().toLowerCase();
    const existing = resultMap.get(key);

    const group = row.group_name || (row.category && COMMODITY_GROUPS.includes(row.category) ? row.category : null) || existing?.group || 'Agriculture';
    const fallbackImage = row.image_url || existing?.imageUrl || COMMODITY_IMAGES[row.name] || CATEGORY_FALLBACK_IMAGES[group] || CATEGORY_FALLBACK_IMAGES.Other;

    let rawVarieties = existing?.varieties || [];
    if (row.varieties && Array.isArray(row.varieties) && row.varieties.length > 0) {
      rawVarieties = row.varieties;
    }

    resultMap.set(key, {
      id: row.id || existing?.id || 'cmd_' + row.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: row.name,
      group,
      varieties: normalizeVarietyList(rawVarieties),
      imageUrl: fallbackImage,
      isCustom: !existing,
      createdAt: row.created_at,
      source: 'database',
    });
  });

  // 3. Apply local additions
  if (Array.isArray(store.additions)) {
    store.additions.forEach((item) => {
      if (!item || !item.name) return;
      const key = item.name.trim().toLowerCase();
      resultMap.set(key, {
        ...item,
        varieties: normalizeVarietyList(item.varieties),
        isCustom: true,
      });
    });
  }

  // 4. Apply local overrides
  if (store.overrides && typeof store.overrides === 'object') {
    Object.keys(store.overrides).forEach((key) => {
      const match = resultMap.get(key.toLowerCase());
      if (match) {
        resultMap.set(key.toLowerCase(), {
          ...match,
          ...store.overrides[key],
        });
      }
    });
  }

  // 5. Exclude deleted items
  if (Array.isArray(store.deletions)) {
    const delSet = new Set(store.deletions.map((d) => d.toLowerCase()));
    delSet.forEach((k) => resultMap.delete(k));
  }

  // Return sorted array
  return Array.from(resultMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Detects Supabase RLS / authorization errors so non-admin catalog mutations fail closed.
 */
function isSupabaseSecurityError(err) {
  if (!err) return false;
  const code = String(err.code || '').trim();
  if (code === '42501' || code === 'P0001' || code === '401' || code === '403') return true;
  if (err.status === 401 || err.status === 403) return true;
  const msg = String(err.message || err.details || '');
  return /row-level security|permission denied|not allowed|security policy|forbidden|unauthorized|admin/i.test(msg);
}

/**
 * Emits global UI notifications after verified catalog changes.
 */
function notifyCommoditiesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_commodities_updated'));
    window.dispatchEvent(new Event('storage'));
  }
}

/**
 * Add / Create a new commodity with varieties and image (Admin-enforced)
 */
export async function createCommodity({ name, group, imageUrl, varieties = [] }) {
  if (!name || typeof name !== 'string') throw new Error('Commodity name is required.');
  const cleanName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
  const cleanGroup = group || 'Vegetables';
  const cleanVarieties = normalizeVarietyList(varieties);
  const cleanImage = imageUrl || CATEGORY_FALLBACK_IMAGES[cleanGroup] || CATEGORY_FALLBACK_IMAGES.Other;
  const id = 'cmd_' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const newCommodity = {
    id,
    name: cleanName,
    group: cleanGroup,
    varieties: cleanVarieties,
    imageUrl: cleanImage,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  // 1. Persist to Supabase commodities table first so RLS rejects unauthorized users
  try {
    const payload = {
      id,
      name: cleanName,
      category: cleanGroup,
      image_url: cleanImage,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('commodities').upsert({
      ...payload,
      varieties: cleanVarieties,
    }, { onConflict: 'name' });

    if (error) {
      if (isSupabaseSecurityError(error)) {
        throw new Error('Permission denied: Only platform administrators can create catalog commodities.');
      }
      // Retry without varieties column when schema lacks it
      const { error: fallbackError } = await supabase.from('commodities').upsert(payload, { onConflict: 'name' });
      if (isSupabaseSecurityError(fallbackError)) {
        throw new Error('Permission denied: Only platform administrators can create catalog commodities.');
      }
      if (fallbackError) {
        console.warn('Could not sync created commodity to Supabase:', fallbackError);
      }
    }
  } catch (err) {
    if (isSupabaseSecurityError(err)) throw err;
    console.warn('Could not sync created commodity to Supabase:', err);
  }

  // 2. Update local custom store after server validation
  const store = getStoredCustomStore();
  store.additions = (store.additions || []).filter((c) => c.name.toLowerCase() !== cleanName.toLowerCase());
  store.additions.push(newCommodity);
  store.deletions = (store.deletions || []).filter((d) => d.toLowerCase() !== cleanName.toLowerCase());
  saveStoredCustomStore(store);

  notifyCommoditiesUpdated();
  return newCommodity;
}

/**
 * Update an existing commodity (Name, Group, Image URL, Varieties) (Admin-enforced)
 */
export async function updateCommodity(id, { name, group, imageUrl, varieties }) {
  if (!name || typeof name !== 'string') throw new Error('Commodity name is required.');
  const cleanName = name.trim();
  const cleanGroup = group || 'Vegetables';
  const cleanVarieties = normalizeVarietyList(varieties);
  const cleanImage = imageUrl || CATEGORY_FALLBACK_IMAGES[cleanGroup] || CATEGORY_FALLBACK_IMAGES.Other;
  const safeId = id || 'cmd_' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const updatedRecord = {
    id: safeId,
    name: cleanName,
    group: cleanGroup,
    varieties: cleanVarieties,
    imageUrl: cleanImage,
    updatedAt: new Date().toISOString(),
  };

  // 1. Sync to Supabase first so RLS enforces admin privileges
  try {
    const payload = {
      name: cleanName,
      category: cleanGroup,
      image_url: cleanImage,
    };

    const { error } = await supabase
      .from('commodities')
      .update({
        ...payload,
        varieties: cleanVarieties,
      })
      .or(`id.eq.${safeId},name.eq.${cleanName}`);

    if (error) {
      if (isSupabaseSecurityError(error)) {
        throw new Error('Permission denied: Only platform administrators can update catalog commodities.');
      }
      const { error: fallbackError } = await supabase
        .from('commodities')
        .update(payload)
        .or(`id.eq.${safeId},name.eq.${cleanName}`);
      if (isSupabaseSecurityError(fallbackError)) {
        throw new Error('Permission denied: Only platform administrators can update catalog commodities.');
      }
      if (fallbackError) {
        console.warn('Could not sync commodity update to Supabase:', fallbackError);
      }
    }
  } catch (err) {
    if (isSupabaseSecurityError(err)) throw err;
    console.warn('Could not sync commodity update to Supabase:', err);
  }

  // 2. Update local store & image cache after verification
  const store = getStoredCustomStore();
  if (!store.overrides) store.overrides = {};
  store.overrides[cleanName.toLowerCase()] = updatedRecord;
  saveStoredCustomStore(store);

  COMMODITY_IMAGES[cleanName] = cleanImage;
  notifyCommoditiesUpdated();
  return updatedRecord;
}

/**
 * Delete a commodity permanently (Admin-enforced)
 */
export async function deleteCommodity(id, name) {
  if (!name && !id) throw new Error('Commodity identifier required.');
  const cleanName = (name || '').trim();

  // 1. Delete from Supabase first so RLS rejects unauthorized users
  try {
    let query = supabase.from('commodities').delete();
    if (id) {
      query = query.or(`id.eq.${id},name.eq.${cleanName}`);
    } else {
      query = query.eq('name', cleanName);
    }
    const { error } = await query;
    if (error) {
      if (isSupabaseSecurityError(error)) {
        throw new Error('Permission denied: Only platform administrators can delete catalog commodities.');
      }
      console.warn('Could not delete commodity from Supabase:', error);
    }
  } catch (err) {
    if (isSupabaseSecurityError(err)) throw err;
    console.warn('Could not delete commodity from Supabase:', err);
  }

  // 2. Update local store after server deletion succeeds
  const store = getStoredCustomStore();
  if (!store.deletions) store.deletions = [];
  if (cleanName && !store.deletions.includes(cleanName.toLowerCase())) {
    store.deletions.push(cleanName.toLowerCase());
  }
  if (store.additions) {
    store.additions = store.additions.filter((c) => c.name.toLowerCase() !== cleanName.toLowerCase());
  }
  if (store.overrides && cleanName) {
    delete store.overrides[cleanName.toLowerCase()];
  }
  saveStoredCustomStore(store);

  notifyCommoditiesUpdated();
  return { success: true };
}
