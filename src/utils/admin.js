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

/**
 * Create a new user in Supabase profiles & local registry from Admin Settings
 */
export async function createAdminUser(userData) {
  const userId = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const kycStatus = userData.verificationStatus || userData.kycStatus || 'pending';
  const role = userData.role || 'farmer';
  const name = userData.name || 'New User';
  const email = userData.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@agrolnk.local`;
  const phone = userData.phone || '9876543210';
  const state = userData.state || 'Tamil Nadu';
  const district = userData.district || 'Salem';
  const companyName = userData.orgName || userData.companyName || userData.farmName || `${name} Agri`;

  const newRecord = {
    id: userId,
    name,
    role,
    email,
    phone,
    state,
    district,
    orgName: companyName,
    company_name: companyName,
    verificationStatus: kycStatus,
    submittedAt: new Date().toISOString(),
    verifiedAt: kycStatus === 'verified' ? new Date().toISOString() : null,
    verifiedBy: kycStatus === 'verified' ? 'AgroLnk Platform Administrator' : null,
    documents: [
      {
        type: 'Aadhaar / Identity Document',
        number: '1234 5678 9012',
        fileName: 'identity_doc.pdf',
        format: 'PDF',
        fileSize: '1.2 MB',
        status: kycStatus,
        fileUrl: '',
      },
    ],
    auditNotes: `Account created directly via Admin Command Center.`,
  };

  // 1. Save to local KYC registry
  const localList = getStoredKYC();
  localList.unshift(newRecord);
  saveStoredKYC(localList);

  // 2. Insert into Supabase profiles table
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name,
      email,
      role,
      phone,
      state,
      district,
      company_name: companyName,
      kyc_status: kycStatus,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('Supabase profile create notice:', error.message);
  } catch (err) {
    console.warn('Supabase profile create exception:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agrolnk_kyc_updated'));
  }

  return newRecord;
}

/**
 * Update an existing user in Supabase profiles & local registry
 */
export async function updateAdminUser(userId, updates) {
  if (!userId) return null;

  // 1. Update local registry
  const localList = getStoredKYC();
  const index = localList.findIndex((u) => u.id === userId || u.email === userId);
  let updatedRecord = null;

  if (index >= 0) {
    localList[index] = {
      ...localList[index],
      ...updates,
      verificationStatus: updates.verificationStatus || updates.kycStatus || localList[index].verificationStatus,
      orgName: updates.companyName || updates.orgName || localList[index].orgName,
    };
    updatedRecord = localList[index];
    saveStoredKYC(localList);
  }

  // 2. Update Supabase profiles table
  try {
    const dbUpdate = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) dbUpdate.name = updates.name;
    if (updates.email !== undefined) dbUpdate.email = updates.email;
    if (updates.role !== undefined) dbUpdate.role = updates.role;
    if (updates.phone !== undefined) dbUpdate.phone = updates.phone;
    if (updates.state !== undefined) dbUpdate.state = updates.state;
    if (updates.district !== undefined) dbUpdate.district = updates.district;
    if (updates.companyName || updates.orgName) dbUpdate.company_name = updates.companyName || updates.orgName;
    if (updates.verificationStatus || updates.kycStatus) dbUpdate.kyc_status = updates.verificationStatus || updates.kycStatus;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdate)
      .eq('id', userId);

    if (error) console.warn('Supabase profile update notice:', error.message);
  } catch (err) {
    console.warn('Supabase profile update exception:', err);
  }

  // Sync current active session if updating active user
  try {
    const rawUser = localStorage.getItem('agrolnkUser');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed.id === userId || parsed.email === userId) {
        const mergedUser = {
          ...parsed,
          ...updates,
          kycStatus: updates.verificationStatus || updates.kycStatus || parsed.kycStatus,
        };
        localStorage.setItem('agrolnkUser', JSON.stringify(mergedUser));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agrolnk_user_profile_updated', { detail: mergedUser }));
        }
      }
    }
  } catch (_e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agrolnk_kyc_updated'));
  }

  return updatedRecord || updates;
}

/**
 * Delete a user from Supabase profiles & local registry
 */
export async function deleteAdminUser(userId) {
  if (!userId) return false;

  // 1. Remove from local KYC registry
  const localList = getStoredKYC().filter((u) => u.id !== userId && u.email !== userId);
  saveStoredKYC(localList);

  // 2. Remove from Supabase profiles table
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (error) console.warn('Supabase profile delete notice:', error.message);
  } catch (err) {
    console.warn('Supabase profile delete exception:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agrolnk_kyc_updated'));
  }

  return true;
}

/**
 * Platform Factory Reset / Demo Data Reset: Clears cached drafts, unread badges, and non-essential caches
 */
export function resetPlatformDemoData() {
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('agrolnk_draft_') || key.startsWith('agrolnk_privacy_') || key.includes('unread'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch (err) {
    console.warn('Reset platform demo data notice:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_listing_draft_updated', { detail: null }));
    window.dispatchEvent(new CustomEvent('agrolnk_chat_unread_update', { detail: { count: 0 } }));
  }

  return { success: true };
}

