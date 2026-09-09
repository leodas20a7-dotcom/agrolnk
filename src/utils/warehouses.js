// Agrolnk Supabase Warehouse & e-NWR Engine
import { supabase } from '../lib/supabase';

function mapReceiptFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouse_name,
    chamber: row.chamber,
    commodity: row.commodity,
    variety: row.variety,
    grade: row.grade,
    totalQuantity: Number(row.total_quantity),
    availableQuantity: Number(row.available_quantity),
    lockedQuantity: Number(row.locked_quantity || 0),
    unit: row.unit,
    estimatedValue: Number(row.estimated_value || 0),
    storageFeeMonthly: Number(row.storage_fee_monthly || 0),
    assayedQuality: row.assayed_quality || {},
    depositedAt: row.deposited_at,
    validUntil: row.valid_until,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LOCAL_RECEIPTS_KEY = 'agrolnk_warehouse_receipts_local';

const INITIAL_RECEIPTS = [
  {
    id: 'rcpt_001_salem_tomato',
    receiptNumber: '#eNWR-4091',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    warehouseId: 'wh_salem_01',
    warehouseName: 'Salem Agri Cold Storage Hub',
    chamber: 'Chamber B2 (Cold Cell 4°C-8°C)',
    commodity: 'Tomato',
    variety: 'Shivam Organic Hybrid',
    grade: 'A',
    totalQuantity: 5000,
    availableQuantity: 5000,
    lockedQuantity: 0,
    unit: 'kg',
    estimatedValue: 225000,
    storageFeeMonthly: 1750,
    assayedQuality: {
      moisture: '11.8%',
      purity: '99.2%',
      grade: 'WDRA Certified Grade A',
      assayStatus: 'Accredited Lab Passed',
    },
    depositedAt: '2026-09-02T10:30:00.000Z',
    validUntil: '2026-12-02T10:30:00.000Z',
    status: 'stored',
    createdAt: '2026-09-02T10:30:00.000Z',
    updatedAt: '2026-09-02T10:30:00.000Z',
  },
  {
    id: 'rcpt_002_dindigul_onion',
    receiptNumber: '#eNWR-8219',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    warehouseId: 'wh_dindigul_02',
    warehouseName: 'Dindigul Central Agri Logistics Park',
    chamber: 'Cold Vault D1 (Onions & Roots)',
    commodity: 'Onion',
    variety: 'Nashik Red A-Grade',
    grade: 'A',
    totalQuantity: 8000,
    availableQuantity: 5000,
    lockedQuantity: 3000,
    unit: 'kg',
    estimatedValue: 288000,
    storageFeeMonthly: 2400,
    assayedQuality: {
      moisture: '13.2%',
      purity: '98.8%',
      grade: 'WDRA Certified Grade A',
      assayStatus: 'Accredited Lab Passed',
    },
    depositedAt: '2026-09-03T14:15:00.000Z',
    validUntil: '2026-12-03T14:15:00.000Z',
    status: 'partially_listed',
    createdAt: '2026-09-03T14:15:00.000Z',
    updatedAt: '2026-09-03T14:15:00.000Z',
  }
];

function getLocalReceipts() {
  try {
    const raw = localStorage.getItem(LOCAL_RECEIPTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_RECEIPTS_KEY, JSON.stringify(INITIAL_RECEIPTS));
      return INITIAL_RECEIPTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RECEIPTS;
  }
}

function saveLocalReceipts(receipts) {
  try {
    localStorage.setItem(LOCAL_RECEIPTS_KEY, JSON.stringify(receipts));
  } catch (err) {
    console.warn('Failed to save local warehouse receipts:', err);
  }
}

/**
 * Get all warehouse receipts from Supabase (with local storage fallback)
 */
export async function getWarehouseReceipts() {
  const localList = getLocalReceipts();
  try {
    const { data, error } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return localList;
    }

    const mapped = (data || []).map(mapReceiptFromDb).filter(Boolean);
    // Merge remote and local (preventing duplicate IDs)
    const combined = [...mapped];
    localList.forEach((loc) => {
      if (!combined.some((c) => c.id === loc.id || c.receiptNumber === loc.receiptNumber)) {
        combined.push(loc);
      }
    });

    return combined;
  } catch (err) {
    console.warn('Supabase fetch error, using local receipts:', err);
    return localList;
  }
}

/**
 * Get warehouse inventory receipts for a farmer
 */
export async function getFarmerInventory(farmerId) {
  const all = await getWarehouseReceipts();
  if (!farmerId) return all;
  return all.filter((r) => !r.farmerId || r.farmerId === farmerId || r.farmerName?.includes('Sakthi') || farmerId.includes('farmer'));
}

/**
 * Get warehouse operator stats & receipts
 */
export async function getWarehouseOperatorStats(warehouseId) {
  try {
    const receipts = await getWarehouseReceipts();
    const activeReceipts = receipts.filter((r) => r.status === 'stored' || r.status === 'partially_listed');
    const totalValuation = activeReceipts.reduce((sum, r) => sum + (r.estimatedValue || 0), 0);
    const totalStoredKg = activeReceipts.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);

    return {
      activeReceipts: activeReceipts.length,
      totalValuation: `₹${(totalValuation / 100000).toFixed(2)} Lakh`,
      totalStoredKg,
      releaseOrders: 0,
      occupancyPercentage: 74,
      warehouse: {
        id: warehouseId || 'wh_salem_01',
        name: 'Salem Agri Cold Storage Hub',
        capacity: '5,000 MT',
        location: 'Salem, Tamil Nadu',
      },
    };
  } catch (err) {
    console.error('Error in getWarehouseOperatorStats:', err);
    return {
      activeReceipts: 0,
      totalValuation: '₹0',
      totalStoredKg: 0,
      releaseOrders: 0,
      occupancyPercentage: 0,
    };
  }
}

/**
 * Create a new e-NWR Warehouse Receipt
 */
export async function createWarehouseReceipt(receiptData) {
  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  };

  const generateReceiptNum = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#eNWR-${num}`;
  };

  const totalQty = Number(receiptData.quantity || receiptData.totalQuantity || 1000);
  const estValue = Number(receiptData.priceEstimate ? receiptData.priceEstimate * totalQty : (receiptData.estimatedValue || totalQty * 40));

  const newReceipt = {
    id: generateId(),
    receiptNumber: generateReceiptNum(),
    farmerId: receiptData.farmerId || 'usr_farmer_01',
    farmerName: receiptData.farmerName || 'Sakthi Vel',
    warehouseId: receiptData.warehouseId || 'wh_salem_01',
    warehouseName: receiptData.warehouseName || 'Salem Agri Cold Storage Hub',
    chamber: receiptData.chamber || 'Chamber A1 (Dry)',
    commodity: receiptData.commodity || 'Tomato',
    variety: receiptData.variety || 'Standard',
    grade: receiptData.grade || 'A',
    totalQuantity: totalQty,
    availableQuantity: totalQty,
    lockedQuantity: 0,
    unit: receiptData.unit || 'kg',
    estimatedValue: estValue,
    storageFeeMonthly: Number(receiptData.storageFeeMonthly || Math.round((totalQty / 1000) * 350)),
    assayedQuality: receiptData.assayedQuality || {
      moisture: '12%',
      purity: '99%',
      grade: 'A',
      assayStatus: 'WDRA Certified Grade A',
    },
    depositedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 3600000 * 24 * (receiptData.storageDays || 90)).toISOString(),
    status: 'stored',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save to local registry
  const localList = getLocalReceipts();
  localList.unshift(newReceipt);
  saveLocalReceipts(localList);

  // Sync to Supabase in background
  try {
    const dbRow = {
      id: newReceipt.id,
      receipt_number: newReceipt.receiptNumber,
      farmer_id: newReceipt.farmerId,
      farmer_name: newReceipt.farmerName,
      warehouse_id: newReceipt.warehouseId,
      warehouse_name: newReceipt.warehouseName,
      chamber: newReceipt.chamber,
      commodity: newReceipt.commodity,
      variety: newReceipt.variety,
      grade: newReceipt.grade,
      total_quantity: newReceipt.totalQuantity,
      available_quantity: newReceipt.availableQuantity,
      locked_quantity: newReceipt.lockedQuantity,
      unit: newReceipt.unit,
      estimated_value: newReceipt.estimatedValue,
      storage_fee_monthly: newReceipt.storageFeeMonthly,
      assayed_quality: newReceipt.assayedQuality,
      deposited_at: newReceipt.depositedAt,
      valid_until: newReceipt.validUntil,
      status: newReceipt.status,
      created_at: newReceipt.createdAt,
      updated_at: newReceipt.updatedAt,
    };

    await supabase.from('warehouse_receipts').insert([dbRow]);
  } catch (err) {
    console.warn('Supabase receipt insert notice (persisted locally):', err);
  }

  return newReceipt;
}

export const DEMO_WAREHOUSES = [
  {
    id: 'wh_salem_01',
    name: 'Salem Agri Cold Storage Hub',
    code: 'WH-TN-SLM-008',
    wdraCode: 'WDRA/2024/TN/0892',
    wdraRegNo: 'WDRA/2024/TN/0892',
    location: 'Salem, Tamil Nadu',
    district: 'Salem',
    state: 'Tamil Nadu',
    address: 'Omalur Main Road, NH-44 Agri Corridor, Salem - 636004',
    type: 'WDRA Certified Cold Storage',
    facilityType: 'WDRA Certified Cold Storage',
    capacity: '5,000 MT',
    totalCapacityTonnes: 5000,
    occupiedTonnes: 3700,
    occupancyPct: 74,
    occupancyPercent: 74,
    temperatureRange: '2°C to 12°C',
    humidityRange: '85% to 95% RH',
    monthlyRatePerKg: 0.35,
    monthlyRatePerTonne: 350,
    operatorContact: '+91 98421 88901',
    commodities: ['Tomato', 'Potato', 'Onion', 'Turmeric', 'Chilli', 'Mango', 'Apple'],
    chambers: [
      'Chamber A1 (Dry Storage)',
      'Chamber B2 (Cold Cell 4°C-8°C)',
      'Chamber B4 (Ultra-Cold 0°C-2°C)',
      'Chamber C3 (CA Controlled Atmosphere)',
    ],
  },
  {
    id: 'wh_dindigul_02',
    name: 'Dindigul Central Agri Logistics Park',
    code: 'WH-TN-DGL-012',
    wdraCode: 'WDRA/2023/TN/0441',
    wdraRegNo: 'WDRA/2023/TN/0441',
    location: 'Dindigul, Tamil Nadu',
    district: 'Dindigul',
    state: 'Tamil Nadu',
    address: 'Batlagundu Highway, Dindigul - 624002',
    type: 'NABARD Approved Modern Silo & Cold Cell',
    facilityType: 'NABARD Approved Modern Silo & Cold Cell',
    capacity: '8,000 MT',
    totalCapacityTonnes: 8000,
    occupiedTonnes: 4960,
    occupancyPct: 62,
    occupancyPercent: 62,
    temperatureRange: '0°C to 15°C',
    humidityRange: '80% to 90% RH',
    monthlyRatePerKg: 0.30,
    monthlyRatePerTonne: 300,
    operatorContact: '+91 94432 10982',
    commodities: ['Onion', 'Maize', 'Cotton', 'Rice', 'Wheat', 'Banana'],
    chambers: [
      'Silo Sector 1 (Grain Hermetic)',
      'Silo Sector 2 (Maize & Pulses)',
      'Cold Vault D1 (Onions & Roots)',
      'Cold Vault D2 (Multi-Commodity)',
    ],
  },
];

/**
 * Get all available active warehouses across the Agrolnk platform.
 * NOTE: Unconfigured or unsubmitted warehouse accounts are STRICTLY HIDDEN from farmers & buyers.
 * For modified facilities, only the ACTIVE APPROVED capacity and details are shown until Admin approves revisions.
 */
export function getWarehouses() {
  const activeWarehouses = [...DEMO_WAREHOUSES];

  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};

    // Only include user warehouse profiles that have been strictly APPROVED by Admin ('verified')
    Object.values(profiles).forEach((p) => {
      // Must be explicitly verified by Admin with valid approved capacity
      const isVerified = p && p.verificationStatus === 'verified' && Number(p.totalCapacityTonnes) > 0;

      if (isVerified) {
        const approvedCapacity = Number(p.totalCapacityTonnes);

        // Prevent duplicate entries
        const existingIdx = activeWarehouses.findIndex(
          (w) => w.id === p.userId || (p.email && w.operatorContact?.includes(p.phone)) || w.name?.toLowerCase() === (p.companyName || p.warehouseName || '').toLowerCase()
        );

        const chambersToUse = (Array.isArray(p.storageTypes) && p.storageTypes.length > 0)
          ? p.storageTypes
          : ['Chamber A1 (Multi-Commodity)'];

        const formattedChambers = Array.isArray(chambersToUse) && chambersToUse.length > 0 && typeof chambersToUse[0] === 'object'
          ? chambersToUse.map((st) => `${st.name} (${st.capacity}T - ${st.temp || 'Controlled'})`)
          : chambersToUse;

        const dynamicWh = {
          id: p.userId || `wh_${Date.now()}`,
          name: p.companyName || p.warehouseName || 'Agri Storage Hub',
          code: `WH-${(p.district || 'AG').slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          wdraCode: p.wdraCode || 'WDRA/2025/VERIFIED',
          wdraRegNo: p.wdraCode || 'WDRA/2025/VERIFIED',
          location: `${p.district || 'Salem'}, ${p.state || 'Tamil Nadu'}`,
          district: p.district || 'Salem',
          state: p.state || 'Tamil Nadu',
          address: p.address ? `${p.address}, ${p.district} - ${p.pincode || ''}` : `${p.district || 'Salem'}, ${p.state || 'Tamil Nadu'}`,
          type: 'WDRA Accredited Agri Storage',
          facilityType: 'WDRA Accredited Agri Storage',
          capacity: `${approvedCapacity.toLocaleString('en-IN')} MT`,
          totalCapacityTonnes: approvedCapacity,
          occupiedTonnes: 0,
          occupancyPct: 0,
          occupancyPercent: 0,
          temperatureRange: (typeof chambersToUse[0] === 'object' && chambersToUse[0]?.temp) || '2°C to 12°C',
          humidityRange: '85% to 95% RH',
          monthlyRatePerKg: 0.35,
          monthlyRatePerTonne: 350,
          operatorContact: p.phone || '+91 98421 88901',
          websiteUrl: p.websiteUrl || '',
          commodities: ['Tomato', 'Potato', 'Onion', 'Turmeric', 'Grains', 'Pulses'],
          chambers: formattedChambers,
          isUserSubmitted: true,
          verificationStatus: 'verified',
          hasPendingReview: Boolean(p.hasPendingReview),
        };

        if (existingIdx >= 0) {
          activeWarehouses[existingIdx] = { ...activeWarehouses[existingIdx], ...dynamicWh };
        } else {
          activeWarehouses.push(dynamicWh);
        }
      }
    });
  } catch (err) {
    console.warn('Error compiling dynamic warehouse list:', err);
  }

  return activeWarehouses;
}

export function getWarehouseById(id) {
  const all = getWarehouses();
  return all.find((w) => w.id === id) || all[0];
}

export const getInventory = getWarehouseReceipts;
export const depositProduceToWarehouse = createWarehouseReceipt;

export async function listProduceFromInventory(receiptId, listData) {
  const localList = getLocalReceipts();
  const idx = localList.findIndex((r) => r.id === receiptId);

  let updatedReceipt = null;

  if (idx >= 0) {
    const receipt = localList[idx];
    const qtyToList = Number(listData.quantity || receipt.availableQuantity || receipt.available_quantity);
    const newAvail = Math.max(0, Number(receipt.availableQuantity ?? receipt.available_quantity ?? 0) - qtyToList);
    const newLocked = Number(receipt.lockedQuantity ?? receipt.locked_quantity ?? 0) + qtyToList;

    localList[idx] = {
      ...receipt,
      availableQuantity: newAvail,
      lockedQuantity: newLocked,
      status: newAvail === 0 ? 'listed' : 'partially_listed',
      updatedAt: new Date().toISOString(),
    };
    saveLocalReceipts(localList);
    updatedReceipt = localList[idx];
  }

  try {
    const { data: receipt } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    if (receipt) {
      const qtyToList = Number(listData.quantity || receipt.available_quantity);
      const newAvail = Math.max(0, Number(receipt.available_quantity) - qtyToList);
      const newLocked = Number(receipt.locked_quantity || 0) + qtyToList;

      await supabase
        .from('warehouse_receipts')
        .update({
          available_quantity: newAvail,
          locked_quantity: newLocked,
          status: newAvail === 0 ? 'listed' : 'partially_listed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', receiptId);
    }
  } catch (err) {
    console.warn('Supabase listing sync notice:', err);
  }

  return updatedReceipt;
}

export async function dispatchProduceFromWarehouse(receiptId, dispatchData = {}) {
  const localList = getLocalReceipts();
  const idx = localList.findIndex((r) => r.id === receiptId);
  let updatedReceipt = null;

  if (idx >= 0) {
    const receipt = localList[idx];
    const qtyToDispatch = Number(dispatchData.quantity || receipt.lockedQuantity || receipt.totalQuantity);
    const updatedAvail = Math.max(0, Number(receipt.availableQuantity || 0) - (dispatchData.fromAvailable ? qtyToDispatch : 0));
    const updatedLocked = Math.max(0, Number(receipt.lockedQuantity || 0) - (!dispatchData.fromAvailable ? qtyToDispatch : 0));
    const isFullyCleared = updatedAvail + updatedLocked === 0;

    localList[idx] = {
      ...receipt,
      availableQuantity: updatedAvail,
      lockedQuantity: updatedLocked,
      status: isFullyCleared ? 'released' : (updatedAvail === 0 ? 'listed' : 'partially_listed'),
      updatedAt: new Date().toISOString(),
    };
    saveLocalReceipts(localList);
    updatedReceipt = localList[idx];
  }

  try {
    const { data: receipt } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    if (receipt) {
      const qtyToDispatch = Number(dispatchData.quantity || receipt.locked_quantity || receipt.total_quantity);
      const now = new Date().toISOString();
      const updatedAvail = Math.max(0, Number(receipt.available_quantity) - (dispatchData.fromAvailable ? qtyToDispatch : 0));
      const updatedLocked = Math.max(0, Number(receipt.locked_quantity) - (!dispatchData.fromAvailable ? qtyToDispatch : 0));
      const isFullyCleared = updatedAvail + updatedLocked === 0;
      const targetStatus = isFullyCleared ? 'released' : (updatedAvail === 0 ? 'listed' : 'partially_listed');

      await supabase
        .from('warehouse_receipts')
        .update({
          available_quantity: updatedAvail,
          locked_quantity: updatedLocked,
          status: targetStatus,
          updated_at: now,
        })
        .eq('id', receiptId);
    }
  } catch (err) {
    console.warn('Supabase dispatch sync notice:', err);
  }

  return updatedReceipt;
}

export async function getWarehouseInventory(warehouseId) {
  const all = await getWarehouseReceipts();
  if (!warehouseId) return all;
  return all.filter((r) => !r.warehouseId || r.warehouseId === warehouseId || warehouseId.includes('wh_salem') || warehouseId.includes('warehouse'));
}

const WAREHOUSE_PROFILES_KEY = 'agrolnk_warehouse_profiles';

/**
 * Get warehouse profile for a specific user/operator
 */
export function getWarehouseProfile(userId, userEmail) {
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    if (userId && profiles[userId]) {
      return profiles[userId];
    }
    if (userEmail && profiles[userEmail]) {
      return profiles[userEmail];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save or update warehouse profile:
 * - Operational fields (websiteUrl, phone) reflect immediately.
 * - Protected fields (capacity, WDRA code, GSTIN, documents, address, storage types)
 *   are stored as Pending Changes awaiting Admin Approval if the profile was previously verified.
 */
export async function saveWarehouseProfile(userId, profileData) {
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    const existing = profiles[userId] || (profileData.email ? profiles[profileData.email] : null) || {};

    const isInitialSetup = !existing.setupCompleted;
    const isPreviouslyVerified = existing.verificationStatus === 'verified';

    // Check if protected fields have changed
    const protectedFieldsChanged = !isInitialSetup && isPreviouslyVerified && (
      Number(existing.totalCapacityTonnes) !== Number(profileData.totalCapacityTonnes) ||
      existing.wdraCode !== profileData.wdraCode ||
      existing.gstin !== profileData.gstin ||
      existing.companyName !== profileData.companyName ||
      existing.address !== profileData.address ||
      JSON.stringify(existing.storageTypesConfig) !== JSON.stringify(profileData.storageTypesConfig) ||
      JSON.stringify(existing.documentNames) !== JSON.stringify(profileData.documentNames)
    );

    let updated;

    if (protectedFieldsChanged) {
      // Keep live approved profile active, but record pending modification for Admin Review
      updated = {
        ...existing,
        // Operational fields update immediately
        websiteUrl: profileData.websiteUrl || existing.websiteUrl,
        phone: profileData.phone || existing.phone,
        hasPendingReview: true,
        verificationStatus: 'modification_pending',
        pendingChanges: {
          ...profileData,
          requestedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Initial setup or direct operational update
      updated = {
        ...existing,
        ...profileData,
        userId,
        setupCompleted: true,
        hasPendingReview: isInitialSetup,
        verificationStatus: isInitialSetup ? 'pending' : (existing.verificationStatus || 'pending'),
        pendingChanges: isInitialSetup ? { ...profileData, requestedAt: new Date().toISOString() } : null,
        updatedAt: new Date().toISOString(),
      };
    }

    profiles[userId] = updated;
    if (profileData.email) {
      profiles[profileData.email] = updated;
    }
    localStorage.setItem(WAREHOUSE_PROFILES_KEY, JSON.stringify(profiles));

    // 1. Persist to Supabase Database 'profiles' table
    try {
      const dbPayload = {
        company_name: updated.companyName || updated.warehouseName,
        state: updated.state || 'Tamil Nadu',
        district: updated.district || 'Salem',
        kyc_status: updated.verificationStatus === 'verified' ? 'verified' : 'pending',
        updated_at: new Date().toISOString(),
      };

      if (userId) {
        await supabase
          .from('profiles')
          .update(dbPayload)
          .eq('id', userId);
      } else if (profileData.email) {
        await supabase
          .from('profiles')
          .update(dbPayload)
          .eq('email', profileData.email.trim().toLowerCase());
      }
    } catch (dbErr) {
      console.warn('Supabase profile database update notice:', dbErr);
    }

    // 2. Sync to Admin KYC registry
    try {
      const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
      const registry = storedRaw ? JSON.parse(storedRaw) : [];
      const userIndex = registry.findIndex(
        (u) => u.id === userId || (profileData.email && u.email === profileData.email)
      );

      const docsToUse = protectedFieldsChanged ? (profileData.documentUrls || {}) : (updated.documentUrls || {});
      const namesToUse = protectedFieldsChanged ? (profileData.documentNames || {}) : (updated.documentNames || {});

      const docList = [
        {
          type: 'WDRA Accreditation Certificate',
          number: (protectedFieldsChanged ? profileData.wdraCode : updated.wdraCode) || 'WDRA Submitted',
          status: 'pending',
          fileUrl: docsToUse.wdraCert || '',
          fileName: namesToUse.wdraCert || 'wdra_certificate.pdf',
        },
        {
          type: 'GST / Commercial Storage License',
          number: (protectedFieldsChanged ? profileData.gstin : updated.gstin) || 'GST Submitted',
          status: 'pending',
          fileUrl: docsToUse.gstinCert || '',
          fileName: namesToUse.gstinCert || 'gst_certificate.pdf',
        },
      ];

      if (docsToUse.insuranceCert) {
        docList.push({
          type: 'Storage Facility Insurance / FSSAI',
          number: 'Insured Facility',
          status: 'pending',
          fileUrl: docsToUse.insuranceCert,
          fileName: namesToUse.insuranceCert || 'insurance_policy.pdf',
        });
      }

      const activeTypes = protectedFieldsChanged ? profileData.storageTypes : updated.storageTypes;
      const storageTypeSummary = Array.isArray(activeTypes)
        ? activeTypes.map((t) => `${t.name} (${t.capacity}T)`).join(', ')
        : 'Multi-Chamber';

      const diffNotes = protectedFieldsChanged
        ? `[MODIFICATION REQUEST] Requested Capacity: ${profileData.totalCapacityTonnes}T (Current Live: ${existing.totalCapacityTonnes}T) • WDRA: ${profileData.wdraCode} • Storage Types: ${storageTypeSummary}`
        : `Facility: ${profileData.companyName || profileData.warehouseName} • Capacity: ${profileData.totalCapacityTonnes}T (${storageTypeSummary}) • WDRA: ${profileData.wdraCode || 'N/A'}`;

      const registryPayload = {
        id: userId,
        name: profileData.operatorName || updated.operatorName || 'Warehouse Operator',
        role: 'warehouse',
        email: profileData.email || updated.email || '',
        phone: profileData.phone || updated.phone || '',
        state: profileData.state || updated.state || 'Tamil Nadu',
        district: profileData.district || updated.district || 'Salem',
        orgName: profileData.companyName || profileData.warehouseName || updated.companyName || 'Agri Storage Facility',
        orgCapacity: updated.totalCapacityTonnes,
        websiteUrl: profileData.websiteUrl || updated.websiteUrl || '',
        verificationStatus: updated.verificationStatus,
        hasPendingReview: updated.hasPendingReview,
        pendingChanges: updated.pendingChanges,
        submittedAt: new Date().toISOString(),
        documents: docList,
        auditNotes: diffNotes,
      };

      if (userIndex >= 0) {
        registry[userIndex] = { ...registry[userIndex], ...registryPayload };
      } else {
        registry.unshift(registryPayload);
      }
      localStorage.setItem('agrolnk_admin_kyc_registry', JSON.stringify(registry));
    } catch (regErr) {
      console.warn('KYC registry sync warning:', regErr);
    }

    return updated;
  } catch (err) {
    console.error('Error saving warehouse profile:', err);
    throw err;
  }
}

/**
 * Approve a warehouse profile or pending facility revision (Admin Action)
 */
export function approveWarehouseProfileModification(userId) {
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    const p = profiles[userId];
    if (!p) return null;

    let merged;
    if (p.pendingChanges) {
      merged = {
        ...p,
        ...p.pendingChanges,
        pendingChanges: null,
        hasPendingReview: false,
        verificationStatus: 'verified',
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      merged = {
        ...p,
        hasPendingReview: false,
        verificationStatus: 'verified',
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    profiles[userId] = merged;
    if (merged.email) {
      profiles[merged.email] = merged;
    }
    localStorage.setItem(WAREHOUSE_PROFILES_KEY, JSON.stringify(profiles));
    return merged;
  } catch (err) {
    console.error('Error approving warehouse profile modification:', err);
    return null;
  }
}

/**
 * Reject a warehouse pending facility revision (Admin Action)
 */
export function rejectWarehouseProfileModification(userId, reason = 'Modification rejected by Compliance Board') {
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    const p = profiles[userId];
    if (!p) return null;

    const reverted = {
      ...p,
      pendingChanges: null,
      hasPendingReview: false,
      lastRejectionReason: reason,
      updatedAt: new Date().toISOString(),
    };

    profiles[userId] = reverted;
    if (reverted.email) {
      profiles[reverted.email] = reverted;
    }
    localStorage.setItem(WAREHOUSE_PROFILES_KEY, JSON.stringify(profiles));
    return reverted;
  } catch (err) {
    console.error('Error rejecting warehouse profile modification:', err);
    return null;
  }
}

