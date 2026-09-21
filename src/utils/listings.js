// Agrolnk Supabase Listings Management Engine
import { supabase } from '../lib/supabase';

export const DEFAULT_COMMODITIES = [
  'Tomato',
  'Onion',
  'Potato',
  'Mango',
  'Red Chilli',
  'Turmeric',
  'Basmati Rice',
  'Cotton',
  'Wheat',
  'Cardamom',
  'Ginger',
  'Apple',
  'Maize',
  'Soybean',
  'Banana',
];

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

function sanitizeImages(images, commodity) {
  const fallback = COMMODITY_IMAGES[commodity] || COMMODITY_IMAGES.Other;
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

function mapListingFromDb(row) {
  if (!row) return null;
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
    saleType: row.sale_type,
    state: row.state,
    district: row.district,
    harvestDate: row.harvest_date,
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
export async function getActiveMarketplaceListings() {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .gt('quantity', 0)
      .order('created_at', { ascending: false });

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

    const dbRow = {
      id: generateId(),
      farmer_id: listingData.farmerId || null,
      farmer_name: listingData.farmerName || 'Farmer',
      commodity: listingData.commodity || 'Tomato',
      variety: listingData.variety || 'Standard Lot',
      grade: listingData.grade || 'A',
      quantity: Number(listingData.quantity) || 500,
      unit: listingData.unit || 'kg',
      price: Number(listingData.price) || 40,
      sale_type: listingData.saleType || 'direct',
      state: listingData.state || '',
      district: listingData.district || '',
      harvest_date: listingData.harvestDate || new Date().toISOString().split('T')[0],
      images: imagesArray,
      status: 'active',
      origin_warehouse_id: listingData.originWarehouseId || null,
      origin_receipt_number: listingData.originReceiptNumber || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('listings')
      .insert([dbRow])
      .select()
      .single();

    if (error) {
      console.error('Supabase listing insertion error:', error);
      throw error;
    }

    return mapListingFromDb(data);
  } catch (err) {
    console.error('Error creating listing:', err);
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
  if (!userId) return;
  try {
    const key = `${LISTING_DRAFT_PREFIX}${userId}`;
    localStorage.removeItem(key);
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

    // 2. Check local orders cache (for resilience)
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

    // 3. Check financing requests / trade credit on this listing
    try {
      const { data: finData, error: finErr } = await supabase
        .from('financing_requests')
        .select('id, request_number, status, applicant_name')
        .eq('listing_id', listingId);

      if (!finErr && Array.isArray(finData) && finData.length > 0) {
        const activeFin = finData.filter((r) => r.status !== 'rejected' && r.status !== 'cancelled');
        if (activeFin.length > 0) {
          return {
            canDelete: false,
            activeOrdersCount: activeFin.length,
            orderNumber: activeFin[0].request_number || activeFin[0].id,
            buyerName: activeFin[0].applicant_name,
            reason: `An active trade credit application (${activeFin[0].request_number}) is currently locked to this produce lot.`,
          };
        }
      }
    } catch {}

    // 4. Check if listing status itself is sold
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

