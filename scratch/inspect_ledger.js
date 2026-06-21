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
    console.log("Connected. Inspecting ledger_entries schema...");

    // First check column names
    const schemaRes = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ledger_entries'
      ORDER BY ordinal_position;
    `);
    console.log("\nColumns in ledger_entries:");
    schemaRes.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

    // Then count all entries
    const countRes = await client.query(`SELECT count(*) FROM public.ledger_entries;`);
    console.log(`\nTotal entries in ledger_entries: ${countRes.rows[0].count}`);

    // And check by approval status
    const approvalRes = await client.query(`
      SELECT 
        is_approved, 
        CASE WHEN admin_submitted_at IS NULL THEN 'NULL' ELSE 'SET' END as admin_sub_status,
        CASE WHEN staff_submitted_at IS NULL THEN 'NULL' ELSE 'SET' END as staff_sub_status,
        count(*)
      FROM public.ledger_entries
      GROUP BY is_approved, admin_sub_status, staff_sub_status;
    `);
    console.log("\nEntry breakdown:");
    approvalRes.rows.forEach(r => console.log(` is_approved=${r.is_approved} | admin_submitted=${r.admin_sub_status} | staff_submitted=${r.staff_sub_status} | count=${r.count}`));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
