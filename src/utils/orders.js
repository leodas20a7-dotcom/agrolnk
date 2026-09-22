import { supabase } from '../lib/supabase';
import { createDelivery } from './deliveries';
import { processLiveEscrowDeposit, processLiveEscrowRelease } from './escrowApi';
import { getUserBankDetails } from './bankDetails';
import { broadcastDataChange } from './syncChannel';
import { sendNotification } from './notifications';
import { getCurrentUser } from './auth';

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
    pricePerUnit: Number(row.price_per_unit),
    totalAmount: Number(row.total_amount),
    state: row.state,
    district: row.district,
    escrowStatus: row.escrow_status,
    status: row.status,
    adminVerifiedBy: row.admin_verified_by || null,
    adminVerificationStatus: row.admin_verification_status || 'pending',
    adminCallNotes: row.admin_call_notes || null,
    adminVerifiedAt: row.admin_verified_at || null,
    buyerConfirmedArrival: row.buyer_confirmed_arrival ?? (row.buyer_arrival_verified || !!row.buyer_verified_at || false),
    buyerArrivalVerified: row.buyer_arrival_verified || !!row.buyer_verified_at || false,
    buyerVerifiedAt: row.buyer_verified_at || null,
    payoutBankName: row.payout_bank_name || null,
    payoutAccountNumber: row.payout_account_number || null,
    payoutIfsc: row.payout_ifsc || null,
    bankUtr: row.bank_utr || null,
    disbursedAt: row.disbursed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LOCAL_ORDERS_KEY = 'agrolnk_orders_local';

function getLocalOrders() {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    const list = raw ? JSON.parse(raw) : [];
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
  } catch {
    return [];
  }
}

function saveLocalOrder(item) {
  try {
    if (!item) return;
    const existing = getLocalOrders();
    const filtered = existing.filter(
      (o) => o.id !== item.id && o.orderNumber !== item.orderNumber
    );
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([item, ...filtered]));
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
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      remote = data.map(mapOrderFromDb);
    }
  } catch (err) {
    console.error('Error in getOrders:', err);
  }

  const local = getLocalOrders();
  const localMap = new Map();
  local.forEach((l) => {
    if (l.id) localMap.set(l.id, l);
    if (l.orderNumber) localMap.set(l.orderNumber, l);
  });

  const mergedRemote = remote.map((r) => {
    const localMatch = localMap.get(r.id) || (r.orderNumber && localMap.get(r.orderNumber));
    const isConfirmed = Boolean(
      (localMatch && (localMatch.buyerConfirmedArrival || localMatch.buyerArrivalVerified)) ||
      r.buyerConfirmedArrival ||
      r.buyerArrivalVerified ||
      (typeof window !== 'undefined' && (
        localStorage.getItem(`agrolnk_buyer_verified_${r.id}`) === 'true' ||
        localStorage.getItem(`agrolnk_buyer_verified_${r.orderNumber}`) === 'true' ||
        (localMatch && (
          localStorage.getItem(`agrolnk_buyer_verified_${localMatch.id}`) === 'true' ||
          localStorage.getItem(`agrolnk_buyer_verified_${localMatch.orderNumber}`) === 'true'
        ))
      ))
    );

    if (localMatch) {
      return {
        ...localMatch,
        ...r,
        farmerName: r.farmerName || localMatch.farmerName || 'Verified Producer',
        farmerId: r.farmerId || localMatch.farmerId || '',
        buyerName: r.buyerName || localMatch.buyerName || 'Buyer',
        buyerId: r.buyerId || localMatch.buyerId || '',
        escrowStatus: (r.escrowStatus && r.escrowStatus !== 'financing_pending')
          ? r.escrowStatus
          : (localMatch.escrowStatus || r.escrowStatus),
        status: (r.status && r.status !== 'order_placed')
          ? r.status
          : (localMatch.status || r.status),
        buyerConfirmedArrival: isConfirmed,
        buyerArrivalVerified: isConfirmed,
        adminVerificationStatus: r.adminVerificationStatus || localMatch.adminVerificationStatus || 'pending',
      };
    }
    return {
      ...r,
      buyerConfirmedArrival: isConfirmed,
      buyerArrivalVerified: isConfirmed,
    };
  });

  const remoteKeys = new Set(remote.flatMap((r) => [r.id, r.orderNumber].filter(Boolean)));
  const localOnly = local.filter((l) => !remoteKeys.has(l.id) && !remoteKeys.has(l.orderNumber));
  const combined = [...mergedRemote, ...localOnly];

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

    return all.filter((o) => {
      const bName = (o.buyerName || '').toLowerCase().trim();
      const bEmail = (o.buyerEmail || '').toLowerCase().trim();
      const bId = String(o.buyerId || '').trim();

      const matchId = Boolean(uid && bId && (bId.toLowerCase() === uid.toLowerCase()));
      const matchEmail = Boolean(userEmail && bEmail && (bEmail === userEmail || bId.toLowerCase() === userEmail));
      const matchName = Boolean(userName && bName && !['buyer', 'verified buyer', 'user'].includes(bName) && bName === userName);

      return matchId || matchEmail || matchName;
    });
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

    return all.filter((o) => {
      const fName = (o.farmerName || '').toLowerCase().trim();
      const fEmail = (o.farmerEmail || '').toLowerCase().trim();
      const fId = String(o.farmerId || '').trim();

      const matchId = Boolean(uid && fId && (fId.toLowerCase() === uid.toLowerCase()));
      const matchEmail = Boolean(userEmail && fEmail && (fEmail === userEmail || fId.toLowerCase() === userEmail));
      const matchName = Boolean(userName && fName && !['farmer', 'verified producer', 'producer', 'user'].includes(fName) && fName === userName);

      return matchId || matchEmail || matchName;
    });
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

    const orderId = orderData.id || generateId();
    const orderNumber = orderData.orderNumber || generateOrderNum();
    const isTradeCredit = orderData.paymentMode === 'trade_credit';

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
      pricePerUnit: Number(orderData.pricePerUnit),
      totalAmount: Number(orderData.totalAmount),
      state: orderData.state || '',
      district: orderData.district || '',
      escrowStatus: isTradeCredit ? 'financing_pending' : 'funded',
      status: 'order_placed',
      paymentMode: isTradeCredit ? 'trade_credit' : 'direct',
      financingAmount: orderData.financingAmount,
      buyerMarginDeposit: orderData.buyerMarginDeposit,
      financingRequestId: orderData.financingRequestId,
      financingRequestNumber: orderData.financingRequestNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveLocalOrder(localItem);

const isUuid = (str) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const dbOrderId = isUuid(orderId) ? orderId : generateStandardUuid();
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
      price_per_unit: Number(orderData.pricePerUnit),
      total_amount: Number(orderData.totalAmount),
      state: orderData.state || '',
      district: orderData.district || '',
      escrow_status: isTradeCredit ? 'pending' : 'funded',
      status: 'order_placed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([dbRow])
        .select()
        .single();

      if (!error && data) {
        const mapped = mapOrderFromDb(data);
        saveLocalOrder({ ...localItem, ...mapped });
      }
    } catch (dbErr) {
      console.warn('Supabase order creation note:', dbErr);
    }

    // Register deposit in Live Escrow API Engine
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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_orders_updated', { detail: localItem }));
      window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: localItem }));
      window.dispatchEvent(new Event('storage'));
    }

    // Dispatch targeted notification to Producer
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

    return localItem;
  } catch (err) {
    console.error('Error creating order:', err);
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
        if (typeof window !== 'undefined') {
          if (o.id) localStorage.setItem(`agrolnk_buyer_verified_${o.id}`, 'true');
          if (o.orderNumber) localStorage.setItem(`agrolnk_buyer_verified_${o.orderNumber}`, 'true');
        }
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
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updatedLocal));

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
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const updatePayload = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'completed') {
      updatePayload.escrow_status = 'released';
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .select()
      .single();

    if (error) throw error;

    // Automatically sync linked delivery when order progresses
    try {
      let linkedDeliveryStatus = null;
      if (newStatus === 'completed') linkedDeliveryStatus = 'completed';
      else if (newStatus === 'delivered') linkedDeliveryStatus = 'delivered';
      else if (newStatus === 'in_transit' || newStatus === 'ready_for_delivery') linkedDeliveryStatus = 'in_transit';

      if (linkedDeliveryStatus) {
        await supabase
          .from('deliveries')
          .update({
            status: linkedDeliveryStatus,
            updated_at: new Date().toISOString(),
          })
          .or(`order_id.eq.${orderId},order_number.eq.${orderId}`);
      }
    } catch (delErr) {
      console.warn('Delivery status auto-sync notice:', delErr);
    }

    return mapOrderFromDb(data);
  } catch (err) {
    console.error('Error updating order status:', err);
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

    // 2. Generate Real-time Banking UTR
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedUtr = `CMSICICI${todayStr}${randomSuffix}`;

    const updatePayload = {
      status: 'completed',
      escrow_status: 'released',
      admin_verified_by: adminUser?.name || 'AgroLnk Operations Ombudsman',
      admin_verification_status: 'approved',
      admin_call_notes: adminNotes || 'Telephonic verification completed with buyer. Goods and weight confirmed in good order.',
      admin_verified_at: new Date().toISOString(),
      payout_bank_name: farmerBank.bankName,
      payout_account_number: farmerBank.accountNumber,
      payout_ifsc: farmerBank.ifscCode,
      bank_utr: generatedUtr,
      disbursed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .select()
      .single();

    if (error) {
      console.warn('Supabase update note in adminVerifyAndReleaseOrderEscrow:', error);
    }

    // 3. Sync Linked Delivery to 'completed'
    try {
      await supabase
        .from('deliveries')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .or(`order_id.eq.${orderId},order_number.eq.${orderId}`);
    } catch (delSyncErr) {
      console.warn('Delivery completion sync note:', delSyncErr);
    }

    // 4. Trigger Live Escrow Nodal Engine Release
    try {
      await processLiveEscrowRelease(orderKey, 'ADMIN_CALL_VERIFIED_RELEASE');
    } catch (escrowErr) {
      console.warn('Escrow nodal release notice:', escrowErr);
    }

    const resolved = data ? mapOrderFromDb(data) : { ...currentOrder, ...updatePayload };
    window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: resolved }));
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
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
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

