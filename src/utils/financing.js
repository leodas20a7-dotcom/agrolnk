// Agrolnk Prototype Financing Engine (LocalStorage)
// Institutional Trade Credit & NBFC Underwriting Architecture
// Supported roles: Farmer (Working Capital & Pre-Harvest/Post-Harvest), Buyer (Invoice Discounting & Auction Trade Credit)

const FINANCING_STORAGE_KEY = 'agrolnkFinancing';
const LIQUIDITY_POOL_KEY = 'agrolnkLiquidityPool';
const DISBURSEMENTS_KEY = 'agrolnkDisbursements';

// Default pre-seeded liquidity pool state
const DEFAULT_LIQUIDITY_POOL = {
  totalCommitted: 10000000, // ₹1.00 Crore Committed Fund
  allocatedDeployed: 2456000, // Currently deployed in live escrow-backed loans
  availableLiquidity: 7544000,
  averageYieldIRR: 11.4, // % p.a.
  historicalNPA: 0.0, // 100% escrow settlement history
  lastRebalanced: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
};

// Default pre-seeded demo financing requests with rich institutional data
const DEFAULT_DEMO_FINANCING = [
  {
    id: 'fin_demo_1024',
    requestNumber: '#FIN-1024',
    applicantId: 'usr_farmer_01',
    applicantName: 'Sakthi Vel',
    applicantRole: 'farmer',
    applicantLocation: 'Salem, Tamil Nadu',
    creditScore: 780,
    riskRating: 'Low (Tier 1)',
    orderId: 'ord_demo_1024',
    orderNumber: '#AGM-1024',
    commodity: 'Tomato',
    variety: 'Hybrid Shivam',
    grade: 'A',
    quantity: 500,
    unit: 'kg',
    transactionValue: 21000,
    requestedAmount: 15000,
    approvedAmount: null,
    interestRate: 9.2, // % p.a.
    tenorDays: 30,
    purpose: 'working_capital',
    purposeLabel: 'Working Capital & Harvest Logistics',
    repaymentOption: 'auto_escrow_deduction',
    repaymentLabel: 'Auto-deduction on escrow payout',
    notes: 'Advance liquidity required for immediate transport packing and seed procurement for next cycle.',
    status: 'pending', // 'pending' | 'under_review' | 'approved' | 'rejected'
    collateralType: 'Order Escrow Pledged',
    collateralValue: 21000,
    ltvRatio: 71.4,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'fin_demo_2088',
    requestNumber: '#FIN-2088',
    applicantId: 'usr_buyer_02',
    applicantName: 'Ananya Agro Foods',
    applicantRole: 'buyer',
    applicantLocation: 'Chennai, Tamil Nadu',
    creditScore: 820,
    riskRating: 'Prime (Tier 1)',
    orderId: 'ord_demo_2088',
    orderNumber: '#AGM-2088',
    commodity: 'Auction Lot: Hybrid Shivam Tomato',
    variety: 'Grade A Export',
    grade: 'A',
    quantity: 12000,
    unit: 'kg',
    transactionValue: 500000,
    requestedAmount: 350000,
    approvedAmount: null,
    interestRate: 10.5,
    tenorDays: 45,
    purpose: 'trade_credit',
    purposeLabel: 'Auction Trade Settlement Credit',
    repaymentOption: '30_day_settlement',
    repaymentLabel: '30-day post-settlement payment',
    notes: 'Wholesale batch auction win liquidity to settle farmgate dispatch invoice.',
    status: 'under_review',
    collateralType: 'Auction Escrow Lien + Post-Dated NACH',
    collateralValue: 500000,
    ltvRatio: 70.0,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'fin_demo_1023',
    requestNumber: '#FIN-1023',
    applicantId: 'usr_farmer_01',
    applicantName: 'Sakthi Vel',
    applicantRole: 'farmer',
    applicantLocation: 'Salem, Tamil Nadu',
    creditScore: 780,
    riskRating: 'Low (Tier 1)',
    orderId: 'ord_demo_1023',
    orderNumber: '#AGM-1023',
    commodity: 'Potato',
    variety: 'Kufri Jyoti',
    grade: 'A',
    quantity: 250,
    unit: 'kg',
    transactionValue: 8750,
    requestedAmount: 6000,
    approvedAmount: 6000,
    interestRate: 9.5,
    tenorDays: 30,
    purpose: 'input_procurement',
    purposeLabel: 'Input Procurement (Seeds & Fertilizer)',
    repaymentOption: 'auto_escrow_deduction',
    repaymentLabel: 'Auto-deduction on escrow payout',
    notes: 'Bulk cold storage deposit liquidity.',
    status: 'approved',
    disbursedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    expectedMaturity: new Date(Date.now() + 3600000 * 24 * 10).toISOString(),
    collateralType: 'e-NWR #eNWR-1024 Vault Lien',
    collateralValue: 8750,
    ltvRatio: 68.5,
    approvedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'fin_demo_3012',
    requestNumber: '#FIN-3012',
    applicantId: 'usr_farmer_03',
    applicantName: 'Coimbatore Organic Spices FPO',
    applicantRole: 'farmer',
    applicantLocation: 'Coimbatore, Tamil Nadu',
    creditScore: 760,
    riskRating: 'Standard (Tier 2)',
    orderId: 'ord_demo_3012',
    orderNumber: '#AGM-3012',
    commodity: 'Turmeric',
    variety: 'Salem Finger',
    grade: 'A',
    quantity: 3000,
    unit: 'kg',
    transactionValue: 420000,
    requestedAmount: 300000,
    approvedAmount: 300000,
    interestRate: 10.0,
    tenorDays: 60,
    purpose: 'inventory_holding',
    purposeLabel: 'WDRA Cold Storage Holding Loan',
    repaymentOption: 'auto_escrow_deduction',
    repaymentLabel: 'Auto-deduction on warehouse release order',
    notes: 'Holding lot in certified Salem Vault for seasonal price appreciation.',
    status: 'approved',
    disbursedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    expectedMaturity: new Date(Date.now() + 3600000 * 24 * 55).toISOString(),
    collateralType: 'WDRA Certified e-NWR Receipt #eNWR-1025',
    collateralValue: 420000,
    ltvRatio: 71.4,
    approvedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
];

// Pre-seeded disbursements ledger
const DEFAULT_DISBURSEMENTS = [
  {
    id: 'disb_01',
    refNumber: 'DISB-2026-0881',
    requestId: 'fin_demo_1023',
    requestNumber: '#FIN-1023',
    applicantName: 'Sakthi Vel (Farmer)',
    amount: 6000,
    interestRate: 9.5,
    tenorDays: 30,
    expectedReturn: 6047,
    status: 'active', // 'active' | 'settled'
    disbursedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    maturityDate: new Date(Date.now() + 3600000 * 24 * 10).toISOString(),
    escrowLienId: 'LIEN-AGM-1023',
    bankUtr: 'HDFC0002981774',
  },
  {
    id: 'disb_02',
    refNumber: 'DISB-2026-0854',
    requestId: 'fin_demo_3012',
    requestNumber: '#FIN-3012',
    applicantName: 'Coimbatore Organic Spices FPO',
    amount: 300000,
    interestRate: 10.0,
    tenorDays: 60,
    expectedReturn: 304931,
    status: 'active',
    disbursedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    maturityDate: new Date(Date.now() + 3600000 * 24 * 55).toISOString(),
    escrowLienId: 'LIEN-eNWR-1025',
    bankUtr: 'ICIC0001094883',
  },
  {
    id: 'disb_03',
    refNumber: 'DISB-2026-0792',
    requestId: 'fin_settled_9901',
    requestNumber: '#FIN-9901',
    applicantName: 'Krishna Valley Grains FPO',
    amount: 450000,
    interestRate: 11.0,
    tenorDays: 30,
    expectedReturn: 454068,
    actualReturn: 454068,
    status: 'settled',
    disbursedAt: new Date(Date.now() - 3600000 * 24 * 35).toISOString(),
    maturityDate: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    settledAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    escrowLienId: 'LIEN-SETTLED-9901',
    bankUtr: 'SBIN0008819283',
  },
];

/**
 * Get Liquidity Pool state
 */
export function getLiquidityPool() {
  try {
    const raw = localStorage.getItem(LIQUIDITY_POOL_KEY);
    if (!raw) {
      localStorage.setItem(LIQUIDITY_POOL_KEY, JSON.stringify(DEFAULT_LIQUIDITY_POOL));
      return DEFAULT_LIQUIDITY_POOL;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_LIQUIDITY_POOL;
  }
}

/**
 * Add funds into the Liquidity Pool
 */
export function addLiquidityPoolFunds(amount) {
  const current = getLiquidityPool();
  const addition = Number(amount) || 0;
  const updated = {
    ...current,
    totalCommitted: current.totalCommitted + addition,
    availableLiquidity: current.availableLiquidity + addition,
    lastRebalanced: new Date().toISOString(),
  };
  localStorage.setItem(LIQUIDITY_POOL_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Get all financing requests from localStorage
 */
export function getFinancingRequests() {
  try {
    const raw = localStorage.getItem(FINANCING_STORAGE_KEY) || localStorage.getItem('agramazFinancing');
    if (!raw) {
      localStorage.setItem(FINANCING_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_FINANCING));
      return DEFAULT_DEMO_FINANCING;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_DEMO_FINANCING;
  } catch {
    return DEFAULT_DEMO_FINANCING;
  }
}

/**
 * Save financing requests to localStorage
 */
function saveFinancingRequests(requests) {
  try {
    localStorage.setItem(FINANCING_STORAGE_KEY, JSON.stringify(requests));
  } catch (err) {
    console.error('Failed to save financing requests to localStorage:', err);
  }
}

/**
 * Get requests for a specific farmer
 */
export function getFarmerFinancingRequests(farmerId) {
  const all = getFinancingRequests();
  if (!farmerId) return all.filter((r) => r.applicantRole === 'farmer');
  return all.filter((r) => r.applicantId === farmerId || (r.applicantRole === 'farmer' && !r.applicantId));
}

/**
 * Get requests for a specific buyer
 */
export function getBuyerFinancingRequests(buyerId) {
  const all = getFinancingRequests();
  if (!buyerId) return all.filter((r) => r.applicantRole === 'buyer');
  return all.filter((r) => r.applicantId === buyerId || (r.applicantRole === 'buyer' && !r.applicantId));
}

/**
 * Get financing request by ID
 */
export function getFinancingRequestById(id) {
  const all = getFinancingRequests();
  return all.find((r) => r.id === id || r.requestNumber === id) || null;
}

/**
 * Get active financing request linked to an order
 */
export function getFinancingRequestForOrder(orderNumberOrId) {
  if (!orderNumberOrId) return null;
  const all = getFinancingRequests();
  return (
    all.find(
      (r) =>
        r.orderId === orderNumberOrId ||
        r.orderNumber === orderNumberOrId ||
        (orderNumberOrId.includes('#') && r.orderNumber.toLowerCase() === orderNumberOrId.toLowerCase())
    ) || null
  );
}

/**
 * Create a new transaction-linked financing request
 */
export function createFinancingRequest(requestData) {
  const currentRequests = getFinancingRequests();

  const generateFinNum = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#FIN-${num}`;
  };

  const transactionVal = Number(requestData.transactionValue) || 10000;
  const reqAmount = Number(requestData.requestedAmount) || 5000;

  const newRequest = {
    id: `fin_${Date.now()}`,
    requestNumber: generateFinNum(),
    applicantId: requestData.applicantId || 'usr_farmer_01',
    applicantName: requestData.applicantName || 'Sakthi Vel',
    applicantRole: requestData.applicantRole || 'farmer',
    applicantLocation: requestData.applicantLocation || 'Tamil Nadu',
    creditScore: 775,
    riskRating: 'Low (Tier 1)',
    orderId: requestData.orderId || '',
    orderNumber: requestData.orderNumber || '#AGM-1000',
    commodity: requestData.commodity || 'Agricultural Produce',
    variety: requestData.variety || 'Standard Lot',
    grade: requestData.grade || 'A',
    quantity: Number(requestData.quantity) || 1,
    unit: requestData.unit || 'kg',
    transactionValue: transactionVal,
    requestedAmount: reqAmount,
    approvedAmount: null,
    interestRate: 9.5,
    tenorDays: 30,
    purpose: requestData.purpose || 'working_capital',
    purposeLabel: requestData.purposeLabel || 'Working Capital & Liquidity',
    repaymentOption: requestData.repaymentOption || 'auto_escrow_deduction',
    repaymentLabel: requestData.repaymentLabel || 'Auto-deduction on escrow release',
    notes: requestData.notes || '',
    status: 'pending',
    collateralType: 'Order Escrow Contract Lien',
    collateralValue: transactionVal,
    ltvRatio: Number(((reqAmount / transactionVal) * 100).toFixed(1)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newRequest, ...currentRequests];
  saveFinancingRequests(updated);
  return newRequest;
}

/**
 * Underwrite and approve a financing request with custom terms
 */
export function underwriteLoan(id, { approvedAmount, interestRate, tenorDays, reviewNotes, riskRating }) {
  const requests = getFinancingRequests();
  const index = requests.findIndex((r) => r.id === id || r.requestNumber === id);
  if (index === -1) return null;

  const current = requests[index];
  const finalApprovedAmount = Number(approvedAmount) || current.requestedAmount;
  const finalRate = Number(interestRate) || current.interestRate || 9.5;
  const finalTenor = Number(tenorDays) || current.tenorDays || 30;

  const updatedRequest = {
    ...current,
    status: 'approved',
    approvedAmount: finalApprovedAmount,
    interestRate: finalRate,
    tenorDays: finalTenor,
    riskRating: riskRating || current.riskRating,
    reviewNotes: reviewNotes || current.reviewNotes,
    approvedAt: new Date().toISOString(),
    disbursedAt: new Date().toISOString(),
    expectedMaturity: new Date(Date.now() + finalTenor * 24 * 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  requests[index] = updatedRequest;
  saveFinancingRequests(requests);

  // Record a new entry in Disbursements Ledger
  const disbursements = getDisbursements();
  const newDisbursement = {
    id: `disb_${Date.now()}`,
    refNumber: `DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    requestId: updatedRequest.id,
    requestNumber: updatedRequest.requestNumber,
    applicantName: updatedRequest.applicantName,
    amount: finalApprovedAmount,
    interestRate: finalRate,
    tenorDays: finalTenor,
    expectedReturn: Math.round(finalApprovedAmount + (finalApprovedAmount * (finalRate / 100) * (finalTenor / 365))),
    status: 'active',
    disbursedAt: new Date().toISOString(),
    maturityDate: updatedRequest.expectedMaturity,
    escrowLienId: `LIEN-${updatedRequest.orderNumber.replace('#', '')}`,
    bankUtr: `AGRI${Math.floor(1000000000 + Math.random() * 9000000000)}`,
  };
  saveDisbursements([newDisbursement, ...disbursements]);

  // Deduct from available liquidity pool
  const pool = getLiquidityPool();
  const updatedPool = {
    ...pool,
    availableLiquidity: Math.max(0, pool.availableLiquidity - finalApprovedAmount),
    allocatedDeployed: pool.allocatedDeployed + finalApprovedAmount,
  };
  localStorage.setItem(LIQUIDITY_POOL_KEY, JSON.stringify(updatedPool));

  return updatedRequest;
}

/**
 * Update status of a financing request
 */
export function updateFinancingStatus(id, nextStatus, approvedAmount = null, reviewNotes = '') {
  const requests = getFinancingRequests();
  const index = requests.findIndex((r) => r.id === id || r.requestNumber === id);
  if (index === -1) return null;

  const current = requests[index];
  const finalApprovedAmount =
    nextStatus === 'approved'
      ? approvedAmount !== null
        ? Number(approvedAmount)
        : current.requestedAmount
      : current.approvedAmount;

  requests[index] = {
    ...current,
    status: nextStatus,
    approvedAmount: finalApprovedAmount,
    reviewNotes: reviewNotes || current.reviewNotes,
    approvedAt: nextStatus === 'approved' ? new Date().toISOString() : current.approvedAt,
    updatedAt: new Date().toISOString(),
  };

  saveFinancingRequests(requests);
  return requests[index];
}

/**
 * Get all disbursements from localStorage
 */
export function getDisbursements() {
  try {
    const raw = localStorage.getItem(DISBURSEMENTS_KEY);
    if (!raw) {
      localStorage.setItem(DISBURSEMENTS_KEY, JSON.stringify(DEFAULT_DISBURSEMENTS));
      return DEFAULT_DISBURSEMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_DISBURSEMENTS;
  } catch {
    return DEFAULT_DISBURSEMENTS;
  }
}

/**
 * Save disbursements to localStorage
 */
function saveDisbursements(disbursements) {
  try {
    localStorage.setItem(DISBURSEMENTS_KEY, JSON.stringify(disbursements));
  } catch (err) {
    console.error('Failed to save disbursements:', err);
  }
}

/**
 * Compute aggregate statistics for the Financier Dashboard
 */
export function getFinancingStats() {
  const all = getFinancingRequests();
  const pool = getLiquidityPool();
  const disbursements = getDisbursements();

  const pendingRequests = all.filter((r) => r.status === 'pending' || r.status === 'under_review').length;
  const activeFunding = all.filter((r) => r.status === 'approved').length;

  const totalFunded = disbursements
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const totalSettledHistorical = disbursements
    .filter((d) => d.status === 'settled')
    .reduce((sum, d) => sum + (Number(d.actualReturn || d.amount) || 0), 0);

  const activeYieldSum = disbursements
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + (d.interestRate || 10.5), 0);

  const avgActiveYield = activeFunding > 0 ? (activeYieldSum / activeFunding).toFixed(1) : pool.averageYieldIRR;

  return {
    pendingRequests,
    activeFunding,
    totalFunded,
    totalSettledHistorical,
    completedCount: 34 + disbursements.filter((d) => d.status === 'settled').length,
    totalRequestsCount: all.length,
    pool,
    avgActiveYield,
    npaRate: 0.0,
  };
}
