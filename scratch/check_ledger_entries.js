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
    console.log("Connected to Supabase DB. Checking all ledger entries...");
    
    const res = await client.query(`
      SELECT count(*) FROM public.ledger_entries;
    `);
    console.log("Total ledger entries:", res.rows[0].count);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
