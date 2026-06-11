import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: users } = await supabase.from('users').select('*').eq('role', 'Collection Staff');
  console.log('Collection Staff Users:', users);

  if (users && users.length > 0) {
    const userId = users[0].id;
    const { data: tasks } = await supabase.from('tasks').select('*').or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
    console.log(`Tasks for ${userId}:`, tasks ? tasks.length : 0);

    const { data: tx } = await supabase.from('transactions').select('*').eq('created_by', userId);
    console.log(`Transactions by ${userId}:`, tx ? tx.length : 0);
  }
}

run();
