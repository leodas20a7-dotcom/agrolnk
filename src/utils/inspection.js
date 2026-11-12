// AgroLnk Buyer-Side Quality Inspection & Assay Engine
// Full Supabase Sync + Real-time + Local Cache Fallback
import { supabase } from '../lib/supabase';

const INSPECTION_STORAGE_KEY = 'agrolnk_inspection_reports';
const INSPECTION_DELETED_KEY = 'agrolnk_deleted_inspection_ids';

function getDeletedInspectionIds() {
  try {
    const raw = localStorage.getItem(INSPECTION_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markInspectionDeletedLocally(...ids) {
  try {
    const existing = new Set(getDeletedInspectionIds());
    ids.filter(Boolean).forEach((id) => existing.add(String(id)));
    localStorage.setItem(INSPECTION_DELETED_KEY, JSON.stringify(Array.from(existing)));
  } catch (err) {
    console.error('Failed to mark inspection as deleted:', err);
  }
}

function isInspectionDeletedLocally(idOrOrder) {
  if (!idOrOrder) return false;
  const deleted = getDeletedInspectionIds();
  return deleted.includes(String(idOrOrder));
}

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
    certificate: row.arbitration?.certificate || null,
    labName: row.arbitration?.labName || null,
    labCertNumber: row.arbitration?.labCertNumber || null,
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
    buyer_id: item.buyerId || null,
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
    const list = JSON.parse(raw);
    const deleted = getDeletedInspectionIds();
    return list.filter(
      (r) =>
        !deleted.includes(String(r.id)) &&
        !deleted.includes(String(r.orderId)) &&
        !deleted.includes(String(r.orderNumber)) &&
        r.status !== 'cancelled' &&
        r.status !== 'deleted'
    );
  } catch {
    return [];
  }
}

function saveStoredInspections(reports) {
  try {
    const deleted = getDeletedInspectionIds();
    const clean = reports.filter(
      (r) =>
        !deleted.includes(String(r.id)) &&
        !deleted.includes(String(r.orderId)) &&
        !deleted.includes(String(r.orderNumber)) &&
        r.status !== 'cancelled' &&
        r.status !== 'deleted'
    );
    localStorage.setItem(INSPECTION_STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event('agrolnk_inspections_updated'));
  } catch (err) {
    console.error('Failed to save inspection reports:', err);
  }
}

/**
 * Fetch all inspection records from Supabase with Local Cache Fallback
 */
export async function getInspectionRecords() {
  const deleted = getDeletedInspectionIds();

  try {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .neq('status', 'cancelled')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const activeData = data.filter(
        (row) =>
          !deleted.includes(String(row.id)) &&
          !deleted.includes(String(row.order_id)) &&
          !deleted.includes(String(row.order_number)) &&
          row.status !== 'cancelled' &&
          row.status !== 'deleted'
      );

      const mapped = activeData.map(mapInspectionFromDb);
      saveStoredInspections(mapped);
      return mapped;
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
  if (isInspectionDeletedLocally(orderNumberOrId)) return null;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderNumberOrId));
    const orFilter = isUuid
      ? `id.eq.${orderNumberOrId},order_id.eq.${orderNumberOrId},order_number.eq.${orderNumberOrId}`
      : `id.eq.${orderNumberOrId},order_number.eq.${orderNumberOrId}`;

    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .or(orFilter)
      .neq('status', 'cancelled')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      if (
        data &&
        !isInspectionDeletedLocally(data.id) &&
        !isInspectionDeletedLocally(data.order_id) &&
        !isInspectionDeletedLocally(data.order_number) &&
        data.status !== 'cancelled' &&
        data.status !== 'deleted'
      ) {
        const mapped = mapInspectionFromDb(data);
        const all = getStoredInspections();
        const idx = all.findIndex((r) => r.id === mapped.id || r.orderNumber === mapped.orderNumber);
        if (idx >= 0) all[idx] = mapped;
        else all.unshift(mapped);
        saveStoredInspections(all);
        return mapped;
      }
      // If deleted/not found in Supabase or marked deleted, purge from local storage cache
      const all = getStoredInspections();
      const filtered = all.filter((r) => r.orderId !== orderNumberOrId && r.orderNumber !== orderNumberOrId && r.id !== orderNumberOrId);
      if (filtered.length !== all.length) {
        saveStoredInspections(filtered);
      }
      return null;
    }
  } catch (err) {
    console.warn('Supabase inspection query fallback:', err);
  }

  const all = getStoredInspections();
  return all.find(
    (r) =>
      (r.orderId === orderNumberOrId || r.orderNumber === orderNumberOrId || r.id === orderNumberOrId) &&
      !isInspectionDeletedLocally(r.id)
  ) || null;
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
    buyerId: data.buyerId || '',
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

  // Un-blacklist if this order had a previously cancelled request
  try {
    const deleted = getDeletedInspectionIds().filter(
      (d) => d !== newInspection.orderNumber && d !== newInspection.orderId && d !== newInspection.id
    );
    localStorage.setItem(INSPECTION_DELETED_KEY, JSON.stringify(deleted));
  } catch {}

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
 * Lab Certificate Attachments (PDF / Image)
 */
export const CERTIFICATE_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const CERTIFICATE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const CERTIFICATE_INLINE_MAX_BYTES = 1.5 * 1024 * 1024; // inline fallback limit (keeps DB row & localStorage small)
const CERTIFICATE_BUCKET = 'proof';

export function validateCertificateFile(file) {
  if (!file) return 'No file selected.';
  const name = String(file.name || '').toLowerCase();
  const extOk = /\.(pdf|jpe?g|png|webp)$/.test(name);
  if (!CERTIFICATE_ALLOWED_TYPES.includes(file.type) && !extOk) {
    return 'Only PDF, JPG, PNG or WEBP files are allowed.';
  }
  if (file.size > CERTIFICATE_MAX_BYTES) {
    return 'File is too large. Maximum size is 10 MB.';
  }
  if (file.size === 0) return 'The selected file is empty.';
  return null;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a lab certificate to the private `proof` bucket inside the buyer's folder,
 * so only platform admins and that buyer can read it (existing storage RLS).
 * Falls back to an inline data URL for small files when storage is unavailable.
 */
export async function uploadInspectionCertificate(file, inspection = {}) {
  const validationError = validateCertificateFile(file);
  if (validationError) throw new Error(validationError);

  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  const meta = {
    name: file.name || (isPdf ? 'lab-certificate.pdf' : 'lab-certificate.jpg'),
    type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };

  const safe = (v) => String(v || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const folder = safe(inspection.buyerId) || 'inspections';
  const safeName = String(meta.name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${folder}/inspection_cert_${safe(inspection.id) || 'report'}_${Date.now()}_${safeName}`;

  try {
    const { error } = await supabase.storage.from(CERTIFICATE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: meta.type,
    });
    if (!error) {
      return { ...meta, storage: 'supabase', bucket: CERTIFICATE_BUCKET, path };
    }
    console.warn('Certificate storage upload notice:', error);
  } catch (err) {
    console.warn('Certificate storage upload failed:', err);
  }

  if (file.size <= CERTIFICATE_INLINE_MAX_BYTES) {
    const dataUrl = await readFileAsDataUrl(file);
    return { ...meta, storage: 'inline', dataUrl };
  }

  throw new Error('Cloud upload failed and the file is too large for offline backup (max 1.5 MB). Please compress the file or try again.');
}

/**
 * Resolves a viewable URL for a stored certificate.
 * Supabase files get a fresh short-lived signed URL; inline files become a blob URL
 * (browsers block opening raw data: URLs in new tabs).
 */
export async function getInspectionCertificateUrl(certificate, { download = false } = {}) {
  if (!certificate) return null;
  try {
    if (certificate.storage === 'supabase' && certificate.path) {
      const { data, error } = await supabase.storage
        .from(certificate.bucket || CERTIFICATE_BUCKET)
        .createSignedUrl(
          certificate.path,
          60 * 30,
          download ? { download: certificate.name || 'lab-certificate' } : undefined
        );
      if (error) {
        console.warn('Certificate signed URL notice:', error);
        return null;
      }
      return data?.signedUrl || null;
    }
    if (certificate.dataUrl) {
      // Decode locally (fetch() on data: URLs is blocked by our CSP connect-src)
      const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(certificate.dataUrl);
      if (!match) return null;
      const mime = match[1] || certificate.type || 'application/octet-stream';
      const payload = match[3] || '';
      let bytes;
      if (match[2]) {
        const binary = atob(payload);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      } else {
        bytes = new TextEncoder().encode(decodeURIComponent(payload));
      }
      return URL.createObjectURL(new Blob([bytes], { type: mime }));
    }
  } catch (err) {
    console.warn('Could not resolve certificate URL:', err);
  }
  return null;
}

/**
 * Admin assigns Inspector & Inspector submits official Assay Report with Inspection Fee
 */
export async function sendInspectionReportToBuyer(inspectionId, reportData) {
  const all = getStoredInspections();
  const index = all.findIndex((r) => r.id === inspectionId || r.orderId === inspectionId || r.orderNumber === inspectionId);
  
  let target = index >= 0 ? all[index] : { id: inspectionId };

  // Certificate + lab credentials live inside the existing `arbitration` JSONB column (no schema change needed)
  const prevArbitration = target.arbitration && typeof target.arbitration === 'object' ? target.arbitration : {};
  const certificate = reportData.certificate !== undefined ? reportData.certificate : (prevArbitration.certificate || null);
  const labName = (reportData.labName || '').trim() || prevArbitration.labName || null;
  const labCertNumber = (reportData.labCertNumber || '').trim() || prevArbitration.labCertNumber || null;

  const updated = {
    ...target,
    arbitration: { ...prevArbitration, certificate, labName, labCertNumber },
    certificate,
    labName,
    labCertNumber,
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

    // If dispute is raised, atomically freeze linked order escrow
    if (updated.status === 'disputed' && (updated.orderNumber || updated.orderId)) {
      try {
        await supabase.rpc('freeze_order_on_dispute_atomic', {
          p_order_id: updated.orderNumber || updated.orderId,
          p_dispute_reason: updated.inspectorNotes || 'Assay discrepancy detected during physical inspection',
        });
      } catch (_rpcErr) {
        await supabase
          .from('orders')
          .update({
            escrow_status: 'held',
            status: 'disputed',
            updated_at: new Date().toISOString(),
          })
          .or(`order_number.eq.${updated.orderNumber},id.eq.${updated.orderId}`);
      }
    }
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
      // Preserve lab certificate & credentials stored alongside the ruling
      ...(all[index].arbitration && typeof all[index].arbitration === 'object' ? all[index].arbitration : {}),
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

/**
 * Admin cancels / deletes an inspection request cleanly
 */
export async function deleteInspectionRecord(inspectionId, orderRef = null) {
  if (!inspectionId) return false;

  // 1. Mark in deleted blacklist so it NEVER resurrects in this browser
  markInspectionDeletedLocally(inspectionId, orderRef);

  // 2. Remove from local cache immediately
  const all = getStoredInspections();
  const filtered = all.filter(
    (r) =>
      r.id !== inspectionId &&
      r.orderId !== inspectionId &&
      r.orderNumber !== inspectionId &&
      (orderRef ? r.orderId !== orderRef && r.orderNumber !== orderRef : true)
  );
  saveStoredInspections(filtered);

  // 3. Remove / cancel from Supabase
  try {
    // Primary: Hard DELETE from Supabase
    await supabase.from('inspections').delete().eq('id', inspectionId);
    if (orderRef) {
      await supabase.from('inspections').delete().eq('order_number', String(orderRef));
    }

    // Fallback: If RLS prevents hard delete, update status to 'cancelled' so it's ignored
    await supabase.from('inspections').update({ status: 'cancelled' }).eq('id', inspectionId);
    if (orderRef) {
      await supabase.from('inspections').update({ status: 'cancelled' }).eq('order_number', String(orderRef));
    }
  } catch (err) {
    console.warn('Could not delete/cancel inspection from Supabase:', err);
  }

  // 4. Dispatch event for instant UI sync across all open pages
  window.dispatchEvent(new Event('agrolnk_inspections_updated'));
  return true;
}

