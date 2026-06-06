import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('app/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFakeData() {
  const { data: tasks } = await supabase.from('tasks').select('*').limit(5);
  console.log('Tasks:', tasks);

  const { data: tx } = await supabase.from('transactions').select('*').limit(5);
  console.log('Transactions:', tx);

  const { data: ledger } = await supabase.from('ledger_entries').select('*').limit(5);
  console.log('Ledger:', ledger);
}

checkFakeData();
