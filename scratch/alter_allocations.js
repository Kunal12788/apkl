import pkg from 'pg';
const { Client } = pkg;

async function run() {
  const host = 'aws-1-ap-south-1.pooler.supabase.com';
  const client = new Client({
    user: process.env.DB_USER || 'postgres.quqcfbairoevddjcxiyi',
    host: host,
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '6543'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to Supabase DB. Altering stock_allocations...");
    await client.query(`
      ALTER TABLE public.stock_allocations 
      ADD COLUMN IF NOT EXISTS staff_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      
      ALTER TABLE public.stock_allocations 
      ADD COLUMN IF NOT EXISTS admin_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);
    console.log("Columns staff_submitted_at and admin_submitted_at added successfully to stock_allocations!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
