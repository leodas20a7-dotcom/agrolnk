// AgroLnk Privacy-Preserving Communication & Anti-Circumvention Engine
// Requirement: Users can communicate while phone numbers, emails, domain fragments, 
// spelled-out words, and split-message contact exchanges are strictly detected and protected.

import { supabase } from '../lib/supabase';

const CHAT_STORAGE_KEY = 'agrolnk_chat_threads_v4';

// Comprehensive multilingual number words (English, Hindi/Hinglish, Tamil/Tanglish)
const NUMBER_WORDS_MAP = {
  // English
  'zero': '0', 'oh': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
  
  // Hindi & Hinglish
  'shunya': '0', 'soonya': '0', 'ek': '1', 'do': '2', 'doh': '2', 'teen': '3',
  'char': '4', 'chaar': '4', 'paanch': '5', 'panch': '5', 'chhah': '6', 'che': '6',
  'chhe': '6', 'saat': '7', 'saath': '7', 'aath': '8', 'ath': '8', 'nau': '9',
  'no': '9', 'das': '10',

  // Tamil & Tanglish
  'poojiyam': '0', 'suzhyam': '0', 'ondru': '1', 'onnu': '1', 'irandu': '2',
  'rendu': '2', 'moondru': '3', 'moonu': '3', 'naangu': '4', 'naalu': '4',
  'aindhu': '5', 'anchu': '5', 'anju': '5', 'aaru': '6', 'ezhu': '7',
  'yezhu': '7', 'ettu': '8', 'onbadhu': '9', 'ombodhu': '9', 'pathu': '10'
};

const MULTIPLIERS = {
  'double': 2,
  'triple': 3,
  'quadruple': 4
};

const DOMAIN_KEYWORDS = [
  'gmail', 'yahoo', 'outlook', 'hotmail', 'rediffmail', 'rediff',
  'icloud', 'protonmail', 'proton', 'ymail', 'zoho', 'zohomail',
  'mail.com', 'dot com', 'dot in', 'dot net', 'dot org', '@gmail',
  '@yahoo', '@outlook', '@hotmail', '@icloud'
];

const CONTACT_INTENT_KEYWORDS = [
  'call me', 'call us', 'call', 'contact me', 'whatsapp', 'watsapp',
  'watsap', 'whatsap', 'ping me', 'reach me', 'ph no', 'phone no',
  'phone number', 'mob no', 'mobile no', 'mobile number', 'gpay',
  'phonepe', 'paytm', 'dial', 'ring me', 'msg me', 'dm me'
];

const COMMODITY_WHITELIST_REGEX = /\b(kg|kgs|quintal|quintals|ton|tons|tonnes|mt|₹|rs|inr|\/kg|\/quintal|\/ton|bags|crates|acre|acres|grade\s+[a-c]|lot\s+\d+|moisture|order\s*#?|agm-\d+)\b/i;

/**
 * Expand multi-word multipliers like "double nine" -> "99", "triple eight" -> "888"
 */
function expandMultipliers(text) {
  if (!text) return '';
  let result = text.toLowerCase();

  // Handle "double <word/digit>" and "triple <word/digit>"
  const multiplierRegex = /\b(double|triple|quadruple)\s+([a-z0-9]+)\b/gi;
  result = result.replace(multiplierRegex, (_match, mult, target) => {
    const count = MULTIPLIERS[mult.toLowerCase()] || 1;
    const digitOrWord = NUMBER_WORDS_MAP[target.toLowerCase()] || target;
    return digitOrWord.repeat(count);
  });

  return result;
}

/**
 * Normalize written words, multipliers, and leetspeak into digit strings
 */
export function normalizeWordNumbers(text) {
  if (!text) return '';
  let normalized = expandMultipliers(text);

  // Replace spelled-out number words with single digits
  for (const [word, digit] of Object.entries(NUMBER_WORDS_MAP)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(reg, digit);
  }

  return normalized;
}

/**
 * Counts how many spelled-out number words are in the text
 */
function countNumberWords(text) {
  if (!text) return 0;
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  let count = 0;
  for (const w of words) {
    if (NUMBER_WORDS_MAP[w]) count++;
  }
  return count;
}

/**
 * Check if the text is a legitimate agricultural trade message (price quote / weight / lot)
 */
export function isTradeContext(text) {
  if (!text) return false;
  return COMMODITY_WHITELIST_REGEX.test(text);
}

/**
 * Filter out single-message PII (Obfuscated phones, Spelled words, Emails, IFSC, Domain fragments, 5+ digit sequences)
 */
export function maskSensitivePII(text) {
  if (!text || typeof text !== 'string') return '';

  let masked = text;
  const lower = text.toLowerCase().trim();

  // 1. Check for standalone or partial domain keywords (e.g. "gmail", "yahoo", "@gmail.com", "dot com")
  for (const domain of DOMAIN_KEYWORDS) {
    const domainRegex = new RegExp(`\\b${domain}\\b|@${domain}`, 'i');
    if (domainRegex.test(masked)) {
      masked = masked.replace(domainRegex, '[Protected Domain]');
    }
  }

  // 2. Check for Spelled-Out Number Sequences (e.g. "eight nine two four three two double nine four")
  const numberWordCount = countNumberWords(text);
  if (numberWordCount >= 6 && !isTradeContext(text)) {
    return '[Protected Contact - Spelled-Out Number Detected]';
  }

  // 3. Normalize word-numbers and multipliers to test converted phone strings
  const normalized = normalizeWordNumbers(masked);
  const normalizedDigitsOnly = normalized.replace(/\D/g, '');
  if ((normalizedDigitsOnly.length === 10 || (normalizedDigitsOnly.length > 10 && /^[6-9]/.test(normalizedDigitsOnly.slice(-10)))) && !isTradeContext(text)) {
    // If normalized string forms a 10-digit mobile number, mask it
    if (numberWordCount >= 4) {
      return '[Protected Contact - Spelled-Out Number Detected]';
    }
  }

  // 4. Contact Intent Keywords + Numbers (e.g. "call me at ...", "whatsapp ...", "ph no 98...")
  const hasContactIntent = CONTACT_INTENT_KEYWORDS.some(kw => lower.includes(kw));
  if (hasContactIntent && !isTradeContext(text)) {
    const digitsInMessage = normalized.replace(/\D/g, '');
    if (digitsInMessage.length >= 4 || numberWordCount >= 3) {
      return '[Protected Contact - Direct Contact Request Blocked]';
    }
  }

  // 5. Normalize spaced or separated numbers (e.g. "9 8 7 5 5 6 7 8 9 0", "9-8-7-5-5-6-7-8-9-0", "9.8.7.5.5")
  const separatedPhoneRegex = /(?:\+?91[\s.-]?)?([6-9])[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)/g;
  masked = masked.replace(separatedPhoneRegex, (_m, p1, p2, _p3, _p4, _p5, _p6, _p7, _p8, p9, p10) => {
    return `${p1}${p2}*** ***${p9}${p10} [Protected Phone]`;
  });

  // 6. Mask standard 10-digit Indian numbers (e.g. 9840123456, +91 9840123456)
  const phoneRegex = /(\+?91[\s-]?)?([6-9]\d{2})[\s-]?(\d{3})[\s-]?(\d{4})/g;
  masked = masked.replace(phoneRegex, (_match, p1, p2, _p3, p4) => {
    return `${p1 || ''}${p2}*** ***${p4.slice(-2)} [Protected Phone]`;
  });

  // 7. Mask 5-to-9 consecutive standalone digits if sent without commodity context (e.g. "98755", "67890")
  if (!isTradeContext(masked)) {
    const splitChunkRegex = /\b\d{5,9}\b/g;
    masked = masked.replace(splitChunkRegex, (match) => {
      return `${match.slice(0, 2)}*** [Protected Fragment]`;
    });
  }

  // 8. Mask email addresses (e.g. user@gmail.com -> u***@gmail.com)
  const emailRegex = /([a-zA-Z0-9_.+-]+)\s*(@|at|\(at\))\s*([a-zA-Z0-9-]+\s*(\.|\(dot\)|dot)\s*[a-zA-Z0-9-.]+)/gi;
  masked = masked.replace(emailRegex, '[Protected Email]');

  // 9. Mask Bank Account & IFSC mentions
  const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
  masked = masked.replace(ifscRegex, 'IFSC: ****0123 [Escrow Protected]');

  return masked;
}

/**
 * Multi-Message Sliding Window Anti-Circumvention with Retroactive Fragment Redaction
 * Stitches together the last 6 messages from the same sender to catch split digits (e.g. "789" -> "8766" -> "987" -> "88")
 */
export function inspectSlidingWindowForEvasion(historyMessages, currentSenderId, newText) {
  // Collect non-system messages from this sender in recent history (up to 6 messages)
  const recentFromSender = (historyMessages || [])
    .filter(m => m.senderId === currentSenderId && !m.isSystem)
    .slice(-6);

  // Extract non-commodity text chunks from recent messages plus newText
  const pastNonTradeFragments = [];
  const pastFragmentMessageIds = [];

  for (const m of recentFromSender) {
    const raw = m.rawText || m.text || '';
    if (!isTradeContext(raw)) {
      const normalizedPast = normalizeWordNumbers(raw);
      const digitsOnly = normalizedPast.replace(/\D/g, '');
      if (digitsOnly.length >= 2 && digitsOnly.length <= 9) {
        pastNonTradeFragments.push(digitsOnly);
        pastFragmentMessageIds.push(m.id);
      }
    }
  }

  const normalizedNew = normalizeWordNumbers(newText);
  const newDigitsOnly = isTradeContext(newText) ? '' : normalizedNew.replace(/\D/g, '');

  const allAccumulatedDigits = pastNonTradeFragments.join('') + newDigitsOnly;

  let evasionDetected = false;
  let evasionType = null;

  // Check 1: Did accumulated non-trade digit fragments reach a phone number length (10-12 digits)?
  if (allAccumulatedDigits.length >= 10 && allAccumulatedDigits.length <= 13) {
    const hasValidPhonePrefix = /[6-9]\d{9}/.test(allAccumulatedDigits);
    if (hasValidPhonePrefix || allAccumulatedDigits.length === 10) {
      evasionDetected = true;
      evasionType = 'phone_split';
    }
  }

  // Check 2: Did combining messages form an email (e.g. "kavin456" + "gmail" or "dot com")?
  const pastRawText = recentFromSender.map(m => m.rawText || m.text).join(' ');
  const combinedText = `${pastRawText} ${newText}`.trim();
  const hasDomainKeyword = DOMAIN_KEYWORDS.some(d => combinedText.toLowerCase().includes(d));
  const hasUserHandle = /[a-zA-Z0-9_.+-]{4,}/.test(pastRawText);
  if (hasDomainKeyword && hasUserHandle) {
    evasionDetected = true;
    evasionType = 'email_split';
  }

  return { 
    evasionDetected, 
    evasionType, 
    fragmentMessageIdsToRedact: evasionDetected ? pastFragmentMessageIds : [] 
  };
}

/**
 * Create a deterministic shared bidirectional thread key between two participants
 * e.g. Maran + Veerappan -> 'direct_maran_veerappan' regardless of who opens the chat
 */
export function getSharedThreadKey(userA, userB) {
  if (!userB) return userA;
  const cleanA = String(userA).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cleanB = String(userB).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const sorted = [cleanA, cleanB].sort();
  return `direct_${sorted[0]}_${sorted[1]}`;
}

function getStoredThreads() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('agrolnk_privacy_chat_threads');
      localStorage.removeItem('agrolnk_privacy_chat_threads_v2');
      localStorage.removeItem('agrolnk_privacy_chat_threads_v3');
    }
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CHAT_STORAGE_KEY) : null;
    const threads = raw ? JSON.parse(raw) : {};

    let modified = false;
    for (const key of Object.keys(threads)) {
      if (Array.isArray(threads[key])) {
        const cleaned = threads[key].filter(
          (m) =>
            m &&
            !m.isSystem &&
            m.id !== 'msg_init' &&
            !m.id?.startsWith('wh_slm_') &&
            !m.id?.startsWith('dg_') &&
            !m.id?.startsWith('vr_') &&
            !m.id?.startsWith('mn_') &&
            !m.id?.startsWith('sk_') &&
            !m.id?.startsWith('vl_') &&
            !m.id?.startsWith('kc_') &&
            !m.id?.startsWith('sp_') &&
            !m.text?.includes('quintal') &&
            !m.text?.includes('tariff') &&
            !m.text?.includes('Chamber B2') &&
            !m.text?.includes('e-NWR') &&
            !m.text?.includes('Privacy Shield')
        );
        if (cleaned.length !== threads[key].length) {
          threads[key] = cleaned;
          modified = true;
        }
      }
    }
    if (modified && typeof localStorage !== 'undefined') {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(threads));
    }
    return threads;
  } catch {
    return {};
  }
}

function saveStoredThreads(threads) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(threads));
  } catch (err) {
    console.error('Failed to save chat threads:', err);
  }
}

const READ_THREADS_STORAGE_KEY_PREFIX = 'agrolnk_chat_read_';

export function getReadThreadKeys(userId = 'default') {
  const safeUser = userId || 'default';
  try {
    const raw = localStorage.getItem(`${READ_THREADS_STORAGE_KEY_PREFIX}${safeUser}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markThreadAsRead(threadKey, currentUserId) {
  if (!threadKey) return;
  const safeUser = currentUserId || 'default';
  try {
    const readMap = getReadThreadKeys(safeUser);
    const now = Date.now();
    readMap[threadKey] = now;
    // Also mark normalized variants
    if (threadKey.includes('support')) readMap['agrolnk_support_desk'] = now;
    if (threadKey.includes('salem')) readMap['chat_partner_wh_salem_01'] = now;
    if (threadKey.includes('dindigul')) readMap['chat_partner_wh_dindigul_02'] = now;
    if (threadKey.includes('veerappan')) readMap['direct_maran_veerappan'] = now;
    if (threadKey.includes('mani')) readMap['direct_maran_mani'] = now;
    if (threadKey.includes('sakthi')) readMap['direct_maran_sakthivel'] = now;
    if (threadKey.includes('transporter') || threadKey.includes('vetri')) readMap['chat_partner_usr_transporter_03'] = now;
    if (threadKey.includes('financier') || threadKey.includes('kisan')) readMap['chat_partner_usr_financier_05'] = now;

    localStorage.setItem(`${READ_THREADS_STORAGE_KEY_PREFIX}${safeUser}`, JSON.stringify(readMap));

    // Update local thread cache messages to isRead = true
    const threads = getStoredThreads();
    if (threads[threadKey] && Array.isArray(threads[threadKey])) {
      let updated = false;
      threads[threadKey] = threads[threadKey].map((m) => {
        if (!m.isSystem && (!currentUserId || (m.senderId !== currentUserId && m.senderId !== 'usr_current'))) {
          if (!m.isRead) {
            updated = true;
            return { ...m, isRead: true };
          }
        }
        return m;
      });
      if (updated) {
        saveStoredThreads(threads);
      }
    }

    // Background update to Supabase
    if (currentUserId) {
      supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('thread_key', threadKey)
        .neq('sender_id', currentUserId)
        .then(() => {})
        .catch(() => {});
    }
  } catch (err) {
    console.error('Failed to mark thread as read:', err);
  }
}

export function isThreadRead(threadKey, messages = [], currentUserId = null) {
  if (!threadKey) return true;
  if (!messages || messages.length === 0) return true;
  return getThreadUnreadCount(threadKey, currentUserId, messages) === 0;
}

export function getThreadUnreadCount(threadKey, currentUserId, messages = []) {
  if (!threadKey || !Array.isArray(messages) || messages.length === 0) return 0;
  
  const readMap = getReadThreadKeys(currentUserId);
  const lastReadTime =
    readMap[threadKey] ||
    (threadKey.includes('support') ? readMap['agrolnk_support_desk'] : 0) ||
    (threadKey.includes('salem') ? readMap['chat_partner_wh_salem_01'] : 0) ||
    (threadKey.includes('dindigul') ? readMap['chat_partner_wh_dindigul_02'] : 0) ||
    (threadKey.includes('veerappan') ? readMap['direct_maran_veerappan'] : 0) ||
    (threadKey.includes('mani') ? readMap['direct_maran_mani'] : 0) ||
    (threadKey.includes('sakthi') ? readMap['direct_maran_sakthivel'] : 0) ||
    ((threadKey.includes('transporter') || threadKey.includes('vetri')) ? readMap['chat_partner_usr_transporter_03'] : 0) ||
    ((threadKey.includes('financier') || threadKey.includes('kisan')) ? readMap['chat_partner_usr_financier_05'] : 0) ||
    0;

  // Filter messages that are non-system and not sent by the current user
  const unread = messages.filter((m) => {
    if (m.isSystem || m.id === 'msg_init') return false;
    if (currentUserId && (m.senderId === currentUserId || m.senderId === 'usr_current')) return false;

    // 1. If explicitly marked read in state/DB, it's not unread
    if (m.isRead === true) return false;

    // 2. If this thread was marked read at or after message timestamp by this specific user
    const msgTime = new Date(m.timestamp).getTime();
    if (lastReadTime > 0 && !isNaN(msgTime) && msgTime <= lastReadTime) {
      return false;
    }

    // 3. Strictly count messages that are unread
    return m.isRead === false;
  });

  return unread.length;
}

export function getUserChannelKeys(currentUser) {
  const defaultKeys = [
    'agrolnk_support_desk',
    'direct_maran_sakthivel',
    'direct_maran_veerappan',
    'direct_maran_mani',
    'chat_partner_wh_salem_01',
    'chat_partner_wh_dindigul_02',
    'chat_partner_usr_transporter_03',
    'chat_partner_usr_financier_05',
  ];
  const threads = getStoredThreads();
  const allStored = Object.keys(threads);
  return Array.from(new Set([...defaultKeys, ...allStored]));
}

export function getTotalPlatformUnreadCount(currentUser) {
  const currentUserId = currentUser?.id || 'usr_current';
  const allowedThreadKeys = getUserChannelKeys(currentUser);
  const threads = getStoredThreads();

  let total = 0;
  allowedThreadKeys.forEach((key) => {
    const msgs = threads[key];
    if (Array.isArray(msgs) && msgs.length > 0) {
      total += getThreadUnreadCount(key, currentUserId, msgs);
    }
  });
  return total;
}

export function subscribeToGlobalUnreadMessages(currentUser, onUpdate) {
  if (!currentUser || typeof window === 'undefined') return () => {};

  const handleUpdate = () => {
    const count = getTotalPlatformUnreadCount(currentUser);
    if (typeof onUpdate === 'function') {
      onUpdate(count);
    }
  };

  handleUpdate();

  try {
    const channelName = `global_unread_${(currentUser.id || 'usr').replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          if (payload && payload.new) {
            const row = payload.new;
            const threadKey = row.thread_key;
            if (threadKey) {
              const formatted = mapDbRowToMessage(row);
              const threads = getStoredThreads();
              const current = threads[threadKey] || [];
              if (payload.eventType === 'INSERT') {
                if (!current.some((m) => m.id === formatted.id)) {
                  threads[threadKey] = [...current, formatted];
                  saveStoredThreads(threads);
                }
              } else if (payload.eventType === 'UPDATE') {
                threads[threadKey] = current.map((m) => (m.id === formatted.id ? formatted : m));
                saveStoredThreads(threads);
              }
            }
          }
          handleUpdate();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agrolnk_chat_unread_update', { detail: { count: getTotalPlatformUnreadCount(currentUser) } }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Failed to subscribe to global unread channel:', err);
    return () => {};
  }
}

export function getAllStoredThreads() {
  return getStoredThreads();
}

/**
 * Format ISO timestamp into WhatsApp-style display (e.g. 1:42 pm, Yesterday, 08/09/2026)
 */
export function formatChatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase();
  }

  if (isYesterday) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Get verified directory contacts tailored to the current user
 */
export function getPlatformContacts(user) {
  const currentRole = user?.role || 'buyer';
  
  const baseContacts = [
    {
      id: 'contact_support',
      threadKey: 'agrolnk_support_desk',
      name: 'AgroLnk Desk & Smart Assistant',
      role: 'Admin & AI Assistant',
      category: 'support',
      status: 'Official Support & Escrow Desk',
      avatarColor: 'bg-[#0B3326] text-[#34D399]',
      isOfficial: true,
      phoneMask: 'Official Channel',
      initials: 'AL',
    },
    {
      id: 'wh_salem_01',
      threadKey: 'chat_partner_wh_salem_01',
      name: 'Salem Agri Cold Storage Hub',
      role: 'Warehouse Operator',
      category: 'warehouse',
      facilityName: 'Salem Agri Cold Storage Hub',
      status: 'WDRA Accredited Facility • 5,000 MT Cold Vault',
      avatarColor: 'bg-emerald-700 text-white',
      phoneMask: '+91 98421 *****',
      initials: 'SL',
    },
    {
      id: 'wh_dindigul_02',
      threadKey: 'chat_partner_wh_dindigul_02',
      name: 'Dindigul Central Agri Logistics Park',
      role: 'Warehouse Operator',
      category: 'warehouse',
      facilityName: 'Dindigul Central Agri Logistics Park',
      status: 'NABARD Approved Modern Silo • 8,000 MT',
      avatarColor: 'bg-teal-700 text-white',
      phoneMask: '+91 94432 *****',
      initials: 'DG',
    },
    {
      id: 'usr_transporter_03',
      threadKey: 'chat_partner_usr_transporter_03',
      name: 'Vetri Logistics Fleet',
      role: 'Transporter',
      category: 'logistics',
      status: 'National Goods Carriage • Multi-axle Reefer Fleet',
      avatarColor: 'bg-amber-600 text-white',
      phoneMask: '+91 94433 *****',
      initials: 'VL',
    },
    {
      id: 'usr_financier_05',
      threadKey: 'chat_partner_usr_financier_05',
      name: 'Kisan Capital Partners',
      role: 'Financier',
      category: 'financier',
      status: 'Trade Settlement & e-NWR Credit Desk',
      avatarColor: 'bg-blue-700 text-white',
      phoneMask: '+91 98400 *****',
      initials: 'KC',
    },
  ];

  if (currentRole === 'buyer') {
    baseContacts.splice(1, 0, {
      id: 'usr_farmer_sakthi',
      threadKey: 'direct_maran_sakthivel',
      name: 'Sakthi Vel (Farmer)',
      role: 'Farmer',
      category: 'orders',
      status: 'Active Supplier • Organic Tomatoes & Basmati Rice',
      avatarColor: 'bg-emerald-600 text-white',
      phoneMask: '+91 94432 *****',
      initials: 'SV',
    });
  } else {
    baseContacts.splice(1, 0, {
      id: 'usr_buyer_maran',
      threadKey: 'direct_maran_sakthivel',
      name: 'Maran (Wholesale Buyer)',
      role: 'Buyer',
      category: 'orders',
      status: 'Procurement Desk • Orders #AGM-6454 & #AGM-2361',
      avatarColor: 'bg-indigo-600 text-white',
      phoneMask: '+91 98840 *****',
      initials: 'MB',
    });
  }

  return baseContacts;
}

const INITIAL_DEMO_THREADS = {};

/**
 * Retrieve demo conversation seed for matching thread keys (clean empty default)
 */
export function getDemoSeedForThread(threadKey) {
  return null;
}

/**
 * Format database row into UI message model
 */
function mapDbRowToMessage(row) {
  return {
    id: row.id,
    threadKey: row.thread_key,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    rawText: row.raw_text,
    text: row.text,
    isSystem: !!row.is_system,
    isRead: row.is_read !== undefined ? !!row.is_read : (row.isRead !== undefined ? !!row.isRead : true),
    timestamp: row.created_at,
  };
}

/**
 * Format UI message model into Supabase database row
 */
function mapMessageToDbRow(threadKey, msg) {
  return {
    id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    thread_key: threadKey,
    sender_id: msg.senderId || 'usr_current',
    sender_name: msg.senderName || 'Trading Participant',
    sender_role: msg.senderRole || 'buyer',
    raw_text: msg.rawText || msg.text || '',
    text: msg.text || '',
    is_system: !!msg.isSystem,
    is_read: msg.isRead !== undefined ? !!msg.isRead : false,
    created_at: msg.timestamp || new Date().toISOString(),
  };
}

/**
 * Fetch thread messages from Supabase with instant local fallback and auto-seeding
 */
export async function fetchThreadMessages(threadKey) {
  if (!threadKey) return [];

  // Instant local cache return
  const localCached = getThreadMessages(threadKey);

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_key', threadKey)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase chat fetch notice (using local cache):', error.message);
      return localCached;
    }

    if (data && data.length > 0) {
      const dummyIds = [];
      const genuine = data
        .map(mapDbRowToMessage)
        .filter((m) => {
          const isDummy =
            !m ||
            m.isSystem ||
            m.id === 'msg_init' ||
            m.id?.startsWith('wh_slm_') ||
            m.id?.startsWith('dg_') ||
            m.id?.startsWith('vr_') ||
            m.id?.startsWith('mn_') ||
            m.id?.startsWith('sk_') ||
            m.id?.startsWith('vl_') ||
            m.id?.startsWith('kc_') ||
            m.id?.startsWith('sp_') ||
            m.text?.includes('quintal') ||
            m.text?.includes('tariff') ||
            m.text?.includes('Chamber B2') ||
            m.text?.includes('e-NWR') ||
            m.text?.includes('Privacy Shield');
          if (isDummy && m.id) {
            dummyIds.push(m.id);
          }
          return !isDummy;
        });

      if (dummyIds.length > 0) {
        supabase
          .from('chat_messages')
          .delete()
          .in('id', dummyIds)
          .then(() => {})
          .catch(() => {});
      }

      const threads = getStoredThreads();
      const currentLocal = threads[threadKey] || [];
      // Keep any locally created message that might still be in-flight
      const pendingLocal = currentLocal.filter((m) => !genuine.some((f) => f.id === m.id));
      const merged = [...genuine, ...pendingLocal];
      threads[threadKey] = merged;
      saveStoredThreads(threads);
      return merged;
    }

    return localCached;
  } catch (err) {
    console.warn('Supabase chat fetch error, fallback to local:', err);
    return localCached;
  }
}

/**
 * Subscribe to real-time incoming messages on Supabase (inserts & read updates)
 */
export function subscribeToThread(threadKey, onNewMessage, onMessageUpdate) {
  if (!threadKey || typeof window === 'undefined') return () => {};

  try {
    const safeChannelName = `chat_${threadKey.replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now()}`;
    const channel = supabase
      .channel(safeChannelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_key=eq.${threadKey}`,
        },
        (payload) => {
          if (payload) {
            if (payload.eventType === 'INSERT' && payload.new) {
              const formatted = mapDbRowToMessage(payload.new);

              // Update local storage cache
              const threads = getStoredThreads();
              const current = threads[threadKey] || [];
              if (!current.some((m) => m.id === formatted.id)) {
                threads[threadKey] = [...current, formatted];
                saveStoredThreads(threads);
              }

              if (typeof onNewMessage === 'function') {
                onNewMessage(formatted);
              }
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const formatted = mapDbRowToMessage(payload.new);
              const threads = getStoredThreads();
              const current = threads[threadKey] || [];
              threads[threadKey] = current.map((m) => (m.id === formatted.id ? formatted : m));
              saveStoredThreads(threads);
              if (typeof onMessageUpdate === 'function') {
                onMessageUpdate(formatted);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Failed to subscribe to chat realtime channel:', err);
    return () => {};
  }
}

/**
 * Get messages for a specific order or context thread (clean genuine messages only)
 */
export function getThreadMessages(threadKey) {
  if (!threadKey) return [];
  const threads = getStoredThreads();
  const stored = threads[threadKey];

  if (stored && Array.isArray(stored)) {
    // Filter out obsolete dummy texts, fake system notices, and stale bot spam
    const genuine = stored.filter(
      (m) =>
        m &&
        !m.isSystem &&
        m.id !== 'msg_init' &&
        !m.id?.startsWith('wh_slm_') &&
        !m.id?.startsWith('dg_') &&
        !m.id?.startsWith('vr_') &&
        !m.id?.startsWith('mn_') &&
        !m.id?.startsWith('sk_') &&
        !m.id?.startsWith('vl_') &&
        !m.id?.startsWith('kc_') &&
        !m.id?.startsWith('sp_') &&
        !m.text?.includes('Chamber B2 (4°C-8°C') &&
        !m.text?.includes('Privacy Shield Active')
    );
    if (genuine.length !== stored.length) {
      threads[threadKey] = genuine;
      saveStoredThreads(threads);
    }
    return genuine;
  }

  return [];
}

/**
 * Send a message in a privacy-protected thread with Multi-Message Sliding Window and Retroactive Fragment Redaction
 */
export function sendPrivacyMessage(threadKey, messageData) {
  const threads = getStoredThreads();
  const currentMessages = threads[threadKey] || getThreadMessages(threadKey);

  const rawInput = messageData.text || '';
  const senderId = messageData.senderId || 'usr_current';

  // Run Sliding Window Anti-Circumvention Analysis
  const { 
    evasionDetected, 
    evasionType, 
    fragmentMessageIdsToRedact 
  } = inspectSlidingWindowForEvasion(currentMessages, senderId, rawInput);

  let cleanText = maskSensitivePII(rawInput);

  // If evasion is caught across multiple messages, strictly mask the current fragment
  if (evasionDetected) {
    if (evasionType === 'phone_split') {
      cleanText = '*** *** [Protected Split Phone Number]';
    } else if (evasionType === 'email_split') {
      cleanText = '***@*** [Protected Split Email Address]';
    } else {
      cleanText = '[Protected Contact Fragment]';
    }
  }

  // Retroactively sanitize past message fragments if an evasion sequence was completed
  let sanitizedCurrentMessages = currentMessages;
  if (evasionDetected && fragmentMessageIdsToRedact && fragmentMessageIdsToRedact.length > 0) {
    sanitizedCurrentMessages = currentMessages.map(m => {
      if (fragmentMessageIdsToRedact.includes(m.id)) {
        return {
          ...m,
          text: '[Fragment Redacted - Security Policy]',
        };
      }
      return m;
    });
  }

  const newMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    senderId,
    senderName: messageData.senderName || 'Trading Participant',
    senderRole: messageData.senderRole || 'buyer',
    rawText: rawInput,
    text: cleanText,
    timestamp: new Date().toISOString(),
    isSystem: false,
    isRead: false, // Starts with 1 tick (sent)
  };

  const updatedMessages = [...sanitizedCurrentMessages, newMessage];
  const newMessagesToPersist = [newMessage];

  // If evasion attempt was detected, immediately inject an automated Anti-Circumvention Security Notice
  if (evasionDetected) {
    const securityMsg = {
      id: `msg_security_${Date.now()}`,
      senderId: 'system_bot',
      senderName: 'AgroLnk Security Shield',
      senderRole: 'system',
      text: '⚠️ AgroLnk Security Alert: Fragmented contact details (split phone numbers or email provider names) were detected across multiple messages. Previous numeric fragments have been automatically redacted. Exchanging direct contact details to trade off-platform voids 100% Escrow Protection and AgroLnk dispute arbitration.',
      timestamp: new Date(Date.now() + 200).toISOString(),
      isSystem: true,
    };
    updatedMessages.push(securityMsg);
    newMessagesToPersist.push(securityMsg);
  }

  // Smart Chatbot Automated Assistance Trigger
  const lower = rawInput.toLowerCase();
  if (!evasionDetected) {
    if (lower.includes('escrow') || lower.includes('payment') || lower.includes('release')) {
      const escrowMsg = {
        id: `msg_bot_${Date.now()}`,
        senderId: 'system_bot',
        senderName: 'AgroLnk Smart Assistant',
        senderRole: 'system',
        text: 'ℹ️ Escrow Payout: 100% of the funds are held securely by AgroLnk Escrow. Payout is automatically released to the seller as soon as the buyer completes arrival inspection.',
        timestamp: new Date(Date.now() + 500).toISOString(),
        isSystem: true,
      };
      updatedMessages.push(escrowMsg);
      newMessagesToPersist.push(escrowMsg);
    } else if (lower.includes('freight') || lower.includes('driver') || lower.includes('truck') || lower.includes('delivery')) {
      const logisticsMsg = {
        id: `msg_bot_${Date.now()}`,
        senderId: 'system_bot',
        senderName: 'AgroLnk Logistics Assistant',
        senderRole: 'system',
        text: '🚚 Transporter Notice: Driver location and live GPS corridor transit can be tracked directly via the "Track Dispatch" tab.',
        timestamp: new Date(Date.now() + 500).toISOString(),
        isSystem: true,
      };
      updatedMessages.push(logisticsMsg);
      newMessagesToPersist.push(logisticsMsg);
    }
  }

  // 1. Optimistic Local Persistence (Zero-lag UI response)
  threads[threadKey] = updatedMessages;
  saveStoredThreads(threads);

  // 2. Asynchronous Supabase Insertion with Schema Fallback
  try {
    const dbRows = newMessagesToPersist.map((m) => mapMessageToDbRow(threadKey, m));
    supabase
      .from('chat_messages')
      .insert(dbRows)
      .then(({ error }) => {
        if (error) {
          console.warn('Supabase message insert notice, retrying with base schema:', error.message);
          // Auto-fallback: If is_read column does not exist yet in Supabase table, insert without is_read
          const fallbackRows = dbRows.map(({ is_read, ...rest }) => rest);
          supabase
            .from('chat_messages')
            .insert(fallbackRows)
            .then(({ error: retryErr }) => {
              if (retryErr) {
                console.warn('Supabase fallback insert note:', retryErr.message);
              }
            });
        }
      });
  } catch (err) {
    console.warn('Supabase chat insert error:', err);
  }

  return updatedMessages;
}

/**
 * Trigger global event to open privacy chat drawer for a specific partner/warehouse
 */
export function openDirectChat({ partnerId, partnerName, partnerRole = 'Warehouse Operator', facilityName = '', initialMessage = '' }) {
  const safeId = partnerId || (partnerName ? partnerName.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'partner');
  const threadKey = `chat_partner_${safeId}`;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('agrolnk_open_chat', {
        detail: {
          threadKey,
          partnerId: safeId,
          partnerName: partnerName || facilityName || 'Certified Operator',
          partnerRole,
          facilityName: facilityName || partnerName || 'Certified Storage Facility',
          initialMessage,
        },
      })
    );
  }
}
