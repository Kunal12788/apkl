import pkg from 'pg';
const { Client } = pkg;

async function checkConstraints() {
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
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'stock_allocations';
    `);
    console.log(res.rows);
  } catch (err) {
    console.log(err.message);
  } finally {
    await client.end();
  }
}

checkConstraints();
