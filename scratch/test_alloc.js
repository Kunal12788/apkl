import pkg from 'pg';
const { Client } = pkg;

async function testInsert() {
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
      INSERT INTO stock_allocations (id, branch_id, branch_name, metal, pure_weight, cash_amount, allocated_by, date, iso_date)
      VALUES ('ALLOC-TEST-1', 'a3fa8cbc-25f8-4af6-bd86-66e8ae1da904', 'Test Branch', 'Gold', 0, 100, 'SUPER-001', 'Today', '2026-06-07')
      RETURNING *;
    `);
    console.log("Inserted successfully:", res.rows[0]);
    
    // Delete test row
    await client.query(`DELETE FROM stock_allocations WHERE id = 'ALLOC-TEST-1'`);
  } catch (err) {
    console.log("Error inserting:", err.message);
  } finally {
    await client.end();
  }
}

testInsert();
