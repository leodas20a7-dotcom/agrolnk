// Agrolnk Supabase Warehouse & e-NWR Engine (100% Pure Database CRUD)
import { supabase } from '../lib/supabase';

/**
 * Maps PostgreSQL snake_case database row to camelCase frontend receipt object
 */
export function mapReceiptFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    farmerPhone: row.farmer_phone || '',
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouse_name,
    chamber: row.chamber,
    commodity: row.commodity,
    variety: row.variety,
    grade: row.grade,
    totalQuantity: Number(row.total_quantity || 0),
    availableQuantity: Number(row.available_quantity ?? row.total_quantity ?? 0),
    lockedQuantity: Number(row.locked_quantity || 0),
    unit: row.unit || 'kg',
    estimatedValue: Number(row.estimated_value || 0),
    storageFeeMonthly: Number(row.storage_fee_monthly || 0),
    quotedMonthlyRent: Number(row.storage_fee_monthly || 0),
    quotedRatePerTonne: Number(row.quoted_rate_per_tonne || (row.storage_fee_monthly && row.total_quantity ? Math.round((Number(row.storage_fee_monthly) / (Number(row.total_quantity) / 1000))) : 350)),
    assayedQuality: (row.assayed_quality && typeof row.assayed_quality === 'object') ? row.assayed_quality : {},
    depositedAt: row.deposited_at,
    lastRentPaidAt: row.last_rent_paid_at,
    validUntil: row.valid_until,
    status: row.status || 'quote_requested',
    paymentMode: row.payment_mode || 'auto_deduct',
    initialPaymentStatus: row.initial_payment_status || 'pending',
    initialPaymentAmount: Number(row.initial_payment_amount || 0),
    rentPaymentHistory: Array.isArray(row.rent_payment_history) ? row.rent_payment_history : [],
    warehouseNotes: row.warehouse_notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Clean and format timestamp for PostgreSQL syntax compliance
 */
export function cleanTimestamp(val) {
  if (!val || val === '' || val === 'null' || val === 'undefined') return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

/**
 * Fetch all warehouse receipts directly from Supabase PostgreSQL database
 */
export async function getWarehouseReceipts() {
  try {
    const { data, error } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch warehouse receipts from Supabase:', error);
      return [];
    }

    return (data || []).map(mapReceiptFromDb).filter(Boolean);
  } catch (err) {
    console.error('getWarehouseReceipts error:', err);
    return [];
  }
}

/**
 * Universal warehouse matcher (Strict Multi-Tenant Isolation)
 * Matches by exact warehouse ID, user/profile UUID, operator email, WDRA code, or exact facility name.
 * Prevents generic chamber collision or cross-tenant data leakage.
 */
export function isWarehouseMatch(r, userOrId, profile = null) {
  if (!r) return false;
  if (!userOrId && !profile) return false;

  const u = typeof userOrId === 'object' ? userOrId : { id: userOrId };
  const targetId = String(u?.id || (typeof userOrId === 'string' && !userOrId.includes('@') ? userOrId : '') || '').trim();
  const pId = String(profile?.id || profile?.userId || profile?.warehouseId || '').trim();
  const targetEmail = String(u?.email || profile?.email || profile?.operatorEmail || (typeof userOrId === 'string' && userOrId.includes('@') ? userOrId : '') || '').toLowerCase().trim();
  const targetName = String(profile?.companyName || profile?.company_name || profile?.warehouseName || profile?.facilityName || u?.companyName || u?.warehouseName || '').toLowerCase().trim();
  const targetWdra = String(profile?.wdraCode || profile?.wdraRegNo || u?.wdraCode || u?.wdraRegNo || '').toLowerCase().trim();

  const rWarehouseId = String(r.warehouseId || r.warehouse_id || r.userId || r.operatorId || '').trim();
  const rWarehouseEmail = String(r.warehouseEmail || r.warehouse_email || r.operatorEmail || '').toLowerCase().trim();
  const rWarehouseName = String(r.warehouseName || r.warehouse_name || '').toLowerCase().trim();
  const rWdra = String(r.wdraCode || r.wdra_code || '').toLowerCase().trim();

  // 1. Primary & Most Secure: Exact warehouse ID / Profile UUID match
  if (rWarehouseId) {
    if (targetId && rWarehouseId === targetId) return true;
    if (pId && rWarehouseId === pId) return true;
  }

  // 2. Exact email match
  if (targetEmail && rWarehouseEmail && rWarehouseEmail === targetEmail) {
    return true;
  }

  // 3. Exact WDRA accreditation registration number match
  if (targetWdra && targetWdra.length > 3 && rWdra && rWdra === targetWdra) {
    return true;
  }

  // 4. Exact facility/company name match (Strict equality, never loose substring)
  if (targetName && targetName.length > 2 && rWarehouseName && rWarehouseName === targetName) {
    return true;
  }

  return false;
}

/**
 * Get warehouse inventory receipts for a farmer directly from database
 */
export async function getFarmerInventory(farmerId) {
  if (!farmerId) return [];
  try {
    const { data, error } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('farmer_id', String(farmerId))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching farmer inventory from database:', error);
      // Fallback to full fetch & filter
      const all = await getWarehouseReceipts();
      return all.filter((r) => r.farmerId === farmerId || r.depositorId === farmerId);
    }

    return (data || []).map(mapReceiptFromDb).filter(Boolean);
  } catch (err) {
    console.error('getFarmerInventory error:', err);
    return [];
  }
}

/**
 * Get all receipts for a specific warehouse operator from database (Strict Isolation)
 */
export async function getWarehouseInventory(userOrId, profile = null) {
  if (!userOrId && !profile) return [];

  const all = await getWarehouseReceipts();
  // Strictly filter by warehouse match - never return another warehouse's lots or requests
  return all.filter((r) => isWarehouseMatch(r, userOrId, profile));
}

/**
 * Get warehouse operator stats & receipts
 */
export async function getWarehouseOperatorStats(userOrId, profile = null) {
  try {
    const receipts = await getWarehouseInventory(userOrId, profile);
    const activeReceipts = receipts.filter((r) => r.status === 'stored' || r.status === 'partially_listed');
    const totalValuation = activeReceipts.reduce((sum, r) => sum + (r.estimatedValue || 0), 0);
    const totalStoredKg = activeReceipts.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
    const totalStoredTonnes = Number((totalStoredKg / 1000).toFixed(1));
    const capacityTonnes = profile?.totalCapacityTonnes ? Number(profile.totalCapacityTonnes) : 2000;
    const computedOccupancy = capacityTonnes > 0 ? Number(((totalStoredTonnes / capacityTonnes) * 100).toFixed(1)) : 0;

    const u = typeof userOrId === 'object' ? userOrId : { id: userOrId };
    return {
      activeReceipts: activeReceipts.length,
      totalValuation: `₹${(totalValuation / 100000).toFixed(2)} Lakh`,
      totalStoredKg,
      totalStoredTonnes,
      releaseOrders: 0,
      occupancyPercentage: computedOccupancy,
      warehouse: {
        id: u?.id || profile?.id || '',
        name: profile?.companyName || profile?.warehouseName || u?.companyName || u?.name || 'Agri Storage Hub',
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
 * Create a new e-NWR Warehouse Receipt (Pure Database Operation)
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

  const id = receiptData.id || generateId();
  const receiptNum = receiptData.receiptNumber || generateReceiptNum();
  const totalQty = Number(receiptData.quantity || receiptData.totalQuantity || 1000);
  const estValue = Number(receiptData.priceEstimate ? receiptData.priceEstimate * totalQty : (receiptData.estimatedValue || totalQty * 40));

  let ratePerTonne = Number(receiptData.monthlyRatePerTonne || 350);
  if (receiptData.warehouseId) {
    const wh = getWarehouseById(receiptData.warehouseId);
    if (wh) {
      ratePerTonne = Number(wh.monthlyRatePerTonne || 350);
      if (receiptData.chamber && wh.chamberRates && wh.chamberRates[receiptData.chamber]) {
        ratePerTonne = Number(wh.chamberRates[receiptData.chamber]);
      }
      if (wh.enableBulkDiscount && (totalQty / 1000) >= (Number(wh.bulkDiscountThreshold) || 50)) {
        const discountPct = Number(wh.bulkDiscountRate) || 10;
        ratePerTonne = Math.round(ratePerTonne * (1 - discountPct / 100));
      }
    }
  }

  const calculatedMonthlyFee = Number(
    receiptData.storageFeeMonthly || Math.round((totalQty / 1000) * ratePerTonne)
  );

  const initialStatus = receiptData.status || 'quote_requested';
  const now = new Date().toISOString();

  const dbRow = {
    id,
    receipt_number: receiptNum,
    farmer_id: String(receiptData.farmerId || ''),
    farmer_name: String(receiptData.farmerName || 'Depositor / Farmer'),
    farmer_phone: String(receiptData.farmerPhone || ''),
    warehouse_id: String(receiptData.warehouseId || ''),
    warehouse_name: String(receiptData.warehouseName || 'Agri Storage Facility'),
    chamber: String(receiptData.chamber || 'General Storage Chamber'),
    commodity: String(receiptData.commodity || 'Agri Produce'),
    variety: String(receiptData.variety || 'Standard'),
    grade: String(receiptData.grade || 'A'),
    total_quantity: totalQty,
    available_quantity: totalQty,
    locked_quantity: 0,
    unit: String(receiptData.unit || 'kg'),
    estimated_value: estValue,
    storage_fee_monthly: calculatedMonthlyFee,
    assayed_quality: (receiptData.assayedQuality && typeof receiptData.assayedQuality === 'object') ? receiptData.assayedQuality : {
      moisture: '12%',
      purity: '99%',
      grade: receiptData.grade || 'A',
      assayStatus: 'Pending Assayer Check',
    },
    deposited_at: now,
    last_rent_paid_at: now,
    valid_until: new Date(Date.now() + 3600000 * 24 * (Number(receiptData.storageDays) || 90)).toISOString(),
    status: initialStatus,
    warehouse_notes: String(receiptData.warehouseNotes || ''),
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('warehouse_receipts')
    .upsert([dbRow], { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Failed to create warehouse receipt in database:', error);
    throw error;
  }

  const mapped = mapReceiptFromDb(data || dbRow);

  // Trigger UI events
  try {
    window.dispatchEvent(new CustomEvent('agrolnk_warehouse_receipt_created', { detail: mapped }));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  return mapped;
}

export const requestDepositQuote = createWarehouseReceipt;
export const depositProduceToWarehouse = createWarehouseReceipt;
export const getInventory = getWarehouseReceipts;

/**
 * Delete a warehouse receipt / deposit lot permanently (Direct Database Operation)
 */
export async function deleteWarehouseReceipt(receiptId) {
  if (!receiptId) return false;
  try {
    const { error } = await supabase.from('warehouse_receipts').delete().eq('id', receiptId);
    if (error) {
      console.error('Failed to delete warehouse receipt from database:', error);
      return false;
    }
    try {
      window.dispatchEvent(new CustomEvent('agrolnk_warehouse_receipt_deleted', { detail: { id: receiptId } }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    return true;
  } catch (err) {
    console.error('Delete receipt error:', err);
    return false;
  }
}

/**
 * Warehouse Operator provides customized rent quote & assigns chamber (Direct Database Operation)
 */
export async function provideWarehouseQuote(receiptId, { quotedRatePerTonne, quotedMonthlyRent, chamber, notes }) {
  if (!receiptId) return null;
  try {
    const updatePayload = {
      status: 'quote_provided',
      updated_at: new Date().toISOString(),
    };
    if (quotedMonthlyRent !== undefined) updatePayload.storage_fee_monthly = Number(quotedMonthlyRent);
    if (chamber) updatePayload.chamber = chamber;
    if (notes) updatePayload.warehouse_notes = notes;

    const { data, error } = await supabase
      .from('warehouse_receipts')
      .update(updatePayload)
      .eq('id', receiptId)
      .select()
      .single();

    if (error) {
      console.error('Error in provideWarehouseQuote database update:', error);
      return null;
    }

    const mapped = mapReceiptFromDb(data);
    try {
      window.dispatchEvent(new CustomEvent('agrolnk_warehouse_quote_updated', { detail: mapped }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    return mapped;
  } catch (err) {
    console.error('provideWarehouseQuote error:', err);
    return null;
  }
}

/**
 * Farmer accepts warehouse quote & initiates goods transit (Direct Database Operation)
 * Supports selecting payment mode (Advance Online, Gate Inward, or Auto-Deduct)
 */
export async function acceptWarehouseQuote(receiptId, paymentDetails = {}) {
  if (!receiptId) return null;
  try {
    const isAdvancePaid = Boolean(paymentDetails.isPaid || paymentDetails.mode === 'online_advance');
    const now = new Date().toISOString();
    const mode = paymentDetails.mode || (isAdvancePaid ? 'online_advance' : 'auto_deduct');
    const amount = Number(paymentDetails.amount || 0);

    const updatePayload = {
      status: 'in_transit',
      payment_mode: mode,
      initial_payment_status: isAdvancePaid ? 'paid' : (mode === 'auto_deduct' ? 'escrow_lien' : 'pending'),
      initial_payment_amount: amount,
      updated_at: now,
    };

    if (isAdvancePaid) {
      updatePayload.last_rent_paid_at = now;
      updatePayload.valid_until = new Date(Date.now() + 30 * 86400000).toISOString();
      const paymentRecord = {
        id: `rent_init_${Date.now()}`,
        receiptId,
        amount,
        type: '1st_month_advance',
        paymentMethod: paymentDetails.method || 'Razorpay / UPI Online',
        transactionRef: paymentDetails.transactionRef || `INIT-RENT-${Math.floor(100000 + Math.random() * 900000)}`,
        paidAt: now,
        extendedDays: 30,
        paidBy: paymentDetails.paidBy || 'Farmer Depositor',
      };
      updatePayload.rent_payment_history = [paymentRecord];
    }

    const { data, error } = await supabase
      .from('warehouse_receipts')
      .update(updatePayload)
      .eq('id', receiptId)
      .select()
      .single();

    if (error) {
      console.error('Error in acceptWarehouseQuote database update:', error);
      return null;
    }

    const mapped = mapReceiptFromDb(data);
    try {
      window.dispatchEvent(new CustomEvent('agrolnk_warehouse_quote_updated', { detail: mapped }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    return mapped;
  } catch (err) {
    console.error('acceptWarehouseQuote error:', err);
    return null;
  }
}

/**
 * Record warehouse payment for storage dues via Razorpay Gateway
 */
export async function recordWarehouseRentPayment(receiptId, paymentDetails = {}) {
  if (!receiptId) return { success: false };
  try {
    const { data: receipt, error: fetchErr } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    if (fetchErr || !receipt) {
      console.error('Receipt not found for recordWarehouseRentPayment:', fetchErr);
      return { success: false };
    }

    const extendedDays = Number(paymentDetails.extendedDays || 30);
    const paidAt = new Date().toISOString();
    const prevValid = receipt.valid_until ? new Date(receipt.valid_until) : new Date();
    const safePrevValid = isNaN(prevValid.getTime()) ? new Date() : prevValid;
    const newValidUntil = new Date(Math.max(Date.now(), safePrevValid.getTime()) + (extendedDays * 86400000)).toISOString();

    const paymentRecord = {
      id: `rent_rec_${Date.now()}`,
      receiptId,
      amount: Number(paymentDetails.amount || receipt.storage_fee_monthly || 0),
      paymentMethod: paymentDetails.method || 'Razorpay Gateway',
      transactionRef: paymentDetails.transactionRef || `WH-RCPT-${Math.floor(100000 + Math.random() * 900000)}`,
      paidAt,
      extendedDays,
      paidBy: paymentDetails.paidBy || receipt.farmer_name || 'Farmer Depositor',
      notes: paymentDetails.notes || 'Razorpay online settlement',
    };

    const existingHistory = Array.isArray(receipt.rent_payment_history) ? receipt.rent_payment_history : [];

    const { data: updated, error: updateErr } = await supabase
      .from('warehouse_receipts')
      .update({
        last_rent_paid_at: paidAt,
        valid_until: newValidUntil,
        initial_payment_status: 'paid',
        rent_payment_history: [paymentRecord, ...existingHistory],
        updated_at: paidAt,
      })
      .eq('id', receiptId)
      .select()
      .single();

    if (updateErr) {
      console.error('Error recording warehouse payment in database:', updateErr);
      return { success: false };
    }

    const mapped = mapReceiptFromDb(updated);
    try {
      window.dispatchEvent(new CustomEvent('agrolnk_warehouse_receipt_stored', { detail: mapped }));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    return { success: true, receipt: mapped, payment: paymentRecord };
  } catch (err) {
    console.error('recordWarehouseRentPayment error:', err);
    return { success: false };
  }
}

/**
 * Farmer declines quote or cancels request (Direct Database Operation)
 */
export async function declineWarehouseQuote(receiptId, reason = 'Quote declined by depositor') {
  if (!receiptId) return null;
  try {
    const { data, error } = await supabase
      .from('warehouse_receipts')
      .update({
        status: 'rejected',
        warehouse_notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId)
      .select()
      .single();

    if (error) {
      console.error('Error in declineWarehouseQuote database update:', error);
      return null;
    }

    const mapped = mapReceiptFromDb(data);
    try {
      window.dispatchEvent(new CustomEvent('agrolnk_warehouse_quote_updated', { detail: mapped }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    return mapped;
  } catch (err) {
    console.error('declineWarehouseQuote error:', err);
    return null;
  }
}

/**
 * Warehouse confirms gate arrival, assayer check, and officially issues eNWR (Direct Database Operation)
 */
export async function confirmProduceInward(receiptId, { actualWeight, assayerGrade, moisture, chamberBay }) {
  if (!receiptId) return null;
  try {
    const now = new Date();
    const verifiedWeight = actualWeight ? Number(actualWeight) : undefined;
    const verifiedGrade = assayerGrade || 'A';
    const durationDays = 60;

    const updatePayload = {
      status: 'stored',
      grade: verifiedGrade,
      assayed_quality: {
        moisture: moisture ? `${moisture}%` : '11.8%',
        purity: '99.2%',
        grade: verifiedGrade,
        assayStatus: `WDRA Certified Grade ${verifiedGrade}`,
        assayedAt: now.toISOString(),
      },
      deposited_at: now.toISOString(),
      last_rent_paid_at: now.toISOString(),
      valid_until: new Date(now.getTime() + durationDays * 86400000).toISOString(),
      updated_at: now.toISOString(),
    };

    if (verifiedWeight !== undefined) {
      updatePayload.total_quantity = verifiedWeight;
      updatePayload.available_quantity = verifiedWeight;
    }
    if (chamberBay) {
      updatePayload.chamber = chamberBay;
    }

    const { data, error } = await supabase
      .from('warehouse_receipts')
      .update(updatePayload)
      .eq('id', receiptId)
      .select()
      .single();

    if (error) {
      console.error('Error confirming produce inward in database:', error);
      return null;
    }

    const mapped = mapReceiptFromDb(data);
    try {
      window.dispatchEvent(new CustomEvent('agrolnk_warehouse_receipt_stored', { detail: mapped }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    return mapped;
  } catch (err) {
    console.error('confirmProduceInward error:', err);
    return null;
  }
}

/**
 * List produce from inventory for direct marketplace sale (Direct Database Operation)
 */
export async function listProduceFromInventory(receiptId, listData) {
  if (!receiptId) return null;
  try {
    const { data: receipt, error: fetchErr } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    if (fetchErr || !receipt) {
      console.error('Receipt not found for listing:', fetchErr);
      return null;
    }

    const qtyToList = Number(listData.quantity || receipt.available_quantity);
    const newAvail = Math.max(0, Number(receipt.available_quantity || 0) - qtyToList);
    const newLocked = Number(receipt.locked_quantity || 0) + qtyToList;
    const newStatus = newAvail === 0 ? 'listed' : 'partially_listed';

    const { data: updated, error: updateErr } = await supabase
      .from('warehouse_receipts')
      .update({
        available_quantity: newAvail,
        locked_quantity: newLocked,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId)
      .select()
      .single();

    if (updateErr) {
      console.error('Error updating receipt for listing in database:', updateErr);
      return null;
    }

    return mapReceiptFromDb(updated);
  } catch (err) {
    console.error('listProduceFromInventory error:', err);
    return null;
  }
}

/**
 * Dispatch produce from warehouse upon sale or self-pickup (Direct Database Operation)
 */
export async function dispatchProduceFromWarehouse(receiptId, dispatchData = {}) {
  if (!receiptId) return null;
  try {
    const { data: receipt, error: fetchErr } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    if (fetchErr || !receipt) {
      console.error('Receipt not found for dispatch:', fetchErr);
      return null;
    }

    const qtyToDispatch = Number(dispatchData.quantity || receipt.locked_quantity || receipt.total_quantity);
    const updatedAvail = Math.max(0, Number(receipt.available_quantity || 0) - (dispatchData.fromAvailable ? qtyToDispatch : 0));
    const updatedLocked = Math.max(0, Number(receipt.locked_quantity || 0) - (!dispatchData.fromAvailable ? qtyToDispatch : 0));
    const isFullyCleared = updatedAvail + updatedLocked === 0;
    const targetStatus = isFullyCleared ? 'released' : (updatedAvail === 0 ? 'listed' : 'partially_listed');

    const { data: updated, error: updateErr } = await supabase
      .from('warehouse_receipts')
      .update({
        available_quantity: updatedAvail,
        locked_quantity: updatedLocked,
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId)
      .select()
      .single();

    if (updateErr) {
      console.error('Error updating receipt for dispatch in database:', updateErr);
      return null;
    }

    return mapReceiptFromDb(updated);
  } catch (err) {
    console.error('dispatchProduceFromWarehouse error:', err);
    return null;
  }
}

/**
 * Settle warehouse storage rental dues (Direct Database Operation)
 */
export async function payStorageRent(receiptId, paymentDetails = {}) {
  if (!receiptId) return { success: false };
  try {
    const { data: receipt, error: fetchErr } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    if (fetchErr || !receipt) {
      console.error('Receipt not found for payStorageRent:', fetchErr);
      return { success: false };
    }

    const extendedDays = Number(paymentDetails.extendedDays || 30);
    const paidAt = new Date().toISOString();
    const prevValid = receipt.valid_until ? new Date(receipt.valid_until) : new Date();
    const safePrevValid = isNaN(prevValid.getTime()) ? new Date() : prevValid;
    const newValidUntil = new Date(Math.max(Date.now(), safePrevValid.getTime()) + (extendedDays * 86400000)).toISOString();

    const { data: updated, error: updateErr } = await supabase
      .from('warehouse_receipts')
      .update({
        last_rent_paid_at: paidAt,
        valid_until: newValidUntil,
        updated_at: paidAt,
      })
      .eq('id', receiptId)
      .select()
      .single();

    if (updateErr) {
      console.error('Error updating rent in database:', updateErr);
      return { success: false };
    }

    const mapped = mapReceiptFromDb(updated);
    const paymentRecord = {
      id: `rent_pay_${Date.now()}`,
      receiptId,
      amount: Number(paymentDetails.amount || 0),
      paymentMethod: paymentDetails.method || 'UPI / Auto-Escrow',
      transactionRef: `RENT-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      paidAt,
      extendedDays,
      paidBy: paymentDetails.paidBy || 'Farmer Depositor',
    };

    return { success: true, receipt: mapped, payment: paymentRecord };
  } catch (err) {
    console.error('payStorageRent error:', err);
    return { success: false };
  }
}

/**
 * Calculate accrued storage rental dues and validity metrics for an e-NWR lot
 */
export function calculateStorageRentalDues(receipt) {
  const safeFallback = {
    monthlyRate: 700,
    dailyRate: 23,
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
    const monthlyRate = Number(receipt.storageFeeMonthly || receipt.quotedMonthlyRent || (totalQty > 0 ? Math.round((totalQty / 1000) * 350) : 700)) || 700;
    const dailyRate = Math.round(monthlyRate / 30) || 23;

    // Use monthly deadline status to determine if rent is actually due
    const deadline = calculateMonthlyRentDeadline(receipt);
    const isDue = deadline ? Boolean(deadline.isDue) : false;
    const amountDue = isDue ? (deadline.totalDue || monthlyRate) : 0;

    const now = new Date();
    let depositedDate = receipt.depositedAt ? new Date(receipt.depositedAt) : now;
    if (isNaN(depositedDate.getTime())) depositedDate = now;

    const daysStored = Math.max(0, Math.floor((now - depositedDate) / (1000 * 60 * 60 * 24)));

    // Expiry calculation
    let validUntilDate = receipt.validUntil ? new Date(receipt.validUntil) : new Date(depositedDate.getTime() + 90 * 86400000);
    if (isNaN(validUntilDate.getTime())) {
      validUntilDate = new Date(now.getTime() + 90 * 86400000);
    }

    const daysRemaining = Math.ceil((validUntilDate - now) / (1000 * 60 * 60 * 24));

    return {
      monthlyRate,
      dailyRate,
      daysStored,
      accruedDue: amountDue,
      amountDue: amountDue,
      isDue,
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
 * Get warehouse & storage notifications and alerts
 */
export function getWarehouseNotifications(userId, role = 'farmer', receiptsList = null) {
  const notifications = [];
  if (!userId) return [];

  const list = Array.isArray(receiptsList) ? receiptsList : [];

  list.forEach((r) => {
    if (!r) return;
    if (role === 'farmer' && r.farmerId && r.farmerId !== userId) return;
    if (role === 'warehouse' && r.warehouseId && r.warehouseId !== userId) return;

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
 * Simple Monthly Rent Deadline Tracker
 */
export function calculateMonthlyRentDeadline(receipt) {
  if (!receipt || receipt.status !== 'stored') return null;

  const now = new Date();
  let deposited = receipt.depositedAt ? new Date(receipt.depositedAt) : now;
  if (isNaN(deposited.getTime())) deposited = now;

  let lastPaid = receipt.lastRentPaidAt ? new Date(receipt.lastRentPaidAt) : deposited;
  if (isNaN(lastPaid.getTime())) lastPaid = deposited;

  const nextDueDate = new Date(lastPaid.getTime() + 30 * 86400000);
  const diffDays = Math.ceil((nextDueDate - now) / (1000 * 60 * 60 * 24));
  const monthlyAmount = Number(receipt.storageFeeMonthly) || Math.round((Number(receipt.totalQuantity || 0) / 1000) * 350);

  const dailyRate = Math.round(monthlyAmount / 30) || 12;

  if (diffDays > 5) {
    return {
      status: 'paid',
      label: `Paid • Next cycle in ${diffDays}d`,
      daysRemaining: diffDays,
      daysOverdue: 0,
      overduePenalty: 0,
      nextDueDate: nextDueDate.toISOString(),
      monthlyAmount,
      dailyRate,
      accruedDue: 0,
      totalDue: 0,
      isDue: false,
      paymentMode: receipt.paymentMode || 'auto_deduct',
      initialPaymentStatus: receipt.initialPaymentStatus || 'pending',
    };
  } else if (diffDays >= 0) {
    return {
      status: 'due_soon',
      label: diffDays === 0 ? 'Due Today' : `Due in ${diffDays}d`,
      daysRemaining: diffDays,
      daysOverdue: 0,
      overduePenalty: 0,
      nextDueDate: nextDueDate.toISOString(),
      monthlyAmount,
      dailyRate,
      accruedDue: monthlyAmount,
      totalDue: monthlyAmount,
      isDue: true,
      paymentMode: receipt.paymentMode || 'auto_deduct',
      initialPaymentStatus: receipt.initialPaymentStatus || 'pending',
    };
  } else {
    const overdueDays = Math.abs(diffDays);
    const overduePenalty = overdueDays > 5 ? Math.round(monthlyAmount * 0.05) : 0;
    return {
      status: 'overdue',
      label: `${overdueDays}d Overdue`,
      daysRemaining: 0,
      daysOverdue: overdueDays,
      overduePenalty,
      nextDueDate: nextDueDate.toISOString(),
      monthlyAmount,
      dailyRate,
      accruedDue: monthlyAmount,
      totalDue: monthlyAmount + overduePenalty,
      isDue: true,
      paymentMode: receipt.paymentMode || 'auto_deduct',
      initialPaymentStatus: receipt.initialPaymentStatus || 'pending',
    };
  }
}

export const DEMO_WAREHOUSES = [];
const WAREHOUSE_PROFILES_KEY = 'agrolnk_warehouse_profiles';

/**
 * Get all available active warehouses directly from Supabase PostgreSQL database
 */
export async function getWarehouses() {
  const activeWarehouses = [];

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
            minBillingDays: Number(meta.minBillingDays || p.minBillingDays || 0),
            handlingFeePerTonne: Number(meta.handlingFeePerTonne || p.handlingFeePerTonne || 0),
            enableBulkDiscount: Boolean(meta.enableBulkDiscount || p.enableBulkDiscount || false),
            bulkDiscountThreshold: Number(meta.bulkDiscountThreshold || p.bulkDiscountThreshold || 50),
            bulkDiscountRate: Number(meta.bulkDiscountRate || p.bulkDiscountRate || 10),
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

  return activeWarehouses;
}

export function getWarehousesSync() {
  const active = [];
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
  return all.find((w) => w.id === id) || null;
}

export function getWarehouseProfile(userId, userEmail) {
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    if (userId && profiles[userId]) return profiles[userId];
    if (userEmail && profiles[userEmail]) return profiles[userEmail];
    return null;
  } catch {
    return null;
  }
}

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
        const isVerified = profile.kyc_status === 'verified';
        const hasActivePendingChanges = Boolean(meta.pendingChanges && Object.keys(meta.pendingChanges).length > 0 && !isVerified);

        const mapped = {
          ...meta,
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
          kycStatus: profile.kyc_status || 'pending',
          verificationStatus: isVerified ? 'verified' : (profile.kyc_status || meta.verificationStatus || 'pending'),
          hasPendingReview: isVerified ? false : hasActivePendingChanges,
          setupCompleted: Boolean(meta.setupCompleted || meta.totalCapacityTonnes || profile.company_name),
        };

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

  const localProfile = getWarehouseProfile(userIdOrEmail);
  if (localProfile) {
    return { ...localProfile, role: localProfile.role || 'warehouse' };
  }
  return null;
}

export async function saveWarehouseProfile(userId, profileData) {
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    const existing = profiles[userId] || (profileData.email ? profiles[profileData.email] : null) || {};

    const isInitialSetup = !existing.setupCompleted;
    const isPreviouslyVerified = existing.verificationStatus === 'verified';

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
      updated = {
        ...existing,
        role: existing.role || profileData.role || 'warehouse',
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

    const docsToUse = protectedFieldsChanged ? (profileData.documentUrls || {}) : (updated.documentUrls || {});
    const namesToUse = protectedFieldsChanged ? (profileData.documentNames || {}) : (updated.documentNames || {});

    const docList = [];
    if (namesToUse.wdraCert || docsToUse.wdraCert) {
      docList.push({
        type: 'WDRA Accreditation Certificate',
        number: (protectedFieldsChanged ? profileData.wdraCode : updated.wdraCode) || 'WDRA Submitted',
        status: 'pending',
        fileUrl: docsToUse.wdraCert || '',
        fileName: namesToUse.wdraCert || '',
      });
    }

    if (namesToUse.gstinCert || docsToUse.gstinCert) {
      docList.push({
        type: 'GST / Commercial Storage License',
        number: (protectedFieldsChanged ? profileData.gstin : updated.gstin) || 'GST Submitted',
        status: 'pending',
        fileUrl: docsToUse.gstinCert || '',
        fileName: namesToUse.gstinCert || '',
      });
    }

    if (docsToUse.insuranceCert || namesToUse.insuranceCert) {
      docList.push({
        type: 'Storage Facility Insurance / FSSAI',
        number: 'Insured Facility',
        status: 'pending',
        fileUrl: docsToUse.insuranceCert || '',
        fileName: namesToUse.insuranceCert || '',
      });
    }

    updated.documents = docList;
    profiles[userId] = updated;
    if (profileData.email) profiles[profileData.email] = updated;
    localStorage.setItem(WAREHOUSE_PROFILES_KEY, JSON.stringify(profiles));

    // Persist to Supabase Database 'profiles' table
    try {
      let existingDbMeta = {};
      try {
        const { data: currentProf } = await supabase
          .from('profiles')
          .select('meta')
          .or(`id.eq.${userId || 'none'},email.eq.${profileData.email || 'none'}`)
          .maybeSingle();
        if (currentProf?.meta && typeof currentProf.meta === 'object') {
          existingDbMeta = currentProf.meta;
        }
      } catch {}

      const dbPayload = {
        company_name: updated.companyName || updated.warehouseName,
        state: updated.state || 'Tamil Nadu',
        district: updated.district || 'Salem',
        address: updated.address || '',
        pincode: updated.pincode || '',
        kyc_status: updated.verificationStatus === 'verified' ? 'verified' : 'pending',
        meta: {
          ...existingDbMeta,
          totalCapacityTonnes: updated.totalCapacityTonnes,
          storageTypes: updated.storageTypes,
          storageTypesConfig: updated.storageTypesConfig,
          wdraCode: updated.wdraCode,
          gstin: updated.gstin,
          websiteUrl: updated.websiteUrl,
          documentNames: updated.documentNames,
          documentUrls: updated.documentUrls,
          documents: docList,
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

    return updated;
  } catch (err) {
    console.error('Error saving warehouse profile:', err);
    throw err;
  }
}

export async function approveWarehouseProfileModification(userId) {
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    const p = profiles[userId] || (profiles && Object.values(profiles).find(item => item.email === userId || item.id === userId));
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

    if (userId) profiles[userId] = merged;
    if (merged.id) profiles[merged.id] = merged;
    if (merged.email) profiles[merged.email] = merged;
    localStorage.setItem(WAREHOUSE_PROFILES_KEY, JSON.stringify(profiles));

    // Sync to Supabase Database profiles table
    try {
      const targetId = merged.id || userId;
      const targetEmail = merged.email || '';
      let filter = targetId ? `id.eq.${targetId}` : '';
      if (targetEmail) {
        filter = filter ? `${filter},email.eq.${targetEmail}` : `email.eq.${targetEmail}`;
      }

      if (filter) {
        const { data: existingProf } = await supabase
          .from('profiles')
          .select('meta')
          .or(filter)
          .maybeSingle();

        const existingMeta = existingProf?.meta || {};
        await supabase
          .from('profiles')
          .update({
            kyc_status: 'verified',
            meta: {
              ...existingMeta,
              ...merged,
              verificationStatus: 'verified',
              hasPendingReview: false,
              pendingChanges: null,
            },
            updated_at: new Date().toISOString(),
          })
          .or(filter);
      }
    } catch (dbErr) {
      console.warn('Could not sync approved warehouse profile to Supabase:', dbErr);
    }

    try {
      window.dispatchEvent(new CustomEvent('agrolnk_warehouse_profile_updated', { detail: merged }));
      window.dispatchEvent(new CustomEvent('agrolnk_kyc_updated', { detail: merged }));
      window.dispatchEvent(new CustomEvent('agrolnk_user_profile_updated', { detail: merged }));
    } catch {}

    return merged;
  } catch (err) {
    console.error('Error approving warehouse profile modification:', err);
    return null;
  }
}

export async function rejectWarehouseProfileModification(userId, reason = 'Modification rejected by Compliance Board') {
  try {
    const raw = localStorage.getItem(WAREHOUSE_PROFILES_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    const p = profiles[userId] || (profiles && Object.values(profiles).find(item => item.email === userId || item.id === userId));
    if (!p) return null;

    const reverted = {
      ...p,
      pendingChanges: null,
      hasPendingReview: false,
      lastRejectionReason: reason,
      updatedAt: new Date().toISOString(),
    };

    if (userId) profiles[userId] = reverted;
    if (reverted.id) profiles[reverted.id] = reverted;
    if (reverted.email) profiles[reverted.email] = reverted;
    localStorage.setItem(WAREHOUSE_PROFILES_KEY, JSON.stringify(profiles));

    try {
      window.dispatchEvent(new CustomEvent('agrolnk_warehouse_profile_updated', { detail: reverted }));
      window.dispatchEvent(new CustomEvent('agrolnk_kyc_updated', { detail: reverted }));
      window.dispatchEvent(new CustomEvent('agrolnk_user_profile_updated', { detail: reverted }));
    } catch {}

    return reverted;
  } catch (err) {
    console.error('Error rejecting warehouse profile modification:', err);
    return null;
  }
}
