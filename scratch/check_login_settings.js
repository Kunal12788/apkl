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
    console.log("Connected. Checking login_settings table...");

    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'login_settings';
    `);
    console.log("Columns:", cols.rows);

    const rows = await client.query(`SELECT * FROM public.login_settings;`);
    console.log("Rows:", rows.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
