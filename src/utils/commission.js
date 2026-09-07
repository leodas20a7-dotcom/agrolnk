// AgroLnk Commission & Fee Engine
// Platform Model: AgroLnk is a digital transaction platform (not a direct service provider).
// Revenue: 0.25% Buyer Commission + 0.25% Seller Commission = 0.50% Total Platform Take-Rate.

export const BUYER_COMMISSION_RATE = 0.0025;  // 0.25%
export const SELLER_COMMISSION_RATE = 0.0025; // 0.25%
export const TOTAL_COMMISSION_RATE = 0.0050;  // 0.50%

/**
 * Calculate complete financial breakdown for an order
 * @param {number} rawAmount - Transaction value (quantity * pricePerUnit)
 * @returns {object} Full fee and settlement calculation
 */
export function calculateOrderFinancials(rawAmount) {
  const tradeValue = Math.max(0, Number(rawAmount) || 0);
  
  // Platform Commissions
  const buyerFee = Math.round(tradeValue * BUYER_COMMISSION_RATE * 100) / 100;
  const sellerFee = Math.round(tradeValue * SELLER_COMMISSION_RATE * 100) / 100;
  const totalPlatformCommission = Math.round((buyerFee + sellerFee) * 100) / 100;

  // Gross amount deposited by buyer into Escrow
  const totalBuyerPayable = Math.round((tradeValue + buyerFee) * 100) / 100;

  // Net payout received by seller upon escrow release (before any loan deduction)
  const netSellerReceivable = Math.round((tradeValue - sellerFee) * 100) / 100;

  return {
    tradeValue,
    buyerFee,
    buyerFeePercentage: 0.25,
    sellerFee,
    sellerFeePercentage: 0.25,
    totalPlatformCommission,
    totalPlatformCommissionPercentage: 0.50,
    totalBuyerPayable,
    netSellerReceivable,
  };
}

/**
 * Format currency in Indian format (₹)
 */
export function formatINR(amount) {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
