import pkg from 'pg';
const { Client } = pkg;

async function setup() {
  const client = new Client({
    user: process.env.DB_USER || 'postgres.quqcfbairoevddjcxiyi',
    host: process.env.DB_HOST || 'aws-1-ap-south-1.pooler.supabase.com',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '6543'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    console.log("Creating deletion_requests table...");
    
    await client.query(`
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
    `);

    console.log("Table created successfully!");

  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    await client.end();
  }
}

setup();
