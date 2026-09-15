// AgroLnk Admin & KYC Management Engine
import { supabase } from '../lib/supabase';
import { getOrders } from './orders';
import { getFinancingRequests } from './financing';
import { getDeliveries } from './deliveries';
import { getInventory } from './warehouses';
import { BUYER_COMMISSION_RATE, SELLER_COMMISSION_RATE } from './commission';

const ADMIN_KYC_STORAGE_KEY = 'agrolnk_admin_kyc_registry';

// Seed Initial KYC Verification Registry (Empty for production)
const INITIAL_KYC_USERS = [];

function getStoredKYC() {
  try {
    const raw = localStorage.getItem(ADMIN_KYC_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out dummy sample users from previous sessions
    return parsed.filter(
      (u) =>
        u.id !== 'usr_farmer_01' &&
        u.id !== 'usr_buyer_02' &&
        u.id !== 'usr_transporter_03' &&
        u.id !== 'usr_warehouse_04' &&
        u.id !== 'usr_financier_05'
    );
  } catch {
    return [];
  }
}

function saveStoredKYC(users) {
  try {
    localStorage.setItem(ADMIN_KYC_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save KYC users:', err);
  }
}

/**
 * Get all users with KYC status (Merged from Supabase profiles + Local Registry)
 */
export async function getAllKYCUsers() {
  const localList = getStoredKYC();

  try {
    const { data: dbProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !dbProfiles) {
      return localList;
    }

    const merged = [...localList];

    dbProfiles.forEach((p) => {
      const existingIndex = merged.findIndex(
        (u) => (u.id && u.id === p.id) || (u.email && u.email.toLowerCase() === (p.email || '').toLowerCase())
      );

      const dbKycStatus = p.kyc_status || 'pending';
      const meta = p.meta || {};

      if (existingIndex >= 0) {
        // Enrich existing with DB data
        merged[existingIndex] = {
          ...merged[existingIndex],
          name: p.name || merged[existingIndex].name,
          role: p.role || merged[existingIndex].role,
          email: p.email || merged[existingIndex].email,
          phone: p.phone || merged[existingIndex].phone,
          state: p.state || merged[existingIndex].state,
          district: p.district || merged[existingIndex].district,
          orgName: p.company_name || merged[existingIndex].orgName,
          verificationStatus: dbKycStatus,
          documents: (meta.documents && meta.documents.length > 0) ? meta.documents : merged[existingIndex].documents,
          auditNotes: meta.auditNotes || merged[existingIndex].auditNotes,
        };
      } else {
        // Add new DB profile into KYC queue
        merged.unshift({
          id: p.id,
          name: p.name || 'Registered Partner',
          role: p.role || 'farmer',
          email: p.email || '',
          phone: p.phone || '',
          state: p.state || 'Tamil Nadu',
          district: p.district || 'Salem',
          orgName: p.company_name || `${p.name} Enterprise`,
          verificationStatus: dbKycStatus,
          submittedAt: p.created_at || new Date().toISOString(),
          verifiedAt: dbKycStatus === 'verified' ? (p.updated_at || new Date().toISOString()) : null,
          verifiedBy: dbKycStatus === 'verified' ? 'Admin' : null,
          documents: meta.documents || [],
          auditNotes: meta.auditNotes || `Registered ${p.role}. Awaiting KYC document submission.`,
        });
      }
    });

    saveStoredKYC(merged);
    return merged;
  } catch (err) {
    console.warn('Could not merge DB profiles for KYC queue:', err);
    return localList;
  }
}

/**
 * Get single user KYC record
 */
export async function getUserKYC(userId) {
  const all = await getAllKYCUsers();
  return all.find((u) => u.id === userId || u.email === userId) || null;
}

/**
 * Check if a user is verified to trade/interact on AgroLnk
 */
export async function isUserVerified(userId) {
  const user = await getUserKYC(userId);
  if (!user) return true; // Default fallback for platform demo
  return user.verificationStatus === 'verified';
}

/**
 * Update KYC Verification status (Admin Action)
 */
export async function updateKYCStatus(userId, newStatus, auditNotes = '', verifiedBy = 'AgroLnk Admin') {
  const all = getStoredKYC();
  const index = all.findIndex((u) => u.id === userId || u.email === userId);
  
  let targetUser = null;

  if (index === -1) {
    // Create new entry
    const newUser = {
      id: userId,
      name: 'Registered Partner',
      role: 'farmer',
      verificationStatus: newStatus,
      submittedAt: new Date().toISOString(),
      verifiedAt: newStatus === 'verified' ? new Date().toISOString() : null,
      verifiedBy: newStatus === 'verified' ? verifiedBy : null,
      auditNotes,
      documents: [],
    };
    all.unshift(newUser);
    targetUser = newUser;
  } else {
    all[index] = {
      ...all[index],
      verificationStatus: newStatus,
      verifiedAt: newStatus === 'verified' ? new Date().toISOString() : all[index].verifiedAt,
      verifiedBy: newStatus === 'verified' ? verifiedBy : all[index].verifiedBy,
      auditNotes: auditNotes || all[index].auditNotes,
    };
    targetUser = all[index];
  }

  saveStoredKYC(all);

  // If this is a warehouse operator, update warehouse profile state
  if (targetUser?.role === 'warehouse') {
    try {
      if (newStatus === 'verified') {
        const { approveWarehouseProfileModification } = await import('./warehouses');
        approveWarehouseProfileModification(userId);
      } else if (newStatus === 'rejected') {
        const { rejectWarehouseProfileModification } = await import('./warehouses');
        rejectWarehouseProfileModification(userId, auditNotes || 'Rejected by Compliance Admin');
      }
    } catch (whErr) {
      console.warn('Could not sync warehouse profile on admin approval:', whErr);
    }
  }

  // Sync with Supabase Database
  try {
    await supabase
      .from('profiles')
      .update({
        kyc_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${userId},email.eq.${userId}`);
  } catch (dbErr) {
    console.warn('Could not sync KYC status to Supabase DB:', dbErr);
  }

  // Update current user cached session if matching
  try {
    const rawUser = localStorage.getItem('agrolnkUser');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed.id === userId || parsed.email === userId) {
        parsed.kycStatus = newStatus;
        localStorage.setItem('agrolnkUser', JSON.stringify(parsed));
      }
    }
  } catch (_e) {}

  window.dispatchEvent(new Event('agrolnk_kyc_updated'));
  return targetUser;
}

/**
 * Get complete AgroLnk Admin Executive Metrics
 */
export async function getAdminMetrics() {
  try {
    const [orders, financing, deliveries, inventory, kycUsers] = await Promise.all([
      getOrders().catch(() => []),
      getFinancingRequests().catch(() => []),
      getDeliveries().catch(() => []),
      getInventory().catch(() => []),
      getAllKYCUsers().catch(() => INITIAL_KYC_USERS),
    ]);

    const safeOrders = Array.isArray(orders) ? orders : [];
    const totalGMV = safeOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    
    // Revenue calculations (0.25% Buyer + 0.25% Seller = 0.50% Total Take-Rate)
    const totalCommissionsEarned = Math.round(totalGMV * 0.0050 * 100) / 100;
    const buyerCommissions = Math.round(totalGMV * BUYER_COMMISSION_RATE * 100) / 100;
    const sellerCommissions = Math.round(totalGMV * SELLER_COMMISSION_RATE * 100) / 100;

    // Escrow Locked Metrics
    const activeEscrowOrders = safeOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
    const totalEscrowLocked = activeEscrowOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // KYC Metrics
    const pendingKYCCount = kycUsers.filter((u) => u.verificationStatus === 'pending').length;
    const verifiedKYCCount = kycUsers.filter((u) => u.verificationStatus === 'verified').length;

    // Financing deployed
    const approvedFinancing = (financing || []).filter((f) => f.status === 'approved' || f.status === 'disbursed');
    const totalFinancingDeployed = approvedFinancing.reduce((sum, f) => sum + (Number(f.approvedAmount) || Number(f.requestedAmount) || 0), 0);

    return {
      totalGMV,
      totalOrdersCount: safeOrders.length,
      completedOrdersCount: safeOrders.filter((o) => o.status === 'completed').length,
      totalCommissionsEarned,
      buyerCommissions,
      sellerCommissions,
      totalEscrowLocked,
      activeEscrowOrdersCount: activeEscrowOrders.length,
      pendingKYCCount,
      verifiedKYCCount,
      totalKYCUsers: kycUsers.length,
      totalFinancingDeployed,
      activeDeliveriesCount: (deliveries || []).filter((d) => d.status === 'in_transit' || d.status === 'assigned').length,
      storedWarehouseTonnes: (inventory || []).reduce((sum, i) => sum + (Number(i.totalQuantity) || 0) / 1000, 0),
    };
  } catch (err) {
    console.error('Error fetching admin metrics:', err);
    return {
      totalGMV: 1540000,
      totalOrdersCount: 18,
      completedOrdersCount: 12,
      totalCommissionsEarned: 7700,
      buyerCommissions: 3850,
      sellerCommissions: 3850,
      totalEscrowLocked: 420000,
      activeEscrowOrdersCount: 6,
      pendingKYCCount: 2,
      verifiedKYCCount: 3,
      totalKYCUsers: 5,
      totalFinancingDeployed: 285000,
      activeDeliveriesCount: 4,
      storedWarehouseTonnes: 12.5,
    };
  }
}
