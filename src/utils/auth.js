// AGRAMAZ Prototype Authentication Layer (LocalStorage)
// Clean abstraction layer prepared for seamless future Supabase Auth migration.

const USERS_STORAGE_KEY = 'agramaz_demo_users';
const AGRAMAZ_USER_KEY = 'agramazUser';
const IS_AUTH_KEY = 'isAuthenticated';

// Pre-seeded demo accounts for quick testing
const DEFAULT_DEMO_USERS = [
  {
    id: 'usr_farmer_01',
    name: 'Sakthi Vel',
    email: 'farmer@agramaz.com',
    phone: '+91 98765 43210',
    role: 'farmer',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_buyer_02',
    name: 'Ananya Agro Foods',
    email: 'buyer@agramaz.com',
    phone: '+91 98450 12345',
    role: 'buyer',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_financier_03',
    name: 'Kisan Capital Partners',
    email: 'financier@agramaz.com',
    phone: '+91 97110 56789',
    role: 'financier',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_transporter_04',
    name: 'Vetri Logistics & Transport',
    email: 'transporter@agramaz.com',
    phone: '+91 94433 77889',
    role: 'transporter',
    vehicleType: '14ft Eicher Truck (4 Tonne)',
    vehicleNumber: 'TN 28 AB 4092',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_warehouse_05',
    name: 'Salem Agri Cold Storage Hub',
    email: 'warehouse@agramaz.com',
    phone: '+91 98940 33221',
    role: 'warehouse',
    facilityType: 'WDRA Certified Cold Storage',
    facilityCode: 'WH-TN-SLM-008',
    createdAt: new Date().toISOString(),
  },
];

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_USERS));
      return DEFAULT_DEMO_USERS;
    }
    const parsed = JSON.parse(raw);
    const existingList = Array.isArray(parsed) ? parsed : [];
    
    // Ensure all default demo users exist in the stored list
    let updated = false;
    DEFAULT_DEMO_USERS.forEach((demoUser) => {
      const found = existingList.some(
        (u) => u.email.toLowerCase() === demoUser.email.toLowerCase() || u.id === demoUser.id
      );
      if (!found) {
        existingList.push(demoUser);
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(existingList));
    }

    return existingList;
  } catch {
    return DEFAULT_DEMO_USERS;
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users in localStorage:', err);
  }
}

/**
 * Register a new user in LocalStorage
 */
export function registerUser({ name, phone, email, role }) {
  const users = getStoredUsers();
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Check if user already exists
  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
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

  const newUser = {
    id: generateId(),
    name: (name || '').trim(),
    phone: phone ? phone.trim() : '',
    email: normalizedEmail,
    role: role || 'farmer',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Set active session
  setCurrentUser(newUser);
  return newUser;
}

/**
 * Login user by email
 */
export function loginUser({ email, password }) {
  const users = getStoredUsers();
  const normalizedEmail = (email || '').trim().toLowerCase();

  // 1. Check in stored users
  let user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  
  // 2. Check in DEFAULT_DEMO_USERS
  if (!user) {
    user = DEFAULT_DEMO_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (user) {
      users.push(user);
      saveUsers(users);
    }
  }

  // 3. Check in active session
  if (!user) {
    const currentStored = getCurrentUser();
    if (currentStored && currentStored.email?.toLowerCase() === normalizedEmail) {
      user = currentStored;
    }
  }

  if (!user) {
    throw new Error("We couldn't sign you in. Please check your email and try again.");
  }

  setCurrentUser(user);
  return user;
}

/**
 * Set active user session
 */
export function setCurrentUser(user) {
  try {
    localStorage.setItem(AGRAMAZ_USER_KEY, JSON.stringify(user));
    localStorage.setItem(IS_AUTH_KEY, 'true');
    if (user?.role) {
      localStorage.setItem('selectedRole', user.role);
    }
  } catch (err) {
    console.error('Failed to set session:', err);
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  try {
    const session = localStorage.getItem(AGRAMAZ_USER_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
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
    localStorage.removeItem(AGRAMAZ_USER_KEY);
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
