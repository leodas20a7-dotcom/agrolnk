// Agrolnk Supabase Orders & Settlements Engine
import { supabase } from '../lib/supabase';
import { createDelivery } from './deliveries';

function mapOrderFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    listingId: row.listing_id,
    auctionId: row.auction_id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    commodity: row.commodity,
    variety: row.variety,
    grade: row.grade,
    quantity: Number(row.quantity),
    unit: row.unit,
    pricePerUnit: Number(row.price_per_unit),
    totalAmount: Number(row.total_amount),
    state: row.state,
    district: row.district,
    escrowStatus: row.escrow_status,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all orders from Supabase
 */
export async function getOrders() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch orders from Supabase:', error);
      return [];
    }

    return (data || []).map(mapOrderFromDb);
  } catch (err) {
    console.error('Error in getOrders:', err);
    return [];
  }
}

/**
 * Get orders for a specific buyer
 */
export async function getBuyerOrders(buyerId) {
  try {
    if (!buyerId) return await getOrders();

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch buyer orders:', error);
      return [];
    }

    return (data || []).map(mapOrderFromDb);
  } catch (err) {
    console.error('Error in getBuyerOrders:', err);
    return [];
  }
}

/**
 * Get orders for a specific farmer
 */
export async function getFarmerOrders(farmerId) {
  try {
    if (!farmerId) return await getOrders();

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch farmer orders:', error);
      return [];
    }

    return (data || []).map(mapOrderFromDb);
  } catch (err) {
    console.error('Error in getFarmerOrders:', err);
    return [];
  }
}

/**
 * Create a new order in Supabase
 */
export async function createOrder(orderData) {
  try {
    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch {
        return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    };

    const generateOrderNum = () => {
      const num = Math.floor(1000 + Math.random() * 9000);
      return `#AGM-${num}`;
    };

    const orderId = generateId();
    const orderNumber = generateOrderNum();

    const dbRow = {
      id: orderId,
      order_number: orderNumber,
      listing_id: orderData.listingId || null,
      auction_id: orderData.auctionId || null,
      buyer_id: orderData.buyerId || null,
      buyer_name: orderData.buyerName || 'Ananya Agro Foods',
      farmer_id: orderData.farmerId || null,
      farmer_name: orderData.farmerName || 'Sakthi Vel',
      commodity: orderData.commodity || 'Tomato',
      variety: orderData.variety || 'Standard',
      grade: orderData.grade || 'A',
      quantity: Number(orderData.quantity),
      unit: orderData.unit || 'kg',
      price_per_unit: Number(orderData.pricePerUnit),
      total_amount: Number(orderData.totalAmount),
      state: orderData.state || 'Tamil Nadu',
      district: orderData.district || 'Salem',
      escrow_status: 'funded',
      status: 'order_placed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([dbRow])
      .select()
      .single();

    if (error) {
      console.error('Supabase order creation error:', error);
      throw error;
    }

    // Automatically create a transport delivery record for logistics
    try {
      await createDelivery({
        orderId: data.id,
        orderNumber: data.order_number,
        farmerId: data.farmer_id,
        farmerName: data.farmer_name,
        buyerId: data.buyer_id,
        buyerName: data.buyer_name,
        commodity: data.commodity,
        grade: data.grade,
        variety: data.variety,
        quantity: data.quantity,
        unit: data.unit,
        pickupLocation: orderData.pickupLocation || {
          state: data.state,
          district: data.district,
          address: `${data.district} Farmgate Aggregation Depot`,
        },
        deliveryLocation: orderData.deliveryLocation || {
          state: 'Tamil Nadu',
          district: 'Chennai',
          address: 'Buyer Central Receiving Terminal',
        },
      });
    } catch (deliveryErr) {
      console.warn('Auto delivery creation notice:', deliveryErr);
    }

    return mapOrderFromDb(data);
  } catch (err) {
    console.error('Error creating order:', err);
    throw err;
  }
}

/**
 * Confirm order receipt by buyer
 */
export async function confirmOrderReceipt(orderId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        escrow_status: 'released',
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .select()
      .single();

    if (error) throw error;

    // Automatically sync linked delivery to completed
    try {
      await supabase
        .from('deliveries')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .or(`order_id.eq.${orderId},order_number.eq.${orderId}`);
    } catch (delSyncErr) {
      console.warn('Delivery sync notice:', delSyncErr);
    }

    return mapOrderFromDb(data);
  } catch (err) {
    console.error('Error confirming order receipt:', err);
    throw err;
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const updatePayload = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'completed') {
      updatePayload.escrow_status = 'released';
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .select()
      .single();

    if (error) throw error;

    // Automatically sync linked delivery when order progresses
    try {
      let linkedDeliveryStatus = null;
      if (newStatus === 'completed') linkedDeliveryStatus = 'completed';
      else if (newStatus === 'delivered') linkedDeliveryStatus = 'delivered';
      else if (newStatus === 'in_transit' || newStatus === 'ready_for_delivery') linkedDeliveryStatus = 'in_transit';

      if (linkedDeliveryStatus) {
        await supabase
          .from('deliveries')
          .update({
            status: linkedDeliveryStatus,
            updated_at: new Date().toISOString(),
          })
          .or(`order_id.eq.${orderId},order_number.eq.${orderId}`);
      }
    } catch (delErr) {
      console.warn('Delivery status auto-sync notice:', delErr);
    }

    return mapOrderFromDb(data);
  } catch (err) {
    console.error('Error updating order status:', err);
    throw err;
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle();

    if (error || !data) return null;
    return mapOrderFromDb(data);
  } catch {
    return null;
  }
}
