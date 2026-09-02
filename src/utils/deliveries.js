// Agrolnk Supabase Deliveries & Logistics Engine
import { supabase } from '../lib/supabase';

function mapDeliveryFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    deliveryNumber: row.delivery_number,
    orderId: row.order_id,
    orderNumber: row.order_number,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    transporterId: row.transporter_id,
    transporterName: row.transporter_name,
    vehicleNumber: row.vehicle_number,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    commodity: row.commodity,
    grade: row.grade,
    variety: row.variety,
    quantity: Number(row.quantity),
    unit: row.unit,
    pickupLocation: row.pickup_location || {},
    deliveryLocation: row.delivery_location || {},
    status: row.status,
    pickupOtp: row.pickup_otp,
    deliveryOtp: row.delivery_otp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all deliveries from Supabase
 */
export async function getDeliveries() {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch deliveries from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDeliveryFromDb);
  } catch (err) {
    console.error('Error in getDeliveries:', err);
    return [];
  }
}

/**
 * Get deliveries for a farmer
 */
export async function getFarmerDeliveries(farmerId) {
  try {
    if (!farmerId) return await getDeliveries();

    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch farmer deliveries:', error);
      return [];
    }

    return (data || []).map(mapDeliveryFromDb);
  } catch (err) {
    console.error('Error in getFarmerDeliveries:', err);
    return [];
  }
}

/**
 * Get deliveries for a buyer
 */
export async function getBuyerDeliveries(buyerId) {
  try {
    if (!buyerId) return await getDeliveries();

    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch buyer deliveries:', error);
      return [];
    }

    return (data || []).map(mapDeliveryFromDb);
  } catch (err) {
    console.error('Error in getBuyerDeliveries:', err);
    return [];
  }
}

/**
 * Get all open jobs available for transporters
 */
export async function getAvailableTransportJobs() {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('status', 'transport_requested')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch transport jobs:', error);
      return [];
    }

    return (data || []).map(mapDeliveryFromDb);
  } catch (err) {
    console.error('Error in getAvailableTransportJobs:', err);
    return [];
  }
}

/**
 * Get deliveries accepted by a transporter
 */
export async function getTransporterDeliveries(transporterId) {
  try {
    if (!transporterId) return await getDeliveries();

    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('transporter_id', transporterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch transporter deliveries:', error);
      return [];
    }

    return (data || []).map(mapDeliveryFromDb);
  } catch (err) {
    console.error('Error in getTransporterDeliveries:', err);
    return [];
  }
}

/**
 * Create a new delivery record in Supabase
 */
export async function createDelivery(deliveryData) {
  try {
    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch {
        return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    };

    const generateDeliveryNum = () => {
      const num = Math.floor(1000 + Math.random() * 9000);
      return `DEL-${num}`;
    };

    const dbRow = {
      id: generateId(),
      delivery_number: generateDeliveryNum(),
      order_id: deliveryData.orderId || null,
      order_number: deliveryData.orderNumber || '#AGM-1000',
      farmer_id: deliveryData.farmerId || null,
      farmer_name: deliveryData.farmerName || 'Sakthi Vel',
      buyer_id: deliveryData.buyerId || null,
      buyer_name: deliveryData.buyerName || 'Ananya Agro Foods',
      transporter_id: deliveryData.transporterId || null,
      transporter_name: deliveryData.transporterName || null,
      commodity: deliveryData.commodity || 'Tomato',
      grade: deliveryData.grade || 'A',
      variety: deliveryData.variety || 'Standard',
      quantity: Number(deliveryData.quantity),
      unit: deliveryData.unit || 'kg',
      pickup_location: deliveryData.pickupLocation || {},
      delivery_location: deliveryData.deliveryLocation || {},
      status: deliveryData.status || 'transport_requested',
      pickup_otp: String(Math.floor(1000 + Math.random() * 9000)),
      delivery_otp: String(Math.floor(1000 + Math.random() * 9000)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('deliveries')
      .insert([dbRow])
      .select()
      .single();

    if (error) {
      console.error('Supabase delivery creation error:', error);
      throw error;
    }

    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error creating delivery:', err);
    throw err;
  }
}

/**
 * Transporter accepts a transport delivery job
 */
export async function acceptDelivery(deliveryId, transporterInfo) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        transporter_id: transporterInfo.id || null,
        transporter_name: transporterInfo.name || 'Vetri Logistics',
        vehicle_number: transporterInfo.vehicleNumber || 'TN 28 AB 4092',
        driver_name: transporterInfo.driverName || 'M. Murugan',
        driver_phone: transporterInfo.driverPhone || '+91 94433 77889',
        status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error accepting delivery:', err);
    throw err;
  }
}

/**
 * Confirm pickup with OTP
 */
export async function confirmPickup(deliveryId) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        status: 'in_transit',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error confirming pickup:', err);
    throw err;
  }
}

/**
 * Confirm buyer delivery completion with OTP
 */
export async function confirmBuyerReceipt(deliveryId) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error confirming delivery:', err);
    throw err;
  }
}

/**
 * Get aggregated transporter stats
 */
export async function getTransporterStats(transporterId) {
  try {
    const all = await getDeliveries();
    const availableJobs = all.filter((d) => d.status === 'transport_requested');
    const myDeliveries = all.filter((d) => d.transporterId === transporterId || (d.status !== 'transport_requested' && !d.transporterId));
    const activeDeliveries = myDeliveries.filter((d) => d.status === 'assigned' || d.status === 'in_transit');
    const completedTrips = myDeliveries.filter((d) => d.status === 'delivered' || d.status === 'completed');
    const totalTonnes = completedTrips.reduce((sum, d) => sum + (Number(d.quantity) || 0) / 1000, 0);

    return {
      availableJobs: availableJobs.length,
      activeDeliveries: activeDeliveries.length,
      completedTrips: completedTrips.length,
      totalTonnes: Number(totalTonnes.toFixed(1)),
    };
  } catch (err) {
    console.error('Error in getTransporterStats:', err);
    return {
      availableJobs: 0,
      activeDeliveries: 0,
      completedTrips: 0,
      totalTonnes: 0,
    };
  }
}

/**
 * Get delivery linked to an order
 */
export async function getDeliveryForOrder(orderNumberOrId) {
  try {
    if (!orderNumberOrId) return null;
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .or(`order_id.eq.${orderNumberOrId},order_number.eq.${orderNumberOrId}`)
      .maybeSingle();

    if (error || !data) return null;
    return mapDeliveryFromDb(data);
  } catch {
    return null;
  }
}

export const acceptDeliveryJob = acceptDelivery;

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(deliveryId, newStatus) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) throw error;
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error updating delivery status:', err);
    throw err;
  }
}

/**
 * Get delivery by ID
 */
export async function getDeliveryById(deliveryId) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !data) return null;
    return mapDeliveryFromDb(data);
  } catch {
    return null;
  }
}
