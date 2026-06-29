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
    console.log("Connected. Creating app_settings table...");

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.app_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
    `);
    console.log("app_settings table created.");

    // Enable RLS and setup policy
    await client.query(`
      ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow authenticated full access" ON public.app_settings;
      CREATE POLICY "Allow authenticated full access" ON public.app_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    `);
    console.log("RLS and policies set up for app_settings.");

    // Insert default customer behavior policy
    await client.query(`
      INSERT INTO public.app_settings (key, value)
      VALUES (
        'customer_behavior_policy',
        '{"excellent": 7, "good": 14, "fine": 30, "poor": 60}'::jsonb
      )
      ON CONFLICT (key) DO NOTHING;
    `);
    console.log("Default behavior policy seeded.");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
