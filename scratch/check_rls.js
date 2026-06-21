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
    console.log("Checking RLS policies on key tables...\n");

    // Check RLS enabled status
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('ledger_entries', 'transactions', 'tasks', 'stock_allocations', 'users', 'branches')
      ORDER BY tablename;
    `);
    console.log("RLS status:");
    rlsRes.rows.forEach(r => {
      console.log(`  ${r.tablename}: RLS = ${r.rowsecurity}`);
    });

    console.log("\nRLS Policies:");
    const policiesRes = await client.query(`
      SELECT tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('ledger_entries', 'transactions', 'tasks', 'stock_allocations', 'users', 'branches')
      ORDER BY tablename, policyname;
    `);
    if (policiesRes.rows.length === 0) {
      console.log("  No RLS policies found.");
    } else {
      policiesRes.rows.forEach(r => {
        console.log(`  ${r.tablename} | ${r.policyname} | ${r.cmd} | roles: ${r.roles}`);
      });
    }

    // Also test a direct insert to see if it works
    console.log("\nTesting direct INSERT into ledger_entries...");
    const testInsert = await client.query(`
      INSERT INTO public.ledger_entries 
        (id, date, iso_date, customer_name, transaction_type, status, staff_id)
      VALUES 
        ('TEST-001', 'Today', '2026-06-21', 'Test Customer', 'Exchange', 'Pending', 'test-staff-id')
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `);
    if (testInsert.rows.length > 0) {
      console.log("  INSERT succeeded! ID:", testInsert.rows[0].id);
      // Clean up
      await client.query(`DELETE FROM public.ledger_entries WHERE id = 'TEST-001';`);
      console.log("  Test row cleaned up.");
    } else {
      console.log("  INSERT was skipped (conflict) or no rows returned.");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
