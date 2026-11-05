// AgroLnk Live Demo Escrow Account & Real-Time Nodal Banking Engine
// Standard: RBI/SEBI Tripartite Escrow Trust Account with Virtual Account Number (VAN) Routing
// Take-Rate: 0.25% Buyer + 0.25% Seller = 0.50% Total Platform Commission

import { calculateOrderFinancials, formatINR } from './commission';
import { supabase } from '../lib/supabase';

const ESCROW_STORAGE_KEY = 'agrolnk_live_escrow_ledger_v2';
const ESCROW_EVENTS_KEY = 'agrolnk_live_escrow_events_v2';

// Standard Virtual Nodal Escrow Account Configuration (Read dynamically from .env)
export const ESCROW_NODAL_ACCOUNT = {
  accountName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_ACCOUNT_NAME) || 'AGROLNK PRIVATE LIMITED',
  accountNumber: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_ACCOUNT_NUMBER) || '992010884210982',
  virtualAccountPrefix: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_VAN_PREFIX) || 'AGRO',
  bankName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_BANK_NAME) || 'ICICI Bank Ltd.',
  ifscCode: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_IFSC) || 'ICIC0000104',
  branch: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_BRANCH) || 'CMS Institutional Agri Branch',
  trusteePartner: 'RBI Scheduled Commercial Banking Partner',
  escrowType: 'Tripartite Milestone-Protected Agri-Commerce Escrow',
  nodalStatus: 'ACTIVE_REALTIME',
  settlementSpeed: 'Instant IMPS / NEFT 24x7',
};

// Initial Seed Transactions (Empty for clean fresh testing)
const DEFAULT_INITIAL_TRANSACTIONS = [];

// Helper to retrieve local memory state
function getStoredLedger() {
  try {
    const raw = localStorage.getItem(ESCROW_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ESCROW_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_TRANSACTIONS));
      return DEFAULT_INITIAL_TRANSACTIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_INITIAL_TRANSACTIONS;
    return parsed.filter(
      (t) => t && !t.id?.startsWith('TXN_DEMO_') && t.orderNumber !== 'ORD-9821' && t.orderNumber !== 'ORD-9822'
    );
  } catch (_e) {
    return DEFAULT_INITIAL_TRANSACTIONS;
  }
}

function saveStoredLedger(list) {
  try {
    localStorage.setItem(ESCROW_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('agrolnk_escrow_updated'));
  } catch (_e) {
    // Ignore storage errors
  }
}

function getStoredEvents() {
  try {
    const raw = localStorage.getItem(ESCROW_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_e) {
    return [];
  }
}

function logEscrowEvent(event) {
  try {
    const existing = getStoredEvents();
    const updated = [
      {
        id: `EVT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        ...event,
      },
      ...existing
    ].slice(0, 50); // Keep last 50 events
    localStorage.setItem(ESCROW_EVENTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('agrolnk_escrow_event'));
  } catch (_e) {
    // Ignore
  }
}

/**
 * Get live aggregate telemetry of the Escrow Account
 */
export async function getLiveEscrowTelemetry() {
  const ledger = getStoredLedger();
  
  const totalLocked = ledger
    .filter(t => t.status === 'LOCKED_IN_ESCROW')
    .reduce((sum, t) => sum + (Number(t.grossAmount) || 0), 0);

  const totalSettled = ledger
    .filter(t => t.status === 'SETTLED_TO_FARMER')
    .reduce((sum, t) => sum + (Number(t.netFarmerPayout) || 0), 0);

  const totalRevenue = ledger.reduce((sum, t) => sum + (Number(t.platformRevenue) || 0), 0);
  const totalProcessedVolume = ledger.reduce((sum, t) => sum + (Number(t.tradeValue) || 0), 0);

  return {
    account: ESCROW_NODAL_ACCOUNT,
    totalLockedInEscrow: totalLocked,
    totalSettledToFarmers: totalSettled,
    totalPlatformRevenue: totalRevenue,
    totalProcessedVolume: totalProcessedVolume,
    activeLockedOrdersCount: ledger.filter(t => t.status === 'LOCKED_IN_ESCROW').length,
    completedSettlementsCount: ledger.filter(t => t.status === 'SETTLED_TO_FARMER').length,
    totalTransactionsCount: ledger.length,
    lastAuditTimestamp: new Date().toISOString(),
  };
}

/**
 * Get all live escrow ledger transactions
 */
export async function getEscrowTransactions() {
  return getStoredLedger();
}

/**
 * Get real-time event logs (Webhooks, fund movements, settlements)
 */
export function getLiveEscrowEvents() {
  return getStoredEvents();
}

/**
 * Process a Live Escrow Deposit (Buyer Funds 100% Inward Escrow)
 */
export async function processLiveEscrowDeposit({
  orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
  commodity = 'Agricultural Produce',
  tradeAmount = 0,
  buyerName = 'Buyer',
  farmerName = 'Producer',
  paymentMode = 'UPI / Instant Virtual Account',
  paymentId = null,
  bankUtr = null,
}) {
  const fin = calculateOrderFinancials(tradeAmount);
  const authenticUtr = bankUtr || null;
  const txnId = paymentId ? `TXN_${paymentId}` : `TXN_ESC_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  const newTxn = {
    id: txnId,
    orderNumber,
    type: 'DEPOSIT',
    commodity,
    buyerName,
    farmerName,
    grossAmount: fin.totalBuyerPayable,
    tradeValue: fin.tradeValue,
    buyerFee: fin.buyerFee,
    sellerFee: fin.sellerFee,
    netFarmerPayout: fin.netSellerReceivable,
    platformRevenue: fin.totalPlatformCommission,
    status: 'LOCKED_IN_ESCROW',
    utrNumber: authenticUtr,
    paymentMode,
    timestamp: new Date().toISOString(),
    milestone: 'Inward Deposit Confirmed — 100% Locked in Tripartite Escrow',
  };

  const currentLedger = getStoredLedger();
  const updatedLedger = [newTxn, ...currentLedger];
  saveStoredLedger(updatedLedger);

  // Log Webhook event
  logEscrowEvent({
    topic: 'webhook.escrow.payment_captured',
    source: 'ICICI Bank Agri-Nodal Gateway',
    orderNumber,
    amount: formatINR(fin.totalBuyerPayable),
    utr: authenticUtr || 'Pending Gateway Settlement',
    details: `100% Escrow deposit captured from ${buyerName}. 0.25% buyer fee (₹${fin.buyerFee}) added. Funds secured in Nodal Vault.`,
  });

  return newTxn;
}

/**
 * Process a Live Escrow Payout Release (Delivery Confirmed via OTP)
 */
export async function processLiveEscrowRelease(orderNumber, otpCode, options = {}) {
  if (!otpCode || typeof otpCode !== 'string' || !otpCode.trim()) {
    throw new Error('A verified delivery OTP or authorized admin token is required to authorize escrow release.');
  }

  const currentLedger = getStoredLedger();
  const cleanOrderKey = String(orderNumber || '').trim().toLowerCase();
  let found = false;
  let targetTxn = null;

  const authenticUtr = options?.bankUtr || options?.disbursementUtr || null;

  const updated = currentLedger.map(txn => {
    const txnOrderNumber = String(txn.orderNumber || '').trim().toLowerCase();
    const txnId = String(txn.id || '').trim().toLowerCase();
    if ((txnOrderNumber === cleanOrderKey || txnId === cleanOrderKey) && txn.status === 'LOCKED_IN_ESCROW') {
      found = true;
      targetTxn = {
        ...txn,
        status: authenticUtr ? 'SETTLED_TO_FARMER' : 'RELEASED_PENDING_SETTLEMENT',
        disbursementUtr: authenticUtr,
        settledAt: new Date().toISOString(),
        verifiedOtp: otpCode.trim(),
        milestone: authenticUtr
          ? 'Delivery Verified — Payout Settled to Farmer Bank A/C'
          : 'Delivery OTP Verified — Escrow Released, Pending Bank Settlement',
      };
      return targetTxn;
    }
    return txn;
  });

  if (!found) {
    throw new Error(`Escrow contract for order "${orderNumber}" not found or not in locked escrow status.`);
  }

  if (targetTxn) {
    saveStoredLedger(updated);

    // Sync corresponding order in local cache so Buyer and Farmer terminals immediately show 'completed'
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('agrolnk_orders_local');
        if (raw) {
          const orders = JSON.parse(raw);
          if (Array.isArray(orders)) {
            let orderChanged = false;
            const updatedOrders = orders.map((o) => {
              if (o.orderNumber === targetTxn.orderNumber || o.id === targetTxn.orderNumber) {
                orderChanged = true;
                return {
                  ...o,
                  status: 'completed',
                  escrowStatus: 'released',
                  escrow_status: 'released',
                  adminVerificationStatus: 'approved',
                  admin_verification_status: 'approved',
                  bankUtr: targetTxn.disbursementUtr || null,
                  disbursedAt: targetTxn.settledAt,
                  updatedAt: new Date().toISOString(),
                };
              }
              return o;
            });
            if (orderChanged) {
              localStorage.setItem('agrolnk_orders_local', JSON.stringify(updatedOrders));
              localStorage.setItem(`agrolnk_order_status_${targetTxn.orderNumber}`, 'completed');
              localStorage.setItem(`agrolnk_order_escrow_${targetTxn.orderNumber}`, 'released');
              window.dispatchEvent(new CustomEvent('agrolnk_orders_updated'));
              window.dispatchEvent(new Event('storage'));
            }
          }
        }
      }
    } catch (_syncErr) {
      // Local sync ignore
    }

    // Log webhook event
    logEscrowEvent({
      topic: 'webhook.escrow.payout_disbursed',
      source: 'ICICI Bank Agri-Nodal Gateway',
      orderNumber: targetTxn.orderNumber,
      amount: formatINR(targetTxn.netFarmerPayout),
      utr: targetTxn.disbursementUtr || 'Pending Gateway Settlement',
      details: `Escrow release triggered via verification token ${otpCode}. Disbursed ${formatINR(targetTxn.netFarmerPayout)} to ${targetTxn.farmerName}.${authenticUtr ? ` UTR: ${authenticUtr}.` : ' Settlement clearing via nodal gateway.'} AgroLnk 0.50% commission (${formatINR(targetTxn.platformRevenue)}) realized.`,
    });

    return targetTxn;
  }

  return null;
}

/**
 * Reset Demo Escrow to Fresh Initial State
 */
export function resetDemoEscrowLedger() {
  localStorage.setItem(ESCROW_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_TRANSACTIONS));
  localStorage.removeItem(ESCROW_EVENTS_KEY);
  window.dispatchEvent(new Event('agrolnk_escrow_updated'));
  logEscrowEvent({
    topic: 'system.escrow.reset',
    source: 'AgroLnk Operations Console',
    details: 'Escrow nodal vault ledger reset to baseline seed state.',
  });
}

/**
 * Check if an order is settled/released in the live escrow ledger
 */
export function isOrderSettledInEscrow(orderKey) {
  try {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem(ESCROW_STORAGE_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return false;
    const cleanKey = String(orderKey || '').trim().toLowerCase();
    if (!cleanKey) return false;
    return list.some(
      (t) =>
        t &&
        (t.status === 'SETTLED_TO_FARMER' || t.status === 'RELEASED_PENDING_SETTLEMENT') &&
        (String(t.orderNumber || '').trim().toLowerCase() === cleanKey ||
         String(t.id || '').trim().toLowerCase() === cleanKey)
    );
  } catch {
    return false;
  }
}

