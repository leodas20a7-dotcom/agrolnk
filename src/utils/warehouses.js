// Agrolnk Prototype Warehouse & Inventory Engine (LocalStorage)
// Manages Certified Warehouses & Electronic Negotiable Warehouse Receipts (e-NWR)

import { createListing } from './listings';
import { createAuction } from './auctions';

const WAREHOUSES_STORAGE_KEY = 'agrolnkWarehouses';
const INVENTORY_STORAGE_KEY = 'agrolnkInventory';

// Certified WDRA & Agrolnk Hubs
const DEFAULT_DEMO_WAREHOUSES = [
  {
    id: 'wh_salem_01',
    name: 'Salem Agri Cold Storage Hub',
    state: 'Tamil Nadu',
    district: 'Salem',
    address: 'Omalur Highway, NH-44, Salem, Tamil Nadu 636011',
    wdraCode: 'WDRA-TN-SLM-008',
    facilityType: 'Multi-Chamber Cold Storage (2°C - 8°C)',
    totalCapacityTonnes: 5000,
    occupiedTonnes: 3700,
    occupancyPercent: 74,
    monthlyRatePerTonne: 450,
    operatorName: 'Salem Cold Logistics Ltd.',
    operatorContact: '+91 98940 33221',
    chambers: ['Chamber A1 (Dry)', 'Chamber B2 (Cold 4°C)', 'Chamber B4 (Cold 2°C)', 'Chamber C1 (CA)'],
  },
  {
    id: 'wh_nashik_02',
    name: 'Nashik Onion & Agro Terminal',
    state: 'Maharashtra',
    district: 'Nashik',
    address: 'Lasalgaon APMC Logistics Zone, Nashik, Maharashtra 422306',
    wdraCode: 'WDRA-MH-NSK-019',
    facilityType: 'Controlled Atmosphere (CA) & Ventilated Silos',
    totalCapacityTonnes: 12000,
    occupiedTonnes: 8160,
    occupancyPercent: 68,
    monthlyRatePerTonne: 380,
    operatorName: 'Sahyadri Agri Warehousing Corp',
    operatorContact: '+91 98220 54321',
    chambers: ['Ventilated Bay 1', 'Ventilated Bay 2', 'Cold Cell 1', 'Dry Godown A'],
  },
  {
    id: 'wh_dindigul_03',
    name: 'Dindigul Central Silo Complex',
    state: 'Tamil Nadu',
    district: 'Dindigul',
    address: 'Batalagundu Main Road, Dindigul, Tamil Nadu 624001',
    wdraCode: 'WDRA-TN-DGL-004',
    facilityType: 'Hermetic Grain & Seed Vaults',
    totalCapacityTonnes: 8000,
    occupiedTonnes: 6560,
    occupancyPercent: 82,
    monthlyRatePerTonne: 320,
    operatorName: 'Tamil Nadu State Warehousing Corp',
    operatorContact: '+91 94441 88990',
    chambers: ['Silo A (Wheat/Grains)', 'Silo B (Seed Lots)', 'Cold Bay 3'],
  },
  {
    id: 'wh_kota_04',
    name: 'Kota Grain & Pulses Terminal',
    state: 'Rajasthan',
    district: 'Kota',
    address: 'Anantpura Industrial Area, Kota, Rajasthan 324005',
    wdraCode: 'WDRA-RJ-KOT-012',
    facilityType: 'Modern Steel Silos & Bulk Elevators',
    totalCapacityTonnes: 15000,
    occupiedTonnes: 8250,
    occupancyPercent: 55,
    monthlyRatePerTonne: 290,
    operatorName: 'Chambal Agri Logistics Pvt Ltd',
    operatorContact: '+91 97840 11223',
    chambers: ['Silo 101', 'Silo 102', 'Bulk Vault C'],
  },
];

// Pre-seeded e-NWR Digital Inventory Receipts
const DEFAULT_DEMO_INVENTORY = [
  {
    id: 'inv_demo_1024',
    receiptNumber: '#eNWR-1024',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    warehouseId: 'wh_salem_01',
    warehouseName: 'Salem Agri Cold Storage Hub',
    chamber: 'Chamber B4 (Cold 4°C)',
    commodity: 'Tomato',
    variety: 'Hybrid Shivam',
    grade: 'A',
    totalQuantity: 2000,
    availableQuantity: 1500,
    lockedQuantity: 500,
    unit: 'kg',
    assayedQuality: {
      moisture: '88.5%',
      purity: '99.4%',
      damage: '< 0.5%',
      brixLevel: '5.2° Bx',
      assayStatus: 'NABL Certified Grade A',
    },
    storageFeeMonthly: 450,
    estimatedValue: 84000,
    depositedAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    validUntil: new Date(Date.now() + 3600000 * 24 * 50).toISOString(),
    status: 'partially_listed', // 'stored' | 'partially_listed' | 'listed' | 'released'
    financingEligible: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
  },
  {
    id: 'inv_demo_1025',
    receiptNumber: '#eNWR-1025',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    warehouseId: 'wh_salem_01',
    warehouseName: 'Salem Agri Cold Storage Hub',
    chamber: 'Chamber A1 (Dry)',
    commodity: 'Turmeric',
    variety: 'Salem Finger',
    grade: 'A',
    totalQuantity: 1000,
    availableQuantity: 1000,
    lockedQuantity: 0,
    unit: 'kg',
    assayedQuality: {
      curcumin: '3.9%',
      moisture: '9.2%',
      purity: '99.8%',
      damage: '0%',
      assayStatus: 'NABL Export Grade Certified',
    },
    storageFeeMonthly: 320,
    estimatedValue: 140000,
    depositedAt: new Date(Date.now() - 3600000 * 24 * 18).toISOString(),
    validUntil: new Date(Date.now() + 3600000 * 24 * 160).toISOString(),
    status: 'stored',
    financingEligible: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 18).toISOString(),
  },
  {
    id: 'inv_demo_1026',
    receiptNumber: '#eNWR-1026',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    warehouseId: 'wh_dindigul_03',
    warehouseName: 'Dindigul Central Silo Complex',
    chamber: 'Silo A (Wheat/Grains)',
    commodity: 'Maize / Corn',
    variety: 'Pioneer Yellow',
    grade: 'A',
    totalQuantity: 5000,
    availableQuantity: 5000,
    lockedQuantity: 0,
    unit: 'kg',
    assayedQuality: {
      moisture: '12.0%',
      foreignMatter: '< 0.8%',
      aflatoxin: '< 5 ppb',
      assayStatus: 'NABL Certified Grade A',
    },
    storageFeeMonthly: 850,
    estimatedValue: 115000,
    depositedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    validUntil: new Date(Date.now() + 3600000 * 24 * 120).toISOString(),
    status: 'stored',
    financingEligible: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
];

/**
 * Get all certified warehouses
 */
export function getWarehouses() {
  try {
    const raw = localStorage.getItem(WAREHOUSES_STORAGE_KEY) || localStorage.getItem('agramazWarehouses');
    if (!raw) {
      localStorage.setItem(WAREHOUSES_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_WAREHOUSES));
      return DEFAULT_DEMO_WAREHOUSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_DEMO_WAREHOUSES;
  } catch {
    return DEFAULT_DEMO_WAREHOUSES;
  }
}

/**
 * Get warehouse by ID
 */
export function getWarehouseById(id) {
  const all = getWarehouses();
  return all.find((w) => w.id === id) || all[0];
}

/**
 * Get all e-NWR inventory records
 */
export function getInventory() {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY) || localStorage.getItem('agramazInventory');
    if (!raw) {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_INVENTORY));
      return DEFAULT_DEMO_INVENTORY;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_DEMO_INVENTORY;
  } catch {
    return DEFAULT_DEMO_INVENTORY;
  }
}

/**
 * Save inventory records
 */
function saveInventory(inventory) {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
  } catch (err) {
    console.error('Failed to save inventory to localStorage:', err);
  }
}

/**
 * Get inventory for a specific farmer
 */
export function getFarmerInventory(farmerId) {
  const all = getInventory();
  if (!farmerId) return all;
  return all.filter((i) => i.farmerId === farmerId || !i.farmerId);
}

/**
 * Get inventory stored at a specific warehouse
 */
export function getWarehouseInventory(warehouseId) {
  const all = getInventory();
  if (!warehouseId) return all;
  return all.filter((i) => i.warehouseId === warehouseId);
}

/**
 * Get inventory by ID or receipt number
 */
export function getInventoryById(idOrReceipt) {
  const all = getInventory();
  return all.find((i) => i.id === idOrReceipt || i.receiptNumber === idOrReceipt) || null;
}

/**
 * Deposit produce into warehouse -> issues e-NWR receipt
 */
export function depositProduceToWarehouse(depositData) {
  const inventory = getInventory();
  const warehouse = getWarehouseById(depositData.warehouseId);

  const generateReceiptNum = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#eNWR-${num}`;
  };

  const qty = Number(depositData.quantity) || 1000;
  const unitPriceEst = Number(depositData.priceEstimate) || 40;
  const estimatedVal = qty * unitPriceEst;

  const newReceipt = {
    id: `inv_${Date.now()}`,
    receiptNumber: generateReceiptNum(),
    farmerId: depositData.farmerId || 'usr_farmer_01',
    farmerName: depositData.farmerName || 'Sakthi Vel',
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    chamber: depositData.chamber || warehouse.chambers[0] || 'Cold Chamber B2',
    commodity: depositData.commodity || 'Tomato',
    variety: depositData.variety || 'Hybrid Shivam',
    grade: depositData.grade || 'A',
    totalQuantity: qty,
    availableQuantity: qty,
    lockedQuantity: 0,
    unit: depositData.unit || 'kg',
    assayedQuality: {
      moisture: depositData.moisture || '88.0%',
      purity: '99.3%',
      damage: '< 0.5%',
      assayStatus: 'NABL Certified Grade A',
    },
    storageFeeMonthly: Math.round((qty / 1000) * warehouse.monthlyRatePerTonne),
    estimatedValue: estimatedVal,
    depositedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 3600000 * 24 * (Number(depositData.storageDays) || 60)).toISOString(),
    status: 'stored',
    financingEligible: true,
    createdAt: new Date().toISOString(),
  };

  const updated = [newReceipt, ...inventory];
  saveInventory(updated);
  return newReceipt;
}

/**
 * 1-Click sell or auction produce directly from warehouse inventory
 */
export function listProduceFromInventory(inventoryId, tradeData) {
  const inventory = getInventory();
  const index = inventory.findIndex((i) => i.id === inventoryId || i.receiptNumber === inventoryId);
  if (index === -1) return null;

  const item = inventory[index];
  const listQty = Math.min(Number(tradeData.quantity) || item.availableQuantity, item.availableQuantity);

  // Update inventory available / locked quantities
  const newAvailable = item.availableQuantity - listQty;
  const newLocked = (item.lockedQuantity || 0) + listQty;
  const newStatus = newAvailable <= 0 ? 'listed' : 'partially_listed';

  inventory[index] = {
    ...item,
    availableQuantity: newAvailable,
    lockedQuantity: newLocked,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  saveInventory(inventory);

  // Create corresponding marketplace listing or auction with warehouse metadata
  if (tradeData.saleType === 'auction') {
    return createAuction({
      commodity: item.commodity,
      variety: item.variety,
      grade: item.grade,
      quantity: listQty,
      unit: item.unit,
      startingPrice: Number(tradeData.pricePerUnit),
      reservePrice: Number(tradeData.reservePrice || tradeData.pricePerUnit * 1.1),
      state: item.warehouseName.includes('Tamil') ? 'Tamil Nadu' : 'Maharashtra',
      district: item.warehouseName.includes('Salem') ? 'Salem' : 'Nashik',
      isWarehouseStored: true,
      warehouseReceiptNumber: item.receiptNumber,
      warehouseName: item.warehouseName,
    });
  } else {
    return createListing({
      commodity: item.commodity,
      variety: item.variety,
      grade: item.grade,
      quantity: listQty,
      unit: item.unit,
      pricePerUnit: Number(tradeData.pricePerUnit),
      totalAmount: listQty * Number(tradeData.pricePerUnit),
      state: item.warehouseName.includes('Tamil') ? 'Tamil Nadu' : 'Maharashtra',
      district: item.warehouseName.includes('Salem') ? 'Salem' : 'Nashik',
      saleType: 'direct',
      isWarehouseStored: true,
      warehouseReceiptNumber: item.receiptNumber,
      warehouseName: item.warehouseName,
    });
  }
}

/**
 * Process warehouse release order (produce picked up or transferred)
 */
export function releaseWarehouseInventory(inventoryId, releaseQty) {
  const inventory = getInventory();
  const index = inventory.findIndex((i) => i.id === inventoryId || i.receiptNumber === inventoryId);
  if (index === -1) return null;

  const item = inventory[index];
  const qty = Number(releaseQty) || item.lockedQuantity || item.totalQuantity;

  inventory[index] = {
    ...item,
    totalQuantity: Math.max(0, item.totalQuantity - qty),
    lockedQuantity: Math.max(0, (item.lockedQuantity || 0) - qty),
    status: item.totalQuantity - qty <= 0 ? 'released' : item.status,
    releasedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveInventory(inventory);
  return inventory[index];
}

/**
 * Compute aggregate statistics for Warehouse Operator Dashboard
 */
export function getWarehouseOperatorStats(warehouseId) {
  const warehouse = getWarehouseById(warehouseId || 'wh_salem_01');
  const inventory = getWarehouseInventory(warehouse.id);

  const totalStoredKg = inventory.reduce((sum, i) => sum + (Number(i.totalQuantity) || 0), 3700000);
  const totalValuation = inventory.reduce((sum, i) => sum + (Number(i.estimatedValue) || 0), 145000000);
  const activeReceipts = inventory.filter((i) => i.status !== 'released').length + 42;
  const releaseOrders = 14;

  return {
    warehouse,
    totalCapacityTonnes: warehouse.totalCapacityTonnes,
    occupiedTonnes: (totalStoredKg / 1000).toFixed(0),
    occupancyPercent: warehouse.occupancyPercent,
    activeReceipts,
    releaseOrders,
    totalValuation: `₹${(totalValuation / 10000000).toFixed(2)} Cr`,
  };
}
