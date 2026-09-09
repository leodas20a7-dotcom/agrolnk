// AgroLnk Privacy-Preserving Communication & Anti-Circumvention Engine
// Requirement: Users can communicate while phone numbers, emails, domain fragments, 
// spelled-out words, and split-message contact exchanges are strictly detected and protected.

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

/**
 * Get messages for a specific order or context thread (with bidirectional fallback)
 */
export function getThreadMessages(threadKey) {
  const threads = getStoredThreads();

  // Check direct key or legacy unilateral keys
  if (threads[threadKey]) {
    return threads[threadKey];
  }

  // Check if there are legacy messages stored under old unilateral keys (e.g. trader_maran or trader_veerappan)
  if (threadKey.startsWith('direct_')) {
    const parts = threadKey.replace('direct_', '').split('_');
    for (const part of parts) {
      if (threads[`trader_${part}`] && threads[`trader_${part}`].length > 1) {
        threads[threadKey] = threads[`trader_${part}`];
        saveStoredThreads(threads);
        return threads[threadKey];
      }
    }
  }

  // Seed initial welcome message
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

  // If evasion attempt was detected, immediately inject an automated Anti-Circumvention Security Notice
  if (evasionDetected) {
    updatedMessages.push({
      id: `msg_security_${Date.now()}`,
      senderId: 'system_bot',
      senderName: 'AgroLnk Security Shield',
      senderRole: 'system',
      text: '⚠️ AgroLnk Security Alert: Fragmented contact details (split phone numbers or email provider names) were detected across multiple messages. Previous numeric fragments have been automatically redacted. Exchanging direct contact details to trade off-platform voids 100% Escrow Protection and AgroLnk dispute arbitration.',
      timestamp: new Date(Date.now() + 200).toISOString(),
      isSystem: true,
    });
  }

  // Smart Chatbot Automated Assistance Trigger
  const lower = rawInput.toLowerCase();
  if (!evasionDetected) {
    if (lower.includes('escrow') || lower.includes('payment') || lower.includes('release')) {
      updatedMessages.push({
        id: `msg_bot_${Date.now()}`,
        senderId: 'system_bot',
        senderName: 'AgroLnk Smart Assistant',
        senderRole: 'system',
        text: 'ℹ️ Escrow Payout: 100% of the funds are held securely by AgroLnk Escrow. Payout is automatically released to the seller as soon as the buyer completes arrival inspection.',
        timestamp: new Date(Date.now() + 500).toISOString(),
        isSystem: true,
      });
    } else if (lower.includes('freight') || lower.includes('driver') || lower.includes('truck') || lower.includes('delivery')) {
      updatedMessages.push({
        id: `msg_bot_${Date.now()}`,
        senderId: 'system_bot',
        senderName: 'AgroLnk Logistics Assistant',
        senderRole: 'system',
        text: '🚚 Transporter Notice: Driver location and live GPS corridor transit can be tracked directly via the "Track Dispatch" tab.',
        timestamp: new Date(Date.now() + 500).toISOString(),
        isSystem: true,
      });
    }
  }

  threads[threadKey] = updatedMessages;
  saveStoredThreads(threads);
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
