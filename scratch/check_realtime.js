const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join('app', '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function alterTable() {
  const query = `
    -- Make sure customers table is in realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE customers;
    
    -- Make sure REPLICA IDENTITY FULL is set for old record to be available
    ALTER TABLE customers REPLICA IDENTITY FULL;
  `;
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
  if (error) {
     console.error('Error executing SQL:', error);
  } else {
     console.log('Successfully enabled realtime and REPLICA IDENTITY FULL for customers table.');
  }
}
alterTable();
