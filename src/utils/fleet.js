// Agrolnk Transporter Fleet Management Engine
import { supabase } from '../lib/supabase';

const FLEET_STORAGE_PREFIX = 'agrolnk_transporter_fleet_';

/**
 * Standard vehicle categories and payload presets
 */
export const VEHICLE_CATEGORIES = [
  {
    key: 'mini_truck',
    name: 'Mini Truck (Tata Ace / Bolero)',
    capacity: '1.5 MT',
    capacityKg: 1500,
    icon: 'Truck',
    description: 'Best for local farmgate pickups & small loads',
  },
  {
    key: 'medium_lcv',
    name: 'Medium LCV (14ft Eicher Truck)',
    capacity: '5.0 MT',
    capacityKg: 5000,
    icon: 'Truck',
    description: 'Standard agricultural freight carrier',
  },
  {
    key: 'reefer_truck',
    name: 'Reefer Cold-Chain Truck',
    capacity: '8.0 MT',
    capacityKg: 8000,
    icon: 'Snowflake',
    description: 'Temperature-controlled for fruits & perishables',
  },
  {
    key: 'heavy_truck',
    name: 'Heavy Commercial (10-Wheeler / 16T)',
    capacity: '16.0 MT',
    capacityKg: 16000,
    icon: 'Truck',
    description: 'High-volume grain and bulk commodity freight',
  },
  {
    key: 'trailer',
    name: 'Multi-Axle Trailer (24-32 MT)',
    capacity: '28.0 MT',
    capacityKg: 28000,
    icon: 'Truck',
    description: 'Interstate bulk wholesale transit',
  },
];

/**
 * Seed initial mock vehicle for demo accounts if empty
 */
const DEFAULT_DEMO_FLEET = [
  {
    id: 'veh_demo_01',
    vehicleNumber: 'TN 28 AB 4092',
    vehicleCategory: 'medium_lcv',
    vehicleType: 'Medium LCV (14ft Eicher Truck)',
    capacityKg: 5000,
    capacityDisplay: '5.0 MT',
    driverName: 'M. Murugan',
    driverPhone: '9443377889',
    isPrimary: true,
    status: 'available', // 'available' | 'on_trip' | 'maintenance'
    createdAt: new Date().toISOString(),
  },
];

/**
 * Get all fleet vehicles for a transporter
 */
export async function getTransporterFleet(transporterId, userEmail) {
  const identifier = transporterId || userEmail || 'default';
  const storageKey = `${FLEET_STORAGE_PREFIX}${identifier}`;

  try {
    // 1. Check local storage
    const rawLocal = localStorage.getItem(storageKey);
    let localFleet = rawLocal ? JSON.parse(rawLocal) : null;

    // 2. Try fetching from Supabase profiles metadata
    if (transporterId || userEmail) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('meta')
          .or(`id.eq.${transporterId},email.eq.${userEmail}`)
          .maybeSingle();

        if (!error && data?.meta?.fleet && Array.isArray(data.meta.fleet)) {
          localFleet = data.meta.fleet;
          localStorage.setItem(storageKey, JSON.stringify(localFleet));
          return localFleet;
        }
      } catch (dbErr) {
        console.warn('Supabase fleet fetch notice:', dbErr);
      }
    }

    // 3. Fallback to local or demo fleet
    if (localFleet && Array.isArray(localFleet)) {
      return localFleet;
    }

    // For demo/sample transporter account, seed 1 default vehicle
    if (identifier === 'usr_trans_01' || identifier === 'logistics@agrolnk.com') {
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_DEMO_FLEET));
      return DEFAULT_DEMO_FLEET;
    }

    return [];
  } catch (err) {
    console.error('Error fetching transporter fleet:', err);
    return [];
  }
}

/**
 * Save / Add a new vehicle to the transporter's fleet
 */
export async function saveFleetVehicle(transporterId, userEmail, vehicleData) {
  const identifier = transporterId || userEmail || 'default';
  const storageKey = `${FLEET_STORAGE_PREFIX}${identifier}`;

  try {
    const existing = await getTransporterFleet(transporterId, userEmail);
    const isEditing = Boolean(vehicleData.id);

    const vehicleId = vehicleData.id || `veh_${Date.now()}`;
    const cleanNumber = (vehicleData.vehicleNumber || '').trim().toUpperCase();

    // If marked as primary, unmark other vehicles
    const shouldBePrimary = vehicleData.isPrimary || existing.length === 0;

    let updatedFleet;
    if (isEditing) {
      updatedFleet = existing.map((v) => {
        if (v.id === vehicleId) {
          return {
            ...v,
            ...vehicleData,
            id: vehicleId,
            vehicleNumber: cleanNumber,
            isPrimary: shouldBePrimary,
            updatedAt: new Date().toISOString(),
          };
        }
        return shouldBePrimary ? { ...v, isPrimary: false } : v;
      });
    } else {
      const newVehicle = {
        id: vehicleId,
        vehicleNumber: cleanNumber,
        vehicleCategory: vehicleData.vehicleCategory || 'medium_lcv',
        vehicleType: vehicleData.vehicleType || 'Medium LCV (14ft Eicher Truck)',
        capacityKg: Number(vehicleData.capacityKg) || 5000,
        capacityDisplay: vehicleData.capacityDisplay || '5.0 MT',
        driverName: (vehicleData.driverName || '').trim(),
        driverPhone: (vehicleData.driverPhone || '').trim(),
        isPrimary: shouldBePrimary,
        status: vehicleData.status || 'available',
        createdAt: new Date().toISOString(),
      };

      const adjustedExisting = shouldBePrimary
        ? existing.map((v) => ({ ...v, isPrimary: false }))
        : existing;

      updatedFleet = [newVehicle, ...adjustedExisting];
    }

    // 1. Save to local storage
    localStorage.setItem(storageKey, JSON.stringify(updatedFleet));

    // 2. Sync to Supabase profiles meta
    try {
      if (transporterId || userEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('meta')
          .or(`id.eq.${transporterId},email.eq.${userEmail}`)
          .maybeSingle();

        const currentMeta = profile?.meta || {};
        await supabase
          .from('profiles')
          .update({
            meta: {
              ...currentMeta,
              fleet: updatedFleet,
            },
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${transporterId},email.eq.${userEmail}`);
      }
    } catch (syncErr) {
      console.warn('Supabase fleet sync notice:', syncErr);
    }

    // 3. Dispatch fleet update event
    window.dispatchEvent(
      new CustomEvent('agrolnk_fleet_updated', {
        detail: { transporterId, fleet: updatedFleet },
      })
    );

    return updatedFleet;
  } catch (err) {
    console.error('Error saving fleet vehicle:', err);
    throw err;
  }
}

/**
 * Delete a vehicle from the fleet
 */
export async function deleteFleetVehicle(transporterId, userEmail, vehicleId) {
  const identifier = transporterId || userEmail || 'default';
  const storageKey = `${FLEET_STORAGE_PREFIX}${identifier}`;

  try {
    const existing = await getTransporterFleet(transporterId, userEmail);
    const filtered = existing.filter((v) => v.id !== vehicleId);

    // If we deleted the primary vehicle and there are remaining vehicles, set the first as primary
    if (filtered.length > 0 && !filtered.some((v) => v.isPrimary)) {
      filtered[0].isPrimary = true;
    }

    // 1. Save locally
    localStorage.setItem(storageKey, JSON.stringify(filtered));

    // 2. Sync to Supabase
    try {
      if (transporterId || userEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('meta')
          .or(`id.eq.${transporterId},email.eq.${userEmail}`)
          .maybeSingle();

        const currentMeta = profile?.meta || {};
        await supabase
          .from('profiles')
          .update({
            meta: {
              ...currentMeta,
              fleet: filtered,
            },
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${transporterId},email.eq.${userEmail}`);
      }
    } catch (syncErr) {
      console.warn('Supabase fleet delete sync notice:', syncErr);
    }

    // 3. Dispatch event
    window.dispatchEvent(
      new CustomEvent('agrolnk_fleet_updated', {
        detail: { transporterId, fleet: filtered },
      })
    );

    return filtered;
  } catch (err) {
    console.error('Error deleting fleet vehicle:', err);
    throw err;
  }
}

/**
 * Set a vehicle as the primary/default dispatch vehicle
 */
export async function setPrimaryVehicle(transporterId, userEmail, vehicleId) {
  const identifier = transporterId || userEmail || 'default';
  const storageKey = `${FLEET_STORAGE_PREFIX}${identifier}`;

  try {
    const existing = await getTransporterFleet(transporterId, userEmail);
    const updatedFleet = existing.map((v) => ({
      ...v,
      isPrimary: v.id === vehicleId,
    }));

    localStorage.setItem(storageKey, JSON.stringify(updatedFleet));

    try {
      if (transporterId || userEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('meta')
          .or(`id.eq.${transporterId},email.eq.${userEmail}`)
          .maybeSingle();

        const currentMeta = profile?.meta || {};
        await supabase
          .from('profiles')
          .update({
            meta: {
              ...currentMeta,
              fleet: updatedFleet,
            },
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${transporterId},email.eq.${userEmail}`);
      }
    } catch (syncErr) {
      console.warn('Supabase primary vehicle sync notice:', syncErr);
    }

    window.dispatchEvent(
      new CustomEvent('agrolnk_fleet_updated', {
        detail: { transporterId, fleet: updatedFleet },
      })
    );

    return updatedFleet;
  } catch (err) {
    console.error('Error setting primary vehicle:', err);
    throw err;
  }
}
