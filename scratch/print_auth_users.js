import pkg from 'pg';
const { Client } = pkg;

async function printAuthUsers() {
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
    const res = await client.query('SELECT id, email, encrypted_password FROM auth.users');
    console.log("Auth Users in auth.users:");
    console.table(res.rows);
  } catch (err) {
    console.error("Error fetching auth users:", err);
  } finally {
    await client.end();
  }
}

printAuthUsers();
