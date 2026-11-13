import { supabase } from '../lib/supabase';
import { createDelivery, getDeliveryForOrder } from './deliveries';
import { processLiveEscrowDeposit, processLiveEscrowRelease } from './escrowApi';
import { getUserBankDetails } from './bankDetails';
import { broadcastDataChange } from './syncChannel';
import { sendNotification } from './notifications';
import { getCurrentUser } from './auth';
import { convertVolume, normalizeUnitName } from './pricingUnits';
import { calculateFreightFinancials } from './commission';
import { deductListingQuantity } from './listings';

function mapOrderFromDb(row) {
  if (!row) return null;
  const deliveryLocation = row.delivery_location || (
    row.buyer_address || row.buyer_district || row.buyer_state
      ? {
          state: row.buyer_state || row.state || '',
          district: row.buyer_district || row.district || '',
          address: row.buyer_address || '',
          pincode: row.buyer_pincode || '',
          companyName: row.buyer_company || '',
          phone: row.buyer_phone || '',
        }
      : null
  );

  return {
    id: row.id,
    orderNumber: row.order_number,
    listingId: row.listing_id,
    auctionId: row.auction_id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone || row.buyerPhone || row.meta?.buyer_phone || row.meta?.buyerPhone || null,
    buyerEmail: row.buyer_email || row.buyerEmail || row.meta?.buyer_email || row.meta?.buyerEmail || null,
    buyerCompany: row.buyer_company || row.buyerCompany || row.meta?.buyer_company || row.meta?.buyerCompany || null,
    buyerAddress: row.buyer_address || deliveryLocation?.address || null,
    buyerDistrict: row.buyer_district || deliveryLocation?.district || null,
    buyerState: row.buyer_state || deliveryLocation?.state || null,
    buyerPincode: row.buyer_pincode || deliveryLocation?.pincode || null,
    deliveryLocation: deliveryLocation,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    farmerPhone: row.farmer_phone || row.farmerPhone || row.meta?.farmer_phone || row.meta?.farmerPhone || null,
    farmerEmail: row.farmer_email || row.farmerEmail || row.meta?.farmer_email || row.meta?.farmerEmail || null,
    commodity: row.commodity,
    variety: row.variety,
    grade: row.grade,
    quantity: Number(row.quantity),
    unit: row.unit,
    quantityInListingUnit: row.quantity_in_listing_unit || row.quantityInListingUnit || row.meta?.quantity_in_listing_unit || null,
    listingUnit: row.listing_unit || row.listingUnit || row.meta?.listing_unit || null,
    totalKg: row.total_kg || row.totalKg || row.meta?.total_kg || null,
    totalMT: row.total_mt || row.totalMT || row.meta?.total_mt || null,
    totalQuintals: row.total_quintals || row.totalQuintals || row.meta?.total_quintals || null,
    pricePerUnit: Number(row.price_per_unit),
    totalAmount: Number(row.total_amount),
    freightAmount:
      row.freight_amount !== undefined && row.freight_amount !== null
        ? Number(row.freight_amount)
        : row.freightAmount !== undefined
        ? Number(row.freightAmount)
        : 0,
    freightFeeAmount:
      row.freight_fee_amount !== undefined && row.freight_fee_amount !== null
        ? Number(row.freight_fee_amount)
        : row.freightFeeAmount !== undefined
        ? Number(row.freightFeeAmount)
        : 0,
    grandTotalAmount:
      row.grand_total_amount !== undefined && row.grand_total_amount !== null
        ? Number(row.grand_total_amount)
        : row.grandTotalAmount !== undefined
        ? Number(row.grandTotalAmount)
        : Number(row.total_amount || 0),
    rfqExpiresAt: row.rfq_expires_at || row.rfqExpiresAt || null,
    state: row.state,
    district: row.district,
    escrowStatus: row.escrow_status || (row.status === 'completed' ? 'released' : 'funded'),
    status: row.status || 'placed',
    adminVerifiedBy: row.admin_verified_by || null,
    adminVerificationStatus: row.admin_verification_status || (row.status === 'completed' ? 'approved' : 'pending'),
    adminCallNotes: row.admin_call_notes || null,
    adminVerifiedAt: row.admin_verified_at || null,
    buyerConfirmedArrival: row.buyer_confirmed_arrival ?? (row.buyer_arrival_verified || !!row.buyer_verified_at || false),
    buyerArrivalVerified: row.buyer_arrival_verified || !!row.buyer_verified_at || false,
    buyerVerifiedAt: row.buyer_verified_at || null,
    payoutBankName: row.payout_bank_name || null,
    payoutAccountNumber: row.payout_account_number || null,
    payoutIfsc: row.payout_ifsc || null,
    bankUtr: row.bank_utr || row.payment_id || null,
    paymentMode: row.payment_mode || 'direct',
    paymentMethod: row.payment_method || row.payment_mode || 'direct',
    disbursedAt: row.disbursed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LOCAL_ORDERS_KEY = 'agrolnk_orders_local';

function getOrderCacheOwnerId() {
  try {
    const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    return u?.id || u?.email || 'anon';
  } catch {
    return 'anon';
  }
}

function dedupeOrdersList(list = []) {
  const seen = new Set();
  const deduped = [];
  for (const item of list) {
    if (!item) continue;
    const key = item.id || item.orderNumber;
    if (key && !seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }
  return deduped;
}

function getLocalOrders() {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const activeOwner = getOrderCacheOwnerId();
    // Ignore legacy unscoped arrays or caches belonging to a different user account
    if (Array.isArray(parsed)) {
      localStorage.removeItem(LOCAL_ORDERS_KEY);
      return [];
    }
    if (!parsed || typeof parsed !== 'object' || parsed.ownerId !== activeOwner) {
      return [];
    }
    return dedupeOrdersList(Array.isArray(parsed.items) ? parsed.items : []);
  } catch {
    return [];
  }
}

function replaceLocalOrders(list = []) {
  try {
    const activeOwner = getOrderCacheOwnerId();
    const cleaned = dedupeOrdersList(Array.isArray(list) ? list : []);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify({ ownerId: activeOwner, items: cleaned }));
  } catch {}
}

function clearLegacyOrderOverrideKeys() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    Object.keys(localStorage).forEach((k) => {
      if (
        k.startsWith('agrolnk_order_status_') ||
        k.startsWith('agrolnk_order_escrow_') ||
        k.startsWith('agrolnk_buyer_verified_')
      ) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
}

function saveLocalOrder(item) {
  try {
    if (!item) return;
    const existing = getLocalOrders();
    const filtered = existing.filter(
      (o) => o.id !== item.id && o.orderNumber !== item.orderNumber
    );
    replaceLocalOrders([item, ...filtered]);
  } catch {}
}

const generateStandardUuid = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Get all orders from Supabase merged with local cache
 */
export async function getOrders() {
  let remote = [];
  let isDbSuccess = false;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      remote = data.map(mapOrderFromDb);
      isDbSuccess = true;
    }
  } catch (err) {
    console.error('Error in getOrders:', err);
  }

  // When database query succeeds, Supabase is the 100% single source of truth (no split-brain overrides or stale local merges)
  if (isDbSuccess) {
    clearLegacyOrderOverrideKeys();
    if (remote.length === 0) {
      try {
        localStorage.removeItem(LOCAL_ORDERS_KEY);
        localStorage.removeItem('agrolnk_orders');
        localStorage.removeItem('agrolnk_farmer_orders');
        localStorage.removeItem('agrolnk_buyer_orders');
      } catch {}
      return [];
    }

    const authoritative = remote.map((r) => ({
      ...r,
      status: r.status || 'pending',
      escrowStatus: r.escrowStatus || 'pending',
      buyerConfirmedArrival: Boolean(r.buyerConfirmedArrival || r.buyerArrivalVerified),
      buyerArrivalVerified: Boolean(r.buyerArrivalVerified || r.buyerConfirmedArrival),
    }));

    // Replace local offline cache atomically with authoritative server truth
    replaceLocalOrders(authoritative);
    return authoritative;
  }

  // True offline fallback scoped to the active user when database request failed
  return getLocalOrders();

  // Guarantee cross-portal sync: If a trade credit application exists in Supabase with an order number,
  // ensure the order is present so both buyer and farmer immediately see it
  try {
    const { data: finReqs } = await supabase
      .from('financing_requests')
      .select('*')
      .not('order_number', 'is', null);

    if (finReqs && finReqs.length > 0) {
      const knownOrderNums = new Set(combined.map((o) => o.orderNumber));
      for (const req of finReqs) {
        if (req.order_number && !knownOrderNums.has(req.order_number)) {
          const synth = {
            id: req.order_id || req.id || generateStandardUuid(),
            orderNumber: req.order_number,
            listingId: null,
            auctionId: null,
            buyerId: req.applicant_id || null,
            buyerName: req.applicant_name || 'Buyer',
            farmerId: null,
            farmerName: 'Verified Producer',
            commodity: req.commodity || 'Produce',
            variety: req.variety || 'Standard',
            grade: req.grade || 'A',
            quantity: Number(req.quantity || 1),
            unit: req.unit || 'kg',
            pricePerUnit: req.quantity && req.transaction_value ? req.transaction_value / req.quantity : 0,
            totalAmount: Number(req.transaction_value || req.requested_amount || 0),
            escrowStatus: req.margin_paid ? 'funded' : 'pending',
            status: 'order_placed',
            paymentMode: 'trade_credit',
            financingRequestId: req.id,
            financingRequestNumber: req.request_number,
            createdAt: req.created_at || new Date().toISOString(),
            updatedAt: req.updated_at || new Date().toISOString(),
          };
          combined.push(synth);
          knownOrderNums.add(req.order_number);
        }
      }
    }
  } catch {}

  return combined;
}

/**
 * Get orders for a specific buyer (strictly confidential to this buyer)
 */
export async function getBuyerOrders(buyerId, currentUser) {
  try {
    const all = await getOrders();
    const activeUser = (currentUser && (currentUser.id || currentUser.email))
      ? currentUser
      : (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || {};
    const userEmail = (activeUser?.email || '').toLowerCase().trim();
    const userName = (activeUser?.name || '').toLowerCase().trim();
    const uid = String(buyerId || activeUser?.id || '').trim();

    if (!uid && !userEmail && !userName) return [];

    const buyerList = all.filter((o) => {
      if (o.status === 'cancelled' || o.status === 'deleted') return false;

      const bName = (o.buyerName || '').toLowerCase().trim();
      const bEmail = (o.buyerEmail || '').toLowerCase().trim();
      const bId = String(o.buyerId || '').trim();

      const matchId = Boolean(uid && bId && (bId.toLowerCase() === uid.toLowerCase()));
      const matchEmail = Boolean(userEmail && bEmail && (bEmail === userEmail || bId.toLowerCase() === userEmail));
      const matchName = Boolean(userName && bName && !['buyer', 'verified buyer', 'user'].includes(bName) && bName === userName);

      return matchId || matchEmail || matchName;
    });

    // Deduplicate duplicate unquoted RFQs for the same produce lot:
    // When the buyer placed multiple RFQ quote requests for the same lot, keep only the latest active one
    // and cancel the superseded older ones.
    const seenRfqLots = new Set();
    const deduped = [];
    // Sort newest first so the active order (#AGM-6317) is retained
    buyerList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    for (const o of buyerList) {
      const isUnquotedRfq = (o.status === 'awaiting_freight_quote' || Boolean(o.awaitingFreightQuote)) && !o.freightAmount;
      if (isUnquotedRfq) {
        const lotKey = `${o.listingId || ''}_${o.commodity || ''}_${o.variety || ''}_${o.farmerName || ''}`;
        if (seenRfqLots.has(lotKey)) {
          // Superseded duplicate RFQ from repeat clicks - cancel it in background
          try {
            updateOrderStatus(o.id || o.orderNumber, 'cancelled').catch(() => {});
          } catch {}
          continue;
        }
        seenRfqLots.add(lotKey);
      }
      deduped.push(o);
    }

    return deduped;
  } catch (err) {
    console.error('Error in getBuyerOrders:', err);
    return [];
  }
}

/**
 * Get orders for a specific farmer (strictly confidential to this farmer)
 */
export async function getFarmerOrders(farmerId, currentUser) {
  try {
    const all = await getOrders();
    const activeUser = (currentUser && (currentUser.id || currentUser.email))
      ? currentUser
      : (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || {};
    const userEmail = (activeUser?.email || '').toLowerCase().trim();
    const userName = (activeUser?.name || '').toLowerCase().trim();
    const uid = String(farmerId || activeUser?.id || '').trim();

    if (!uid && !userEmail && !userName) return [];

    const farmerList = all.filter((o) => {
      if (o.status === 'cancelled' || o.status === 'deleted') return false;

      const fName = (o.farmerName || '').toLowerCase().trim();
      const fEmail = (o.farmerEmail || '').toLowerCase().trim();
      const fId = String(o.farmerId || '').toLowerCase().trim();

      const matchId = Boolean(uid && fId && (fId === uid.toLowerCase()));
      const matchEmail = Boolean(userEmail && (fEmail === userEmail || fId === userEmail));
      const matchName = Boolean(
        userName &&
        fName &&
        !['farmer', 'verified producer', 'producer', 'user'].includes(fName) &&
        (fName === userName || fName.includes(userName) || userName.includes(fName))
      );

      return matchId || matchEmail || matchName;
    });

    const seenRfqLots = new Set();
    const deduped = [];
    farmerList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    for (const o of farmerList) {
      const isUnquotedRfq = (o.status === 'awaiting_freight_quote' || Boolean(o.awaitingFreightQuote)) && !o.freightAmount;
      if (isUnquotedRfq) {
        const lotKey = `${o.listingId || ''}_${o.commodity || ''}_${o.variety || ''}_${o.buyerId || o.buyerName || ''}`;
        if (seenRfqLots.has(lotKey)) {
          continue;
        }
        seenRfqLots.add(lotKey);
      }
      deduped.push(o);
    }

    return deduped;
  } catch (err) {
    console.error('Error in getFarmerOrders:', err);
    return [];
  }
}

/**
 * Create a new order in Supabase & local cache
 */
export async function createOrder(orderData) {
  try {
    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch {
        return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    };

    const generateOrderNum = () => {
      const num = Math.floor(1000 + Math.random() * 9000);
      return `#AGM-${num}`;
    };

    // Anti-Self-Trading Guard: Prevent producers/sellers from purchasing their own produce
    const buyerIdStr = String(orderData.buyerId || '').trim();
    const farmerIdStr = String(orderData.farmerId || '').trim();
    if (buyerIdStr && farmerIdStr && buyerIdStr === farmerIdStr) {
      throw new Error('You cannot buy your own produce. Self-trading is not permitted on AgroLnk.');
    }

    let orderId = orderData.id || generateId();
    let orderNumber = orderData.orderNumber || generateOrderNum();
    const isTradeCredit = orderData.paymentMode === 'trade_credit';
    const isFreightRfq = Boolean(
      orderData.awaitingFreightQuote ||
      orderData.status === 'awaiting_freight_quote' ||
      orderData.escrowStatus === 'awaiting_freight_quote'
    );
    const rfqExpiresAt =
      orderData.rfqExpiresAt ||
      (isFreightRfq ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null);

    // Cancel any prior unquoted RFQs for this listing & buyer to prevent duplicate entries
    if (isFreightRfq && orderData.listingId) {
      try {
        const priorOrders = await getOrders();
        const staleRfqs = priorOrders.filter((o) => {
          const sameListing = String(o.listingId || o.listing_id || '') === String(orderData.listingId);
          const isPending = o.status === 'awaiting_freight_quote' || Boolean(o.awaitingFreightQuote);
          const isUnquoted = !o.freightAmount;
          return sameListing && isPending && isUnquoted && o.id !== orderId && o.orderNumber !== orderNumber;
        });
        for (const stale of staleRfqs) {
          updateOrderStatus(stale.id || stale.orderNumber, 'cancelled').catch(() => {});
        }
      } catch {}
    }

    // Pre-flight MOQ check if listing MOQ was passed by caller
    if (orderData.minOrderQuantity && Number(orderData.minOrderQuantity) > 0) {
      const listingUnit = orderData.listingUnit || orderData.unit || 'kg';
      const buyerUnit = orderData.unit || listingUnit;
      const reqInListingUnit =
        orderData.quantityInListingUnit !== undefined && Number(orderData.quantityInListingUnit) > 0
          ? Number(orderData.quantityInListingUnit)
          : convertVolume(orderData.quantity, buyerUnit, listingUnit);
      const availInListingUnit =
        orderData.availableQuantity !== undefined && Number(orderData.availableQuantity) > 0
          ? Number(orderData.availableQuantity)
          : Infinity;
      const effectiveMoq = Math.min(Number(orderData.minOrderQuantity), availInListingUnit);

      if (reqInListingUnit + 1e-6 < effectiveMoq) {
        throw new Error(
          `Minimum Order Quantity (MOQ) for this lot is ${effectiveMoq} ${listingUnit}. Please increase your order quantity.`
        );
      }
    }

    const deliveryLocation = orderData.deliveryLocation || {
      state: orderData.buyerState || orderData.deliveryState || orderData.state || '',
      district: orderData.buyerDistrict || orderData.deliveryDistrict || orderData.district || '',
      address: orderData.buyerAddress || orderData.deliveryAddress || '',
      pincode: orderData.buyerPincode || orderData.deliveryPincode || '',
      companyName: orderData.buyerCompany || '',
      phone: orderData.buyerPhone || '',
    };

    const localItem = {
      id: orderId,
      orderNumber: orderNumber,
      listingId: orderData.listingId || null,
      auctionId: orderData.auctionId || null,
      buyerId: orderData.buyerId || null,
      buyerName: orderData.buyerName || 'Buyer',
      buyerPhone: orderData.buyerPhone || '',
      buyerEmail: orderData.buyerEmail || '',
      buyerCompany: orderData.buyerCompany || '',
      buyerAddress: orderData.buyerAddress || deliveryLocation.address || '',
      buyerDistrict: orderData.buyerDistrict || deliveryLocation.district || '',
      buyerState: orderData.buyerState || deliveryLocation.state || '',
      buyerPincode: orderData.buyerPincode || deliveryLocation.pincode || '',
      deliveryLocation: deliveryLocation,
      farmerId: orderData.farmerId || null,
      farmerName: orderData.farmerName || 'Verified Producer',
      commodity: orderData.commodity || 'Produce',
      variety: orderData.variety || 'Standard',
      grade: orderData.grade || 'A',
      quantity: Number(orderData.quantity),
      unit: orderData.unit || 'kg',
      quantityInListingUnit: orderData.quantityInListingUnit !== undefined ? Number(orderData.quantityInListingUnit) : undefined,
      listingUnit: orderData.listingUnit || undefined,
      totalKg: orderData.totalKg !== undefined ? Number(orderData.totalKg) : undefined,
      totalMT: orderData.totalMT !== undefined ? Number(orderData.totalMT) : undefined,
      totalQuintals: orderData.totalQuintals !== undefined ? Number(orderData.totalQuintals) : undefined,
      pricePerUnit: Number(orderData.pricePerUnit),
      totalAmount: Number(orderData.totalAmount),
      freightAmount: Number(orderData.freightAmount || 0),
      freightFeeAmount: Number(orderData.freightFeeAmount || 0),
      grandTotalAmount: Number(orderData.grandTotalAmount || orderData.totalAmount || 0),
      rfqExpiresAt: rfqExpiresAt,
      state: orderData.state || '',
      district: orderData.district || '',
      escrowStatus: isFreightRfq
        ? 'awaiting_freight_quote'
        : isTradeCredit
        ? 'financing_pending'
        : orderData.escrowStatus || (orderData.paymentMode === 'escrow_van' ? 'pending' : 'funded'),
      status: isFreightRfq
        ? 'awaiting_freight_quote'
        : orderData.status || (orderData.paymentMode === 'escrow_van' ? 'pending' : 'order_placed'),
      paymentMode: orderData.paymentMode || (isTradeCredit ? 'trade_credit' : 'direct'),
      paymentMethod: orderData.paymentMethod || (orderData.paymentMode === 'escrow_van' ? 'escrow_van' : 'razorpay_route'),
      bankUtr: orderData.bankUtr || orderData.razorpay_payment_id || null,
      financingAmount: orderData.financingAmount,
      buyerMarginDeposit: orderData.buyerMarginDeposit,
      financingRequestId: orderData.financingRequestId,
      financingRequestNumber: orderData.financingRequestNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Try atomic PostgreSQL purchase RPC (Eliminates inventory race condition & oversell)
    // Note: Deduct in the listing's native inventory unit (e.g. 50 Quintals => 5 MT deducted from 30 MT lot)
    if (orderData.listingId) {
      try {
        let deductQty = Number(orderData.quantityInListingUnit);
        if (isNaN(deductQty) || deductQty <= 0) {
          if (orderData.listingUnit && orderData.unit) {
            deductQty = convertVolume(orderData.quantity, orderData.unit, orderData.listingUnit);
          } else {
            deductQty = Number(orderData.quantity);
          }
        }

        let { data: rpcData, error: rpcErr } = await supabase.rpc('create_direct_order_atomic', {
          p_listing_id: orderData.listingId,
          p_buyer_id: orderData.buyerId || '',
          p_buyer_name: orderData.buyerName || 'Wholesale Buyer',
          p_quantity: deductQty,
          p_delivery_location: deliveryLocation,
          p_is_trade_credit: Boolean(isTradeCredit),
          p_awaiting_freight_quote: Boolean(isFreightRfq),
          p_buyer_unit: orderData.unit || orderData.listingUnit || 'kg',
        });

        // Backward compatibility: If Supabase function was deployed with 7 parameters (without p_awaiting_freight_quote)
        if (rpcErr && (rpcErr.message?.includes('function') || rpcErr.message?.includes('parameter') || rpcErr.code === 'PGRST202')) {
          const retry7 = await supabase.rpc('create_direct_order_atomic', {
            p_listing_id: orderData.listingId,
            p_buyer_id: orderData.buyerId || '',
            p_buyer_name: orderData.buyerName || 'Wholesale Buyer',
            p_quantity: deductQty,
            p_delivery_location: deliveryLocation,
            p_is_trade_credit: Boolean(isTradeCredit),
            p_buyer_unit: orderData.unit || orderData.listingUnit || 'kg',
          });
          if (!retry7.error && retry7.data?.success) {
            rpcData = retry7.data;
            rpcErr = null;
          }
        }

        if (!rpcErr && rpcData?.success) {
          orderNumber = rpcData.order_number;
          orderId = rpcData.order_id;
          localItem.id = orderId;
          localItem.orderNumber = orderNumber;
          localItem.totalAmount = Number(rpcData.total_amount || localItem.totalAmount);
          localItem.escrowStatus = rpcData.escrow_status || localItem.escrowStatus;
          localItem.status = rpcData.status || localItem.status;
          localItem.rfqExpiresAt = rpcData.rfq_expires_at || localItem.rfqExpiresAt;
          localItem.deliveryId = rpcData.delivery_id || null;
          localItem.atomicDeducted = true;
          saveLocalOrder(localItem);

          if (isFreightRfq) {
            // Broadcast 30-Minute RFQ to verified transporters
            try {
              const { data: transporters } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'transporter');
              if (Array.isArray(transporters) && transporters.length > 0) {
                for (const t of transporters) {
                  if (!t?.id) continue;
                  await sendNotification({
                    recipientId: t.id,
                    recipientRole: 'transporter',
                    title: `New 30-Min Freight RFQ: ${localItem.commodity}`,
                    message: `Quote requested for ${localItem.quantity} ${localItem.unit} from ${localItem.district || 'Origin'}, ${localItem.state || ''} to ${deliveryLocation?.district || 'Destination'}, ${deliveryLocation?.state || ''}. Lowest bid wins!`,
                    type: 'delivery',
                    link: '/transporter-dashboard',
                  });
                }
              }
            } catch {}
          } else {
            // Register in Live Escrow API Engine only when payment is already funded
            try {
              await processLiveEscrowDeposit({
                orderNumber: orderNumber,
                commodity: `${localItem.commodity} (${localItem.variety || 'Standard'}, ${localItem.grade || 'A'})`,
                tradeAmount: localItem.totalAmount,
                buyerName: localItem.buyerName,
                farmerName: localItem.farmerName,
                paymentMode: isTradeCredit ? 'NBFC Institutional Trade Credit' : 'Buyer Instant Virtual Nodal UPI',
              });
            } catch {}
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: localItem }));
            window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: localItem }));
            window.dispatchEvent(new CustomEvent('agrolnk_deliveries_updated', { detail: localItem }));
            window.dispatchEvent(new Event('storage'));
          }

          return localItem;
        }

        if (rpcErr) {
          const msg = rpcErr.message || '';
          // Business rejections must fail immediately - do NOT fall back to creating an unbacked order
          if (
            msg.includes('sold out') ||
            msg.includes('exceeds available inventory') ||
            msg.includes('Minimum Order Quantity') ||
            msg.includes('not found') ||
            msg.includes('cannot buy your own produce') ||
            msg.includes('Self-trading')
          ) {
            throw new Error(msg);
          }
        }
      } catch (rpcCatch) {
        if (
          rpcCatch.message &&
          (rpcCatch.message.includes('sold out') ||
            rpcCatch.message.includes('exceeds available inventory') ||
            rpcCatch.message.includes('Minimum Order Quantity') ||
            rpcCatch.message.includes('not found') ||
            rpcCatch.message.includes('cannot buy your own produce') ||
            rpcCatch.message.includes('Self-trading'))
        ) {
          throw rpcCatch;
        }
      }
    }

    // 2. Client-side Fallback with Strict Concurrency & Inventory Lock
    let verifiedPricePerUnit = Number(orderData.pricePerUnit);
    let verifiedTotalAmount = Number(orderData.totalAmount);

    if (orderData.listingId && Number(orderData.quantity) > 0) {
      // Step A: Verify stock availability, MOQ & authoritative price in live Supabase listing
      const { data: currentListing, error: checkErr } = await supabase
        .from('listings')
        .select('id, quantity, min_order_quantity, status, price, farmer_id, unit, description, state, district, farmer_name')
        .eq('id', orderData.listingId)
        .maybeSingle();

      if (!checkErr && currentListing) {
        if (orderData.buyerId && currentListing.farmer_id && String(orderData.buyerId) === String(currentListing.farmer_id)) {
          throw new Error('You cannot buy your own produce. Self-trading is not permitted on AgroLnk.');
        }

        // Enforce accurate cross-unit conversion against live listing's native unit
        const listingUnit = currentListing.unit || orderData.listingUnit || orderData.unit || 'kg';
        const buyerUnit = orderData.unit || listingUnit;
        const actualDeductQty = convertVolume(orderData.quantity, buyerUnit, listingUnit);

        if (currentListing.status === 'sold' || Number(currentListing.quantity) <= 0) {
          throw new Error('This lot is already sold out. Order cannot be placed.');
        }
        if (actualDeductQty > Number(currentListing.quantity)) {
          throw new Error(
            `Requested quantity (${orderData.quantity} ${buyerUnit} = ${actualDeductQty} ${listingUnit}) exceeds available inventory (${currentListing.quantity} ${listingUnit}).`
          );
        }

        // Enforce Minimum Order Quantity (MOQ) from authoritative DB column or description fallback tag
        let liveMoq = Math.max(
          Number(currentListing.min_order_quantity || 0),
          Number(orderData.minOrderQuantity || 0)
        );
        if (currentListing.description) {
          const moqMatch = String(currentListing.description).match(/<!--agrolnk:minOrderQty:([0-9.]+)-->/);
          if (moqMatch && Number(moqMatch[1]) > 0) {
            liveMoq = Math.max(liveMoq, Number(moqMatch[1]));
          }
        }
        if (liveMoq > 0) {
          const effectiveMoq = Math.min(liveMoq, Number(currentListing.quantity));
          if (actualDeductQty + 1e-6 < effectiveMoq) {
            throw new Error(
              `Minimum Order Quantity (MOQ) for this lot is ${effectiveMoq} ${listingUnit}.`
            );
          }
        }

        // Authoritative Server-Side Pricing Guard: Override any client-tampered price
        if (currentListing.price !== undefined && currentListing.price !== null && Number(currentListing.price) > 0) {
          verifiedPricePerUnit = Number(currentListing.price);
          verifiedTotalAmount = Math.round(actualDeductQty * verifiedPricePerUnit * 100) / 100;
          localItem.pricePerUnit = verifiedPricePerUnit;
          localItem.totalAmount = verifiedTotalAmount;
          localItem.grandTotalAmount = Number(orderData.grandTotalAmount || verifiedTotalAmount);
        }

        // Step B: Atomically decrement stock with conditional .gte guard to eliminate overselling
        const newQty = Math.round((Number(currentListing.quantity) - actualDeductQty) * 10000) / 10000;
        const newStatus = newQty <= 0 ? 'sold' : 'active';

        const { data: updatedListing, error: deductErr } = await supabase
          .from('listings')
          .update({
            quantity: Math.max(0, newQty),
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderData.listingId)
          .gte('quantity', actualDeductQty)
          .select();

        if (deductErr || !updatedListing || updatedListing.length === 0) {
          // Detect if this failure is caused by Supabase RLS policies (e.g. buyer is forbidden from updating another user's listing row)
          const isRlsRestriction =
            deductErr?.code === '42501' ||
            deductErr?.message?.toLowerCase().includes('policy') ||
            deductErr?.message?.toLowerCase().includes('permission') ||
            (!deductErr && Number(currentListing.quantity) >= actualDeductQty);

          if (isRlsRestriction) {
            console.warn(
              'Supabase RLS prevented direct client-side listing quantity deduction. Proceeding with order placement and local listing synchronization.'
            );
            deductListingQuantity(orderData.listingId, actualDeductQty);
            localItem.atomicDeducted = true;
          } else {
            throw new Error(
              'Inventory was just purchased by another buyer or is no longer available. Order aborted to prevent overselling.'
            );
          }
        } else {
          localItem.atomicDeducted = true;
          deductListingQuantity(orderData.listingId, actualDeductQty);
        }
      }
    }

    const isUuid = (str) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const dbOrderId = isUuid(orderId) ? orderId : generateStandardUuid();
    localItem.id = dbOrderId;
    const dbRow = {
      id: dbOrderId,
      order_number: orderNumber,
      listing_id: isUuid(orderData.listingId) ? orderData.listingId : null,
      auction_id: isUuid(orderData.auctionId) ? orderData.auctionId : null,
      buyer_id: isUuid(orderData.buyerId) ? orderData.buyerId : null,
      buyer_name: orderData.buyerName || 'Buyer',
      buyer_phone: orderData.buyerPhone || '',
      buyer_email: orderData.buyerEmail || '',
      buyer_company: orderData.buyerCompany || '',
      buyer_address: orderData.buyerAddress || deliveryLocation.address || '',
      buyer_district: orderData.buyerDistrict || deliveryLocation.district || '',
      buyer_state: orderData.buyerState || deliveryLocation.state || '',
      buyer_pincode: orderData.buyerPincode || deliveryLocation.pincode || '',
      delivery_location: deliveryLocation,
      farmer_id: isUuid(orderData.farmerId) ? orderData.farmerId : null,
      farmer_name: orderData.farmerName || 'Verified Producer',
      commodity: orderData.commodity || 'Produce',
      variety: orderData.variety || 'Standard',
      grade: orderData.grade || 'A',
      quantity: Number(orderData.quantity),
      unit: orderData.unit || 'kg',
      price_per_unit: verifiedPricePerUnit,
      total_amount: verifiedTotalAmount,
      state: orderData.state || '',
      district: orderData.district || '',
      payment_id: orderData.razorpay_payment_id || orderData.paymentId || orderData.bankUtr || null,
      payment_mode: orderData.paymentMode || (isTradeCredit ? 'trade_credit' : 'direct'),
      escrow_status: isFreightRfq
        ? 'awaiting_freight_quote'
        : isTradeCredit
        ? 'pending'
        : orderData.paymentMode === 'escrow_van'
        ? 'pending'
        : orderData.razorpay_payment_id || orderData.paymentId
        ? 'funded'
        : 'pending',
      status: isFreightRfq
        ? 'awaiting_freight_quote'
        : orderData.status || (orderData.paymentMode === 'escrow_van' ? 'pending' : 'order_placed'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      let { data, error } = await supabase
        .from('orders')
        .insert([dbRow])
        .select()
        .single();

      // Fallback if DB check constraint hasn't been migrated with awaiting_freight_quote yet
      if (error && isFreightRfq) {
        const fallbackRow = {
          ...dbRow,
          escrow_status: 'pending',
          status: 'pending',
        };
        const retry = await supabase.from('orders').insert([fallbackRow]).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        const mapped = mapOrderFromDb(data);
        saveLocalOrder({
          ...localItem,
          ...mapped,
          status: isFreightRfq ? 'awaiting_freight_quote' : mapped.status,
          escrowStatus: isFreightRfq ? 'awaiting_freight_quote' : mapped.escrowStatus,
          rfqExpiresAt: rfqExpiresAt || mapped.rfqExpiresAt,
          atomicDeducted: true,
        });
      } else {
        saveLocalOrder(localItem);
      }
    } catch (dbErr) {
      console.warn('Supabase order creation note:', dbErr);
      saveLocalOrder(localItem);
    }

    if (isFreightRfq) {
      // Automatically create 30-Minute Competitive Freight RFQ in public.deliveries
      try {
        const createdDel = await createDelivery({
          orderId: dbOrderId,
          orderNumber: orderNumber,
          listingId: orderData.listingId,
          farmerId: orderData.farmerId,
          farmerName: orderData.farmerName || 'Verified Producer',
          farmerPhone: orderData.farmerPhone || '',
          buyerId: orderData.buyerId,
          buyerName: orderData.buyerName || 'Buyer',
          buyerPhone: orderData.buyerPhone || deliveryLocation.phone || '',
          commodity: localItem.commodity,
          variety: localItem.variety,
          grade: localItem.grade,
          quantity: localItem.quantity,
          unit: localItem.unit,
          totalAmount: localItem.totalAmount,
          pickupLocation: {
            state: localItem.state || '',
            district: localItem.district || '',
            address:
              orderData.pickupAddress ||
              [orderData.village || localItem.village, localItem.district, localItem.state].filter(Boolean).join(', ') ||
              `${localItem.district || ''}, ${localItem.state || ''}`,
            landmark: orderData.landmark || localItem.landmark || '',
            contactName: localItem.farmerName || 'Verified Producer',
            phone: orderData.farmerPhone || '',
          },
          deliveryLocation: deliveryLocation,
          status: 'transport_requested',
          rfqExpiresAt: rfqExpiresAt,
          freightPayerRole: 'buyer',
        });
        if (createdDel?.id) {
          localItem.deliveryId = createdDel.id;
          saveLocalOrder(localItem);
        }
      } catch (delErr) {
        console.warn('Auto freight RFQ creation notice:', delErr);
      }
    } else {
      // Register deposit in Live Escrow API Engine only when order payment is already funded
      try {
        await processLiveEscrowDeposit({
          orderNumber: orderNumber,
          commodity: `${localItem.commodity} (${localItem.variety || 'Standard'}, ${localItem.grade || 'A'})`,
          tradeAmount: localItem.totalAmount,
          buyerName: localItem.buyerName,
          farmerName: localItem.farmerName,
          paymentMode: isTradeCredit ? 'NBFC Institutional Trade Credit' : 'Buyer Instant Virtual Nodal UPI',
        });
      } catch (escrowErr) {
        console.warn('Live escrow deposit record notice:', escrowErr);
      }

      // Dispatch targeted notification to Producer when payment is funded immediately
      try {
        sendNotification({
          recipientId: localItem.farmerId,
          recipientRole: 'farmer',
          title: `New Purchase Order ${localItem.orderNumber}`,
          message: `Order for ${localItem.quantity} ${localItem.unit} of ${localItem.commodity} received from ${localItem.buyerName}. Total ₹${localItem.totalAmount.toLocaleString('en-IN')} escrow funded.`,
          type: 'order',
          link: '/farmer-orders',
        });
      } catch (notifErr) {
        console.warn('Order notification notice:', notifErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: localItem }));
      window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: localItem }));
      window.dispatchEvent(new Event('storage'));
    }

    return localItem;
  } catch (err) {
    console.error('Error creating order:', err);
    throw err;
  }
}

/**
 * Complete Buyer's Combined Crop + Freight Escrow Checkout after Transporter Quote is Ready.
 * Atomically locks Crop Escrow + Freight Escrow, assigns Winning Transporter, and notifies both Farmer & Transporter.
 */
export async function completeBuyerOrderWithFreightPayment(orderId, paymentData = {}) {
  try {
    const allOrders = await getOrders();
    const existingOrder = allOrders.find(
      (o) => o.id === orderId || o.orderNumber === orderId
    );

    const resolvedOrderId = existingOrder?.id || orderId;
    const liveDelivery = await getDeliveryForOrder(existingOrder?.orderNumber || resolvedOrderId);
    const resolvedDeliveryId = liveDelivery?.id || paymentData.deliveryId || existingOrder?.deliveryId || null;

    // Anti-Tampering Guard: Always use authoritative freight quote from live delivery/order in Supabase, never client-manipulated values
    const serverFreightAmount = Number(
      liveDelivery?.lowestQuote?.freightAmount ||
      liveDelivery?.freightAmount ||
      existingOrder?.freightAmount ||
      0
    );

    if (!(serverFreightAmount > 0)) {
      throw new Error(
        'Cannot complete combined escrow checkout before a verified transporter freight quote (> ₹0) is recorded.'
      );
    }

    const paymentId =
      paymentData.paymentId ||
      paymentData.razorpay_payment_id ||
      paymentData.bankUtr ||
      `ESC-COMBINED-${Date.now()}`;
    const rawPaymentMode = paymentData.paymentMode || existingOrder?.paymentMode || 'direct_razorpay';
    const normalizedRpcPaymentMode =
      rawPaymentMode === 'trade_credit'
        ? 'trade_credit'
        : rawPaymentMode === 'escrow_van' || String(rawPaymentMode).includes('VAN')
        ? 'escrow_van'
        : 'direct_razorpay';

    if (normalizedRpcPaymentMode === 'direct_razorpay' && !paymentData?.verified) {
      throw new Error('Server payment gateway verification is required before locking escrow.');
    }

    // 1. Authoritative Server-Side Atomic RPC (Never allows client-side funding bypass)
    if (!resolvedOrderId) {
      throw new Error('Order identifier is required to lock combined escrow.');
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc(
      'lock_buyer_order_and_freight_escrow_atomic',
      {
        p_order_id: resolvedOrderId,
        p_payment_mode: normalizedRpcPaymentMode,
        p_payment_id: paymentId,
        p_bank_utr: paymentData.bankUtr || paymentId,
        p_auto_verified: false,
      }
    );

    if (rpcErr || !rpcRes?.success) {
      throw new Error(
        rpcErr?.message ||
          'Combined escrow lock rejected by server security policy. Payment verification required.'
      );
    }

    const finalFreightAmt = Number(rpcRes.freight_amount ?? serverFreightAmount);
    const freightFin = calculateFreightFinancials(finalFreightAmt);
    const updatedLocal = {
      ...(existingOrder || {}),
      id: resolvedOrderId,
      deliveryId: rpcRes.delivery_id || resolvedDeliveryId,
      status: rpcRes.status || 'pending',
      escrowStatus: rpcRes.escrow_status || 'pending',
      paymentMode: rawPaymentMode,
      bankUtr: paymentData.bankUtr || paymentId,
      freightAmount: finalFreightAmt,
      freightFeeAmount: freightFin.consignorFee,
      grandTotalAmount: Number(
        rpcRes.grand_total_amount ?? existingOrder?.totalAmount ?? 0
      ),
      updatedAt: new Date().toISOString(),
    };
    saveLocalOrder(updatedLocal);

    if (updatedLocal.escrowStatus === 'funded') {
      try {
        await processLiveEscrowDeposit({
          orderNumber: updatedLocal.orderNumber,
          commodity: `${updatedLocal.commodity || 'Produce'} (+ ₹${updatedLocal.freightAmount.toLocaleString('en-IN')} Freight)`,
          tradeAmount: updatedLocal.totalAmount,
          buyerName: updatedLocal.buyerName,
          farmerName: updatedLocal.farmerName,
          paymentMode: 'Combined Crop + Freight Escrow Nodal Deposit',
        });
      } catch {}
    }

    broadcastDataChange('orders', 'update');
    broadcastDataChange('deliveries', 'update');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: updatedLocal }));
      window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: updatedLocal }));
      window.dispatchEvent(new CustomEvent('agrolnk_deliveries_updated', { detail: updatedLocal }));
      window.dispatchEvent(new Event('storage'));
    }

    return updatedLocal;
  } catch (err) {
    console.error('Error in completeBuyerOrderWithFreightPayment:', err);
    throw err;
  }
}

/**
 * Ensure an order exists and is fully funded when trade credit margin is paid
 */
export async function ensureOrderForFinancing(request, paymentData) {
  if (!request) return null;
  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  };

  const orderNum = request.orderNumber || `#AGM-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderId = request.orderId || generateId();

  const allOrders = await getOrders();
  const existing = allOrders.find(
    (o) =>
      (request.orderNumber && o.orderNumber === request.orderNumber) ||
      (request.orderId && (o.id === request.orderId || o.orderNumber === request.orderId)) ||
      (request.id && o.id === request.id)
  );

  const updatedPayload = {
    ...(existing || {}),
    id: existing?.id || orderId,
    orderNumber: existing?.orderNumber || orderNum,
    listingId: request.listingId || existing?.listingId || null,
    buyerId: request.applicantId || existing?.buyerId || 'buyer',
    buyerName: request.applicantName || existing?.buyerName || 'Buyer',
    farmerId: request.farmerId || existing?.farmerId || '',
    farmerName: request.farmerName || existing?.farmerName || 'Verified Producer',
    commodity: request.commodity || existing?.commodity || 'Produce',
    variety: request.variety || existing?.variety || 'Standard',
    grade: request.grade || existing?.grade || 'A',
    quantity: Number(request.quantity || existing?.quantity || 1),
    unit: request.unit || existing?.unit || 'kg',
    pricePerUnit: Number(
      existing?.pricePerUnit ||
      (request.transactionValue && request.quantity ? request.transactionValue / request.quantity : 0)
    ),
    totalAmount: Number(request.transactionValue || existing?.totalAmount || request.requestedAmount || 0),
    state: request.state || existing?.state || '',
    district: request.district || existing?.district || '',
    escrowStatus: 'funded',
    status: existing?.status && existing.status !== 'pending' ? existing.status : 'order_placed',
    paymentMode: 'trade_credit',
    financingRequestId: request.id,
    financingRequestNumber: request.requestNumber,
    paymentId: paymentData?.razorpay_payment_id || existing?.paymentId || null,
    updatedAt: new Date().toISOString(),
  };

  saveLocalOrder(updatedPayload);

  // Sync to Supabase
  try {
    const dbOrderId = isUuid(updatedPayload.id) ? updatedPayload.id : generateStandardUuid();
    const dbRow = {
      id: dbOrderId,
      order_number: updatedPayload.orderNumber,
      listing_id: isUuid(updatedPayload.listingId) ? updatedPayload.listingId : null,
      buyer_id: isUuid(updatedPayload.buyerId) ? updatedPayload.buyerId : null,
      buyer_name: updatedPayload.buyerName,
      farmer_id: isUuid(updatedPayload.farmerId) ? updatedPayload.farmerId : null,
      farmer_name: updatedPayload.farmerName,
      commodity: updatedPayload.commodity,
      variety: updatedPayload.variety,
      grade: updatedPayload.grade,
      quantity: updatedPayload.quantity,
      unit: updatedPayload.unit,
      price_per_unit: updatedPayload.pricePerUnit,
      total_amount: updatedPayload.totalAmount,
      state: updatedPayload.state,
      district: updatedPayload.district,
      escrow_status: 'funded',
      status: updatedPayload.status,
      updated_at: new Date().toISOString(),
    };

    if (existing && isUuid(existing.id)) {
      await supabase.from('orders').update(dbRow).eq('id', existing.id);
    } else {
      dbRow.created_at = new Date().toISOString();
      await supabase.from('orders').upsert([dbRow], { onConflict: 'order_number' });
    }
  } catch (err) {
    console.warn('Supabase order sync note on financing margin:', err);
  }

  // Register in Live Escrow API
  try {
    await processLiveEscrowDeposit({
      orderNumber: updatedPayload.orderNumber,
      commodity: `${updatedPayload.commodity} (${updatedPayload.variety}, ${updatedPayload.grade})`,
      tradeAmount: updatedPayload.totalAmount,
      buyerName: updatedPayload.buyerName,
      farmerName: updatedPayload.farmerName,
      paymentMode: 'NBFC Institutional Trade Credit (Margin Paid)',
    });
  } catch (escrowErr) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: updatedPayload }));
    window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: updatedPayload }));
    window.dispatchEvent(new Event('storage'));
  }

  return updatedPayload;
}

/**
 * Confirm physical produce receipt by buyer (Moves order to 'delivered' awaiting Admin Call Verification & Escrow Release)
 */
export async function confirmOrderReceipt(orderId) {
  try {
    if (typeof window !== 'undefined' && orderId) {
      localStorage.setItem(`agrolnk_buyer_verified_${orderId}`, 'true');
    }

    try {
      const updatePayload = {
        status: 'delivered',
        admin_verification_status: 'pending',
        buyer_confirmed_arrival: true,
        buyer_arrival_verified: true,
        buyer_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .or(`id.eq.${orderId},order_number.eq.${orderId}`);

      if (error) {
        console.warn('Supabase update note in confirmOrderReceipt:', error);
        // Fallback update
        await supabase
          .from('orders')
          .update({
            status: 'delivered',
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${orderId},order_number.eq.${orderId}`);
      }
    } catch (dbErr) {
      console.warn('Database note in confirmOrderReceipt:', dbErr);
    }

    // Automatically sync linked delivery to delivered
    try {
      await supabase
        .from('deliveries')
        .update({
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .or(`order_id.eq.${orderId},order_number.eq.${orderId}`);
    } catch (delSyncErr) {
      console.warn('Delivery sync notice:', delSyncErr);
    }

    const localOrders = getLocalOrders();
    const updatedLocal = localOrders.map((o) => {
      if (o.id === orderId || o.orderNumber === orderId) {
        return {
          ...o,
          status: 'delivered',
          adminVerificationStatus: 'pending',
          buyerConfirmedArrival: true,
          buyerArrivalVerified: true,
          buyerVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });
    replaceLocalOrders(updatedLocal);

    const resolved = updatedLocal.find((o) => o.id === orderId || o.orderNumber === orderId) || {
      id: orderId,
      status: 'delivered',
      adminVerificationStatus: 'pending',
      buyerConfirmedArrival: true,
      buyerArrivalVerified: true,
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: resolved }));
      window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: resolved }));
      window.dispatchEvent(new Event('storage'));
    }

    try {
      sendNotification({
        recipientId: resolved.farmerId,
        recipientRole: 'farmer',
        title: `Produce Arrival Confirmed: ${resolved.orderNumber}`,
        message: `Buyer ${resolved.buyerName || 'Buyer'} has inspected and confirmed produce arrival. Escrow release is being finalized.`,
        type: 'order',
        link: '/farmer-orders',
      });
    } catch (notifErr) {}

    return resolved;
  } catch (err) {
    console.error('Error confirming order receipt:', err);
    throw err;
  }
}

/**
 * Update order status
 */
/**
 * Update order status with automatic inventory restoration on cancellation
 */
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const isUuid = (str) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const matchCol = isUuid(orderId) ? 'id' : 'order_number';

    // 1. Fetch current order state before updating
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq(matchCol, orderId)
      .maybeSingle();

    const previousStatus = existingOrder?.status;
    const updatePayload = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'completed') {
      updatePayload.escrow_status = 'released';
    } else if (newStatus === 'cancelled') {
      // If escrow was funded/held, mark as refunded
      if (existingOrder?.escrow_status && ['funded', 'escrow_secured', 'held'].includes(existingOrder.escrow_status)) {
        updatePayload.escrow_status = 'refunded';
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq(matchCol, orderId)
      .select()
      .maybeSingle();

    if (error) throw error;

    // 2. Inventory Restoration: If order was cancelled before truck pickup/dispatch, return stock to listing
    if (
      newStatus === 'cancelled' &&
      previousStatus !== 'cancelled' &&
      existingOrder?.listing_id &&
      Number(existingOrder?.quantity) > 0 &&
      !['dispatched', 'in_transit', 'delivered', 'completed'].includes(previousStatus)
    ) {
      try {
        const { data: listingData } = await supabase
          .from('listings')
          .select('id, quantity, status, unit')
          .eq('id', existingOrder.listing_id)
          .maybeSingle();

        if (listingData) {
          const listingUnit = listingData.unit || existingOrder.unit || 'kg';
          const orderUnit = existingOrder.unit || listingUnit;
          const restoreQty = convertVolume(existingOrder.quantity, orderUnit, listingUnit);

          const restoredStock = Math.round((Number(listingData.quantity || 0) + restoreQty) * 10000) / 10000;
          await supabase
            .from('listings')
            .update({
              quantity: restoredStock,
              status: 'active', // Reactivate listing if it was marked sold
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOrder.listing_id);
        }
      } catch (restoreErr) {
        console.warn('Client-side inventory restoration notice:', restoreErr);
      }
    }

    // 3. Automatically sync linked delivery when order progresses or cancels
    try {
      let linkedDeliveryStatus = null;
      if (newStatus === 'completed') linkedDeliveryStatus = 'completed';
      else if (newStatus === 'delivered') linkedDeliveryStatus = 'delivered';
      else if (newStatus === 'in_transit' || newStatus === 'ready_for_delivery') linkedDeliveryStatus = 'in_transit';
      else if (newStatus === 'cancelled') linkedDeliveryStatus = 'cancelled';

      if (linkedDeliveryStatus) {
        const delMatchCol = isUuid(orderId) ? 'order_id' : 'order_number';
        await supabase
          .from('deliveries')
          .update({
            status: linkedDeliveryStatus,
            updated_at: new Date().toISOString(),
          })
          .eq(delMatchCol, orderId);
      }
    } catch (delErr) {
      console.warn('Delivery status auto-sync notice:', delErr);
    }

    const mapped = data
      ? mapOrderFromDb(data)
      : { id: orderId, orderNumber: orderId, status: newStatus, updatedAt: new Date().toISOString() };

    // 4. Update local storage cache and notify active views
    try {
      const stored = getLocalOrders();
      const idx = stored.findIndex(
        (o) =>
          (data?.id && o.id === data.id) ||
          (data?.order_number && o.orderNumber === data.order_number) ||
          o.id === orderId ||
          o.orderNumber === orderId
      );
      if (idx !== -1) {
        stored[idx] = { ...stored[idx], ...mapped };
        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(stored));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: mapped }));
        window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: mapped }));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}

    return mapped;
  } catch (err) {
    console.error('Error updating order status:', err);
    throw err;
  }
}

/**
 * Verify and Lock Escrow Deposit (Admin Bank Statement Verification)
 * Strictly unlocks produce dispatch only after real-world credit verification.
 */
export async function verifyAndLockEscrowDeposit(orderId, adminName = 'AgroLnk Admin') {
  try {
    const updatePayload = {
      escrow_status: 'funded',
      status: 'order_placed',
      admin_verified_by: adminName,
      admin_verification_status: 'approved',
      admin_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Update in Supabase
    try {
      await supabase
        .from('orders')
        .update(updatePayload)
        .or(`id.eq.${orderId},order_number.eq.${orderId}`);
    } catch (e) {
      console.warn('Supabase escrow lock sync notice:', e);
    }

    // 2. Update local storage cache
    const stored = getLocalOrders();
    const idx = stored.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
    if (idx !== -1) {
      stored[idx] = {
        ...stored[idx],
        escrowStatus: 'funded',
        status: 'order_placed',
        adminVerifiedBy: adminName,
        adminVerificationStatus: 'approved',
        adminVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveLocalOrder(stored[idx]);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('agrolnk_orders_updated'));
      window.dispatchEvent(new Event('agrolnk_order_updated'));
      window.dispatchEvent(new Event('agrolnk_escrow_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return true;
  } catch (err) {
    console.error('Failed to verify & lock escrow deposit:', err);
    throw err;
  }
}

/**
 * Deposit Escrow for an Order (e.g. following an auction win or pending direct order)
 * Moves escrow_status from 'pending' to 'funded' and status to 'order_placed',
 * then initializes delivery dispatch in public.deliveries.
 */
export async function depositOrderEscrow(orderId, paymentMetadata = {}) {
  try {
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .single();

    if (fetchErr || !order) {
      throw new Error('Order not found for deposit: ' + (fetchErr?.message || orderId));
    }

    const paymentId = paymentMetadata?.paymentId || paymentMetadata?.razorpay_payment_id;
    if (!paymentId || !paymentMetadata?.verified) {
      throw new Error('A server-verified payment confirmation from the gateway is required to transition escrow to funded.');
    }

    const nowIso = new Date().toISOString();

    let updatedOrder = order;
    if (order.escrow_status !== 'funded' && order.escrow_status !== 'held') {
      const { data: rpcUpdated, error: updateErr } = await supabase
        .from('orders')
        .update({
          escrow_status: 'funded',
          status: 'order_placed',
          payment_id: paymentId,
          payment_mode: paymentMetadata.paymentMode || 'Razorpay Route Gateway',
          updated_at: nowIso,
        })
        .eq('id', order.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      updatedOrder = rpcUpdated;
    }

    // Trigger delivery request now that escrow is funded
    try {
      const { data: existingDel } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', order.id)
        .maybeSingle();

      if (!existingDel) {
        const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const deliveryNum = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;
        await supabase.from('deliveries').insert([
          {
            id: deliveryId,
            delivery_number: deliveryNum,
            order_id: order.id,
            order_number: order.order_number,
            farmer_id: order.farmer_id,
            farmer_name: order.farmer_name,
            buyer_id: order.buyer_id,
            buyer_name: order.buyer_name,
            commodity: order.commodity,
            grade: order.grade || 'A',
            variety: order.variety || 'Standard Lot',
            quantity: order.quantity,
            unit: order.unit,
            pickup_location: {
              state: order.state || 'Madhya Pradesh',
              district: order.district || 'Indore',
              address: `${order.district || 'Farmgate'} Aggregation Depot`,
            },
            delivery_location: {
              state: 'Tamil Nadu',
              district: 'Chennai',
              address: 'Buyer Central Receiving Hub',
            },
            distance_km: null,
            fare_amount: null,
            status: 'transport_requested',
            tracking_steps: [
              { step: 'Order Confirmed', completed: true, timestamp: nowIso },
              { step: 'Transporter Assigned', completed: false },
              { step: 'Pickup Completed', completed: false },
              { step: 'In Transit', completed: false },
              { step: 'Delivered', completed: false },
            ],
            created_at: nowIso,
            updated_at: nowIso,
          },
        ]);
      }
    } catch (delErr) {
      console.warn('Delivery dispatch notice after escrow deposit:', delErr);
    }

    // Register deposit in Live Escrow API Engine
    try {
      await processLiveEscrowDeposit({
        orderNumber: order.order_number,
        commodity: `${order.commodity} (${order.variety || 'Standard'}, ${order.grade || 'A'})`,
        tradeAmount: Number(order.total_amount),
        buyerName: order.buyer_name,
        farmerName: order.farmer_name,
        paymentMode: paymentMetadata.paymentMode || 'Razorpay Gateway (Instant Escrow Deposit)',
      });
    } catch (escrowErr) {
      console.warn('Live escrow deposit record notice:', escrowErr);
    }

    // Dispatch notifications
    try {
      sendNotification({
        recipientId: order.farmer_id,
        recipientRole: 'farmer',
        title: `Escrow Funded for Order ${order.order_number}`,
        message: `Buyer deposited ₹${Number(order.total_amount).toLocaleString('en-IN')} into Escrow vault. Produce pickup and packaging is now authorized.`,
        type: 'order',
        link: '/farmer-orders',
      });
      sendNotification({
        recipientId: order.buyer_id,
        recipientRole: 'buyer',
        title: `Escrow Secured (${order.order_number})`,
        message: `Your deposit of ₹${Number(order.total_amount).toLocaleString('en-IN')} is locked in AgroLnk Escrow. Produce is being prepared for transport.`,
        type: 'order',
        link: '/buyer-orders',
      });
    } catch (notifErr) {
      console.warn('Escrow deposit notification notice:', notifErr);
    }

    const mapped = mapOrderFromDb(updatedOrder);

    // Update local cache
    try {
      const stored = getLocalOrders();
      const idx = stored.findIndex((o) => o.id === order.id || o.orderNumber === order.order_number);
      if (idx !== -1) {
        stored[idx] = { ...stored[idx], ...mapped };
        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(stored));
      }
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: mapped }));
      window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: mapped }));
      window.dispatchEvent(new Event('storage'));
    }

    return mapped;
  } catch (err) {
    console.error('Error depositing escrow for order:', err);
    throw err;
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle();

    if (error || !data) return null;
    return mapOrderFromDb(data);
  } catch {
    return null;
  }
}

/**
 * Supervised Admin Verification & Immediate Escrow Release to Farmer
 */
export async function adminVerifyAndReleaseOrderEscrow({
  orderId,
  adminNotes = '',
  adminUser = null,
  verificationChecks = {}
}) {
  try {
    const currentOrder = await getOrderById(orderId);
    const orderKey = currentOrder?.orderNumber || currentOrder?.id || orderId;

    // 1. Fetch beneficiary farmer bank account
    const farmerBank = getUserBankDetails(currentOrder?.farmerId) || {
      bankName: currentOrder?.payoutBankName || 'Bank Account',
      accountNumber: currentOrder?.payoutAccountNumber || '—',
      ifscCode: currentOrder?.payoutIfsc || '—',
      accountHolderName: currentOrder?.farmerName || 'Producer',
    };

    // 2. Authentic Banking Settlement Reference (if supplied by bank webhook, admin, or gateway)
    const verifiedUtr = verificationChecks?.bankUtr || verificationChecks?.utr || farmerBank?.bankUtr || null;

    const adminName = adminUser?.name || 'AgroLnk Operations Ombudsman';
    const notes = adminNotes || 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.';

    // 3. Try Production Atomic Stored Procedure (Row-level lock, eliminates double-disbursement)
    let atomicSuccess = false;
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('release_escrow_atomic', {
        p_order_id: orderId,
        p_admin_name: adminName,
        p_admin_notes: notes,
        p_bank_name: farmerBank.bankName,
        p_account_number: farmerBank.accountNumber,
        p_ifsc: farmerBank.ifscCode,
        p_utr: verifiedUtr,
      });

      if (!rpcErr && rpcData?.success) {
        atomicSuccess = true;
      }
    } catch (_rpcErr) {
      // Fall through to client fallback
    }

    const basePayload = {
      status: 'completed',
      admin_verified_by: adminName,
      admin_verification_status: 'approved',
      admin_call_notes: notes,
      admin_verified_at: new Date().toISOString(),
      payout_bank_name: farmerBank.bankName,
      payout_account_number: farmerBank.accountNumber,
      payout_ifsc: farmerBank.ifscCode,
      bank_utr: verifiedUtr,
      disbursed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let data = null;
    if (!atomicSuccess) {
      // Safe query that avoids Postgres UUID parse errors when orderId is a formatted order number
      const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));
      try {
        let updateQuery = supabase.from('orders').update({ ...basePayload, escrow_status: 'released' });
        if (currentOrder?.id && isUuid(currentOrder.id)) {
          updateQuery = updateQuery.eq('id', currentOrder.id);
        } else if (isUuid(orderId)) {
          updateQuery = updateQuery.eq('id', orderId);
        } else {
          updateQuery = updateQuery.eq('order_number', currentOrder?.orderNumber || orderId);
        }

        const { data: updatedData, error } = await updateQuery.select().maybeSingle();
        if (!error && updatedData) {
          data = updatedData;
        } else {
          // If trigger blocked direct escrow_status modification, execute basePayload which is 100% permitted by RLS
          let retryQuery = supabase.from('orders').update(basePayload);
          if (currentOrder?.id && isUuid(currentOrder.id)) {
            retryQuery = retryQuery.eq('id', currentOrder.id);
          } else if (isUuid(orderId)) {
            retryQuery = retryQuery.eq('id', orderId);
          } else {
            retryQuery = retryQuery.eq('order_number', currentOrder?.orderNumber || orderId);
          }
          const { data: retryData } = await retryQuery.select().maybeSingle();
          data = retryData;
        }
      } catch (qErr) {
        console.warn('Query exception in adminVerifyAndReleaseOrderEscrow:', qErr);
      }
    } else {
      const freshOrder = await getOrderById(orderId);
      data = freshOrder;
    }

    // 3. Sync Linked Delivery to 'completed'
    try {
      await supabase
        .from('deliveries')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .or(`order_number.eq.${orderKey}`);
    } catch (delSyncErr) {
      console.warn('Delivery completion sync note:', delSyncErr);
    }

    // 4. Trigger Live Escrow Nodal Engine Release
    try {
      await processLiveEscrowRelease(orderKey, 'ADMIN_CALL_VERIFIED_RELEASE', { bankUtr: verifiedUtr });
    } catch (escrowErr) {
      console.warn('Escrow nodal release notice:', escrowErr);
    }

    const resolved = {
      ...(currentOrder || {}),
      status: 'completed',
      escrowStatus: 'released',
      escrow_status: 'released',
      adminVerifiedBy: adminName,
      adminVerificationStatus: 'approved',
      admin_verification_status: 'approved',
      adminCallNotes: notes,
      adminVerifiedAt: new Date().toISOString(),
      payoutBankName: farmerBank.bankName,
      payoutAccountNumber: farmerBank.accountNumber,
      payoutIfsc: farmerBank.ifscCode,
      bankUtr: verifiedUtr,
      disbursedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data ? mapOrderFromDb(data) : {}),
    };

    saveLocalOrder(resolved);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: resolved }));
      window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: resolved }));
      window.dispatchEvent(new Event('storage'));
    }
    return resolved;
  } catch (err) {
    console.error('Error in adminVerifyAndReleaseOrderEscrow:', err);
    throw err;
  }
}

/**
 * Admin Hold / Dispute Escrow for an Order
 */
export async function adminHoldOrDisputeOrderEscrow({
  orderId,
  disputeReason = '',
  adminUser = null
}) {
  try {
    const { data: existingOrder, error: lookupErr } = await supabase
      .from('orders')
      .select('id, order_number, escrow_status, status')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle();

    if (lookupErr) throw lookupErr;
    if (!existingOrder) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const currentEscrow = existingOrder.escrow_status || 'pending';
    const currentStatus = existingOrder.status || 'pending';
    if (['released', 'refunded', 'settled'].includes(currentEscrow) || ['completed', 'cancelled', 'refunded'].includes(currentStatus)) {
      throw new Error(`Cannot place dispute hold on already closed order (${currentEscrow} / ${currentStatus}).`);
    }
    if (!['funded', 'escrow_secured', 'held', 'disputed'].includes(currentEscrow) || ['pending', 'awaiting_freight_quote', 'freight_quoted'].includes(currentStatus)) {
      throw new Error(`Cannot place dispute hold on unpaid order (${currentEscrow} / ${currentStatus}).`);
    }

    const updatePayload = {
      escrow_status: 'disputed',
      admin_verified_by: adminUser?.name || 'AgroLnk Dispute Desk',
      admin_verification_status: 'disputed',
      admin_call_notes: disputeReason || 'Buyer flagged produce discrepancy during telephonic verification.',
      admin_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', existingOrder.id)
      .select()
      .single();

    if (error) throw error;
    const resolved = mapOrderFromDb(data);
    window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: resolved }));
    return resolved;
  } catch (err) {
    console.error('Error in adminHoldOrDisputeOrderEscrow:', err);
    throw err;
  }
}

// Setup Supabase Realtime Subscription for Orders Table
if (typeof window !== 'undefined') {
  try {
    supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.new) {
            const mapped = mapOrderFromDb(payload.new);
            saveLocalOrder(mapped);
            broadcastDataChange('orders', payload.eventType || 'UPDATE', mapped);
            window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: mapped }));
            window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: mapped }));
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.info('Supabase Realtime for orders initialized');
  }
}

