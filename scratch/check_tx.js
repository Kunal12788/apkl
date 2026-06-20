import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'app/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: tasks } = await supabase.from('tasks').select('*').limit(10);
  console.log('Tasks:', tasks.length);
}

check();
