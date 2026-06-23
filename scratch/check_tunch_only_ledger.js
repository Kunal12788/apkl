import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('app/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function checkAllLedger() {
  console.log("Checking all ledger entries...");
  const url = `${supabaseUrl}/rest/v1/ledger_entries?select=*`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const data = await res.json();
    console.log(`Found ${data.length} total ledger entries.`);
    data.forEach(e => {
      console.log(`ID: ${e.id} | Customer: ${e.customer_name} | Type: ${e.transaction_type} | status: ${e.status} | impure_gold_in: ${e.impure_gold_in} | impure_silver_in: ${e.impure_silver_in} | pure_gold_out: ${e.pure_gold_out} | pure_silver_out: ${e.pure_silver_out}`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

checkAllLedger();
