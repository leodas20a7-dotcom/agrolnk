// AgrowLink Admin & KYC Management Engine
import { supabase } from '../lib/supabase';
import { getOrders } from './orders';
import { getFinancingRequests } from './financing';
import { getDeliveries } from './deliveries';
import { getInventory } from './warehouses';
import { BUYER_COMMISSION_RATE, SELLER_COMMISSION_RATE } from './commission';

const ADMIN_KYC_STORAGE_KEY = 'agrolnk_admin_kyc_registry';
const INITIAL_KYC_USERS = [];

if (typeof window !== 'undefined' && window.localStorage) {
  try {
    localStorage.removeItem(ADMIN_KYC_STORAGE_KEY);
  } catch {}
}

/**
 * Extract and synthesize all user documents strictly from authoritative database profile & meta
 */
export function extractUserDocuments(p) {
  if (!p) return [];
  const meta = p.meta || {};

  const docNames = {
    ...(p.documentNames || {}),
    ...(meta.pendingChanges?.documentNames || {}),
    ...(meta.documentNames || {}),
  };
  const docUrls = {
    ...(p.documentUrls || {}),
    ...(meta.pendingChanges?.documentUrls || {}),
    ...(meta.documentUrls || {}),
  };

  const enrichDocUrl = (doc) => {
    if (doc.fileUrl) return doc;
    const typeLower = (doc.type || '').toLowerCase();
    let resolvedUrl = '';
    if (typeLower.includes('wdra') || typeLower.includes('warehouse')) {
      resolvedUrl = docUrls.wdraCert || '';
    } else if (typeLower.includes('gst') || typeLower.includes('commercial')) {
      resolvedUrl = docUrls.gstinCert || '';
    } else if (typeLower.includes('insurance') || typeLower.includes('fssai')) {
      resolvedUrl = docUrls.insuranceCert || docUrls.transitInsurance || '';
    } else if (typeLower.includes('driver') || typeLower.includes('license') || typeLower.includes('dl')) {
      resolvedUrl = docUrls.drivingLicense || '';
    } else if (typeLower.includes('permit') || typeLower.includes('vehicle') || typeLower.includes('rc')) {
      resolvedUrl = docUrls.vehiclePermit || '';
    }
    return {
      ...doc,
      fileUrl: resolvedUrl || doc.fileUrl || '',
    };
  };

  // 1. Direct meta.documents or p.documents array
  if (Array.isArray(meta.documents) && meta.documents.length > 0) {
    return meta.documents.map(enrichDocUrl);
  }
  if (Array.isArray(p.documents) && p.documents.length > 0) {
    return p.documents.map(enrichDocUrl);
  }

  // 2. Synthesize from documentUrls / documentNames
  const docs = [];
  if (docNames.wdraCert || docUrls.wdraCert) {
    docs.push({
      type: 'WDRA Accreditation Certificate',
      number: meta.wdraCode || p.wdraCode || 'WDRA Submitted',
      status: p.verificationStatus || p.kyc_status || 'pending',
      fileUrl: docUrls.wdraCert || '',
      fileName: docNames.wdraCert || 'wdra_accreditation_certificate.png',
    });
  }
  if (docNames.gstinCert || docUrls.gstinCert) {
    docs.push({
      type: 'GST / Commercial Storage License',
      number: meta.gstin || p.gstin || 'GST Submitted',
      status: p.verificationStatus || p.kyc_status || 'pending',
      fileUrl: docUrls.gstinCert || '',
      fileName: docNames.gstinCert || 'gst_certificate.pdf',
    });
  }
  if (docNames.insuranceCert || docUrls.insuranceCert) {
    docs.push({
      type: 'Storage Facility Insurance / FSSAI',
      number: 'Insured Facility',
      status: p.verificationStatus || p.kyc_status || 'pending',
      fileUrl: docUrls.insuranceCert || '',
      fileName: docNames.insuranceCert || 'insurance_policy.pdf',
    });
  }

  // 3. Transporter fleet documents
  if (docNames.drivingLicense || docUrls.drivingLicense) {
    docs.push({
      type: 'Commercial Driver License / Badge',
      number: meta.licenseNumber || p.licenseNumber || 'DL Verified',
      status: p.verificationStatus || p.kyc_status || 'pending',
      fileUrl: docUrls.drivingLicense || '',
      fileName: docNames.drivingLicense || 'commercial_driver_license.pdf',
    });
  }
  if (docNames.vehiclePermit || docUrls.vehiclePermit) {
    docs.push({
      type: 'National Goods Carriage Permit',
      number: meta.permitNumber || p.permitNumber || 'NP Verified',
      status: p.verificationStatus || p.kyc_status || 'pending',
      fileUrl: docUrls.vehiclePermit || '',
      fileName: docNames.vehiclePermit || 'all_india_permit.pdf',
    });
  }
  if (docNames.transitInsurance || docUrls.transitInsurance) {
    docs.push({
      type: 'Goods-in-Transit Cargo Insurance',
      number: 'Cargo Policy #9482',
      status: p.verificationStatus || p.kyc_status || 'pending',
      fileUrl: docUrls.transitInsurance || '',
      fileName: docNames.transitInsurance || 'transit_insurance_policy.pdf',
    });
  }

  return docs;
}

/**
 * Get all users with KYC status strictly from authoritative Supabase profiles table
 */
export async function getAllKYCUsers() {
  try {
    const { data: dbProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(dbProfiles)) {
      return [];
    }

    return dbProfiles.map((p) => {
      const dbKycStatus = p.kyc_status || 'pending';
      const meta = p.meta || {};
      const resolvedDocs = extractUserDocuments(p);

      return {
        id: p.id,
        name: p.name || 'Registered Partner',
        role: p.role || 'farmer',
        email: p.email || '',
        phone: p.phone || '',
        state: p.state || 'Tamil Nadu',
        district: p.district || 'Salem',
        orgName: p.company_name || `${p.name || 'Partner'} Enterprise`,
        verificationStatus: dbKycStatus,
        submittedAt: p.created_at || new Date().toISOString(),
        verifiedAt: dbKycStatus === 'verified' ? (p.updated_at || new Date().toISOString()) : null,
        verifiedBy: dbKycStatus === 'verified' ? 'Admin' : null,
        documents: resolvedDocs,
        auditNotes: meta.auditNotes || `Registered ${p.role || 'user'}.`,
        vanStatus: (() => {
          const candidate = p.van_status || meta.van_status;
          if (candidate === 'rejected') return 'rejected';
          if (candidate === 'active') return 'active';
          if (dbKycStatus === 'verified') return 'active';
          return candidate || 'pending_bank_approval';
        })(),
        virtualAccountNumber: p.virtual_account_number || meta.virtual_account_number || '',
        virtualAccountIfsc: p.virtual_account_ifsc || meta.virtual_account_ifsc || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_IFSC) || '',
        vanBankName: p.van_bank_name || meta.van_bank_name || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_BANK_NAME) || 'Escrow Nodal Bank',
        vanNotes: meta.van_notes || '',
        bankDetails: meta.bankDetails || p.bank_details || null,
      };
    });
  } catch (err) {
    console.warn('Could not fetch DB profiles for KYC queue:', err);
    return [];
  }
}

/**
 * Get single user KYC record strictly from Supabase profiles
 */
export async function getUserKYC(userId) {
  if (!userId) return null;
  const all = await getAllKYCUsers();
  return all.find((u) => u.id === userId || u.email === userId) || null;
}

/**
 * Check if a user is verified to trade/interact on AgrowLink (Fail Closed)
 */
export async function isUserVerified(userId) {
  const user = await getUserKYC(userId);
  if (!user) return false;
  return user.verificationStatus === 'verified';
}

/**
 * Build a safe Supabase filter matching either profile id or email
 */
function buildProfileLookupQuery(query, identifier) {
  const clean = String(identifier || '').trim();
  if (clean.includes('@')) {
    return query.ilike('email', clean);
  }
  return query.eq('id', clean);
}

/**
 * Update a profile row with graceful fallback if optional VAN columns are absent.
 * Throws if Supabase rejects the write or updates 0 rows (e.g. RLS denial).
 */
async function updateProfileRowSafely(userId, buildPayloads) {
  const { data: currentProf, error: readErr } = await buildProfileLookupQuery(
    supabase.from('profiles').select('id, meta'),
    userId
  )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr) {
    throw new Error(readErr.message || 'Could not locate user profile in database.');
  }
  if (!currentProf?.id) {
    throw new Error('User profile row was not found in Supabase.');
  }

  const existingMeta = currentProf.meta || {};
  const { fullPayload, minimalPayload } = buildPayloads(existingMeta);

  let { data: updatedRows, error: updateErr } = await supabase
    .from('profiles')
    .update(fullPayload)
    .eq('id', currentProf.id)
    .select('id, kyc_status');

  if (updateErr) {
    const msg = String(updateErr.message || '');
    const isMissingColumn =
      updateErr.code === 'PGRST204' ||
      updateErr.code === '42703' ||
      msg.toLowerCase().includes('column');

    if (isMissingColumn) {
      const retry = await supabase
        .from('profiles')
        .update(minimalPayload)
        .eq('id', currentProf.id)
        .select('id, kyc_status');
      updatedRows = retry.data;
      updateErr = retry.error;
    }
  }

  if (updateErr) {
    throw new Error(updateErr.message || 'Database rejected profile update.');
  }
  if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
    throw new Error('Permission denied: Admin update did not modify the database record (check Supabase is_admin() / RLS).');
  }

  return updatedRows[0];
}

/**
 * Update KYC Verification status (Server-Enforced Admin RPC)
 */
export async function updateKYCStatus(userId, newStatus, auditNotes = '', verifiedBy = 'AgrowLink Admin') {
  const vanStatusUpdate =
    newStatus === 'verified'
      ? 'active'
      : newStatus === 'rejected'
        ? 'rejected'
        : 'pending_bank_approval';

  const nowIso = new Date().toISOString();

  // 1. Primary path: Server-enforced SECURITY DEFINER RPC
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_update_kyc_status_atomic', {
    p_user_id: String(userId),
    p_new_status: newStatus,
    p_audit_notes: auditNotes || null,
  });

  if (rpcErr) {
    // Fallback to direct DB update only if the RPC migration hasn't been executed yet (still protected by RLS & trigger)
    if (rpcErr.code === 'PGRST202' || String(rpcErr.message || '').includes('admin_update_kyc_status_atomic')) {
      await updateProfileRowSafely(userId, (existingMeta) => {
        const mergedMeta = {
          ...existingMeta,
          van_status: vanStatusUpdate,
          verificationStatus: newStatus,
          hasPendingReview: false,
          ...(auditNotes ? { auditNotes } : {}),
        };
        return {
          fullPayload: {
            kyc_status: newStatus,
            van_status: vanStatusUpdate,
            meta: mergedMeta,
            updated_at: nowIso,
          },
          minimalPayload: {
            kyc_status: newStatus,
            meta: mergedMeta,
            updated_at: nowIso,
          },
        };
      });
    } else {
      throw new Error(rpcErr.message || 'Server rejected KYC status update.');
    }
  }

  const targetUser = {
    id: rpcRes?.id || userId,
    role: rpcRes?.role || 'farmer',
    verificationStatus: newStatus,
    vanStatus: rpcRes?.van_status || vanStatusUpdate,
    verifiedAt: newStatus === 'verified' ? nowIso : null,
    verifiedBy: newStatus === 'verified' ? verifiedBy : null,
    auditNotes,
  };

  if (targetUser.role === 'warehouse') {
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

  window.dispatchEvent(new Event('agrolnk_kyc_updated'));
  window.dispatchEvent(new Event('agrolnk_user_profile_updated'));
  return targetUser;
}

/**
 * Update User Virtual Account Number (VAN) Banking Provision (Server-Enforced Admin RPC)
 */
export async function updateUserVANProvision(userId, {
  vanStatus = 'active',
  virtualAccountNumber = '',
  virtualAccountIfsc = '',
  vanBankName = '',
  vanNotes = '',
}) {
  const nowIso = new Date().toISOString();

  const updatedData = {
    vanStatus,
    virtualAccountNumber: (virtualAccountNumber || '').trim().toUpperCase(),
    virtualAccountIfsc: (virtualAccountIfsc || '').trim().toUpperCase(),
    vanBankName: (vanBankName || '').trim(),
    vanNotes: (vanNotes || '').trim(),
    vanAssignedAt: nowIso,
  };

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_update_van_provision_atomic', {
    p_user_id: String(userId),
    p_van_status: vanStatus,
    p_virtual_account_number: updatedData.virtualAccountNumber,
    p_virtual_account_ifsc: updatedData.virtualAccountIfsc || '',
    p_van_bank_name: updatedData.vanBankName || '',
    p_van_notes: updatedData.vanNotes,
  });

  if (rpcErr) {
    if (rpcErr.code === 'PGRST202' || String(rpcErr.message || '').includes('admin_update_van_provision_atomic')) {
      await updateProfileRowSafely(userId, (existingMeta) => {
        const mergedMeta = {
          ...existingMeta,
          van_status: vanStatus,
          virtual_account_number: updatedData.virtualAccountNumber,
          virtual_account_ifsc: updatedData.virtualAccountIfsc,
          van_bank_name: updatedData.vanBankName,
          van_notes: updatedData.vanNotes,
          van_assigned_at: updatedData.vanAssignedAt,
        };
        return {
          fullPayload: {
            van_status: vanStatus,
            virtual_account_number: updatedData.virtualAccountNumber,
            virtual_account_ifsc: updatedData.virtualAccountIfsc,
            van_bank_name: updatedData.vanBankName,
            van_notes: updatedData.vanNotes,
            van_assigned_at: updatedData.vanAssignedAt,
            meta: mergedMeta,
            updated_at: nowIso,
          },
          minimalPayload: {
            meta: mergedMeta,
            updated_at: nowIso,
          },
        };
      });
    } else {
      throw new Error(rpcErr.message || 'Server rejected VAN provisioning update.');
    }
  }

  window.dispatchEvent(new Event('agrolnk_kyc_updated'));
  window.dispatchEvent(new Event('agrolnk_user_profile_updated'));
  return {
    id: rpcRes?.id || userId,
    ...updatedData,
    virtualAccountNumber: rpcRes?.virtual_account_number || updatedData.virtualAccountNumber,
  };
}

/**
 * Get complete AgrowLink Admin Executive Metrics
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

    const rawOrders = (Array.isArray(orders) ? orders : []).filter(
      (o) => o.status !== 'cancelled' && o.status !== 'deleted'
    );
    const seenAdminRfqLots = new Set();
    const safeOrders = [...rawOrders]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter((o) => {
        const isUnquotedRfq =
          (o.status === 'awaiting_freight_quote' || Boolean(o.awaitingFreightQuote)) &&
          !o.freightAmount;
        if (isUnquotedRfq) {
          const key = `${o.listingId || ''}_${o.commodity || ''}_${o.variety || ''}_${o.buyerId || o.buyerName || ''}_${o.farmerName || ''}`;
          if (seenAdminRfqLots.has(key)) return false;
          seenAdminRfqLots.add(key);
        }
        return true;
      });

    const isUnpaidOrder = (o) =>
      o.status === 'awaiting_freight_quote' ||
      o.status === 'freight_quoted' ||
      o.escrowStatus === 'awaiting_freight_quote' ||
      o.escrowStatus === 'freight_quoted' ||
      o.escrowStatus === 'pending' ||
      o.escrowStatus === 'pending_verification' ||
      o.status === 'pending' ||
      o.status === 'payment_verification_pending';

    const fundedOrders = safeOrders.filter((o) => !isUnpaidOrder(o));
    const totalGMV = fundedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    
    // Revenue calculations (0.25% Buyer + 0.25% Seller = 0.50% Total Take-Rate)
    const totalCommissionsEarned = Math.round(totalGMV * 0.0050 * 100) / 100;
    const buyerCommissions = Math.round(totalGMV * BUYER_COMMISSION_RATE * 100) / 100;
    const sellerCommissions = Math.round(totalGMV * SELLER_COMMISSION_RATE * 100) / 100;

    // Escrow Locked Metrics (exclude completed, cancelled, and unpaid/pending orders)
    const activeEscrowOrders = fundedOrders.filter((o) => o.status !== 'completed');
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
      totalGMV: 0,
      totalOrdersCount: 0,
      completedOrdersCount: 0,
      totalCommissionsEarned: 0,
      buyerCommissions: 0,
      sellerCommissions: 0,
      totalEscrowLocked: 0,
      activeEscrowOrdersCount: 0,
      pendingKYCCount: 0,
      verifiedKYCCount: 0,
      totalKYCUsers: 0,
      totalFinancingDeployed: 0,
      activeDeliveriesCount: 0,
      storedWarehouseTonnes: 0,
    };
  }
}

/**
 * Create a new user in Supabase profiles from Admin Settings (Server-Enforced)
 */
export async function createAdminUser(userData) {
  const userId = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const kycStatus = userData.verificationStatus || userData.kycStatus || 'pending';
  const role = userData.role || 'farmer';
  const name = userData.name || 'New User';
  const email = (userData.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@agrowlink.local`).trim().toLowerCase();
  const phone = (userData.phone || '9876543210').trim();
  const normalizedPhoneDigits = phone.replace(/\D/g, '').slice(-10);
  const state = userData.state || 'Tamil Nadu';
  const district = userData.district || 'Salem';
  const companyName = userData.orgName || userData.companyName || userData.farmName || `${name} Agri`;

  if (email) {
    const { data: existingEmail, error: emailErr } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();
    if (!emailErr && existingEmail) {
      throw new Error('An account with this email already exists.');
    }
  }

  if (normalizedPhoneDigits && normalizedPhoneDigits.length >= 10) {
    const { data: phoneMatches, error: phoneErr } = await supabase
      .from('profiles')
      .select('id, phone')
      .ilike('phone', `%${normalizedPhoneDigits}%`);
    if (!phoneErr && Array.isArray(phoneMatches)) {
      const hasMatch = phoneMatches.some((p) => (p.phone || '').replace(/\D/g, '').slice(-10) === normalizedPhoneDigits);
      if (hasMatch) {
        throw new Error('This mobile number is already registered with another account.');
      }
    }
  }

  const { data: inserted, error } = await supabase
    .from('profiles')
    .upsert({
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
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Server rejected user creation.');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agrolnk_kyc_updated'));
  }

  return {
    id: inserted.id,
    name: inserted.name,
    role: inserted.role,
    email: inserted.email,
    phone: inserted.phone,
    state: inserted.state,
    district: inserted.district,
    orgName: inserted.company_name,
    company_name: inserted.company_name,
    verificationStatus: inserted.kyc_status,
    submittedAt: inserted.created_at || new Date().toISOString(),
  };
}

/**
 * Update an existing user in Supabase profiles (Server-Enforced)
 */
export async function updateAdminUser(userId, updates) {
  if (!userId) return null;

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

  const { data: updatedRow, error } = await supabase
    .from('profiles')
    .update(dbUpdate)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Server rejected profile update.');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agrolnk_kyc_updated'));
    window.dispatchEvent(new Event('agrolnk_user_profile_updated'));
  }

  return updatedRow || updates;
}

/**
 * Delete a user from Supabase profiles (Server-Enforced)
 */
export async function deleteAdminUser(userId) {
  if (!userId) return false;

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    throw new Error(error.message || 'Server rejected profile deletion.');
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

