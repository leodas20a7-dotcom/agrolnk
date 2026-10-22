// AgroLnk Supabase Listings Management Engine
import { supabase } from '../lib/supabase';
import {
  getAllCommodityNames,
  getCommodityGroup,
  CATEGORY_FALLBACK_IMAGES,
} from '../data/commodityTaxonomy';

export const DEFAULT_COMMODITIES = getAllCommodityNames();

const CUSTOM_COMMODITIES_KEY = 'agrolnk_custom_commodities';

/**
 * Seed standard default commodities into Supabase table if table is empty
 */
export async function seedDefaultCommoditiesToSupabase() {
  try {
    const seedRows = DEFAULT_COMMODITIES.map((name) => ({
      id: 'cmd_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name,
      image_url: COMMODITY_IMAGES[name] || COMMODITY_IMAGES.Other,
    }));
    await supabase.from('commodities').upsert(seedRows, { onConflict: 'name' });
  } catch (e) {
    console.warn('Failed to seed commodities to Supabase:', e);
  }
}

/**
 * Fetch latest commodities directly from Supabase commodities table
 */
export async function fetchRemoteCommodities() {
  try {
    const { data, error } = await supabase
      .from('commodities')
      .select('name, image_url')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase commodities query error:', error.message);
      return getPlatformCommodities();
    }

    if (Array.isArray(data) && data.length > 0) {
      const remoteNames = data.map((item) => item.name?.trim()).filter(Boolean);
      // Cache image URLs
      data.forEach((item) => {
        if (item.name && item.image_url && !COMMODITY_IMAGES[item.name.trim()]) {
          COMMODITY_IMAGES[item.name.trim()] = item.image_url;
        }
      });
      // Store in local storage for fast initial render
      localStorage.setItem(CUSTOM_COMMODITIES_KEY, JSON.stringify(remoteNames));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('agrolnk_commodities_updated', {
            detail: { commodities: remoteNames },
          })
        );
      }
      return remoteNames;
    } else if (Array.isArray(data) && data.length === 0) {
      // Table exists on Supabase but is empty -> Seed defaults into Supabase
      await seedDefaultCommoditiesToSupabase();
      return DEFAULT_COMMODITIES;
    }
  } catch (err) {
    console.warn('Supabase commodities sync error:', err);
  }
  return getPlatformCommodities();
}

/**
 * Get all available commodities from cache (defaults to standard list)
 */
export function getPlatformCommodities() {
  try {
    const raw = localStorage.getItem(CUSTOM_COMMODITIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return DEFAULT_COMMODITIES;
  } catch {
    return DEFAULT_COMMODITIES;
  }
}

/**
 * Register a newly added commodity by a farmer directly into Supabase 'commodities' table
 */
export async function registerCustomCommodity(name, customImageUrl = null, createdBy = null) {
  if (!name || typeof name !== 'string') return null;
  const cleanName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
  if (!cleanName) return null;

  try {
    const currentList = getPlatformCommodities();
    if (!currentList.includes(cleanName)) {
      const updatedList = [...currentList, cleanName].sort((a, b) => a.localeCompare(b));
      localStorage.setItem(CUSTOM_COMMODITIES_KEY, JSON.stringify(updatedList));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('agrolnk_commodities_updated', {
            detail: { commodity: cleanName, commodities: updatedList },
          })
        );
      }
    }
    if (customImageUrl && !COMMODITY_IMAGES[cleanName]) {
      COMMODITY_IMAGES[cleanName] = customImageUrl;
    }

    // Insert directly into Supabase 'commodities' table
    const { error } = await supabase.from('commodities').upsert({
      id: 'cmd_' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: cleanName,
      image_url: customImageUrl || COMMODITY_IMAGES[cleanName] || null,
      created_by: createdBy || null,
    }, { onConflict: 'name' });

    if (error) {
      console.warn('Supabase custom commodity insert error:', error.message);
    }

    return cleanName;
  } catch (err) {
    console.warn('Failed to register custom commodity:', err);
    return cleanName;
  }
}

// Setup Supabase Realtime Subscription for Commodities Table
if (typeof window !== 'undefined') {
  try {
    supabase
      .channel('public:commodities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commodities' },
        () => {
          fetchRemoteCommodities();
        }
      )
      .subscribe();
  } catch (e) {
    console.info('Supabase Realtime for commodities initialized');
  }
}

export const COMMODITY_IMAGES = {
  Tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
  Onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop&q=80',
  Potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80',
  Chilli: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80',
  'Red Chilli': 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80',
  Mango: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
  Turmeric: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80',
  Rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
  'Basmati Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
  Wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80',
  Cotton: 'https://images.unsplash.com/photo-1594897030560-ab279cf66def?w=800&auto=format&fit=crop&q=80',
  Apple: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&auto=format&fit=crop&q=80',
  Cardamom: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
  Ginger: '/commodities/ginger.jpg',
  Maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&auto=format&fit=crop&q=80',
  Banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80',
  Soybean: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e53799?w=800&auto=format&fit=crop&q=80',
  Other: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80',
};

export function getCommodityFallbackImage(commodity) {
  if (commodity && COMMODITY_IMAGES[commodity]) {
    return COMMODITY_IMAGES[commodity];
  }
  const group = getCommodityGroup(commodity);
  return CATEGORY_FALLBACK_IMAGES[group] || COMMODITY_IMAGES.Other;
}

function sanitizeImages(images, commodity) {
  const fallback = getCommodityFallbackImage(commodity);
  if (!Array.isArray(images) || images.length === 0) {
    return [fallback];
  }
  return images.map((img) => {
    if (typeof img === 'string' && img.includes('photo-1635363638580-c2809d049eee')) {
      return COMMODITY_IMAGES[commodity] || COMMODITY_IMAGES.Ginger;
    }
    return img || fallback;
  });
}

const LISTING_VILLAGES_STORAGE_KEY = 'agrolnk_listing_villages';

export function getCachedListingVillage(listingId) {
  if (!listingId) return '';
  try {
    const raw = localStorage.getItem(LISTING_VILLAGES_STORAGE_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      return map[listingId] || '';
    }
  } catch {}
  return '';
}

export function setCachedListingVillage(listingId, village) {
  if (!listingId) return;
  try {
    const raw = localStorage.getItem(LISTING_VILLAGES_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (village && typeof village === 'string' && village.trim()) {
      map[listingId] = village.trim();
    } else {
      delete map[listingId];
    }
    localStorage.setItem(LISTING_VILLAGES_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

function mapListingFromDb(row) {
  if (!row) return null;

  let extractedVillage = row.village || '';
  let cleanDescription = row.description || '';

  if (!extractedVillage && cleanDescription) {
    const match = cleanDescription.match(/<!--agrolnk:village:(.*?)-->/);
    if (match) {
      try {
        extractedVillage = decodeURIComponent(match[1]);
      } catch {
        extractedVillage = match[1];
      }
      cleanDescription = cleanDescription.replace(/<!--agrolnk:village:(.*?)-->\s*/, '').trim();
    }
  }

  if (!extractedVillage && row.id) {
    extractedVillage = getCachedListingVillage(row.id);
  }

  if (row.id && extractedVillage) {
    setCachedListingVillage(row.id, extractedVillage);
  }

  let extractedPriceUnit = row.price_unit || '';
  if (!extractedPriceUnit && cleanDescription) {
    const matchPriceUnit = cleanDescription.match(/<!--agrolnk:priceUnit:(.*?)-->/);
    if (matchPriceUnit) {
      extractedPriceUnit = matchPriceUnit[1];
      cleanDescription = cleanDescription.replace(/<!--agrolnk:priceUnit:(.*?)-->\s*/, '').trim();
    }
  }

  return {
    id: row.id,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    commodity: row.commodity,
    variety: row.variety,
    grade: row.grade,
    quantity: Number(row.quantity),
    unit: row.unit,
    price: Number(row.price),
    priceUnit: extractedPriceUnit || (row.unit === 'MT' ? 'Quintal' : row.unit),
    saleType: row.sale_type,
    state: row.state,
    district: row.district,
    village: extractedVillage,
    harvestDate: row.harvest_date,
    description: cleanDescription,
    images: sanitizeImages(row.images, row.commodity),
    status: row.status,
    originWarehouseId: row.origin_warehouse_id,
    originReceiptNumber: row.origin_receipt_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all listings from Supabase
 */
export async function getListings() {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch listings from Supabase:', error);
      return [];
    }

    return (data || []).map(mapListingFromDb);
  } catch (err) {
    console.error('Error in getListings:', err);
    return [];
  }
}

/**
 * Get listings for a specific farmer from Supabase
 */
export async function getFarmerListings(farmerId) {
  try {
    if (!farmerId) return [];

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch farmer listings from Supabase:', error);
      return [];
    }

    return (data || []).map(mapListingFromDb);
  } catch (err) {
    console.error('Error in getFarmerListings:', err);
    return [];
  }
}

/**
 * Get active marketplace listings for buyers
 */
export async function getActiveMarketplaceListings(limit = null) {
  try {
    let query = supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .gt('quantity', 0)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch active marketplace listings from Supabase:', error);
      return [];
    }

    return (data || []).map(mapListingFromDb);
  } catch (err) {
    console.error('Error in getActiveMarketplaceListings:', err);
    return [];
  }
}

/**
 * Create and publish a new produce listing in Supabase
 */
export async function createListing(listingData) {
  try {
    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch {
        return `lot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    };

    const defaultImg = COMMODITY_IMAGES[listingData.commodity] || COMMODITY_IMAGES.Other;
    const imagesArray = Array.isArray(listingData.images) && listingData.images.length > 0
      ? listingData.images
      : [defaultImg];

    const listingId = generateId();
    const village = (listingData.village || '').trim();

    if (village) {
      setCachedListingVillage(listingId, village);
    }

    const dbRow = {
      id: listingId,
      farmer_id: listingData.farmerId || null,
      farmer_name: listingData.farmerName || 'Farmer',
      commodity: listingData.commodity || 'Tomato',
      variety: listingData.variety || 'None',
      grade: listingData.grade || 'A',
      quantity: Number(listingData.quantity) || 500,
      unit: listingData.unit || 'kg',
      price: Number(listingData.price) || 40,
      sale_type: listingData.saleType || 'direct',
      state: listingData.state || '',
      district: listingData.district || '',
      village: village || null,
      harvest_date: listingData.harvestDate || null,
      description: listingData.description || null,
      images: imagesArray,
      status: 'active',
      origin_warehouse_id: listingData.originWarehouseId || null,
      origin_receipt_number: listingData.origin_receipt_number || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let data;
    let error;

    const res = await supabase
      .from('listings')
      .insert([dbRow])
      .select()
      .single();

    data = res.data;
    error = res.error;

    // Fallback 1: If village column does not exist in PostgreSQL schema yet (PGRST204 or 42703)
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('village'))) {
      const fallbackRow = { ...dbRow };
      delete fallbackRow.village;
      if (village) {
        const existingDesc = fallbackRow.description || '';
        fallbackRow.description = `<!--agrolnk:village:${encodeURIComponent(village)}-->\n${existingDesc}`.trim();
      }
      const retryRes = await supabase
        .from('listings')
        .insert([fallbackRow])
        .select()
        .single();
      data = retryRes.data;
      error = retryRes.error;
    }

    // Fallback 2: If description column does not exist in PostgreSQL schema yet
    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('description'))) {
      const fallbackRow = { ...dbRow };
      delete fallbackRow.village;
      delete fallbackRow.description;
      const retryRes = await supabase
        .from('listings')
        .insert([fallbackRow])
        .select()
        .single();
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.error('Supabase listing insertion error:', error);
      throw error;
    }

    const mapped = mapListingFromDb({ ...data, village: data?.village || village });

    try {
      window.dispatchEvent(new CustomEvent('agrolnk_listings_updated', { detail: mapped }));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    return mapped;
  } catch (err) {
    console.error('Error creating listing:', err);
    throw err;
  }
}

/**
 * Update an existing produce listing in Supabase
 */
export async function updateListing(listingId, listingData) {
  try {
    if (!listingId) throw new Error('Listing ID is required for update.');

    const defaultImg = COMMODITY_IMAGES[listingData.commodity] || COMMODITY_IMAGES.Other;
    const imagesArray = Array.isArray(listingData.images) && listingData.images.length > 0
      ? listingData.images
      : [defaultImg];

    const village = (listingData.village || '').trim();
    if (village) {
      setCachedListingVillage(listingId, village);
    }

    const dbRow = {
      commodity: listingData.commodity || 'Tomato',
      variety: listingData.variety || 'None',
      grade: listingData.grade || 'A',
      quantity: Number(listingData.quantity) || 500,
      unit: listingData.unit || 'kg',
      price: Number(listingData.price) || 40,
      sale_type: listingData.saleType || 'direct',
      state: listingData.state || '',
      district: listingData.district || '',
      village: village || null,
      harvest_date: listingData.harvestDate || null,
      description: listingData.description || null,
      images: imagesArray,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('listings')
      .update(dbRow)
      .eq('id', listingId)
      .select()
      .single();

    // Fallback 1: If village column does not exist in schema yet
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('village'))) {
      const fallbackRow = { ...dbRow };
      delete fallbackRow.village;
      if (village) {
        const existingDesc = fallbackRow.description || '';
        const cleanDesc = existingDesc.replace(/<!--agrolnk:village:(.*?)-->\s*/, '').trim();
        fallbackRow.description = `<!--agrolnk:village:${encodeURIComponent(village)}-->\n${cleanDesc}`.trim();
      }
      const retryRes = await supabase
        .from('listings')
        .update(fallbackRow)
        .eq('id', listingId)
        .select()
        .single();
      data = retryRes.data;
      error = retryRes.error;
    }

    // Fallback 2: If description column does not exist
    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('description'))) {
      const fallbackRow = { ...dbRow };
      delete fallbackRow.village;
      delete fallbackRow.description;
      const retryRes = await supabase
        .from('listings')
        .update(fallbackRow)
        .eq('id', listingId)
        .select()
        .single();
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.error('Supabase listing update error:', error);
      throw error;
    }

    const mapped = mapListingFromDb({ ...data, village: data?.village || village });

    try {
      window.dispatchEvent(new CustomEvent('agrolnk_listings_updated', { detail: mapped }));
      window.dispatchEvent(new Event('storage'));
    } catch {}

  } catch (err) {
    console.error('Error updating listing:', err);
    throw err;
  }
}

/**
 * Deduct purchased quantity from listing in Supabase
 */
export async function deductListingQuantity(listingId, quantityToDeduct) {
  try {
    const { data: current, error: fetchErr } = await supabase
      .from('listings')
      .select('quantity')
      .eq('id', listingId)
      .single();

    if (fetchErr || !current) return;

    const newQty = Math.max(0, Number(current.quantity) - Number(quantityToDeduct));
    const newStatus = newQty === 0 ? 'sold' : 'active';

    const { error: updateErr } = await supabase
      .from('listings')
      .update({
        quantity: newQty,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId);

    if (updateErr) {
      console.error('Supabase listing deduction error:', updateErr);
    }
  } catch (err) {
    console.error('Error deducting listing quantity:', err);
  }
}

/**
 * Get listing by ID from Supabase
 */
export async function getListingById(id) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return mapListingFromDb(data);
  } catch {
    return null;
  }
}

const LISTING_DRAFT_PREFIX = 'agrolnk_draft_listing_';

/**
 * Save produce listing draft to local storage
 */
export function saveListingDraft(userId, draftData) {
  if (!userId || !draftData) return;
  try {
    const key = `${LISTING_DRAFT_PREFIX}${userId}`;
    const payload = {
      ...draftData,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_listing_draft_updated', { detail: payload }));
    }
  } catch (err) {
    console.warn('Failed to save listing draft:', err);
  }
}

/**
 * Retrieve saved produce listing draft for a user
 */
export function getListingDraft(userId) {
  if (!userId) return null;
  try {
    const key = `${LISTING_DRAFT_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear saved produce listing draft
 */
export function clearListingDraft(userId) {
  try {
    if (userId) {
      localStorage.removeItem(`${LISTING_DRAFT_PREFIX}${userId}`);
    }
    localStorage.removeItem(LISTING_DRAFT_PREFIX);
    localStorage.removeItem(`${LISTING_DRAFT_PREFIX}undefined`);
    localStorage.removeItem(`${LISTING_DRAFT_PREFIX}null`);
    localStorage.removeItem(`${LISTING_DRAFT_PREFIX}`);

    if (typeof localStorage !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LISTING_DRAFT_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_listing_draft_updated', { detail: null }));
    }
  } catch (err) {
    console.warn('Failed to clear listing draft:', err);
  }
}

/**
 * Check if a produce listing has active orders, bookings, or trade credit locks
 */
export async function checkListingBookings(listingId) {
  if (!listingId || listingId === 'draft_local') {
    return { canDelete: true, activeOrdersCount: 0 };
  }

  try {
    // 1. Check active/confirmed orders in Supabase
    const { data: remoteOrders, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, status, buyer_name, total_amount')
      .eq('listing_id', listingId);

    if (!orderErr && Array.isArray(remoteOrders) && remoteOrders.length > 0) {
      const activeOrders = remoteOrders.filter((o) => o.status !== 'cancelled');
      if (activeOrders.length > 0) {
        return {
          canDelete: false,
          activeOrdersCount: activeOrders.length,
          orderNumber: activeOrders[0].order_number || activeOrders[0].id,
          buyerName: activeOrders[0].buyer_name,
          reason: `A buyer (${activeOrders[0].buyer_name || 'Buyer Partner'}) has already confirmed Order ${activeOrders[0].order_number || ''} for this produce lot. Booked produce cannot be deleted to protect active delivery and payment escrow.`,
        };
      }
    }

    // 2. Check local orders cache only if remote DB check failed
    if (orderErr) {
      try {
        const rawLocal = localStorage.getItem('agrolnk_orders_local');
        if (rawLocal) {
          const localOrders = JSON.parse(rawLocal);
          const match = localOrders.find(
            (o) => (o.listingId === listingId || o.listing_id === listingId) && o.status !== 'cancelled'
          );
          if (match) {
            return {
              canDelete: false,
              activeOrdersCount: 1,
              orderNumber: match.orderNumber || match.id,
              buyerName: match.buyerName,
              reason: `A buyer (${match.buyerName || 'Buyer Partner'}) has already confirmed Order ${match.orderNumber || ''} for this produce lot. Booked produce cannot be deleted to protect active delivery and payment escrow.`,
            };
          }
        }
      } catch {}
    }

    // 3. Check if listing status itself is sold
    const { data: listingData } = await supabase
      .from('listings')
      .select('status, quantity')
      .eq('id', listingId)
      .maybeSingle();

    if (listingData && (listingData.status === 'sold' || Number(listingData.quantity) <= 0)) {
      return {
        canDelete: false,
        activeOrdersCount: 1,
        reason: 'This produce lot has already been purchased and sold out.',
      };
    }

    return { canDelete: true, activeOrdersCount: 0 };
  } catch (err) {
    console.error('Error checking listing bookings:', err);
    // On network failure or unknown state, perform safe check
    return { canDelete: true, activeOrdersCount: 0 };
  }
}

/**
 * Delete a produce listing permanently (only if unbooked)
 */
export async function deleteListing(listingId, userId) {
  if (!listingId) throw new Error('Listing ID is required.');

  // If deleting local draft
  if (listingId === 'draft_local') {
    clearListingDraft(userId);
    return { success: true, isDraft: true };
  }

  // 1. Validate that no buyer has booked/ordered this lot
  const bookingCheck = await checkListingBookings(listingId);
  if (!bookingCheck.canDelete) {
    throw new Error(bookingCheck.reason || 'This produce item has active buyer bookings and cannot be deleted.');
  }

  // 2. Delete from Supabase listings table
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId);

  if (error) {
    console.error('Supabase listing deletion error:', error);
    throw new Error(error.message || 'Failed to delete produce listing from database.');
  }

  // 3. Clear any local drafts or references if exists
  if (userId) {
    clearListingDraft(userId);
  }

  // 4. Clean local storage listing caches
  try {
    const rawLocal = localStorage.getItem('agrolnk_listings_local');
    if (rawLocal) {
      const localListings = JSON.parse(rawLocal);
      if (Array.isArray(localListings)) {
        const updated = localListings.filter((l) => l && l.id !== listingId);
        localStorage.setItem('agrolnk_listings_local', JSON.stringify(updated));
      }
    }
    // Also clean any user-scoped listing caches
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('agrolnk_farmer_listings_')) {
        try {
          const uData = JSON.parse(localStorage.getItem(k));
          if (Array.isArray(uData)) {
            const filtered = uData.filter((l) => l && l.id !== listingId);
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        } catch {}
      }
    }
  } catch (cacheErr) {
    console.warn('Local listing cache cleanup notice:', cacheErr);
  }

  // 5. Notify all components and cross-tab listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_listings_updated', { detail: { deletedId: listingId } }));
    window.dispatchEvent(new Event('storage'));
  }

  return { success: true };
}

/**
 * Permanently delete all unbooked produce listings for a farmer
 */
export async function deleteAllFarmerListings(farmerId, currentListings = []) {
  if (!farmerId) throw new Error('Farmer ID is required.');

  // 1. Fetch current listings if not provided
  let lots = currentListings;
  if (!lots || lots.length === 0) {
    lots = await getFarmerListings(farmerId);
  }

  // Clear any local drafts first
  clearListingDraft(farmerId);

  if (!lots || lots.length === 0) {
    return { deletedCount: 0, skippedCount: 0, skippedReasons: [] };
  }

  // 2. Efficiently check for active/confirmed orders on this farmer's lots in ONE single query
  const activeBookedListingIds = new Set();
  try {
    const { data: remoteOrders, error: orderErr } = await supabase
      .from('orders')
      .select('listing_id, order_number, status')
      .neq('status', 'cancelled');

    if (!orderErr && Array.isArray(remoteOrders)) {
      remoteOrders.forEach((o) => {
        if (o && o.listing_id) {
          activeBookedListingIds.add(o.listing_id);
        }
      });
    }
  } catch (err) {
    console.warn('Orders booking audit notice:', err);
  }

  // Also check local orders cache if any exist
  try {
    const rawLocalOrders = localStorage.getItem('agrolnk_orders_local');
    if (rawLocalOrders) {
      const localOrders = JSON.parse(rawLocalOrders);
      if (Array.isArray(localOrders)) {
        localOrders.forEach((o) => {
          if (o && o.status !== 'cancelled' && (o.listingId || o.listing_id)) {
            activeBookedListingIds.add(o.listingId || o.listing_id);
          }
        });
      }
    }
  } catch {}

  // 3. Separate deletable lots vs booked lots
  const unbookedLots = lots.filter(
    (lot) => lot && lot.id && lot.id !== 'draft_local' && !activeBookedListingIds.has(lot.id) && lot.status !== 'sold'
  );
  const skippedLots = lots.filter((lot) => !unbookedLots.includes(lot));
  const unbookedIds = unbookedLots.map((l) => l.id);

  // 4. Delete from Supabase in batch
  if (unbookedIds.length > 0) {
    const CHUNK_SIZE = 50;
    for (let i = 0; i < unbookedIds.length; i += CHUNK_SIZE) {
      const chunk = unbookedIds.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('listings')
        .delete()
        .in('id', chunk);

      if (error) {
        console.error('Error during batch listings deletion:', error);
        // Fallback: try deleting by farmer_id if all were to be deleted
        if (unbookedLots.length === lots.length) {
          const { error: farmerDeleteErr } = await supabase
            .from('listings')
            .delete()
            .eq('farmer_id', farmerId);
          if (farmerDeleteErr) {
            throw new Error(farmerDeleteErr.message || 'Failed to delete produce listings from database.');
          }
        } else {
          throw new Error(error.message || 'Failed to delete produce listings from database.');
        }
      }
    }
  }

  // 5. Clean local storage listing caches
  try {
    const deletedSet = new Set(unbookedIds);
    const rawLocal = localStorage.getItem('agrolnk_listings_local');
    if (rawLocal) {
      const localListings = JSON.parse(rawLocal);
      if (Array.isArray(localListings)) {
        const updated = localListings.filter((l) => l && !deletedSet.has(l.id));
        localStorage.setItem('agrolnk_listings_local', JSON.stringify(updated));
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('agrolnk_farmer_listings_')) {
        try {
          const uData = JSON.parse(localStorage.getItem(k));
          if (Array.isArray(uData)) {
            const filtered = uData.filter((l) => l && !deletedSet.has(l.id));
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        } catch {}
      }
    }
  } catch (cacheErr) {
    console.warn('Local listing cache cleanup notice:', cacheErr);
  }

  // 6. Notify all components and cross-tab listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('agrolnk_listings_updated', {
        detail: { deletedAll: true, deletedIds: unbookedIds },
      })
    );
    window.dispatchEvent(new Event('storage'));
  }

  return {
    deletedCount: unbookedIds.length,
    skippedCount: skippedLots.length,
    skippedReasons: skippedLots.map((s) => `Lot #${s.id} is booked or sold`),
  };
}

/**
 * Bulk create produce listings from parsed spreadsheet rows
 * - Accepts ANY commodity name directly (no restriction/validation)
 * - Any unrecognized/extra columns are automatically appended to the description
 * - Automatically falls back to high-quality produce images if Image URL is not provided
 */
export async function bulkCreateListings(farmerId, farmerName, rawRows = [], onProgress = null) {
  if (!farmerId) throw new Error('Farmer ID is required for bulk listing creation.');
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('No listing records provided for bulk insertion.');
  }

  const knownKeys = new Set([
    'commodity', 'crop', 'product', 'produce', 'grain', 'item', 'commodity name',
    'variety', 'type',
    'grade', 'quality',
    'quantity', 'qty', 'weight', 'volume', 'amount', 'lot quantity',
    'unit', 'uom',
    'price', 'rate', 'unit price', 'spot price', 'price per unit',
    'state', 'region', 'province',
    'district', 'city', 'location', 'mandi', 'market',
    'village', 'farmgate',
    'image', 'images', 'image url', 'photo', 'picture', 'url',
    'description', 'notes', 'remarks', 'details', 'specs', 'specifications'
  ]);

  const dbRows = rawRows.map((rawRow, idx) => {
    // Normalizing keys
    const rowNormalized = {};
    Object.keys(rawRow).forEach((k) => {
      rowNormalized[k.trim().toLowerCase()] = rawRow[k];
    });

    const commodity = (
      rowNormalized['commodity'] ||
      rowNormalized['crop'] ||
      rowNormalized['commodity name'] ||
      rowNormalized['item'] ||
      rowNormalized['product'] ||
      'Agricultural Produce'
    ).toString().trim();

    const variety = (
      rowNormalized['variety'] ||
      rowNormalized['type'] ||
      'FAQ'
    ).toString().trim();

    const grade = (
      rowNormalized['grade'] ||
      rowNormalized['quality'] ||
      'FAQ'
    ).toString().trim();

    const rawQty = rowNormalized['quantity'] || rowNormalized['qty'] || rowNormalized['weight'] || rowNormalized['volume'] || rowNormalized['amount'] || 0;
    const cleanQty = parseFloat(String(rawQty).replace(/[^0-9.]/g, '')) || 0;

    const unit = (
      rowNormalized['unit'] ||
      rowNormalized['uom'] ||
      'MT'
    ).toString().trim();

    const rawPrice = rowNormalized['price'] || rowNormalized['rate'] || rowNormalized['unit price'] || rowNormalized['spot price'] || 0;
    const cleanPrice = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;

    const state = (rowNormalized['state'] || rowNormalized['region'] || '').toString().trim();
    const district = (
      rowNormalized['district'] ||
      rowNormalized['city'] ||
      rowNormalized['location'] ||
      rowNormalized['mandi'] ||
      ''
    ).toString().trim();
    const village = (rowNormalized['village'] || rowNormalized['farmgate'] || '').toString().trim();

    // Collect any extra columns and format them for the description
    const extraDetails = [];
    Object.keys(rawRow).forEach((origKey) => {
      const lowerKey = origKey.trim().toLowerCase();
      if (!knownKeys.has(lowerKey)) {
        const val = rawRow[origKey];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          extraDetails.push(`${origKey.trim()}: ${String(val).trim()}`);
        }
      }
    });

    const baseDesc = (
      rowNormalized['description'] ||
      rowNormalized['details'] ||
      rowNormalized['specs'] ||
      rowNormalized['specifications'] ||
      rowNormalized['notes'] ||
      rowNormalized['remarks'] ||
      ''
    ).toString().trim();

    let fullDescription = baseDesc;
    if (extraDetails.length > 0) {
      const extraBlock = extraDetails.join('\n');
      fullDescription = fullDescription ? `${fullDescription}\n\n${extraBlock}` : extraBlock;
    }

    const customImage = (
      rowNormalized['image url'] ||
      rowNormalized['image'] ||
      rowNormalized['images'] ||
      rowNormalized['photo'] ||
      rowNormalized['picture'] ||
      rowNormalized['url'] ||
      ''
    ).toString().trim();

    const finalImage = customImage && customImage.startsWith('http')
      ? customImage
      : getCommodityFallbackImage(commodity);

    let listingId;
    try {
      listingId = crypto.randomUUID();
    } catch {
      listingId = `lot_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 7)}`;
    }

    return {
      id: listingId,
      farmer_id: farmerId,
      farmer_name: farmerName || 'Farmer Partner',
      commodity,
      variety,
      grade,
      quantity: cleanQty,
      unit,
      price: cleanPrice,
      sale_type: 'direct',
      state,
      district,
      village: village || null,
      harvest_date: new Date().toISOString().split('T')[0],
      description: fullDescription || null,
      images: [finalImage],
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // Batch insert into Supabase in chunks of 50
  const CHUNK_SIZE = 50;
  for (let i = 0; i < dbRows.length; i += CHUNK_SIZE) {
    const chunk = dbRows.slice(i, i + CHUNK_SIZE);
    let { error } = await supabase.from('listings').insert(chunk);

    // Fallback if village column does not exist
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('village'))) {
      const fallbackChunk = chunk.map((r) => {
        const copy = { ...r };
        if (copy.village) {
          copy.description = `<!--agrolnk:village:${encodeURIComponent(copy.village)}-->\n${copy.description || ''}`.trim();
        }
        delete copy.village;
        return copy;
      });
      const retryRes = await supabase.from('listings').insert(fallbackChunk);
      error = retryRes.error;
    }

    if (error) {
      console.error('Supabase bulk listings insert error:', error);
      throw new Error(error.message || 'Failed to insert listings into Supabase database.');
    }

    if (onProgress) {
      onProgress(Math.min(i + CHUNK_SIZE, dbRows.length), dbRows.length);
    }
  }

  // Update local storage cache
  try {
    const rawLocal = localStorage.getItem('agrolnk_listings_local');
    const existing = rawLocal ? JSON.parse(rawLocal) : [];
    const combined = [...dbRows.map(mapListingFromDb), ...(Array.isArray(existing) ? existing : [])];
    localStorage.setItem('agrolnk_listings_local', JSON.stringify(combined));
  } catch {}

  // Broadcast update events across components and tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_listings_updated', { detail: { bulkCreated: dbRows.length } }));
    window.dispatchEvent(new Event('storage'));
  }

  return { success: true, count: dbRows.length, listings: dbRows };
}


