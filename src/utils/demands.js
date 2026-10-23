import { supabase } from '../lib/supabase';
import { getCurrentUser } from './auth';

const LOCAL_STORAGE_DEMANDS_KEY = 'agrolnk_buyer_demands_v1';
const LOCAL_STORAGE_OFFERS_KEY = 'agrolnk_demand_offers_v1';

const DEFAULT_SEEDS = [];

function getLocalDemands() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DEMANDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out and purge any dummy seed records
    const cleaned = parsed.filter(
      (d) => !d.id?.startsWith('dmd_seed_') && !['#DMD-4820', '#DMD-5192', '#DMD-6231'].includes(d.demand_number)
    );
    if (cleaned.length !== parsed.length) {
      saveLocalDemands(cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

function saveLocalDemands(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DEMANDS_KEY, JSON.stringify(list || []));
  } catch {}
}

function getLocalOffers() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_OFFERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out and purge any offers on dummy seeds
    const cleaned = parsed.filter(
      (o) => !o.demand_id?.startsWith('dmd_seed_') && !o.id?.startsWith('off_seed_')
    );
    if (cleaned.length !== parsed.length) {
      saveLocalOffers(cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

function saveLocalOffers(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_OFFERS_KEY, JSON.stringify(list || []));
  } catch {}
}

/**
 * Create a new Buyer Demand (Requirement / Tender)
 */
export async function createBuyerDemand(demandData) {
  const demandId = `dmd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const demandNumber = `#DMD-${Math.floor(1000 + Math.random() * 9000)}`;

  const activeUser = getCurrentUser();
  const buyerId = demandData.buyerId || activeUser?.id || '';
  const buyerName = demandData.buyerName || activeUser?.name || 'Verified Buyer';
  const buyerPhone = demandData.buyerPhone || activeUser?.phone || '';

  const mode = demandData.procurementMode || 'direct_offers'; // 'direct_offers' | 'reverse_auction'
  const durationHours = Number(demandData.durationHours) || 24;
  const endsAt = mode === 'reverse_auction' 
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
    : null;

  const targetPrice = Number(demandData.targetPrice) || 0;
  const bidStep = Math.max(1, Number(demandData.bidStep) || 25);

  const newDemand = {
    id: demandId,
    demand_number: demandNumber,
    buyer_id: buyerId,
    buyer_name: buyerName,
    buyer_phone: buyerPhone,
    commodity: demandData.commodity,
    variety: demandData.variety || 'None',
    grade: demandData.grade || 'A',
    quantity: Number(demandData.quantity),
    unit: demandData.unit || 'kg',
    procurement_mode: mode,
    target_price: targetPrice,
    price_unit: demandData.priceUnit || 'Quintal',
    bid_step: bidStep,
    current_lowest_bid: mode === 'reverse_auction' ? targetPrice : null,
    leading_bidder_id: null,
    leading_bidder_name: null,
    delivery_state: demandData.deliveryState || '',
    delivery_district: demandData.deliveryDistrict || '',
    delivery_pincode: demandData.deliveryPincode || '',
    delivery_address: demandData.deliveryAddress || '',
    needed_by_date: demandData.neededByDate || null,
    duration_hours: durationHours,
    ends_at: endsAt,
    description: demandData.description || '',
    total_offers: 0,
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from('buyer_demands')
      .insert([newDemand])
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase buyer_demands error, falling back to local storage:', err);
  }

  // 2. Local Fallback
  const current = getLocalDemands();
  current.unshift(newDemand);
  saveLocalDemands(current);
  return newDemand;
}

/**
 * Fetch Buyer Demands with optional filters
 */
export async function getBuyerDemands(filters = {}) {
  try {
    let query = supabase
      .from('buyer_demands')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.buyerId) {
      query = query.eq('buyer_id', filters.buyerId);
    }
    if (filters.commodity && filters.commodity !== 'All') {
      query = query.eq('commodity', filters.commodity);
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.procurementMode) {
      query = query.eq('procurement_mode', filters.procurementMode);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('Using local demands cache:', err);
  }

  // Fallback to local demands
  let localList = getLocalDemands();
  if (filters.buyerId) {
    localList = localList.filter((d) => d.buyer_id === filters.buyerId);
  }
  if (filters.commodity && filters.commodity !== 'All') {
    localList = localList.filter((d) => d.commodity === filters.commodity);
  }
  if (filters.status && filters.status !== 'all') {
    localList = localList.filter((d) => d.status === filters.status);
  }
  if (filters.procurementMode) {
    localList = localList.filter((d) => d.procurement_mode === filters.procurementMode);
  }

  return localList;
}

/**
 * Get a single Demand by ID
 */
export async function getDemandById(demandId) {
  try {
    const { data, error } = await supabase
      .from('buyer_demands')
      .select('*')
      .eq('id', demandId)
      .single();

    if (!error && data) return data;
  } catch {}

  const local = getLocalDemands();
  return local.find((d) => d.id === demandId) || null;
}

/**
 * Submit a supply offer from a Farmer to a Direct Demand
 */
export async function submitDemandOffer(offerData) {
  const offerId = `off_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const activeUser = getCurrentUser();

  const newOffer = {
    id: offerId,
    demand_id: offerData.demandId,
    farmer_id: offerData.farmerId || activeUser?.id || '',
    farmer_name: offerData.farmerName || activeUser?.name || 'Farmer Partner',
    farmer_phone: offerData.farmerPhone || activeUser?.phone || '',
    offer_price: Number(offerData.offerPrice),
    quantity_offered: Number(offerData.quantityOffered),
    unit: offerData.unit || 'kg',
    message: offerData.message || '',
    status: 'submitted',
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('demand_offers')
      .insert([newOffer])
      .select()
      .single();

    if (!error && data) {
      // Increment demand total_offers counter
      try {
        const { data: dem } = await supabase
          .from('buyer_demands')
          .select('total_offers')
          .eq('id', offerData.demandId)
          .single();
        if (dem) {
          await supabase
            .from('buyer_demands')
            .update({ total_offers: (dem.total_offers || 0) + 1, updated_at: new Date().toISOString() })
            .eq('id', offerData.demandId);
        }
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn('Supabase demand_offers error, using local storage:', err);
  }

  // Local Fallback
  const offers = getLocalOffers();
  offers.unshift(newOffer);
  saveLocalOffers(offers);

  const demands = getLocalDemands();
  const dIdx = demands.findIndex((d) => d.id === offerData.demandId);
  if (dIdx !== -1) {
    demands[dIdx].total_offers = (demands[dIdx].total_offers || 0) + 1;
    saveLocalDemands(demands);
  }

  return newOffer;
}

/**
 * Fetch all offers submitted for a specific demand
 */
export async function getDemandOffers(demandId) {
  try {
    const { data, error } = await supabase
      .from('demand_offers')
      .select('*')
      .eq('demand_id', demandId)
      .order('created_at', { ascending: false });

    if (!error && data) return data;
  } catch {}

  const offers = getLocalOffers();
  return offers.filter((o) => o.demand_id === demandId);
}

/**
 * Accept a Farmer's Offer -> Awards the demand and automatically spawns an Escrow Order!
 */
export async function acceptDemandOffer(demandId, offer) {
  const demand = await getDemandById(demandId);
  if (!demand) throw new Error('Requirement not found.');

  const orderNum = `#AGM-${Math.floor(1000 + Math.random() * 9000)}`;
  const totalAmt = Number(offer.quantity_offered) * Number(offer.offer_price);
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const createdOrderRow = {
    id: orderId,
    order_number: orderNum,
    auction_id: null,
    listing_id: null,
    buyer_id: demand.buyer_id,
    buyer_name: demand.buyer_name || 'Buyer Partner',
    farmer_id: offer.farmer_id,
    farmer_name: offer.farmer_name || 'Farmer Partner',
    commodity: demand.commodity,
    variety: demand.variety || 'None',
    grade: demand.grade || 'A',
    quantity: Number(offer.quantity_offered),
    unit: offer.unit || demand.unit || 'kg',
    price_per_unit: Number(offer.offer_price),
    total_amount: totalAmt,
    state: demand.delivery_state || '',
    district: demand.delivery_district || '',
    escrow_status: 'pending',
    status: 'order_placed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Try Supabase
  try {
    // Insert order
    await supabase.from('orders').insert([createdOrderRow]);

    // Update offer status
    await supabase
      .from('demand_offers')
      .update({ status: 'accepted' })
      .eq('id', offer.id);

    // Update demand status
    await supabase
      .from('buyer_demands')
      .update({ status: 'awarded', updated_at: new Date().toISOString() })
      .eq('id', demandId);

    return createdOrderRow;
  } catch (err) {
    console.warn('acceptDemandOffer supabase error, updating locally:', err);
  }

  // 2. Local fallback
  const demands = getLocalDemands();
  const dIdx = demands.findIndex((d) => d.id === demandId);
  if (dIdx !== -1) {
    demands[dIdx].status = 'awarded';
    saveLocalDemands(demands);
  }

  const offers = getLocalOffers();
  const oIdx = offers.findIndex((o) => o.id === offer.id);
  if (oIdx !== -1) {
    offers[oIdx].status = 'accepted';
    saveLocalOffers(offers);
  }

  return createdOrderRow;
}

/**
 * Place a Reverse Bid on a Live Reverse Auction Tender
 */
export async function placeDemandBid(demandId, farmerId, farmerName, bidAmount) {
  const demand = await getDemandById(demandId);
  if (!demand) throw new Error('Auction demand not found.');

  if (demand.status !== 'open') {
    throw new Error('This procurement tender is no longer accepting bids.');
  }

  if (demand.ends_at && new Date(demand.ends_at).getTime() <= Date.now()) {
    throw new Error('This procurement tender has ended.');
  }

  const numBid = Number(bidAmount);
  const currentLow = Number(demand.current_lowest_bid || demand.target_price);
  const step = Number(demand.bid_step) || 25;

  if (numBid >= currentLow) {
    throw new Error(`Your quote must be lower than the current leading offer of ₹${currentLow}/${demand.unit}.`);
  }

  const dec = currentLow - numBid;
  if (dec < step) {
    throw new Error(`Your quote must be lower by at least the required step of ₹${step}/${demand.unit}.`);
  }

  const remainder = Math.round((dec % step) * 100) / 100;
  if (remainder > 0.01 && remainder < (step - 0.01)) {
    throw new Error(`Quotes must be in exact step decrements of ₹${step}/${demand.unit} (e.g. ₹${currentLow - step}).`);
  }

  const bidOffer = {
    id: `off_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    demand_id: demandId,
    farmer_id: farmerId,
    farmer_name: farmerName,
    farmer_phone: '',
    offer_price: numBid,
    quantity_offered: Number(demand.quantity),
    unit: demand.unit,
    message: `Submitted reverse quote of ₹${numBid}/${demand.unit}`,
    status: 'submitted',
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from('demand_offers').insert([bidOffer]);

    const { data: updated, error } = await supabase
      .from('buyer_demands')
      .update({
        current_lowest_bid: numBid,
        leading_bidder_id: farmerId,
        leading_bidder_name: farmerName,
        total_offers: (demand.total_offers || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', demandId)
      .select()
      .single();

    if (!error && updated) return updated;
  } catch (err) {
    console.warn('placeDemandBid supabase error, using fallback:', err);
  }

  // Local fallback
  const demands = getLocalDemands();
  const dIdx = demands.findIndex((d) => d.id === demandId);
  if (dIdx !== -1) {
    demands[dIdx].current_lowest_bid = numBid;
    demands[dIdx].leading_bidder_id = farmerId;
    demands[dIdx].leading_bidder_name = farmerName;
    demands[dIdx].total_offers = (demands[dIdx].total_offers || 0) + 1;
    saveLocalDemands(demands);
    return demands[dIdx];
  }

  return demand;
}

/**
 * Convert a Direct Demand to a Live Flash Reverse Auction
 */
export async function convertDemandToLiveAuction(demandId, durationHours = 2) {
  const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  const demand = await getDemandById(demandId);
  const currentLowest = Number(demand.current_lowest_bid || demand.target_price);

  try {
    const { data, error } = await supabase
      .from('buyer_demands')
      .update({
        procurement_mode: 'reverse_auction',
        duration_hours: durationHours,
        ends_at: endsAt,
        current_lowest_bid: currentLowest,
        updated_at: new Date().toISOString(),
      })
      .eq('id', demandId)
      .select()
      .single();

    if (!error && data) return data;
  } catch {}

  const demands = getLocalDemands();
  const dIdx = demands.findIndex((d) => d.id === demandId);
  if (dIdx !== -1) {
    demands[dIdx].procurement_mode = 'reverse_auction';
    demands[dIdx].duration_hours = durationHours;
    demands[dIdx].ends_at = endsAt;
    demands[dIdx].current_lowest_bid = currentLowest;
    saveLocalDemands(demands);
    return demands[dIdx];
  }
}
