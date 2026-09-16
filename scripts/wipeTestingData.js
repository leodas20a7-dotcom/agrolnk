// Node script to wipe Supabase testing data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipe() {
  console.log('Clearing testing tables from Supabase...');
  const tables = [
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
    'notifications'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.log(`Table ${table} notice:`, error.message);
      } else {
        console.log(`Table ${table} cleaned.`);
      }
    } catch (e) {
      console.log(`Error on ${table}:`, e.message);
    }
  }

  try {
    const { error: profError } = await supabase
      .from('profiles')
      .delete()
      .neq('role', 'admin')
      .neq('email', 'admin@agrolnk.com');
    if (profError) {
      console.log('Profiles cleanup notice:', profError.message);
    } else {
      console.log('Non-admin profiles cleaned.');
    }
  } catch (e) {
    console.log('Error on profiles:', e.message);
  }

  console.log('Done!');
}

wipe();
