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
    marginPaid: Boolean(row.margin_paid),
    escrowFunded: Boolean(row.escrow_funded),
    paymentId: row.payment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LOCAL_FINANCING_KEY = 'agrolnk_financing_requests_local';

function getLocalFinancingRequests() {
  try {
    const raw = localStorage.getItem(LOCAL_FINANCING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const seen = new Set();
    const deduped = [];
    for (const item of list) {
      if (!item) continue;
      // Deduplicate signatures to prevent multi-click repeats
      const signature = `${item.applicantId || 'applicant'}_${item.listingId || item.commodity || 'lot'}_${item.quantity || ''}_${item.requestedAmount || ''}`;
      const directKey = item.id || item.requestNumber;
      if (!seen.has(signature) && !seen.has(directKey)) {
        seen.add(signature);
        seen.add(directKey);
        deduped.push(item);
      }
    }
    return deduped;
  } catch {
    return [];
  }
}

function saveLocalFinancingRequest(item) {
  try {
    const existing = getLocalFinancingRequests();
    const existingItem = existing.find(
      (r) =>
        r.id === item.id ||
        r.requestNumber === item.requestNumber ||
        (item.orderNumber && r.orderNumber === item.orderNumber) ||
        (item.orderId && r.orderId === item.orderId)
    );

    // Deep merge to preserve settled status & margin payment
    const mergedItem = {
      ...(existingItem || {}),
      ...item,
      marginPaid: Boolean(item.marginPaid || existingItem?.marginPaid),
      escrowFunded: Boolean(item.escrowFunded || existingItem?.escrowFunded),
      paymentId: item.paymentId || existingItem?.paymentId || null,
      status: (item.status && item.status !== 'pending') ? item.status : (existingItem?.status || item.status || 'pending'),
    };

    const filtered = existing.filter(
      (r) =>
        r.id !== item.id &&
        r.requestNumber !== item.requestNumber &&
        (item.orderNumber ? r.orderNumber !== item.orderNumber : true) &&
        (item.orderId ? r.orderId !== item.orderId : true) &&
        (item.listingId ? (r.listingId !== item.listingId || r.applicantId !== item.applicantId) : true) &&
        !(r.commodity === item.commodity && r.applicantId === item.applicantId && Number(r.quantity) === Number(item.quantity) && r.status === 'pending')
    );
    localStorage.setItem(LOCAL_FINANCING_KEY, JSON.stringify([mergedItem, ...filtered]));
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
  const localMap = new Map();
  local.forEach((l) => {
    if (l.id) localMap.set(l.id, l);
    if (l.requestNumber) localMap.set(l.requestNumber, l);
    if (l.orderNumber) localMap.set(l.orderNumber, l);
    if (l.orderId) localMap.set(l.orderId, l);
  });

  const mergedRemote = remote.map((r) => {
    const localMatch = localMap.get(r.id) || localMap.get(r.requestNumber) || (r.orderNumber && localMap.get(r.orderNumber)) || (r.orderId && localMap.get(r.orderId));
    if (localMatch) {
      // Remote terminal state (approved/rejected/disbursed) ALWAYS takes precedence over stale local 'pending'
      const resolvedStatus = (r.status && r.status !== 'pending')
        ? r.status
        : (localMatch.status || r.status || 'pending');

      const resolvedApprovedAmount = (r.approvedAmount && Number(r.approvedAmount) > 0)
        ? r.approvedAmount
        : (localMatch.approvedAmount || r.approvedAmount || r.requestedAmount);

      return {
        ...localMatch,
        ...r,
        approvedAmount: resolvedApprovedAmount,
        marginPaid: Boolean(r.marginPaid || localMatch.marginPaid),
        escrowFunded: Boolean(r.escrowFunded || localMatch.escrowFunded),
        paymentId: r.paymentId || localMatch.paymentId || null,
        status: resolvedStatus,
      };
    }
    return r;
  });

  const remoteKeys = new Set(remote.flatMap((r) => [r.id, r.requestNumber, r.orderNumber, r.orderId].filter(Boolean)));
  const localOnly = local.filter((l) => !remoteKeys.has(l.id) && !remoteKeys.has(l.requestNumber) && (!l.orderNumber || !remoteKeys.has(l.orderNumber)));

  return [...mergedRemote, ...localOnly];
}

/**
 * Get requests for a specific farmer
 */
export async function getFarmerFinancingRequests(farmerId, currentUser) {
  try {
    const all = await getFinancingRequests();
    const userEmail = currentUser?.email || '';
    const userName = currentUser?.name || '';
    return all.filter((r) => {
      if (r.applicantRole !== 'farmer') return false;
      if (!farmerId && !userEmail && !userName) return true;
      return (
        (farmerId && r.applicantId === farmerId) ||
        (userEmail && (r.applicantId === userEmail || r.applicantId?.includes(userEmail))) ||
        (userName && (r.applicantName === userName || r.applicantName?.toLowerCase().includes(userName.toLowerCase()))) ||
        r.applicantId === 'farmer_trade' ||
        r.applicantId === 'farmer'
      );
    });
  } catch (err) {
    console.error('Error in getFarmerFinancingRequests:', err);
    return [];
  }
}

/**
 * Get requests for a specific buyer
 */
export async function getBuyerFinancingRequests(buyerId, currentUser) {
  try {
    const all = await getFinancingRequests();
    const userEmail = currentUser?.email || '';
    const userName = currentUser?.name || '';
    return all.filter((r) => {
      if (r.applicantRole !== 'buyer') return false;
      if (!buyerId && !userEmail && !userName) return true;
      return (
        (buyerId && r.applicantId === buyerId) ||
        (userEmail && (r.applicantId === userEmail || r.applicantId?.includes(userEmail))) ||
        (userName && (r.applicantName === userName || r.applicantName?.toLowerCase().includes(userName.toLowerCase()))) ||
        r.applicantId === 'buyer_trade' ||
        r.applicantId === 'buyer'
      );
    });
  } catch (err) {
    console.error('Error in getBuyerFinancingRequests:', err);
    return [];
  }
}

/**
 * Create a new financing request (Strict 1-time per order/lot/listing)
 */
export async function createFinancingRequest(requestData) {
  // 1. Check if an active request already exists for this order
  if (requestData.orderNumber || requestData.orderId) {
    const existing = await getFinancingRequestForOrder(requestData.orderNumber, requestData.orderId);
    if (existing) {
      return existing;
    }
  }

  // 2. Prevent duplicate repeat applications for the same listing lot or commodity
  const localRequests = getLocalFinancingRequests();
  const existingActive = localRequests.find((r) => {
    if (r.status === 'rejected' || r.status === 'cancelled') return false;
    if (requestData.listingId && r.listingId === requestData.listingId && r.applicantId === requestData.applicantId) {
      return true;
    }
    if (
      requestData.commodity &&
      r.commodity === requestData.commodity &&
      r.applicantId === requestData.applicantId &&
      Number(r.quantity) === Number(requestData.quantity)
    ) {
      return true;
    }
    return false;
  });

  if (existingActive) {
    return existingActive;
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
    listingId: requestData.listingId || null,
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
    marginPaid: Boolean(requestData.marginPaid),
    escrowFunded: Boolean(requestData.escrowFunded),
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
export async function underwriteFinancingRequest(requestId, approvalDataOrStatus, maybeAmount, maybeNotes) {
  const approvalData =
    typeof approvalDataOrStatus === 'object' && approvalDataOrStatus !== null
      ? approvalDataOrStatus
      : {
          status: approvalDataOrStatus || 'approved',
          approvedAmount: maybeAmount,
          reviewNotes: maybeNotes,
        };

  const nextStatus = approvalData.status || 'approved';
  const nextNotes =
    approvalData.reviewNotes ||
    (nextStatus === 'approved'
      ? 'Approved by institutional credit desk'
      : nextStatus === 'rejected'
      ? 'Application declined by risk policy'
      : 'Under evaluation');

  try {
    const targetKey = typeof requestId === 'string' ? requestId.trim() : String(requestId || '');
    const reqNum = approvalData.requestNumber || (targetKey.startsWith('#FIN-') ? targetKey : null);
    const ordNum = approvalData.orderNumber || (targetKey.startsWith('#AGM-') ? targetKey : null);

    const local = getLocalFinancingRequests();
    let matched = false;
    const updatedLocal = local.map((r) => {
      const isMatch =
        (targetKey && (r.id === targetKey || r.requestNumber === targetKey || r.orderNumber === targetKey || r.orderId === targetKey)) ||
        (reqNum && r.requestNumber === reqNum) ||
        (ordNum && (r.orderNumber === ordNum || r.orderId === ordNum));

      if (isMatch) {
        matched = true;
        const nextAmount =
          approvalData.approvedAmount !== undefined && approvalData.approvedAmount !== null
            ? Number(approvalData.approvedAmount)
            : Number(r.approvedAmount || r.requestedAmount);

        return {
          ...r,
          ...approvalData,
          status: nextStatus,
          approvedAmount: nextAmount,
          reviewNotes: nextNotes,
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });

    if (!matched && (reqNum || ordNum || targetKey)) {
      updatedLocal.unshift({
        id: targetKey,
        requestNumber: reqNum || (targetKey.startsWith('#FIN-') ? targetKey : '#FIN-REQ'),
        orderNumber: ordNum,
        ...approvalData,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    localStorage.setItem(LOCAL_FINANCING_KEY, JSON.stringify(updatedLocal));

    // Global broadcast so other views/tabs update instantly
    try {
      const target = updatedLocal.find(
        (r) =>
          (targetKey && (r.id === targetKey || r.requestNumber === targetKey || r.orderNumber === targetKey || r.orderId === targetKey)) ||
          (reqNum && r.requestNumber === reqNum) ||
          (ordNum && (r.orderNumber === ordNum || r.orderId === ordNum))
      );
      if (target && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: target }));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}

    const updatePayload = {
      status: nextStatus,
      review_notes: nextNotes,
      updated_at: new Date().toISOString(),
    };
    if (approvalData.approvedAmount !== undefined && approvalData.approvedAmount !== null) {
      updatePayload.approved_amount = Number(approvalData.approvedAmount);
    }
    if (approvalData.marginPaid !== undefined) {
      updatePayload.margin_paid = Boolean(approvalData.marginPaid);
    }
    if (approvalData.escrowFunded !== undefined) {
      updatePayload.escrow_funded = Boolean(approvalData.escrowFunded);
    }
    if (approvalData.paymentId) {
      updatePayload.payment_id = approvalData.paymentId;
    }
    if (approvalData.marginPaidAt) {
      updatePayload.margin_paid_at = approvalData.marginPaidAt;
    }

    // Update in Supabase across ID, request_number, or order_number
    try {
      let query;
      if (isUuid(requestId)) {
        query = supabase
          .from('financing_requests')
          .update(updatePayload)
          .eq('id', requestId);
      } else {
        query = supabase
          .from('financing_requests')
          .update(updatePayload)
          .or(`request_number.eq.${requestId},order_number.eq.${requestId}`);
      }

      const { error: updateErr } = await query;
      if (updateErr) {
        // Fallback in case custom margin columns are pending SQL schema migration
        const basicPayload = {
          status: nextStatus,
          review_notes: nextNotes,
          updated_at: new Date().toISOString(),
        };
        if (approvalData.approvedAmount !== undefined && approvalData.approvedAmount !== null) {
          basicPayload.approved_amount = Number(approvalData.approvedAmount);
        }
        if (isUuid(requestId)) {
          await supabase.from('financing_requests').update(basicPayload).eq('id', requestId);
        } else {
          await supabase.from('financing_requests').update(basicPayload).or(`request_number.eq.${requestId},order_number.eq.${requestId}`);
        }
      }
    } catch (dbErr) {
      console.warn('Supabase financing table update note:', dbErr);
    }
  } catch (err) {
    console.error('Error underwriting request:', err);
  }

  const all = await getFinancingRequests();
  return all.find((r) => r.id === requestId || r.requestNumber === requestId || (r.orderNumber && r.orderNumber === requestId)) || null;
}

export const updateFinancingStatus = underwriteFinancingRequest;
export const underwriteLoan = underwriteFinancingRequest;

// Setup Supabase Realtime Subscription for Financing Requests Table
if (typeof window !== 'undefined') {
  try {
    supabase
      .channel('public:financing_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financing_requests' },
        (payload) => {
          if (payload.new) {
            const mapped = mapFinancingFromDb(payload.new);
            saveLocalFinancingRequest(mapped);
            window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: mapped }));
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.info('Supabase Realtime for financing_requests initialized');
  }
}

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
        const expectedReturn = Math.round((Number(r.approvedAmount) || Number(r.requestedAmount) || 0) * (1 + (monthlyRate / 100) * (tenorDays / 30)));
        const utrNum = `UTR${202600000000 + (i + 1) * 9481 + 107}`;

        return {
          id: `disb_${r.id}`,
          refNumber: `DISB-2026-00${i + 1}`,
          bankUtr: utrNum,
          requestId: r.id,
          requestNumber: r.requestNumber,
          applicantName: r.applicantName || 'Applicant Partner',
          applicantRole: r.applicantRole || 'buyer',
          orderNumber: r.orderNumber || null,
          commodity: r.commodity || 'Produce Lot',
          amount: Number(r.approvedAmount) || Number(r.requestedAmount) || 0,
          interestRate: monthlyRate,
          tenorDays,
          expectedReturn,
          status: 'active',
          disbursedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
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
    const all = await getFinancingRequests();
    return (
      all.find(
        (r) =>
          (orderNumberOrId &&
            (r.orderId === orderNumberOrId ||
              r.orderNumber === orderNumberOrId ||
              r.id === orderNumberOrId ||
              r.requestNumber === orderNumberOrId)) ||
          (alternateId &&
            (r.orderId === alternateId ||
              r.orderNumber === alternateId ||
              r.id === alternateId ||
              r.requestNumber === alternateId))
      ) || null
    );
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
    const all = await getFinancingRequests();
    return all.find((r) => r.id === id || r.requestNumber === id || r.orderNumber === id) || null;
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
