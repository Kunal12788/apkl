import pkg from 'pg';
const { Client } = pkg;

async function checkConstraints() {
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
    
    console.log("NOT NULL Columns in tasks:");
    let res = await client.query(`
      SELECT column_name, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND is_nullable = 'NO';
    `);
    console.table(res.rows);

    console.log("\nNOT NULL Columns in ledger_entries:");
    res = await client.query(`
      SELECT column_name, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ledger_entries' AND is_nullable = 'NO';
    `);
    console.table(res.rows);

    console.log("\nNOT NULL Columns in transactions:");
    res = await client.query(`
      SELECT column_name, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND is_nullable = 'NO';
    `);
    console.table(res.rows);

  } catch (err) {
    console.log(err.message);
  } finally {
    await client.end();
  }
}

checkConstraints();
