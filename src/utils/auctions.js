// AgroLnk Supabase Auctions & Bidding Engine
import { supabase } from '../lib/supabase';
import { COMMODITY_IMAGES } from './listings';
import { getCurrentUser, isUserKycVerified } from './auth';

function mapAuctionFromDb(row) {
  if (!row) return null;

  let auctionType = row.auction_type || 'forward';
  let bidStep = Number(row.bid_step) || 25;
  let reservePrice = Number(row.reserve_price);
  let organizationName = row.organization_name || row.company_name || '';

  // Extract from description metadata fallback if column was absent
  if (row.description) {
    const orgMatch = row.description.match(/<!--agrolnk:org_name:(.*?)-->/);
    if (orgMatch && orgMatch[1]) {
      try {
        organizationName = decodeURIComponent(orgMatch[1]);
      } catch {
        organizationName = orgMatch[1];
      }
    }
    const typeMatch = row.description.match(/<!--agrolnk:auction_type:([a-z]+)-->/);
    if (typeMatch && typeMatch[1]) {
      auctionType = typeMatch[1];
    }
    const stepMatch = row.description.match(/<!--agrolnk:bid_step:([0-9.]+)-->/);
    if (stepMatch && stepMatch[1]) {
      bidStep = Number(stepMatch[1]) || bidStep;
    }
    const revReserveMatch = row.description.match(/<!--agrolnk:reverse_reserve_price:([0-9.]+)-->/);
    if (revReserveMatch && revReserveMatch[1]) {
      reservePrice = Number(revReserveMatch[1]);
    }
    const landmarkMatch = row.description.match(/<!--agrolnk:landmark:(.*?)-->/);
    if (landmarkMatch && landmarkMatch[1]) {
      try {
        landmark = decodeURIComponent(landmarkMatch[1]);
      } catch {
        landmark = landmarkMatch[1];
      }
    }
  }

  let landmark = row.landmark || '';

  const cleanDescription = (row.description || '')
    .replace(/<!--agrolnk:village:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:org_name:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:auction_type:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:bid_step:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:reverse_reserve_price:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:landmark:.*?-->\n?/g, '')
    .trim();

  return {
    id: row.id,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    organizationName: organizationName || '',
    commodity: row.commodity,
    variety: row.variety,
    grade: row.grade,
    quantity: Number(row.quantity),
    unit: row.unit,
    startingBid: Number(row.base_price),
    reservePrice,
    currentBid: Number(row.current_bid),
    highestBidderId: row.highest_bidder_id,
    highestBidderName: row.highest_bidder_name,
    totalBids: row.total_bids || 0,
    startsAt: row.start_time,
    endsAt: row.end_time,
    status: row.status,
    auctionType,
    bidStep,
    state: row.state,
    district: row.district,
    village: row.village || '',
    landmark: landmark || '',
    description: cleanDescription,
    images: Array.isArray(row.images) && row.images.length > 0
      ? row.images
      : [COMMODITY_IMAGES[row.commodity] || COMMODITY_IMAGES.Other],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Automatically check and atomically finalize all expired live auctions
 * Prioritizes the atomic PostgreSQL batch RPC finalize_expired_auctions_batch,
 * falling back to client-side concurrent settlement if needed.
 */
export async function checkAndFinalizeExpiredAuctions() {
  try {
    // 1. Try server-side atomic batch RPC (Fastest, zero race conditions, row locked with SKIP LOCKED)
    try {
      const { data: batchRes, error: batchErr } = await supabase.rpc('finalize_expired_auctions_batch');
      if (!batchErr && batchRes?.success) {
        if (batchRes.finalized_count > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agrolnk_auctions_updated'));
          window.dispatchEvent(new CustomEvent('agrolnk_orders_updated'));
          window.dispatchEvent(new Event('storage'));
        }
        return batchRes;
      }
    } catch (_rpcErr) {
      // Fall through to client fallback
    }

    // 2. Client-side fallback batch iteration
    const nowIso = new Date().toISOString();
    const { data: expiredLots, error } = await supabase
      .from('auctions')
      .select('id, end_time, status')
      .eq('status', 'live')
      .lte('end_time', nowIso);

    if (error || !expiredLots || expiredLots.length === 0) return [];

    const finalizedResults = await Promise.allSettled(
      expiredLots.map((lot) => finalizeAuction(lot.id))
    );

    const succeeded = finalizedResults
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);

    if (succeeded.length > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_auctions_updated'));
      window.dispatchEvent(new CustomEvent('agrolnk_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return succeeded;
  } catch (err) {
    console.warn('Auto-finalize expired auctions notice:', err);
    return [];
  }
}

/**
 * Get all auctions from Supabase with authoritative expired state resolution
 */
export async function getAuctions(limit = null) {
  try {
    // Settle expired auctions in the background without blocking the read query
    checkAndFinalizeExpiredAuctions().catch((e) => console.warn('Background finalize check:', e));

    let query = supabase
      .from('auctions')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch auctions from Supabase:', error);
      return [];
    }

    const now = Date.now();
    return (data || []).map((row) => {
      const isExpired = row.end_time && new Date(row.end_time).getTime() <= now;
      if (row.status === 'live' && isExpired) {
        return mapAuctionFromDb({ ...row, status: 'completed' });
      }
      return mapAuctionFromDb(row);
    });
  } catch (err) {
    console.error('Error in getAuctions:', err);
    return [];
  }
}

/**
 * Get live active auctions (strictly non-expired)
 */
export async function getLiveAuctions(limit = null) {
  try {
    // Settle expired auctions in the background without blocking the read query
    checkAndFinalizeExpiredAuctions().catch((e) => console.warn('Background finalize check:', e));

    const nowIso = new Date().toISOString();
    let query = supabase
      .from('auctions')
      .select('*')
      .eq('status', 'live')
      .gt('end_time', nowIso)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch live auctions from Supabase:', error);
      return [];
    }

    return (data || []).map(mapAuctionFromDb);
  } catch (err) {
    console.error('Error in getLiveAuctions:', err);
    return [];
  }
}

/**
 * Get auctions created by a farmer
 */
export async function getFarmerAuctions(farmerId) {
  try {
    if (!farmerId) return [];

    await checkAndFinalizeExpiredAuctions();

    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch farmer auctions:', error);
      return [];
    }

    return (data || []).map(mapAuctionFromDb);
  } catch (err) {
    console.error('Error in getFarmerAuctions:', err);
    return [];
  }
}

/**
 * Get bids for an auction
 */
export async function getAuctionBids(auctionId) {
  try {
    const { data, error } = await supabase
      .from('auction_bids')
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch auction bids:', error);
      return [];
    }

    return (data || []).map((b) => ({
      id: b.id,
      auctionId: b.auction_id,
      bidderId: b.bidder_id,
      buyerId: b.bidder_id,
      bidderName: b.bidder_name,
      buyerName: b.bidder_name,
      amount: Number(b.bid_amount),
      createdAt: b.created_at,
    }));
  } catch (err) {
    console.error('Error in getAuctionBids:', err);
    return [];
  }
}

/**
 * Get all bids placed by a specific user with auction context
 */
export async function getUserBids(userId) {
  try {
    if (!userId) return [];

    const { data: userBids, error: bidsErr } = await supabase
      .from('auction_bids')
      .select('*')
      .eq('bidder_id', userId)
      .order('created_at', { ascending: false });

    if (bidsErr || !userBids) return [];

    const allAuctions = await getAuctions();

    return userBids.map((b) => {
      const auction = allAuctions.find((a) => a.id === b.auction_id) || {};
      const isLeading = auction.highestBidderId === userId;
      const isWinner = auction.status === 'completed' && isLeading;
      const isOutbid = !isLeading && Number(auction.currentBid) > Number(b.bid_amount);

      return {
        id: b.id,
        auctionId: b.auction_id,
        bidderId: b.bidder_id,
        bidderName: b.bidder_name,
        amount: Number(b.bid_amount),
        createdAt: b.created_at,
        auction,
        isLeading,
        isWinner,
        isOutbid,
      };
    });
  } catch (err) {
    console.error('Error in getUserBids:', err);
    return [];
  }
}

/**
 * Place a bid in an auction
 */
export async function placeBid(arg1, arg2, arg3, arg4) {
  try {
    let auctionId, bidderId, bidderName, amount;
    if (typeof arg1 === 'object' && arg1 !== null) {
      ({ auctionId, bidderId, bidderName, amount } = arg1);
    } else {
      auctionId = arg1;
      bidderId = arg2;
      bidderName = arg3;
      amount = arg4;
    }

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Please enter a valid positive bid amount.');
    }

    // Verify Trader KYC Status before placing bid (enforced for both buyers and reverse auction suppliers)
    const activeUser = getCurrentUser();
    if (activeUser && activeUser.role !== 'admin' && !isUserKycVerified(activeUser)) {
      throw new Error('KYC verification is mandatory before participating in live auctions.');
    }

    // 1. Authoritative Atomic Database RPC with Row Locking
    // (Eliminates race conditions, extends clock on soft-close, and bypasses RLS safely via SECURITY DEFINER)
    let rpcRes = await supabase.rpc('place_auction_bid_atomic', {
      p_auction_id: auctionId,
      p_bid_amount: numAmount,
      p_bidder_id: bidderId || activeUser?.id || '',
      p_bidder_name: bidderName || activeUser?.name || 'Buyer Partner',
    });

    // Fallback attempt for 2-parameter signature if parameter mismatch occurs
    if (rpcRes.error && (rpcRes.error.code === 'PGRST202' || rpcRes.error.message?.includes('parameter') || rpcRes.error.message?.includes('schema cache'))) {
      rpcRes = await supabase.rpc('place_auction_bid_atomic', {
        p_auction_id: auctionId,
        p_bid_amount: numAmount,
      });
    }

    if (rpcRes.error) {
      const msg = rpcRes.error.message || '';
      throw new Error(msg || 'Unable to place bid on the auction exchange.');
    }

    if (rpcRes.data?.success) {
      const fresh = await getAuctionById(auctionId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrolnk_auctions_updated'));
        window.dispatchEvent(new Event('storage'));
      }
      return fresh;
    }

    throw new Error('Bid placement was not acknowledged by the auction exchange.');
  } catch (err) {
    console.error('Error placing bid:', err);
    throw err;
  }
}

/**
 * Create a new live auction
 */
export async function createAuction(auctionData) {
  try {
    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch {
        return `auc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    };

    const durationMins = Number(auctionData.durationMinutes) || 30;
    const now = Date.now();
    const startTime = new Date(now).toISOString();
    const endTime = new Date(now + durationMins * 60 * 1000).toISOString();

    const startPrice = Number(auctionData.startingBid || auctionData.startingPrice || 40);
    const reservePrice = Number(auctionData.reservePrice || startPrice);
    const auctionType = auctionData.auctionType || 'forward';
    const bidStep = Math.max(1, Number(auctionData.bidStep) || 25);

    const defaultImg = COMMODITY_IMAGES[auctionData.commodity] || COMMODITY_IMAGES.Other;
    const imagesArray = Array.isArray(auctionData.images) && auctionData.images.length > 0
      ? auctionData.images
      : [defaultImg];

    const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const validFarmerId = isUuid(auctionData.farmerId) ? auctionData.farmerId : null;
    const orgName = (auctionData.organizationName || auctionData.companyName || auctionData.orgName || '').trim();

    let metaTags = `<!--agrolnk:auction_type:${auctionType}-->\n<!--agrolnk:bid_step:${bidStep}-->`;
    if (auctionType === 'reverse') {
      metaTags += `\n<!--agrolnk:reverse_reserve_price:${reservePrice}-->`;
    }
    if (orgName) {
      metaTags += `\n<!--agrolnk:org_name:${encodeURIComponent(orgName)}-->`;
    }
    if (auctionData.landmark) {
      metaTags += `\n<!--agrolnk:landmark:${encodeURIComponent(auctionData.landmark)}-->`;
    }
    const fullDesc = auctionData.description ? `${metaTags}\n${auctionData.description}` : metaTags;

    const dbRow = {
      id: generateId(),
      farmer_id: validFarmerId,
      farmer_name: auctionData.farmerName || 'Farmer',
      commodity: auctionData.commodity || 'Tomato',
      variety: auctionData.variety || 'None',
      grade: auctionData.grade || 'A',
      quantity: Number(auctionData.quantity) || 500,
      unit: auctionData.unit || 'kg',
      base_price: startPrice,
      reserve_price: reservePrice,
      current_bid: startPrice,
      highest_bidder_id: null,
      highest_bidder_name: null,
      total_bids: 0,
      start_time: startTime,
      end_time: endTime,
      status: 'live',
      auction_type: auctionType,
      bid_step: bidStep,
      state: auctionData.state || '',
      district: auctionData.district || '',
      village: auctionData.village || null,
      description: fullDesc,
      images: imagesArray,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let data;
    let error;

    const res = await supabase
      .from('auctions')
      .insert([dbRow])
      .select()
      .single();

    data = res.data;
    error = res.error;

    // Fallback 1: If check constraint "auctions_check" is violated (e.g. forward-only CHECK (reserve_price >= base_price))
    if (error && (error.code === '23514' || error.message?.includes('auctions_check') || error.message?.includes('check constraint'))) {
      const fallbackRow = { ...dbRow };
      fallbackRow.reserve_price = Math.max(startPrice, reservePrice);
      const retryRes = await supabase
        .from('auctions')
        .insert([fallbackRow])
        .select()
        .single();
      data = retryRes.data;
      error = retryRes.error;
    }

    // Fallback 2: If foreign key "auctions_farmer_id_fkey" is violated or invalid UUID
    if (error && (error.code === '23503' || error.code === '22P02' || error.message?.includes('farmer_id'))) {
      const fallbackRow = { ...dbRow, farmer_id: null };
      if (auctionType === 'reverse' && reservePrice < startPrice) {
        fallbackRow.reserve_price = Math.max(startPrice, reservePrice);
      }
      const retryRes = await supabase
        .from('auctions')
        .insert([fallbackRow])
        .select()
        .single();
      data = retryRes.data;
      error = retryRes.error;
    }

    // Fallback 3: If auction_type or bid_step columns do not exist in PostgreSQL schema yet
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('auction_type') || error.message?.includes('bid_step'))) {
      const fallbackRow = { ...dbRow };
      delete fallbackRow.auction_type;
      delete fallbackRow.bid_step;
      if (auctionType === 'reverse' && reservePrice < startPrice) {
        fallbackRow.reserve_price = Math.max(startPrice, reservePrice);
      }
      const retryRes = await supabase
        .from('auctions')
        .insert([fallbackRow])
        .select()
        .single();
      data = retryRes.data;
      error = retryRes.error;
    }

    // Fallback 4: If village column does not exist in schema yet
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('village'))) {
      const fallbackRow = { ...dbRow };
      delete fallbackRow.village;
      delete fallbackRow.auction_type;
      delete fallbackRow.bid_step;
      if (auctionType === 'reverse' && reservePrice < startPrice) {
        fallbackRow.reserve_price = Math.max(startPrice, reservePrice);
      }
      if (auctionData.village) {
        const existingDesc = fallbackRow.description || '';
        fallbackRow.description = `<!--agrolnk:village:${encodeURIComponent(auctionData.village)}-->\n${existingDesc}`.trim();
      }
      const retryRes = await supabase
        .from('auctions')
        .insert([fallbackRow])
        .select()
        .single();
      data = retryRes.data;
      error = retryRes.error;
    }

    // Fallback 5: If description column does not exist in PostgreSQL schema yet
    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('description'))) {
      const fallbackRow = { ...dbRow };
      delete fallbackRow.village;
      delete fallbackRow.description;
      if (auctionType === 'reverse' && reservePrice < startPrice) {
        fallbackRow.reserve_price = Math.max(startPrice, reservePrice);
      }
      const retryRes = await supabase
        .from('auctions')
        .insert([fallbackRow])
        .select()
        .single();
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.error('Supabase auction creation error:', error);
      throw error;
    }

    return mapAuctionFromDb(data);
  } catch (err) {
    console.error('Error creating auction:', err);
    throw err;
  }
}

/**
 * Get auction by ID
 */
export async function getAuctionById(id) {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return mapAuctionFromDb(data);
  } catch {
    return null;
  }
}

/**
 * Alias for getAuctionBids
 */
export const getBidsForAuction = getAuctionBids;

/**
 * Finalize auction when time expires
 */
export async function finalizeAuction(auctionId) {
  try {
    // Authoritative Server-Side Atomic Finalization:
    // Enforces PostgreSQL row lock, reserve price verification, and idempotent order creation
    const { data: rpcData, error: rpcErr } = await supabase.rpc('finalize_auction_atomic', {
      p_auction_id: auctionId,
    });

    if (rpcErr) {
      console.warn('Auction finalization server RPC notice:', rpcErr.message);
    }

    return await getAuctionById(auctionId);
  } catch (err) {
    console.warn('Finalize auction execution error:', err);
    return await getAuctionById(auctionId);
  }
}

/**
 * Early Knockdown: Farmer accepts the winning live bid atomically via Postgres FOR UPDATE row lock
 */
export async function acceptAuctionBidEarly(auctionId, options = {}) {
  try {
    if (!auctionId) {
      throw new Error('Auction ID is required.');
    }

    const expectedBid =
      options.acceptedBid !== undefined && options.acceptedBid !== null && options.acceptedBid !== ''
        ? Number(options.acceptedBid)
        : null;

    const { data, error } = await supabase.rpc('accept_auction_bid_early_atomic', {
      p_auction_id: auctionId,
      p_expected_bid: Number.isFinite(expectedBid) ? expectedBid : null,
    });

    if (error) {
      throw new Error(error.message || 'Failed to accept bid early.');
    }

    if (!data?.success || !data?.auction) {
      throw new Error(data?.message || 'Atomic early knockdown did not return auction state.');
    }

    return {
      auction: mapAuctionFromDb(data.auction),
      order: data.order || null,
    };
  } catch (err) {
    console.error('Error in acceptAuctionBidEarly:', err);
    throw err;
  }
}

/**
 * Update an existing auction in Supabase
 */
export async function updateAuction(auctionId, auctionData) {
  if (!auctionId) throw new Error('Auction ID is required for update.');

  const startPrice = Number(auctionData.startingBid || auctionData.basePrice || auctionData.startingPrice || 40);
  const reservePrice = Number(auctionData.reservePrice || startPrice);
  const auctionType = auctionData.auctionType || 'forward';
  const bidStep = Math.max(1, Number(auctionData.bidStep) || 25);

  const defaultImg = COMMODITY_IMAGES[auctionData.commodity] || COMMODITY_IMAGES.Other;
  const imagesArray = Array.isArray(auctionData.images) && auctionData.images.length > 0
    ? auctionData.images
    : [defaultImg];

  let metaTags = `<!--agrolnk:auction_type:${auctionType}-->\n<!--agrolnk:bid_step:${bidStep}-->`;
  if (auctionType === 'reverse') {
    metaTags += `\n<!--agrolnk:reverse_reserve_price:${reservePrice}-->`;
  }
  if (auctionData.landmark) {
    metaTags += `\n<!--agrolnk:landmark:${encodeURIComponent(auctionData.landmark)}-->`;
  }
  const cleanDesc = (auctionData.description || '')
    .replace(/<!--agrolnk:village:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:auction_type:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:bid_step:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:reverse_reserve_price:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:landmark:.*?-->\n?/g, '')
    .trim();
  const fullDesc = cleanDesc ? `${metaTags}\n${cleanDesc}` : metaTags;

  const dbRow = {
    commodity: auctionData.commodity,
    variety: auctionData.variety || 'None',
    grade: auctionData.grade || 'A',
    quantity: Number(auctionData.quantity),
    unit: auctionData.unit || 'kg',
    base_price: startPrice,
    reserve_price: reservePrice,
    bid_step: bidStep,
    auction_type: auctionType,
    state: auctionData.state || '',
    district: auctionData.district || '',
    village: auctionData.village || null,
    description: fullDesc,
    images: imagesArray,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from('auctions')
    .update(dbRow)
    .eq('id', auctionId)
    .select()
    .single();

  // Fallback 1: If check constraint "auctions_check" fails
  if (error && (error.code === '23514' || error.message?.includes('auctions_check') || error.message?.includes('check constraint'))) {
    const fallbackRow = { ...dbRow };
    fallbackRow.reserve_price = Math.max(startPrice, reservePrice);
    const retryRes = await supabase
      .from('auctions')
      .update(fallbackRow)
      .eq('id', auctionId)
      .select()
      .single();
    data = retryRes.data;
    error = retryRes.error;
  }

  // Fallback 2: If auction_type or bid_step column does not exist
  if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('auction_type') || error.message?.includes('bid_step'))) {
    const fallbackRow = { ...dbRow };
    delete fallbackRow.auction_type;
    delete fallbackRow.bid_step;
    const retryRes = await supabase
      .from('auctions')
      .update(fallbackRow)
      .eq('id', auctionId)
      .select()
      .single();
    data = retryRes.data;
    error = retryRes.error;
  }

  // Fallback 3: If village column does not exist
  if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('village'))) {
    const fallbackRow = { ...dbRow };
    delete fallbackRow.village;
    const retryRes = await supabase
      .from('auctions')
      .update(fallbackRow)
      .eq('id', auctionId)
      .select()
      .single();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error) {
    console.error('Supabase auction update error:', error);
    throw error;
  }

  const mapped = mapAuctionFromDb(data);
  try {
    window.dispatchEvent(new CustomEvent('agrolnk_auctions_updated', { detail: mapped }));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  return mapped;
}

/**
 * Delete an auction from Supabase
 */
export async function deleteAuction(auctionId) {
  if (!auctionId) throw new Error('Auction ID is required.');

  // Delete associated bids first
  try {
    await supabase.from('auction_bids').delete().eq('auction_id', auctionId);
  } catch (bErr) {
    console.warn('Notice removing auction bids:', bErr);
  }

  const { error } = await supabase
    .from('auctions')
    .delete()
    .eq('id', auctionId);

  if (error) {
    console.error('Supabase auction deletion error:', error);
    throw new Error(error.message || 'Failed to delete auction lot.');
  }

  try {
    window.dispatchEvent(new CustomEvent('agrolnk_auctions_updated', { detail: { id: auctionId, deleted: true } }));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  return { success: true };
}

