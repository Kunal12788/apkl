import pkg from 'pg';
const { Client } = pkg;

async function runMigration() {
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
    
    // Add column if it doesn't exist
    await client.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS was_settlement_category BOOLEAN DEFAULT FALSE;
    `);
    console.log("Column was_settlement_category added successfully!");

    // Also let's update any existing tasks that are currently in Settlement status or have settlement condition Only Tunch
    const updateRes = await client.query(`
      UPDATE tasks 
      SET was_settlement_category = TRUE 
      WHERE status = 'Settlement' OR settlement_condition LIKE '%Only Tunch%';
    `);
    console.log(`Updated ${updateRes.rowCount} existing tasks.`);
  } catch (err) {
    console.log(err.message);
  } finally {
    await client.end();
  }
}

runMigration();
