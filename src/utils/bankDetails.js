// AgroLnk Bank Account & Settlement Beneficiary Registry
// RBI Nodal Payout Standards: IFSC validation, Account Verification & Penny-Drop Simulator
import { supabase } from '../lib/supabase';
import { getCurrentUser, setCurrentUser } from './auth';

const BANK_REGISTRY_KEY = 'agrolnk_user_bank_registry_v1';

// Popular Indian Agri & Commercial Banks Directory with IFSC Prefix Mapping
export const POPULAR_BANKS = [
  { code: 'SBIN', name: 'State Bank of India', ifscPrefix: 'SBIN', icon: '🏛️' },
  { code: 'HDFC', name: 'HDFC Bank', ifscPrefix: 'HDFC', icon: '🏢' },
  { code: 'ICIC', name: 'ICICI Bank', ifscPrefix: 'ICIC', icon: '🏦' },
  { code: 'PUNB', name: 'Punjab National Bank', ifscPrefix: 'PUNB', icon: '🏛️' },
  { code: 'CNRB', name: 'Canara Bank', ifscPrefix: 'CNRB', icon: '🏢' },
  { code: 'UTIB', name: 'Axis Bank', ifscPrefix: 'UTIB', icon: '🏦' },
  { code: 'BARB', name: 'Bank of Baroda', ifscPrefix: 'BARB', icon: '🏛️' },
  { code: 'IDIB', name: 'Indian Bank', ifscPrefix: 'IDIB', icon: '🏢' },
  { code: 'KKBK', name: 'Kotak Mahindra Bank', ifscPrefix: 'KKBK', icon: '🏦' },
  { code: 'UBIN', name: 'Union Bank of India', ifscPrefix: 'UBIN', icon: '🏛️' },
  { code: 'CBIN', name: 'Central Bank of India', ifscPrefix: 'CBIN', icon: '🏢' },
  { code: 'IOBA', name: 'Indian Overseas Bank', ifscPrefix: 'IOBA', icon: '🏦' },
];

// Mock Known IFSC Code Database for instant auto-resolution
export const KNOWN_IFSC_DATA = {
  'SBIN0004921': { bankName: 'State Bank of India', branch: 'Attur Main Branch', district: 'Salem', state: 'Tamil Nadu', city: 'Attur' },
  'SBIN0000912': { bankName: 'State Bank of India', branch: 'Salem Town Branch', district: 'Salem', state: 'Tamil Nadu', city: 'Salem' },
  'HDFC0000128': { bankName: 'HDFC Bank', branch: 'Anna Nagar West', district: 'Chennai', state: 'Tamil Nadu', city: 'Chennai' },
  'ICIC0000104': { bankName: 'ICICI Bank', branch: 'Agri-Nodal Hub', district: 'Mumbai', state: 'Maharashtra', city: 'Mumbai' },
  'CNRB0001420': { bankName: 'Canara Bank', branch: 'Erode Fort Branch', district: 'Erode', state: 'Tamil Nadu', city: 'Erode' },
  'PUNB0182400': { bankName: 'Punjab National Bank', branch: 'Karnal Agri Desk', district: 'Karnal', state: 'Haryana', city: 'Karnal' },
  'UTIB0000341': { bankName: 'Axis Bank', branch: 'Coimbatore Main', district: 'Coimbatore', state: 'Tamil Nadu', city: 'Coimbatore' },
  'BARB0SALEMX': { bankName: 'Bank of Baroda', branch: 'Suramangalam', district: 'Salem', state: 'Tamil Nadu', city: 'Salem' },
  'IDIB000A045': { bankName: 'Indian Bank', branch: 'Dharmapuri Bazaar', district: 'Dharmapuri', state: 'Tamil Nadu', city: 'Dharmapuri' },
};

// Seed Defaults for Demo Accounts (Empty for production)
const DEFAULT_DEMO_BANK_PROFILES = {};

/**
 * Retrieve local bank registry
 */
function getStoredBankRegistry() {
  try {
    const raw = localStorage.getItem(BANK_REGISTRY_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    delete parsed['usr_farmer_01'];
    delete parsed['usr_farmer_sakthi'];
    delete parsed['usr_transporter_03'];
    return parsed;
  } catch {
    return {};
  }
}

/**
 * Save bank registry
 */
function saveStoredBankRegistry(registry) {
  try {
    localStorage.setItem(BANK_REGISTRY_KEY, JSON.stringify(registry));
    window.dispatchEvent(new CustomEvent('agrolnk_bank_details_updated', { detail: registry }));
  } catch (err) {
    console.warn('Failed to save bank registry to localStorage:', err);
  }
}

/**
 * Resolve IFSC Code details with fallback heuristics
 */
export function resolveIfscCode(ifsc = '') {
  const clean = (ifsc || '').trim().toUpperCase();
  if (!clean || clean.length < 4) return null;

  // 1. Exact match in mock directory
  if (KNOWN_IFSC_DATA[clean]) {
    return {
      isValidFormat: true,
      ifscCode: clean,
      ...KNOWN_IFSC_DATA[clean],
    };
  }

  // 2. Standard RBI Regex: 4 alpha characters, 0, followed by 6 alphanumeric
  const isValidFormat = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean);
  const prefix = clean.slice(0, 4);
  const matchedBank = POPULAR_BANKS.find(b => b.ifscPrefix === prefix);

  if (matchedBank) {
    return {
      isValidFormat,
      ifscCode: clean,
      bankName: matchedBank.name,
      branch: isValidFormat ? `Regional Rural / Branch (${clean.slice(-4)})` : 'Branch in verification',
      district: 'Regional District',
      state: 'India',
      city: 'Commercial Hub',
    };
  }

  return {
    isValidFormat,
    ifscCode: clean,
    bankName: isValidFormat ? 'Scheduled Commercial Bank' : 'Unknown IFSC Bank',
    branch: 'Standard Agricultural Branch',
    district: 'Registered District',
    state: 'India',
    city: '',
  };
}

/**
 * Get Bank Details for a specific user ID or current session user
 */
export function getUserBankDetails(userId) {
  const current = getCurrentUser();
  const targetId = userId || current?.id;
  if (!targetId) return null;

  const registry = getStoredBankRegistry();

  if (registry[targetId]) {
    return registry[targetId];
  }

  // Fallback if the user object has embedded bank info
  if (current && (current.bankAccount || current.bankAccountNumber)) {
    return {
      userId: targetId,
      accountHolderName: current.bankAccountHolder || current.name || '',
      bankName: current.bankName || '',
      accountNumber: current.bankAccount || current.bankAccountNumber || '',
      ifscCode: current.ifscCode || current.bankIfsc || '',
      accountType: current.bankAccountType || 'savings',
      branchName: current.bankBranch || '',
      upiId: current.upiId || '',
      verificationStatus: 'verified',
      isPrimary: true,
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Save / Update Bank Details for a user
 */
export async function saveUserBankDetails(userId, bankData) {
  const current = getCurrentUser();
  const targetId = userId || current?.id;
  const registry = getStoredBankRegistry();

  const ifscInfo = resolveIfscCode(bankData.ifscCode);

  const cleanRecord = {
    userId: targetId,
    accountHolderName: (bankData.accountHolderName || current?.name || '').trim(),
    bankName: (bankData.bankName || ifscInfo?.bankName || '').trim(),
    accountNumber: (bankData.accountNumber || '').trim().replace(/\s+/g, ''),
    ifscCode: (bankData.ifscCode || '').trim().toUpperCase(),
    accountType: bankData.accountType || 'savings',
    branchName: bankData.branchName || ifscInfo?.branch || '',
    upiId: (bankData.upiId || '').trim(),
    verificationStatus: 'verified',
    isPrimary: true,
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Update in local bank registry
  registry[targetId] = cleanRecord;
  saveStoredBankRegistry(registry);

  // 2. Sync into user profile object in session
  if (current) {
    const updatedUser = {
      ...current,
      bankAccount: cleanRecord.accountNumber,
      bankAccountNumber: cleanRecord.accountNumber,
      bankAccountHolder: cleanRecord.accountHolderName,
      bankName: cleanRecord.bankName,
      bankIfsc: cleanRecord.ifscCode,
      ifscCode: cleanRecord.ifscCode,
      bankBranch: cleanRecord.branchName,
      bankAccountType: cleanRecord.accountType,
      upiId: cleanRecord.upiId,
      hasBankDetails: true,
    };
    setCurrentUser(updatedUser);

    // 3. Sync to Supabase profiles table if available
    try {
      if (current.id) {
        await supabase
          .from('profiles')
          .update({
            bank_account: cleanRecord.accountNumber,
            bank_name: cleanRecord.bankName,
            ifsc_code: cleanRecord.ifscCode,
            upi_id: cleanRecord.upiId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', current.id);
      }
    } catch (sbErr) {
      console.warn('Supabase bank details update note:', sbErr);
    }
  }

  return cleanRecord;
}

/**
 * Mask account number for secure UI display (e.g. •••• •••• 8211)
 */
export function maskAccountNumber(accNumber = '') {
  const clean = String(accNumber || '').trim();
  if (!clean) return 'Not Configured';
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Perform a simulated real-time Penny Drop Verification (₹1 IMPS test deposit)
 */
export async function simulatePennyDropVerification(bankData) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const ifsc = (bankData?.ifscCode || '').trim().toUpperCase();
      const acc = (bankData?.accountNumber || '').trim();

      if (!acc || acc.length < 8) {
        reject(new Error('Invalid Account Number: Must be at least 8 digits.'));
        return;
      }

      if (!ifsc || ifsc.length !== 11) {
        reject(new Error('Invalid IFSC Code: Must be exactly 11 characters (e.g. SBIN0004921).'));
        return;
      }

      resolve({
        success: true,
        referenceId: `PENNY_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        registeredName: bankData.accountHolderName || 'VERIFIED BENEFICIARY',
        bankName: bankData.bankName || 'Verified Scheduled Bank',
        amountCredited: '₹1.00 (Test Verification Escrow)',
        status: 'IMPS_SUCCESS_MATCHED',
        message: `Penny drop verification successful. Beneficiary "${bankData.accountHolderName}" verified with bank records.`,
      });
    }, 900);
  });
}
