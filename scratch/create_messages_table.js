import pkg from 'pg';
const { Client } = pkg;

async function runMigration() {
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
    console.log("Connected to PostgreSQL database.");

    // 1. Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.messages (
          id TEXT PRIMARY KEY,
          sender_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
          receiver_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'chat',
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
    `);
    console.log("Created messages table.");

    // 2. Enable RLS
    await client.query(`
      ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    `);
    console.log("Enabled RLS.");

    // 3. Drop existing policies if any
    await client.query(`
      DROP POLICY IF EXISTS "Allow authenticated full access" ON public.messages;
    `);

    // 4. Create Policy
    await client.query(`
      CREATE POLICY "Allow authenticated full access" ON public.messages FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    `);
    console.log("Created policy.");

    // 5. Add to supabase_realtime publication
    try {
      await client.query(`
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
      `);
      console.log("Added messages to supabase_realtime publication.");
    } catch (pubErr) {
      console.log("Table might already be in publication or issue adding: ", pubErr.message);
    }

  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await client.end();
  }
}

runMigration();
