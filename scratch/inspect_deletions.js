import pkg from 'pg';
const { Client } = pkg;

async function inspectDeletions() {
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
    
    // Check all deletion requests
    const delRes = await client.query(`SELECT * FROM deletion_requests ORDER BY created_at DESC LIMIT 10;`);
    console.log("=== LATEST 10 DELETION REQUESTS ===");
    console.table(delRes.rows);
    
    for (const req of delRes.rows) {
      const tableName = req.item_type === 'Transaction' ? 'transactions' : 'tasks';
      // Check if item still exists
      const itemRes = await client.query(`SELECT id FROM ${tableName} WHERE id = $1`, [req.item_id]);
      const exists = itemRes.rows.length > 0;
      console.log(`Req ID: ${req.id} | Type: ${req.item_type} | Item ID: ${req.item_id} | Status: ${req.status} | Item Exists: ${exists}`);
      
      if (exists && req.status === 'Approved') {
        console.log(`Attempting to delete item ${req.item_id} from ${tableName} to see error...`);
        try {
          const deleteRes = await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.item_id]);
          console.log("Delete success! Rows affected:", deleteRes.rowCount);
        } catch (err) {
          console.error("Delete failed with error:", err.message);
        }
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

inspectDeletions();
