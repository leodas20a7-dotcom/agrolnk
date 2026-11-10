// AgroLnk Supabase Authentication & Profile Management Layer

import { supabase } from '../lib/supabase';



const AGROLNK_USER_KEY = 'agrolnkUser';

const IS_AUTH_KEY = 'isAuthenticated';



export const DEFAULT_DEMO_USERS = [];

/**
 * Helper to resolve consistent VAN status from profile record
 */
function resolveProfileVanStatus(profile) {
  if (!profile) return 'pending_bank_approval';
  const candidate = profile.van_status || profile.meta?.van_status;
  if (candidate === 'rejected') return 'rejected';
  if (candidate === 'active') return 'active';
  if (profile.kyc_status === 'verified') return 'active';
  return candidate || 'pending_bank_approval';
}



/**

 * Register a new user in Supabase Profiles & Supabase Auth

 */

export async function registerUser({ name, phone, email, password, role, state, district, companyName }) {

  const normalizedEmail = (email || '').trim().toLowerCase();

  const rawPhone = (phone || '').trim();

  const normalizedPhoneDigits = rawPhone.replace(/\D/g, '').slice(-10);

  const trimmedPassword = (password || '').trim();



  // Security: Block unauthorized self-registration as platform administrator

  const requestedRole = (role || 'farmer').toLowerCase().trim();

  if (requestedRole === 'admin') {

    throw new Error('Self-registration as platform administrator is strictly prohibited.');

  }



  if (!trimmedPassword || trimmedPassword.length < 6) {

    throw new Error('Password is required and must be at least 6 characters.');

  }

  try {
    let supabaseEmailChecked = false;

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

    // 2. Mobile number enumeration check removed for privacy

    // 3. Sync & Clean up local KYC registry
    try {
      const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
      if (storedRaw) {
        let registry = JSON.parse(storedRaw);
        if (Array.isArray(registry)) {
          if (supabaseEmailChecked && normalizedEmail) {
            registry = registry.filter(
              (u) => (u.email || '').trim().toLowerCase() !== normalizedEmail
            );
            localStorage.setItem('agrolnk_admin_kyc_registry', JSON.stringify(registry));
          } else if (!supabaseEmailChecked && normalizedEmail) {
            const dupEmail = registry.find((u) => (u.email || '').trim().toLowerCase() === normalizedEmail);
            if (dupEmail) {
              throw new Error('An account with this email already exists. Please sign in instead.');
            }
          }

          if (normalizedPhoneDigits && normalizedPhoneDigits.length >= 10) {
            registry = registry.filter((u) => {
              const uDigits = (u.phone || '').replace(/\D/g, '').slice(-10);
              return uDigits !== normalizedPhoneDigits;
            });
            localStorage.setItem('agrolnk_admin_kyc_registry', JSON.stringify(registry));
          }
        }
      }
    } catch (regErr) {
      if (regErr.message && (regErr.message.includes('already exists') || regErr.message.includes('already registered'))) {
        throw regErr;
      }
    }

    // 4. Attempt native Supabase Auth user registration (Fail Closed)
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: normalizedEmail,

      password: trimmedPassword,

      options: {

        data: {

          name: (name || '').trim(),

          phone: rawPhone,

          role: requestedRole,

        },

      },

    });



    if (authErr) {

      if (

        authErr.message &&

        (authErr.message.toLowerCase().includes('already registered') ||

          authErr.message.toLowerCase().includes('already exists'))

      ) {

        throw new Error('An account with this email already exists. Please sign in instead.');

      }

      throw new Error(authErr.message || 'Registration failed. Could not create account in authentication service.');

    }



    const authUserId = authData?.user?.id;

    if (!authUserId) {

      throw new Error('Registration failed: no valid user identity was returned by the authentication service.');

    }



    // Unify Profile ID strictly with authentic Supabase Auth UID (profiles.id = auth.users.id)

    const newProfile = {

      id: authUserId,

      name: (name || '').trim(),

      phone: rawPhone,

      email: normalizedEmail,

      role: requestedRole,

      state: (state || '').trim(),

      district: (district || '').trim(),

      company_name: companyName || '',

      kyc_status: 'pending',

      meta: {}, // Zero password hashes stored in public profiles

      created_at: new Date().toISOString(),

      updated_at: new Date().toISOString(),

    };



    // Sync into local Admin KYC Registry cache

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

      console.warn('Could not sync to admin registry cache:', regErr);

    }



    // 4. Insert into Supabase Profiles table (Fail Closed - strictly verified)

    const { data, error: insertError } = await supabase

      .from('profiles')

      .insert([newProfile])

      .select()

      .maybeSingle();



    if (insertError) {

      // Check if profile was inserted by trigger or already exists

      const { data: existingProfile } = await supabase

        .from('profiles')

        .select('*')

        .eq('id', authUserId)

        .maybeSingle();



      if (!existingProfile) {

        console.error('Profile insertion error:', insertError);

        throw new Error(`Authentication succeeded, but profile creation failed: ${insertError.message}`);

      }



      const userObj = {
        id: existingProfile.id,
        name: existingProfile.name,
        email: existingProfile.email,
        phone: existingProfile.phone,
        role: existingProfile.role,
        state: existingProfile.state || '',
        district: existingProfile.district || '',
        address: existingProfile.address || '',
        pincode: existingProfile.pincode || '',
        landmark: existingProfile.landmark || '',
        companyName: existingProfile.company_name || '',
        kycStatus: existingProfile.kyc_status || 'pending',
        verificationStatus: existingProfile.kyc_status || 'pending',
        vanStatus: resolveProfileVanStatus(existingProfile),
        virtualAccountNumber: existingProfile.virtual_account_number || existingProfile.meta?.virtual_account_number || '',
        virtualAccountIfsc: existingProfile.virtual_account_ifsc || existingProfile.meta?.virtual_account_ifsc || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_IFSC) || 'ICIC0000104',
        vanBankName: existingProfile.van_bank_name || existingProfile.meta?.van_bank_name || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_BANK_NAME) || 'ICICI Bank Ltd.',
        vanNotes: existingProfile.van_notes || existingProfile.meta?.van_notes || '',
        createdAt: existingProfile.created_at,
      };
      setCurrentUser(userObj);
      return userObj;
    }

    const createdRecord = data || newProfile;
    const userObj = {
      id: createdRecord.id,
      name: createdRecord.name,
      email: createdRecord.email,
      phone: createdRecord.phone,
      role: createdRecord.role,
      state: createdRecord.state || '',
      district: createdRecord.district || '',
      address: createdRecord.address || '',
      pincode: createdRecord.pincode || '',
      landmark: createdRecord.landmark || '',
      companyName: createdRecord.company_name || '',
      kycStatus: createdRecord.kyc_status || 'pending',
      verificationStatus: createdRecord.kyc_status || 'pending',
      vanStatus: resolveProfileVanStatus(createdRecord),
      virtualAccountNumber: createdRecord.virtual_account_number || createdRecord.meta?.virtual_account_number || '',
      virtualAccountIfsc: createdRecord.virtual_account_ifsc || createdRecord.meta?.virtual_account_ifsc || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_IFSC) || 'ICIC0000104',
      vanBankName: createdRecord.van_bank_name || createdRecord.meta?.van_bank_name || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_BANK_NAME) || 'ICICI Bank Ltd.',
      vanNotes: createdRecord.van_notes || createdRecord.meta?.van_notes || '',
      createdAt: createdRecord.created_at,
    };



    setCurrentUser(userObj);

    return userObj;

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



  try {

    let targetEmail = normalizedEmail;



    // 2. If phone number entered, resolve to authoritative email via Secure RPC

    if (isPhone) {

      try {

        const { data: resolvedEmail } = await supabase.rpc('authenticate_phone_credentials', {
          p_phone: phoneDigits,
          p_password: password,
        });

        if (resolvedEmail) {

          targetEmail = resolvedEmail.toLowerCase();

        } else {

          // Fallback: check local KYC registry if offline/mock

          try {

            const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');

            if (storedRaw) {

              const registry = JSON.parse(storedRaw);

              if (Array.isArray(registry)) {

                const match = registry.find(

                  (u) => (u.phone || '').replace(/\D/g, '').slice(-10) === phoneDigits

                );

                if (match?.email) targetEmail = match.email.toLowerCase();

              }

            }

          } catch {}

        }

      } catch (rpcErr) {

        console.warn('Phone resolution notice:', rpcErr);

      }



      if (!targetEmail || targetEmail === normalizedEmail) {

        throw new Error(

          "We couldn't find an account registered with this mobile number. Please check the number or register."

        );

      }

    }



    // 3. Authenticate with Supabase Auth (authoritative server-side bcrypt verification)

    let sessionUser = null;

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({

      email: targetEmail,

      password: trimmedPassword,

    });



    if (authErr) {

      const errMsg = authErr.message?.toLowerCase() || '';

      if (

        errMsg.includes('invalid login credentials') ||

        errMsg.includes('invalid credentials') ||

        errMsg.includes('invalid grant')

      ) {

        throw new Error('Incorrect email or password. Please verify your credentials and try again.');

      }

      if (errMsg.includes('email not confirmed')) {

        throw new Error('Please confirm your email address or contact support.');

      }

      throw new Error(authErr.message || 'Login failed. Please check your credentials.');

    }



    sessionUser = authData?.user;

    if (!sessionUser) {

      throw new Error('Authentication succeeded but session could not be established.');

    }



    // 4. Session established: Fetch authorized profile row (allowed by RLS: auth.uid() = id)

    const { data: profile, error: profErr } = await supabase

      .from('profiles')

      .select('*')

      .eq('id', sessionUser.id)

      .maybeSingle();



    if (profErr) {

      console.warn('Profile retrieval notice after login:', profErr);

    }



    // Critical Security: Administrator role strictly requires authentic Supabase server session

    const resolvedRole = profile?.role || sessionUser.app_metadata?.role || sessionUser.user_metadata?.role || 'farmer';

    if (resolvedRole === 'admin') {

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData?.session) {

        throw new Error('Administrator access requires a valid, verified Supabase server session.');

      }

    }



    const userObj = {
      id: profile?.id || sessionUser.id,
      name: profile?.name || sessionUser.user_metadata?.name || 'AgroLnk Participant',
      email: profile?.email || sessionUser.email,
      phone: profile?.phone || sessionUser.user_metadata?.phone || '',
      role: resolvedRole,
      state: profile?.state || '',
      district: profile?.district || '',
      address: profile?.address || '',
      pincode: profile?.pincode || '',
      landmark: profile?.landmark || '',
      companyName: profile?.company_name || '',
      kycStatus: profile?.kyc_status || 'pending',
      verificationStatus: profile?.kyc_status || 'pending',
      vanStatus: resolveProfileVanStatus(profile),
      virtualAccountNumber: profile?.virtual_account_number || profile?.meta?.virtual_account_number || '',
      virtualAccountIfsc: profile?.virtual_account_ifsc || profile?.meta?.virtual_account_ifsc || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_IFSC) || 'ICIC0000104',
      vanBankName: profile?.van_bank_name || profile?.meta?.van_bank_name || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_BANK_NAME) || 'ICICI Bank Ltd.',
      vanNotes: profile?.van_notes || profile?.meta?.van_notes || '',
      createdAt: profile?.created_at || sessionUser.created_at,
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

 * Send password reset email via native Supabase Auth

 */

export async function sendPasswordResetEmail(email) {

  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail) {

    throw new Error('Please enter your email address to receive password reset instructions.');

  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {

    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,

  });

  if (error) {

    throw new Error(error.message || 'Failed to send password reset email.');

  }

  return true;

}

/**

 * Update password for current authenticated/recovered session

 */

export async function updateUserPassword(newPassword) {

  const trimmed = (newPassword || '').trim();

  if (!trimmed || trimmed.length < 6) {

    throw new Error('New password must be at least 6 characters.');

  }

  const { data, error } = await supabase.auth.updateUser({

    password: trimmed,

  });

  if (error) {

    throw new Error(error.message || 'Failed to update password. Please try requesting a new reset link.');

  }

  return data;

}



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
    if (!session) return null;
    const user = JSON.parse(session);
    if (!user || typeof user !== 'object') return null;

    // Hardened role guard: Block browser-tampered admin escalation
    if (user.role === 'admin') {
      const email = (user.email || '').toLowerCase().trim();
      if (email !== 'agrolnkadmin@gmail.com' && email !== 'admin@agrolnk.com') {
        user.role = 'farmer';
      }
    }
    return user;
  } catch {
    return null;
  }
}

/**
 * Resolve authoritative KYC verification status
 */
export function getResolvedUserKycStatus(user) {
  if (!user) return 'pending';

  // Admin account is verified if authenticated with legitimate administrator email
  if (user.role === 'admin') {
    const email = (user.email || '').toLowerCase().trim();
    if (email === 'agrolnkadmin@gmail.com' || email === 'admin@agrolnk.com') {
      return 'verified';
    }
  }

  // Authoritative status directly from profile record (never trusts unverified local overrides)
  const status = user.kycStatus || user.kyc_status || user.verificationStatus || 'pending';
  return status;
}

/**
 * Server-Hydrated Authentication: Reconciles browser state against live Supabase JWT & profiles table
 */
export async function syncAuthenticatedUserWithServer() {
  try {
    if (!supabase) return getCurrentUser();

    // 1. Check active cryptographic Supabase session
    let { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session?.user) {
      // If error was a transient network or rate-limit issue, preserve current cached session
      if (sessionErr) {
        return getCurrentUser();
      }
      // Attempt background token refresh
      const { data: refreshData } = await supabase.auth.refreshSession().catch(() => ({ data: {} }));
      if (refreshData?.session?.user) {
        session = refreshData.session;
      } else {
        const cached = getCurrentUser();
        const adminEmail = (cached?.email || '').toLowerCase().trim();
        // Only purge if an unverified user was claiming admin, not legitimate known administrator
        if (cached && cached.role === 'admin' && adminEmail !== 'agrolnkadmin@gmail.com' && adminEmail !== 'admin@agrolnk.com') {
          localStorage.removeItem(AGROLNK_USER_KEY);
          localStorage.removeItem(IS_AUTH_KEY);
          return null;
        }
        return cached;
      }
    }

    // 2. Fetch authoritative profile directly from database
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return getCurrentUser();
    }

    // 3. Enforce server-authoritative role verification
    let authoritativeRole = profile.role || 'farmer';
    if (authoritativeRole === 'admin') {
      const adminEmail = (profile.email || session.user.email || '').toLowerCase().trim();
      if (adminEmail !== 'agrolnkadmin@gmail.com' && adminEmail !== 'admin@agrolnk.com') {
        authoritativeRole = 'farmer';
      }
    }

    const authoritativeUser = {
      id: profile.id,
      name: profile.name || session.user.user_metadata?.name || 'AgroLnk Member',
      email: profile.email || session.user.email,
      phone: profile.phone || session.user.user_metadata?.phone || '',
      role: authoritativeRole,
      state: profile.state || '',
      district: profile.district || '',
      companyName: profile.company_name || '',
      kycStatus: profile.kyc_status || 'pending',
      verificationStatus: profile.kyc_status || 'pending',
      vanStatus: (() => {
        const candidate = profile.van_status || profile.meta?.van_status;
        if (candidate === 'rejected') return 'rejected';
        if (candidate === 'active') return 'active';
        if (profile.kyc_status === 'verified') return 'active';
        return candidate || 'pending_bank_approval';
      })(),
      virtualAccountNumber: profile.virtual_account_number || profile.meta?.virtual_account_number || '',
      virtualAccountIfsc: profile.virtual_account_ifsc || profile.meta?.virtual_account_ifsc || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_IFSC) || 'ICIC0000104',
      vanBankName: profile.van_bank_name || profile.meta?.van_bank_name || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_BANK_NAME) || 'ICICI Bank Ltd.',
      vanNotes: profile.van_notes || profile.meta?.van_notes || '',
      createdAt: profile.created_at || session.user.created_at,
    };

    // Reconcile local storage with authoritative server record
    localStorage.setItem(AGROLNK_USER_KEY, JSON.stringify(authoritativeUser));
    localStorage.setItem(IS_AUTH_KEY, 'true');
    return authoritativeUser;
  } catch (err) {
    console.warn('Authoritative profile sync notice:', err);
    return getCurrentUser();
  }
}

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

        vanStatus: (() => {
          const candidate = profile.van_status || profile.meta?.van_status || current.vanStatus;
          if (candidate === 'rejected') return 'rejected';
          if (candidate === 'active') return 'active';
          if (resolvedKyc === 'verified') return 'active';
          return candidate || 'pending_bank_approval';
        })(),

        virtualAccountNumber: profile.virtual_account_number || profile.meta?.virtual_account_number || current.virtualAccountNumber || '',

        virtualAccountIfsc: profile.virtual_account_ifsc || profile.meta?.virtual_account_ifsc || current.virtualAccountIfsc || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_IFSC) || 'ICIC0000104',

        vanBankName: profile.van_bank_name || profile.meta?.van_bank_name || current.vanBankName || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_BANK_NAME) || 'ICICI Bank Ltd.',

        vanNotes: profile.van_notes || profile.meta?.van_notes || current.vanNotes || '',

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
    localStorage.removeItem('selectedRole');
    localStorage.removeItem('agrolnk_orders_local');
    localStorage.removeItem('agrolnk_user_notifications');
    localStorage.removeItem('agrolnk_chat_threads_v4');
    localStorage.removeItem('agrolnk_financing_requests_local');
    localStorage.removeItem('agrolnk_inspection_reports');
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

