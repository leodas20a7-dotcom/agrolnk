// Agrolnk Supabase Auctions & Bidding Engine
import { supabase } from '../lib/supabase';
import { COMMODITY_IMAGES } from './listings';

function mapAuctionFromDb(row) {
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
    startingBid: Number(row.base_price),
    reservePrice: Number(row.reserve_price),
    currentBid: Number(row.current_bid),
    highestBidderId: row.highest_bidder_id,
    highestBidderName: row.highest_bidder_name,
    totalBids: row.total_bids || 0,
    startsAt: row.start_time,
    endsAt: row.end_time,
    status: row.status,
    state: row.state,
    district: row.district,
    images: Array.isArray(row.images) && row.images.length > 0
      ? row.images
      : [COMMODITY_IMAGES[row.commodity] || COMMODITY_IMAGES.Other],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all auctions from Supabase
 */
export async function getAuctions() {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch auctions from Supabase:', error);
      return [];
    }

    return (data || []).map(mapAuctionFromDb);
  } catch (err) {
    console.error('Error in getAuctions:', err);
    return [];
  }
}

/**
 * Get live active auctions
 */
export async function getLiveAuctions() {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('status', 'live')
      .order('created_at', { ascending: false });

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
    if (!farmerId) return await getAuctions();

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
      bidderName: b.bidder_name,
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

    // Fetch current auction
    const { data: currentAuction, error: fetchErr } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (fetchErr || !currentAuction) {
      throw new Error('Auction not found.');
    }

    if (numAmount <= Number(currentAuction.current_bid)) {
      throw new Error(`Your bid must be higher than the current bid of ₹${currentAuction.current_bid}`);
    }

    // Insert bid
    const bidId = `bid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const { error: insertErr } = await supabase
      .from('auction_bids')
      .insert([
        {
          id: bidId,
          auction_id: auctionId,
          bidder_id: bidderId || 'usr_buyer_02',
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

    const defaultImg = COMMODITY_IMAGES[auctionData.commodity] || COMMODITY_IMAGES.Other;
    const imagesArray = Array.isArray(auctionData.images) && auctionData.images.length > 0
      ? auctionData.images
      : [defaultImg];

    const dbRow = {
      id: generateId(),
      farmer_id: auctionData.farmerId || null,
      farmer_name: auctionData.farmerName || 'Sakthi Vel',
      commodity: auctionData.commodity || 'Tomato',
      variety: auctionData.variety || 'Standard Lot',
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
      state: auctionData.state || 'Tamil Nadu',
      district: auctionData.district || 'Salem',
      images: imagesArray,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('auctions')
      .insert([dbRow])
      .select()
      .single();

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
    const { data, error } = await supabase
      .from('auctions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)
      .select()
      .single();

    if (error) throw error;
    return mapAuctionFromDb(data);
  } catch (err) {
    console.error('Error finalizing auction:', err);
    return null;
  }
}
