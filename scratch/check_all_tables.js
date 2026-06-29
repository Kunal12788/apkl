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
    console.log("Connected. Checking all core tables...");

    const tables = [
      'ledger_entries',
      'transactions',
      'tasks',
      'stock_allocations',
      'users',
      'branches',
      'super_admin_ledger',
      'branch_daily_reports',
      'refining_transfers'
    ];

    for (const table of tables) {
      try {
        const res = await client.query(`SELECT count(*) FROM public.${table};`);
        console.log(` ${table}: ${res.rows[0].count} rows`);
      } catch (e) {
        console.log(` ${table}: ERROR - ${e.message}`);
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
