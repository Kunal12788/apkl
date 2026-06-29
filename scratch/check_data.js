import pkg from 'pg';
const { Client } = pkg;

async function checkData() {
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
    const res = await client.query(`
      SELECT id, branch_id, metal, pure_weight, cash_amount, created_at 
      FROM stock_allocations 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);
    console.table(res.rows);
  } catch (err) {
    console.log(err.message);
  } finally {
    await client.end();
  }
}

checkData();
