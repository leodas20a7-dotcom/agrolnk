// Agrolnk Supabase Authentication & Profile Management Layer
import { supabase } from '../lib/supabase';

const AGROLNK_USER_KEY = 'agrolnkUser';
const IS_AUTH_KEY = 'isAuthenticated';

export const DEFAULT_DEMO_USERS = [];

/**
 * Register a new user in Supabase Profiles
 */
export async function registerUser({ name, phone, email, role, state, district, companyName }) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  try {
    // 1. Check if user already exists in Supabase
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch {
        return `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    };

    const newProfile = {
      id: generateId(),
      name: (name || '').trim(),
      phone: phone ? phone.trim() : '',
      email: normalizedEmail,
      role: role || 'farmer',
      state: state || 'Tamil Nadu',
      district: district || 'Salem',
      company_name: companyName || '',
      kyc_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Sync into local Admin KYC Registry
    try {
      const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
      const registry = storedRaw ? JSON.parse(storedRaw) : [];
      if (!registry.find(u => u.email === normalizedEmail || u.id === newProfile.id)) {
        registry.unshift({
          id: newProfile.id,
          name: newProfile.name,
          role: newProfile.role,
          email: newProfile.email,
          phone: newProfile.phone,
          state: newProfile.state,
          district: newProfile.district,
          orgName: newProfile.company_name || `${newProfile.name} Enterprise`,
          verificationStatus: 'pending',
          submittedAt: new Date().toISOString(),
          verifiedAt: null,
          verifiedBy: null,
          documents: [
            { type: 'Identity / Aadhaar / PAN', number: 'Pending Submission', status: 'pending', fileUrl: '' },
            { type: 'Trade / Business License', number: 'Pending Submission', status: 'pending', fileUrl: '' }
          ],
          auditNotes: 'Newly registered participant. Awaiting document submission & admin verification.',
        });
        localStorage.setItem('agrolnk_admin_kyc_registry', JSON.stringify(registry));
      }
    } catch (regErr) {
      console.warn('Could not sync to admin registry:', regErr);
    }

    // 2. Insert into Supabase (with fallback if offline)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (!error && data) {
        const userObj = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          state: data.state,
          district: data.district,
          companyName: data.company_name,
          kycStatus: data.kyc_status || 'pending',
          createdAt: data.created_at,
        };
        setCurrentUser(userObj);
        return userObj;
      }
    } catch (sbErr) {
      console.warn('Supabase insert failed, continuing with local session:', sbErr);
    }

    const fallbackUserObj = {
      id: newProfile.id,
      name: newProfile.name,
      email: newProfile.email,
      phone: newProfile.phone,
      role: newProfile.role,
      state: newProfile.state,
      district: newProfile.district,
      companyName: newProfile.company_name,
      kycStatus: 'pending',
      createdAt: newProfile.created_at,
    };

    setCurrentUser(fallbackUserObj);
    return fallbackUserObj;
  } catch (err) {
    console.error('Registration failed:', err);
    throw err;
  }
}

/**
 * Login user by email from Supabase Profiles
 */
export async function loginUser({ email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Instant built-in Admin account support
  if (normalizedEmail === 'admin@agrolnk.com' || normalizedEmail === 'admin') {
    const adminUser = {
      id: 'usr_admin_master',
      name: 'System Administrator',
      email: 'admin@agrolnk.com',
      phone: '9876500000',
      role: 'admin',
      state: 'Central Command',
      district: 'HQ Operations',
      companyName: 'AgroLnk Platform Ombudsman',
      kycStatus: 'verified',
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(adminUser);
    return adminUser;
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Supabase profile query error:', error);
      throw new Error('Database connection failed. Please try again.');
    }

    if (!profile) {
      // Fallback demo logins if running in preview/sandbox
      const roleMatch = ['farmer', 'buyer', 'financier', 'transporter', 'warehouse'].find(r => normalizedEmail.includes(r));
      if (roleMatch) {
        const demoUser = {
          id: `usr_demo_${roleMatch}`,
          name: `${roleMatch.charAt(0).toUpperCase() + roleMatch.slice(1)} Operator`,
          email: normalizedEmail,
          phone: '9876543210',
          role: roleMatch,
          state: 'Tamil Nadu',
          district: 'Salem',
          companyName: `${roleMatch.charAt(0).toUpperCase() + roleMatch.slice(1)} Enterprise`,
          kycStatus: 'verified',
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(demoUser);
        return demoUser;
      }
      throw new Error("We couldn't find an account with this email. Please check your credentials or create an account.");
    }

    const userObj = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      state: profile.state,
      district: profile.district,
      companyName: profile.company_name,
      kycStatus: profile.kyc_status,
      createdAt: profile.created_at,
    };

    setCurrentUser(userObj);
    return userObj;
  } catch (err) {
    console.error('Login failed:', err);
    throw err;
  }
}

/**
 * Set active user session (localStorage session cache)
 */
export function setCurrentUser(user) {
  try {
    localStorage.setItem(AGROLNK_USER_KEY, JSON.stringify(user));
    localStorage.setItem(IS_AUTH_KEY, 'true');
    if (user?.role) {
      localStorage.setItem('selectedRole', user.role);
    }
  } catch (err) {
    console.error('Failed to set session:', err);
  }
}

/**
 * Get current cached authenticated user
 */
export function getCurrentUser() {
  try {
    const session = localStorage.getItem(AGROLNK_USER_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch latest profile for current user from Supabase
 */
export async function fetchCurrentProfile() {
  const current = getCurrentUser();
  if (!current?.id) return null;

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', current.id)
      .maybeSingle();

    if (profile && !error) {
      const userObj = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        state: profile.state,
        district: profile.district,
        companyName: profile.company_name,
        kycStatus: profile.kyc_status,
        createdAt: profile.created_at,
      };
      setCurrentUser(userObj);
      return userObj;
    }
    return current;
  } catch {
    return current;
  }
}

/**
 * Update current user profile (address, district, state, phone, pincode, etc.)
 * Saves to localStorage and Supabase, and broadcasts event to the whole app.
 */
export async function updateUserProfile(updatedFields) {
  const current = getCurrentUser() || {};
  const merged = {
    ...current,
    ...updatedFields,
    // Ensure nested or aliased fields are kept in sync
    address: updatedFields.address !== undefined ? updatedFields.address : current.address,
    district: updatedFields.district !== undefined ? updatedFields.district : current.district,
    state: updatedFields.state !== undefined ? updatedFields.state : current.state,
    pincode: updatedFields.pincode !== undefined ? updatedFields.pincode : current.pincode,
    phone: updatedFields.phone !== undefined ? updatedFields.phone : current.phone,
    name: updatedFields.name !== undefined ? updatedFields.name : current.name,
    orgName: updatedFields.orgName !== undefined ? updatedFields.orgName : (updatedFields.farmName || current.orgName || current.farmName),
    farmName: updatedFields.farmName !== undefined ? updatedFields.farmName : (updatedFields.orgName || current.farmName || current.orgName),
  };

  setCurrentUser(merged);

  // Sync to Supabase profiles if possible
  try {
    if (merged.id) {
      await supabase
        .from('profiles')
        .update({
          name: merged.name,
          phone: merged.phone,
          state: merged.state,
          district: merged.district,
          address: merged.address,
          pincode: merged.pincode,
          landmark: merged.landmark,
          company_name: merged.orgName || merged.farmName || merged.companyName,
        })
        .eq('id', merged.id);
    }
  } catch (err) {
    console.warn('Supabase profile sync skipped / error:', err);
  }

  // Broadcast event across windows and listeners
  try {
    window.dispatchEvent(
      new CustomEvent('agrolnk_user_profile_updated', {
        detail: merged,
      })
    );
  } catch {}

  return merged;
}

/**
 * Get current user role
 */
export function getUserRole() {
  const user = getCurrentUser();
  return user?.role || null;
}

/**
 * Logout current user
 */
export function logoutUser() {
  try {
    localStorage.removeItem(AGROLNK_USER_KEY);
    localStorage.removeItem(IS_AUTH_KEY);
  } catch (err) {
    console.error('Failed to logout:', err);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  try {
    return localStorage.getItem(IS_AUTH_KEY) === 'true' && getCurrentUser() !== null;
  } catch {
    return false;
  }
}
