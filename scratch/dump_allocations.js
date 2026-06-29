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
      SELECT id, pure_weight, admin_submitted_at, staff_submitted_at, iso_date 
      FROM public.stock_allocations;
    `);
    console.table(res.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
