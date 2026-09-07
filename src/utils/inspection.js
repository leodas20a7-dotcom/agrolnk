// AgroLnk Buyer-Side Quality Inspection & Assay Engine
// Exact Workflow: Buyer requests quality check before purchase/delivery -> Admin dispatches certified inspector -> Inspector conducts assay & reports to Buyer -> Buyer reviews certified report and proceeds to delivery.

const INSPECTION_STORAGE_KEY = 'agrolnk_inspection_reports';

const INITIAL_INSPECTIONS = [
  {
    id: 'insp_101',
    reportNumber: 'INSP-2026-8821',
    orderId: 'AGM-6801',
    orderNumber: 'AGM-6801',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    sellerName: 'veerappan (Salem Producer)',
    cropName: 'Nashik Red Onion',
    commodity: 'Onion',
    quantity: 50,
    verifiedWeight: 50.0,
    orderedGrade: 'A',
    grade: 'A',
    moisture: 11.2,
    foreignMatter: 0.5,
    status: 'requested', // 'requested' | 'assigned' | 'inspected_ready' | 'passed' | 'disputed' | 'resolved'
    orderAmount: 1000,
    inspectorName: null,
    disputeReason: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'insp_102',
    reportNumber: 'INSP-2026-4419',
    orderId: 'AGM-9266',
    orderNumber: 'AGM-9266',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    sellerName: 'veerappan (Salem Producer)',
    cropName: 'Hybrid Shivam Tomato',
    commodity: 'Tomato',
    quantity: 100,
    verifiedWeight: 98.5,
    orderedGrade: 'A',
    grade: 'A',
    moisture: 9.4,
    foreignMatter: 0.2,
    status: 'passed',
    orderAmount: 3000,
    inspectorName: 'AgroLnk Certified Assayer (Govind)',
    disputeReason: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
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
 * Buyer requests pre-buy / pre-dispatch Quality Inspection
 */
export function requestQualityInspection(data) {
  const all = getStoredInspections();
  const generateId = () => `insp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const generateReportNum = () => `INSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newInspection = {
    id: generateId(),
    reportNumber: generateReportNum(),
    orderId: data.orderId || data.orderNumber || data.id || `ORD-${Date.now()}`,
    orderNumber: data.orderNumber || data.orderId || `ORD-${Date.now()}`,
    buyerId: data.buyerId || 'usr_buyer_02',
    buyerName: data.buyerName || 'Wholesale Buyer',
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
  return newInspection;
}

/**
 * Admin assigns Inspector & Inspector submits official Assay Report
 */
export function sendInspectionReportToBuyer(inspectionId, reportData) {
  const all = getStoredInspections();
  const index = all.findIndex((r) => r.id === inspectionId || r.orderId === inspectionId || r.orderNumber === inspectionId);
  if (index === -1) return null;

  all[index] = {
    ...all[index],
    inspectorName: reportData.inspectorName || 'AgroLnk Certified Assayer',
    grade: reportData.grade || 'A',
    moisture: Number(reportData.moisture || 10.5),
    foreignMatter: Number(reportData.foreignMatter || 0.4),
    verifiedWeight: Number(reportData.verifiedWeight || all[index].quantity),
    status: reportData.verdict === 'dispute' ? 'disputed' : 'passed',
    inspectorNotes: reportData.inspectorNotes || 'Physical inspection & moisture meter testing completed at farmgate hub.',
    inspectedAt: new Date().toISOString(),
  };

  saveStoredInspections(all);
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
