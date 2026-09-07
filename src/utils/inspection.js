// AgroLnk Buyer-Side Quality Inspection & Assay Engine
// Requirement: Buyer-side product inspection is mandatory before final escrow release.

const INSPECTION_STORAGE_KEY = 'agrolnk_inspection_reports';

const INITIAL_INSPECTIONS = [
  {
    id: 'insp_101',
    reportNumber: 'INSP-2026-8821',
    orderId: 'ORD-9842',
    orderNumber: 'ORD-9842',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    sellerName: 'Sakthi Vel (Salem Farmer Producer Org)',
    cropName: 'Premium Sona Masoori Paddy',
    commodity: 'Paddy',
    quantity: 25,
    verifiedWeight: 24.2,
    orderedGrade: 'A',
    grade: 'B',
    moisture: 14.8,
    foreignMatter: 2.1,
    status: 'disputed',
    orderAmount: 625000,
    disputeReason: 'Moisture assay at 14.8% exceeds maximum 12% contract limit, causing discoloration risk.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'insp_102',
    reportNumber: 'INSP-2026-4419',
    orderId: 'ORD-9750',
    orderNumber: 'ORD-9750',
    buyerId: 'usr_buyer_03',
    buyerName: 'Coimbatore Flour Mills Ltd',
    sellerName: 'Ramesh Kumar (Dindigul)',
    cropName: 'Sharbati Milling Wheat',
    commodity: 'Wheat',
    quantity: 40,
    verifiedWeight: 40.0,
    orderedGrade: 'A',
    grade: 'A',
    moisture: 10.5,
    foreignMatter: 0.4,
    status: 'passed',
    orderAmount: 1120000,
    disputeReason: null,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function getStoredInspections() {
  try {
    const raw = localStorage.getItem(INSPECTION_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(INSPECTION_STORAGE_KEY, JSON.stringify(INITIAL_INSPECTIONS));
      return INITIAL_INSPECTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_INSPECTIONS;
  }
}

function saveStoredInspections(reports) {
  try {
    localStorage.setItem(INSPECTION_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error('Failed to save inspection reports:', err);
  }
}

/**
 * Synchronous get all inspection records
 */
export function getInspectionRecords() {
  return getStoredInspections();
}

/**
 * Get inspection report for an order
 */
export async function getInspectionForOrder(orderNumberOrId) {
  const all = getStoredInspections();
  return all.find((r) => r.orderId === orderNumberOrId || r.orderNumber === orderNumberOrId || r.id === orderNumberOrId) || null;
}

/**
 * Submit buyer quality inspection report
 */
export async function submitInspectionReport(reportData) {
  const all = getStoredInspections();
  
  const generateId = () => `insp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const generateReportNum = () => `INSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newReport = {
    id: generateId(),
    reportNumber: generateReportNum(),
    orderId: reportData.orderId,
    orderNumber: reportData.orderNumber || reportData.orderId,
    buyerId: reportData.buyerId,
    buyerName: reportData.buyerName,
    sellerName: reportData.sellerName || reportData.farmerName,
    cropName: reportData.cropName || reportData.commodity,
    commodity: reportData.commodity,
    orderedGrade: reportData.orderedGrade || 'A',
    grade: reportData.inspectedGrade || reportData.grade || reportData.orderedGrade || 'A',
    quantity: Number(reportData.orderedQuantity || reportData.quantity || 0),
    verifiedWeight: Number(reportData.receivedQuantity || reportData.verifiedWeight || reportData.quantity || 0),
    moisture: Number(reportData.moisturePercentage || reportData.moisture || 11.5),
    foreignMatter: Number(reportData.foreignMatterPercentage || reportData.foreignMatter || 0.5),
    orderAmount: Number(reportData.orderAmount || 0),
    verdict: reportData.verdict || 'approved',
    disputeReason: reportData.disputeReason || null,
    inspectorNotes: reportData.inspectorNotes || 'Physical quality and assay parameters confirmed matching agreement.',
    images: reportData.images || [],
    inspectedAt: new Date().toISOString(),
    status: reportData.verdict === 'rejected_dispute' ? 'disputed' : 'passed',
  };

  const existingIndex = all.findIndex((r) => r.orderNumber === reportData.orderNumber || r.orderId === reportData.orderId);
  if (existingIndex >= 0) {
    all[existingIndex] = newReport;
  } else {
    all.unshift(newReport);
  }

  saveStoredInspections(all);
  return newReport;
}

/**
 * Get all inspection reports (for Admin arbitration)
 */
export async function getAllInspections() {
  return getStoredInspections();
}

/**
 * Arbitrate dispute (Admin Ombudsman)
 */
export function arbitrateDispute(reportId, arbitrationData) {
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
  return all[index];
}

/**
 * Resolve an inspection dispute (Admin Action alias)
 */
export async function resolveInspectionDispute(reportId, resolutionVerdict, resolutionNotes) {
  return arbitrateDispute(reportId, {
    action: resolutionVerdict,
    notes: resolutionNotes,
    arbitratedBy: 'AgroLnk Admin Board'
  });
}
