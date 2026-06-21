import pkg from 'pg';
const { Client } = pkg;

async function run() {
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

    const sql = `
      -- ledger_entries table
      ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS pure_gold_in NUMERIC(10,3) DEFAULT 0.000;
      ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS pure_silver_in NUMERIC(10,3) DEFAULT 0.000;
      ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS cash_rate_per_gram NUMERIC(15,2) DEFAULT 0.00;
      ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(15,2) DEFAULT 0.00;
      ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS pending_pure_liability BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS pending_cash_liability BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS staff_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS admin_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

      -- tasks table
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cash_handling_mode TEXT DEFAULT NULL;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cash_rate_per_gram NUMERIC(15,2) DEFAULT 0.00;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(15,2) DEFAULT 0.00;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS pending_pure_liability BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS pending_cash_liability BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS staff_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS admin_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

      -- transactions table
      ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cash_rate_per_gram NUMERIC(15,2) DEFAULT 0.00;
      ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(15,2) DEFAULT 0.00;
      ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_cash_exchange BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS staff_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS admin_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `;

    console.log("Executing SQL schema alterations...");
    await client.query(sql);
    console.log("SQL schema alterations completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
