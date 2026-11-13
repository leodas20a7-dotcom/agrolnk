// AgroLnk Strict Role-Based & Conflict-Free Notification Engine (100% Free)
import { supabase } from '../lib/supabase';
import { broadcastDataChange, subscribeToCrossTabSync } from './syncChannel';

const LOCAL_NOTIFICATIONS_KEY = 'agrolnk_user_notifications';
const DISMISSED_NOTIFICATIONS_KEY = 'agrolnk_dismissed_notifications';
const READ_NOTIFICATIONS_KEY = 'agrolnk_read_notifications';
const SEEDED_ROLES_KEY = 'agrolnk_seeded_user_roles';

function getActiveNotificationOwner(explicitUser = null) {
  try {
    if (explicitUser && (explicitUser.id || explicitUser.email)) {
      return String(explicitUser.id || explicitUser.email).toLowerCase();
    }
    const raw =
      (typeof localStorage !== 'undefined' &&
        (localStorage.getItem('agrolnkUser') || localStorage.getItem('agrolnk_current_user'))) ||
      null;
    if (!raw) return 'anon';
    const parsed = JSON.parse(raw);
    return String(parsed?.id || parsed?.email || 'anon').toLowerCase();
  } catch {
    return 'anon';
  }
}

function readScopedIdArray(storageKey, explicitUser = null) {
  try {
    const ownerId = getActiveNotificationOwner(explicitUser);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Discard legacy unscoped arrays so previous accounts' flags do not carry over
      localStorage.removeItem(storageKey);
      return [];
    }
    if (!parsed || typeof parsed !== 'object' || parsed.ownerId !== ownerId) {
      return [];
    }
    return Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch {
    return [];
  }
}

function saveScopedId(storageKey, id, explicitUser = null) {
  if (!id) return;
  try {
    const ownerId = getActiveNotificationOwner(explicitUser);
    const list = readScopedIdArray(storageKey, explicitUser);
    if (!list.includes(id)) {
      localStorage.setItem(storageKey, JSON.stringify({ ownerId, ids: [...list, id] }));
    }
  } catch {}
}

function getReadNotificationIds(explicitUser = null) {
  return readScopedIdArray(READ_NOTIFICATIONS_KEY, explicitUser);
}

function saveReadNotificationId(id, explicitUser = null) {
  saveScopedId(READ_NOTIFICATIONS_KEY, id, explicitUser);
}

export function getDismissedNotificationIds(explicitUser = null) {
  return readScopedIdArray(DISMISSED_NOTIFICATIONS_KEY, explicitUser);
}

export function saveDismissedNotificationId(id, explicitUser = null) {
  saveScopedId(DISMISSED_NOTIFICATIONS_KEY, id, explicitUser);
}

export function isRoleSeeded(seedKey) {
  return readScopedIdArray(SEEDED_ROLES_KEY).includes(seedKey);
}

export function markRoleSeeded(seedKey) {
  saveScopedId(SEEDED_ROLES_KEY, seedKey);
}

function isPersistedNotificationId(id) {
  if (!id) return false;
  const s = String(id);
  return !s.startsWith('seed_') && !s.startsWith('admin_rfq_');
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      localStorage.removeItem(LOCAL_NOTIFICATIONS_KEY);
      return [];
    }
    if (!parsed || typeof parsed !== 'object' || parsed.ownerId !== ownerId) {
      return [];
    }
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

/**
 * Save notifications list to user-scoped localStorage and dispatch local event
 */
function saveLocalNotifications(list, explicitUser = null) {
  try {
    const ownerId = getActiveNotificationOwner(explicitUser);
    const normalized = Array.isArray(list) ? list : [];
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify({ ownerId, items: normalized }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_notifications_updated', { detail: normalized }));
    }
  } catch (err) {
    console.warn('Failed to save local notifications:', err);
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
      if (item?.id) map.set(item.id, item);
    }
    // Insert remote Supabase rows last so authoritative server state (isRead, text, existence) wins unconditionally
    for (const item of remoteItems) {
      if (item?.id) map.set(item.id, item);
    }
    allNotifications = Array.from(map.values());
    saveLocalNotifications(allNotifications, user);
  } else {
    // Offline fallback only when Supabase query failed
    allNotifications = localList;
  }

  // Live operational alerts for Admin (e.g., 30-Min Freight RFQ escalations & active RFQs)
  if (currentRole === 'admin' || currentRole === 'super_admin') {
    try {
      const { getDeliveries } = await import('./deliveries');
      const deliveries = await getDeliveries();
      const unquotedRfqs = (Array.isArray(deliveries) ? deliveries : []).filter(
        (d) =>
          d.status === 'transport_requested' &&
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
          message: `${d.cropName || 'Produce'} (${d.quantity || 0} ${d.unit || 'Quintal'}) • ${
            isEscalated
              ? `Call buyer ${d.buyerName || ''}${d.buyerPhone ? ` (${d.buyerPhone})` : ''} & assign concierge quote.`
              : '30-min transporter bidding active.'
          }`,
          type: 'delivery',
          link: '/admin-dashboard',
          isRead: readIds.has(id),
          createdAt: (isEscalated && d.rfqExpiresAt) ? d.rfqExpiresAt : (d.createdAt || new Date().toISOString()),
        };
      });

      allNotifications = [...adminAlerts, ...allNotifications];
    } catch (err) {
      console.warn('Admin live notification synthesis skipped:', err);
    }
  }

  // Filter out any dismissed items first
  allNotifications = allNotifications.filter((n) => !dismissedIds.has(n.id));

  // Seed starter role notifications ONLY ONCE per user account
  const seedKey = `${currentId || currentEmail || 'user'}_${currentRole || 'all'}`;
  if (!isRoleSeeded(seedKey)) {
    const starters = getRoleStarterNotifications(user).filter((n) => !dismissedIds.has(n.id));
    if (starters.length > 0) {
      allNotifications = [...starters, ...allNotifications];
      saveLocalNotifications(allNotifications, user);
    }
    markRoleSeeded(seedKey);
  }

  // Strict zero-conflict filtering
  const userSpecificList = allNotifications.filter((n) => {
    if (!n || dismissedIds.has(n.id)) return false;
    const rId = n.recipientId ? String(n.recipientId).toLowerCase() : '';
    const rRole = n.recipientRole ? String(n.recipientRole).toLowerCase() : '';

    // If notification specifies a recipientId, it MUST match the current user ID or email
    if (rId) {
      return rId === currentId || (currentEmail && rId === currentEmail);
    }

    // Otherwise, if broadcast to role, recipientRole MUST match
    if (rRole) {
      return rRole === currentRole;
    }

    return false;
  });

  // Sort descending by date
  return userSpecificList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
  saveLocalNotifications(updated, user);

  broadcastDataChange('notifications', 'UPDATE', { id: notificationId, isRead: true });

  if (isPersistedNotificationId(notificationId)) {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    } catch {}
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(user) {
  if (!user) return;
  const currentId = user.id ? String(user.id).toLowerCase() : '';
  const currentEmail = user.email ? String(user.email).toLowerCase() : '';
  const currentRole = user.role ? String(user.role).toLowerCase() : '';

  const current = getLocalNotifications();
  const updated = current.map((n) => {
    const rId = n.recipientId ? String(n.recipientId).toLowerCase() : '';
    const rRole = n.recipientRole ? String(n.recipientRole).toLowerCase() : '';
    if ((currentId && rId === currentId) || (currentEmail && rId === currentEmail) || (!rId && rRole === currentRole)) {
      return { ...n, isRead: true };
    }
    return n;
  });

  saveLocalNotifications(updated);

  if (currentRole === 'admin' || currentRole === 'super_admin') {
    const allForUser = await getNotificationsForUser(user);
    allForUser.forEach((n) => saveReadNotificationId(n.id));
  }

  broadcastDataChange('notifications', 'MARK_ALL_READ', { userId: user.id });

  try {
    if (user.id) {
      await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', user.id);
    }
  } catch {}
}

/**
 * Delete / Dismiss a single notification permanently
 */
export async function deleteNotification(notificationId) {
  if (!notificationId) return;

  saveDismissedNotificationId(notificationId);

  const current = getLocalNotifications();
  const updated = current.filter((n) => n.id !== notificationId);
  saveLocalNotifications(updated);

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

  const current = getLocalNotifications();
  const remaining = [];

  for (const n of current) {
    const rId = n.recipientId ? String(n.recipientId).toLowerCase() : '';
    const rRole = n.recipientRole ? String(n.recipientRole).toLowerCase() : '';
    const isTarget = (currentId && rId === currentId) || (currentEmail && rId === currentEmail) || (!rId && rRole === currentRole);

    if (isTarget) {
      saveDismissedNotificationId(n.id);
    } else {
      remaining.push(n);
    }
  }

  saveLocalNotifications(remaining);

  if (currentRole === 'admin' || currentRole === 'super_admin') {
    const allForUser = await getNotificationsForUser(user);
    allForUser.forEach((n) => saveDismissedNotificationId(n.id));
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

          const current = getLocalNotifications();
          const updated = [mapped, ...current.filter((n) => n.id !== mapped.id)];
          saveLocalNotifications(updated);
          broadcastDataChange('notifications', payload.eventType || 'INSERT', mapped);
        }
      })
      .subscribe();
  } catch (e) {
    console.info('Supabase Realtime for notifications initialized');
  }
}
