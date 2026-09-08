// AgroLnk Admin & KYC Management Engine
import { supabase } from '../lib/supabase';
import { getOrders } from './orders';
import { getFinancingRequests } from './financing';
import { getDeliveries } from './deliveries';
import { getInventory } from './warehouses';
import { BUYER_COMMISSION_RATE, SELLER_COMMISSION_RATE } from './commission';

const ADMIN_KYC_STORAGE_KEY = 'agrolnk_admin_kyc_registry';

// Seed Initial KYC Verification Registry
const INITIAL_KYC_USERS = [
  {
    id: 'usr_farmer_01',
    name: 'Sakthi Vel',
    role: 'farmer',
    email: 'sakthivel@agrolnk.com',
    phone: '+91 94432 11223',
    state: 'Tamil Nadu',
    district: 'Salem',
    orgName: 'Vel Organic Farms',
    verificationStatus: 'verified', // 'pending' | 'verified' | 'rejected' | 'action_required'
    submittedAt: '2026-09-01T10:30:00.000Z',
    verifiedAt: '2026-09-01T14:15:00.000Z',
    verifiedBy: 'AgroLnk Admin (Govind)',
    documents: [
      { type: 'Aadhaar Card', number: 'XXXX-XXXX-4921', status: 'verified', fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600' },
      { type: 'Kissan Credit Passbook / Land Record', number: 'TN-SLM-84920', status: 'verified', fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600' },
      { type: 'Bank Account Cancelled Cheque', number: 'SBIN0004921', status: 'verified', fileUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600' },
    ],
    auditNotes: 'Verified landholding of 12 acres in Attur, Salem. Bank IFSC verified with SBI.',
  },
  {
    id: 'usr_buyer_02',
    name: 'Ananya Agro Foods',
    role: 'buyer',
    email: 'procurement@ananyaagro.com',
    phone: '+91 98840 55667',
    state: 'Tamil Nadu',
    district: 'Chennai',
    orgName: 'Ananya Agro Foods Pvt Ltd',
    verificationStatus: 'verified',
    submittedAt: '2026-09-02T11:00:00.000Z',
    verifiedAt: '2026-09-02T15:30:00.000Z',
    verifiedBy: 'AgroLnk Admin (Govind)',
    documents: [
      { type: 'GSTIN Registration Certificate', number: '33AAACA1122P1Z5', status: 'verified', fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600' },
      { type: 'FSSAI Wholesale Trading License', number: '10018042000849', status: 'verified', fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600' },
      { type: 'Company PAN Card', number: 'AAACA1122P', status: 'verified', fileUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600' },
    ],
    auditNotes: 'GSTIN active on GST portal. FSSAI Central license verified valid till 2028.',
  },
  {
    id: 'usr_transporter_03',
    name: 'Vetri Logistics',
    role: 'transporter',
    email: 'dispatch@vetrilogistics.com',
    phone: '+91 94433 77889',
    state: 'Tamil Nadu',
    district: 'Namakkal',
    orgName: 'Vetri Transport Fleet Ltd',
    verificationStatus: 'pending',
    submittedAt: '2026-09-04T09:20:00.000Z',
    verifiedAt: null,
    verifiedBy: null,
    documents: [
      { type: 'All-India National Goods Carriage Permit', number: 'TN-28-NP-2024-9182', status: 'pending', fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600' },
      { type: 'Commercial Vehicle Fitness & Insurance', number: 'TN 28 AB 4092', status: 'pending', fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600' },
      { type: 'Driver Commercial Badge / DL', number: 'DL-TN28-2012004921', status: 'pending', fileUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600' },
    ],
    auditNotes: 'Submitted fleet of 14 multi-axle refrigerated trucks. Awaiting National Permit verification.',
  },
  {
    id: 'usr_warehouse_04',
    name: 'Salem Agro Cold Storage',
    role: 'warehouse',
    email: 'operations@salemcoldchain.in',
    phone: '+91 97890 22334',
    state: 'Tamil Nadu',
    district: 'Salem',
    orgName: 'Salem Agro Cold Hub & Silos',
    verificationStatus: 'pending',
    submittedAt: '2026-09-04T14:45:00.000Z',
    verifiedAt: null,
    verifiedBy: null,
    documents: [
      { type: 'WDRA Accreditation Certificate', number: 'WDRA-TN-SLM-2023-084', status: 'pending', fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600' },
      { type: 'NABL Certified Lab Testing License', number: 'NABL-TC-8492', status: 'pending', fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600' },
      { type: 'Warehouse Insurance Policy (Fire & Spoilage)', number: 'OIC-AGR-9482910', status: 'pending', fileUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600' },
    ],
    auditNotes: 'WDRA 5000 MT capacity cold chamber. Telemetry inspection report uploaded.',
  },
  {
    id: 'usr_financier_05',
    name: 'Kisan Capital Partners',
    role: 'financier',
    email: 'creditdesk@kisancapital.com',
    phone: '+91 98400 99112',
    state: 'Tamil Nadu',
    district: 'Chennai',
    orgName: 'Kisan Capital NBFC Ltd',
    verificationStatus: 'verified',
    submittedAt: '2026-08-28T09:00:00.000Z',
    verifiedAt: '2026-08-28T12:00:00.000Z',
    verifiedBy: 'AgroLnk Compliance Board',
    documents: [
      { type: 'RBI NBFC Registration Certificate', number: 'RBI-NBFC-ND-SI-49218', status: 'verified', fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600' },
      { type: 'Board Trade Finance Authorization Resolution', number: 'KCP-BR-2026-01', status: 'verified', fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600' },
    ],
    auditNotes: 'RBI Grade-A NBFC with platform earmarked liquidity pool of ₹1,00,00,000.',
  },
];

function getStoredKYC() {
  try {
    const raw = localStorage.getItem(ADMIN_KYC_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ADMIN_KYC_STORAGE_KEY, JSON.stringify(INITIAL_KYC_USERS));
      return INITIAL_KYC_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_KYC_USERS;
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
          documents: meta.documents || [
            { type: 'Aadhaar / Identity Document', number: 'Uploaded Document', status: dbKycStatus, fileName: 'Identity_Proof.pdf', format: 'PDF', fileUrl: '' }
          ],
          auditNotes: meta.auditNotes || `Registered ${p.role}. Awaiting KYC verification.`,
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
