import pkg from 'pg';
const { Client } = pkg;

async function run() {
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
    
    console.log("Creating stock_allocations...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.stock_allocations (
          id TEXT PRIMARY KEY,
          branch_id TEXT NOT NULL,
          branch_name TEXT NOT NULL,
          staff_id TEXT,
          metal TEXT DEFAULT 'Gold',
          pure_weight NUMERIC(10,3) DEFAULT 0.000,
          cash_amount NUMERIC(15,2) DEFAULT 0.00,
          allocated_by TEXT NOT NULL,
          date TEXT NOT NULL,
          iso_date DATE NOT NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
    `);
    
    console.log("Creating branch_daily_reports...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.branch_daily_reports (
          id TEXT PRIMARY KEY,
          branch_id TEXT NOT NULL,
          branch_name TEXT NOT NULL,
          staff_id TEXT NOT NULL,
          date TEXT NOT NULL,
          iso_date DATE NOT NULL,
          
          opening_pure_gold NUMERIC(10,3) DEFAULT 0.000,
          opening_pure_silver NUMERIC(10,3) DEFAULT 0.000,
          opening_cash NUMERIC(15,2) DEFAULT 0.00,
          
          gold_used NUMERIC(10,3) DEFAULT 0.000,
          silver_used NUMERIC(10,3) DEFAULT 0.000,
          cash_used NUMERIC(15,2) DEFAULT 0.00,
          
          cash_received NUMERIC(15,2) DEFAULT 0.00,
          impure_gold_received NUMERIC(10,3) DEFAULT 0.000,
          impure_silver_received NUMERIC(10,3) DEFAULT 0.000,
          
          closing_pure_gold NUMERIC(10,3) DEFAULT 0.000,
          closing_pure_silver NUMERIC(10,3) DEFAULT 0.000,
          closing_cash NUMERIC(15,2) DEFAULT 0.00,
          
          status TEXT DEFAULT 'Submitted',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
    `);

    console.log("Setting RLS...");
    await client.query(`ALTER TABLE public.stock_allocations ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE public.branch_daily_reports ENABLE ROW LEVEL SECURITY;`);
    
    await client.query(`DROP POLICY IF EXISTS "Allow authenticated full access" ON public.stock_allocations;`);
    await client.query(`DROP POLICY IF EXISTS "Allow authenticated full access" ON public.branch_daily_reports;`);
    
    await client.query(`CREATE POLICY "Allow authenticated full access" ON public.stock_allocations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');`);
    await client.query(`CREATE POLICY "Allow authenticated full access" ON public.branch_daily_reports FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');`);

    console.log("Successfully created tables and RLS.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
