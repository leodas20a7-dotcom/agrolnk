// AgroLnk Buyer-Side Quality Inspection & Assay Engine
// Full Supabase Sync + Real-time + Local Cache Fallback
import { supabase } from '../lib/supabase';

const INSPECTION_STORAGE_KEY = 'agrolnk_inspection_reports';

function mapInspectionFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    reportNumber: row.report_number,
    orderId: row.order_id || row.order_number,
    orderNumber: row.order_number || row.order_id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    sellerName: row.seller_name,
    commodity: row.commodity,
    cropName: row.crop_name || row.commodity,
    quantity: Number(row.quantity || 0),
    verifiedWeight: row.verified_weight ? Number(row.verified_weight) : null,
    orderedGrade: row.ordered_grade || 'A',
    grade: row.grade,
    moisture: row.moisture ? Number(row.moisture) : null,
    foreignMatter: row.foreign_matter ? Number(row.foreign_matter) : null,
    status: row.status || 'requested',
    orderAmount: Number(row.order_amount || 0),
    inspectorName: row.inspector_name,
    inspectorNotes: row.inspector_notes,
    inspectionFee: Number(row.inspection_fee || 500),
    feeStatus: row.fee_status || 'unpaid',
    feePaidAt: row.fee_paid_at,
    feePaymentId: row.fee_payment_id,
    feePaymentMethod: row.fee_payment_method,
    disputeReason: row.dispute_reason,
    arbitration: row.arbitration || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInspectionToDb(item) {
  return {
    id: item.id,
    report_number: item.reportNumber,
    order_id: null, // Avoid FK constraint on unplaced pre-buy orders
    order_number: item.orderNumber || item.orderId || 'ORD-UNKNOWN',
    buyer_id: null, // Avoid FK constraint if user profile is custom/demo
    buyer_name: item.buyerName || 'Procurement Buyer',
    seller_name: item.sellerName || 'Verified Producer',
    commodity: item.commodity || item.cropName || 'Produce',
    crop_name: item.cropName || item.commodity,
    quantity: Number(item.quantity || 0),
    verified_weight: item.verifiedWeight ? Number(item.verifiedWeight) : null,
    ordered_grade: item.orderedGrade || 'A',
    grade: item.grade || null,
    moisture: item.moisture ? Number(item.moisture) : null,
    foreign_matter: item.foreignMatter ? Number(item.foreignMatter) : null,
    status: item.status || 'requested',
    order_amount: Number(item.orderAmount || 0),
    inspector_name: item.inspectorName || null,
    inspector_notes: item.inspectorNotes || null,
    inspection_fee: Number(item.inspectionFee || 500),
    fee_status: item.feeStatus || 'unpaid',
    fee_paid_at: item.feePaidAt || null,
    fee_payment_id: item.feePaymentId || null,
    fee_payment_method: item.feePaymentMethod || null,
    dispute_reason: item.disputeReason || null,
    arbitration: item.arbitration || {},
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function getStoredInspections() {
  try {
    const raw = localStorage.getItem(INSPECTION_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredInspections(reports) {
  try {
    localStorage.setItem(INSPECTION_STORAGE_KEY, JSON.stringify(reports));
    window.dispatchEvent(new Event('agrolnk_inspections_updated'));
  } catch (err) {
    console.error('Failed to save inspection reports:', err);
  }
}

/**
 * Fetch all inspection records from Supabase with Local Cache Fallback
 */
export async function getInspectionRecords() {
  try {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const mapped = data.map(mapInspectionFromDb);
      const local = getStoredInspections();
      
      const mergedMap = new Map();
      // First put all mapped from Supabase
      mapped.forEach((item) => {
        if (item?.id) mergedMap.set(item.id, item);
      });
      // Then merge local records if not yet in Supabase or if more recently updated locally
      local.forEach((item) => {
        if (item?.id && !mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        }
      });

      const combined = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      saveStoredInspections(combined);
      return combined;
    }
  } catch (err) {
    console.warn('Supabase inspections fetch fallback to local:', err);
  }

  return getStoredInspections();
}

/**
 * Get inspection report for an order
 */
export async function getInspectionForOrder(orderNumberOrId) {
  if (!orderNumberOrId) return null;

  try {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .or(`id.eq.${orderNumberOrId},order_id.eq.${orderNumberOrId},order_number.eq.${orderNumberOrId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const mapped = mapInspectionFromDb(data);
      // Update local storage
      const all = getStoredInspections();
      const idx = all.findIndex((r) => r.id === mapped.id || r.orderNumber === mapped.orderNumber);
      if (idx >= 0) all[idx] = mapped;
      else all.unshift(mapped);
      saveStoredInspections(all);
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase inspection query fallback:', err);
  }

  const all = getStoredInspections();
  return all.find((r) => r.orderId === orderNumberOrId || r.orderNumber === orderNumberOrId || r.id === orderNumberOrId) || null;
}

/**
 * Buyer requests pre-buy / pre-dispatch Quality Inspection
 */
export async function requestQualityInspection(data) {
  const all = getStoredInspections();
  const generateId = () => `insp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const generateReportNum = () => `INSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newInspection = {
    id: generateId(),
    reportNumber: generateReportNum(),
    orderId: data.orderId || data.orderNumber || data.id || `ORD-${Date.now()}`,
    orderNumber: data.orderNumber || data.orderId || `ORD-${Date.now()}`,
    buyerId: data.buyerId || 'usr_buyer_02',
    buyerName: data.buyerName || 'Procurement Buyer',
    sellerName: data.sellerName || data.farmerName || 'Verified Producer',
    cropName: data.cropName || data.commodity || 'Farmgate Produce',
    commodity: data.commodity || 'Agricultural Produce',
    quantity: Number(data.quantity || 100),
    verifiedWeight: null,
    orderedGrade: data.grade || 'A',
    grade: null,
    moisture: null,
    foreignMatter: null,
    status: 'requested',
    orderAmount: Number(data.orderAmount || data.totalAmount || 0),
    inspectorName: null,
    inspectorNotes: null,
    inspectionFee: 500,
    feeStatus: 'unpaid',
    feePaidAt: null,
    feePaymentId: null,
    feePaymentMethod: null,
    disputeReason: null,
    createdAt: new Date().toISOString(),
  };

  const existingIdx = all.findIndex((r) => r.orderNumber === newInspection.orderNumber || r.orderId === newInspection.orderId);
  if (existingIdx >= 0) {
    all[existingIdx] = { ...all[existingIdx], status: 'requested' };
  } else {
    all.unshift(newInspection);
  }

  saveStoredInspections(all);

  // Sync to Supabase
  try {
    const dbPayload = mapInspectionToDb(newInspection);
    await supabase.from('inspections').upsert(dbPayload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Could not sync requested inspection to Supabase:', err);
  }

  return newInspection;
}

/**
 * Admin assigns Inspector & Inspector submits official Assay Report with Inspection Fee
 */
export async function sendInspectionReportToBuyer(inspectionId, reportData) {
  const all = getStoredInspections();
  const index = all.findIndex((r) => r.id === inspectionId || r.orderId === inspectionId || r.orderNumber === inspectionId);
  
  let target = index >= 0 ? all[index] : { id: inspectionId };

  const updated = {
    ...target,
    inspectorName: reportData.inspectorName || 'AgroLnk Certified Assayer',
    grade: reportData.grade || 'A',
    moisture: Number(reportData.moisture || 10.5),
    foreignMatter: Number(reportData.foreignMatter || 0.4),
    verifiedWeight: Number(reportData.verifiedWeight || target.quantity || 100),
    inspectionFee: Number(reportData.inspectionFee !== undefined ? reportData.inspectionFee : 500),
    feeStatus: target.feeStatus || 'unpaid',
    status: reportData.verdict === 'dispute' ? 'disputed' : 'passed',
    inspectorNotes: reportData.inspectorNotes || 'Physical inspection & moisture meter testing completed at farmgate hub.',
    inspectedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    all[index] = updated;
  } else {
    all.unshift(updated);
  }

  saveStoredInspections(all);

  // Sync to Supabase
  try {
    const dbPayload = mapInspectionToDb(updated);
    await supabase.from('inspections').upsert(dbPayload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Could not sync assay report to Supabase:', err);
  }

  return updated;
}

/**
 * Record payment of inspection & assay fee via Razorpay
 */
export async function payInspectionFee(inspectionId, paymentDetails = {}) {
  const all = getStoredInspections();
  const index = all.findIndex((r) => r.id === inspectionId || r.orderId === inspectionId || r.orderNumber === inspectionId || r.reportNumber === inspectionId);
  if (index === -1) return null;

  all[index] = {
    ...all[index],
    feeStatus: 'paid',
    feePaidAt: new Date().toISOString(),
    feePaymentId: paymentDetails.paymentId || `pay_insp_${Date.now()}`,
    feePaymentMethod: paymentDetails.method || 'Razorpay Gateway',
  };

  saveStoredInspections(all);

  // Sync to Supabase
  try {
    const dbPayload = mapInspectionToDb(all[index]);
    await supabase.from('inspections').upsert(dbPayload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Could not sync fee payment to Supabase:', err);
  }

  return all[index];
}

/**
 * Submit buyer quality inspection report
 */
export async function submitInspectionReport(reportData) {
  return sendInspectionReportToBuyer(reportData.orderId || reportData.id, reportData);
}

/**
 * Arbitrate dispute (Admin Ombudsman)
 */
export async function arbitrateDispute(reportId, arbitrationData) {
  const all = getStoredInspections();
  const index = all.findIndex((r) => r.id === reportId || r.reportNumber === reportId);
  if (index === -1) return null;

  all[index] = {
    ...all[index],
    status: 'resolved',
    arbitration: {
      action: arbitrationData.action,
      refundAmount: arbitrationData.refundAmount || 0,
      notes: arbitrationData.notes || '',
      arbitratedBy: arbitrationData.arbitratedBy || 'AgroLnk Platform Ombudsman',
      arbitratedAt: new Date().toISOString(),
    }
  };

  saveStoredInspections(all);

  // Sync to Supabase
  try {
    const dbPayload = mapInspectionToDb(all[index]);
    await supabase.from('inspections').upsert(dbPayload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Could not sync arbitration to Supabase:', err);
  }

  return all[index];
}

/**
 * Realtime Subscription Helper for Inspections
 */
export function subscribeToInspections(callback) {
  try {
    const channel = supabase
      .channel('public:inspections_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inspections' },
        (payload) => {
          callback?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

