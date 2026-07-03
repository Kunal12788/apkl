import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('app/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPublication() {
  const { data: users, error } = await supabase.from('users').select('id, name, role, branch_id').limit(10);
  console.log('Users:', users, 'Error:', error);
}
checkPublication();
