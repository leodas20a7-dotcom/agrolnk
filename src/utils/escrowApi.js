// AgroLnk Live Demo Escrow Account & Real-Time Nodal Banking Engine
// Standard: RBI/SEBI Tripartite Escrow Trust Account with Virtual Account Number (VAN) Routing
// Take-Rate: 0.25% Buyer + 0.25% Seller = 0.50% Total Platform Commission

import { calculateOrderFinancials, formatINR } from './commission';
import { supabase } from '../lib/supabase';

const ESCROW_STORAGE_KEY = 'agrolnk_live_escrow_ledger_v2';
const ESCROW_EVENTS_KEY = 'agrolnk_live_escrow_events_v2';

// Standard Virtual Nodal Escrow Account Configuration
export const ESCROW_NODAL_ACCOUNT = {
  accountName: 'AgroLnk Escrow Settlement Trust A/C',
  accountNumber: '992010884210982',
  virtualAccountPrefix: 'AGROESC',
  bankName: 'ICICI Bank Ltd. (Institutional Agri-Nodal Branch)',
  ifscCode: 'ICIC0000104',
  trusteePartner: 'Vistra / Axis Trustee Services Ltd. (SEBI Reg. IND000000523)',
  escrowType: 'Tripartite Milestone-Protected Agri-Commerce Escrow',
  nodalStatus: 'ACTIVE_REALTIME',
  settlementSpeed: 'Instant IMPS / NEFT 24x7',
};

// Initial Seed Transactions for High-Impact Live Demos
const DEFAULT_INITIAL_TRANSACTIONS = [
  {
    id: 'TXN_ESC_9081',
    orderNumber: 'ORD-8821',
    type: 'DEPOSIT',
    commodity: 'Tomato (Hybrid Shivam)',
    buyerName: 'Maran S (Global Agro)',
    farmerName: 'Veerappan (Salem Producer)',
    grossAmount: 4210.50,
    tradeValue: 4200.00,
    buyerFee: 10.50,
    sellerFee: 10.50,
    netFarmerPayout: 4189.50,
    platformRevenue: 21.00,
    status: 'LOCKED_IN_ESCROW',
    utrNumber: 'CMSICICI202609088812',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    milestone: 'In Transit — Held under Corridors Manifest',
  },
  {
    id: 'TXN_ESC_9074',
    orderNumber: 'ORD-8790',
    type: 'DISBURSEMENT',
    commodity: 'Basmati Rice (Pusa 1121)',
    buyerName: 'ITC Agri Sourcing Ltd.',
    farmerName: 'Sakthi Vel (Attur Farmgate)',
    grossAmount: 76190.00,
    tradeValue: 76000.00,
    buyerFee: 190.00,
    sellerFee: 190.00,
    netFarmerPayout: 75810.00,
    platformRevenue: 380.00,
    status: 'SETTLED_TO_FARMER',
    utrNumber: 'CMSICICI202609081049',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    milestone: 'Delivered & OTP Verified by Buyer',
  },
  {
    id: 'TXN_ESC_9062',
    orderNumber: 'ORD-8735',
    type: 'DISBURSEMENT',
    commodity: 'Salem Turmeric (Grade A)',
    buyerName: 'Southern Spices Hub',
    farmerName: 'Kavin Kumar (Erode Agri Lot)',
    grossAmount: 18045.00,
    tradeValue: 18000.00,
    buyerFee: 45.00,
    sellerFee: 45.00,
    netFarmerPayout: 17955.00,
    platformRevenue: 90.00,
    status: 'SETTLED_TO_FARMER',
    utrNumber: 'CMSICICI202609079941',
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    milestone: 'Quality Assayed & Delivery OTP Confirmed',
  }
];

// Helper to retrieve local memory state
function getStoredLedger() {
  try {
    const raw = localStorage.getItem(ESCROW_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ESCROW_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_TRANSACTIONS));
      return DEFAULT_INITIAL_TRANSACTIONS;
    }
    return JSON.parse(raw);
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
  commodity = 'Tomato (Hybrid Shivam)',
  tradeAmount = 4200,
  buyerName = 'Maran S (Global Agro)',
  farmerName = 'Veerappan (Verified Producer)',
  paymentMode = 'UPI / Instant Virtual Account',
}) {
  const fin = calculateOrderFinancials(tradeAmount);
  const utr = `CMSICICI${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;
  const txnId = `TXN_ESC_${Math.floor(1000 + Math.random() * 9000)}`;

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
    utrNumber: utr,
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
    utr,
    details: `100% Escrow deposit captured from ${buyerName}. 0.25% buyer fee (₹${fin.buyerFee}) added. Funds secured in Nodal Vault.`,
  });

  return newTxn;
}

/**
 * Process a Live Escrow Payout Release (Delivery Confirmed via OTP)
 */
export async function processLiveEscrowRelease(orderNumber, otpCode = '749102') {
  const currentLedger = getStoredLedger();
  let found = false;
  let targetTxn = null;

  const updated = currentLedger.map(txn => {
    if ((txn.orderNumber === orderNumber || txn.id === orderNumber) && txn.status === 'LOCKED_IN_ESCROW') {
      found = true;
      targetTxn = {
        ...txn,
        status: 'SETTLED_TO_FARMER',
        disbursementUtr: `DISBICICI${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(1000 + Math.random() * 9000)}`,
        settledAt: new Date().toISOString(),
        verifiedOtp: otpCode,
        milestone: 'Delivery OTP Verified — Disbursed to Producer Bank A/C',
      };
      return targetTxn;
    }
    return txn;
  });

  if (!found && currentLedger.length > 0) {
    // If specific order not found locked, release the first active locked transaction
    const firstLockedIndex = currentLedger.findIndex(t => t.status === 'LOCKED_IN_ESCROW');
    if (firstLockedIndex !== -1) {
      targetTxn = {
        ...currentLedger[firstLockedIndex],
        status: 'SETTLED_TO_FARMER',
        disbursementUtr: `DISBICICI${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(1000 + Math.random() * 9000)}`,
        settledAt: new Date().toISOString(),
        verifiedOtp: otpCode,
        milestone: 'Delivery OTP Verified — Disbursed to Producer Bank A/C',
      };
      updated[firstLockedIndex] = targetTxn;
      found = true;
    }
  }

  if (found && targetTxn) {
    saveStoredLedger(updated);

    // Log webhook event
    logEscrowEvent({
      topic: 'webhook.escrow.payout_disbursed',
      source: 'ICICI Bank Agri-Nodal Gateway',
      orderNumber: targetTxn.orderNumber,
      amount: formatINR(targetTxn.netFarmerPayout),
      utr: targetTxn.disbursementUtr,
      details: `Escrow release triggered via OTP ${otpCode}. Disbursed ${formatINR(targetTxn.netFarmerPayout)} to ${targetTxn.farmerName}. AgroLnk 0.50% commission (${formatINR(targetTxn.platformRevenue)}) realized.`,
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
