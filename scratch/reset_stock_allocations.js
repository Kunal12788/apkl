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
    console.log("Connected. Resetting admin_submitted_at on stock_allocations so data is visible again...");

    // Reset admin_submitted_at so the stock allocations are visible to branch users again
    const res = await client.query(`
      UPDATE public.stock_allocations 
      SET admin_submitted_at = NULL
      WHERE admin_submitted_at IS NOT NULL;
    `);
    console.log(`Updated ${res.rowCount} stock_allocations rows - admin_submitted_at reset to NULL.`);

    console.log("\nDone! Stock allocations should now be visible in the branch dashboards and ledger.");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
