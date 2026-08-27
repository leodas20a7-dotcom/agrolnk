// AGRAMAZ Prototype Financing Engine (LocalStorage)
// Transaction-linked liquidity & trade credit workflow:
// PENDING -> UNDER_REVIEW -> APPROVED / REJECTED

const FINANCING_STORAGE_KEY = 'agramazFinancing';

// Default pre-seeded demo financing requests linked to orders
const DEFAULT_DEMO_FINANCING = [
  {
    id: 'fin_demo_1024',
    requestNumber: '#FIN-1024',
    applicantId: 'usr_farmer_01',
    applicantName: 'Sakthi Vel',
    applicantRole: 'farmer',
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
    purpose: 'working_capital',
    purposeLabel: 'Working Capital & Liquidity',
    repaymentOption: 'auto_escrow_deduction',
    repaymentLabel: 'Auto-deduction on escrow release',
    notes: 'Advance liquidity required for immediate transport packing and seed procurement for next cycle.',
    status: 'pending', // 'pending' | 'under_review' | 'approved' | 'rejected'
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'fin_demo_1023',
    requestNumber: '#FIN-1023',
    applicantId: 'usr_farmer_01',
    applicantName: 'Sakthi Vel',
    applicantRole: 'farmer',
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
    purpose: 'input_procurement',
    purposeLabel: 'Input Procurement (Seeds & Fertilizer)',
    repaymentOption: 'auto_escrow_deduction',
    repaymentLabel: 'Auto-deduction on escrow release',
    notes: 'Bulk cold storage deposit liquidity.',
    status: 'approved',
    approvedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'fin_demo_2088',
    requestNumber: '#FIN-2088',
    applicantId: 'usr_buyer_02',
    applicantName: 'Ananya Agro Foods',
    applicantRole: 'buyer',
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
    purpose: 'trade_credit',
    purposeLabel: 'Auction Trade Settlement Credit',
    repaymentOption: '30_day_settlement',
    repaymentLabel: '30-day post-settlement payment',
    notes: 'Wholesale batch auction win liquidity to settle farmgate dispatch invoice.',
    status: 'under_review',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  }
];

/**
 * Get all financing requests from localStorage
 */
export function getFinancingRequests() {
  try {
    const raw = localStorage.getItem(FINANCING_STORAGE_KEY);
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
  return all.find(
    (r) =>
      r.orderId === orderNumberOrId ||
      r.orderNumber === orderNumberOrId ||
      (orderNumberOrId.includes('#') && r.orderNumber.toLowerCase() === orderNumberOrId.toLowerCase())
  ) || null;
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

  const newRequest = {
    id: `fin_${Date.now()}`,
    requestNumber: generateFinNum(),
    applicantId: requestData.applicantId || 'usr_farmer_01',
    applicantName: requestData.applicantName || 'Sakthi Vel',
    applicantRole: requestData.applicantRole || 'farmer',
    orderId: requestData.orderId || '',
    orderNumber: requestData.orderNumber || '#AGM-1000',
    commodity: requestData.commodity || 'Agricultural Produce',
    variety: requestData.variety || 'Standard Lot',
    grade: requestData.grade || 'A',
    quantity: Number(requestData.quantity) || 1,
    unit: requestData.unit || 'kg',
    transactionValue: Number(requestData.transactionValue) || 0,
    requestedAmount: Number(requestData.requestedAmount) || 0,
    approvedAmount: null,
    purpose: requestData.purpose || 'working_capital',
    purposeLabel: requestData.purposeLabel || 'Working Capital & Liquidity',
    repaymentOption: requestData.repaymentOption || 'auto_escrow_deduction',
    repaymentLabel: requestData.repaymentLabel || 'Auto-deduction on escrow release',
    notes: requestData.notes || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newRequest, ...currentRequests];
  saveFinancingRequests(updated);
  return newRequest;
}

/**
 * Update status of a financing request
 * @param {string} id
 * @param {'pending' | 'under_review' | 'approved' | 'rejected'} nextStatus
 * @param {number} [approvedAmount]
 * @param {string} [reviewNotes]
 */
export function updateFinancingStatus(id, nextStatus, approvedAmount = null, reviewNotes = '') {
  const requests = getFinancingRequests();
  const index = requests.findIndex((r) => r.id === id || r.requestNumber === id);
  if (index === -1) return null;

  const current = requests[index];
  const finalApprovedAmount = nextStatus === 'approved' 
    ? (approvedAmount !== null ? Number(approvedAmount) : current.requestedAmount)
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
 * Compute aggregate statistics for the Financier Dashboard
 */
export function getFinancingStats() {
  const all = getFinancingRequests();
  
  const pendingRequests = all.filter((r) => r.status === 'pending' || r.status === 'under_review').length;
  const activeFunding = all.filter((r) => r.status === 'approved').length;
  
  const totalFunded = all
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (Number(r.approvedAmount) || Number(r.requestedAmount) || 0), 2450000);

  const completed = 34; // Settled historical agreements

  return {
    pendingRequests,
    activeFunding,
    totalFunded,
    completed,
    totalRequestsCount: all.length,
  };
}
