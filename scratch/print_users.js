import pkg from 'pg';
const { Client } = pkg;

async function printUsers() {
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
    const res = await client.query('SELECT id, email, name, role, branch_id FROM public.users');
    console.log("Registered Users in public.users:");
    console.table(res.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
  } finally {
    await client.end();
  }
}

printUsers();
