import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('app/.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function alterTables() {
  const tables = ['tasks', 'stock_allocations', 'transactions', 'ledger_entries', 'deletion_requests', 'branch_daily_reports', 'super_admin_ledger', 'refining_transfers'];
  
  for (const table of tables) {
    const query = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = '${table}'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};
        END IF;
      END $$;
      ALTER TABLE public.${table} REPLICA IDENTITY FULL;
    `;
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
    if (error) {
      console.error(`Error for table ${table}:`, error.message);
    } else {
      console.log(`Successfully enabled realtime & replica identity full for: ${table}`);
    }
  }
}

alterTables();
