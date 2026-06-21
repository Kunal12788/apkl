import pkg from 'pg';
const { Client } = pkg;

async function run() {
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
