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
    console.log("Connected to Supabase DB. Patching older ledger entries...");
    
    // Set admin_submitted_at to NOW() for all unapproved ledger entries that don't have it set
    const res = await client.query(`
      UPDATE public.ledger_entries 
      SET admin_submitted_at = NOW() 
      WHERE is_approved = false AND admin_submitted_at IS NULL;
    `);
    console.log(`Updated ${res.rowCount} ledger_entries rows to simulate admin submission.`);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
