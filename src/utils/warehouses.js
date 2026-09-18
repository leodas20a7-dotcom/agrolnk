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
const RENT_PAYMENTS_KEY = 'agrolnk_warehouse_rent_payments';

const INITIAL_RECEIPTS = [];

function getLocalReceipts() {
  try {
    const raw = localStorage.getItem(LOCAL_RECEIPTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out legacy dummy entries
      const cleaned = parsed.filter(
        (r) => r.id !== 'rcpt_001_salem_tomato' && r.id !== 'rcpt_002_dindigul_onion' && !r.receiptNumber?.includes('#eNWR-4091') && !r.receiptNumber?.includes('#eNWR-8219')
      );
      if (cleaned.length !== parsed.length) {
        saveLocalReceipts(cleaned);
      }
      return cleaned;
    }
    return [];
  } catch {
    return [];
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
 * Calculate accrued storage rental dues and validity metrics for an e-NWR lot
 */
export function calculateStorageRentalDues(receipt) {
  const safeFallback = {
    monthlyRate: 350,
    dailyRate: 12,
    daysStored: 0,
    accruedDue: 0,
    amountDue: 0,
    daysRemaining: 90,
    validUntil: new Date(Date.now() + 90 * 86400000).toISOString(),
    isExpiringSoon: false,
    isExpired: false,
    paymentMode: 'auto_deduct_or_direct',
  };

  if (!receipt) return safeFallback;

  try {
    const totalQty = Number(receipt.totalQuantity || receipt.quantity || 0);
    const monthlyRate = Number(receipt.storageFeeMonthly || Math.round((totalQty / 1000) * 350)) || 350;
    const dailyRate = monthlyRate / 30;

    const now = new Date();
    let depositedDate = receipt.depositedAt ? new Date(receipt.depositedAt) : now;
    if (isNaN(depositedDate.getTime())) depositedDate = now;

    let lastPaidDate = receipt.lastRentPaidAt ? new Date(receipt.lastRentPaidAt) : depositedDate;
    if (isNaN(lastPaidDate.getTime())) lastPaidDate = depositedDate;

    // Days since last rent payment
    const daysDiff = Math.max(1, Math.ceil((now - lastPaidDate) / (1000 * 60 * 60 * 24)));
    const accruedDue = Math.round(daysDiff * dailyRate);

    // Expiry calculation
    let validUntilDate = receipt.validUntil ? new Date(receipt.validUntil) : new Date(depositedDate.getTime() + 90 * 86400000);
    if (isNaN(validUntilDate.getTime())) {
      validUntilDate = new Date(now.getTime() + 90 * 86400000);
    }

    const daysRemaining = Math.ceil((validUntilDate - now) / (1000 * 60 * 60 * 24));

    return {
      monthlyRate,
      dailyRate: Math.round(dailyRate) || 12,
      daysStored: isNaN(daysDiff) ? 0 : daysDiff,
      accruedDue: isNaN(accruedDue) ? 0 : accruedDue,
      amountDue: isNaN(accruedDue) ? 0 : accruedDue,
      daysRemaining: isNaN(daysRemaining) ? 90 : Math.max(0, daysRemaining),
      validUntil: isNaN(validUntilDate.getTime()) ? new Date().toISOString() : validUntilDate.toISOString(),
      isExpiringSoon: !isNaN(daysRemaining) && daysRemaining <= 10 && daysRemaining > 0,
      isExpired: !isNaN(daysRemaining) && daysRemaining <= 0,
      paymentMode: 'auto_deduct_or_direct',
    };
  } catch (err) {
    console.warn('Error calculating storage rental dues:', err);
    return safeFallback;
  }
}

/**
 * Pay / settle accrued warehouse storage rent
 */
export async function payStorageRent(receiptId, paymentDetails = {}) {
  const localList = getLocalReceipts();
  const idx = localList.findIndex((r) => r.id === receiptId);
  let updatedReceipt = null;

  const paymentRecord = {
    id: `rent_pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    receiptId,
    amount: Number(paymentDetails.amount || 0),
    paymentMethod: paymentDetails.method || 'UPI / Auto-Escrow',
    transactionRef: `RENT-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    paidAt: new Date().toISOString(),
    extendedDays: Number(paymentDetails.extendedDays || 30),
    paidBy: paymentDetails.paidBy || 'Farmer Depositor',
  };

  if (idx >= 0) {
    const existing = localList[idx];
    const prevValid = existing.validUntil ? new Date(existing.validUntil) : new Date();
    const safePrevValid = isNaN(prevValid.getTime()) ? new Date() : prevValid;
    const newValidUntil = new Date(Math.max(Date.now(), safePrevValid.getTime()) + (paymentRecord.extendedDays * 86400000)).toISOString();

    localList[idx] = {
      ...existing,
      lastRentPaidAt: paymentRecord.paidAt,
      validUntil: newValidUntil,
      rentPaymentHistory: [paymentRecord, ...(existing.rentPaymentHistory || [])],
      updatedAt: new Date().toISOString(),
    };
    saveLocalReceipts(localList);
    updatedReceipt = localList[idx];
  }

  // Record payment in local payments registry
  try {
    const raw = localStorage.getItem(RENT_PAYMENTS_KEY);
    const payments = raw ? JSON.parse(raw) : [];
    payments.unshift(paymentRecord);
    localStorage.setItem(RENT_PAYMENTS_KEY, JSON.stringify(payments));
  } catch (err) {
    console.warn('Failed to save rent payment record:', err);
  }

  return { success: true, receipt: updatedReceipt, payment: paymentRecord };
}

/**
 * Get warehouse & storage notifications and alerts
 */
export function getWarehouseNotifications(userId, role = 'farmer') {
  const receipts = getLocalReceipts() || [];
  const notifications = [];

  receipts.forEach((r) => {
    if (!r) return;
    if (userId && r.farmerId && r.farmerId !== userId && role === 'farmer') return;

    const dues = calculateStorageRentalDues(r);
    if (!dues) return;

    if (role === 'farmer') {
      if (dues.isExpiringSoon) {
        notifications.push({
          id: `notif_exp_${r.id || Math.random()}`,
          type: 'warning',
          title: 'Storage Validity Expiring Soon',
          message: `${r.commodity || 'Commodity'} lot (${r.receiptNumber || 'Receipt'}) at ${r.warehouseName || 'Warehouse'} has ${dues.daysRemaining} days remaining. Settle rent or list for direct sale.`,
          date: new Date().toISOString(),
          receiptId: r.id,
          amountDue: dues.accruedDue || dues.amountDue || 0,
        });
      }
      if (dues.accruedDue > 0 && dues.daysStored >= 25) {
        notifications.push({
          id: `notif_rent_${r.id || Math.random()}`,
          type: 'info',
          title: 'Monthly Storage Rent Due Reminder',
          message: `Monthly rent of ₹${dues.accruedDue} is due for ${r.commodity || 'Commodity'} lot (${r.receiptNumber || 'Receipt'}). Auto-deduct on sale or pay online.`,
          date: new Date().toISOString(),
          receiptId: r.id,
          amountDue: dues.accruedDue || dues.amountDue || 0,
        });
      }
    } else if (role === 'warehouse') {
      if (r.status === 'stored') {
        notifications.push({
          id: `wh_notif_${r.id || Math.random()}`,
          type: 'success',
          title: 'Active In-Storage Produce Lot',
          message: `${r.farmerName || 'Farmer'} deposited ${r.totalQuantity || 0} ${r.unit || 'kg'} ${r.commodity || 'Produce'} in ${r.chamber || 'Chamber'}.`,
          date: r.depositedAt || new Date().toISOString(),
          receiptId: r.id,
        });
      }
    }
  });

  return notifications;
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
  if (!farmerId) return [];
  return all.filter((r) => r.farmerId === farmerId);
}

/**
 * Get warehouse operator stats & receipts
 */
export async function getWarehouseOperatorStats(warehouseId, profile = null) {
  try {
    const receipts = await getWarehouseInventory(warehouseId);
    const activeReceipts = receipts.filter((r) => r.status === 'stored' || r.status === 'partially_listed');
    const totalValuation = activeReceipts.reduce((sum, r) => sum + (r.estimatedValue || 0), 0);
    const totalStoredKg = activeReceipts.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
    const totalStoredTonnes = Number((totalStoredKg / 1000).toFixed(1));
    const capacityTonnes = profile?.totalCapacityTonnes ? Number(profile.totalCapacityTonnes) : 2000;
    const computedOccupancy = capacityTonnes > 0 ? Number(((totalStoredTonnes / capacityTonnes) * 100).toFixed(1)) : 0;

    return {
      activeReceipts: activeReceipts.length,
      totalValuation: `₹${(totalValuation / 100000).toFixed(2)} Lakh`,
      totalStoredKg,
      totalStoredTonnes,
      releaseOrders: 0,
      occupancyPercentage: computedOccupancy,
      warehouse: {
        id: warehouseId || '',
        name: profile?.companyName || profile?.warehouseName || 'Agri Storage Hub',
        capacity: `${capacityTonnes.toLocaleString('en-IN')} MT`,
        location: profile?.district ? `${profile.district}, ${profile.state || ''}` : 'Location Pending',
      },
    };
  } catch (err) {
    console.error('Error in getWarehouseOperatorStats:', err);
    return {
      activeReceipts: 0,
      totalValuation: '₹0',
      totalStoredKg: 0,
      totalStoredTonnes: 0,
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

  // Determine monthly storage rate from warehouse tariff or chamber tariff
  let ratePerTonne = Number(receiptData.monthlyRatePerTonne || 350);
  if (receiptData.warehouseId) {
    const wh = getWarehouseById(receiptData.warehouseId);
    if (wh) {
      ratePerTonne = Number(wh.monthlyRatePerTonne || 350);
      if (receiptData.chamber && wh.chamberRates && wh.chamberRates[receiptData.chamber]) {
        ratePerTonne = Number(wh.chamberRates[receiptData.chamber]);
      }
    }
  }

  const calculatedMonthlyFee = Number(
    receiptData.storageFeeMonthly || Math.round((totalQty / 1000) * ratePerTonne)
  );

  const newReceipt = {
    id: generateId(),
    receiptNumber: generateReceiptNum(),
    farmerId: receiptData.farmerId || '',
    farmerName: receiptData.farmerName || 'Depositor / Farmer',
    warehouseId: receiptData.warehouseId || '',
    warehouseName: receiptData.warehouseName || 'Agri Storage Facility',
    chamber: receiptData.chamber || 'General Storage Chamber',
    commodity: receiptData.commodity || 'Agri Produce',
    variety: receiptData.variety || 'Standard',
    grade: receiptData.grade || 'A',
    totalQuantity: totalQty,
    availableQuantity: totalQty,
    lockedQuantity: 0,
    unit: receiptData.unit || 'kg',
    estimatedValue: estValue,
    storageFeeMonthly: calculatedMonthlyFee,
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

// Official WDRA Accredited Certified Facilities
export const DEMO_WAREHOUSES = [
  {
    id: 'wh_salem_01',
    name: 'Salem Agro Cold Storage & WDRA Hub',
    code: 'WH-SLM-101',
    wdraCode: 'WDRA/2025/TN-0891',
    wdraRegNo: 'WDRA/2025/TN-0891',
    location: 'Salem, Tamil Nadu',
    district: 'Salem',
    state: 'Tamil Nadu',
    address: 'Plot 45, NH-44 Agri Logistics Park, Omalur, Salem - 636004',
    type: 'WDRA Accredited Multi-Commodity Cold Chain',
    facilityType: 'WDRA Accredited Cold Storage',
    capacity: '5,000 MT',
    totalCapacityTonnes: 5000,
    occupiedTonnes: 1250,
    occupancyPct: 25,
    occupancyPercent: 25,
    temperatureRange: '2°C to 10°C',
    humidityRange: '85% to 95% RH',
    monthlyRatePerKg: 0.35,
    monthlyRatePerTonne: 350,
    operatorContact: '+91 98421 88901',
    websiteUrl: '',
    commodities: ['Tomato', 'Potato', 'Onion', 'Turmeric', 'Chilli', 'Grains'],
    chambers: [
      'Chamber A1 - Low Temperature (2°C - 4°C)',
      'Chamber A2 - Controlled Atmosphere (6°C - 10°C)',
      'Chamber B1 - Hermetic Grain Silo',
      'Chamber B2 - Dry Spices Vault'
    ],
    isUserSubmitted: false,
    verificationStatus: 'verified',
    hasPendingReview: false,
  },
  {
    id: 'wh_dindigul_02',
    name: 'Dindigul Central Agri Warehouse & Silos',
    code: 'WH-DGL-204',
    wdraCode: 'WDRA/2025/TN-1402',
    wdraRegNo: 'WDRA/2025/TN-1402',
    location: 'Dindigul, Tamil Nadu',
    district: 'Dindigul',
    state: 'Tamil Nadu',
    address: 'Survey 108, Vadamadurai Ring Road, Dindigul - 624001',
    type: 'WDRA Certified Atmospheric Vault & Grain Silos',
    facilityType: 'WDRA Certified Grain & Produce Silos',
    capacity: '8,000 MT',
    totalCapacityTonnes: 8000,
    occupiedTonnes: 3200,
    occupancyPct: 40,
    occupancyPercent: 40,
    temperatureRange: 'Ambient to 15°C',
    humidityRange: '60% to 75% RH',
    monthlyRatePerKg: 0.30,
    monthlyRatePerTonne: 300,
    operatorContact: '+91 97892 33412',
    websiteUrl: '',
    commodities: ['Onion', 'Garlic', 'Maize', 'Paddy', 'Pulses', 'Turmeric'],
    chambers: [
      'Silo Vault 1 - Steel Grain Silo (4000 MT)',
      'Chamber 2 - Ventilated Bulb Storage (Onion/Garlic)',
      'Chamber 3 - General Commodity Cell'
    ],
    isUserSubmitted: false,
    verificationStatus: 'verified',
    hasPendingReview: false,
  },
  {
    id: 'wh_coimbatore_03',
    name: 'Coimbatore Agri Cold Chain Vault',
    code: 'WH-CBE-309',
    wdraCode: 'WDRA/2025/TN-2204',
    wdraRegNo: 'WDRA/2025/TN-2204',
    location: 'Coimbatore, Tamil Nadu',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    address: 'SF 210, Pollachi Main Road, Kinathukadavu, Coimbatore - 642109',
    type: 'WDRA Accredited Controlled Atmosphere Cold Chain',
    facilityType: 'WDRA Accredited Controlled Cold Chain',
    capacity: '6,000 MT',
    totalCapacityTonnes: 6000,
    occupiedTonnes: 2100,
    occupancyPct: 35,
    occupancyPercent: 35,
    temperatureRange: '0°C to 8°C',
    humidityRange: '90% to 95% RH',
    monthlyRatePerKg: 0.38,
    monthlyRatePerTonne: 380,
    operatorContact: '+91 94431 55678',
    websiteUrl: '',
    commodities: ['Vegetables', 'Fruits', 'Ginger', 'Turmeric', 'Coconut', 'Spices'],
    chambers: [
      'Cold Chamber 1 - Fresh Fruits & Vegetables (0°C - 4°C)',
      'Cold Chamber 2 - Spices & Roots (8°C - 12°C)',
      'Chamber 3 - Controlled Atmosphere Storage'
    ],
    isUserSubmitted: false,
    verificationStatus: 'verified',
    hasPendingReview: false,
  }
];

/**
 * Get all available active warehouses directly from Supabase PostgreSQL database
 * (with baseline accredited facilities).
 */
export async function getWarehouses() {
  const activeWarehouses = [...DEMO_WAREHOUSES];

  // 1. Fetch live from Supabase PostgreSQL 'profiles' table
  try {
    const { data: dbProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'warehouse');

    if (!error && Array.isArray(dbProfiles) && dbProfiles.length > 0) {
      dbProfiles.forEach((p) => {
        const meta = p.meta || {};
        const isVerified = p.kyc_status === 'verified' || meta.verificationStatus === 'verified';

        if (isVerified) {
          const approvedCapacity = Number(meta.totalCapacityTonnes || p.totalCapacityTonnes || 2000);
          const baseRate = Number(meta.monthlyRatePerTonne || p.monthlyRatePerTonne || 350);

          const existingIdx = activeWarehouses.findIndex(
            (w) => w.id === p.id || (p.email && w.operatorContact?.includes(p.phone)) || w.name?.toLowerCase() === (p.company_name || meta.companyName || p.name || '').toLowerCase()
          );

          const chambersToUse = (Array.isArray(meta.storageTypes) && meta.storageTypes.length > 0)
            ? meta.storageTypes
            : ['Chamber A1 (Multi-Commodity)'];

          const formattedChambers = Array.isArray(chambersToUse) && chambersToUse.length > 0 && typeof chambersToUse[0] === 'object'
            ? chambersToUse.map((st) => `${st.name} (${st.capacity}T - ${st.temp || 'Controlled'})`)
            : chambersToUse;

          const dynamicWh = {
            id: p.id || `wh_${Date.now()}`,
            name: p.company_name || meta.companyName || p.name || 'Agri Storage Hub',
            code: `WH-${(p.district || 'TN').slice(0, 3).toUpperCase()}-${(p.id || '101').slice(0, 4).toUpperCase()}`,
            wdraCode: meta.wdraCode || 'WDRA/2025/VERIFIED',
            wdraRegNo: meta.wdraCode || 'WDRA/2025/VERIFIED',
            location: p.district && p.state ? `${p.district}, ${p.state}` : (p.district || p.state || 'Tamil Nadu'),
            district: p.district || 'Salem',
            state: p.state || 'Tamil Nadu',
            address: p.address ? `${p.address}${p.district ? `, ${p.district}` : ''}` : (p.district || 'Tamil Nadu'),
            type: 'WDRA Accredited Agri Storage',
            facilityType: 'WDRA Accredited Agri Storage',
            capacity: `${approvedCapacity.toLocaleString('en-IN')} MT`,
            totalCapacityTonnes: approvedCapacity,
            occupiedTonnes: 0,
            occupancyPct: 0,
            occupancyPercent: 0,
            temperatureRange: (typeof chambersToUse[0] === 'object' && chambersToUse[0]?.temp) || '2°C to 12°C',
            humidityRange: '85% to 95% RH',
            monthlyRatePerKg: Number((baseRate / 1000).toFixed(2)),
            monthlyRatePerTonne: baseRate,
            chamberRates: meta.chamberRates || {},
            operatorContact: p.phone || meta.phone || '+91 98421 88901',
            websiteUrl: meta.websiteUrl || '',
            commodities: ['Tomato', 'Potato', 'Onion', 'Turmeric', 'Grains', 'Pulses'],
            chambers: formattedChambers,
            isUserSubmitted: true,
            verificationStatus: 'verified',
            hasPendingReview: Boolean(meta.hasPendingReview),
          };

          if (existingIdx >= 0) {
            activeWarehouses[existingIdx] = { ...activeWarehouses[existingIdx], ...dynamicWh };
          } else {
            activeWarehouses.push(dynamicWh);
          }
        }
      });
    }
  } catch (err) {
    console.warn('Supabase getWarehouses direct query notice:', err);
  }

  // 2. Also check local profiles cache for offline/instant resilience
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};

    Object.values(profiles).forEach((p) => {
      const isVerified = p && (p.verificationStatus === 'verified' || p.kycStatus === 'verified') && Number(p.totalCapacityTonnes) > 0;

      if (isVerified) {
        const approvedCapacity = Number(p.totalCapacityTonnes) || 2000;
        const baseRate = Number(p.monthlyRatePerTonne || 350);

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
          location: p.district && p.state ? `${p.district}, ${p.state}` : (p.district || p.state || 'Tamil Nadu'),
          district: p.district || 'Salem',
          state: p.state || 'Tamil Nadu',
          address: p.address ? `${p.address}${p.district ? `, ${p.district}` : ''}${p.pincode ? ` - ${p.pincode}` : ''}` : (p.district || 'Tamil Nadu'),
          type: 'WDRA Accredited Agri Storage',
          facilityType: 'WDRA Accredited Agri Storage',
          capacity: `${approvedCapacity.toLocaleString('en-IN')} MT`,
          totalCapacityTonnes: approvedCapacity,
          occupiedTonnes: 0,
          occupancyPct: 0,
          occupancyPercent: 0,
          temperatureRange: (typeof chambersToUse[0] === 'object' && chambersToUse[0]?.temp) || '2°C to 12°C',
          humidityRange: '85% to 95% RH',
          monthlyRatePerKg: Number((baseRate / 1000).toFixed(2)),
          monthlyRatePerTonne: baseRate,
          chamberRates: p.chamberRates || {},
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
    console.warn('Error compiling dynamic warehouse list from profiles:', err);
  }

  return activeWarehouses;
}

export function getWarehousesSync() {
  const active = [...DEMO_WAREHOUSES];
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    Object.values(profiles).forEach((p) => {
      if (p && (p.verificationStatus === 'verified' || p.kycStatus === 'verified')) {
        const existingIdx = active.findIndex((w) => w.id === p.userId || w.id === p.id);
        if (existingIdx >= 0) {
          active[existingIdx] = { ...active[existingIdx], ...p };
        } else {
          active.push(p);
        }
      }
    });
  } catch {}
  return active;
}

export function getWarehouseById(id, warehouseList = null) {
  const all = warehouseList || getWarehousesSync();
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
  if (!warehouseId) return [];
  return all.filter((r) => r.warehouseId === warehouseId);
}

const WAREHOUSE_PROFILES_KEY = 'agrolnk_warehouse_profiles';

/**
 * Get warehouse profile for a specific user/operator (sync from local storage)
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
 * Get warehouse operator profile from Supabase Database (with local cache fallback)
 */
export async function getWarehouseOperatorProfile(userIdOrEmail) {
  if (!userIdOrEmail) return null;

  try {
    const rawTarget = String(userIdOrEmail).trim();
    let query = supabase.from('profiles').select('*');
    if (rawTarget.includes('@')) {
      query = query.ilike('email', rawTarget);
    } else {
      query = query.eq('id', rawTarget);
    }
    let { data: profile, error } = await query.maybeSingle();

    if (!profile && !rawTarget.includes('@')) {
      // Try by email in case userId was actually an email or vice versa
      const { data: byEmail } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', rawTarget)
        .maybeSingle();
      if (byEmail) profile = byEmail;
    }

    if (!error && profile) {
      const meta = profile.meta || {};
      if (meta.setupCompleted || meta.totalCapacityTonnes || profile.company_name || profile.address) {
        const mapped = {
          userId: profile.id,
          id: profile.id,
          email: profile.email,
          phone: profile.phone || meta.phone || '',
          role: profile.role || 'warehouse',
          operatorName: profile.name,
          companyName: profile.company_name || meta.companyName || meta.warehouseName || '',
          warehouseName: profile.company_name || meta.warehouseName || meta.companyName || '',
          state: profile.state || meta.state || 'Tamil Nadu',
          district: profile.district || meta.district || 'Salem',
          address: profile.address || meta.address || '',
          pincode: profile.pincode || meta.pincode || '',
          monthlyRatePerTonne: Number(meta.monthlyRatePerTonne || 350),
          monthlyRatePerKg: Number(meta.monthlyRatePerKg || 0.35),
          chamberRates: meta.chamberRates || {},
          verificationStatus: profile.kyc_status || meta.verificationStatus || 'pending',
          setupCompleted: Boolean(meta.setupCompleted || meta.totalCapacityTonnes || profile.company_name),
          ...meta,
        };

        // Cache locally for instant access
        try {
          const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
          const profiles = raw ? JSON.parse(raw) : {};
          if (profile.id) profiles[profile.id] = mapped;
          if (profile.email) profiles[profile.email] = mapped;
          localStorage.setItem(WAREHOUSE_PROFILES_KEY, JSON.stringify(profiles));
        } catch {}

        return mapped;
      }
    }
  } catch (err) {
    console.warn('Supabase getWarehouseOperatorProfile fetch notice:', err);
  }

  // 2. Fallback to local storage
  const localProfile = getWarehouseProfile(userIdOrEmail);
  if (localProfile) {
    return { ...localProfile, role: localProfile.role || 'warehouse' };
  }
  return null;
}

/**
 * Save or update warehouse profile:
 * - Operational fields (websiteUrl, phone, monthlyRatePerTonne, chamberRates) reflect immediately.
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

    const baseRate = Number(profileData.monthlyRatePerTonne || existing.monthlyRatePerTonne || 350);
    const kgRate = Number((baseRate / 1000).toFixed(2));
    const chamberRates = profileData.chamberRates || existing.chamberRates || {};

    let updated;

    if (protectedFieldsChanged) {
      // Keep live approved profile active, but record pending modification for Admin Review
      updated = {
        ...existing,
        role: existing.role || profileData.role || 'warehouse',
        // Operational fields update immediately
        websiteUrl: profileData.websiteUrl || existing.websiteUrl,
        phone: profileData.phone || existing.phone,
        monthlyRatePerTonne: baseRate,
        monthlyRatePerKg: kgRate,
        chamberRates,
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
        role: profileData.role || existing.role || 'warehouse',
        monthlyRatePerTonne: baseRate,
        monthlyRatePerKg: kgRate,
        chamberRates,
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

    // 1. Persist to Supabase Database 'profiles' table with full meta JSONB
    try {
      const dbPayload = {
        company_name: updated.companyName || updated.warehouseName,
        state: updated.state || 'Tamil Nadu',
        district: updated.district || 'Salem',
        address: updated.address || '',
        pincode: updated.pincode || '',
        kyc_status: updated.verificationStatus === 'verified' ? 'verified' : 'pending',
        meta: {
          totalCapacityTonnes: updated.totalCapacityTonnes,
          storageTypes: updated.storageTypes,
          storageTypesConfig: updated.storageTypesConfig,
          wdraCode: updated.wdraCode,
          gstin: updated.gstin,
          websiteUrl: updated.websiteUrl,
          documentNames: updated.documentNames,
          documentUrls: updated.documentUrls,
          monthlyRatePerTonne: updated.monthlyRatePerTonne,
          monthlyRatePerKg: updated.monthlyRatePerKg,
          chamberRates: updated.chamberRates,
          setupCompleted: true,
          verificationStatus: updated.verificationStatus,
          hasPendingReview: updated.hasPendingReview,
          pendingChanges: updated.pendingChanges,
        },
        updated_at: new Date().toISOString(),
      };

      if (userId) {
        const { error: idErr } = await supabase
          .from('profiles')
          .update(dbPayload)
          .eq('id', userId);

        if (idErr && profileData.email) {
          await supabase
            .from('profiles')
            .update(dbPayload)
            .ilike('email', profileData.email.trim());
        }
      } else if (profileData.email) {
        await supabase
          .from('profiles')
          .update(dbPayload)
          .ilike('email', profileData.email.trim());
      }
    } catch (dbErr) {
      console.warn('Supabase profile database update notice:', dbErr);
    }

    try {
      window.dispatchEvent(new CustomEvent('agrolnk_user_profile_updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('agrolnk_kyc_updated', { detail: updated }));
    } catch {}

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

