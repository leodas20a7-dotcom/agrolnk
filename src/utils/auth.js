// AgroLnk Supabase Authentication & Profile Management Layer
import { supabase } from '../lib/supabase';

const AGROLNK_USER_KEY = 'agrolnkUser';
const IS_AUTH_KEY = 'isAuthenticated';

export const DEFAULT_DEMO_USERS = [];

/**
 * Cryptographic Password Hashing using Web Crypto PBKDF2 (SHA-256)
 */
export async function hashPassword(password, saltHex = null) {
  if (!password || typeof password !== 'string') return { hash: '', salt: '' };
  try {
    const enc = new TextEncoder();
    let salt;
    if (saltHex && typeof saltHex === 'string' && saltHex.length === 32) {
      salt = new Uint8Array(saltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
    } else {
      salt = (typeof window !== 'undefined' && window.crypto?.getRandomValues)
        ? window.crypto.getRandomValues(new Uint8Array(16))
        : (typeof crypto !== 'undefined' && crypto.getRandomValues)
        ? crypto.getRandomValues(new Uint8Array(16))
        : new Uint8Array(16).fill(7);
    }

    const subtle = (typeof window !== 'undefined' && window.crypto?.subtle)
      || (typeof crypto !== 'undefined' && crypto.subtle);

    if (subtle) {
      const keyMaterial = await subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );
      const hash = Array.from(new Uint8Array(derivedBits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const finalSalt = Array.from(salt)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return { hash, salt: finalSalt };
    }
  } catch (err) {
    console.warn('WebCrypto PBKDF2 fallback:', err);
  }

  // Fallback deterministic salt & hash if subtle is unavailable
  const fallbackSalt = saltHex || 'agrolnk_sec_salt_v1';
  let hashVal = 0;
  const combined = `${password}:${fallbackSalt}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hashVal = (hashVal << 5) - hashVal + char;
    hashVal |= 0;
  }
  return { hash: Math.abs(hashVal).toString(16), salt: fallbackSalt };
}

export async function verifyPassword(password, expectedHash, saltHex) {
  if (!password || !expectedHash) return false;
  const { hash } = await hashPassword(password, saltHex);
  return hash === expectedHash;
}

/**
 * Register a new user in Supabase Profiles & Supabase Auth
 */
export async function registerUser({ name, phone, email, password, role, state, district, companyName }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const rawPhone = (phone || '').trim();
  const normalizedPhoneDigits = rawPhone.replace(/\D/g, '').slice(-10);
  const trimmedPassword = (password || '').trim();

  if (!trimmedPassword || trimmedPassword.length < 6) {
    throw new Error('Password is required and must be at least 6 characters.');
  }

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

    const { hash: passwordHash, salt: passwordSalt } = await hashPassword(trimmedPassword);

    // Attempt native Supabase Auth user registration
    try {
      await supabase.auth.signUp({
        email: normalizedEmail,
        password: trimmedPassword,
        options: {
          data: {
            name: (name || '').trim(),
            phone: rawPhone,
            role: role || 'farmer',
          },
        },
      });
    } catch (authErr) {
      console.warn('Supabase auth.signUp notice:', authErr?.message || authErr);
    }

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
      meta: {
        password_hash: passwordHash,
        password_salt: passwordSalt,
      },
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
  const trimmedPassword = (password || '').trim();

  // 1. Password must be mandatory
  if (!trimmedPassword) {
    throw new Error('Please enter your password to sign in.');
  }

  // 2. Built-in Admin account authentication (Password protected)
  if (normalizedEmail === 'admin@agrolnk.com' || normalizedEmail === 'admin') {
    const validAdminPasswords = ['admin123', 'admin@agrolnk2026', 'admin'];
    if (!validAdminPasswords.includes(trimmedPassword)) {
      throw new Error('Invalid administrator password. Access denied.');
    }
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

    // 3. Query Supabase by phone or email (case-insensitive)
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

    // 4. Offline / local resilience fallback
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
                meta: match.meta || {},
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

    // 5. Authenticate Password with Supabase Auth or WebCrypto PBKDF2
    let authenticatedBySupabaseAuth = false;
    if (profile.email) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: trimmedPassword,
        });
        if (!authErr && authData?.session) {
          authenticatedBySupabaseAuth = true;
        }
      } catch (authException) {
        console.warn('Supabase Auth signIn attempt notice:', authException?.message || authException);
      }
    }

    if (!authenticatedBySupabaseAuth) {
      // Check stored password hash in profile.meta
      const meta = (typeof profile.meta === 'object' && profile.meta) ? profile.meta : {};
      const storedHash = meta.password_hash;
      const storedSalt = meta.password_salt;

      if (storedHash && storedSalt) {
        const isValid = await verifyPassword(trimmedPassword, storedHash, storedSalt);
        if (!isValid) {
          throw new Error('Incorrect password. Please verify your credentials and try again.');
        }
      } else {
        // Legacy account created before password enforcement:
        // Set this provided password as their permanent credentials going forward
        if (trimmedPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const { hash: newHash, salt: newSalt } = await hashPassword(trimmedPassword);
        const updatedMeta = { ...meta, password_hash: newHash, password_salt: newSalt };
        profile.meta = updatedMeta;

        try {
          await supabase
            .from('profiles')
            .update({ meta: updatedMeta, updated_at: new Date().toISOString() })
            .eq('id', profile.id);
        } catch (updateErr) {
          console.warn('Failed to persist legacy account password to profile meta:', updateErr);
        }

        // Also attempt background sync to Supabase Auth
        try {
          await supabase.auth.signUp({
            email: profile.email,
            password: trimmedPassword,
            options: {
              data: {
                name: profile.name,
                phone: profile.phone,
                role: profile.role,
              },
            },
          });
        } catch {}
      }
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
    try {
      supabase.auth.signOut().catch(() => {});
    } catch {}
  } catch (err) {
    console.error('Failed to logout:', err);
  }
}

// Synchronize Supabase server-side session termination with client state
if (typeof window !== 'undefined') {
  try {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(AGROLNK_USER_KEY);
        localStorage.removeItem(IS_AUTH_KEY);
      }
    });
  } catch {}
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
