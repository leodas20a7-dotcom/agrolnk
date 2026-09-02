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

/**
 * Get all financing requests from Supabase
 */
export async function getFinancingRequests() {
  try {
    const { data, error } = await supabase
      .from('financing_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch financing requests:', error);
      return [];
    }

    return (data || []).map(mapFinancingFromDb);
  } catch (err) {
    console.error('Error in getFinancingRequests:', err);
    return [];
  }
}

/**
 * Get requests for a specific farmer
 */
export async function getFarmerFinancingRequests(farmerId) {
  try {
    if (!farmerId) return await getFinancingRequests();

    const { data, error } = await supabase
      .from('financing_requests')
      .select('*')
      .eq('applicant_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch farmer financing requests:', error);
      return [];
    }

    return (data || []).map(mapFinancingFromDb);
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
    if (!buyerId) return await getFinancingRequests();

    const { data, error } = await supabase
      .from('financing_requests')
      .select('*')
      .eq('applicant_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch buyer financing requests:', error);
      return [];
    }

    return (data || []).map(mapFinancingFromDb);
  } catch (err) {
    console.error('Error in getBuyerFinancingRequests:', err);
    return [];
  }
}

/**
 * Create a new financing request
 */
export async function createFinancingRequest(requestData) {
  try {
    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch {
        return `fin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    };

    const generateReqNum = () => {
      const num = Math.floor(1000 + Math.random() * 9000);
      return `#FIN-${num}`;
    };

    const dbRow = {
      id: generateId(),
      request_number: generateReqNum(),
      applicant_id: requestData.applicantId || null,
      applicant_name: requestData.applicantName || 'Applicant Partner',
      applicant_role: requestData.applicantRole || 'farmer',
      order_id: requestData.orderId || null,
      order_number: requestData.orderNumber || null,
      receipt_id: requestData.receiptId || null,
      receipt_number: requestData.receiptNumber || null,
      commodity: requestData.commodity || 'Tomato',
      variety: requestData.variety || 'Standard Lot',
      grade: requestData.grade || 'A',
      quantity: Number(requestData.quantity || 100),
      unit: requestData.unit || 'kg',
      transaction_value: Number(requestData.transactionValue || 0),
      requested_amount: Number(requestData.requestedAmount || 5000),
      approved_amount: Number(requestData.requestedAmount || 5000),
      purpose: requestData.purpose || 'working_capital',
      purpose_label: requestData.purposeLabel || 'Working Capital Advance',
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

    if (error) {
      console.error('Supabase financing request creation error:', error);
      throw error;
    }

    return mapFinancingFromDb(data);
  } catch (err) {
    console.error('Error creating financing request:', err);
    throw err;
  }
}

/**
 * Approve or underwrite a financing request
 */
export async function underwriteFinancingRequest(requestId, approvalData) {
  try {
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

    if (error) throw error;
    return mapFinancingFromDb(data);
  } catch (err) {
    console.error('Error underwriting request:', err);
    throw err;
  }
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
      .map((r, i) => ({
        id: `disb_${r.id}`,
        refNumber: `DISB-2026-00${i + 1}`,
        requestId: r.id,
        requestNumber: r.requestNumber,
        applicantName: r.applicantName,
        amount: r.approvedAmount,
        interestRate: 9.5,
        tenorDays: 30,
        expectedReturn: Math.round(r.approvedAmount * 1.025),
        status: 'active',
        disbursedAt: r.createdAt,
      }));
  } catch (err) {
    console.error('Error in getDisbursements:', err);
    return [];
  }
}

/**
 * Get financing request linked to an order
 */
export async function getFinancingRequestForOrder(orderNumberOrId) {
  try {
    if (!orderNumberOrId) return null;
    const { data, error } = await supabase
      .from('financing_requests')
      .select('*')
      .or(`order_id.eq.${orderNumberOrId},order_number.eq.${orderNumberOrId}`)
      .maybeSingle();

    if (error || !data) return null;
    return mapFinancingFromDb(data);
  } catch {
    return null;
  }
}

/**
 * Get financing request by ID
 */
export async function getFinancingRequestById(id) {
  try {
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
    weightedAvgReturn: 10.5,
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
      averageInterestRate: 9.5,
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
      averageInterestRate: 9.5,
    };
  }
}
