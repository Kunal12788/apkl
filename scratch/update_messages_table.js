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
    console.log("Connected to PostgreSQL database.");

    // Add columns if they do not exist
    await client.query(`
      ALTER TABLE public.messages 
      ADD COLUMN IF NOT EXISTS file_url TEXT,
      ADD COLUMN IF NOT EXISTS file_name TEXT,
      ADD COLUMN IF NOT EXISTS file_type TEXT,
      ADD COLUMN IF NOT EXISTS duration NUMERIC;
    `);
    console.log("Added new columns to messages table.");

  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await client.end();
  }
}

runMigration();
