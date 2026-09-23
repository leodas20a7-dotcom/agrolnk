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
  const rawPhone = (phone || '').trim();
  const normalizedPhoneDigits = rawPhone.replace(/\D/g, '').slice(-10);

  try {
    let supabaseEmailChecked = false;
    let supabasePhoneChecked = false;

    // 1. Check if email already exists in Supabase
    if (normalizedEmail) {
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!checkError) {
        supabaseEmailChecked = true;
        if (existing) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
      }
    }

    // 2. Check if mobile number already exists in Supabase
    if (normalizedPhoneDigits && normalizedPhoneDigits.length >= 10) {
      const { data: phoneMatches, error: phoneErr } = await supabase
        .from('profiles')
        .select('id, phone, email')
        .ilike('phone', `%${normalizedPhoneDigits}%`);

      if (!phoneErr) {
        supabasePhoneChecked = true;
        if (phoneMatches && phoneMatches.length > 0) {
          const duplicatePhone = phoneMatches.find((p) => {
            const pDigits = (p.phone || '').replace(/\D/g, '').slice(-10);
            return pDigits === normalizedPhoneDigits;
          });
          if (duplicatePhone) {
            throw new Error('This mobile number is already registered with another account. Please sign in or use a different mobile number.');
          }
        }
      }
    }

    // 3. Sync & Clean up local KYC registry
    try {
      const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
      if (storedRaw) {
        let registry = JSON.parse(storedRaw);
        if (Array.isArray(registry)) {
          // If Supabase checked and confirmed the email is NOT in the database,
          // purge any orphaned/stale entry from local registry so it doesn't falsely block registration.
          if (supabaseEmailChecked && normalizedEmail) {
            registry = registry.filter(
              (u) => (u.email || '').trim().toLowerCase() !== normalizedEmail
            );
            localStorage.setItem('agrolnk_admin_kyc_registry', JSON.stringify(registry));
          } else if (!supabaseEmailChecked && normalizedEmail) {
            // Offline fallback check only if Supabase could not be contacted
            const dupEmail = registry.find((u) => (u.email || '').trim().toLowerCase() === normalizedEmail);
            if (dupEmail) {
              throw new Error('An account with this email already exists. Please sign in instead.');
            }
          }

          if (supabasePhoneChecked && normalizedPhoneDigits && normalizedPhoneDigits.length >= 10) {
            registry = registry.filter((u) => {
              const uDigits = (u.phone || '').replace(/\D/g, '').slice(-10);
              return uDigits !== normalizedPhoneDigits;
            });
            localStorage.setItem('agrolnk_admin_kyc_registry', JSON.stringify(registry));
          } else if (!supabasePhoneChecked && normalizedPhoneDigits && normalizedPhoneDigits.length >= 10) {
            const dupPhone = registry.find((u) => {
              const uDigits = (u.phone || '').replace(/\D/g, '').slice(-10);
              return uDigits === normalizedPhoneDigits;
            });
            if (dupPhone) {
              throw new Error('This mobile number is already registered with another account. Please sign in or use a different mobile number.');
            }
          }
        }
      }
    } catch (regErr) {
      if (regErr.message && (regErr.message.includes('already exists') || regErr.message.includes('already registered'))) {
        throw regErr;
      }
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
      phone: rawPhone,
      email: normalizedEmail,
      role: role || 'farmer',
      state: (state || '').trim(),
      district: (district || '').trim(),
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
          orgName: newProfile.company_name || '',
          verificationStatus: 'pending',
          submittedAt: new Date().toISOString(),
          verifiedAt: null,
          verifiedBy: null,
          documents: [],
          auditNotes: 'Newly registered participant. Awaiting document submission & admin verification.',
        });
        localStorage.setItem('agrolnk_admin_kyc_registry', JSON.stringify(registry));
      }
    } catch (regErr) {
      console.warn('Could not sync to admin registry:', regErr);
    }

    // 4. Insert into Supabase (with fallback if offline)
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
 * Login user by email or mobile number from Supabase Profiles (with resilient fallback)
 */
export async function loginUser({ email, password }) {
  const rawInput = (email || '').trim();
  const normalizedEmail = rawInput.toLowerCase();
  const phoneDigits = rawInput.replace(/\D/g, '').slice(-10);
  const isPhone = phoneDigits.length >= 10 && !rawInput.includes('@');

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
    let profile = null;

    // 1. Query Supabase by phone or email (case-insensitive)
    if (isPhone) {
      const { data: byPhone, error: phoneErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('phone', `%${phoneDigits}%`)
        .maybeSingle();

      if (!phoneErr && byPhone) {
        profile = byPhone;
      }
    }

    if (!profile) {
      const { data: byEmail, error: emailErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (!emailErr && byEmail) {
        profile = byEmail;
      }
    }

    // 2. Offline / local resilience fallback
    if (!profile) {
      try {
        const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
        if (storedRaw) {
          const registry = JSON.parse(storedRaw);
          if (Array.isArray(registry)) {
            const match = registry.find((u) => {
              const uEmail = (u.email || '').trim().toLowerCase();
              const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
              return (
                (normalizedEmail && uEmail === normalizedEmail) ||
                (isPhone && uPhone === phoneDigits)
              );
            });

            if (match) {
              profile = {
                id: match.id,
                name: match.name,
                email: match.email,
                phone: match.phone,
                role: match.role,
                state: match.state,
                district: match.district,
                company_name: match.orgName || match.companyName,
                kyc_status: match.verificationStatus || 'pending',
                created_at: match.submittedAt || new Date().toISOString(),
              };
            }
          }
        }
      } catch {}
    }

    if (!profile) {
      throw new Error(
        isPhone
          ? "We couldn't find an account registered with this mobile number. Please check the number or register."
          : "We couldn't find an account with this email. Please check your spelling or register a new account."
      );
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

    try {
      window.dispatchEvent(new CustomEvent('agrolnk_user_profile_updated', { detail: userObj }));
      window.dispatchEvent(new Event('storage'));
    } catch {}

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
 * Resolve latest KYC verification status from local registry or cached session
 */
export function getResolvedUserKycStatus(user) {
  if (!user) return 'pending';
  if (user.role === 'admin') return 'verified';

  // 1. Direct status check on user object if already verified
  if (user.kycStatus === 'verified' || user.verificationStatus === 'verified' || user.kyc_status === 'verified') {
    return 'verified';
  }

  // 2. Check local KYC registry (updated by Admin approvals)
  try {
    const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
    if (storedRaw) {
      const registry = JSON.parse(storedRaw);
      if (Array.isArray(registry)) {
        const regUser = registry.find(
          (u) =>
            (user.id && u.id === user.id) ||
            (user.email && (u.email || '').toLowerCase() === (user.email || '').toLowerCase())
        );
        if (regUser?.verificationStatus) {
          return regUser.verificationStatus;
        }
      }
    }
  } catch {}

  // 3. Check warehouse profiles cache for warehouse users
  if (user.role === 'warehouse' && typeof localStorage !== 'undefined') {
    try {
      const rawWp = localStorage.getItem('agrolnk_warehouse_profiles');
      const wpProfiles = rawWp ? JSON.parse(rawWp) : {};
      const found = (user.id && wpProfiles[user.id]) || (user.email && wpProfiles[user.email]);
      if (found?.verificationStatus) {
        return found.verificationStatus;
      }
    } catch {}
  }

  // 4. Check cached user in session
  try {
    const raw = localStorage.getItem(AGROLNK_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        (user.id && parsed.id === user.id) ||
        (user.email && (parsed.email || '').toLowerCase() === (user.email || '').toLowerCase())
      ) {
        if (parsed.kycStatus) return parsed.kycStatus;
        if (parsed.verificationStatus) return parsed.verificationStatus;
        if (parsed.kyc_status) return parsed.kyc_status;
      }
    }
  } catch {}

  return user.kycStatus || user.verificationStatus || user.kyc_status || 'pending';
}

/**
 * Check if user's KYC verification is approved
 */
export function isUserKycVerified(user) {
  if (!user) return false;
  return getResolvedUserKycStatus(user) === 'verified';
}

/**
 * Fetch latest profile for current user from Supabase & KYC Registry
 */
export async function fetchCurrentProfile() {
  const current = getCurrentUser();
  if (!current?.id && !current?.email) return null;

  let kycStatus = getResolvedUserKycStatus(current);

  try {
    const filter = current.id
      ? `id.eq.${current.id}${current.email ? `,email.eq.${current.email}` : ''}`
      : `email.eq.${current.email}`;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .or(filter)
      .maybeSingle();

    if (profile && !error) {
      const resolvedKyc = profile.kyc_status || kycStatus;
      const userObj = {
        ...current,
        id: profile.id || current.id,
        name: profile.name || current.name,
        email: profile.email || current.email,
        phone: profile.phone || current.phone,
        role: profile.role || current.role,
        state: profile.state || current.state,
        district: profile.district || current.district,
        companyName: profile.company_name || current.companyName,
        kycStatus: resolvedKyc,
        verificationStatus: resolvedKyc,
        createdAt: profile.created_at,
      };
      setCurrentUser(userObj);
      return userObj;
    }
  } catch (err) {
    console.warn('fetchCurrentProfile notice:', err);
  }

  // Update session if status has changed
  if (current && (current.kycStatus !== kycStatus || current.verificationStatus !== kycStatus)) {
    current.kycStatus = kycStatus;
    current.verificationStatus = kycStatus;
    setCurrentUser(current);
  }

  return current;
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
