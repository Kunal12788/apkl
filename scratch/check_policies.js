import pkg from 'pg';
const { Client } = pkg;

async function checkPolicies() {
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
    const res = await client.query(`
      SELECT polname, polcmd, polqual, polwithcheck 
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      WHERE c.relname = 'stock_allocations';
    `);
    console.log(res.rows);
  } catch (err) {
    console.log(err.message);
  } finally {
    await client.end();
  }
}

checkPolicies();
