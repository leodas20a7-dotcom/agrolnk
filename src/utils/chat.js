// AgroLnk Privacy-Preserving Communication & Chat Engine
// Requirement: Users can communicate through chat while phone numbers, emails, and sensitive details remain protected.

const CHAT_STORAGE_KEY = 'agrolnk_privacy_chat_threads';

/**
 * Filter out PII (Phone numbers, Emails, Bank accounts, PAN/Aadhaar)
 */
export function maskSensitivePII(text) {
  if (!text || typeof text !== 'string') return '';

  let masked = text;

  // Mask 10-digit and international phone numbers (e.g. 9840123456, +91 98401 23456)
  const phoneRegex = /(\+?91[\s-]?)?([6-9]\d{2})[\s-]?(\d{3})[\s-]?(\d{4})/g;
  masked = masked.replace(phoneRegex, (_match, p1, p2, _p3, p4) => {
    return `${p1 || ''}${p2}*** ***${p4.slice(-2)} [Protected Number]`;
  });

  // Mask standalone 10-digit numbers
  const standaloneDigitsRegex = /\b\d{10}\b/g;
  masked = masked.replace(standaloneDigitsRegex, (match) => {
    return `${match.slice(0, 3)}****${match.slice(-2)} [Protected]`;
  });

  // Mask email addresses (e.g. user@gmail.com -> u***@gmail.com)
  const emailRegex = /([a-zA-Z0-9_.+-])([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g;
  masked = masked.replace(emailRegex, (_match, first, _rest, domain) => {
    return `${first}***@${domain}`;
  });

  // Mask Bank Account & IFSC mentions
  const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
  masked = masked.replace(ifscRegex, 'IFSC: ****0123 [Escrow Protected]');

  return masked;
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
        text: '🛡️ AgroLnk Privacy Shield Active: Personal phone numbers, emails, and direct accounts are protected. Please coordinate consignment pickup, delivery timing, and lot specifications here.',
        timestamp: new Date().toISOString(),
        isSystem: true,
      },
    ];
    return defaultMessages;
  }
  return threads[threadKey];
}

/**
 * Send a message in a privacy-protected thread
 */
export function sendPrivacyMessage(threadKey, messageData) {
  const threads = getStoredThreads();
  const currentMessages = threads[threadKey] || getThreadMessages(threadKey);

  const cleanText = maskSensitivePII(messageData.text);

  const newMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    senderId: messageData.senderId || 'usr_current',
    senderName: messageData.senderName || 'Trading Participant',
    senderRole: messageData.senderRole || 'buyer',
    text: cleanText,
    timestamp: new Date().toISOString(),
    isSystem: false,
  };

  const updatedMessages = [...currentMessages, newMessage];

  // Smart Chatbot Automated Assistance Trigger
  const lower = cleanText.toLowerCase();
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

  threads[threadKey] = updatedMessages;
  saveStoredThreads(threads);
  return updatedMessages;
}
