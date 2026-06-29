import pkg from 'pg';
const { Client } = pkg;

async function checkFunction() {
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
      SELECT 
        routine_name, 
        routine_type, 
        data_type, 
        routine_definition 
      FROM 
        information_schema.routines 
      WHERE 
        routine_schema = 'public' AND routine_name = 'get_my_role';
    `);
    
    if (res.rows.length === 0) {
      console.log("Function get_my_role not found.");
    } else {
      console.log("Function Definition:");
      console.log(res.rows[0].routine_definition);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

checkFunction();
