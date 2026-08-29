// Agrolnk Prototype Live Auctions Engine (LocalStorage)
// Stores live auctions, bid logs, and manages reserve price settlement into Orders.

import { createOrder } from './orders';

const AUCTIONS_STORAGE_KEY = 'agrolnkAuctions';
const BIDS_STORAGE_KEY = 'agrolnkBids';

// Default pre-seeded live auction lots
const DEFAULT_DEMO_AUCTIONS = [
  {
    id: 'auc_demo_01',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Tomato',
    variety: 'Hybrid Shivam',
    grade: 'A',
    quantity: 500,
    unit: 'kg',
    startingBid: 40,
    reservePrice: 40,
    currentBid: 48,
    highestBidderId: 'usr_buyer_02',
    highestBidderName: 'Buyer #A24 (Ananya Agro)',
    startsAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 mins left -> "Ending Soon"
    durationMinutes: 30,
    status: 'live', // 'live' | 'completed' | 'reserve_not_met'
    state: 'Tamil Nadu',
    district: 'Salem',
    images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'auc_demo_02',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Potato',
    variety: 'Kufri Jyoti',
    grade: 'A',
    quantity: 1000,
    unit: 'kg',
    startingBid: 30,
    reservePrice: 35,
    currentBid: 32,
    highestBidderId: 'usr_buyer_03',
    highestBidderName: 'Buyer #C09 (Surya Foods)',
    startsAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    durationMinutes: 90,
    status: 'live',
    state: 'Tamil Nadu',
    district: 'Dindigul',
    images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'auc_demo_03',
    farmerId: 'usr_farmer_02',
    farmerName: 'Himachal Apple Growers',
    commodity: 'Apple',
    variety: 'Royal Delicious',
    grade: 'A',
    quantity: 300,
    unit: 'kg',
    startingBid: 110,
    reservePrice: 125,
    currentBid: 128,
    winningBid: 128,
    highestBidderId: 'usr_buyer_02',
    highestBidderName: 'Buyer #A24 (Ananya Agro)',
    winnerId: 'usr_buyer_02',
    winnerName: 'Buyer #A24 (Ananya Agro)',
    orderNumber: 'AGM-AUCT-8821',
    startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // Concluded 10 mins ago
    durationMinutes: 50,
    status: 'completed',
    state: 'Himachal Pradesh',
    district: 'Shimla',
    images: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'auc_demo_04',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Cardamom',
    variety: '8mm Bold Alleppey Green',
    grade: 'Export',
    quantity: 150,
    unit: 'kg',
    startingBid: 1850,
    reservePrice: 1900,
    currentBid: 1920,
    highestBidderId: 'usr_buyer_04',
    highestBidderName: 'Buyer #B12 (Kerala Spices Co)',
    startsAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    durationMinutes: 60,
    status: 'live',
    state: 'Kerala',
    district: 'Idukki',
    images: ['https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'auc_demo_05',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Mango',
    variety: 'Ratnagiri Alphonso GI Tagged',
    grade: 'Export',
    quantity: 600,
    unit: 'kg',
    startingBid: 160,
    reservePrice: 175,
    currentBid: 178,
    highestBidderId: 'usr_buyer_02',
    highestBidderName: 'Buyer #A24 (Ananya Agro)',
    startsAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 70 * 60 * 1000).toISOString(),
    durationMinutes: 90,
    status: 'live',
    state: 'Maharashtra',
    district: 'Ratnagiri',
    images: ['https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
];

const AUCTIONS_DATA_VERSION = 'v3_diverse_auctions';

/**
 * Get all auctions from localStorage
 */
export function getAuctions() {
  try {
    const storedVersion = localStorage.getItem('agrolnkAuctions_version') || localStorage.getItem('agramazAuctions_version');
    const raw = localStorage.getItem(AUCTIONS_STORAGE_KEY) || localStorage.getItem('agramazAuctions');
    if (!raw || storedVersion !== AUCTIONS_DATA_VERSION) {
      localStorage.setItem(AUCTIONS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_AUCTIONS));
      localStorage.setItem('agrolnkAuctions_version', AUCTIONS_DATA_VERSION);
      return DEFAULT_DEMO_AUCTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_DEMO_AUCTIONS;
  } catch {
    return DEFAULT_DEMO_AUCTIONS;
  }
}

/**
 * Save auctions to localStorage
 */
function saveAuctions(auctions) {
  try {
    localStorage.setItem(AUCTIONS_STORAGE_KEY, JSON.stringify(auctions));
  } catch (err) {
    console.error('Failed to save auctions to localStorage:', err);
  }
}

/**
 * Get all bids from localStorage
 */
export function getBids() {
  try {
    const raw = localStorage.getItem(BIDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BIDS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_BIDS));
      return DEFAULT_DEMO_BIDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_DEMO_BIDS;
  } catch {
    return DEFAULT_DEMO_BIDS;
  }
}

/**
 * Save bids
 */
function saveBids(bids) {
  try {
    localStorage.setItem(BIDS_STORAGE_KEY, JSON.stringify(bids));
  } catch (err) {
    console.error('Failed to save bids to localStorage:', err);
  }
}

/**
 * Get auctions for a specific farmer
 */
export function getFarmerAuctions(farmerId) {
  const all = getAuctions();
  if (!farmerId) return all;
  return all.filter((a) => a.farmerId === farmerId || !a.farmerId);
}

/**
 * Get active live auctions for buyers
 */
export function getLiveAuctions() {
  const all = getAuctions();
  return all.filter((a) => a.status === 'live');
}

/**
 * Get auction by ID
 */
export function getAuctionById(id) {
  const all = getAuctions();
  return all.find((a) => a.id === id) || null;
}

/**
 * Get all bids for a specific auction (sorted newest first)
 */
export function getBidsForAuction(auctionId) {
  const all = getBids();
  return all
    .filter((b) => b.auctionId === auctionId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get bids placed by a specific buyer across all auctions with auction context
 */
export function getUserBids(buyerId) {
  const allBids = getBids();
  const userBids = allBids.filter((b) => b.buyerId === buyerId);
  const auctions = getAuctions();

  return userBids.map((b) => {
    const auction = auctions.find((a) => a.id === b.auctionId);
    const isLeading = auction?.highestBidderId === buyerId;
    const isWinner = auction?.status === 'completed' && auction?.winnerId === buyerId;
    const isReserveFailed = auction?.status === 'reserve_not_met';
    const isOutbid = auction?.status === 'completed' && !isWinner;

    return {
      ...b,
      auction,
      isLeading,
      isWinner,
      isReserveFailed,
      isOutbid,
      currentHighestBid: auction?.currentBid || b.amount,
    };
  });
}

/**
 * Create and publish a new live auction
 */
export function createAuction(auctionData) {
  const currentAuctions = getAuctions();

  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return `auc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  };

  const durationMins = Number(auctionData.durationMinutes) || 30;
  const now = Date.now();
  const startsAt = new Date(now).toISOString();
  const endsAt = new Date(now + durationMins * 60 * 1000).toISOString();

  const startingBid = Number(auctionData.startingBid) || 40;
  const reservePrice = Number(auctionData.reservePrice) || startingBid;

  const newAuction = {
    id: generateId(),
    farmerId: auctionData.farmerId || 'usr_farmer_01',
    farmerName: auctionData.farmerName || 'Sakthi Vel',
    commodity: auctionData.commodity || 'Tomato',
    variety: auctionData.variety || 'Hybrid',
    grade: auctionData.grade || 'A',
    quantity: Number(auctionData.quantity) || 500,
    unit: auctionData.unit || 'kg',
    startingBid: startingBid,
    reservePrice: reservePrice,
    currentBid: startingBid,
    highestBidderId: null,
    highestBidderName: null,
    startsAt: startsAt,
    endsAt: endsAt,
    durationMinutes: durationMins,
    status: 'live',
    state: auctionData.state || 'Tamil Nadu',
    district: auctionData.district || 'Salem',
    images:
      auctionData.images && auctionData.images.length > 0
        ? auctionData.images
        : ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'],
    createdAt: new Date().toISOString(),
  };

  const updated = [newAuction, ...currentAuctions];
  saveAuctions(updated);
  return newAuction;
}

/**
 * Place a new bid with strict validation rules
 */
export function placeBid(auctionId, buyerId, buyerName, amount) {
  const auctions = getAuctions();
  const index = auctions.findIndex((a) => a.id === auctionId);
  if (index === -1) {
    throw new Error('Auction lot not found.');
  }

  const auction = auctions[index];
  const bidAmount = Number(amount);

  // Rule 1: Auction must still be live
  if (auction.status !== 'live' || new Date(auction.endsAt).getTime() <= Date.now()) {
    throw new Error('Bidding is closed. This auction has already concluded.');
  }

  // Rule 2: Farmer cannot bid on their own auction
  if (buyerId && auction.farmerId === buyerId) {
    throw new Error('Farmers cannot place bids on their own produce lots.');
  }

  // Rule 3: Bid must be strictly higher than current bid
  if (bidAmount <= auction.currentBid) {
    throw new Error(`Bid must be higher than current bid of ₹${auction.currentBid}/${auction.unit}`);
  }

  // Masked anonymous buyer tag
  const maskedTag = buyerName ? buyerName : `Buyer #${buyerId?.slice(-3) || 'X99'}`;

  // Create bid record in agrolnkBids
  const newBid = {
    id: `bid_${Date.now()}`,
    auctionId,
    buyerId: buyerId || 'usr_buyer_guest',
    buyerName: maskedTag,
    amount: bidAmount,
    createdAt: new Date().toISOString(),
  };

  const allBids = getBids();
  saveBids([newBid, ...allBids]);

  // Update auction current bid state
  auctions[index] = {
    ...auction,
    currentBid: bidAmount,
    highestBidderId: buyerId || 'usr_buyer_guest',
    highestBidderName: maskedTag,
  };

  saveAuctions(auctions);
  return { auction: auctions[index], bid: newBid };
}

/**
 * Core Finalization Function:
 * Finalizes an auction when countdown timer completes.
 * Prevents duplicate orders by checking auction.status === 'live'.
 * Evaluates reserve price threshold:
 * - If highestBid >= reservePrice: status = 'completed' -> creates Order in agrolnkOrders
 * - If highestBid < reservePrice or no bids: status = 'reserve_not_met' -> No order created
 */
export function finalizeAuction(auctionId) {
  const auctions = getAuctions();
  const index = auctions.findIndex((a) => a.id === auctionId);
  if (index === -1) return null;

  const auction = auctions[index];

  // Prevent duplicate finalization
  if (auction.status !== 'live') {
    return auction;
  }

  // Get all bids for this auction to determine true highest bid
  const allBids = getBidsForAuction(auctionId);
  const highestBid = allBids.length > 0 ? allBids[0] : null;

  const hasMetReserve =
    highestBid &&
    highestBid.amount >= auction.reservePrice &&
    highestBid.buyerId;

  if (hasMetReserve) {
    // 1. Mark status as completed first (prevents re-entry)
    const winningAmount = highestBid.amount;
    const totalOrderAmount = winningAmount * auction.quantity;

    // 2. Create the unified Agrolnk Escrow Order
    const newOrder = createOrder({
      type: 'auction',
      auctionId: auction.id,
      listingId: auction.id,
      farmerId: auction.farmerId,
      farmerName: auction.farmerName,
      buyerId: highestBid.buyerId,
      buyerName: highestBid.buyerName,
      commodity: auction.commodity,
      variety: auction.variety,
      grade: auction.grade,
      quantity: auction.quantity,
      unit: auction.unit,
      pricePerUnit: winningAmount,
      totalAmount: totalOrderAmount,
      state: auction.state,
      district: auction.district,
    });

    auctions[index] = {
      ...auction,
      status: 'completed',
      winningBid: winningAmount,
      currentBid: winningAmount,
      winnerId: highestBid.buyerId,
      winnerName: highestBid.buyerName,
      highestBidderId: highestBid.buyerId,
      highestBidderName: highestBid.buyerName,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      settledAt: new Date().toISOString(),
    };
  } else {
    // Reserve price not met or no bids placed
    auctions[index] = {
      ...auction,
      status: 'reserve_not_met',
      settledAt: new Date().toISOString(),
    };
  }

  saveAuctions(auctions);
  return auctions[index];
}

/**
 * Alias helpers for compatibility
 */
export function endAuction(auctionId) {
  return finalizeAuction(auctionId);
}

export function settleAuction(auctionId) {
  return finalizeAuction(auctionId);
}

/**
 * Get auction winner details
 */
export function getAuctionWinner(auctionId) {
  const auction = getAuctionById(auctionId);
  if (!auction || auction.status !== 'completed') return null;
  return {
    winnerId: auction.winnerId || auction.highestBidderId,
    winnerName: auction.winnerName || auction.highestBidderName,
    winningBid: auction.winningBid || auction.currentBid,
    orderNumber: auction.orderNumber,
    orderId: auction.orderId,
  };
}
