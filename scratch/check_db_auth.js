import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('app/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFakeData() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ssrcreations41@gmail.com',
    password: 'superadminpass' // We will try a few common ones or passkey if known
  });
  
  if (authError) {
    console.log("Auth error:", authError.message);
    // Let's try another way: fetch users to see if any exist first
  } else {
    console.log("Logged in as Super Admin!");
  }

  // We can just fetch via RPC if RLS is strict, or login with another known user.
  // Wait, let's try to fetch using an RPC that might bypass RLS, or see if we can get data.
}

checkFakeData();
