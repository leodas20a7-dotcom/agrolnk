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
      kyc_status: 'verified',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 2. Insert into Supabase
    const { data, error } = await supabase
      .from('profiles')
      .insert([newProfile])
      .select()
      .single();

    if (error) {
      console.error('Supabase profile insertion error:', error);
      throw new Error(error.message || 'Failed to create profile in database.');
    }

    const userObj = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      state: data.state,
      district: data.district,
      companyName: data.company_name,
      kycStatus: data.kyc_status,
      createdAt: data.created_at,
    };

    setCurrentUser(userObj);
    return userObj;
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
