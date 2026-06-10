import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('app/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function measureSequential() {
  const emailLower = 'ssrcreations41@gmail.com';
  
  console.log("Starting sequential measurement...");

  const tables = [
    'users',
    'ledger_entries',
    'transactions',
    'tasks',
    'super_admin_ledger',
    'refining_transfers',
    'login_settings'
  ];

  for (const table of tables) {
    const start = Date.now();
    try {
      let query = supabase.from(table).select('*');
      if (table === 'users') {
        query = supabase.from('users').select('*').eq('email', emailLower);
      } else if (table === 'super_admin_ledger') {
        query = supabase.from('super_admin_ledger').select('*').order('created_at', { ascending: false });
      } else if (table === 'refining_transfers') {
        query = supabase.from('refining_transfers').select('*').eq('status', 'Pending').order('created_at', { ascending: false });
      } else if (table === 'login_settings') {
        query = supabase.from('login_settings').select('*').eq('id', 'login_allowed');
      }

      const { data, error } = await query;
      const elapsed = Date.now() - start;
      if (error) {
        console.log(`Table '${table}' took ${elapsed}ms | FAILED: ${error.message}`);
      } else {
        console.log(`Table '${table}' took ${elapsed}ms | SUCCESS: ${data?.length || 0} rows`);
      }
    } catch (err) {
      console.log(`Table '${table}' threw error in ${Date.now() - start}ms:`, err);
    }
  }
}

measureSequential();
