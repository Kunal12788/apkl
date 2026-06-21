import pkg from 'pg';
const { Client } = pkg;

async function run() {
  const host = 'aws-1-ap-south-1.pooler.supabase.com';
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
