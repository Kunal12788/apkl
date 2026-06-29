import pkg from 'pg';
const { Client } = pkg;

async function checkAllTriggers() {
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
