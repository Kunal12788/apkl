import pkg from 'pg';
const { Client } = pkg;

async function checkPolicies() {
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
      SELECT 
        tablename, 
        policyname, 
        cmd, 
        qual, 
        with_check 
      FROM 
        pg_policies
      WHERE 
        schemaname = 'public';
    `);
    
    console.table(res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

checkPolicies();
