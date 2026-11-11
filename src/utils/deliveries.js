// AgroLnk Supabase Deliveries & Logistics Engine
import { supabase } from '../lib/supabase';
import { broadcastDataChange } from './syncChannel';
import { sendNotification } from './notifications';
import { calculateFreightFinancials } from './commission';
import { getCurrentUser } from './auth';

export const calculateTransportFinancials = calculateFreightFinancials;

function mapDeliveryFromDb(row) {
  if (!row) return null;

  const rawQuotes = Array.isArray(row.freight_quotes) ? row.freight_quotes : [];
  const freightAmt = row.freight_amount ? Number(row.freight_amount) : null;

  // Ensure backwards compatibility if a single quote exists on the row without freight_quotes array
  const normalizedQuotes =
    rawQuotes.length > 0
      ? [...rawQuotes].sort((a, b) => Number(a.freightAmount || 0) - Number(b.freightAmount || 0))
      : freightAmt && row.transporter_name
      ? [
          {
            transporterId: row.transporter_id || 'transporter',
            transporterName: row.transporter_name,
            vehicleType: row.vehicle_type || 'Commercial Freight Carrier',
            vehicleNumber: row.vehicle_number || '',
            driverName: row.driver_name || 'Assigned Driver',
            driverPhone: row.driver_phone || '',
            freightAmount: freightAmt,
            isAdminAssigned: Boolean(row.admin_assigned_quote),
            quotedAt: row.updated_at || row.created_at,
          },
        ]
      : [];

  const lowestQuote = normalizedQuotes.length > 0 ? normalizedQuotes[0] : null;
  const resolvedFreightAmt = lowestQuote ? Number(lowestQuote.freightAmount) : freightAmt;
  const rfqExpiresAt =
    row.rfq_expires_at ||
    (row.created_at ? new Date(new Date(row.created_at).getTime() + 30 * 60 * 1000).toISOString() : null);

  const isRfqExpired = Boolean(
    rfqExpiresAt &&
      new Date(rfqExpiresAt).getTime() <= Date.now() &&
      normalizedQuotes.length === 0 &&
      !resolvedFreightAmt &&
      row.status === 'transport_requested'
  );

  return {
    id: row.id,
    deliveryNumber: row.delivery_number,
    orderId: row.order_id,
    orderNumber: row.order_number,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    transporterId: lowestQuote?.transporterId || row.transporter_id,
    transporterName: lowestQuote?.transporterName || row.transporter_name,
    vehicleType: lowestQuote?.vehicleType || row.vehicle_type,
    vehicleNumber: lowestQuote?.vehicleNumber || row.vehicle_number,
    driverName: lowestQuote?.driverName || row.driver_name,
    driverPhone: lowestQuote?.driverPhone || row.driver_phone,
    freightAmount: resolvedFreightAmt,
    estimatedDistanceKm: row.estimated_distance_km ? Number(row.estimated_distance_km) : null,
    commodity: row.commodity,
    grade: row.grade,
    variety: row.variety,
    quantity: Number(row.quantity),
    unit: row.unit,
    pickupLocation: row.pickup_location || {},
    deliveryLocation: row.delivery_location || {},
    status: row.status,
    notes: row.notes,
    pickupOtp: row.pickup_otp,
    deliveryOtp: row.delivery_otp,
    // Competitive Multi-Transporter Bidding & 30-Min RFQ fields
    rfqExpiresAt,
    isRfqExpired,
    freightQuotes: normalizedQuotes,
    lowestQuote,
    quotesCount: normalizedQuotes.length,
    adminEscalated: Boolean(row.admin_escalated) || isRfqExpired,
    adminAssignedQuote: Boolean(row.admin_assigned_quote || lowestQuote?.isAdminAssigned),
    // Transport Escrow & Take-Rate fields (Buyer-paid model)
    freightEscrowStatus:
      row.freight_escrow_status ||
      (row.status === 'completed' ? 'released' : resolvedFreightAmt ? 'unfunded' : null),
    freightPayerId: row.freight_payer_id || row.buyer_id || null,
    freightPayerRole: row.freight_payer_role || 'buyer',
    freightBaseAmount: Number(row.freight_base_amount || resolvedFreightAmt || 0),
    consignorFreightFee: Number(row.consignor_freight_fee || 0),
    totalFreightPayable: Number(row.total_freight_payable || resolvedFreightAmt || 0),
    transporterCommissionFee: Number(row.transporter_commission_fee || 0),
    transporterNetPayout: Number(row.transporter_net_payout || 0),
    freightPaymentMode: row.freight_payment_mode || 'direct_razorpay',
    freightBankUtr: row.freight_bank_utr || null,
    freightDepositedAt: row.freight_deposited_at || null,
    freightAdminVerifiedBy: row.freight_admin_verified_by || null,
    freightAdminVerifiedAt: row.freight_admin_verified_at || null,
    freightDisbursedAt: row.freight_disbursed_at || null,
    freightDisbursalUtr: row.freight_disbursal_utr || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Determine whether exact street addresses and phone numbers are unlocked for the current viewer.
 * Privacy Shield Rule:
 * - Buyers and Farmers NEVER see each other's street addresses.
 * - Transporters in the open bidding pool only see District & State.
 * - Only Admin or the Winning Assigned Transporter (after Buyer Escrow Lock) unlocks street addresses.
 */
export function isDeliveryAddressUnlocked(delivery, viewerRole = '', viewerId = '') {
  if (!delivery) return false;
  const role = String(viewerRole || '').toLowerCase();
  if (role === 'admin') return true;
  if (role === 'transporter') {
    const isAssignedStatus = ['assigned', 'picked_up', 'dispatched', 'in_transit', 'delivered', 'completed'].includes(
      delivery.status
    );
    const isThisWinner =
      viewerId && delivery.transporterId && String(delivery.transporterId) === String(viewerId);
    return Boolean(isAssignedStatus && isThisWinner);
  }
  return false;
}

/**
 * Format location string while enforcing strict street-address privacy
 */
export function getPrivacySafeLocationLabel(locationObj, isUnlocked = false, fallbackLabel = 'Hub') {
  if (!locationObj) return fallbackLabel;
  if (typeof locationObj === 'string') return isUnlocked ? locationObj : fallbackLabel;
  const district = locationObj.district || '';
  const state = locationObj.state || '';
  const districtState = [district, state].filter(Boolean).join(', ') || fallbackLabel;
  if (!isUnlocked) {
    return districtState;
  }
  const street = locationObj.address || '';
  const pin = locationObj.pincode ? ` - ${locationObj.pincode}` : '';
  return street ? `${street}, ${districtState}${pin}` : `${districtState}${pin}`;
}

export const DISTRICT_DISTANCES = {};

/**
 * Deprecated formula helper (No hardcoded distance formula is used; transporters quote directly based on route & truck availability)
 */
export function estimateDistanceKm() {
  return null;
}

/**
 * Vehicle categories for fleet selection & capacity matching (No hardcoded per-km price formula)
 */
export const VEHICLE_TARIFF_RATES = {
  'mini_truck': {
    name: 'Mini Truck (Tata Ace / Bolero)',
    maxCapacityKg: 1500,
    baseFare: 0,
    ratePerKm: 0,
    description: 'Best for local & small lots (up to 1.5 MT)'
  },
  'medium_lcv': {
    name: 'Medium LCV (14ft Eicher)',
    maxCapacityKg: 5000,
    baseFare: 0,
    ratePerKm: 0,
    description: 'Standard agri freight (up to 5.0 MT)'
  },
  'reefer_truck': {
    name: 'Reefer Cold-Chain Truck',
    maxCapacityKg: 8000,
    baseFare: 0,
    ratePerKm: 0,
    description: 'Temperature-controlled for perishable horticulture'
  },
  'heavy_truck': {
    name: 'Heavy Commercial (10-Wheeler / Multi-Axle)',
    maxCapacityKg: 25000,
    baseFare: 0,
    ratePerKm: 0,
    description: 'Bulk grain / wholesale volume (up to 25 MT)'
  }
};

/**
 * Recommend appropriate vehicle class based on load weight (without forcing a formula price)
 */
export function calculateEstimatedFare(weightKg, _distanceKm = null, vehicleKey = null) {
  const wt = Number(weightKg) || 1000;

  let chosenKey = vehicleKey;
  if (!chosenKey || !VEHICLE_TARIFF_RATES[chosenKey]) {
    if (wt <= 1500) chosenKey = 'mini_truck';
    else if (wt <= 5000) chosenKey = 'medium_lcv';
    else if (wt <= 8000) chosenKey = 'reefer_truck';
    else chosenKey = 'heavy_truck';
  }

  const rate = VEHICLE_TARIFF_RATES[chosenKey];
  return {
    vehicleKey: chosenKey,
    vehicleName: rate.name,
    distanceKm: null,
    estimatedFare: 0,
    baseFare: 0,
    ratePerKm: 0,
    description: rate.description
  };
}

/**
 * Get all deliveries from Supabase (deduplicated by order)
 */
export async function getDeliveries() {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch deliveries from Supabase:', error);
      return [];
    }

    const rawList = (data || []).map(mapDeliveryFromDb);
    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
  } catch (err) {
    console.error('Error in getDeliveries:', err);
    return [];
  }
}

/**
 * Get deliveries for a farmer
 */
export async function getFarmerDeliveries(farmerId) {
  try {
    if (!farmerId) return [];

    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch farmer deliveries:', error);
      return [];
    }

    const rawList = (data || []).map(mapDeliveryFromDb);
    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
  } catch (err) {
    console.error('Error in getFarmerDeliveries:', err);
    return [];
  }
}

/**
 * Get deliveries for a buyer
 */
export async function getBuyerDeliveries(buyerId) {
  try {
    if (!buyerId) return [];

    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch buyer deliveries:', error);
      return [];
    }

    const rawList = (data || []).map(mapDeliveryFromDb);
    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
  } catch (err) {
    console.error('Error in getBuyerDeliveries:', err);
    return [];
  }
}

/**
 * Get all open platform jobs available for commercial transporters
 * Includes both 'transport_requested' and 'price_offered' (during the 30-min competitive bidding window before escrow lock)
 */
export async function getAvailableTransportJobs() {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .in('status', ['transport_requested', 'price_offered'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch transport jobs:', error);
      return [];
    }

    const rawList = (data || [])
      .map(mapDeliveryFromDb)
      .filter(
        (d) =>
          d.transporterName !== 'Farmer Direct Transport' &&
          d.transporterName !== 'Self / Direct Farmer' &&
          d.freightEscrowStatus !== 'escrow_locked' &&
          d.freightEscrowStatus !== 'released'
      );

    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
  } catch (err) {
    console.error('Error in getAvailableTransportJobs:', err);
    return [];
  }
}

/**
 * Get deliveries accepted by a transporter
 */
export async function getTransporterDeliveries(transporterId) {
  try {
    if (!transporterId) return await getDeliveries();

    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('transporter_id', transporterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch transporter deliveries:', error);
      return [];
    }

    const rawList = (data || []).map(mapDeliveryFromDb);
    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
  } catch (err) {
    console.error('Error in getTransporterDeliveries:', err);
    return [];
  }
}

/**
 * Create or update a delivery record in Supabase (Guaranteed Idempotency)
 * Sets a 30-minute competitive transporter bidding window (rfq_expires_at)
 */
export async function createDelivery(deliveryData) {
  try {
    const orderIdentifier = deliveryData.orderId || deliveryData.orderNumber;
    const nowIso = new Date().toISOString();
    const rfqExpiresAt =
      deliveryData.rfqExpiresAt ||
      new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Check if a delivery already exists for this order to prevent duplicates
    if (orderIdentifier) {
      const { data: existingRows } = await supabase
        .from('deliveries')
        .select('*')
        .or(`order_id.eq.${orderIdentifier},order_number.eq.${orderIdentifier}`)
        .order('created_at', { ascending: false });

      if (existingRows && existingRows.length > 0) {
        const existing = existingRows[0];
        if (existingRows.length > 1) {
          const duplicateIds = existingRows.slice(1).map((r) => r.id);
          try {
            await supabase.from('deliveries').delete().in('id', duplicateIds);
          } catch (delErr) {
            console.warn('Cleanup duplicate deliveries notice:', delErr);
          }
        }

        const { data: updated, error: updateErr } = await supabase
          .from('deliveries')
          .update({
            pickup_location: deliveryData.pickupLocation || existing.pickup_location,
            delivery_location: deliveryData.deliveryLocation || existing.delivery_location,
            status: deliveryData.status || existing.status || 'transport_requested',
            notes: deliveryData.notes || existing.notes || null,
            updated_at: nowIso,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (!updateErr && updated) {
          return mapDeliveryFromDb(updated);
        }
        return mapDeliveryFromDb(existing);
      }
    }

    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch {
        return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    };

    const generateDeliveryNum = () => {
      const num = Math.floor(1000 + Math.random() * 9000);
      return `DEL-${num}`;
    };

    const isUuid = (str) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const dbRow = {
      id: generateId(),
      delivery_number: generateDeliveryNum(),
      order_id: isUuid(deliveryData.orderId) ? deliveryData.orderId : null,
      order_number: deliveryData.orderNumber || '#AGM-1000',
      farmer_id: isUuid(deliveryData.farmerId) ? deliveryData.farmerId : (deliveryData.farmerId || null),
      farmer_name: deliveryData.farmerName || 'Producer',
      buyer_id: isUuid(deliveryData.buyerId) ? deliveryData.buyerId : (deliveryData.buyerId || null),
      buyer_name: deliveryData.buyerName || 'Buyer',
      transporter_id: isUuid(deliveryData.transporterId) ? deliveryData.transporterId : null,
      transporter_name: deliveryData.transporterName || null,
      commodity: deliveryData.commodity || 'Produce',
      grade: deliveryData.grade || 'A',
      variety: deliveryData.variety || 'Standard',
      quantity: Number(deliveryData.quantity),
      unit: deliveryData.unit || 'kg',
      pickup_location: deliveryData.pickupLocation || {},
      delivery_location: deliveryData.deliveryLocation || {},
      status: deliveryData.status || 'transport_requested',
      rfq_expires_at: rfqExpiresAt,
      freight_quotes: [],
      freight_payer_id: deliveryData.buyerId || null,
      freight_payer_role: 'buyer',
      pickup_otp: String(Math.floor(1000 + Math.random() * 9000)),
      delivery_otp: String(Math.floor(1000 + Math.random() * 9000)),
      created_at: nowIso,
      updated_at: nowIso,
    };

    let { data, error } = await supabase
      .from('deliveries')
      .insert([dbRow])
      .select()
      .single();

    // Fallback if rfq_expires_at or freight_quotes columns have not been migrated yet
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('rfq_expires_at') || error.message?.includes('freight_quotes'))) {
      const fallbackRow = { ...dbRow };
      delete fallbackRow.rfq_expires_at;
      delete fallbackRow.freight_quotes;
      delete fallbackRow.freight_payer_id;
      delete fallbackRow.freight_payer_role;
      const retry = await supabase
        .from('deliveries')
        .insert([fallbackRow])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase delivery creation error:', error);
      throw error;
    }

    const mapped = mapDeliveryFromDb(data);

    // Broadcast freight RFQ notification to all transporters
    try {
      const originDist = deliveryData.pickupLocation?.district || 'Farmgate';
      const originState = deliveryData.pickupLocation?.state || '';
      const destDist = deliveryData.deliveryLocation?.district || 'Buyer Hub';
      const destState = deliveryData.deliveryLocation?.state || '';
      sendNotification({
        recipientRole: 'transporter',
        title: `New Freight RFQ: ${mapped.commodity} (${mapped.quantity} ${mapped.unit})`,
        message: `Route: ${originDist}${originState ? `, ${originState}` : ''} → ${destDist}${destState ? `, ${destState}` : ''}. Submit your competitive freight quote within 30 minutes.`,
        type: 'delivery',
        link: '/transporter-dashboard',
      });
    } catch {}

    return mapped;
  } catch (err) {
    console.error('Error creating delivery:', err);
    throw err;
  }
}

/**
 * Deprecated self-arranged transport stub (Self-arranged transport is disabled to preserve Buyer/Seller address privacy)
 */
export async function createOrUpdateSelfTransport() {
  throw new Error('Self-arranged transport is disabled on AgroLnk to protect buyer and seller address privacy. All shipments use AgroLnk Verified Transporters.');
}

/**
 * Transporter submits a competitive freight quote during the 30-minute RFQ window.
 * Supports multiple transporters bidding on the same job and automatically selects the lowest quote for the Buyer.
 */
export async function submitTransportQuote(deliveryId, quoteData) {
  try {
    const activeUser = getCurrentUser();
    if (activeUser?.role && activeUser.role !== 'transporter' && activeUser.role !== 'admin') {
      throw new Error('Only verified transporters or the AgroLnk Logistics Desk can submit freight quotes.');
    }

    const effectiveIsAdmin = activeUser?.role === 'admin' && Boolean(quoteData.isAdminAssigned);
    const resolvedTransporterId = effectiveIsAdmin
      ? quoteData.transporterId || 'admin_concierge_fleet'
      : activeUser?.id || quoteData.transporterId || 'transporter';

    const cleanFreightAmt = Math.round(Number(quoteData.freightAmount || 0) * 100) / 100;
    if (!cleanFreightAmt || cleanFreightAmt <= 0) {
      throw new Error('Please enter a valid freight quote amount greater than ₹0.');
    }

    const existingDelivery = await getDeliveryById(deliveryId);
    if (
      existingDelivery &&
      !effectiveIsAdmin &&
      (['locked', 'escrow_locked', 'released'].includes(existingDelivery.freightEscrowStatus) ||
        ['assigned', 'in_transit', 'delivered', 'completed'].includes(existingDelivery.status))
    ) {
      throw new Error('This freight job is already locked in escrow and no longer accepting quotes.');
    }

    // 1. Try Atomic Server RPC (handles multi-transporter quote array + lowest quote selection + order sync)
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('submit_transporter_quote_atomic', {
        p_delivery_id: deliveryId,
        p_transporter_id: resolvedTransporterId,
        p_transporter_name: quoteData.transporterName || activeUser?.name || 'Verified Transporter',
        p_vehicle_type: quoteData.vehicleType || 'Commercial Freight Carrier',
        p_vehicle_number: (quoteData.vehicleNumber || '').trim().toUpperCase(),
        p_driver_name: quoteData.driverName || 'Assigned Driver',
        p_driver_phone: quoteData.driverPhone || '',
        p_freight_amount: cleanFreightAmt,
        p_is_admin_assigned: effectiveIsAdmin,
      });

      if (!rpcErr && rpcRes?.success) {
        const refreshed = await getDeliveryById(deliveryId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agrolnk_deliveries_updated', { detail: refreshed }));
          window.dispatchEvent(new Event('agrolnk_orders_updated'));
          window.dispatchEvent(new Event('storage'));
        }
        return refreshed;
      }
      if (rpcErr && rpcErr.message?.includes('already assigned')) {
        throw new Error(rpcErr.message);
      }
    } catch (rpcCatch) {
      if (rpcCatch.message?.includes('already assigned')) {
        throw rpcCatch;
      }
      console.warn('submit_transporter_quote_atomic RPC fallback notice:', rpcCatch);
    }

    // 2. Client-side Fallback if RPC not yet applied in Supabase
    const nowIso = new Date().toISOString();
    const existingQuotes = Array.isArray(existingDelivery?.freightQuotes) ? existingDelivery.freightQuotes : [];

    const newQuoteEntry = {
      transporterId: resolvedTransporterId,
      transporterName: quoteData.transporterName || activeUser?.name || 'Commercial Transporter',
      vehicleType: quoteData.vehicleType || 'Commercial Freight Carrier',
      vehicleNumber: (quoteData.vehicleNumber || '').trim().toUpperCase(),
      driverName: quoteData.driverName || 'Driver',
      driverPhone: quoteData.driverPhone || '',
      freightAmount: cleanFreightAmt,
      isAdminAssigned: effectiveIsAdmin,
      quotedAt: nowIso,
    };

    const filteredQuotes = existingQuotes.filter(
      (q) => String(q.transporterId || '') !== String(newQuoteEntry.transporterId)
    );
    const updatedQuotes = [...filteredQuotes, newQuoteEntry].sort(
      (a, b) => Number(a.freightAmount || 0) - Number(b.freightAmount || 0)
    );

    const winningQuote = effectiveIsAdmin ? newQuoteEntry : updatedQuotes[0];

    const updatePayload = {
      transporter_id: winningQuote.transporterId || null,
      transporter_name: winningQuote.transporterName || 'Commercial Transporter',
      vehicle_type: winningQuote.vehicleType || 'Commercial Freight Carrier',
      vehicle_number: winningQuote.vehicleNumber,
      driver_name: winningQuote.driverName || 'Driver',
      driver_phone: winningQuote.driverPhone || '',
      freight_amount: Number(winningQuote.freightAmount),
      freight_quotes: updatedQuotes,
      admin_assigned_quote: Boolean(effectiveIsAdmin || existingDelivery?.adminAssignedQuote),
      status: 'price_offered',
      updated_at: nowIso,
    };

    let { data, error } = await supabase
      .from('deliveries')
      .update(updatePayload)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('freight_quotes'))) {
      delete updatePayload.freight_quotes;
      delete updatePayload.admin_assigned_quote;
      const retry = await supabase
        .from('deliveries')
        .update(updatePayload)
        .eq('id', deliveryId)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Error submitting transport quote:', error);
      throw error;
    }

    const mapped = mapDeliveryFromDb({ ...data, freight_quotes: data?.freight_quotes || updatedQuotes });

    // Notify Buyer of lowest quote
    if (mapped?.buyerId) {
      try {
        sendNotification({
          recipientId: mapped.buyerId,
          recipientRole: 'buyer',
          title: `Lowest Freight Quote Ready: ₹${Number(winningQuote.freightAmount).toLocaleString('en-IN')} (${mapped.orderNumber})`,
          message: `Verified carrier (${winningQuote.transporterName}) quoted ₹${Number(winningQuote.freightAmount).toLocaleString('en-IN')} for ${mapped.commodity}. Complete combined escrow payment to lock lot & dispatch.`,
          type: 'delivery',
          link: '/buyer-orders',
        });
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_deliveries_updated', { detail: mapped }));
      window.dispatchEvent(new Event('agrolnk_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return mapped;
  } catch (err) {
    console.error('Error in submitTransportQuote:', err);
    throw err;
  }
}

/**
 * Admin 30-Minute Concierge Fail-Safe:
 * Fetch all open freight requests that have expired (30+ minutes) with 0 transporter bids
 */
export async function getExpiredUnquotedDeliveries() {
  try {
    const all = await getDeliveries();
    return all.filter(
      (d) =>
        d.status === 'transport_requested' &&
        (!d.freightAmount || Number(d.freightAmount) <= 0) &&
        (d.isRfqExpired || d.adminEscalated)
    );
  } catch (err) {
    console.error('Error in getExpiredUnquotedDeliveries:', err);
    return [];
  }
}

/**
 * Admin 30-Minute Concierge Fail-Safe:
 * Manually assign a verified freight quote and fleet carrier after telephonic coordination with Buyer
 */
export async function assignAdminFailSafeFreightQuote(deliveryId, adminQuoteData) {
  return submitTransportQuote(deliveryId, {
    ...adminQuoteData,
    transporterId: adminQuoteData.transporterId || 'admin_concierge_fleet',
    transporterName: adminQuoteData.transporterName || 'AgroLnk Verified Fleet Partner',
    isAdminAssigned: true,
  });
}

/**
 * Buyer (or Admin) accepts transporter quote and deposits freight into AgroLnk Escrow
 * Handles both Instant Gateway (< 50k) and Escrow Virtual Account (NEFT/RTGS)
 */
export async function depositFreightEscrow({
  deliveryId,
  paymentMode = 'direct_razorpay',
  bankUtr = null,
  payerUser = null,
  freightBreakdown = null
}) {
  try {
    const isBankTransfer = paymentMode === 'escrow_van';
    const nowIso = new Date().toISOString();

    const updatePayload = {
      freight_escrow_status: isBankTransfer ? 'pending_bank_check' : 'escrow_locked',
      freight_payer_id: payerUser?.id || null,
      freight_payer_role: payerUser?.role || 'buyer',
      freight_base_amount: freightBreakdown?.baseFare || 0,
      consignor_freight_fee: freightBreakdown?.consignorFee || 0,
      total_freight_payable: freightBreakdown?.totalFreightDeposit || 0,
      transporter_commission_fee: freightBreakdown?.transporterFee || 0,
      transporter_net_payout: freightBreakdown?.netTransporterPayout || 0,
      freight_payment_mode: paymentMode,
      freight_bank_utr: bankUtr || null,
      freight_deposited_at: nowIso,
      status: isBankTransfer ? 'price_offered' : 'assigned',
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('deliveries')
      .update(updatePayload)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('Error depositing freight escrow:', error);
      throw error;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('agrolnk_deliveries_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('depositFreightEscrow error:', err);
    throw err;
  }
}

/**
 * Admin verifies real-world bank credit for freight quote (Escrow VAN / NEFT/RTGS)
 * Moves freight_escrow_status to 'escrow_locked' and status to 'assigned', unlocking driver dispatch
 */
export async function verifyFreightBankDeposit(deliveryId, adminName = 'AgroLnk Admin') {
  try {
    const nowIso = new Date().toISOString();
    const updatePayload = {
      freight_escrow_status: 'escrow_locked',
      status: 'assigned', // Unlocks driver dispatch
      freight_admin_verified_by: adminName,
      freight_admin_verified_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('deliveries')
      .update(updatePayload)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('agrolnk_deliveries_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('verifyFreightBankDeposit error:', err);
    throw err;
  }
}

/**
 * Admin releases freight payment from AgroLnk Escrow to Transporter upon Delivery OTP
 * Deducts 0.25% platform fee and remits net fare
 */
export async function adminReleaseFreightEscrow({
  deliveryId,
  adminUser = null,
  disbursalUtr = null,
}) {
  try {
    const nowIso = new Date().toISOString();
    const adminName = adminUser?.name || 'AgroLnk Logistics Ombudsman';

    const updatePayload = {
      freight_escrow_status: 'released',
      status: 'completed',
      freight_disbursed_at: nowIso,
      freight_disbursal_utr: disbursalUtr || `UTR-LOG-${Date.now().toString().slice(-8)}`,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('deliveries')
      .update(updatePayload)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('agrolnk_deliveries_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('adminReleaseFreightEscrow error:', err);
    throw err;
  }
}

/**
 * Legacy helper guarded against bypassing Buyer Combined Escrow payment.
 * Transport assignment requires Buyer Combined Crop + Freight Escrow lock or Admin Bank Verification.
 */
export async function acceptTransportPrice(deliveryId) {
  const existing = await getDeliveryById(deliveryId);
  if (
    !existing ||
    !['locked', 'escrow_locked', 'released'].includes(existing.freightEscrowStatus)
  ) {
    throw new Error(
      'Transport dispatch can only be unlocked after Buyer completes Combined Crop + Freight Escrow payment.'
    );
  }
  return existing;
}

/**
 * Re-opens a freight request to the transport board (only permitted by Admin before escrow is locked)
 */
export async function declineTransportPrice(deliveryId) {
  try {
    const activeUser = getCurrentUser();
    const existing = await getDeliveryById(deliveryId);
    if (existing && ['locked', 'escrow_locked', 'released'].includes(existing.freightEscrowStatus)) {
      throw new Error('Cannot reset a freight quote after Freight Escrow is already locked.');
    }
    if (activeUser?.role && activeUser.role !== 'admin') {
      throw new Error('Freight quotes are competitively ranked automatically for the Buyer.');
    }

    const { data, error } = await supabase
      .from('deliveries')
      .update({
        status: 'transport_requested',
        transporter_id: null,
        transporter_name: null,
        freight_amount: null,
        freight_quotes: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('Error declining transport price:', error);
      throw error;
    }
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error in declineTransportPrice:', err);
    throw err;
  }
}

/**
 * Legacy direct accept helper redirected to competitive quote submission
 * Prevents transporters from bypassing the 30-Minute RFQ & Buyer Combined Escrow lock via DevTools
 */
export async function acceptDelivery(deliveryId, transporterInfo = {}) {
  if (transporterInfo?.freightAmount && Number(transporterInfo.freightAmount) > 0) {
    return submitTransportQuote(deliveryId, transporterInfo);
  }
  throw new Error(
    'Direct job assignment without a freight quote and Buyer Escrow payment is disabled. Please submit a competitive freight quote.'
  );
}

/**
 * Confirm pickup with OTP
 */
export async function confirmPickup(deliveryId) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        status: 'in_transit',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error confirming pickup:', err);
    throw err;
  }
}

/**
 * Fetch secret handover PINs securely (Masked from Transporters by Database RPC)
 * Returns delivery_otp only for the verified Buyer or Admin.
 * Returns pickup_otp only for the verified Farmer or Admin.
 */
export async function getDeliverySecretPins(deliveryId) {
  try {
    if (!deliveryId) return null;
    const { data, error } = await supabase.rpc('get_delivery_secret_pins', {
      p_delivery_id: deliveryId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('getDeliverySecretPins note:', err);
    return null;
  }
}

/**
 * Transporter verifies recipient PIN before drop-off is marked delivered
 * Handled strictly via server-side SECURITY DEFINER atomic procedure.
 * Transporter NEVER has direct read access to delivery_otp in database.
 */
export async function confirmTransporterDropoffWithOtp(deliveryId, inputOtp) {
  try {
    const cleanPin = String(inputOtp || '').trim();
    if (!cleanPin || cleanPin.length < 4) {
      throw new Error('Please enter the 4-digit Delivery Handover PIN provided by the recipient buyer.');
    }

    // Call atomic database procedure that performs server-side hash/PIN comparison
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_transporter_delivery_dropoff_atomic', {
      p_delivery_id: deliveryId,
      p_input_otp: cleanPin,
    });

    if (rpcErr) {
      console.error('RPC verify_transporter_delivery_dropoff_atomic error:', rpcErr);
      throw new Error(rpcErr.message || 'Invalid Delivery Handover PIN. Please confirm the code with the recipient buyer.');
    }

    // Refresh updated delivery record
    const updated = await getDeliveryById(deliveryId);
    return updated || { id: deliveryId, status: 'delivered' };
  } catch (err) {
    console.error('Error in confirmTransporterDropoffWithOtp:', err);
    throw err;
  }
}

/**
 * Confirm physical buyer delivery receipt (Moves delivery to 'delivered' awaiting Admin Call Verification & Escrow Release)
 */
export async function confirmBuyerReceipt(deliveryId) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${deliveryId},delivery_number.eq.${deliveryId}`)
      .select()
      .single();

    if (error) {
      console.warn('Supabase delivery update note in confirmBuyerReceipt:', error);
    }

    // Auto-sync linked order in orders table to 'delivered' (escrow remains securely held until Admin Call Verification)
    try {
      const orderIdentifier = data?.order_id || data?.order_number || deliveryId;
      if (orderIdentifier) {
        await supabase
          .from('orders')
          .update({
            status: 'delivered',
            admin_verification_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${orderIdentifier},order_number.eq.${orderIdentifier}`);
      }
    } catch (orderSyncErr) {
      console.warn('Linked order auto-sync notice:', orderSyncErr);
    }

    return data ? mapDeliveryFromDb(data) : { id: deliveryId, status: 'delivered' };
  } catch (err) {
    console.error('Error confirming delivery:', err);
    throw err;
  }
}

/**
 * Get aggregated transporter stats
 */
export async function getTransporterStats(transporterId) {
  try {
    const all = await getDeliveries();
    const availableJobs = all.filter(
      (d) =>
        (d.status === 'transport_requested' || d.status === 'price_offered') &&
        d.freightEscrowStatus !== 'locked' &&
        d.freightEscrowStatus !== 'escrow_locked' &&
        d.freightEscrowStatus !== 'released'
    );
    const myDeliveries = all.filter((d) => d.transporterId === transporterId);
    const activeDeliveries = myDeliveries.filter((d) => d.status === 'assigned' || d.status === 'in_transit');
    const completedTrips = myDeliveries.filter((d) => d.status === 'delivered' || d.status === 'completed');
    const totalTonnes = completedTrips.reduce((sum, d) => sum + (Number(d.quantity) || 0) / 1000, 0);

    return {
      availableJobs: availableJobs.length,
      activeDeliveries: activeDeliveries.length,
      completedTrips: completedTrips.length,
      totalTonnes: Number(totalTonnes.toFixed(1)),
    };
  } catch (err) {
    console.error('Error in getTransporterStats:', err);
    return {
      availableJobs: 0,
      activeDeliveries: 0,
      completedTrips: 0,
      totalTonnes: 0,
    };
  }
}

/**
 * Get delivery linked to an order
 */
export async function getDeliveryForOrder(orderNumberOrId) {
  try {
    if (!orderNumberOrId) return null;
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .or(`order_id.eq.${orderNumberOrId},order_number.eq.${orderNumberOrId}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return mapDeliveryFromDb(data[0]);
  } catch {
    return null;
  }
}

export const acceptDeliveryJob = acceptDelivery;

/**
 * Update delivery status and automatically synchronize linked order status
 */
export async function updateDeliveryStatus(deliveryId, newStatus) {
  try {
    const updatePayload = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('deliveries')
      .update(updatePayload)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating delivery status in Supabase:', error);
      throw error;
    }

    // Auto-sync with linked order
    try {
      const orderIdentifier = data.order_id || data.order_number;
      if (orderIdentifier) {
        let nextOrderStatus = null;
        if (newStatus === 'picked_up' || newStatus === 'in_transit' || newStatus === 'dispatched') {
          nextOrderStatus = 'in_transit';
        } else if (newStatus === 'delivered') {
          nextOrderStatus = 'delivered';
        } else if (newStatus === 'completed') {
          nextOrderStatus = 'completed';
        }

        if (nextOrderStatus) {
          await supabase
            .from('orders')
            .update({
              status: nextOrderStatus,
              updated_at: new Date().toISOString(),
            })
            .or(`id.eq.${orderIdentifier},order_number.eq.${orderIdentifier}`);
        }
      }
    } catch (orderSyncErr) {
      console.warn('Linked order auto-sync notice:', orderSyncErr);
    }

    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error updating delivery status:', err);
    throw err;
  }
}

/**
 * Get delivery by ID
 */
export async function getDeliveryById(deliveryId) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !data) return null;
    return mapDeliveryFromDb(data);
  } catch {
    return null;
  }
}

export { initiateRazorpayTransportCheckout } from './razorpayRouteClient';

// Setup Supabase Realtime Subscription for Deliveries Table
if (typeof window !== 'undefined') {
  try {
    supabase
      .channel('public:deliveries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        (payload) => {
          if (payload.new) {
            const mapped = mapDeliveryFromDb(payload.new);
            broadcastDataChange('deliveries', payload.eventType || 'UPDATE', mapped);
            window.dispatchEvent(new CustomEvent('agrolnk_deliveries_updated', { detail: mapped }));
            window.dispatchEvent(new CustomEvent('agrolnk_delivery_updated', { detail: mapped }));
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.info('Supabase Realtime for deliveries initialized');
  }
}
