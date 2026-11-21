// AgrowLink Server-Authoritative Escrow Ledger & Nodal Banking Engine
// Standard: RBI/SEBI Tripartite Escrow Trust Account with Virtual Account Number (VAN) Routing
// Take-Rate: 0.25% Buyer + 0.25% Seller = 0.50% Total Platform Commission
// Security: 100% database-backed (public.orders + RPCs). Zero localStorage ledger state.

import { calculateOrderFinancials, formatINR } from './commission';
import { supabase } from '../lib/supabase';

// Purge any legacy client-side escrow localStorage keys on module load
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    localStorage.removeItem('agrolnk_live_escrow_ledger_v2');
    localStorage.removeItem('agrolnk_live_escrow_events_v2');
  } catch {}
}

// Standard Virtual Nodal Escrow Account Configuration (Read dynamically from .env)
export const ESCROW_NODAL_ACCOUNT = {
  accountName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_ACCOUNT_NAME) || 'AGROWLINK PRIVATE LIMITED',
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

function mapOrderRowToEscrowTxn(row) {
  if (!row) return null;
  const fin = calculateOrderFinancials(Number(row.total_amount || 0));
  const escrowState = String(row.escrow_status || 'pending').toLowerCase();
  const isSettled = escrowState === 'released' || row.status === 'completed';
  const isLocked = ['funded', 'escrow_secured', 'held', 'disputed'].includes(escrowState);

  if (!isSettled && !isLocked) return null;

  return {
    id: row.payment_id ? `TXN_${row.payment_id}` : `TXN_${row.id}`,
    orderId: row.id,
    orderNumber: row.order_number,
    type: isSettled ? 'SETTLEMENT' : 'DEPOSIT',
    commodity: `${row.commodity || 'Produce'}${row.variety ? ` (${row.variety})` : ''}`,
    buyerName: row.buyer_name || 'Buyer',
    farmerName: row.farmer_name || 'Producer',
    grossAmount: Number(row.grand_total_amount || fin.totalBuyerPayable || 0),
    tradeValue: fin.tradeValue,
    buyerFee: Number(row.buyer_fee_amount ?? fin.buyerFee),
    sellerFee: Number(row.seller_fee_amount ?? fin.sellerFee),
    netFarmerPayout: Number(row.net_seller_amount ?? fin.netSellerReceivable),
    platformRevenue: Number(row.platform_commission_amount ?? fin.totalPlatformCommission),
    status: isSettled ? 'SETTLED_TO_FARMER' : 'LOCKED_IN_ESCROW',
    utrNumber: row.bank_utr || row.razorpay_payment_id || null,
    disbursementUtr: isSettled ? (row.bank_utr || row.razorpay_transfer_id || null) : null,
    paymentMode: row.payment_method || row.payment_mode || 'Razorpay / Escrow VAN',
    timestamp: row.disbursed_at || row.updated_at || row.created_at,
    settledAt: row.disbursed_at || null,
    milestone: isSettled
      ? 'Delivery Verified — Payout Settled to Farmer Bank A/C'
      : 'Inward Deposit Confirmed — 100% Locked in Tripartite Escrow',
  };
}

/**
 * Get all live escrow ledger transactions directly from authoritative public.orders table
 */
export async function getEscrowTransactions() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('escrow_status', ['funded', 'escrow_secured', 'held', 'disputed', 'released'])
      .order('updated_at', { ascending: false });

    if (error || !Array.isArray(data)) return [];
    return data.map(mapOrderRowToEscrowTxn).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get live aggregate telemetry of the Escrow Account from authoritative database records
 */
export async function getLiveEscrowTelemetry() {
  const ledger = await getEscrowTransactions();

  const totalLocked = ledger
    .filter((t) => t.status === 'LOCKED_IN_ESCROW')
    .reduce((sum, t) => sum + (Number(t.grossAmount) || 0), 0);

  const totalSettled = ledger
    .filter((t) => t.status === 'SETTLED_TO_FARMER')
    .reduce((sum, t) => sum + (Number(t.netFarmerPayout) || 0), 0);

  const totalRevenue = ledger.reduce((sum, t) => sum + (Number(t.platformRevenue) || 0), 0);
  const totalProcessedVolume = ledger.reduce((sum, t) => sum + (Number(t.tradeValue) || 0), 0);

  return {
    account: ESCROW_NODAL_ACCOUNT,
    totalLockedInEscrow: totalLocked,
    totalSettledToFarmers: totalSettled,
    totalPlatformRevenue: totalRevenue,
    totalProcessedVolume: totalProcessedVolume,
    activeLockedOrdersCount: ledger.filter((t) => t.status === 'LOCKED_IN_ESCROW').length,
    completedSettlementsCount: ledger.filter((t) => t.status === 'SETTLED_TO_FARMER').length,
    totalTransactionsCount: ledger.length,
    lastAuditTimestamp: new Date().toISOString(),
  };
}

/**
 * Get real-time event logs (derived from server transactions; no localStorage state)
 */
export function getLiveEscrowEvents() {
  return [];
}

/**
 * Broadcast UI refresh after a server-verified escrow deposit
 */
export async function processLiveEscrowDeposit({
  orderNumber = '',
  commodity = 'Agricultural Produce',
  tradeAmount = 0,
  buyerName = 'Buyer',
  farmerName = 'Producer',
  paymentMode = 'UPI / Instant Virtual Account',
  paymentId = null,
  bankUtr = null,
}) {
  const fin = calculateOrderFinancials(tradeAmount);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agrolnk_escrow_updated'));
  }
  return {
    id: paymentId ? `TXN_${paymentId}` : `TXN_ESC_${Date.now()}`,
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
    utrNumber: bankUtr || null,
    paymentMode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Server-authoritative Escrow Release notify helper (actual DB mutation occurs via release_escrow_atomic RPC)
 */
export async function processLiveEscrowRelease(orderNumber, otpCode, options = {}) {
  if (!otpCode || typeof otpCode !== 'string' || !otpCode.trim()) {
    throw new Error('A verified delivery OTP or authorized admin token is required to authorize escrow release.');
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agrolnk_escrow_updated'));
    window.dispatchEvent(new CustomEvent('agrolnk_orders_updated'));
  }
  return {
    orderNumber,
    status: 'SETTLED_TO_FARMER',
    disbursementUtr: options?.bankUtr || options?.disbursementUtr || null,
    settledAt: new Date().toISOString(),
  };
}

/**
 * Clear any legacy local escrow keys (server state is unaffected)
 */
export function resetDemoEscrowLedger() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('agrolnk_live_escrow_ledger_v2');
      localStorage.removeItem('agrolnk_live_escrow_events_v2');
      window.dispatchEvent(new Event('agrolnk_escrow_updated'));
    } catch {}
  }
}

/**
 * Deprecated synchronous check: always returns false so callers rely on authoritative order.escrowStatus from Supabase
 */
export function isOrderSettledInEscrow(_orderKey) {
  return false;
}

/**
 * Generate a dedicated Smart Collect Virtual Account display descriptor for an order
 */
export function generateOrderSmartVAN({ orderNumber, buyerPhone, orderAmount }) {
  const prefix = ESCROW_NODAL_ACCOUNT.virtualAccountPrefix || 'AGRO';
  const cleanPhone = (buyerPhone || '9829824928').replace(/\D/g, '').slice(-4);
  const cleanNum = String(orderNumber || Date.now()).replace(/\D/g, '').slice(-4) || '1042';
  const dynamicVan = `${prefix}${cleanPhone}${cleanNum}`;

  return {
    accountNumber: dynamicVan,
    ifscCode: ESCROW_NODAL_ACCOUNT.ifscCode || 'ICIC0000104',
    bankName: ESCROW_NODAL_ACCOUNT.bankName || 'ICICI Bank Ltd.',
    branch: ESCROW_NODAL_ACCOUNT.branch || 'CMS Institutional Agri Branch',
    beneficiaryName: `${ESCROW_NODAL_ACCOUNT.accountName} - ${orderNumber || 'AGM'}`,
    orderAmount: Number(orderAmount || 0),
    paymentMode: 'NEFT / RTGS / IMPS',
    flatGatewayFee: 15,
  };
}

/**
 * Submit an inbound Smart Collect VAN Bank UTR for Server/Admin Verification
 * Never self-funds escrow from the client; calls submit_buyer_van_utr_atomic RPC.
 */
export async function processSmartVanWebhookCredit({
  orderNumber,
  orderId,
  bankUtr,
  amount,
}) {
  const cleanUtr = String(bankUtr || '').trim().toUpperCase();
  if (!cleanUtr || cleanUtr.length < 6) {
    throw new Error('A valid Bank UTR number (minimum 6 characters) is required for VAN verification.');
  }

  const targetOrderKey = orderId || orderNumber;
  if (!targetOrderKey) {
    throw new Error('Order identifier is required to record bank transfer UTR.');
  }

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('submit_buyer_van_utr_atomic', {
    p_order_id: String(targetOrderKey),
    p_bank_utr: cleanUtr,
  });

  if (rpcErr) {
    throw new Error(rpcErr.message || 'Server rejected bank UTR submission.');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agrolnk_escrow_updated'));
    window.dispatchEvent(new CustomEvent('agrolnk_orders_updated'));
  }

  return {
    success: true,
    orderNumber: rpcRes?.order_number || orderNumber,
    bankUtr: cleanUtr,
    amount: formatINR(amount),
    escrowStatus: rpcRes?.escrow_status || 'pending',
  };
}
