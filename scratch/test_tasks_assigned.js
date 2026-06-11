import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: users } = await supabase.auth.signInWithPassword({
    email: 'vikram@auroradivine.com',
    password: 'password123'
  });

  const { data: tasks } = await supabase.from('tasks').select('assigned_to');
  
  if (tasks) {
    const distinct = [...new Set(tasks.map(t => t.assigned_to))];
    console.log('Distinct assigned_to:', distinct);
  } else {
    console.log('No tasks fetched or error');
  }
}

run();
