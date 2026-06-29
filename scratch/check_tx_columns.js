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
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'transactions';
    `);
    console.log("Columns of transactions table:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
