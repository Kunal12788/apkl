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

async function measureLoginPerf() {
  const emailLower = 'ssrcreations41@gmail.com';
  const passkey = 'superadminpass'; // Mock super admin credential for testing

  console.log("Starting login performance measurement...");

  // Measure Auth
  const t0 = Date.now();
  try {
    const { data: authData, error: authErrorRes } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password: passkey,
    });
    const authTime = Date.now() - t0;
    if (authErrorRes) {
      console.log(`Auth request completed in ${authTime}ms with ERROR: ${authErrorRes.message}`);
    } else {
      console.log(`Auth request (signInWithPassword) completed in ${authTime}ms successfully.`);
    }
  } catch (err) {
    console.error(`Auth request threw error in ${Date.now() - t0}ms:`, err);
  }

  // Measure individual table queries in parallel to see which one is slow
  const queries = [
    { name: 'users', query: supabase.from('users').select('*').eq('email', emailLower).maybeSingle() },
    { name: 'ledger_entries', query: supabase.from('ledger_entries').select('*') },
    { name: 'transactions', query: supabase.from('transactions').select('*') },
    { name: 'tasks', query: supabase.from('tasks').select('*') },
    { name: 'super_admin_ledger', query: supabase.from('super_admin_ledger').select('*').order('created_at', { ascending: false }) },
    { name: 'refining_transfers', query: supabase.from('refining_transfers').select('*').eq('status', 'Pending').order('created_at', { ascending: false }) },
    { name: 'login_settings', query: supabase.from('login_settings').select('*').eq('id', 'login_allowed').maybeSingle() }
  ];

  console.log("\nMeasuring table queries...");
  await Promise.all(queries.map(async (q) => {
    const start = Date.now();
    try {
      const res = await q.query;
      const elapsed = Date.now() - start;
      if (res.error) {
        console.log(`Table query '${q.name}' took ${elapsed}ms | STATUS: FAILED (${res.error.message})`);
      } else {
        const count = Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0);
        console.log(`Table query '${q.name}' took ${elapsed}ms | STATUS: SUCCESS (${count} records returned)`);
      }
    } catch (err) {
      console.error(`Table query '${q.name}' threw error in ${Date.now() - start}ms:`, err);
    }
  }));
}

measureLoginPerf();
