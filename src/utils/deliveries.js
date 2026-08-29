// Agrolnk Prototype Deliveries & Logistics Engine (LocalStorage)
// Lifecycle:
// TRANSPORT_REQUESTED -> ASSIGNED -> PICKED_UP -> IN_TRANSIT -> DELIVERED -> COMPLETED

import { updateOrderDeliveryStatus, updateOrderStatus, confirmOrderReceipt } from './orders';

const DELIVERIES_STORAGE_KEY = 'agrolnkDeliveries';

// Default pre-seeded demo deliveries
const DEFAULT_DEMO_DELIVERIES = [
  {
    id: 'dlv_demo_1024',
    deliveryNumber: '#DLV-1024',
    orderId: 'ord_demo_1024',
    orderNumber: '#AGM-1024',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    commodity: 'Tomato',
    variety: 'Hybrid Shivam',
    grade: 'A',
    quantity: 500,
    unit: 'kg',
    pickupLocation: {
      state: 'Tamil Nadu',
      district: 'Salem',
      address: 'Salem Farmgate Hub, Omalur Main Road',
    },
    deliveryLocation: {
      state: 'Tamil Nadu',
      district: 'Chennai',
      address: 'Koyambedu Wholesale Terminal, Bay 12',
    },
    preferredPickupDate: '28 Aug 2026',
    notes: 'Fragile ripe tomatoes, requires plastic crate stacking.',
    status: 'transport_requested', // 'transport_requested' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'completed'
    transporterId: null,
    transporterName: null,
    vehicleType: null,
    vehicleNumber: null,
    driverContact: null,
    assignedAt: null,
    pickedUpAt: null,
    inTransitAt: null,
    deliveredAt: null,
    confirmedAt: null,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'dlv_demo_1022',
    deliveryNumber: '#DLV-1022',
    orderId: 'ord_demo_1022',
    orderNumber: '#AGM-1022',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    commodity: 'Onion',
    variety: 'Nasik Red',
    grade: 'B',
    quantity: 500,
    unit: 'kg',
    pickupLocation: {
      state: 'Maharashtra',
      district: 'Nashik',
      address: 'Lasalgaon APMC Yard, Gate 3, Nashik',
    },
    deliveryLocation: {
      state: 'Tamil Nadu',
      district: 'Chennai',
      address: 'Koyambedu Cold Chain Facility, Chennai',
    },
    preferredPickupDate: '26 Aug 2026',
    notes: 'Moisture sensitive onion sacks.',
    status: 'in_transit',
    transporterId: 'usr_transporter_04',
    transporterName: 'Vetri Logistics & Transport',
    vehicleType: '14ft Eicher Truck (4 Tonne)',
    vehicleNumber: 'TN 28 AB 4092',
    driverContact: '+91 94433 77889 (Driver: Selvam)',
    assignedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    pickedUpAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    inTransitAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    deliveredAt: null,
    confirmedAt: null,
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
  {
    id: 'dlv_demo_1023',
    deliveryNumber: '#DLV-1023',
    orderId: 'ord_demo_1023',
    orderNumber: '#AGM-1023',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    commodity: 'Potato',
    variety: 'Kufri Jyoti',
    grade: 'A',
    quantity: 250,
    unit: 'kg',
    pickupLocation: {
      state: 'Tamil Nadu',
      district: 'Dindigul',
      address: 'Dindigul Central Market Depot',
    },
    deliveryLocation: {
      state: 'Tamil Nadu',
      district: 'Chennai',
      address: 'Ananya Agro Processing Unit, Guindy',
    },
    preferredPickupDate: '24 Aug 2026',
    notes: 'Jute bagged seed grade potatoes.',
    status: 'completed',
    transporterId: 'usr_transporter_04',
    transporterName: 'Vetri Logistics & Transport',
    vehicleType: 'Tata 407 (2.5 Tonne)',
    vehicleNumber: 'TN 57 C 8812',
    driverContact: '+91 98421 66543 (Driver: Kumar)',
    assignedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    pickedUpAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    inTransitAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    deliveredAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    confirmedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
  },
  {
    id: 'dlv_demo_2088',
    deliveryNumber: '#DLV-2088',
    orderId: 'ord_demo_2088',
    orderNumber: '#AGM-2088',
    farmerId: 'usr_farmer_01',
    farmerName: 'Salem Farmers Collective',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    commodity: 'Auction Lot: Hybrid Shivam Tomato',
    variety: 'Grade A Export',
    grade: 'A',
    quantity: 12000,
    unit: 'kg',
    pickupLocation: {
      state: 'Tamil Nadu',
      district: 'Salem',
      address: 'Salem APMC Yard & Cold Storage Block B',
    },
    deliveryLocation: {
      state: 'Tamil Nadu',
      district: 'Chennai',
      address: 'Ananya Agro Cold Terminal, Madhavaram',
    },
    preferredPickupDate: '29 Aug 2026',
    notes: 'Wholesale auction consignment. Requires ventilated multi-axle truck.',
    status: 'transport_requested',
    transporterId: null,
    transporterName: null,
    vehicleType: null,
    vehicleNumber: null,
    driverContact: null,
    assignedAt: null,
    pickedUpAt: null,
    inTransitAt: null,
    deliveredAt: null,
    confirmedAt: null,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  }
];

/**
 * Get all deliveries from localStorage
 */
export function getDeliveries() {
  try {
    const raw = localStorage.getItem(DELIVERIES_STORAGE_KEY) || localStorage.getItem('agramazDeliveries');
    if (!raw) {
      localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_DELIVERIES));
      return DEFAULT_DEMO_DELIVERIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_DEMO_DELIVERIES;
  } catch {
    return DEFAULT_DEMO_DELIVERIES;
  }
}

/**
 * Save deliveries to localStorage
 */
function saveDeliveries(deliveries) {
  try {
    localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(deliveries));
  } catch (err) {
    console.error('Failed to save deliveries to localStorage:', err);
  }
}

/**
 * Get deliveries for a farmer
 */
export function getFarmerDeliveries(farmerId) {
  const all = getDeliveries();
  if (!farmerId) return all;
  return all.filter((d) => d.farmerId === farmerId || !d.farmerId);
}

/**
 * Get deliveries for a buyer
 */
export function getBuyerDeliveries(buyerId) {
  const all = getDeliveries();
  if (!buyerId) return all;
  return all.filter((d) => d.buyerId === buyerId || !d.buyerId);
}

/**
 * Get all open jobs available for transporters
 */
export function getAvailableTransportJobs() {
  const all = getDeliveries();
  return all.filter((d) => d.status === 'transport_requested');
}

/**
 * Get deliveries accepted by a transporter
 */
export function getTransporterDeliveries(transporterId) {
  const all = getDeliveries();
  if (!transporterId) return all.filter((d) => d.transporterId);
  return all.filter((d) => d.transporterId === transporterId || (d.status !== 'transport_requested' && !d.transporterId));
}

/**
 * Get delivery linked to an order
 */
export function getDeliveryForOrder(orderNumberOrId) {
  if (!orderNumberOrId) return null;
  const all = getDeliveries();
  return all.find(
    (d) =>
      d.orderId === orderNumberOrId ||
      d.orderNumber === orderNumberOrId ||
      (orderNumberOrId.includes('#') && d.orderNumber.toLowerCase() === orderNumberOrId.toLowerCase())
  ) || null;
}

/**
 * Get delivery by ID
 */
export function getDeliveryById(id) {
  const all = getDeliveries();
  return all.find((d) => d.id === id || d.deliveryNumber === id) || null;
}

/**
 * Create a new delivery request (Farmer arranges delivery for confirmed order)
 */
export function createDelivery(deliveryData) {
  const currentDeliveries = getDeliveries();

  const generateDlvNum = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#DLV-${num}`;
  };

  const newDelivery = {
    id: `dlv_${Date.now()}`,
    deliveryNumber: generateDlvNum(),
    orderId: deliveryData.orderId || '',
    orderNumber: deliveryData.orderNumber || '#AGM-1000',
    farmerId: deliveryData.farmerId || 'usr_farmer_01',
    farmerName: deliveryData.farmerName || 'Sakthi Vel',
    buyerId: deliveryData.buyerId || 'usr_buyer_02',
    buyerName: deliveryData.buyerName || 'Ananya Agro Foods',
    commodity: deliveryData.commodity || 'Agricultural Produce',
    variety: deliveryData.variety || 'Standard Lot',
    grade: deliveryData.grade || 'A',
    quantity: Number(deliveryData.quantity) || 100,
    unit: deliveryData.unit || 'kg',
    pickupLocation: deliveryData.pickupLocation || {
      state: 'Tamil Nadu',
      district: 'Salem',
      address: 'Salem Farmgate Hub',
    },
    deliveryLocation: deliveryData.deliveryLocation || {
      state: 'Tamil Nadu',
      district: 'Chennai',
      address: 'Koyambedu Wholesale Terminal',
    },
    preferredPickupDate: deliveryData.preferredPickupDate || new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    notes: deliveryData.notes || '',
    status: 'transport_requested',
    transporterId: null,
    transporterName: null,
    vehicleType: null,
    vehicleNumber: null,
    driverContact: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newDelivery, ...currentDeliveries];
  saveDeliveries(updated);

  // Synchronize order delivery status
  if (deliveryData.orderId || deliveryData.orderNumber) {
    updateOrderDeliveryStatus(deliveryData.orderId || deliveryData.orderNumber, 'transport_requested');
  }

  return newDelivery;
}

/**
 * Transporter accepts an available delivery job
 */
export function acceptDeliveryJob(deliveryId, transporterUser) {
  const deliveries = getDeliveries();
  const index = deliveries.findIndex((d) => d.id === deliveryId || d.deliveryNumber === deliveryId);
  if (index === -1) return null;

  const current = deliveries[index];
  const transporter = transporterUser || {
    id: 'usr_transporter_04',
    name: 'Vetri Logistics & Transport',
    vehicleType: '14ft Eicher Truck (4 Tonne)',
    vehicleNumber: 'TN 28 AB 4092',
    phone: '+91 94433 77889',
  };

  deliveries[index] = {
    ...current,
    status: 'assigned',
    transporterId: transporter.id,
    transporterName: transporter.name,
    vehicleType: transporter.vehicleType || 'Commercial Freight Truck',
    vehicleNumber: transporter.vehicleNumber || 'TN 28 AB 4092',
    driverContact: `${transporter.phone || '+91 94433 77889'} (${transporter.name})`,
    assignedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveDeliveries(deliveries);

  // Sync order delivery status
  updateOrderDeliveryStatus(current.orderNumber || current.orderId, 'assigned');

  return deliveries[index];
}

/**
 * Update delivery status along the physical transport lifecycle
 * assigned -> picked_up -> in_transit -> delivered -> completed
 */
export function updateDeliveryStatus(deliveryId, nextStatus, metadata = {}) {
  const deliveries = getDeliveries();
  const index = deliveries.findIndex((d) => d.id === deliveryId || d.deliveryNumber === deliveryId);
  if (index === -1) return null;

  const current = deliveries[index];
  const now = new Date().toISOString();

  const timestampUpdates = {};
  if (nextStatus === 'picked_up') timestampUpdates.pickedUpAt = now;
  if (nextStatus === 'in_transit') timestampUpdates.inTransitAt = now;
  if (nextStatus === 'delivered') timestampUpdates.deliveredAt = now;
  if (nextStatus === 'completed') timestampUpdates.confirmedAt = now;

  deliveries[index] = {
    ...current,
    ...metadata,
    ...timestampUpdates,
    status: nextStatus,
    updatedAt: now,
  };

  saveDeliveries(deliveries);

  // Synchronize order
  const orderKey = current.orderNumber || current.orderId;
  if (nextStatus === 'delivered') {
    updateOrderStatus(orderKey, 'delivered');
    updateOrderDeliveryStatus(orderKey, 'delivered');
  } else if (nextStatus === 'completed') {
    confirmOrderReceipt(orderKey);
  } else {
    updateOrderDeliveryStatus(orderKey, nextStatus);
  }

  return deliveries[index];
}

/**
 * Buyer confirms receipt of delivery
 */
export function confirmBuyerReceipt(deliveryIdOrOrderNumber) {
  const deliveries = getDeliveries();
  const index = deliveries.findIndex(
    (d) =>
      d.id === deliveryIdOrOrderNumber ||
      d.deliveryNumber === deliveryIdOrOrderNumber ||
      d.orderNumber === deliveryIdOrOrderNumber ||
      d.orderId === deliveryIdOrOrderNumber
  );

  if (index === -1) return null;

  const current = deliveries[index];
  const now = new Date().toISOString();

  deliveries[index] = {
    ...current,
    status: 'completed',
    confirmedAt: now,
    updatedAt: now,
  };

  saveDeliveries(deliveries);

  // Settle order
  confirmOrderReceipt(current.orderNumber || current.orderId);

  return deliveries[index];
}

/**
 * Compute aggregate statistics for the Transporter Dashboard
 */
export function getTransporterStats(transporterId) {
  const all = getDeliveries();
  
  const availableJobs = all.filter((d) => d.status === 'transport_requested').length;
  const myDeliveries = all.filter((d) => d.transporterId === transporterId || (d.status !== 'transport_requested' && !d.transporterId));
  
  const activeDeliveries = myDeliveries.filter((d) => d.status === 'assigned' || d.status === 'picked_up' || d.status === 'in_transit').length;
  const completedTrips = myDeliveries.filter((d) => d.status === 'delivered' || d.status === 'completed').length + 18; // plus baseline
  
  const totalKg = all
    .filter((d) => d.status === 'delivered' || d.status === 'completed')
    .reduce((sum, d) => sum + (Number(d.quantity) || 0), 24500);

  return {
    availableJobs,
    activeDeliveries,
    completedTrips,
    totalTonnes: (totalKg / 1000).toFixed(1),
  };
}
