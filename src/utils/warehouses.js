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

/**
 * Get all warehouse receipts from Supabase
 */
export async function getWarehouseReceipts() {
  try {
    const { data, error } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch warehouse receipts:', error);
      return [];
    }

    return (data || []).map(mapReceiptFromDb);
  } catch (err) {
    console.error('Error in getWarehouseReceipts:', err);
    return [];
  }
}

/**
 * Get warehouse inventory receipts for a farmer
 */
export async function getFarmerInventory(farmerId) {
  try {
    if (!farmerId) return await getWarehouseReceipts();

    const { data, error } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch farmer receipts:', error);
      return [];
    }

    return (data || []).map(mapReceiptFromDb);
  } catch (err) {
    console.error('Error in getFarmerInventory:', err);
    return [];
  }
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
 * Create a new e-NWR Warehouse Receipt in Supabase
 */
export async function createWarehouseReceipt(receiptData) {
  try {
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

    const dbRow = {
      id: generateId(),
      receipt_number: generateReceiptNum(),
      farmer_id: receiptData.farmerId || null,
      farmer_name: receiptData.farmerName || 'Sakthi Vel',
      warehouse_id: receiptData.warehouseId || 'wh_salem_01',
      warehouse_name: receiptData.warehouseName || 'Salem Agri Cold Storage Hub',
      chamber: receiptData.chamber || 'Chamber A1 (Dry)',
      commodity: receiptData.commodity || 'Tomato',
      variety: receiptData.variety || 'Standard',
      grade: receiptData.grade || 'A',
      total_quantity: totalQty,
      available_quantity: totalQty,
      locked_quantity: 0,
      unit: receiptData.unit || 'kg',
      estimated_value: Number(receiptData.estimatedValue || totalQty * 40),
      storage_fee_monthly: Number(receiptData.storageFeeMonthly || 350),
      assayed_quality: receiptData.assayedQuality || {
        moisture: '12%',
        purity: '99%',
        grade: 'A',
        assayStatus: 'WDRA Certified Grade A',
      },
      deposited_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 3600000 * 24 * 90).toISOString(),
      status: 'stored',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('warehouse_receipts')
      .insert([dbRow])
      .select()
      .single();

    if (error) throw error;
    return mapReceiptFromDb(data);
  } catch (err) {
    console.error('Error creating warehouse receipt:', err);
    throw err;
  }
}

export const DEMO_WAREHOUSES = [
  {
    id: 'wh_salem_01',
    name: 'Salem Agri Cold Storage Hub',
    code: 'WH-TN-SLM-008',
    location: 'Salem, Tamil Nadu',
    address: 'Omalur Main Road, NH-44 Agri Corridor, Salem - 636004',
    type: 'WDRA Certified Cold Storage',
    wdraRegNo: 'WDRA/2024/TN/0892',
    capacity: '5,000 MT',
    occupancyPct: 74,
    temperatureRange: '2°C to 12°C',
    humidityRange: '85% to 95% RH',
    monthlyRatePerKg: 0.35,
    commodities: ['Tomato', 'Potato', 'Onion', 'Turmeric', 'Chilli', 'Mango', 'Apple'],
  },
  {
    id: 'wh_dindigul_02',
    name: 'Dindigul Central Agri Logistics Park',
    code: 'WH-TN-DGL-012',
    location: 'Dindigul, Tamil Nadu',
    address: 'Batlagundu Highway, Dindigul - 624002',
    type: 'NABARD Approved Modern Silo & Cold Cell',
    wdraRegNo: 'WDRA/2023/TN/0441',
    capacity: '8,000 MT',
    occupancyPct: 62,
    temperatureRange: '0°C to 15°C',
    humidityRange: '80% to 90% RH',
    monthlyRatePerKg: 0.30,
    commodities: ['Onion', 'Maize', 'Cotton', 'Rice', 'Wheat', 'Banana'],
  },
];

export function getWarehouses() {
  return DEMO_WAREHOUSES;
}

export function getWarehouseById(id) {
  return DEMO_WAREHOUSES.find((w) => w.id === id) || DEMO_WAREHOUSES[0];
}

export const getInventory = getWarehouseReceipts;
export const depositProduceToWarehouse = createWarehouseReceipt;

export async function listProduceFromInventory(receiptId, listData) {
  try {
    const { data: receipt, error: fetchErr } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (fetchErr || !receipt) throw new Error('Receipt not found');

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

    return receipt;
  } catch (err) {
    console.error('Error listing from inventory:', err);
    throw err;
  }
}

export async function getWarehouseInventory(warehouseId) {
  try {
    const { data, error } = await supabase
      .from('warehouse_receipts')
      .select('*')
      .eq('warehouse_id', warehouseId || 'wh_salem_01')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(mapReceiptFromDb);
  } catch {
    return [];
  }
}
