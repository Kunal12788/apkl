import pkg from 'pg';
const { Client } = pkg;

async function enableRealtime() {
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
    console.log("Connected. Enabling realtime on branch_daily_reports...");
    await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE branch_daily_reports;`);
    console.log("Success");
  } catch (err) {
    console.log("Error or already exists:", err.message);
  } finally {
    await client.end();
  }
}

enableRealtime();
