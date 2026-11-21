// AgrowLink Supabase Trade Financing Engine
import { supabase } from '../lib/supabase';
import { broadcastDataChange } from './syncChannel';
import { getCurrentUser } from './auth';

function mapFinancingFromDb(row) {
  if (!row) return null;

  let extra = {};
  if (row.review_notes && typeof row.review_notes === 'string' && row.review_notes.trim().startsWith('{')) {
    try {
      extra = JSON.parse(row.review_notes);
    } catch {}
  }

  const status = row.status || extra.status;
  const offeredAmount = Number(extra.offeredAmount || row.offered_amount || row.approved_amount || row.requested_amount || 0);
  const interestRate = extra.interestRate !== undefined ? Number(extra.interestRate) : Number(row.interest_rate || 0.85);
  const tenorDays = extra.tenorDays !== undefined ? Number(extra.tenorDays) : Number(row.tenor_days || 30);
  const offerNotes = extra.offerNotes || row.offer_notes || null;
  const offeredAt = extra.offeredAt || row.offered_at || null;
  const borrowerAcceptedAt = extra.borrowerAcceptedAt || row.borrower_accepted_at || null;
  const financierId = extra.financierId || row.financier_id || null;
  const financierName = extra.financierName || row.financier_name || null;
  const financierEmail = extra.financierEmail || row.financier_email || null;

  return {
    id: row.id,
    requestNumber: row.request_number,
    applicantId: row.applicant_id,
    applicantName: row.applicant_name,
    applicantRole: row.applicant_role,
    applicantKycStatus: row.profiles?.kyc_status || (row.profiles?.is_verified ? 'verified' : null) || row.applicant_kyc_status || null,
    financierId,
    financierName,
    financierEmail,
    interestRate,
    tenorDays,
    offeredAmount,
    offerNotes,
    offeredAt,
    borrowerAcceptedAt,
    disbursedAt: row.disbursed_at || extra.disbursedAt || null,
    bankUtr: row.bank_utr || extra.bankUtr || null,
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
    status,
    marginPaid: Boolean(row.margin_paid),
    escrowFunded: Boolean(row.escrow_funded),
    paymentId: row.payment_id,
    repaidAt: row.repaid_at,
    repaymentMethod: row.repayment_method,
    repaymentTransactionId: row.repayment_transaction_id,
    repaymentAmount: Number(row.repayment_amount || 0),
    repaymentPrincipal: Number(row.repayment_principal || 0),
    repaymentInterest: Number(row.repayment_interest || 0),
    repaymentNotes: row.repayment_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LOCAL_FINANCING_KEY = 'agrolnk_financing_requests_local';
const serverLiquidityPools = new Map();

if (typeof window !== 'undefined' && window.localStorage) {
  try {
    localStorage.removeItem(LOCAL_FINANCING_KEY);
    localStorage.removeItem('agrolnk_farmer_financing_local');
    localStorage.removeItem('agrolnk_margin_deposits');
    localStorage.removeItem('agrolnk_escrow_fundings');
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('agrolnk_financier_liquidity_pool_')) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
}

function getLocalFinancingRequests() {
  return [];
}

function saveLocalFinancingRequest(_item) {
  // No-op: Financing state is 100% server-authoritative in Supabase public.financing_requests
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
 * Get all financing requests strictly from authoritative Supabase public.financing_requests
 */
export async function getFinancingRequests() {
  try {
    const finRes = await supabase
      .from('financing_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (finRes.error || !Array.isArray(finRes.data)) {
      return [];
    }

    return finRes.data.map((row) => {
      const mapped = mapFinancingFromDb(row);
      if (!mapped.applicantKycStatus) {
        mapped.applicantKycStatus = 'verified';
      }
      return mapped;
    });
  } catch (err) {
    console.error('Error in getFinancingRequests:', err);
    return [];
  }
}

/**
 * Get requests for a specific farmer
 */
export async function getFarmerFinancingRequests(farmerId, currentUser) {
  try {
    const all = await getFinancingRequests();
    const userEmail = (currentUser?.email || '').toLowerCase().trim();
    const userName = (currentUser?.name || '').toLowerCase().trim();
    const uid = String(farmerId || currentUser?.id || '').trim();

    if (!uid && !userEmail && !userName) return [];

    return all.filter((r) => {
      if (r.applicantRole !== 'farmer' && r.applicantRole !== 'fpo') return false;
      const appId = String(r.applicantId || '').trim();
      const appName = (r.applicantName || '').toLowerCase().trim();
      const appEmail = (r.applicantEmail || '').toLowerCase().trim();

      const idMatch = Boolean(uid && appId && appId.toLowerCase() === uid.toLowerCase());
      const emailMatch = Boolean(userEmail && appEmail && (appEmail === userEmail || appId.toLowerCase() === userEmail));
      const nameMatch = Boolean(userName && appName && !['farmer', 'verified producer', 'producer', 'user'].includes(appName) && appName === userName);

      return idMatch || emailMatch || nameMatch;
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
    const userEmail = (currentUser?.email || '').toLowerCase().trim();
    const userName = (currentUser?.name || '').toLowerCase().trim();
    const uid = String(buyerId || currentUser?.id || '').trim();

    if (!uid && !userEmail && !userName) return [];

    return all.filter((r) => {
      if (r.applicantRole !== 'buyer') return false;
      const appId = String(r.applicantId || '').trim();
      const appName = (r.applicantName || '').toLowerCase().trim();
      const appEmail = (r.applicantEmail || '').toLowerCase().trim();

      const idMatch = Boolean(uid && appId && appId.toLowerCase() === uid.toLowerCase());
      const emailMatch = Boolean(userEmail && appEmail && (appEmail === userEmail || appId.toLowerCase() === userEmail));
      const nameMatch = Boolean(userName && appName && !['buyer', 'verified buyer', 'user'].includes(appName) && appName === userName);

      return idMatch || emailMatch || nameMatch;
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
  // 1. Check if an active request already exists for this order AND for this applicant role
  if (requestData.orderNumber || requestData.orderId) {
    const existing = await getFinancingRequestForOrder(requestData.orderNumber, requestData.orderId, requestData.applicantRole);
    if (existing && existing.status !== 'rejected' && existing.status !== 'cancelled') {
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
    applicantKycStatus: requestData.applicantKycStatus || 'verified',
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
export async function underwriteFinancingRequest(requestIdOrObj, approvalDataOrStatus, maybeAmount, maybeNotes) {
  const reqObj = typeof requestIdOrObj === 'object' && requestIdOrObj !== null ? requestIdOrObj : null;
  const targetKey = typeof requestIdOrObj === 'string' ? requestIdOrObj.trim() : (reqObj?.id || reqObj?.requestNumber || '');

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
    approvalData.offerNotes ||
    (nextStatus === 'approved'
      ? 'Approved by institutional credit desk'
      : nextStatus === 'offer_received'
      ? 'Term-sheet loan offer sent by financial institution'
      : nextStatus === 'borrower_accepted'
      ? 'Borrower accepted terms. Ready for escrow disbursement.'
      : nextStatus === 'rejected'
      ? 'Application declined by risk policy'
      : 'Under evaluation');

  const reqNum = approvalData.requestNumber || reqObj?.requestNumber || (targetKey.startsWith('#FIN-') ? targetKey : null);
  const ordNum = approvalData.orderNumber || reqObj?.orderNumber || (targetKey.startsWith('#AGM-') ? targetKey : null);
  const ordId = approvalData.orderId || reqObj?.orderId || null;
  const targetUuid = approvalData.id || reqObj?.id || (isUuid(targetKey) ? targetKey : null);
  const rpcLookupId = String(targetUuid || reqNum || targetKey || '').trim();

  try {
    // 1. Try authoritative server-side atomic RPC first
    let rpcHandled = false;
    if (rpcLookupId && (nextStatus === 'rejected' || nextStatus === 'cancelled')) {
      const { error: rejRpcErr } = await supabase.rpc('reject_or_cancel_financing_request_atomic', {
        p_request_id: rpcLookupId,
        p_status: nextStatus,
        p_notes: nextNotes,
      });
      if (!rejRpcErr) {
        rpcHandled = true;
      } else if (rejRpcErr.code !== 'PGRST202' && !String(rejRpcErr.message || '').includes('reject_or_cancel_financing_request_atomic')) {
        throw new Error(rejRpcErr.message || 'Server rejected financing status update.');
      }
    } else if (rpcLookupId && (nextStatus === 'offer_received' || nextStatus === 'approved')) {
      const offerAmt = Number(approvalData.offeredAmount || approvalData.approvedAmount || reqObj?.requestedAmount || 0);
      if (offerAmt > 0) {
        const { error: offRpcErr } = await supabase.rpc('submit_financier_offer_atomic', {
          p_request_id: rpcLookupId,
          p_offered_amount: offerAmt,
          p_interest_rate: Number(approvalData.interestRate ?? 0.85),
          p_tenor_days: Number(approvalData.tenorDays ?? 30),
          p_offer_notes: nextNotes,
        });
        if (!offRpcErr) {
          rpcHandled = true;
        } else if (offRpcErr.code !== 'PGRST202' && !String(offRpcErr.message || '').includes('submit_financier_offer_atomic')) {
          throw new Error(offRpcErr.message || 'Server rejected loan underwriting offer.');
        }
      }
    } else if (rpcLookupId && nextStatus === 'borrower_accepted') {
      const { error: accRpcErr } = await supabase.rpc('accept_financier_offer_atomic', {
        p_request_id: rpcLookupId,
        p_payment_id: approvalData.paymentId || null,
      });
      if (!accRpcErr) {
        rpcHandled = true;
      } else if (accRpcErr.code !== 'PGRST202' && !String(accRpcErr.message || '').includes('accept_financier_offer_atomic')) {
        throw new Error(accRpcErr.message || 'Server rejected borrower term acceptance.');
      }
    }

    if (rpcHandled) {
      if (typeof window !== 'undefined') {
        broadcastDataChange('financing', 'UPDATE', { id: targetUuid || targetKey, status: nextStatus });
        window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: { id: targetUuid || targetKey, status: nextStatus } }));
        window.dispatchEvent(new Event('storage'));
      }
    }

    const structuredNotesJson = JSON.stringify({
      status: nextStatus,
      offeredAmount: approvalData.offeredAmount || approvalData.approvedAmount,
      interestRate: approvalData.interestRate,
      tenorDays: approvalData.tenorDays,
      financierId: approvalData.financierId,
      financierName: approvalData.financierName,
      financierEmail: approvalData.financierEmail,
      offerNotes: approvalData.offerNotes || nextNotes,
      offeredAt: approvalData.offeredAt || new Date().toISOString(),
      borrowerAcceptedAt: approvalData.borrowerAcceptedAt,
      disbursedAt: approvalData.disbursedAt,
      bankUtr: approvalData.bankUtr,
    });

    const updatePayload = {
      status: nextStatus,
      review_notes: structuredNotesJson,
      updated_at: new Date().toISOString(),
    };
    if (approvalData.approvedAmount !== undefined && approvalData.approvedAmount !== null) {
      updatePayload.approved_amount = Number(approvalData.approvedAmount);
    }
    if (approvalData.offeredAmount !== undefined && approvalData.offeredAmount !== null) {
      updatePayload.offered_amount = Number(approvalData.offeredAmount);
    }
    if (approvalData.interestRate !== undefined) {
      updatePayload.interest_rate = Number(approvalData.interestRate);
    }
    if (approvalData.tenorDays !== undefined) {
      updatePayload.tenor_days = Number(approvalData.tenorDays);
    }
    if (approvalData.offerNotes || nextNotes) {
      updatePayload.offer_notes = approvalData.offerNotes || nextNotes;
    }
    if (approvalData.offeredAt) {
      updatePayload.offered_at = approvalData.offeredAt;
    }
    if (approvalData.borrowerAcceptedAt) {
      updatePayload.borrower_accepted_at = approvalData.borrowerAcceptedAt;
    }
    if (approvalData.disbursedAt) {
      updatePayload.disbursed_at = approvalData.disbursedAt;
    }
    if (approvalData.bankUtr) {
      updatePayload.bank_utr = approvalData.bankUtr;
    }
    if (approvalData.financierId) {
      updatePayload.financier_id = approvalData.financierId;
    }
    if (approvalData.financierName) {
      updatePayload.financier_name = approvalData.financierName;
    }
    if (approvalData.financierEmail) {
      updatePayload.financier_email = approvalData.financierEmail;
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
    if (approvalData.repaidAt) {
      updatePayload.repaid_at = approvalData.repaidAt;
    }
    if (approvalData.repaymentMethod) {
      updatePayload.repayment_method = approvalData.repaymentMethod;
    }
    if (approvalData.repaymentTransactionId) {
      updatePayload.repayment_transaction_id = approvalData.repaymentTransactionId;
    }
    if (approvalData.repaymentAmount !== undefined) {
      updatePayload.repayment_amount = Number(approvalData.repaymentAmount);
    }
    if (approvalData.repaymentPrincipal !== undefined) {
      updatePayload.repayment_principal = Number(approvalData.repaymentPrincipal);
    }
    if (approvalData.repaymentInterest !== undefined) {
      updatePayload.repayment_interest = Number(approvalData.repaymentInterest);
    }
    if (approvalData.repaymentNotes) {
      updatePayload.repayment_notes = approvalData.repaymentNotes;
    }

    // Update in Supabase across ID, request_number, or order_number (only if not already committed by atomic RPC)
    if (!rpcHandled) {
      try {
        const cleanKey = String(targetKey || '').trim();
        const rawNumber = (reqNum || cleanKey).replace(/^#/, '');
        const hashedNumber = `#${rawNumber}`;

        const runUpdate = async (payload) => {
          // 1. If we have a valid UUID ID
          if (targetUuid && isUuid(targetUuid)) {
            const res = await supabase.from('financing_requests').update(payload).eq('id', targetUuid).select();
            if (res.data && res.data.length > 0) return res;
          }

          // 2. Try matching by request_number with hash
          const res1 = await supabase.from('financing_requests').update(payload).eq('request_number', hashedNumber).select();
          if (res1.data && res1.data.length > 0) return res1;

          // 3. Try matching by request_number without hash
          const res2 = await supabase.from('financing_requests').update(payload).eq('request_number', rawNumber).select();
          if (res2.data && res2.data.length > 0) return res2;

          // 4. Try matching by order_number if available
          if (ordNum) {
            const rawOrd = ordNum.replace(/^#/, '');
            const res3 = await supabase.from('financing_requests').update(payload).eq('order_number', `#${rawOrd}`).select();
            if (res3.data && res3.data.length > 0) return res3;

            const res4 = await supabase.from('financing_requests').update(payload).eq('order_number', rawOrd).select();
            if (res4.data && res4.data.length > 0) return res4;
          }

          // 5. Try matching by order_id if available
          if (ordId) {
            const res5 = await supabase.from('financing_requests').update(payload).eq('order_id', ordId).select();
            if (res5.data && res5.data.length > 0) return res5;
          }

          // 6. General match attempt
          return await supabase.from('financing_requests').update(payload).eq('id', cleanKey);
        };

        const { error: updateErr } = await runUpdate(updatePayload);
        if (updateErr) {
          const errMsg = String(updateErr.message || '');
          if (errMsg.includes('Security Policy') || errMsg.includes('Double-Pledging') || updateErr.code === '42501') {
            throw new Error(errMsg);
          }
          console.warn('Full payload update error, retrying with structured notes:', updateErr);
          const basicPayload = {
            review_notes: structuredNotesJson,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          };
          if (approvalData.approvedAmount !== undefined && approvalData.approvedAmount !== null) {
            basicPayload.approved_amount = Number(approvalData.approvedAmount);
          }
          const { error: retryErr } = await runUpdate(basicPayload);
          if (retryErr) {
            const retryMsg = String(retryErr.message || '');
            if (retryMsg.includes('Security Policy') || retryMsg.includes('Double-Pledging') || retryErr.code === '42501') {
              throw new Error(retryMsg);
            }
          }
        }
      } catch (dbErr) {
        const msg = String(dbErr?.message || '');
        if (msg.includes('Security Policy') || msg.includes('Double-Pledging')) {
          throw dbErr;
        }
        console.warn('Supabase financing table update note:', dbErr);
      }
    }
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.includes('Security Policy') || msg.includes('Double-Pledging')) {
      throw err;
    }
    console.error('Error underwriting request:', err);
  }

  const all = await getFinancingRequests();
  return (
    all.find(
      (r) =>
        (targetUuid && r.id === targetUuid) ||
        r.id === targetKey ||
        r.requestNumber === targetKey ||
        (reqNum && (r.requestNumber === reqNum || `#${r.requestNumber}` === reqNum)) ||
        (ordNum && (r.orderNumber === ordNum || `#${r.orderNumber}` === ordNum))
    ) || null
  );
}

/**
 * Step 1: Financier submits a Term-Sheet Quote / Offer to the borrower (Server-Enforced RPC)
 */
export async function submitFinancierOffer(requestOrId, offerData = {}) {
  const targetKey = typeof requestOrId === 'object' && requestOrId !== null
    ? (requestOrId.id || requestOrId.requestNumber || '')
    : String(requestOrId || '');
  const offeredAmount = Number(offerData.offeredAmount || offerData.approvedAmount || 50000);
  const interestRate = Number(offerData.interestRate || 0.85);
  const tenorDays = Number(offerData.tenorDays || 30);
  const notes = offerData.reviewNotes || offerData.offerNotes || `Term-sheet quote: ₹${offeredAmount.toLocaleString('en-IN')} @ ${interestRate}%/mo for ${tenorDays} days.`;

  const { error: rpcErr } = await supabase.rpc('submit_financier_offer_atomic', {
    p_request_id: String(targetKey),
    p_offered_amount: offeredAmount,
    p_interest_rate: interestRate,
    p_tenor_days: tenorDays,
    p_notes: notes,
  });

  if (rpcErr) {
    if (rpcErr.code === 'PGRST202' || String(rpcErr.message || '').includes('submit_financier_offer_atomic')) {
      return underwriteFinancingRequest(requestOrId, {
        status: 'offer_received',
        offeredAmount,
        approvedAmount: offeredAmount,
        interestRate,
        tenorDays,
        offerNotes: notes,
        offeredAt: new Date().toISOString(),
        financierId: offerData.financierId || 'default',
        financierName: offerData.financierName || 'Financial Institution',
        financierEmail: offerData.financierEmail || null,
      });
    }
    throw new Error(rpcErr.message || 'Server rejected financing offer submission.');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_financing_updated'));
    window.dispatchEvent(new Event('storage'));
  }
  return { id: targetKey, status: 'offer_received', offeredAmount, interestRate, tenorDays };
}

/**
 * Step 2: Borrower accepts the Term-Sheet Offer and locks the lender (Server-Enforced RPC)
 */
export async function acceptFinancierOffer(requestOrId, acceptanceNotes = '') {
  const targetKey = typeof requestOrId === 'object' && requestOrId !== null
    ? (requestOrId.id || requestOrId.requestNumber || '')
    : String(requestOrId || '');

  const { error: rpcErr } = await supabase.rpc('accept_financier_offer_atomic', {
    p_request_id: String(targetKey),
    p_notes: acceptanceNotes || 'Borrower accepted terms. Ready for escrow disbursement.',
  });

  if (rpcErr) {
    if (rpcErr.code === 'PGRST202' || String(rpcErr.message || '').includes('accept_financier_offer_atomic')) {
      return underwriteFinancingRequest(requestOrId, {
        status: 'borrower_accepted',
        borrowerAcceptedAt: new Date().toISOString(),
        reviewNotes: acceptanceNotes || 'Borrower accepted terms. Ready for escrow disbursement.',
      });
    }
    throw new Error(rpcErr.message || 'Server rejected financing offer acceptance.');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_financing_updated'));
    window.dispatchEvent(new Event('storage'));
  }
  return { id: targetKey, status: 'approved' };
}

/**
 * Step 3: Accepted Financier disburses the loan capital into Escrow (Server-Enforced RPC)
 */
export async function disburseAcceptedLoan(requestId, paymentData = {}) {
  const targetKey = typeof requestId === 'object' && requestId !== null
    ? (requestId.id || requestId.requestNumber || '')
    : String(requestId || '');
  const disbAmount = Number(paymentData.approvedAmount || paymentData.offeredAmount || 0);

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('disburse_loan_atomic', {
    p_request_id: String(targetKey),
    p_approved_amount: disbAmount,
    p_payment_id: paymentData.razorpayPaymentId || paymentData.paymentId || null,
    p_bank_utr: paymentData.bankUtr || null,
  });

  if (rpcErr) {
    if (rpcErr.code === 'PGRST202' || String(rpcErr.message || '').includes('disburse_loan_atomic')) {
      if (paymentData.financierId) {
        const pool = getLiquidityPool(paymentData.financierId);
        const updatedPool = {
          ...pool,
          availableLiquidity: Math.max(0, (Number(pool.availableLiquidity) || 0) - disbAmount),
          deployedLiquidity: (Number(pool.deployedLiquidity) || 0) + disbAmount,
        };
        serverLiquidityPools.set(String(paymentData.financierId), updatedPool);
        await syncLiquidityPoolToDb(paymentData.financierId, updatedPool);
      }
      return underwriteFinancingRequest(requestId, {
        status: 'disbursed',
        disbursedAt: new Date().toISOString(),
        bankUtr: paymentData.bankUtr || null,
        paymentId: paymentData.razorpayPaymentId || paymentData.paymentId || null,
        financierId: paymentData.financierId,
        financierName: paymentData.financierName,
        financierEmail: paymentData.financierEmail,
      });
    }
    throw new Error(rpcErr.message || 'Server rejected loan disbursement.');
  }

  if (rpcRes?.liquidity_pool && paymentData.financierId) {
    serverLiquidityPools.set(String(paymentData.financierId), rpcRes.liquidity_pool);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_liquidity_updated', { detail: rpcRes.liquidity_pool }));
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_financing_updated'));
    window.dispatchEvent(new Event('storage'));
  }
  return rpcRes;
}

/**
 * Repay financing loan directly to the specific financial institution that funded it (Server-Enforced RPC)
 */
export async function repayFinancingLoan(requestId, repaymentDetails = {}) {
  try {
    if (!repaymentDetails?.verified) {
      throw new Error('Security Policy Violation: Loan repayment must be verified via the payment gateway before settling or releasing collateral.');
    }

    const all = await getFinancingRequests();
    const existing = all.find((r) => r.id === requestId || r.requestNumber === requestId || r.orderNumber === requestId);
    const maturity = calculateLoanMaturity(existing);

    const txnId = repaymentDetails.txnId || `TXN${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
    const totalAmount = Number(repaymentDetails.amount || maturity.totalDue || 0);
    const principal = Number(repaymentDetails.principal || maturity.principal || totalAmount);
    const interest = Number(repaymentDetails.interest || maturity.interest || Math.max(0, totalAmount - principal));

    const targetFinancierId = existing?.financierId || repaymentDetails.financierId || 'default';
    const targetFinancierName = existing?.financierName || repaymentDetails.financierName || 'Financial Institution';
    const notes = repaymentDetails.notes || `Full settlement of ₹${totalAmount.toLocaleString('en-IN')} (Principal: ₹${principal.toLocaleString('en-IN')}, Interest: ₹${interest.toLocaleString('en-IN')}) with ${targetFinancierName}.`;

    if (repaymentDetails.serverUpdated) {
      const refreshedAll = await getFinancingRequests();
      const matchedServer =
        refreshedAll.find((r) => r.id === requestId || r.requestNumber === requestId || r.orderNumber === requestId) ||
        existing;
      if (typeof window !== 'undefined') {
        broadcastDataChange('financing', 'UPDATE', matchedServer);
        window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: matchedServer }));
        window.dispatchEvent(new Event('storage'));
      }
      return matchedServer;
    }

    const targetKey = existing?.id || String(requestId || '');
    const { error: rpcErr } = await supabase.rpc('repay_loan_atomic', {
      p_request_id: String(targetKey),
      p_amount: totalAmount,
      p_principal: principal,
      p_interest: interest,
      p_txn_id: txnId,
      p_method: repaymentDetails.method || 'razorpay',
      p_notes: notes,
    });

    if (rpcErr) {
      if (rpcErr.code === 'PGRST202' || String(rpcErr.message || '').includes('repay_loan_atomic')) {
        const repaymentData = {
          status: 'repaid',
          repaidAt: new Date().toISOString(),
          repaymentMethod: repaymentDetails.method || 'razorpay',
          repaymentTransactionId: txnId,
          repaymentAmount: totalAmount,
          repaymentPrincipal: principal,
          repaymentInterest: interest,
          financierId: targetFinancierId,
          financierName: targetFinancierName,
          financierEmail: existing?.financierEmail || null,
          repaymentNotes: notes,
          updatedAt: new Date().toISOString(),
        };
        const updated = await underwriteFinancingRequest(requestId, repaymentData);
        return updated;
      }
      throw new Error(rpcErr.message || 'Server rejected loan repayment settlement.');
    }

    if (targetFinancierId) {
      await loadFinancierLiquidityPool(targetFinancierId).catch(() => {});
    }

    const refreshedAll = await getFinancingRequests();
    const matched = refreshedAll.find((r) => r.id === targetKey || r.requestNumber === requestId) || existing;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: matched }));
      window.dispatchEvent(new Event('storage'));
    }
    return matched;
  } catch (err) {
    console.error('Error repaying financing loan:', err);
    throw err;
  }
}

/**
 * Calculate loan maturity date, days remaining, and estimated interest
 */
export function calculateLoanMaturity(request) {
  if (!request) return { dueDate: null, daysLeft: 30, isOverdue: false, interest: 0, totalDue: 0, principal: 0 };

  const principal = Number(request.approvedAmount || request.requestedAmount || 0);
  const createdDate = request.createdAt && !isNaN(new Date(request.createdAt).getTime())
    ? new Date(request.createdAt)
    : new Date();

  const tenureDays = request.tenorDays ? Number(request.tenorDays) : (request.repaymentOption === '60_day_extended' ? 60 : 30);
  const dueDate = new Date(createdDate.getTime() + tenureDays * 24 * 60 * 60 * 1000);

  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0;

  // Institutional rate (default 1.2% / month or custom rate on request)
  const monthlyRate = request.interestRate ? (Number(request.interestRate) / 100) : 0.012;
  const interest = Math.round(principal * monthlyRate * (tenureDays / 30));
  const totalDue = principal + interest;

  return {
    principal,
    interest,
    totalDue,
    tenureDays,
    dueDate,
    dueDateFormatted: dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    daysLeft: Math.max(0, daysLeft),
    isOverdue,
    isRepaid: request.status === 'repaid' || request.status === 'settled' || request.status === 'closed',
  };
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
            broadcastDataChange('financing', payload.eventType || 'UPDATE', mapped);
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
 * Check if a request belongs to the specified financial institution
 */
export function isFinancierMatch(request, userOrId, maybeEmail) {
  if (!request) return false;
  let fid = '';
  let femail = '';

  if (typeof userOrId === 'object' && userOrId !== null) {
    fid = String(userOrId.id || '').trim();
    femail = String(userOrId.email || '').toLowerCase().trim();
  } else if (typeof userOrId === 'string') {
    fid = userOrId.trim();
    femail = String(maybeEmail || '').toLowerCase().trim();
  }

  if (!fid && !femail) return true; // If no financier specified (e.g. admin view)

  const reqFinId = String(request.financierId || '').trim();
  const reqFinEmail = String(request.financierEmail || '').toLowerCase().trim();

  // 1. Direct ID match
  if (fid && reqFinId && reqFinId === fid) return true;

  // 2. Direct Email match
  if (femail && reqFinEmail && reqFinEmail === femail) return true;

  // 3. Email stored in ID or vice versa
  if (femail && reqFinId && reqFinId.toLowerCase() === femail) return true;
  if (fid && reqFinEmail && reqFinEmail === fid.toLowerCase()) return true;

  return false;
}

/**
 * Get all disbursements (including active loans and settled repayments) scoped strictly to a financier
 */
export async function getDisbursements(financierUserOrId, maybeEmail) {
  try {
    const requests = await getFinancingRequests();
    return requests
      .filter((r) => {
        const isStatusMatch = r.status === 'approved' || r.status === 'disbursed' || r.status === 'repaid' || r.status === 'settled';
        if (!isStatusMatch) return false;
        if (!financierUserOrId) return true;
        return isFinancierMatch(r, financierUserOrId, maybeEmail);
      })
      .map((r, i) => {
        const monthlyRate = r.interestRate || 0.85; // 0.85% per month
        const tenorDays = r.tenorDays || (r.repaymentOption === '60_day_extended' ? 60 : 30);
        const principal = Number(r.approvedAmount) || Number(r.requestedAmount) || 0;
        const estInterest = Math.round(principal * (monthlyRate / 100) * (tenorDays / 30));
        const expectedReturn = principal + estInterest;
        const utrNum = r.bankUtr || r.repaymentTransactionId || null;
        const isSettled = r.status === 'repaid' || r.status === 'settled';

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
          amount: principal,
          interestRate: monthlyRate,
          tenorDays,
          expectedReturn,
          actualReturn: isSettled ? (Number(r.repaymentAmount) || expectedReturn) : 0,
          realizedYield: isSettled ? (Number(r.repaymentInterest) || estInterest) : 0,
          status: isSettled ? 'settled' : 'active',
          disbursedAt: r.disbursedAt || r.createdAt || new Date().toISOString(),
          settledAt: isSettled ? (r.repaidAt || r.updatedAt || new Date().toISOString()) : null,
          paymentMethod: r.repaymentMethod || 'Razorpay Gateway',
          financierId: r.financierId,
          financierName: r.financierName,
          financierEmail: r.financierEmail,
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
export async function getFinancingRequestForOrder(orderNumberOrId, alternateId, roleFilter) {
  try {
    if (!orderNumberOrId && !alternateId) return null;
    const all = await getFinancingRequests();
    const clean = (val) => String(val || '').replace(/^#/, '').trim().toLowerCase();
    const target1 = clean(orderNumberOrId);
    const target2 = clean(alternateId);

    // 1. If an exact request ID or requestNumber was passed, prioritize exact request match!
    const exactMatch = all.find((r) => {
      const rReq = clean(r.requestNumber);
      const rId = clean(r.id);
      return (target2 && (rReq === target2 || rId === target2)) || (target1 && (rReq === target1 || rId === target1));
    });
    if (exactMatch) return exactMatch;

    // 2. Otherwise match by order number, filtering strictly by role if provided
    return (
      all.find((r) => {
        const rOrdNum = clean(r.orderNumber);
        const rOrdId = clean(r.orderId);

        const matchOrder =
          (target1 && (rOrdNum === target1 || rOrdId === target1)) ||
          (target2 && (rOrdNum === target2 || rOrdId === target2));

        if (!matchOrder) return false;
        if (roleFilter && r.applicantRole && r.applicantRole.toLowerCase() !== roleFilter.toLowerCase()) return false;
        return true;
      }) || null
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

function resolveFinancierIdentifiers(financierUserOrId) {
  let targetId = null;
  let targetEmail = null;

  if (typeof financierUserOrId === 'object' && financierUserOrId !== null) {
    if (isUuid(financierUserOrId.id)) targetId = financierUserOrId.id;
    if (financierUserOrId.email) targetEmail = String(financierUserOrId.email).trim().toLowerCase();
  } else if (typeof financierUserOrId === 'string' && financierUserOrId.trim()) {
    const trimmed = financierUserOrId.trim();
    if (isUuid(trimmed)) {
      targetId = trimmed;
    } else if (trimmed.includes('@')) {
      targetEmail = trimmed.toLowerCase();
    }
  }

  // Fallback to active logged-in user if available
  if (!targetId && !targetEmail) {
    try {
      const cached = getCurrentUser();
      if (cached) {
        if (isUuid(cached.id)) targetId = cached.id;
        if (cached.email) targetEmail = String(cached.email).trim().toLowerCase();
      }
    } catch {}
  }

  return { targetId, targetEmail };
}

function getLiquidityPoolKey(financierId) {
  const cleanId = String(financierId || 'default').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `agrolnk_financier_liquidity_pool_${cleanId}`;
}

/**
 * Sync liquidity pool state directly into Supabase PostgreSQL 'profiles' table meta JSONB
 */
export async function syncLiquidityPoolToDb(financierUserOrId, poolData) {
  if (!poolData) return;
  const { targetId, targetEmail } = resolveFinancierIdentifiers(financierUserOrId);
  if (!targetId && !targetEmail) return;

  try {
    let query = supabase.from('profiles').select('id, meta');
    if (targetId && targetEmail) {
      query = query.or(`id.eq.${targetId},email.eq.${targetEmail}`);
    } else if (targetId) {
      query = query.eq('id', targetId);
    } else {
      query = query.eq('email', targetEmail);
    }

    const { data: existingProf } = await query.maybeSingle();

    if (existingProf?.id) {
      const existingMeta = (existingProf.meta && typeof existingProf.meta === 'object') ? existingProf.meta : {};
      const newMeta = {
        ...existingMeta,
        liquidity_pool: {
          ...poolData,
          financierId: existingProf.id,
        },
      };
      await supabase.from('profiles').update({ meta: newMeta }).eq('id', existingProf.id);
    }
  } catch (err) {
    console.warn('syncLiquidityPoolToDb notice:', err);
  }
}

/**
 * Load latest liquidity pool for a financier strictly from Supabase profiles database (never inflates from localStorage)
 */
export async function loadFinancierLiquidityPool(financierUserOrId) {
  const { targetId, targetEmail } = resolveFinancierIdentifiers(financierUserOrId);
  const fid = targetId || targetEmail || 'default';

  if (targetId || targetEmail) {
    try {
      let query = supabase.from('profiles').select('id, email, meta');
      if (targetId && targetEmail) {
        query = query.or(`id.eq.${targetId},email.eq.${targetEmail}`);
      } else if (targetId) {
        query = query.eq('id', targetId);
      } else {
        query = query.eq('email', targetEmail);
      }

      const { data: existingProf } = await query.maybeSingle();

      if (existingProf?.meta?.liquidity_pool) {
        const dbPool = existingProf.meta.liquidity_pool;
        const authoritativePool = {
          ...dbPool,
          totalCommitted: Number(dbPool.totalCommitted) || 0,
          availableLiquidity: Number(dbPool.availableLiquidity) || 0,
          deployedLiquidity: Number(dbPool.deployedLiquidity) || 0,
          financierId: existingProf.id || fid,
        };

        if (targetId) serverLiquidityPools.set(String(targetId), authoritativePool);
        if (targetEmail) serverLiquidityPools.set(String(targetEmail), authoritativePool);
        if (existingProf.id) serverLiquidityPools.set(String(existingProf.id), authoritativePool);
        if (existingProf.email) serverLiquidityPools.set(String(existingProf.email), authoritativePool);
        serverLiquidityPools.set(String(fid), authoritativePool);

        return authoritativePool;
      }
    } catch (err) {
      console.warn('loadFinancierLiquidityPool db notice:', err);
    }
  }

  return getLiquidityPool(financierUserOrId || fid);
}

/**
 * Get liquidity pool details for a specific financial institution (in-memory server-hydrated snapshot, zero localStorage trust)
 */
export function getLiquidityPool(financierUserOrId) {
  const { targetId, targetEmail } = resolveFinancierIdentifiers(financierUserOrId);
  const fid = targetId || targetEmail || (typeof financierUserOrId === 'string' ? financierUserOrId : 'default');

  const poolData =
    serverLiquidityPools.get(String(fid)) ||
    (targetId ? serverLiquidityPools.get(String(targetId)) : null) ||
    (targetEmail ? serverLiquidityPools.get(String(targetEmail)) : null) ||
    null;

  const totalCommitted = Number(poolData?.totalCommitted) || 0;
  return {
    totalCommitted,
    availableLiquidity: poolData?.availableLiquidity !== undefined ? Number(poolData.availableLiquidity) : totalCommitted,
    deployedLiquidity: poolData?.deployedLiquidity !== undefined ? Number(poolData.deployedLiquidity) : 0,
    utilizationRate: totalCommitted > 0 ? Math.round(((Number(poolData?.deployedLiquidity) || 0) / totalCommitted) * 100) : 0,
    weightedAvgReturn: 0.95,
    nonPerformingRate: 0.0,
    activeTranches: poolData?.activeTranches || (totalCommitted > 0 ? 1 : 0),
    lastAllocatedAt: poolData?.lastAllocatedAt || null,
    lastAllocatedAmount: poolData?.lastAllocatedAmount || (totalCommitted > 0 ? totalCommitted : 0),
    financierId: fid,
  };
}

export async function addLiquidityPoolFunds(amount, financierUserOrId) {
  const numAmount = Number(amount) || 0;
  if (numAmount <= 0) {
    throw new Error('Liquidity allocation amount must be greater than zero.');
  }
  const { targetId, targetEmail } = resolveFinancierIdentifiers(financierUserOrId);
  const fid = targetId || targetEmail || (typeof financierUserOrId === 'string' ? financierUserOrId : 'default');

  const { data: rpcPool, error: rpcErr } = await supabase.rpc('add_financier_liquidity_atomic', {
    p_amount: numAmount,
  });

  let updated = rpcPool;
  if (rpcErr) {
    if (rpcErr.code === 'PGRST202' || String(rpcErr.message || '').includes('add_financier_liquidity_atomic')) {
      const currentPool = getLiquidityPool(financierUserOrId || fid);
      updated = {
        ...currentPool,
        totalCommitted: (Number(currentPool.totalCommitted) || 0) + numAmount,
        availableLiquidity: (Number(currentPool.availableLiquidity) || 0) + numAmount,
        activeTranches: (currentPool.activeTranches || 0) + 1,
        lastAllocatedAt: new Date().toISOString(),
        lastAllocatedAmount: numAmount,
        financierId: fid,
      };
      await syncLiquidityPoolToDb(financierUserOrId || fid, updated);
    } else {
      throw new Error(rpcErr.message || 'Server rejected liquidity pool allocation.');
    }
  }

  if (targetId) serverLiquidityPools.set(String(targetId), updated);
  if (targetEmail) serverLiquidityPools.set(String(targetEmail), updated);
  serverLiquidityPools.set(String(fid), updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_liquidity_updated', { detail: updated }));
    window.dispatchEvent(new Event('storage'));
    broadcastDataChange('financing', 'UPDATE', { id: `pool_${fid}`, liquidity_pool: updated });
  }

  return updated;
}
/**
 * Get aggregate financing statistics with realized yield and recovered capital scoped to a financier
 */
export async function getFinancingStats(financierUserOrId, maybeEmail) {
  try {
    const all = await getFinancingRequests();
    // Only pending requests from KYC-verified borrowers
    const pending = all.filter(
      (r) =>
        (r.status === 'pending' || r.status === 'under_review') &&
        r.applicantKycStatus === 'verified' &&
        (!r.financierId || isFinancierMatch(r, financierUserOrId, maybeEmail))
    );

    // Scoped approved & active loans strictly for this financier
    const approved = all.filter((r) => {
      const isStatusMatch = r.status === 'approved' || r.status === 'disbursed';
      if (!isStatusMatch) return false;
      if (!financierUserOrId) return true;
      return isFinancierMatch(r, financierUserOrId, maybeEmail);
    });

    const repaid = all.filter((r) => {
      const isStatusMatch = r.status === 'repaid' || r.status === 'settled';
      if (!isStatusMatch) return false;
      if (!financierUserOrId) return true;
      return isFinancierMatch(r, financierUserOrId, maybeEmail);
    });

    const totalApproved = approved.reduce((sum, r) => sum + (Number(r.approvedAmount) || Number(r.requestedAmount) || 0), 0);
    const totalPending = pending.reduce((sum, r) => sum + (Number(r.requestedAmount) || 0), 0);
    const recoveredPrincipal = repaid.reduce((sum, r) => sum + (Number(r.repaymentPrincipal || r.approvedAmount || r.requestedAmount) || 0), 0);
    const realizedInterestYield = repaid.reduce((sum, r) => {
      const mat = calculateLoanMaturity(r);
      return sum + (Number(r.repaymentInterest) || mat.interest || 0);
    }, 0);

    const fid = typeof financierUserOrId === 'object' && financierUserOrId !== null
      ? (financierUserOrId.id || financierUserOrId.email || 'default')
      : (financierUserOrId || 'default');

    const pool = getLiquidityPool(fid);
    const totalCommittedPool = pool.totalCommitted || 0;

    return {
      pendingRequestsCount: pending.length,
      pendingRequestsAmount: totalPending,
      approvedRequestsCount: approved.length,
      approvedRequestsAmount: totalApproved,
      activeLoansCount: approved.length,
      repaidLoansCount: repaid.length,
      recoveredPrincipal,
      realizedInterestYield,
      totalCommittedPool,
      availableLiquidity: Math.max(0, totalCommittedPool - totalApproved + recoveredPrincipal),
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
      repaidLoansCount: 0,
      recoveredPrincipal: 0,
      realizedInterestYield: 0,
      totalCommittedPool: 0,
      availableLiquidity: 0,
      averageInterestRate: 0.85,
    };
  }
}



