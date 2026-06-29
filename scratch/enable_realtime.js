import pkg from 'pg';
const { Client } = pkg;

async function enableRealtime() {
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
    console.log("Connected. Enabling realtime on tables...");

    // Check if publication exists, though supabase_realtime always exists on Supabase.
    // Try to add the tables. 
    // Ignore errors if they are already in the publication.
    
    const queries = [
      `ALTER PUBLICATION supabase_realtime ADD TABLE stock_allocations;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE ledger_entries;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE super_admin_ledger;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE refining_transfers;`
    ];

    for (const q of queries) {
      try {
        await client.query(q);
        console.log(`Success: ${q}`);
      } catch (err) {
        console.log(`Error or already exists for: ${q} -> ${err.message}`);
      }
    }

  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    await client.end();
  }
}

enableRealtime();
