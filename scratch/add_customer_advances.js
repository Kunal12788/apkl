import pkg from 'pg';
const { Client } = pkg;

async function runMigration() {
  const host = 'aws-1-ap-south-1.pooler.supabase.com';
  console.log(`Connecting to Supabase Database pooler at ${host}...`);

  const client = new Client({
    user: 'postgres.quqcfbairoevddjcxiyi',
    host: host,
    database: 'postgres',
    password: 'MZZ+6GY4bznXSpj',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to Supabase Database!");

    // 1. Add wallet columns to customers table
    console.log("Altering public.customers table to add advance wallet columns...");
    await client.query(`
      ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS advance_cash NUMERIC(15, 2) DEFAULT 0.00;
      ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS advance_pure_gold NUMERIC(10, 3) DEFAULT 0.000;
      ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS advance_pure_silver NUMERIC(10, 3) DEFAULT 0.000;
    `);
    console.log("Altered customers table.");

    // 2. Create customer_advances table
    console.log("Creating public.customer_advances table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.customer_advances (
          id TEXT PRIMARY KEY,
          customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
          customer_name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('Deposit', 'Withdrawal', 'Adjustment')),
          asset_type TEXT NOT NULL CHECK (asset_type IN ('Cash', 'Pure Gold', 'Pure Silver')),
          amount NUMERIC(15,3) NOT NULL,
          details TEXT,
          created_by TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Created customer_advances table.");

    // 3. Enable RLS
    console.log("Enabling RLS on customer_advances table...");
    await client.query(`
      ALTER TABLE public.customer_advances ENABLE ROW LEVEL SECURITY;
    `);

    // 4. Create RLS Policies
    await client.query(`
      DROP POLICY IF EXISTS "Allow authenticated full access" ON public.customer_advances;
    `);
    await client.query(`
      CREATE POLICY "Allow authenticated full access" ON public.customer_advances FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    `);
    console.log("Created RLS policies on customer_advances.");

    // 5. Add to realtime publication
    try {
      await client.query(`
        ALTER PUBLICATION supabase_realtime ADD TABLE customer_advances;
      `);
      console.log("Added customer_advances to supabase_realtime publication.");
    } catch (pubErr) {
      console.log("Table might already be in publication or issue adding: ", pubErr.message);
    }

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
