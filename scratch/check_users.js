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
    console.log("Checking users table...\n");

    const res = await client.query(`
      SELECT id, name, email, role, branch_id
      FROM public.users
      ORDER BY role, name;
    `);
    
    if (res.rows.length === 0) {
      console.log("No users found.");
    } else {
      res.rows.forEach(r => {
        console.log(`ID: ${r.id} | Name: ${r.name} | Role: ${r.role} | Branch: ${r.branch_id}`);
      });
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
