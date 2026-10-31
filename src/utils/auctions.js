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
  }

  const cleanDescription = (row.description || '')
    .replace(/<!--agrolnk:village:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:org_name:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:auction_type:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:bid_step:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:reverse_reserve_price:.*?-->\n?/g, '')
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
 */
export async function checkAndFinalizeExpiredAuctions() {
  try {
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

    return finalizedResults
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);
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

    // Verify Buyer KYC Status before placing bid
    const activeUser = getCurrentUser();
    if (activeUser && activeUser.role === 'buyer' && !isUserKycVerified(activeUser)) {
      throw new Error('Buyer KYC verification is mandatory before participating in auctions.');
    }

    // 1. Production Atomic Database RPC with Row Locking (Eliminates Concurrency Race Conditions)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('place_auction_bid_atomic', {
        p_auction_id: auctionId,
        p_bidder_id: bidderId || '',
        p_bidder_name: bidderName || 'Buyer Partner',
        p_bid_amount: numAmount,
      });

      if (!rpcErr && rpcData?.success) {
        const fresh = await getAuctionById(auctionId);
        return fresh;
      }

      if (rpcErr) {
        const msg = rpcErr.message || '';
        if (
          msg.includes('Producers are not permitted') ||
          msg.includes('auction has ended') ||
          msg.includes('no longer live') ||
          msg.includes('not found')
        ) {
          throw new Error(msg);
        }
        console.info('Atomic bid RPC notice (using fallback):', rpcErr.message);
      }
    } catch (rpcCatch) {
      if (
        rpcCatch.message &&
        (rpcCatch.message.includes('Producers are not permitted') ||
         rpcCatch.message.includes('auction has ended') ||
         rpcCatch.message.includes('no longer live'))
      ) {
        throw rpcCatch;
      }
    }

    // 2. Client-side Fallback (Ensures complete offline/local compatibility)
    const { data: currentAuction, error: fetchErr } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (fetchErr || !currentAuction) {
      throw new Error('Auction not found.');
    }

    // Guard: Auction must be live and within duration
    if (currentAuction.status !== 'live' || new Date(currentAuction.end_time).getTime() <= Date.now()) {
      throw new Error('This auction has ended and is no longer accepting bids.');
    }

    // Guard: Prevent farmer from bidding on own produce
    if (currentAuction.farmer_id && currentAuction.farmer_id === bidderId) {
      throw new Error('Producers are not permitted to bid on their own auctions.');
    }

    // Guard: Prevent leading bidder from bidding against themselves
    if (currentAuction.highest_bidder_id && currentAuction.highest_bidder_id === bidderId) {
      throw new Error('You already hold the leading offer on this lot! You cannot bid against yourself.');
    }

    const mappedLot = mapAuctionFromDb(currentAuction);
    const auctionType = mappedLot.auctionType || 'forward';
    const bidStep = mappedLot.bidStep || 25;
    const currentBidVal = Number(currentAuction.current_bid);

    if (auctionType === 'reverse') {
      if (numAmount >= currentBidVal) {
        throw new Error(`In a reverse auction, your bid must be lower than the current leading offer of ₹${currentBidVal}/${currentAuction.unit}.`);
      }
      const effectiveReservePrice = mappedLot.reservePrice || Number(currentAuction.reserve_price);
      const isAtReserveFloor = effectiveReservePrice && numAmount === Number(effectiveReservePrice);

      const dec = currentBidVal - numAmount;
      if (dec < bidStep && !isAtReserveFloor) {
        throw new Error(`Your bid must be lower by at least the required step of ₹${bidStep}/${currentAuction.unit}.`);
      }
      // Strictly prevent arbitrary amounts (e.g., -1, -5) when step is ₹25, unless bidding exact reserve floor
      const remainder = Math.round((dec % bidStep) * 100) / 100;
      if (!isAtReserveFloor && remainder > 0.01 && remainder < (bidStep - 0.01)) {
        throw new Error(`Bids must be in exact step decrements of ₹${bidStep}/${currentAuction.unit} (e.g. ₹${currentBidVal - bidStep}, ₹${currentBidVal - (bidStep * 2)}).`);
      }
      if (effectiveReservePrice && numAmount < Number(effectiveReservePrice)) {
        throw new Error(`Bid cannot be lower than the farmer's reserve floor price of ₹${effectiveReservePrice}/${currentAuction.unit}.`);
      }
    } else {
      if (numAmount <= currentBidVal) {
        throw new Error(`Your bid must be higher than the current bid of ₹${currentBidVal}/${currentAuction.unit}.`);
      }
      const inc = numAmount - currentBidVal;
      if (inc < bidStep) {
        throw new Error(`Your bid must increase by at least the required step of ₹${bidStep}/${currentAuction.unit}.`);
      }
      // Strictly prevent arbitrary amounts (e.g., +1, +5) when step is ₹25
      const remainder = Math.round((inc % bidStep) * 100) / 100;
      if (remainder > 0.01 && remainder < (bidStep - 0.01)) {
        throw new Error(`Bids must be in exact step increments of ₹${bidStep}/${currentAuction.unit} (e.g. ₹${currentBidVal + bidStep}, ₹${currentBidVal + (bidStep * 2)}).`);
      }
    }

    // Insert bid
    const bidId = `bid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const { error: insertErr } = await supabase
      .from('auction_bids')
      .insert([
        {
          id: bidId,
          auction_id: auctionId,
          bidder_id: bidderId || '',
          bidder_name: bidderName || 'Buyer Partner',
          bid_amount: numAmount,
          created_at: new Date().toISOString(),
        },
      ]);

    if (insertErr) throw insertErr;

    // Update auction current bid & highest bidder
    const { data: updatedAuction, error: updateErr } = await supabase
      .from('auctions')
      .update({
        current_bid: numAmount,
        highest_bidder_id: bidderId || null,
        highest_bidder_name: bidderName || 'Buyer Partner',
        total_bids: (currentAuction.total_bids || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return mapAuctionFromDb(updatedAuction);
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
    // 1. Try atomic PostgreSQL RPC (Enforces row lock, reserve price check, and duplicate order prevention)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('finalize_auction_atomic', {
        p_auction_id: auctionId,
      });
      if (!rpcErr && rpcData?.success) {
        return await getAuctionById(auctionId);
      }
    } catch (_rpcErr) {
      // Fall through to client fallback
    }

    // 2. Client-side Fallback
    const currentLot = await getAuctionById(auctionId);
    if (!currentLot) return null;

    // Evaluate reserve price
    const isReserveMet = currentLot.highestBidderId && (Number(currentLot.currentBid) >= Number(currentLot.reservePrice || currentLot.startingBid));
    const targetStatus = isReserveMet ? 'completed' : (currentLot.highestBidderId ? 'reserve_not_met' : 'completed');

    const { data, error } = await supabase
      .from('auctions')
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)
      .select()
      .single();

    if (error) throw error;

    // If reserve met and there was a winning bidder, automatically spawn an order if one doesn't exist yet
    if (data && data.highest_bidder_id && isReserveMet) {
      try {
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('auction_id', auctionId);

        if (!existingOrders || existingOrders.length === 0) {
          const orderNum = `#AGM-${Math.floor(1000 + Math.random() * 9000)}`;
          const totalAmt = Number(data.quantity) * Number(data.current_bid);
          const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const { data: createdOrder } = await supabase
            .from('orders')
            .insert([
              {
                id: orderId,
                order_number: orderNum,
                auction_id: data.id,
                listing_id: null,
                buyer_id: data.highest_bidder_id,
                buyer_name: data.highest_bidder_name || 'Buyer Partner',
                farmer_id: data.farmer_id,
                farmer_name: data.farmer_name || 'Farmer Partner',
                commodity: data.commodity,
                variety: data.variety,
                grade: data.grade,
                quantity: Number(data.quantity),
                unit: data.unit,
                price_per_unit: Number(data.current_bid),
                total_amount: totalAmt,
                state: data.state,
                district: data.district,
                escrow_status: 'pending',
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          // Note: Deliveries are NOT scheduled until the winning bidder completes escrow funding.
          // This prevents premature logistics dispatches for unpaid auction orders.
        }
      } catch (orderErr) {
        console.warn('Auto auction order creation notice:', orderErr);
      }
    }

    return mapAuctionFromDb(data);
  } catch (err) {
    console.error('Error finalizing auction:', err);
    return null;
  }
}

/**
 * Early Knockdown: Farmer accepts a fair bid immediately and closes the auction before timer expiry
 */
export async function acceptAuctionBidEarly(auctionId, options = {}) {
  try {
    // 1. Fetch current auction to verify state
    const { data: currentAuction, error: fetchErr } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (fetchErr || !currentAuction) {
      throw new Error('Auction lot not found.');
    }

    const acceptedBid = Number(options.acceptedBid || currentAuction.current_bid);
    const winnerId = options.bidderId || currentAuction.highest_bidder_id;
    const winnerName = options.bidderName || currentAuction.highest_bidder_name || 'Buyer Partner';

    if (!winnerId) {
      throw new Error('No bids have been placed on this auction yet.');
    }

    const nowIso = new Date().toISOString();

    // 2. Mark auction completed early with valid schema columns
    const { data: updatedAuction, error: updateErr } = await supabase
      .from('auctions')
      .update({
        status: 'completed',
        current_bid: acceptedBid,
        highest_bidder_id: winnerId,
        highest_bidder_name: winnerName,
        end_time: nowIso,
        updated_at: nowIso,
      })
      .eq('id', auctionId)
      .select()
      .single();

    if (updateErr) {
      console.error('Auction status update error:', updateErr);
      throw updateErr;
    }

    // 3. Create Escrow Order & Delivery
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('auction_id', auctionId);

    let createdOrder = null;
    if (!existingOrders || existingOrders.length === 0) {
      const orderNum = `#AGM-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalAmt = Number(updatedAuction.quantity) * acceptedBid;
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert([
          {
            id: orderId,
            order_number: orderNum,
            auction_id: updatedAuction.id,
            listing_id: null,
            buyer_id: winnerId,
            buyer_name: winnerName,
            farmer_id: updatedAuction.farmer_id,
            farmer_name: updatedAuction.farmer_name || 'Farmer Partner',
            commodity: updatedAuction.commodity,
            variety: updatedAuction.variety,
            grade: updatedAuction.grade,
            quantity: Number(updatedAuction.quantity),
            unit: updatedAuction.unit,
            price_per_unit: acceptedBid,
            total_amount: totalAmt,
            state: updatedAuction.state,
            district: updatedAuction.district,
            escrow_status: 'pending',
            status: 'pending',
            created_at: nowIso,
            updated_at: nowIso,
          },
        ])
        .select()
        .single();

      if (orderErr) {
        console.warn('Order creation error on early accept:', orderErr);
      } else {
        createdOrder = newOrder;
        // Note: Delivery is NOT scheduled until buyer completes escrow funding
      }
    }

    return {
      auction: mapAuctionFromDb(updatedAuction),
      order: createdOrder,
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
  const cleanDesc = (auctionData.description || '')
    .replace(/<!--agrolnk:village:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:auction_type:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:bid_step:.*?-->\n?/g, '')
    .replace(/<!--agrolnk:reverse_reserve_price:.*?-->\n?/g, '')
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

