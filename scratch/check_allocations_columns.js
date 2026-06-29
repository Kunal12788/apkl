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
    
    const res = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stock_allocations';
    `);
    console.log(res.rows.map(r => r.column_name));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
