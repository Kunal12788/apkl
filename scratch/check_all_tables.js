import pkg from 'pg';
const { Client } = pkg;

async function run() {
  const client = new Client({
    user: 'postgres.quqcfbairoevddjcxiyi',
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    database: 'postgres',
    password: 'MZZ+6GY4bznXSpj',
    port: 6543,
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
