import pkg from 'pg';
const { Client } = pkg;

async function checkSchema() {
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
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tasks';
    `);
    console.log(res.rows);
  } catch (err) {
    console.log(err.message);
  } finally {
    await client.end();
  }
}

checkSchema();
