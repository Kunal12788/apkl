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
    console.log("Re-hiding old stock allocations...");

    // Set admin_submitted_at to now for old stock allocations to clear them from active screen
    const res = await client.query(`
      UPDATE public.stock_allocations 
      SET admin_submitted_at = NOW(), staff_submitted_at = NOW()
      WHERE iso_date <= '2026-06-21' AND admin_submitted_at IS NULL;
    `);
    console.log(`Updated ${res.rowCount} stock_allocations rows to be submitted.`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
