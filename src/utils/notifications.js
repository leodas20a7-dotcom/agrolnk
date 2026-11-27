// AgrowLink Strict Role-Based & Conflict-Free Notification Engine (100% Free)
import { supabase } from '../lib/supabase';
import { broadcastDataChange, subscribeToCrossTabSync } from './syncChannel';
import { cachedFetch, invalidateCache } from './requestCache';

const LOCAL_NOTIFICATIONS_KEY = 'agrolnk_user_notifications';
const DISMISSED_NOTIFICATIONS_KEY = 'agrolnk_dismissed_notifications';
const READ_NOTIFICATIONS_KEY = 'agrolnk_read_notifications';
const READ_BEFORE_TIMESTAMP_KEY = 'agrolnk_notifications_read_before';
const SEEDED_ROLES_KEY = 'agrolnk_seeded_user_roles';

// In-memory store guarantees read/dismissed flags persist even if localStorage is full (QuotaExceededError)
const inMemoryIdSets = {
  [READ_NOTIFICATIONS_KEY]: new Set(),
  [DISMISSED_NOTIFICATIONS_KEY]: new Set(),
  [SEEDED_ROLES_KEY]: new Set(),
};
const inMemoryReadBeforeByOwner = {};
let inMemoryNotifications = null;

function safeSetStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    // Evict bulky non-essential cache keys if localStorage is full, then retry
    try {
      const bulkyKeys = [
        'agrolnk_live_escrow_events_v2',
        'agrolnk_listings_local',
        'agrolnk_orders_local',
        'agrolnk_deliveries_local',
      ];
      for (const k of bulkyKeys) {
        if (k !== key) localStorage.removeItem(k);
      }
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function getActiveNotificationOwner(explicitUser = null) {
  try {
    if (explicitUser && (explicitUser.id || explicitUser.email)) {
      return String(explicitUser.id || explicitUser.email).toLowerCase();
    }
    const raw =
      (typeof localStorage !== 'undefined' &&
        (localStorage.getItem('agrolnkUser') || localStorage.getItem('agrolnk_current_user'))) ||
      null;
    if (!raw) return String(explicitUser?.role || 'anon').toLowerCase();
    const parsed = JSON.parse(raw);
    return String(parsed?.id || parsed?.email || explicitUser?.role || parsed?.role || 'anon').toLowerCase();
  } catch {
    return 'anon';
  }
}

function readScopedIdArray(storageKey, explicitUser = null) {
  const memSet = inMemoryIdSets[storageKey] || new Set();
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return Array.from(memSet);
    const parsed = JSON.parse(raw);
    let diskIds = [];
    if (Array.isArray(parsed)) {
      diskIds = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.ids)) {
      diskIds = parsed.ids;
    }
    for (const item of diskIds) {
      if (item) memSet.add(String(item));
    }
    return Array.from(memSet);
  } catch {
    return Array.from(memSet);
  }
}

function saveScopedIds(storageKey, idsToAdd, explicitUser = null) {
  if (!Array.isArray(idsToAdd) || idsToAdd.length === 0) return;
  const memSet = inMemoryIdSets[storageKey] || (inMemoryIdSets[storageKey] = new Set());
  for (const id of idsToAdd) {
    if (id) memSet.add(String(id));
  }
  try {
    const ownerId = getActiveNotificationOwner(explicitUser);
    const list = readScopedIdArray(storageKey, explicitUser);
    const merged = Array.from(new Set([...list, ...idsToAdd.filter(Boolean).map(String)]));
    for (const id of merged) memSet.add(id);
    safeSetStorageItem(storageKey, JSON.stringify({ ownerId, ids: merged }));
  } catch {}
}

function saveScopedId(storageKey, id, explicitUser = null) {
  if (!id) return;
  saveScopedIds(storageKey, [id], explicitUser);
}

function getReadNotificationIds(explicitUser = null) {
  return readScopedIdArray(READ_NOTIFICATIONS_KEY, explicitUser);
}

function saveReadNotificationId(id, explicitUser = null) {
  saveScopedId(READ_NOTIFICATIONS_KEY, id, explicitUser);
}

function saveReadNotificationIds(ids, explicitUser = null) {
  saveScopedIds(READ_NOTIFICATIONS_KEY, ids, explicitUser);
}

export function getMarkAllReadTimestamp(explicitUser = null) {
  const ownerId = getActiveNotificationOwner(explicitUser);
  const memTs = Number(inMemoryReadBeforeByOwner[ownerId] || inMemoryReadBeforeByOwner.__all__ || 0);
  try {
    const raw = localStorage.getItem(READ_BEFORE_TIMESTAMP_KEY);
    if (!raw) return memTs;
    const parsed = JSON.parse(raw);
    const diskTs = Number(parsed?.[ownerId] || parsed?.__all__ || parsed?.timestamp || 0);
    return Math.max(memTs, isNaN(diskTs) ? 0 : diskTs);
  } catch {
    return memTs;
  }
}

export function saveMarkAllReadTimestamp(ts = Date.now(), explicitUser = null) {
  const ownerId = getActiveNotificationOwner(explicitUser);
  const safeTs = Number(ts) || Date.now();
  inMemoryReadBeforeByOwner[ownerId] = safeTs;
  inMemoryReadBeforeByOwner.__all__ = safeTs;
  try {
    const raw = localStorage.getItem(READ_BEFORE_TIMESTAMP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    next[ownerId] = safeTs;
    next.__all__ = safeTs;
    safeSetStorageItem(READ_BEFORE_TIMESTAMP_KEY, JSON.stringify(next));
  } catch {}
}

export function getDismissedNotificationIds(explicitUser = null) {
  return readScopedIdArray(DISMISSED_NOTIFICATIONS_KEY, explicitUser);
}

export function saveDismissedNotificationId(id, explicitUser = null) {
  saveScopedId(DISMISSED_NOTIFICATIONS_KEY, id, explicitUser);
}

export function isRoleSeeded(seedKey, explicitUser = null) {
  return readScopedIdArray(SEEDED_ROLES_KEY, explicitUser).includes(seedKey);
}

export function markRoleSeeded(seedKey, explicitUser = null) {
  saveScopedId(SEEDED_ROLES_KEY, seedKey, explicitUser);
}

function isPersistedNotificationId(id) {
  if (!id) return false;
  const s = String(id);
  return (
    !s.startsWith('seed_') &&
    !s.startsWith('admin_') &&
    !s.startsWith('farmer_') &&
    !s.startsWith('processor_') &&
    !s.startsWith('buyer_') &&
    !s.startsWith('transporter_') &&
    !s.startsWith('warehouse_') &&
    !s.startsWith('financier_')
  );
}

function generateId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

function mapNotificationFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    recipientId: row.recipient_id,
    recipientRole: row.recipient_role,
    title: row.title,
    message: row.message,
    type: row.type || 'order', // 'order' | 'delivery' | 'financing' | 'escrow' | 'kyc' | 'system'
    link: row.link || '',
    actionPayload: row.action_payload || {},
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Get all stored local notifications scoped to the active user
 */
export function getLocalNotifications(explicitUser = null) {
  try {
    const ownerId = getActiveNotificationOwner(explicitUser);
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    if (!raw) return Array.isArray(inMemoryNotifications) ? inMemoryNotifications : [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      localStorage.removeItem(LOCAL_NOTIFICATIONS_KEY);
      return Array.isArray(inMemoryNotifications) ? inMemoryNotifications : [];
    }
    if (!parsed || typeof parsed !== 'object' || (parsed.ownerId && parsed.ownerId !== ownerId)) {
      return Array.isArray(inMemoryNotifications) ? inMemoryNotifications : [];
    }
    return Array.isArray(parsed.items) ? parsed.items : (Array.isArray(inMemoryNotifications) ? inMemoryNotifications : []);
  } catch {
    return Array.isArray(inMemoryNotifications) ? inMemoryNotifications : [];
  }
}

/**
 * Save notifications list to user-scoped localStorage and optionally dispatch local event
 */
function saveLocalNotifications(list, explicitUser = null, emitEvent = true) {
  const normalized = Array.isArray(list) ? list : [];
  inMemoryNotifications = normalized;
  try {
    const ownerId = getActiveNotificationOwner(explicitUser);
    safeSetStorageItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify({ ownerId, items: normalized }));
  } catch (err) {
    console.warn('Failed to save local notifications:', err);
  }
  if (emitEvent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_notifications_updated', { detail: normalized }));
  }
}

/**
 * Generate starter role-specific notifications if the user's notification list is empty
 */
function getRoleStarterNotifications(user) {
  if (!user || !user.role) return [];
  const now = new Date();
  const minsAgo = (m) => new Date(now.getTime() - m * 60000).toISOString();

  const role = user.role.toLowerCase();
  const userId = user.id || '';

  if (role === 'farmer' || role === 'fpo') {
    return [
      {
        id: `seed_notif_f1_${userId}`,
        recipientId: userId,
        recipientRole: 'farmer',
        title: 'Account Ready',
        message: 'You can now list crops and get direct buyer orders.',
        type: 'system',
        link: '/farmer-listings',
        isRead: false,
        createdAt: minsAgo(15),
      },
      {
        id: `seed_notif_f2_${userId}`,
        recipientId: userId,
        recipientRole: 'farmer',
        title: 'Safe Payments',
        message: 'Buyer money is deposited in escrow before produce dispatch.',
        type: 'escrow',
        link: '/farmer-orders',
        isRead: false,
        createdAt: minsAgo(45),
      },
    ];
  }

  if (role === 'buyer') {
    return [
      {
        id: `seed_notif_b1_${userId}`,
        recipientId: userId,
        recipientRole: 'buyer',
        title: 'Marketplace Ready',
        message: 'Buy fresh crops directly from verified local farmers.',
        type: 'order',
        link: '/buyer-marketplace',
        isRead: false,
        createdAt: minsAgo(20),
      },
      {
        id: `seed_notif_b2_${userId}`,
        recipientId: userId,
        recipientRole: 'buyer',
        title: 'Trade Credit Available',
        message: 'Get 15–45 days flexible credit for crop purchases.',
        type: 'financing',
        link: '/buyer-financing',
        isRead: false,
        createdAt: minsAgo(60),
      },
    ];
  }

  if (role === 'transporter') {
    return [
      {
        id: `seed_notif_t1_${userId}`,
        recipientId: userId,
        recipientRole: 'transporter',
        title: 'Trips Ready',
        message: 'Accept farm pickup trips with guaranteed payout.',
        type: 'delivery',
        link: '/transporter-desk',
        isRead: false,
        createdAt: minsAgo(30),
      },
    ];
  }

  if (role === 'financier') {
    return [
      {
        id: `seed_notif_fn1_${userId}`,
        recipientId: userId,
        recipientRole: 'financier',
        title: 'Underwriting Desk',
        message: 'Review incoming buyer trade credit requests.',
        type: 'financing',
        link: '/financier-dashboard',
        isRead: false,
        createdAt: minsAgo(25),
      },
    ];
  }

  if (role === 'warehouse') {
    return [
      {
        id: `seed_notif_wh1_${userId}`,
        recipientId: userId,
        recipientRole: 'warehouse',
        title: 'Depot Vault Ready',
        message: 'Manage produce intake receipts and e-NWR digital deposits.',
        type: 'system',
        link: '/warehouse-dashboard',
        isRead: false,
        createdAt: minsAgo(20),
      },
    ];
  }

  return [];
}

/**
 * Filter notifications strictly by User ID and Role (Zero Leakage)
 */
export async function getNotificationsForUser(user) {
  if (!user) return [];
  const currentId = user.id ? String(user.id).toLowerCase() : '';
  const currentEmail = user.email ? String(user.email).toLowerCase() : '';
  const currentRole = user.role ? String(user.role).toLowerCase() : '';

  return cachedFetch(`notifications:${currentId || currentEmail}:${currentRole}`, () =>
    _fetchNotificationsForUserUncached(user, currentId, currentEmail, currentRole),
  2500);
}

async function _fetchNotificationsForUserUncached(user, currentId, currentEmail, currentRole) {
  let remoteItems = [];
  let isDbSuccess = false;

  // 1. Fetch from Supabase (if connected)
  try {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30);
    
    if (currentId) {
      query = query.or(`recipient_id.eq.${currentId},recipient_role.eq.${currentRole}`);
    } else if (currentRole) {
      query = query.eq('recipient_role', currentRole);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      remoteItems = data.map(mapNotificationFromDb);
      isDbSuccess = true;
    }
  } catch (err) {
    // Fallback gracefully to local storage
  }

  // 2. Reconcile local cache strictly against Supabase truth when online
  let localList = getLocalNotifications(user);
  const dismissedIds = new Set(getDismissedNotificationIds(user));
  const readIds = new Set(getReadNotificationIds(user));

  let allNotifications = [];
  if (isDbSuccess) {
    // Keep only non-deleted local synthetic starter notifications; drop all stale operational notifications
    const localStarterOnly = localList.filter(
      (n) => n?.type === 'system' && (!n.recipientId || n.recipientId === currentId || n.recipientId === currentEmail)
    );
    const map = new Map();
    for (const item of localStarterOnly) {
      if (item?.id) {
        map.set(item.id, readIds.has(item.id) ? { ...item, isRead: true } : item);
      }
    }
    // Insert remote Supabase rows last, while preserving local read flags
    for (const item of remoteItems) {
      if (item?.id) {
        map.set(item.id, readIds.has(item.id) ? { ...item, isRead: true } : item);
      }
    }
    allNotifications = Array.from(map.values());
    saveLocalNotifications(allNotifications, user, false);
  } else {
    // Offline fallback only when Supabase query failed
    allNotifications = localList.map((item) =>
      item?.id && readIds.has(item.id) ? { ...item, isRead: true } : item
    );
  }

  // Live operational alerts for Admin (Freight RFQs, Pending KYC, Escrow/UTR Actions, Open Disputes)
  if (currentRole === 'admin' || currentRole === 'super_admin') {
    try {
      const [rfqRes, kycRes, escrowOrdersRes, disputeOrdersRes] = await Promise.allSettled([
        supabase
          .from('deliveries')
          .select('id, order_number, delivery_number, commodity, quantity, unit, status, freight_amount, quotes_count, rfq_expires_at, created_at')
          .eq('status', 'transport_requested')
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('profiles')
          .select('id, name, role, updated_at, created_at')
          .eq('kyc_status', 'pending')
          .order('updated_at', { ascending: false })
          .limit(15),
        supabase
          .from('orders')
          .select('id, order_number, commodity, buyer_name, total_amount, status, escrow_status, updated_at, created_at')
          .or('escrow_status.eq.pending_verification,status.eq.payment_verification_pending,status.eq.delivered')
          .order('updated_at', { ascending: false })
          .limit(20),
        supabase
          .from('orders')
          .select('id, order_number, commodity, buyer_name, farmer_name, updated_at, created_at')
          .eq('escrow_status', 'disputed')
          .order('updated_at', { ascending: false })
          .limit(15),
      ]);

      const rfqRows = rfqRes.status === 'fulfilled' ? rfqRes.value?.data : [];
      const unquotedRfqs = (Array.isArray(rfqRows) ? rfqRows : [])
        .map((r) => ({
          id: r.id,
          orderNumber: r.order_number,
          deliveryNumber: r.delivery_number,
          commodity: r.commodity,
          quantity: r.quantity,
          unit: r.unit,
          status: r.status,
          freightAmount: r.freight_amount,
          quotesCount: r.quotes_count,
          rfqExpiresAt: r.rfq_expires_at,
          isRfqExpired: r.rfq_expires_at ? new Date(r.rfq_expires_at).getTime() <= Date.now() : false,
          adminEscalated: false,
        }))
        .filter(
          (d) =>
            (!d.freightAmount || Number(d.freightAmount) === 0) &&
            (!d.quotesCount || d.quotesCount === 0)
        );

      const adminAlerts = unquotedRfqs.map((d) => {
        const isEscalated = Boolean(d.isRfqExpired || d.adminEscalated);
        const id = `${isEscalated ? 'admin_rfq_escalated' : 'admin_rfq_pending'}_${d.id}`;
        const rawRef = d.orderNumber || d.deliveryNumber || 'Load';
        const refLabel = d.orderNumber
          ? (String(rawRef).startsWith('#') ? rawRef : `#${rawRef}`)
          : rawRef;
        return {
          id,
          recipientId: null,
          recipientRole: currentRole,
          title: isEscalated
            ? `🚨 30m Freight Escalated: ${refLabel}`
            : `⏳ Freight RFQ Awaiting Quote: ${refLabel}`,
          message: `${d.commodity || 'Produce'} (${d.quantity || 0} ${d.unit || 'Quintal'}) • ${
            isEscalated
              ? 'Assign concierge freight quote now.'
              : '30-min transporter bidding active.'
          }`,
          type: 'delivery',
          link: '/admin-dashboard',
          isRead: readIds.has(id),
          createdAt: (isEscalated && d.rfqExpiresAt) ? d.rfqExpiresAt : (d.createdAt || new Date().toISOString()),
        };
      });

      const kycRows = kycRes.status === 'fulfilled' ? kycRes.value?.data : [];
      for (const p of Array.isArray(kycRows) ? kycRows : []) {
        const id = `admin_kyc_${p.id}`;
        adminAlerts.push({
          id,
          recipientId: null,
          recipientRole: currentRole,
          title: `KYC Review Pending: ${p.name || 'User'}`,
          message: `Role: ${String(p.role || 'user').toUpperCase()} • Review documents & approve account.`,
          type: 'kyc',
          link: '/admin-verification',
          isRead: readIds.has(id),
          createdAt: p.updated_at || p.created_at || new Date().toISOString(),
        });
      }

      const escrowRows = escrowOrdersRes.status === 'fulfilled' ? escrowOrdersRes.value?.data : [];
      for (const o of Array.isArray(escrowRows) ? escrowRows : []) {
        const escrow = String(o.escrow_status || '').toLowerCase();
        if (escrow === 'released' || escrow === 'disputed') continue;
        const id = `admin_escrow_${o.id}`;
        const num = o.order_number || o.id;
        const refLabel = String(num).startsWith('#') ? num : `#${num}`;
        const isUtrPending = escrow === 'pending_verification' || o.status === 'payment_verification_pending';
        adminAlerts.push({
          id,
          recipientId: null,
          recipientRole: currentRole,
          title: isUtrPending ? `UTR Verification Needed: ${refLabel}` : `Call Buyer & Release Escrow: ${refLabel}`,
          message: `${o.commodity || 'Produce'} • Buyer: ${o.buyer_name || 'Buyer'} • ₹${Number(o.total_amount || 0).toLocaleString('en-IN')}`,
          type: 'escrow',
          link: '/admin-escrow',
          isRead: readIds.has(id),
          createdAt: o.updated_at || o.created_at || new Date().toISOString(),
        });
      }

      const disputeRows = disputeOrdersRes.status === 'fulfilled' ? disputeOrdersRes.value?.data : [];
      for (const d of Array.isArray(disputeRows) ? disputeRows : []) {
        const id = `admin_dispute_${d.id}`;
        const num = d.order_number || d.id;
        const refLabel = String(num).startsWith('#') ? num : `#${num}`;
        adminAlerts.push({
          id,
          recipientId: null,
          recipientRole: currentRole,
          title: `Open Escrow Dispute: ${refLabel}`,
          message: `${d.commodity || 'Produce'} • ${d.buyer_name || 'Buyer'} vs ${d.farmer_name || 'Seller'}`,
          type: 'escrow',
          link: '/admin-disputes',
          isRead: readIds.has(id),
          createdAt: d.updated_at || d.created_at || new Date().toISOString(),
        });
      }

      allNotifications = [...adminAlerts, ...allNotifications];
    } catch (err) {
      console.warn('Admin live notification synthesis skipped:', err);
    }
  }

  // Live actionable alerts for Farmer / FPO (pending orders, warehouse quotes, active loan repayments)
  if ((currentRole === 'farmer' || currentRole === 'fpo') && currentId) {
    try {
      const [ordersRes, warehouseRes, loansRes] = await Promise.allSettled([
        supabase
          .from('orders')
          .select('id, order_number, commodity, quantity, unit, status, escrow_status, created_at')
          .eq('farmer_id', currentId)
          .in('status', ['pending', 'pending_confirmation', 'awaiting_confirmation'])
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('warehouse_receipts')
          .select('id, receipt_number, commodity, warehouse_name, storage_fee_monthly, status, updated_at, created_at')
          .eq('farmer_id', currentId)
          .eq('status', 'quote_provided')
          .order('updated_at', { ascending: false })
          .limit(15),
        supabase
          .from('financing_requests')
          .select('id, request_number, approved_amount, requested_amount, repayment_label, status, disbursed_at, updated_at, created_at')
          .eq('applicant_id', currentId)
          .eq('status', 'disbursed')
          .order('disbursed_at', { ascending: false })
          .limit(15),
      ]);

      const farmerAlerts = [];

      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value?.data)) {
        for (const o of ordersRes.value.data) {
          const id = `farmer_pending_order_${o.id}`;
          const num = o.order_number || o.id;
          const refLabel = String(num).startsWith('#') ? num : `#${num}`;
          farmerAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: `Order Awaiting Confirmation: ${refLabel}`,
            message: `${o.commodity || 'Produce'} (${Number(o.quantity || 0).toLocaleString('en-IN')} ${o.unit || 'kg'}) • Review & confirm order.`,
            type: 'order',
            link: '/farmer-orders',
            isRead: readIds.has(id),
            createdAt: o.created_at || new Date().toISOString(),
          });
        }
      }

      if (warehouseRes.status === 'fulfilled' && Array.isArray(warehouseRes.value?.data)) {
        for (const w of warehouseRes.value.data) {
          const id = `farmer_wh_quote_${w.id}`;
          const fee = Number(w.storage_fee_monthly || 0).toLocaleString('en-IN');
          farmerAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: `Storage Quote Ready: ${w.receipt_number || 'Request'}`,
            message: `${w.warehouse_name || 'Warehouse'} quoted ₹${fee}/mo for ${w.commodity || 'produce'}. Approve to proceed.`,
            type: 'escrow',
            link: '/farmer-inventory',
            isRead: readIds.has(id),
            createdAt: w.updated_at || w.created_at || new Date().toISOString(),
          });
        }
      }

      if (loansRes.status === 'fulfilled' && Array.isArray(loansRes.value?.data)) {
        for (const l of loansRes.value.data) {
          const id = `farmer_loan_due_${l.id}`;
          const amt = Number(l.approved_amount || l.requested_amount || 0).toLocaleString('en-IN');
          farmerAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: `Active Loan Repayment: ${l.request_number || 'Facility'}`,
            message: `₹${amt} disbursed (${l.repayment_label || '30 Days Net'}). Tap to view due date or repay.`,
            type: 'financing',
            link: '/farmer-loan-repayments',
            isRead: readIds.has(id),
            createdAt: l.disbursed_at || l.updated_at || l.created_at || new Date().toISOString(),
          });
        }
      }

      if (farmerAlerts.length > 0) {
        allNotifications = [...farmerAlerts, ...allNotifications];
      }
    } catch (err) {
      console.warn('Farmer live notification synthesis skipped:', err);
    }
  }

  // Live actionable alerts for Food Processor (pending sales orders, inbound deliveries, active credit due)
  if (currentRole === 'food_processor' && currentId) {
    try {
      const [salesOrdersRes, inboundDeliveriesRes, creditLoansRes] = await Promise.allSettled([
        supabase
          .from('orders')
          .select('id, order_number, commodity, quantity, unit, status, created_at')
          .eq('farmer_id', currentId)
          .in('status', ['pending', 'pending_confirmation', 'awaiting_confirmation'])
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('deliveries')
          .select('id, delivery_number, order_number, commodity, status, updated_at, created_at')
          .eq('buyer_id', currentId)
          .in('status', ['in_transit', 'out_for_delivery', 'delivered'])
          .order('updated_at', { ascending: false })
          .limit(15),
        supabase
          .from('financing_requests')
          .select('id, request_number, approved_amount, requested_amount, repayment_label, status, disbursed_at, updated_at, created_at')
          .eq('applicant_id', currentId)
          .eq('status', 'disbursed')
          .order('disbursed_at', { ascending: false })
          .limit(15),
      ]);

      const processorAlerts = [];

      if (salesOrdersRes.status === 'fulfilled' && Array.isArray(salesOrdersRes.value?.data)) {
        for (const o of salesOrdersRes.value.data) {
          const id = `processor_sales_order_${o.id}`;
          const num = o.order_number || o.id;
          const refLabel = String(num).startsWith('#') ? num : `#${num}`;
          processorAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: `Processed Order Awaiting Confirmation: ${refLabel}`,
            message: `${o.commodity || 'Processed Goods'} (${Number(o.quantity || 0).toLocaleString('en-IN')} ${o.unit || 'kg'}) • Confirm order to dispatch.`,
            type: 'order',
            link: '/farmer-orders',
            isRead: readIds.has(id),
            createdAt: o.created_at || new Date().toISOString(),
          });
        }
      }

      if (inboundDeliveriesRes.status === 'fulfilled' && Array.isArray(inboundDeliveriesRes.value?.data)) {
        for (const d of inboundDeliveriesRes.value.data) {
          const id = `processor_inbound_delivery_${d.id}`;
          const ref = d.order_number || d.delivery_number || 'Consignment';
          processorAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: d.status === 'delivered' ? `Confirm Arrival & OTP: ${ref}` : `Inbound Crop In Transit: ${ref}`,
            message: `${d.commodity || 'Raw Material'} • ${d.status === 'delivered' ? 'Verify delivery to release escrow.' : 'Track carrier arrival.'}`,
            type: 'delivery',
            link: '/buyer-deliveries',
            isRead: readIds.has(id),
            createdAt: d.updated_at || d.created_at || new Date().toISOString(),
          });
        }
      }

      if (creditLoansRes.status === 'fulfilled' && Array.isArray(creditLoansRes.value?.data)) {
        for (const l of creditLoansRes.value.data) {
          const id = `processor_loan_due_${l.id}`;
          const amt = Number(l.approved_amount || l.requested_amount || 0).toLocaleString('en-IN');
          processorAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: `Trade Credit Repayment: ${l.request_number || 'Facility'}`,
            message: `₹${amt} active (${l.repayment_label || '30 Days Net'}). Tap to view due date or settle.`,
            type: 'financing',
            link: '/buyer-loan-repayments',
            isRead: readIds.has(id),
            createdAt: l.disbursed_at || l.updated_at || l.created_at || new Date().toISOString(),
          });
        }
      }

      if (processorAlerts.length > 0) {
        allNotifications = [...processorAlerts, ...allNotifications];
      }
    } catch (err) {
      console.warn('Food processor live notification synthesis skipped:', err);
    }
  }

  // Live actionable alerts for Buyer (orders awaiting payment, inbound deliveries, active credit due)
  if (currentRole === 'buyer' && currentId) {
    try {
      const [buyerOrdersRes, buyerDeliveriesRes, buyerLoansRes] = await Promise.allSettled([
        supabase
          .from('orders')
          .select('id, order_number, commodity, quantity, unit, status, escrow_status, created_at')
          .eq('buyer_id', currentId)
          .in('status', ['freight_quoted', 'pending'])
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('deliveries')
          .select('id, delivery_number, order_number, commodity, status, updated_at, created_at')
          .eq('buyer_id', currentId)
          .in('status', ['in_transit', 'out_for_delivery', 'delivered'])
          .order('updated_at', { ascending: false })
          .limit(15),
        supabase
          .from('financing_requests')
          .select('id, request_number, approved_amount, requested_amount, repayment_label, status, disbursed_at, updated_at, created_at')
          .eq('applicant_id', currentId)
          .eq('status', 'disbursed')
          .order('disbursed_at', { ascending: false })
          .limit(15),
      ]);

      const buyerAlerts = [];

      if (buyerOrdersRes.status === 'fulfilled' && Array.isArray(buyerOrdersRes.value?.data)) {
        for (const o of buyerOrdersRes.value.data) {
          const escrow = String(o.escrow_status || '').toLowerCase();
          if (['funded', 'escrow_secured', 'escrow_locked', 'locked', 'held', 'released'].includes(escrow)) continue;
          const id = `buyer_order_pay_${o.id}`;
          const num = o.order_number || o.id;
          const refLabel = String(num).startsWith('#') ? num : `#${num}`;
          const isFreightReady = o.status === 'freight_quoted';
          buyerAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: isFreightReady ? `Freight Quoted — Ready to Pay: ${refLabel}` : `Escrow Payment Pending: ${refLabel}`,
            message: `${o.commodity || 'Produce'} (${Number(o.quantity || 0).toLocaleString('en-IN')} ${o.unit || 'kg'}) • ${
              isFreightReady ? 'Review freight quote & lock escrow.' : 'Complete escrow checkout to confirm.'
            }`,
            type: 'escrow',
            link: '/buyer-orders',
            isRead: readIds.has(id),
            createdAt: o.created_at || new Date().toISOString(),
          });
        }
      }

      if (buyerDeliveriesRes.status === 'fulfilled' && Array.isArray(buyerDeliveriesRes.value?.data)) {
        for (const d of buyerDeliveriesRes.value.data) {
          const id = `buyer_delivery_${d.id}`;
          const ref = d.order_number || d.delivery_number || 'Consignment';
          buyerAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: d.status === 'delivered' ? `Confirm Arrival & OTP: ${ref}` : `Inbound Delivery In Transit: ${ref}`,
            message: `${d.commodity || 'Produce'} • ${
              d.status === 'delivered' ? 'Verify delivery to release escrow.' : 'Track live carrier status.'
            }`,
            type: 'delivery',
            link: '/buyer-deliveries',
            isRead: readIds.has(id),
            createdAt: d.updated_at || d.created_at || new Date().toISOString(),
          });
        }
      }

      if (buyerLoansRes.status === 'fulfilled' && Array.isArray(buyerLoansRes.value?.data)) {
        for (const l of buyerLoansRes.value.data) {
          const id = `buyer_loan_due_${l.id}`;
          const amt = Number(l.approved_amount || l.requested_amount || 0).toLocaleString('en-IN');
          buyerAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: `Trade Credit Repayment: ${l.request_number || 'Facility'}`,
            message: `₹${amt} active (${l.repayment_label || '30 Days Net'}). Tap to view due date or repay.`,
            type: 'financing',
            link: '/buyer-loan-repayments',
            isRead: readIds.has(id),
            createdAt: l.disbursed_at || l.updated_at || l.created_at || new Date().toISOString(),
          });
        }
      }

      if (buyerAlerts.length > 0) {
        allNotifications = [...buyerAlerts, ...allNotifications];
      }
    } catch (err) {
      console.warn('Buyer live notification synthesis skipped:', err);
    }
  }

  // Live actionable alerts for Transporter (open freight RFQs + assigned/active trips)
  if (currentRole === 'transporter' && currentId) {
    try {
      const [openLoadsRes, activeTripsRes] = await Promise.allSettled([
        supabase
          .from('deliveries')
          .select('id, delivery_number, order_number, commodity, quantity, unit, status, created_at')
          .eq('status', 'transport_requested')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('deliveries')
          .select('id, delivery_number, order_number, commodity, quantity, unit, status, freight_escrow_status, updated_at, created_at')
          .eq('transporter_id', currentId)
          .in('status', ['assigned', 'picked_up', 'in_transit'])
          .order('updated_at', { ascending: false })
          .limit(15),
      ]);

      const transporterAlerts = [];

      if (openLoadsRes.status === 'fulfilled' && Array.isArray(openLoadsRes.value?.data)) {
        for (const d of openLoadsRes.value.data) {
          const id = `transporter_open_load_${d.id}`;
          const ref = d.delivery_number || d.order_number || 'Load';
          transporterAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: `New Freight Load Open: ${ref}`,
            message: `${d.commodity || 'Produce'} (${Number(d.quantity || 0).toLocaleString('en-IN')} ${d.unit || 'kg'}) • Submit your freight quote.`,
            type: 'delivery',
            link: '/transporter-loads',
            isRead: readIds.has(id),
            createdAt: d.created_at || new Date().toISOString(),
          });
        }
      }

      if (activeTripsRes.status === 'fulfilled' && Array.isArray(activeTripsRes.value?.data)) {
        for (const d of activeTripsRes.value.data) {
          const id = `transporter_trip_${d.id}`;
          const ref = d.delivery_number || d.order_number || 'Trip';
          const statusLabel =
            d.status === 'assigned'
              ? 'Quote accepted — ready for pickup.'
              : d.status === 'picked_up'
              ? 'Picked up — mark in transit.'
              : 'In transit — complete delivery & OTP.';
          transporterAlerts.push({
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: `${d.status === 'assigned' ? 'Assigned Trip Ready' : 'Active Trip'}: ${ref}`,
            message: `${d.commodity || 'Produce'} (${Number(d.quantity || 0).toLocaleString('en-IN')} ${d.unit || 'kg'}) • ${statusLabel}`,
            type: 'delivery',
            link: '/transporter-trips',
            isRead: readIds.has(id),
            createdAt: d.updated_at || d.created_at || new Date().toISOString(),
          });
        }
      }

      if (transporterAlerts.length > 0) {
        allNotifications = [...transporterAlerts, ...allNotifications];
      }
    } catch (err) {
      console.warn('Transporter live notification synthesis skipped:', err);
    }
  }

  // Live actionable alerts for Warehouse (new deposit quote requests + incoming gate-in lots)
  if (currentRole === 'warehouse' && currentId) {
    try {
      const { data: whRows } = await supabase
        .from('warehouse_receipts')
        .select('id, receipt_number, farmer_name, commodity, total_quantity, unit, status, updated_at, created_at')
        .eq('warehouse_id', currentId)
        .in('status', ['quote_requested', 'in_transit'])
        .order('updated_at', { ascending: false })
        .limit(20);

      const warehouseAlerts = (Array.isArray(whRows) ? whRows : []).map((w) => {
        const isQuoteReq = w.status === 'quote_requested';
        const id = `${isQuoteReq ? 'warehouse_quote_req' : 'warehouse_gate_in'}_${w.id}`;
        const ref = w.receipt_number || 'Request';
        const qty = `${Number(w.total_quantity || 0).toLocaleString('en-IN')} ${w.unit || 'kg'}`;
        return {
          id,
          recipientId: currentId,
          recipientRole: currentRole,
          title: isQuoteReq ? `New Storage Quote Request: ${ref}` : `Incoming Lot — Gate-In Pending: ${ref}`,
          message: `${w.commodity || 'Produce'} (${qty}) from ${w.farmer_name || 'Farmer'} • ${
            isQuoteReq ? 'Review & send monthly rent quote.' : 'Verify arrival & issue e-NWR.'
          }`,
          type: isQuoteReq ? 'order' : 'delivery',
          link: '/warehouse-requests',
          isRead: readIds.has(id),
          createdAt: w.updated_at || w.created_at || new Date().toISOString(),
        };
      });

      if (warehouseAlerts.length > 0) {
        allNotifications = [...warehouseAlerts, ...allNotifications];
      }
    } catch (err) {
      console.warn('Warehouse live notification synthesis skipped:', err);
    }
  }

  // Live actionable alerts for Financier (new credit requests + borrower-accepted loans ready to disburse)
  if (currentRole === 'financier' && currentId) {
    try {
      const { data: finRows } = await supabase
        .from('financing_requests')
        .select('id, request_number, applicant_name, applicant_role, commodity, requested_amount, approved_amount, financier_id, review_notes, status, updated_at, created_at')
        .in('status', ['pending', 'under_review', 'submitted', 'borrower_accepted'])
        .order('updated_at', { ascending: false })
        .limit(20);

      const financierAlerts = (Array.isArray(finRows) ? finRows : [])
        .filter((l) => {
          if (l.financier_id && String(l.financier_id).toLowerCase() !== currentId) return false;
          if (l.review_notes && typeof l.review_notes === 'string' && l.review_notes.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(l.review_notes);
              const declined = Array.isArray(parsed?.declinedByFinanciers) ? parsed.declinedByFinanciers : [];
              const passedByMe = declined.some(
                (d) =>
                  (currentId && String(d?.financierId || '').trim().toLowerCase() === currentId) ||
                  (currentEmail && String(d?.financierEmail || '').trim().toLowerCase() === currentEmail)
              );
              if (passedByMe) return false;
            } catch {}
          }
          return true;
        })
        .map((l) => {
          const isReadyToDisburse = l.status === 'borrower_accepted';
          const id = `${isReadyToDisburse ? 'financier_disburse' : 'financier_review'}_${l.id}`;
          const amt = Number(l.approved_amount || l.requested_amount || 0).toLocaleString('en-IN');
          return {
            id,
            recipientId: currentId,
            recipientRole: currentRole,
            title: isReadyToDisburse
              ? `Terms Accepted — Disburse: ${l.request_number || 'Loan'}`
              : `New Credit Request: ${l.request_number || 'Loan'}`,
            message: `${l.applicant_name || 'Applicant'} (${l.applicant_role || 'user'}) • ₹${amt}${l.commodity ? ` for ${l.commodity}` : ''}`,
            type: 'financing',
            link: '/financier-underwriting',
            isRead: readIds.has(id),
            createdAt: l.updated_at || l.created_at || new Date().toISOString(),
          };
        });

      if (financierAlerts.length > 0) {
        allNotifications = [...financierAlerts, ...allNotifications];
      }
    } catch (err) {
      console.warn('Financier live notification synthesis skipped:', err);
    }
  }

  // Filter out any dismissed items first
  allNotifications = allNotifications.filter((n) => !dismissedIds.has(n.id));

  // Seed starter role notifications ONLY ONCE per user account
  const seedKey = `${currentId || currentEmail || 'user'}_${currentRole || 'all'}`;
  if (!isRoleSeeded(seedKey, user)) {
    const starters = getRoleStarterNotifications(user).filter((n) => !dismissedIds.has(String(n.id)));
    if (starters.length > 0) {
      allNotifications = [...starters, ...allNotifications];
      saveLocalNotifications(allNotifications, user, false);
    }
    markRoleSeeded(seedKey, user);
  }

  // Re-read latest read/dismissed IDs (in case markAsRead ran while async queries were in-flight)
  const latestReadIds = new Set(getReadNotificationIds(user).map(String));
  const latestDismissedIds = new Set(getDismissedNotificationIds(user).map(String));
  const readBeforeTs = getMarkAllReadTimestamp(user);

  // Strict zero-conflict filtering & deduplication by id
  const dedupedMap = new Map();
  for (const n of allNotifications) {
    if (!n || !n.id) continue;
    const strId = String(n.id);
    if (latestDismissedIds.has(strId)) continue;

    const rId = n.recipientId ? String(n.recipientId).toLowerCase() : '';
    const rRole = n.recipientRole ? String(n.recipientRole).toLowerCase() : '';

    let matchesUser = false;
    if (rId) {
      matchesUser = rId === currentId || Boolean(currentEmail && rId === currentEmail);
    } else if (rRole) {
      matchesUser = rRole === currentRole;
    }
    if (!matchesUser) continue;

    const createdMs = n.createdAt ? new Date(n.createdAt).getTime() : 0;
    const isReadByTimestamp = readBeforeTs > 0 && (!createdMs || isNaN(createdMs) || createdMs <= readBeforeTs + 5000);
    const resolvedIsRead = Boolean(n.isRead || latestReadIds.has(strId) || isReadByTimestamp);
    const existing = dedupedMap.get(strId);
    if (!existing) {
      dedupedMap.set(strId, { ...n, isRead: resolvedIsRead });
    } else if (resolvedIsRead && !existing.isRead) {
      dedupedMap.set(strId, { ...existing, isRead: true });
    }
  }

  return Array.from(dedupedMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Send a strictly targeted notification to a specific user/role
 */
export async function sendNotification({
  recipientId = null,
  recipientRole = null,
  title = '',
  message = '',
  type = 'order',
  link = '',
  actionPayload = {},
}) {
  const newNotif = {
    id: generateId(),
    recipientId: recipientId ? String(recipientId) : null,
    recipientRole: recipientRole ? String(recipientRole).toLowerCase() : null,
    title,
    message,
    type,
    link,
    actionPayload,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  const current = getLocalNotifications();
  const updated = [newNotif, ...current.filter((n) => n.id !== newNotif.id)];
  saveLocalNotifications(updated);

  broadcastDataChange('notifications', 'INSERT', newNotif);

  try {
    await supabase.from('notifications').insert({
      id: newNotif.id,
      recipient_id: newNotif.recipientId,
      recipient_role: newNotif.recipientRole,
      title: newNotif.title,
      message: newNotif.message,
      type: newNotif.type,
      link: newNotif.link,
      action_payload: newNotif.actionPayload,
      is_read: false,
      created_at: newNotif.createdAt,
    });
  } catch (err) {
    console.warn('Supabase remote notification dispatch notice:', err);
  }

  return newNotif;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId, user = null) {
  if (!notificationId) return;

  saveReadNotificationId(notificationId, user);

  const current = getLocalNotifications(user);
  const updated = current.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
  saveLocalNotifications(updated, user, false);

  if (isPersistedNotificationId(notificationId)) {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    } catch {}
  }

  saveLocalNotifications(updated, user, true);
  broadcastDataChange('notifications', 'UPDATE', { id: notificationId, isRead: true });
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(user, currentList = null) {
  if (!user) return;
  const currentId = user.id ? String(user.id).toLowerCase() : '';
  const currentEmail = user.email ? String(user.email).toLowerCase() : '';
  const currentRole = user.role ? String(user.role).toLowerCase() : '';

  const current = getLocalNotifications(user);
  const updated = current.map((n) => {
    const rId = n.recipientId ? String(n.recipientId).toLowerCase() : '';
    const rRole = n.recipientRole ? String(n.recipientRole).toLowerCase() : '';
    if ((currentId && rId === currentId) || (currentEmail && rId === currentEmail) || (!rId && rRole === currentRole)) {
      return { ...n, isRead: true };
    }
    return n;
  });

  const activeItems = Array.isArray(currentList)
    ? currentList
    : await getNotificationsForUser(user);

  const idsToMark = Array.from(
    new Set([
      ...updated.filter((n) => n.isRead).map((n) => n.id),
      ...activeItems.map((n) => n.id),
    ].filter(Boolean))
  );

  saveMarkAllReadTimestamp(Date.now(), user);
  saveReadNotificationIds(idsToMark, user);
  saveLocalNotifications(updated, user, false);

  const persistedIds = idsToMark.filter(isPersistedNotificationId);

  try {
    const dbUpdates = [];
    if (user.id) {
      dbUpdates.push(supabase.from('notifications').update({ is_read: true }).eq('recipient_id', user.id));
    }
    if (persistedIds.length > 0) {
      dbUpdates.push(supabase.from('notifications').update({ is_read: true }).in('id', persistedIds));
    }
    if (dbUpdates.length > 0) {
      await Promise.allSettled(dbUpdates);
    }
  } catch {}

  saveLocalNotifications(updated, user, true);
  broadcastDataChange('notifications', 'MARK_ALL_READ', { userId: user.id });
}

/**
 * Delete / Dismiss a single notification permanently
 */
export async function deleteNotification(notificationId, user = null) {
  if (!notificationId) return;

  saveDismissedNotificationId(notificationId, user);

  const current = getLocalNotifications(user);
  const updated = current.filter((n) => n.id !== notificationId);
  saveLocalNotifications(updated, user);

  broadcastDataChange('notifications', 'DELETE', { id: notificationId });

  if (isPersistedNotificationId(notificationId)) {
    try {
      await supabase.from('notifications').delete().eq('id', notificationId);
    } catch {}
  }
}

/**
 * Clear all notifications for the current user permanently
 */
export async function clearAllNotifications(user) {
  if (!user) return;
  const currentId = user.id ? String(user.id).toLowerCase() : '';
  const currentEmail = user.email ? String(user.email).toLowerCase() : '';
  const currentRole = user.role ? String(user.role).toLowerCase() : '';

  const current = getLocalNotifications(user);
  const remaining = [];

  for (const n of current) {
    const rId = n.recipientId ? String(n.recipientId).toLowerCase() : '';
    const rRole = n.recipientRole ? String(n.recipientRole).toLowerCase() : '';
    const isTarget = (currentId && rId === currentId) || (currentEmail && rId === currentEmail) || (!rId && rRole === currentRole);

    if (isTarget) {
      saveDismissedNotificationId(n.id, user);
    } else {
      remaining.push(n);
    }
  }

  saveLocalNotifications(remaining, user);

  if (['admin', 'super_admin', 'farmer', 'fpo', 'food_processor', 'buyer', 'transporter', 'warehouse', 'financier'].includes(currentRole)) {
    const allForUser = await getNotificationsForUser(user);
    allForUser.forEach((n) => saveDismissedNotificationId(n.id, user));
  }

  broadcastDataChange('notifications', 'CLEAR_ALL', { userId: user.id });

  try {
    if (user.id) {
      await supabase.from('notifications').delete().eq('recipient_id', user.id);
    }
  } catch {}
}

// Setup Supabase Realtime Subscription for Notifications Table
if (typeof window !== 'undefined') {
  try {
    supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        invalidateCache('notifications:');
        if (payload.new) {
          const mapped = mapNotificationFromDb(payload.new);
          if (!mapped) return;

          // Privacy Guard: Only persist to local storage if notification matches active user session
          let activeUser = null;
          try {
            const rawUser = localStorage.getItem('agrolnkUser') || localStorage.getItem('agrolnk_current_user');
            if (rawUser) activeUser = JSON.parse(rawUser);
          } catch {}

          if (activeUser) {
            const currentId = activeUser.id ? String(activeUser.id).toLowerCase() : '';
            const currentEmail = activeUser.email ? String(activeUser.email).toLowerCase() : '';
            const currentRole = activeUser.role ? String(activeUser.role).toLowerCase() : '';
            const rId = mapped.recipientId ? String(mapped.recipientId).toLowerCase() : '';
            const rRole = mapped.recipientRole ? String(mapped.recipientRole).toLowerCase() : '';

            const isTarget =
              (rId && (rId === currentId || (currentEmail && rId === currentEmail))) ||
              (!rId && rRole && rRole === currentRole);

            if (!isTarget && activeUser.role !== 'admin') {
              return; // Do not write other users' notifications to this client's storage
            }
          }

          const readIds = new Set(getReadNotificationIds(activeUser));
          const normalizedMapped = readIds.has(mapped.id) ? { ...mapped, isRead: true } : mapped;
          const current = getLocalNotifications(activeUser);
          const updated = [normalizedMapped, ...current.filter((n) => n.id !== normalizedMapped.id)];
          saveLocalNotifications(updated, activeUser);
          broadcastDataChange('notifications', payload.eventType || 'INSERT', normalizedMapped);
        }
      })
      .subscribe();
  } catch (e) {
    console.info('Supabase Realtime for notifications initialized');
  }
}
