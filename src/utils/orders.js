// Agrolnk Prototype Orders Engine (LocalStorage)
// Enhanced lifecycle:
// PENDING -> CONFIRMED -> (TRANSPORT_REQUESTED -> ASSIGNED -> PICKED_UP -> IN_TRANSIT -> DELIVERED) -> BUYER_CONFIRMS -> COMPLETED

const ORDERS_STORAGE_KEY = 'agrolnkOrders';

// Default multi-stage demo orders
const DEFAULT_DEMO_ORDERS = [
  {
    id: 'ord_demo_1024',
    orderNumber: '#AGM-1024',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Tomato',
    variety: 'Hybrid Shivam',
    grade: 'A',
    quantity: 500,
    unit: 'kg',
    pricePerUnit: 42,
    totalAmount: 21000,
    status: 'confirmed',
    deliveryStatus: 'pending', // 'pending' | 'transport_requested' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'completed'
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
    state: 'Tamil Nadu',
    district: 'Salem',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'ord_demo_1023',
    orderNumber: '#AGM-1023',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Potato',
    variety: 'Kufri Jyoti',
    grade: 'A',
    quantity: 250,
    unit: 'kg',
    pricePerUnit: 35,
    totalAmount: 8750,
    status: 'completed',
    deliveryStatus: 'completed',
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
    state: 'Tamil Nadu',
    district: 'Dindigul',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'ord_demo_1022',
    orderNumber: '#AGM-1022',
    buyerId: 'usr_buyer_02',
    buyerName: 'Ananya Agro Foods',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Onion',
    variety: 'Nasik Red',
    grade: 'B',
    quantity: 500,
    unit: 'kg',
    pricePerUnit: 28,
    totalAmount: 14000,
    status: 'ready_for_delivery',
    deliveryStatus: 'in_transit',
    pickupLocation: {
      state: 'Maharashtra',
      district: 'Nashik',
      address: 'Lasalgaon APMC Yard, Nashik',
    },
    deliveryLocation: {
      state: 'Tamil Nadu',
      district: 'Chennai',
      address: 'Koyambedu Cold Chain Facility, Chennai',
    },
    state: 'Maharashtra',
    district: 'Nashik',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
];

/**
 * Get all orders from localStorage
 */
export function getOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY) || localStorage.getItem('agramazOrders');
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ORDERS));
      return DEFAULT_DEMO_ORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_DEMO_ORDERS;
  } catch {
    return DEFAULT_DEMO_ORDERS;
  }
}

/**
 * Save orders to localStorage
 */
function saveOrders(orders) {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save orders to localStorage:', err);
  }
}

/**
 * Get orders for a specific buyer
 */
export function getBuyerOrders(buyerId) {
  const all = getOrders();
  if (!buyerId) return all;
  return all.filter((o) => o.buyerId === buyerId || !o.buyerId);
}

/**
 * Get orders for a specific farmer
 */
export function getFarmerOrders(farmerId) {
  const all = getOrders();
  if (!farmerId) return all;
  return all.filter((o) => o.farmerId === farmerId || !o.farmerId);
}

/**
 * Create a new order
 */
export function createOrder(orderData) {
  const currentOrders = getOrders();

  const generateOrderNum = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#AGM-${num}`;
  };

  const newOrder = {
    id: `ord_${Date.now()}`,
    orderNumber: generateOrderNum(),
    buyerId: orderData.buyerId || 'usr_buyer_02',
    buyerName: orderData.buyerName || 'Ananya Agro Foods',
    listingId: orderData.listingId,
    farmerId: orderData.farmerId || 'usr_farmer_01',
    farmerName: orderData.farmerName || 'Sakthi Vel',
    commodity: orderData.commodity,
    variety: orderData.variety || 'Standard',
    grade: orderData.grade || 'A',
    quantity: Number(orderData.quantity),
    unit: orderData.unit || 'kg',
    pricePerUnit: Number(orderData.pricePerUnit),
    totalAmount: Number(orderData.totalAmount),
    status: 'pending',
    deliveryStatus: 'pending',
    pickupLocation: orderData.pickupLocation || {
      state: orderData.state || 'Tamil Nadu',
      district: orderData.district || 'Salem',
      address: `${orderData.district || 'Salem'} Producer Farmgate`,
    },
    deliveryLocation: orderData.deliveryLocation || {
      state: 'Tamil Nadu',
      district: 'Chennai',
      address: 'Wholesale Hub, Chennai',
    },
    state: orderData.state || '',
    district: orderData.district || '',
    createdAt: new Date().toISOString(),
  };

  const updated = [newOrder, ...currentOrders];
  saveOrders(updated);
  return newOrder;
}

/**
 * Update order status along the lifecycle
 */
export function updateOrderStatus(orderId, nextStatus) {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (index === -1) return null;

  orders[index] = {
    ...orders[index],
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  saveOrders(orders);
  return orders[index];
}

/**
 * Update delivery status on an order
 */
export function updateOrderDeliveryStatus(orderId, deliveryStatus) {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (index === -1) return null;

  orders[index] = {
    ...orders[index],
    deliveryStatus,
    updatedAt: new Date().toISOString(),
  };

  saveOrders(orders);
  return orders[index];
}

/**
 * Buyer confirms receipt of delivery -> moves order to completed
 */
export function confirmOrderReceipt(orderId) {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (index === -1) return null;

  orders[index] = {
    ...orders[index],
    status: 'completed',
    deliveryStatus: 'completed',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveOrders(orders);
  return orders[index];
}
