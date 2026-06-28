import pkg from 'pg';
const { Client } = pkg;

async function migrate() {
  const client = new Client({
    user: 'postgres.quqcfbairoevddjcxiyi',
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    database: 'postgres',
    password: 'MZZ+6GY4bznXSpj',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database. Starting migrations...");

    // 1. Add paid_amount column to transactions table
    console.log("Adding paid_amount column to transactions...");
    await client.query(`
      ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0.00;
    `);

    // 2. Create payments table
    console.log("Creating payments table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.payments (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        payment_method TEXT NOT NULL,
        recorded_by TEXT REFERENCES public.users(id),
        allocations JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
    `);

    // 3. Enable RLS and setup policy for payments table
    console.log("Setting up RLS policies on payments table...");
    await client.query(`
      ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow authenticated full access" ON public.payments;
      CREATE POLICY "Allow authenticated full access" ON public.payments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    `);

    console.log("Migrations executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
