import pkg from 'pg';
const { Client } = pkg;

async function checkAllTriggers() {
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
    const { rows } = await client.query(`
      SELECT 
        event_object_table AS table_name, 
        trigger_name, 
        event_manipulation AS event, 
        action_statement AS action
      FROM information_schema.triggers
      ORDER BY table_name, trigger_name;
    `);
    console.table(rows);
  } finally {
    await client.end();
  }
}
checkAllTriggers();
