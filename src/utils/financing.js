// Agrolnk Supabase Trade Financing Engine
import { supabase } from '../lib/supabase';

function mapFinancingFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    requestNumber: row.request_number,
    applicantId: row.applicant_id,
    applicantName: row.applicant_name,
    applicantRole: row.applicant_role,
    orderId: row.order_id,
    orderNumber: row.order_number,
    receiptId: row.receipt_id,
    receiptNumber: row.receipt_number,
    commodity: row.commodity,
    variety: row.variety,
    grade: row.grade,
    quantity: Number(row.quantity),
    unit: row.unit,
    transactionValue: Number(row.transaction_value || 0),
    requestedAmount: Number(row.requested_amount),
    approvedAmount: Number(row.approved_amount || row.requested_amount),
    purpose: row.purpose,
    purposeLabel: row.purpose_label,
    repaymentOption: row.repayment_option,
    repaymentLabel: row.repayment_label,
    notes: row.notes,
    reviewNotes: row.review_notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LOCAL_FINANCING_KEY = 'agrolnk_financing_requests_local';

function getLocalFinancingRequests() {
  try {
    const raw = localStorage.getItem(LOCAL_FINANCING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFinancingRequest(item) {
  try {
    const existing = getLocalFinancingRequests();
    const filtered = existing.filter(
      (r) =>
        r.id !== item.id &&
        r.requestNumber !== item.requestNumber &&
        (item.orderNumber ? r.orderNumber !== item.orderNumber : true) &&
        (item.orderId ? r.orderId !== item.orderId : true)
    );
    localStorage.setItem(LOCAL_FINANCING_KEY, JSON.stringify([item, ...filtered]));
  } catch {}
}

const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const generateStandardUuid = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Get all financing requests from Supabase merged with local requests
 */
export async function getFinancingRequests() {
  let remote = [];
  try {
    const { data, error } = await supabase
      .from('financing_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      remote = data.map(mapFinancingFromDb);
    }
  } catch (err) {
    console.error('Error in getFinancingRequests:', err);
  }

  const local = getLocalFinancingRequests();
  const remoteIds = new Set(remote.map((r) => r.id || r.requestNumber || r.orderNumber));
  const merged = [...remote, ...local.filter((l) => !remoteIds.has(l.id) && !remoteIds.has(l.requestNumber) && !remoteIds.has(l.orderNumber))];
  return merged;
}

/**
 * Get requests for a specific farmer
 */
export async function getFarmerFinancingRequests(farmerId) {
  try {
    const all = await getFinancingRequests();
    return all.filter((r) => r.applicantRole === 'farmer' && (!farmerId || r.applicantId === farmerId || r.applicantName?.includes(farmerId)));
  } catch (err) {
    console.error('Error in getFarmerFinancingRequests:', err);
    return [];
  }
}

/**
 * Get requests for a specific buyer
 */
export async function getBuyerFinancingRequests(buyerId) {
  try {
    const all = await getFinancingRequests();
    return all.filter((r) => r.applicantRole === 'buyer' && (!buyerId || r.applicantId === buyerId || r.applicantName?.includes(buyerId)));
  } catch (err) {
    console.error('Error in getBuyerFinancingRequests:', err);
    return [];
  }
}

/**
 * Create a new financing request (Strict 1-time per order/lot)
 */
export async function createFinancingRequest(requestData) {
  // Prevent duplicate repeat requests for the same order or lot
  if (requestData.orderNumber || requestData.orderId) {
    const existing = await getFinancingRequestForOrder(requestData.orderNumber, requestData.orderId);
    if (existing) {
      return existing;
    }
  }

  const reqId = generateStandardUuid();
  const generateReqNum = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#FIN-${num}`;
  };
  const reqNumber = generateReqNum();

  const formattedItem = {
    id: reqId,
    requestNumber: reqNumber,
    applicantId: requestData.applicantId || 'buyer',
    applicantName: requestData.applicantName || 'Applicant Partner',
    applicantRole: requestData.applicantRole || 'buyer',
    orderId: requestData.orderId || null,
    orderNumber: requestData.orderNumber || null,
    receiptId: requestData.receiptId || null,
    receiptNumber: requestData.receiptNumber || null,
    commodity: requestData.commodity || 'Tomato',
    variety: requestData.variety || 'Standard Lot',
    grade: requestData.grade || 'A',
    quantity: Number(requestData.quantity || 100),
    unit: requestData.unit || 'kg',
    transactionValue: Number(requestData.transactionValue || 0),
    requestedAmount: Number(requestData.requestedAmount || 5000),
    approvedAmount: Number(requestData.requestedAmount || 5000),
    purpose: requestData.purpose || 'trade_credit',
    purposeLabel: requestData.purposeLabel || 'Trade Credit Settlement',
    repaymentOption: requestData.repaymentOption || '30_day_settlement',
    repaymentLabel: requestData.repaymentLabel || '30 Days Net',
    notes: requestData.notes || '',
    reviewNotes: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Always save to local storage immediately
  saveLocalFinancingRequest(formattedItem);

  try {
    const dbRow = {
      id: reqId,
      request_number: reqNumber,
      applicant_id: isUuid(requestData.applicantId) ? requestData.applicantId : null,
      applicant_name: requestData.applicantName || 'Applicant Partner',
      applicant_role: requestData.applicantRole || 'buyer',
      order_id: isUuid(requestData.orderId) ? requestData.orderId : null,
      order_number: requestData.orderNumber || null,
      receipt_id: isUuid(requestData.receiptId) ? requestData.receiptId : null,
      receipt_number: requestData.receiptNumber || null,
      commodity: requestData.commodity || 'Tomato',
      variety: requestData.variety || 'Standard Lot',
      grade: requestData.grade || 'A',
      quantity: Number(requestData.quantity || 100),
      unit: requestData.unit || 'kg',
      transaction_value: Number(requestData.transactionValue || 0),
      requested_amount: Number(requestData.requestedAmount || 5000),
      approved_amount: Number(requestData.requestedAmount || 5000),
      purpose: requestData.purpose || 'trade_credit',
      purpose_label: requestData.purposeLabel || 'Trade Credit Settlement',
      repayment_option: requestData.repaymentOption || '30_days',
      repayment_label: requestData.repaymentLabel || '30 Days Net',
      notes: requestData.notes || '',
      review_notes: null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('financing_requests')
      .insert([dbRow])
      .select()
      .single();

    if (!error && data) {
      const mapped = mapFinancingFromDb(data);
      saveLocalFinancingRequest(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase financing insert note, using resilient store:', err);
  }

  return formattedItem;
}

/**
 * Approve or underwrite a financing request
 */
export async function underwriteFinancingRequest(requestId, approvalData) {
  try {
    const local = getLocalFinancingRequests();
    const updatedLocal = local.map((r) => {
      if (r.id === requestId || r.requestNumber === requestId) {
        return {
          ...r,
          status: approvalData.status || 'approved',
          approvedAmount: Number(approvalData.approvedAmount || r.requestedAmount),
          reviewNotes: approvalData.reviewNotes || 'Approved by underwriter',
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });
    localStorage.setItem(LOCAL_FINANCING_KEY, JSON.stringify(updatedLocal));

    if (isUuid(requestId)) {
      const { data, error } = await supabase
        .from('financing_requests')
        .update({
          status: approvalData.status || 'approved',
          approved_amount: Number(approvalData.approvedAmount),
          review_notes: approvalData.reviewNotes || 'Approved by underwriter',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (!error && data) {
        return mapFinancingFromDb(data);
      }
    }
  } catch (err) {
    console.error('Error underwriting request:', err);
  }

  const all = await getFinancingRequests();
  return all.find((r) => r.id === requestId || r.requestNumber === requestId) || null;
}

export const updateFinancingStatus = underwriteFinancingRequest;
export const underwriteLoan = underwriteFinancingRequest;

/**
 * Get all disbursements (derived from approved financing requests)
 */
export async function getDisbursements() {
  try {
    const requests = await getFinancingRequests();
    return requests
      .filter((r) => r.status === 'approved' || r.status === 'disbursed')
      .map((r, i) => {
        const monthlyRate = 0.85; // 0.85% per month
        const tenorDays = 30;
        const expectedReturn = Math.round(r.approvedAmount * (1 + (monthlyRate / 100) * (tenorDays / 30)));
        return {
          id: `disb_${r.id}`,
          refNumber: `DISB-2026-00${i + 1}`,
          requestId: r.id,
          requestNumber: r.requestNumber,
          applicantName: r.applicantName,
          amount: r.approvedAmount,
          interestRate: monthlyRate,
          tenorDays,
          expectedReturn,
          status: 'active',
          disbursedAt: r.createdAt,
        };
      });
  } catch (err) {
    console.error('Error in getDisbursements:', err);
    return [];
  }
}

/**
 * Get financing request linked to an order
 */
export async function getFinancingRequestForOrder(orderNumberOrId, alternateId) {
  try {
    if (!orderNumberOrId && !alternateId) return null;
    const local = getLocalFinancingRequests();
    const foundLocal = local.find(
      (r) =>
        (orderNumberOrId && (r.orderId === orderNumberOrId || r.orderNumber === orderNumberOrId || r.id === orderNumberOrId || r.requestNumber === orderNumberOrId)) ||
        (alternateId && (r.orderId === alternateId || r.orderNumber === alternateId || r.id === alternateId || r.requestNumber === alternateId))
    );
    if (foundLocal) return foundLocal;

    const filters = [];
    if (orderNumberOrId) filters.push(`order_number.eq.${orderNumberOrId}`, `order_id.eq.${orderNumberOrId}`);
    if (alternateId) filters.push(`order_number.eq.${alternateId}`, `order_id.eq.${alternateId}`);

    const { data, error } = await supabase
      .from('financing_requests')
      .select('*')
      .or(filters.join(','))
      .maybeSingle();

    if (!error && data) return mapFinancingFromDb(data);
    return null;
  } catch {
    return null;
  }
}

/**
 * Get financing request by ID
 */
export async function getFinancingRequestById(id) {
  try {
    if (!id) return null;
    const { data, error } = await supabase
      .from('financing_requests')
      .select('*')
      .or(`id.eq.${id},request_number.eq.${id}`)
      .maybeSingle();

    if (error || !data) return null;
    return mapFinancingFromDb(data);
  } catch {
    return null;
  }
}

/**
 * Get liquidity pool details
 */
export function getLiquidityPool() {
  return {
    totalCommitted: 10000000,
    availableLiquidity: 7500000,
    deployedLiquidity: 2500000,
    utilizationRate: 25,
    weightedAvgReturn: 0.95, // 0.95% per month
    nonPerformingRate: 0.0,
    activeTranches: 4,
  };
}

export function addLiquidityPoolFunds(amount) {
  return {
    success: true,
    addedAmount: Number(amount),
    newCommitted: 10000000 + Number(amount),
  };
}

/**
 * Get aggregate financing statistics
 */
export async function getFinancingStats() {
  try {
    const all = await getFinancingRequests();
    const pending = all.filter((r) => r.status === 'pending');
    const approved = all.filter((r) => r.status === 'approved' || r.status === 'disbursed');
    const totalApproved = approved.reduce((sum, r) => sum + (Number(r.approvedAmount) || Number(r.requestedAmount) || 0), 0);
    const totalPending = pending.reduce((sum, r) => sum + (Number(r.requestedAmount) || 0), 0);

    return {
      pendingRequestsCount: pending.length,
      pendingRequestsAmount: totalPending,
      approvedRequestsCount: approved.length,
      approvedRequestsAmount: totalApproved,
      activeLoansCount: approved.length,
      totalCommittedPool: 10000000,
      availableLiquidity: Math.max(0, 10000000 - totalApproved),
      averageInterestRate: 0.85, // 0.85% per month
    };
  } catch (err) {
    console.error('Error in getFinancingStats:', err);
    return {
      pendingRequestsCount: 0,
      pendingRequestsAmount: 0,
      approvedRequestsCount: 0,
      approvedRequestsAmount: 0,
      activeLoansCount: 0,
      totalCommittedPool: 10000000,
      availableLiquidity: 10000000,
      averageInterestRate: 0.85,
    };
  }
}
