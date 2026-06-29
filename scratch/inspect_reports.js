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
    console.log("Checking branch_daily_reports...\n");

    const res = await client.query(`
      SELECT id, branch_name, iso_date, status, gold_used, silver_used, cash_received, cash_used, created_at
      FROM public.branch_daily_reports
      ORDER BY created_at DESC;
    `);
    
    if (res.rows.length === 0) {
      console.log("No reports found.");
    } else {
      res.rows.forEach(r => {
        console.log(`Report: ${r.id} | Branch: ${r.branch_name} | Date: ${r.iso_date} | Status: ${r.status}`);
        console.log(`  Gold used: ${r.gold_used}g | Silver used: ${r.silver_used}g | Cash recv: ${r.cash_received} | Cash used: ${r.cash_used}`);
        console.log('');
      });
    }

    console.log("\nChecking stock_allocations...\n");
    const allocRes = await client.query(`
      SELECT id, branch_name, branch_id, metal, pure_weight, cash_amount, iso_date, staff_submitted_at, admin_submitted_at
      FROM public.stock_allocations
      ORDER BY iso_date DESC;
    `);
    allocRes.rows.forEach(r => {
      console.log(`Alloc: ${r.id} | Branch: ${r.branch_name} | Metal: ${r.metal} | Weight: ${r.pure_weight}g | Cash: ${r.cash_amount} | Date: ${r.iso_date} | staff_sub: ${r.staff_submitted_at ? 'SET' : 'NULL'} | admin_sub: ${r.admin_submitted_at ? 'SET' : 'NULL'}`);
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
