import pkg from 'pg';
const { Client } = pkg;

async function profileRLS() {
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
    console.log("Connected to Supabase DB. Setting up authenticated context...");

    // 1. Simulate authentication context in PG session
    await client.query("SET ROLE authenticated;");
    await client.query(`SELECT set_config('request.jwt.claims', '{"role": "authenticated", "email": "ssrcreations41@gmail.com", "sub": "7a358bc1-53df-4993-8472-88fcfb297b8f"}', true);`);

    console.log("\n--- Profiling SELECT * FROM users ---");
    const resUsers = await client.query("EXPLAIN ANALYZE SELECT * FROM public.users;");
    resUsers.rows.forEach(r => console.log(r['QUERY PLAN']));

    console.log("\n--- Profiling SELECT * FROM transactions ---");
    const resTx = await client.query("EXPLAIN ANALYZE SELECT * FROM public.transactions;");
    resTx.rows.forEach(r => console.log(r['QUERY PLAN']));

    console.log("\n--- Profiling SELECT * FROM ledger_entries ---");
    const resLedger = await client.query("EXPLAIN ANALYZE SELECT * FROM public.ledger_entries;");
    resLedger.rows.forEach(r => console.log(r['QUERY PLAN']));

  } catch (err) {
    console.error("Profiling failed:", err);
  } finally {
    await client.end();
  }
}

profileRLS();
