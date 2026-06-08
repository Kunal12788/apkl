const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'app/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.deletion_requests (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      requested_by TEXT,
      reason TEXT,
      status TEXT DEFAULT 'Pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable read access for all users" ON public.deletion_requests;
    CREATE POLICY "Enable read access for all users" ON public.deletion_requests FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Enable insert for all users" ON public.deletion_requests;
    CREATE POLICY "Enable insert for all users" ON public.deletion_requests FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable update for all" ON public.deletion_requests;
    CREATE POLICY "Enable update for all" ON public.deletion_requests FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Enable delete for all" ON public.deletion_requests;
    CREATE POLICY "Enable delete for all" ON public.deletion_requests FOR DELETE USING (true);
  `;

  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  console.log("Creation:", error ? error.message : "Success");
}
run();
