// Agrolnk System Data Wipe & Fresh Start Testing Utility
import { supabase } from '../lib/supabase';

export const ADMIN_USER = {
  id: 'usr_admin_master',
  name: 'Agrolnk Administrator',
  email: 'admin@agrolnk.com',
  role: 'admin',
  kyc_status: 'verified',
  state: 'Tamil Nadu',
  district: 'Chennai',
  phone: '+91 99000 11223',
};

/**
 * Reset all product listings, orders, deliveries, financing, auctions, warehouse receipts,
 * chats, and non-admin users across both Supabase and LocalStorage.
 */
export async function resetAllTestingData() {
  console.log('🔄 Starting complete Agrolnk testing data reset...');

  // 1. Wipe Supabase Tables (if connected)
  try {
    if (supabase) {
      const tablesToClear = [
        'deliveries',
        'orders',
        'financing_requests',
        'auctions',
        'bids',
        'listings',
        'warehouse_receipts',
        'inspection_reports',
        'chat_messages',
        'messages',
        'notifications',
      ];

      for (const table of tablesToClear) {
        try {
          const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) {
            console.warn(`Supabase wipe ${table} notice:`, error.message);
          }
        } catch (tableErr) {
          console.warn(`Could not clear table ${table}:`, tableErr);
        }
      }

      // Delete non-admin profiles from Supabase
      try {
        await supabase
          .from('profiles')
          .delete()
          .neq('role', 'admin')
          .neq('email', 'admin@agrolnk.com');
      } catch (profErr) {
        console.warn('Could not clear non-admin profiles from Supabase:', profErr);
      }
    }
  } catch (dbErr) {
    console.warn('Remote Supabase reset failed or offline:', dbErr);
  }

  // 2. Wipe Local Storage Data Keys
  if (typeof localStorage !== 'undefined') {
    const keysToPurge = [
      'agrolnk_financing_requests_local',
      'agrolnk_farmer_financing_local',
      'agrolnk_margin_deposits',
      'agrolnk_escrow_fundings',
      'agrolnk_warehouse_receipts_local',
      'agrolnk_warehouse_rent_payments',
      'agrolnk_quality_inspections',
      'agrolnk_escrow_transactions_local',
      'agrolnk_escrow_events_local',
      'agrolnk_chat_threads_local',
      'agrolnk_chat_messages_local',
      'agrolnk_orders',
      'agrolnk_buyer_orders',
      'agrolnk_farmer_orders',
      'agrolnk_deliveries',
      'agrolnk_auctions',
      'agrolnk_bids',
      'agrolnk_user_bids',
      'agrolnk_listings',
      'agrolnk_custom_commodities',
      'agrolnk_fleet_local',
    ];

    keysToPurge.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });

    // Reset Admin KYC Registry to ONLY Admin
    try {
      const adminOnlyRegistry = [ADMIN_USER];
      localStorage.setItem('agrolnk_admin_kyc_registry', JSON.stringify(adminOnlyRegistry));
    } catch {}

    // Check current logged in user session
    try {
      const currentUserRaw = localStorage.getItem('agrolnkUser');
      if (currentUserRaw) {
        const parsedUser = JSON.parse(currentUserRaw);
        // If not admin, logout
        if (parsedUser.role !== 'admin' && parsedUser.email !== 'admin@agrolnk.com') {
          localStorage.removeItem('agrolnkUser');
          localStorage.removeItem('isAuthenticated');
        }
      }
    } catch {}
  }

  // 3. Dispatch global reset events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_data_reset'));
    window.dispatchEvent(new CustomEvent('agrolnk_kyc_updated'));
    window.dispatchEvent(new CustomEvent('agrolnk_financing_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }

  console.log('✅ Testing data completely wiped. Fresh start ready!');
  return true;
}
