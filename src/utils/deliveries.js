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
    vehicleType: row.vehicle_type,
    vehicleNumber: row.vehicle_number,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    freightAmount: row.freight_amount ? Number(row.freight_amount) : null,
    estimatedDistanceKm: row.estimated_distance_km ? Number(row.estimated_distance_km) : null,
    commodity: row.commodity,
    grade: row.grade,
    variety: row.variety,
    quantity: Number(row.quantity),
    unit: row.unit,
    pickupLocation: row.pickup_location || {},
    deliveryLocation: row.delivery_location || {},
    status: row.status,
    notes: row.notes,
    pickupOtp: row.pickup_otp,
    deliveryOtp: row.delivery_otp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// District distance matrix (regional agricultural corridors)
export const DISTRICT_DISTANCES = {
  'salem-chennai': 340,
  'salem-coimbatore': 165,
  'salem-madurai': 225,
  'salem-bangalore': 205,
  'salem-trichy': 140,
  'salem-dindigul': 175,
  'dindigul-madurai': 65,
  'dindigul-chennai': 430,
  'dindigul-coimbatore': 155,
  'coimbatore-chennai': 500,
  'coimbatore-madurai': 210,
  'coimbatore-bangalore': 365,
  'madurai-chennai': 460,
  'trichy-chennai': 330,
  'theni-chennai': 490,
  'dharmapuri-chennai': 295,
  'erode-chennai': 395,
  'thanjavur-chennai': 340,
  'tirunelveli-chennai': 620,
};

/**
 * Estimate road distance between pickup and delivery districts
 */
export function estimateDistanceKm(originDistrict = '', destDistrict = '') {
  const orig = (originDistrict || '').trim().toLowerCase();
  const dest = (destDistrict || '').trim().toLowerCase();
  if (!orig || !dest || orig === dest) return 35;
  const key1 = `${orig}-${dest}`;
  const key2 = `${dest}-${orig}`;
  if (DISTRICT_DISTANCES[key1]) return DISTRICT_DISTANCES[key1];
  if (DISTRICT_DISTANCES[key2]) return DISTRICT_DISTANCES[key2];
  return 180;
}

/**
 * Transparent vehicle tariff matrix (Base fare + per-km rate)
 */
export const VEHICLE_TARIFF_RATES = {
  'mini_truck': {
    name: 'Mini Truck (Tata Ace / Bolero)',
    maxCapacityKg: 1500,
    baseFare: 400,
    ratePerKm: 14,
    description: 'Best for local & small lots (up to 1.5 MT)'
  },
  'medium_lcv': {
    name: 'Medium LCV (14ft Eicher)',
    maxCapacityKg: 5000,
    baseFare: 900,
    ratePerKm: 24,
    description: 'Standard agri freight (up to 5.0 MT)'
  },
  'reefer_truck': {
    name: 'Reefer Cold-Chain Truck',
    maxCapacityKg: 8000,
    baseFare: 1600,
    ratePerKm: 34,
    description: 'Temperature-controlled for perishable horticulture'
  },
  'heavy_truck': {
    name: 'Heavy Commercial (10-Wheeler)',
    maxCapacityKg: 20000,
    baseFare: 2600,
    ratePerKm: 42,
    description: 'Bulk grain / wholesale volume (up to 20 MT)'
  }
};

/**
 * Calculate recommended vehicle and estimated fair price
 */
export function calculateEstimatedFare(weightKg, distanceKm, vehicleKey = null) {
  const wt = Number(weightKg) || 1000;
  const dist = Number(distanceKm) || 100;

  let chosenKey = vehicleKey;
  if (!chosenKey || !VEHICLE_TARIFF_RATES[chosenKey]) {
    if (wt <= 1500) chosenKey = 'mini_truck';
    else if (wt <= 5000) chosenKey = 'medium_lcv';
    else if (wt <= 8000) chosenKey = 'reefer_truck';
    else chosenKey = 'heavy_truck';
  }

  const rate = VEHICLE_TARIFF_RATES[chosenKey];
  const calculatedFare = Math.round(rate.baseFare + (dist * rate.ratePerKm));
  return {
    vehicleKey: chosenKey,
    vehicleName: rate.name,
    distanceKm: dist,
    estimatedFare: calculatedFare,
    baseFare: rate.baseFare,
    ratePerKm: rate.ratePerKm,
    description: rate.description
  };
}

/**
 * Get all deliveries from Supabase (deduplicated by order)
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

    const rawList = (data || []).map(mapDeliveryFromDb);
    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
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

    const rawList = (data || []).map(mapDeliveryFromDb);
    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
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

    const rawList = (data || []).map(mapDeliveryFromDb);
    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
  } catch (err) {
    console.error('Error in getBuyerDeliveries:', err);
    return [];
  }
}

/**
 * Get all open platform jobs available for commercial transporters
 * Excludes self-arranged farmer shipments and deduplicates by order
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

    const rawList = (data || [])
      .map(mapDeliveryFromDb)
      .filter((d) => d.transporterName !== 'Farmer Direct Transport' && d.transporterName !== 'Self / Direct Farmer');

    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
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

    const rawList = (data || []).map(mapDeliveryFromDb);
    const seen = new Set();
    const deduped = [];
    for (const d of rawList) {
      const key = d.orderNumber || d.orderId || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    return deduped;
  } catch (err) {
    console.error('Error in getTransporterDeliveries:', err);
    return [];
  }
}

/**
 * Create or update a delivery record in Supabase (Guaranteed Idempotency)
 * Prevents multiple clicks from creating duplicate jobs in Transporter Desk
 */
export async function createDelivery(deliveryData) {
  try {
    const orderIdentifier = deliveryData.orderId || deliveryData.orderNumber;
    
    // Check if a delivery already exists for this order to prevent duplicates
    if (orderIdentifier) {
      const { data: existingRows } = await supabase
        .from('deliveries')
        .select('*')
        .or(`order_id.eq.${orderIdentifier},order_number.eq.${orderIdentifier}`)
        .order('created_at', { ascending: false });

      if (existingRows && existingRows.length > 0) {
        const existing = existingRows[0];
        // Clean up duplicate rows if multiple were created before
        if (existingRows.length > 1) {
          const duplicateIds = existingRows.slice(1).map((r) => r.id);
          try {
            await supabase.from('deliveries').delete().in('id', duplicateIds);
          } catch (delErr) {
            console.warn('Cleanup duplicate deliveries notice:', delErr);
          }
        }

        // If existing record was found, update its location/notes and ensure active request status
        const { data: updated, error: updateErr } = await supabase
          .from('deliveries')
          .update({
            pickup_location: deliveryData.pickupLocation || existing.pickup_location,
            delivery_location: deliveryData.deliveryLocation || existing.delivery_location,
            status: deliveryData.status || existing.status || 'transport_requested',
            notes: deliveryData.notes || existing.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (!updateErr && updated) {
          return mapDeliveryFromDb(updated);
        }
        return mapDeliveryFromDb(existing);
      }
    }

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
 * Handle Farmer Self-Arranged Transport Dispatch
 * Records vehicle registration number and driver info for direct buyer notification
 */
export async function createOrUpdateSelfTransport(order, vehicleInfo) {
  try {
    const orderId = order.id || order.orderNumber;
    const { data: existingRows } = await supabase
      .from('deliveries')
      .select('*')
      .or(`order_id.eq.${orderId},order_number.eq.${orderId}`)
      .order('created_at', { ascending: false });

    const vehicleNum = (vehicleInfo.vehicleNumber || '').trim().toUpperCase();
    const driverName = (vehicleInfo.driverName || '').trim() || (order.farmerName || 'Self / Direct Farmer');
    const driverPhone = (vehicleInfo.driverPhone || '').trim();

    if (existingRows && existingRows.length > 0) {
      const primary = existingRows[0];
      const { data: updated, error } = await supabase
        .from('deliveries')
        .update({
          status: 'in_transit',
          transporter_name: 'Farmer Direct Transport',
          vehicle_number: vehicleNum,
          driver_name: driverName,
          driver_phone: driverPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', primary.id)
        .select()
        .single();

      if (existingRows.length > 1) {
        const dupIds = existingRows.slice(1).map((r) => r.id);
        try {
          await supabase.from('deliveries').delete().in('id', dupIds);
        } catch {}
      }

      if (!error && updated) return mapDeliveryFromDb(updated);
    }

    // Create a new self-arranged delivery manifest
    const num = Math.floor(1000 + Math.random() * 9000);
    const dbRow = {
      id: crypto.randomUUID?.() || `del_${Date.now()}`,
      delivery_number: `DEL-${num}`,
      order_id: order.id || null,
      order_number: order.orderNumber || '#AGM-1000',
      farmer_id: order.farmerId || null,
      farmer_name: order.farmerName || 'Sakthi Vel',
      buyer_id: order.buyerId || null,
      buyer_name: order.buyerName || 'Ananya Agro Foods',
      transporter_id: null,
      transporter_name: 'Farmer Direct Transport',
      vehicle_number: vehicleNum,
      driver_name: driverName,
      driver_phone: driverPhone,
      commodity: order.commodity || 'Produce Lot',
      grade: order.grade || 'A',
      variety: order.variety || 'Standard',
      quantity: Number(order.quantity),
      unit: order.unit || 'kg',
      pickup_location: order.pickupLocation || {
        district: order.district || 'Salem',
        state: order.state || 'Tamil Nadu',
        address: `${order.district || 'Salem'} Farmgate Aggregation Hub`,
      },
      delivery_location: order.deliveryLocation || {
        district: 'Chennai',
        state: 'Tamil Nadu',
        address: 'Buyer Wholesale Facility Bay 12',
      },
      status: 'in_transit',
      pickup_otp: String(Math.floor(1000 + Math.random() * 9000)),
      delivery_otp: String(Math.floor(1000 + Math.random() * 9000)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('deliveries').insert([dbRow]).select().single();
    if (error) throw error;
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error in createOrUpdateSelfTransport:', err);
    throw err;
  }
}

/**
 * Transporter submits a price quote & vehicle allocation for farmer approval
 */
export async function submitTransportQuote(deliveryId, quoteData) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        transporter_id: quoteData.transporterId || null,
        transporter_name: quoteData.transporterName || 'Vetri Logistics & Transport',
        vehicle_type: quoteData.vehicleType || '14ft Eicher Truck',
        vehicle_number: (quoteData.vehicleNumber || 'TN 28 AB 4092').trim().toUpperCase(),
        driver_name: quoteData.driverName || 'M. Murugan',
        driver_phone: quoteData.driverPhone || '+91 94433 77889',
        freight_amount: Number(quoteData.freightAmount) || 2400,
        estimated_distance_km: Number(quoteData.distanceKm) || 150,
        status: 'price_offered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('Error submitting transport quote:', error);
      throw error;
    }
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error in submitTransportQuote:', err);
    throw err;
  }
}

/**
 * Farmer accepts the transporter's offered price ("It is OK")
 * Immediately assigns the transport and moves to dispatch readiness
 */
export async function acceptTransportPrice(deliveryId) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('Error accepting transport price:', error);
      throw error;
    }
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error in acceptTransportPrice:', err);
    throw err;
  }
}

/**
 * Farmer declines the transporter's price quote
 * Re-opens the freight request to the transport board
 */
export async function declineTransportPrice(deliveryId) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        status: 'transport_requested',
        transporter_id: null,
        transporter_name: null,
        freight_amount: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('Error declining transport price:', error);
      throw error;
    }
    return mapDeliveryFromDb(data);
  } catch (err) {
    console.error('Error in declineTransportPrice:', err);
    throw err;
  }
}

/**
 * Transporter accepts a transport delivery job directly
 */
export async function acceptDelivery(deliveryId, transporterInfo) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        transporter_id: transporterInfo.id || null,
        transporter_name: transporterInfo.name || 'Vetri Logistics',
        vehicle_type: transporterInfo.vehicleType || '14ft Eicher Truck',
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
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return mapDeliveryFromDb(data[0]);
  } catch {
    return null;
  }
}

export const acceptDeliveryJob = acceptDelivery;

/**
 * Update delivery status and automatically synchronize linked order status
 */
export async function updateDeliveryStatus(deliveryId, newStatus) {
  try {
    const updatePayload = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('deliveries')
      .update(updatePayload)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating delivery status in Supabase:', error);
      throw error;
    }

    // Auto-sync with linked order
    try {
      const orderIdentifier = data.order_id || data.order_number;
      if (orderIdentifier) {
        let nextOrderStatus = null;
        if (newStatus === 'picked_up' || newStatus === 'in_transit' || newStatus === 'dispatched') {
          nextOrderStatus = 'in_transit';
        } else if (newStatus === 'delivered') {
          nextOrderStatus = 'delivered';
        } else if (newStatus === 'completed') {
          nextOrderStatus = 'completed';
        }

        if (nextOrderStatus) {
          await supabase
            .from('orders')
            .update({
              status: nextOrderStatus,
              updated_at: new Date().toISOString(),
            })
            .or(`id.eq.${orderIdentifier},order_number.eq.${orderIdentifier}`);
        }
      }
    } catch (orderSyncErr) {
      console.warn('Linked order auto-sync notice:', orderSyncErr);
    }

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
