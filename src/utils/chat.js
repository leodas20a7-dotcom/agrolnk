// AgroLnk Privacy-Preserving Communication & Anti-Circumvention Engine
// Requirement: Users can communicate while phone numbers, emails, domain fragments, 
// spelled-out words, and split-message contact exchanges are strictly detected and protected.

import { supabase } from '../lib/supabase';

const CHAT_STORAGE_KEY = 'agrolnk_privacy_chat_threads';

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
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
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

const READ_THREADS_STORAGE_KEY = 'agrolnk_chat_read_threads';

export function getReadThreadKeys() {
  try {
    const raw = localStorage.getItem(READ_THREADS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markThreadAsRead(threadKey) {
  if (!threadKey) return;
  try {
    const readMap = getReadThreadKeys();
    readMap[threadKey] = Date.now();
    // Also mark normalized variants
    if (threadKey.includes('salem')) readMap['chat_partner_wh_salem_01'] = Date.now();
    if (threadKey.includes('dindigul')) readMap['chat_partner_wh_dindigul_02'] = Date.now();
    if (threadKey.includes('veerappan')) readMap['direct_maran_veerappan'] = Date.now();
    if (threadKey.includes('mani')) readMap['direct_maran_mani'] = Date.now();
    if (threadKey.includes('sakthi')) readMap['direct_maran_sakthivel'] = Date.now();
    if (threadKey.includes('transporter') || threadKey.includes('vetri')) readMap['chat_partner_usr_transporter_03'] = Date.now();
    if (threadKey.includes('financier') || threadKey.includes('kisan')) readMap['chat_partner_usr_financier_05'] = Date.now();

    localStorage.setItem(READ_THREADS_STORAGE_KEY, JSON.stringify(readMap));
  } catch (err) {
    console.error('Failed to mark thread as read:', err);
  }
}

export function isThreadRead(threadKey) {
  if (!threadKey) return true;
  const readMap = getReadThreadKeys();
  if (readMap[threadKey]) return true;
  if (threadKey.includes('salem') && readMap['chat_partner_wh_salem_01']) return true;
  if (threadKey.includes('dindigul') && readMap['chat_partner_wh_dindigul_02']) return true;
  if (threadKey.includes('veerappan') && readMap['direct_maran_veerappan']) return true;
  if (threadKey.includes('mani') && readMap['direct_maran_mani']) return true;
  if (threadKey.includes('sakthi') && readMap['direct_maran_sakthivel']) return true;
  if ((threadKey.includes('transporter') || threadKey.includes('vetri')) && readMap['chat_partner_usr_transporter_03']) return true;
  if ((threadKey.includes('financier') || threadKey.includes('kisan')) && readMap['chat_partner_usr_financier_05']) return true;
  return false;
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

const INITIAL_DEMO_THREADS = {
  chat_partner_wh_salem_01: [
    {
      id: 'wh_slm_0',
      senderId: 'system_bot',
      senderName: 'AgroLnk Trust & Privacy Bot',
      senderRole: 'system',
      text: '🛡️ AgroLnk Smart Privacy Shield Active: Personal phone numbers, emails, and direct accounts are protected from off-platform exposure.',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      isSystem: true,
    },
    {
      id: 'wh_slm_1',
      senderId: 'wh_salem_operator',
      senderName: 'Salem Agri Cold Storage Hub',
      senderRole: 'warehouse',
      text: 'Hello! Chamber B2 (4°C-8°C cold vault) has 1,300 MT available space for perishables and vegetables. WDRA receipts issued within 2 hours of gate arrival.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSystem: false,
    },
    {
      id: 'wh_slm_2',
      senderId: 'usr_current',
      senderName: 'You',
      senderRole: 'buyer',
      text: 'What is the monthly storage rate per quintal for tomatoes, and do you support e-NWR pledges?',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      isSystem: false,
    },
    {
      id: 'wh_slm_3',
      senderId: 'wh_salem_operator',
      senderName: 'Salem Agri Cold Storage Hub',
      senderRole: 'warehouse',
      text: 'Our tariff is ₹35 per quintal monthly. Yes, all e-NWRs are accredited for instant collateral financing on Agrolnk.',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      isSystem: false,
    },
  ],

  chat_partner_wh_dindigul_02: [
    {
      id: 'dg_0',
      senderId: 'system_bot',
      senderName: 'AgroLnk Trust & Privacy Bot',
      senderRole: 'system',
      text: '🛡️ AgroLnk Smart Privacy Shield Active: WDRA and NABARD certified logistics facility.',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      isSystem: true,
    },
    {
      id: 'dg_1',
      senderId: 'wh_dindigul_operator',
      senderName: 'Dindigul Central Agri Logistics Park',
      senderRole: 'warehouse',
      text: 'NABARD approved modern grain silos and cold cells are open for storage deposits. Daily electronic assaying available.',
      timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
      isSystem: false,
    },
    {
      id: 'dg_2',
      senderId: 'usr_current',
      senderName: 'You',
      senderRole: 'buyer',
      text: 'Can we schedule a 20 MT consignment intake for tomorrow morning?',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      isSystem: false,
    },
    {
      id: 'dg_3',
      senderId: 'wh_dindigul_operator',
      senderName: 'Dindigul Central Agri Logistics Park',
      senderRole: 'warehouse',
      text: 'Automated hermetic chambers are ready for maize and pulses. Bay 3 allocated from 8:00 AM.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSystem: false,
    },
  ],

  direct_maran_veerappan: [
    {
      id: 'vr_0',
      senderId: 'system_bot',
      senderName: 'AgroLnk Trust & Privacy Bot',
      senderRole: 'system',
      text: '🛡️ AgroLnk Smart Privacy Shield Active: 100% Escrow Protection is enabled for Order #AGM-6454.',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      isSystem: true,
    },
    {
      id: 'vr_1',
      senderId: 'usr_farmer_veerappan',
      senderName: 'veerappan (Farmer)',
      senderRole: 'farmer',
      text: 'Namaste! Grade-A Basmati Rice (100 kg) is harvested and packed in hermetic 50kg bags. Assayed moisture is 11.8%.',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      isSystem: false,
    },
    {
      id: 'vr_2',
      senderId: 'usr_current',
      senderName: 'You',
      senderRole: 'buyer',
      text: 'Great! The payment of ₹8,400 is locked securely in Agrolnk Escrow. Vetri Logistics is scheduled for pickup today.',
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      isSystem: false,
    },
    {
      id: 'vr_3',
      senderId: 'usr_farmer_veerappan',
      senderName: 'veerappan (Farmer)',
      senderRole: 'farmer',
      text: 'Understood. Dispatch gate pass is prepared. We will hand over the consignment to the transporter.',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      isSystem: false,
    },
  ],

  direct_maran_mani: [
    {
      id: 'mn_0',
      senderId: 'system_bot',
      senderName: 'AgroLnk Trust & Privacy Bot',
      senderRole: 'system',
      text: '🛡️ AgroLnk Smart Privacy Shield Active for Order #AGM-2361.',
      timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      isSystem: true,
    },
    {
      id: 'mn_1',
      senderId: 'usr_farmer_mani',
      senderName: 'mani (Farmer)',
      senderRole: 'farmer',
      text: 'Organic Tomatoes lot (100 kg) has passed quality sorting at Attur collection point.',
      timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      isSystem: false,
    },
    {
      id: 'mn_2',
      senderId: 'usr_current',
      senderName: 'You',
      senderRole: 'buyer',
      text: 'Please ensure crates are cushioned to prevent transit damage.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      isSystem: false,
    },
    {
      id: 'mn_3',
      senderId: 'usr_farmer_mani',
      senderName: 'mani (Farmer)',
      senderRole: 'farmer',
      text: 'Yes, double corrugated ventilated crates used. Ready for loading at 3 PM.',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      isSystem: false,
    },
  ],

  direct_maran_sakthivel: [
    {
      id: 'sk_0',
      senderId: 'system_bot',
      senderName: 'AgroLnk Trust & Privacy Bot',
      senderRole: 'system',
      text: '🛡️ AgroLnk Smart Privacy Shield Active.',
      timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
      isSystem: true,
    },
    {
      id: 'sk_1',
      senderId: 'usr_farmer_sakthi',
      senderName: 'Sakthi Vel (Farmer)',
      senderRole: 'farmer',
      text: 'Good morning! Fresh Farm Carrots (50 kg) batch has been harvested and cleaned.',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      isSystem: false,
    },
    {
      id: 'sk_2',
      senderId: 'usr_current',
      senderName: 'You',
      senderRole: 'buyer',
      text: 'Great, please coordinate pickup with Vetri Logistics reefer truck.',
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      isSystem: false,
    },
    {
      id: 'sk_3',
      senderId: 'usr_farmer_sakthi',
      senderName: 'Sakthi Vel (Farmer)',
      senderRole: 'farmer',
      text: 'Sure, dispatch coordinator has scheduled vehicle TN 28 AB 4092 for pickup at 4 PM.',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      isSystem: false,
    },
  ],

  chat_partner_usr_transporter_03: [
    {
      id: 'vl_0',
      senderId: 'system_bot',
      senderName: 'AgroLnk Trust & Privacy Bot',
      senderRole: 'system',
      text: '🛡️ AgroLnk Smart Privacy Shield Active.',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      isSystem: true,
    },
    {
      id: 'vl_1',
      senderId: 'usr_transporter_03',
      senderName: 'Vetri Logistics Fleet',
      senderRole: 'transporter',
      text: 'Reefer Truck TN 28 AB 4092 is dispatched. Live corridor tracking is active on your Deliveries dashboard.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSystem: false,
    },
    {
      id: 'vl_2',
      senderId: 'usr_current',
      senderName: 'You',
      senderRole: 'buyer',
      text: 'What is the estimated time of arrival at the destination warehouse?',
      timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
      isSystem: false,
    },
    {
      id: 'vl_3',
      senderId: 'usr_transporter_03',
      senderName: 'Vetri Logistics Fleet',
      senderRole: 'transporter',
      text: 'ETA is 6:30 PM today. Cold chain temperature is locked at 6°C throughout transit.',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      isSystem: false,
    },
  ],

  chat_partner_usr_financier_05: [
    {
      id: 'kc_0',
      senderId: 'system_bot',
      senderName: 'AgroLnk Trust & Privacy Bot',
      senderRole: 'system',
      text: '🛡️ AgroLnk Smart Privacy Shield Active.',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      isSystem: true,
    },
    {
      id: 'kc_1',
      senderId: 'usr_financier_05',
      senderName: 'Kisan Capital Credit Desk',
      senderRole: 'financier',
      text: 'Your trade credit pre-approval is verified. Earmarked liquidity is available for auction settlements.',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      isSystem: false,
    },
    {
      id: 'kc_2',
      senderId: 'usr_current',
      senderName: 'You',
      senderRole: 'buyer',
      text: 'Can we get the e-NWR pledge disbursement release for Order #AGM-6454?',
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      isSystem: false,
    },
    {
      id: 'kc_3',
      senderId: 'usr_financier_05',
      senderName: 'Kisan Capital Credit Desk',
      senderRole: 'financier',
      text: 'Disbursement request is sanctioned. ₹75,000 released directly into escrow settlement vault.',
      timestamp: new Date(Date.now() - 800000).toISOString(),
      isSystem: false,
    },
  ],

  agrolnk_support_desk: [
    {
      id: 'sp_0',
      senderId: 'system_bot',
      senderName: 'AgroLnk Trust & Privacy Bot',
      senderRole: 'system',
      text: '🛡️ AgroLnk Smart Privacy Shield Active: 100% Escrow Protection & Support Desk.',
      timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
      isSystem: true,
    },
    {
      id: 'sp_1',
      senderId: 'system_bot',
      senderName: 'AgroLnk Desk & Smart Assistant',
      senderRole: 'admin',
      text: 'Welcome to AgroLnk! Official support desk is active with 100% Escrow Protection and verified trade settlement. How can we assist you today?',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      isSystem: false,
    },
    {
      id: 'sp_2',
      senderId: 'usr_buyer_maran',
      senderName: 'Maran',
      senderRole: 'buyer',
      text: 'How do I request dispute mediation or warehouse assaying checks?',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      isSystem: false,
    },
    {
      id: 'sp_3',
      senderId: 'system_bot',
      senderName: 'AgroLnk Desk & Smart Assistant',
      senderRole: 'admin',
      text: 'You can initiate third-party quality assaying directly from your Active Orders tab or message here anytime for senior escrow mediation.',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      isSystem: false,
    },
  ],
};

/**
 * Retrieve demo conversation seed for matching thread keys
 */
export function getDemoSeedForThread(threadKey) {
  if (!threadKey) return null;
  const key = String(threadKey).toLowerCase();

  if (INITIAL_DEMO_THREADS[threadKey]) {
    return INITIAL_DEMO_THREADS[threadKey];
  }

  if (key.includes('support')) {
    return INITIAL_DEMO_THREADS.agrolnk_support_desk;
  }
  if (key.includes('salem')) {
    return INITIAL_DEMO_THREADS.chat_partner_wh_salem_01;
  }
  if (key.includes('dindigul')) {
    return INITIAL_DEMO_THREADS.chat_partner_wh_dindigul_02;
  }
  if (key.includes('veerappan')) {
    return INITIAL_DEMO_THREADS.direct_maran_veerappan;
  }
  if (key.includes('mani')) {
    return INITIAL_DEMO_THREADS.direct_maran_mani;
  }
  if (key.includes('sakthi')) {
    return INITIAL_DEMO_THREADS.direct_maran_sakthivel;
  }
  if (key.includes('transporter') || key.includes('vetri')) {
    return INITIAL_DEMO_THREADS.chat_partner_usr_transporter_03;
  }
  if (key.includes('financier') || key.includes('kisan')) {
    return INITIAL_DEMO_THREADS.chat_partner_usr_financier_05;
  }

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
      const formatted = data.map(mapDbRowToMessage);
      const threads = getStoredThreads();
      threads[threadKey] = formatted;
      saveStoredThreads(threads);
      return formatted;
    }

    // If Supabase table is empty for this thread, seed initial demo dialogue into Supabase
    const demoSeed = getDemoSeedForThread(threadKey);
    if (demoSeed && demoSeed.length > 0) {
      const dbRows = demoSeed.map((m) => mapMessageToDbRow(threadKey, m));
      supabase
        .from('chat_messages')
        .insert(dbRows)
        .then(({ error: insertErr }) => {
          if (insertErr) {
            console.warn('Supabase demo chat seed notice:', insertErr.message);
          }
        });

      const threads = getStoredThreads();
      threads[threadKey] = demoSeed;
      saveStoredThreads(threads);
      return demoSeed;
    }

    return localCached;
  } catch (err) {
    console.warn('Supabase chat fetch error, fallback to local:', err);
    return localCached;
  }
}

/**
 * Subscribe to real-time incoming messages on Supabase
 */
export function subscribeToThread(threadKey, onNewMessage) {
  if (!threadKey || typeof window === 'undefined') return () => {};

  try {
    const safeChannelName = `chat_${threadKey.replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now()}`;
    const channel = supabase
      .channel(safeChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_key=eq.${threadKey}`,
        },
        (payload) => {
          if (payload && payload.new) {
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
 * Get messages for a specific order or context thread (with bidirectional fallback & demo seed auto-repair)
 */
export function getThreadMessages(threadKey) {
  const threads = getStoredThreads();
  const stored = threads[threadKey];
  const demoSeed = getDemoSeedForThread(threadKey);

  // Check if stored messages already contain genuine conversation (not just system notices)
  const hasRealMessages =
    stored &&
    Array.isArray(stored) &&
    stored.some((m) => !m.isSystem && m.id !== 'msg_init');

  // If already populated with genuine user conversation, return stored messages
  if (stored && Array.isArray(stored) && hasRealMessages && stored.length >= (demoSeed ? demoSeed.length : 2)) {
    return stored;
  }

  // If a demo seed exists, use the demo seed and save it
  if (demoSeed && Array.isArray(demoSeed) && demoSeed.length > 0) {
    const extraUserMsgs = (stored && Array.isArray(stored))
      ? stored.filter(
          (m) =>
            !m.isSystem &&
            m.id !== 'msg_init' &&
            !demoSeed.some((d) => d.id === m.id || (d.text === m.text && d.senderId === m.senderId))
        )
      : [];
    const merged = [...demoSeed, ...extraUserMsgs];
    threads[threadKey] = merged;
    saveStoredThreads(threads);
    return merged;
  }

  // If stored exists (even if fallback), return it
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  // Seed initial welcome message fallback
  const defaultMessages = [
    {
      id: 'msg_init',
      senderId: 'system_bot',
      senderName: 'AgroLnk Trust & Privacy Bot',
      senderRole: 'system',
      text: '🛡️ AgroLnk Smart Privacy Shield Active: Personal phone numbers, emails, and direct accounts are protected from off-platform exposure. Please coordinate consignment pickup, delivery timing, and lot specifications securely here.',
      timestamp: new Date().toISOString(),
      isSystem: true,
    },
  ];
  threads[threadKey] = defaultMessages;
  saveStoredThreads(threads);
  return defaultMessages;
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

  // 2. Asynchronous Supabase Insertion
  try {
    const dbRows = newMessagesToPersist.map((m) => mapMessageToDbRow(threadKey, m));
    supabase
      .from('chat_messages')
      .insert(dbRows)
      .then(({ error }) => {
        if (error) {
          console.warn('Supabase message insert notice (saved locally):', error.message);
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
