// AgroLnk Privacy-Preserving Communication & Anti-Circumvention Engine
// Requirement: Users can communicate while phone numbers, emails, domain fragments, and split-message contact exchanges are strictly blocked.

const CHAT_STORAGE_KEY = 'agrolnk_privacy_chat_threads';

const NUMBER_WORDS_MAP = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'poojiyam': '0', 'ondru': '1', 'irandu': '2', 'moondru': '3', 'naangu': '4',
  'aindhu': '5', 'aaru': '6', 'ezhu': '7', 'ettu': '8', 'onbadhu': '9',
  'shunya': '0', 'ek': '1', 'do': '2', 'teen': '3', 'char': '4',
  'paanch': '5', 'chhah': '6', 'saat': '7', 'aath': '8', 'nau': '9'
};

const DOMAIN_KEYWORDS = [
  'gmail', 'yahoo', 'outlook', 'hotmail', 'rediffmail', 'rediff',
  'icloud', 'protonmail', 'proton', 'ymail', 'zoho', 'zohomail',
  'mail.com', 'dot com', 'dot in', 'dot net', 'dot org', '@gmail',
  '@yahoo', '@outlook', '@hotmail', '@icloud'
];

/**
 * Normalize written words into digit strings
 */
function normalizeWordNumbers(text) {
  if (!text) return '';
  let normalized = text.toLowerCase();
  for (const [word, digit] of Object.entries(NUMBER_WORDS_MAP)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(reg, digit);
  }
  return normalized;
}

/**
 * Filter out single-message PII (Obfuscated phones, Emails, IFSC, Domain fragments, 5+ digit sequences)
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

  // 2. Normalize spaced or separated numbers (e.g. "9 8 7 5 5 6 7 8 9 0", "9-8-7-5-5-6-7-8-9-0", "9.8.7.5.5")
  const separatedPhoneRegex = /(?:\+?91[\s.-]?)?([6-9])[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)[\s.-]*(\d)/g;
  masked = masked.replace(separatedPhoneRegex, (_m, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10) => {
    return `${p1}${p2}*** ***${p9}${p10} [Protected Phone]`;
  });

  // 3. Mask standard 10-digit Indian numbers (e.g. 9840123456, +91 9840123456)
  const phoneRegex = /(\+?91[\s-]?)?([6-9]\d{2})[\s-]?(\d{3})[\s-]?(\d{4})/g;
  masked = masked.replace(phoneRegex, (_match, p1, p2, _p3, p4) => {
    return `${p1 || ''}${p2}*** ***${p4.slice(-2)} [Protected Phone]`;
  });

  // 4. Mask 5-to-9 consecutive standalone digits if sent without commodity context (e.g. "98755", "67890")
  const isCommodityWeightOrPrice = /\b(kg|quintal|ton|tonnes|mt|₹|rs|inr|\/kg)\b/i.test(masked);
  if (!isCommodityWeightOrPrice) {
    const splitChunkRegex = /\b\d{5,9}\b/g;
    masked = masked.replace(splitChunkRegex, (match) => {
      return `${match.slice(0, 2)}*** [Protected Fragment]`;
    });
  }

  // 5. Mask email addresses (e.g. user@gmail.com -> u***@gmail.com)
  const emailRegex = /([a-zA-Z0-9_.+-]+)\s*(@|at|\(at\))\s*([a-zA-Z0-9-]+\s*(\.|\(dot\)|dot)\s*[a-zA-Z0-9-.]+)/gi;
  masked = masked.replace(emailRegex, '[Protected Email]');

  // 6. Mask Bank Account & IFSC mentions
  const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
  masked = masked.replace(ifscRegex, 'IFSC: ****0123 [Escrow Protected]');

  return masked;
}

/**
 * Multi-Message Sliding Window Anti-Circumvention
 * Stitches together the last 4 messages from the same sender to catch split digits (e.g. 98755 + 67890) or email handles (kavin456 + gmail)
 */
export function inspectSlidingWindowForEvasion(historyMessages, currentSenderId, newText) {
  const recentFromSender = historyMessages
    .filter(m => m.senderId === currentSenderId && !m.isSystem)
    .slice(-4);

  // Extract all digit characters from recent messages plus newText
  const pastRawText = recentFromSender.map(m => m.rawText || m.text).join(' ');
  const combinedText = `${pastRawText} ${newText}`.trim();
  const normalizedCombined = normalizeWordNumbers(combinedText);

  // Extract only digits from the combined sliding buffer
  const extractedDigits = normalizedCombined.replace(/\D/g, '');

  let evasionDetected = false;
  let evasionType = null;

  // Check 1: Did the combined digits form a 10-digit or 12-digit number (mobile/Aadhaar)?
  if (extractedDigits.length >= 10 && extractedDigits.length <= 13) {
    const hasIndianMobilePrefix = /[6-9]\d{9}/.test(extractedDigits);
    if (hasIndianMobilePrefix || extractedDigits.length === 10) {
      evasionDetected = true;
      evasionType = 'phone_split';
    }
  }

  // Check 2: Did combining messages form an email (e.g. "kavin456" + "gmail" or "dot com")?
  const hasDomainKeyword = DOMAIN_KEYWORDS.some(d => combinedText.toLowerCase().includes(d));
  const hasUserHandle = /[a-zA-Z0-9_.+-]{4,}/.test(pastRawText);
  if (hasDomainKeyword && hasUserHandle) {
    evasionDetected = true;
    evasionType = 'email_split';
  }

  return { evasionDetected, evasionType };
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
 * Get messages for a specific order or context thread
 */
export function getThreadMessages(threadKey) {
  const threads = getStoredThreads();
  if (!threads[threadKey]) {
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
  return threads[threadKey];
}

/**
 * Send a message in a privacy-protected thread with Multi-Message Sliding Window
 */
export function sendPrivacyMessage(threadKey, messageData) {
  const threads = getStoredThreads();
  const currentMessages = threads[threadKey] || getThreadMessages(threadKey);

  const rawInput = messageData.text || '';
  const senderId = messageData.senderId || 'usr_current';

  // Run Sliding Window Anti-Circumvention Analysis
  const { evasionDetected, evasionType } = inspectSlidingWindowForEvasion(currentMessages, senderId, rawInput);

  let cleanText = maskSensitivePII(rawInput);

  // If evasion is caught across multiple messages, strictly mask the fragment
  if (evasionDetected) {
    if (evasionType === 'phone_split') {
      cleanText = '*** *** [Protected Split Phone Number]';
    } else if (evasionType === 'email_split') {
      cleanText = '***@*** [Protected Split Email Address]';
    } else {
      cleanText = '[Protected Contact Fragment]';
    }
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

  const updatedMessages = [...currentMessages, newMessage];

  // If evasion attempt was detected, immediately inject an automated Anti-Circumvention Security Notice
  if (evasionDetected) {
    updatedMessages.push({
      id: `msg_security_${Date.now()}`,
      senderId: 'system_bot',
      senderName: 'AgroLnk Security Shield',
      senderRole: 'system',
      text: '⚠️ AgroLnk Security Alert: Fragmented contact details (split phone numbers or email provider names) were detected and protected. Exchanging direct contact details to trade off-platform voids 100% Escrow Protection and AgroLnk dispute arbitration.',
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

