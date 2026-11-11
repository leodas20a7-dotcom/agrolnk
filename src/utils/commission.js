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
 * Calculate complete financial breakdown for Transport / Freight Escrow
 * Platform take-rate: 0.25% Consignor fee + 0.25% Transporter commission = 0.50% total
 * @param {number} freightAmount - Agreed base freight quote
 * @returns {object} Full freight breakdown
 */
export function calculateFreightFinancials(freightAmount) {
  const baseFare = Math.max(0, Number(freightAmount) || 0);

  // 0.25% Consignor fee added to payer
  const consignorFee = Math.round(baseFare * BUYER_COMMISSION_RATE * 100) / 100;

  // 0.25% Transporter fee deducted from payout
  const transporterFee = Math.round(baseFare * SELLER_COMMISSION_RATE * 100) / 100;

  // Total AgroLnk commission
  const totalAgroLnkFreightRevenue = Math.round((consignorFee + transporterFee) * 100) / 100;

  // Gross amount deposited by consignor into Escrow
  const totalFreightDeposit = Math.round((baseFare + consignorFee) * 100) / 100;

  // Net payout released to transporter bank account upon OTP delivery
  const netTransporterPayout = Math.round((baseFare - transporterFee) * 100) / 100;

  return {
    baseFare,
    consignorFee,
    buyerFee: consignorFee,
    consignorFeePercentage: 0.25,
    transporterFee,
    transporterFeePercentage: 0.25,
    totalAgroLnkFreightRevenue,
    totalFreightDeposit,
    totalPayableByFarmer: totalFreightDeposit,
    totalPayableByBuyer: totalFreightDeposit,
    netTransporterPayout,
  };
}

export const calculateTransportFinancials = calculateFreightFinancials;

/**
 * Calculate financial breakdown for Warehouse Storage Rent (0.25% Direct Commission Model)
 * Pure commission model: Direct settlement without intermediate escrow hold.
 * Platform take-rate: 0.25% Depositor booking fee + 0.25% Warehouse facilitation fee = 0.50% total take-rate.
 * @param {number} rentAmount - Quoted warehouse rent amount
 * @returns {object} Full rent breakdown
 */
export function calculateWarehouseRentFinancials(rentAmount) {
  const baseRent = Math.max(0, Number(rentAmount) || 0);

  // 0.25% Depositor platform fee
  const depositorFee = Math.round(baseRent * BUYER_COMMISSION_RATE * 100) / 100;

  // 0.25% Warehouse operator service fee
  const warehouseFee = Math.round(baseRent * SELLER_COMMISSION_RATE * 100) / 100;

  // Total AgroLnk commission
  const totalAgroLnkWarehouseRevenue = Math.round((depositorFee + warehouseFee) * 100) / 100;

  // Gross rent paid by farmer
  const totalRentPayable = Math.round((baseRent + depositorFee) * 100) / 100;

  // Net payout settled to warehouse operator
  const netWarehouseReceivable = Math.round((baseRent - warehouseFee) * 100) / 100;

  return {
    baseRent,
    depositorFee,
    depositorFeePercentage: 0.25,
    warehouseFee,
    warehouseFeePercentage: 0.25,
    totalAgroLnkWarehouseRevenue,
    totalRentPayable,
    totalRentDeposit: totalRentPayable,
    netWarehouseReceivable,
    netWarehousePayout: netWarehouseReceivable,
  };
}

/**
 * Calculate financial breakdown for Trade Financing / Credit Line (0.25% Direct LSP Sourcing Fee)
 * Compliant with RBI Digital Lending Guidelines for Lending Service Providers (LSPs).
 * Financial Institutions disburse capital directly to borrower bank accounts.
 * AgroLnk earns a direct 0.25% technology origination / sourcing fee without holding loan principal.
 * @param {number} loanAmount - Principal loan amount sanctioned
 * @returns {object} Full financing breakdown
 */
export function calculateFinancingFinancials(loanAmount) {
  const principal = Math.max(0, Number(loanAmount) || 0);

  // 0.25% Origination / Technology Facilitation Fee
  const originationFee = Math.round(principal * BUYER_COMMISSION_RATE * 100) / 100;

  // Net Disbursed directly from NBFC / Bank to Borrower
  const netDisbursedToBorrower = Math.round((principal - originationFee) * 100) / 100;

  return {
    principal,
    originationFee,
    originationFeePercentage: 0.25,
    totalAgroLnkFinancingRevenue: originationFee,
    netDisbursedToBorrower,
  };
}

/**
 * Format currency in Indian format (₹)
 */
export function formatINR(amount) {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
