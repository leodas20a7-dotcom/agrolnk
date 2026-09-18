// Agrolnk Strict Role-Based & Conflict-Free Notification Engine (100% Free)
import { supabase } from '../lib/supabase';
import { broadcastDataChange, subscribeToCrossTabSync } from './syncChannel';

const LOCAL_NOTIFICATIONS_KEY = 'agrolnk_user_notifications';

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
 * Get all stored local notifications
 */
export function getLocalNotifications() {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save notifications list to localStorage and dispatch local event
 */
function saveLocalNotifications(list) {
  try {
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_notifications_updated', { detail: list }));
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

  if (role === 'farmer') {
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
    }
  } catch (err) {
    // Fallback gracefully to local storage
  }

  // 2. Fetch local storage items
  const localList = getLocalNotifications();

  // Merge and deduplicate by ID
  const map = new Map();
  for (const item of [...remoteItems, ...localList]) {
    if (!item || !item.id) continue;
    map.set(item.id, item);
  }

  let allNotifications = Array.from(map.values());

  // If completely empty for this user, seed starter role notifications in-memory
  const userHasNotifications = allNotifications.some((n) => {
    const rId = n.recipientId ? String(n.recipientId).toLowerCase() : '';
    const rRole = n.recipientRole ? String(n.recipientRole).toLowerCase() : '';
    return (currentId && rId === currentId) || (rRole === currentRole);
  });

  if (!userHasNotifications) {
    const starters = getRoleStarterNotifications(user);
    if (starters.length > 0) {
      allNotifications = [...starters, ...allNotifications];
      // Save quietly to local storage without re-triggering event loop
      try {
        localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(allNotifications));
      } catch {}
    }
  }

  // Strict zero-conflict filtering
  const userSpecificList = allNotifications.filter((n) => {
    if (!n) return false;
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
  title,
  message,
  type = 'general',
  link = '',
  actionPayload = {},
}) {
  if (!title || !message) return null;

  const notifId = generateId();
  const newNotif = {
    id: notifId,
    recipientId: recipientId || null,
    recipientRole: recipientRole || null,
    title: title.trim(),
    message: message.trim(),
    type,
    link,
    actionPayload,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  // 1. Save locally
  const current = getLocalNotifications();
  const updated = [newNotif, ...current.filter((n) => n.id !== notifId)];
  saveLocalNotifications(updated);

  // 2. Broadcast across tabs and active window
  broadcastDataChange('notifications', 'INSERT', newNotif);

  // 3. Persist to Supabase in background
  try {
    const dbRow = {
      id: notifId,
      recipient_id: recipientId || null,
      recipient_role: recipientRole || null,
      title: newNotif.title,
      message: newNotif.message,
      type: newNotif.type,
      link: newNotif.link,
      is_read: false,
      created_at: newNotif.createdAt,
    };

    await supabase.from('notifications').insert([dbRow]);
  } catch (err) {
    console.warn('Supabase notification sync notice:', err);
  }

  return newNotif;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId, user) {
  if (!notificationId) return;

  const current = getLocalNotifications();
  const updated = current.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
  saveLocalNotifications(updated);

  broadcastDataChange('notifications', 'UPDATE', { id: notificationId, isRead: true });

  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  } catch {}
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(user) {
  if (!user) return;
  const currentId = user.id ? String(user.id).toLowerCase() : '';
  const currentRole = user.role ? String(user.role).toLowerCase() : '';

  const current = getLocalNotifications();
  const updated = current.map((n) => {
    const rId = n.recipientId ? String(n.recipientId).toLowerCase() : '';
    const rRole = n.recipientRole ? String(n.recipientRole).toLowerCase() : '';
    if ((currentId && rId === currentId) || (!rId && rRole === currentRole)) {
      return { ...n, isRead: true };
    }
    return n;
  });

  saveLocalNotifications(updated);
  broadcastDataChange('notifications', 'MARK_ALL_READ', { userId: user.id });

  try {
    if (user.id) {
      await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', user.id);
    }
  } catch {}
}

/**
 * Delete / Clear a single notification
 */
export async function deleteNotification(notificationId) {
  if (!notificationId) return;

  const current = getLocalNotifications();
  const updated = current.filter((n) => n.id !== notificationId);
  saveLocalNotifications(updated);

  broadcastDataChange('notifications', 'DELETE', { id: notificationId });

  try {
    await supabase.from('notifications').delete().eq('id', notificationId);
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
