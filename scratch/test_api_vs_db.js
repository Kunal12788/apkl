import pkg from 'pg';
const { Client } = pkg;
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('app/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testPerformance() {
  console.log("--- Starting REST vs Direct DB test ---");

  // 1. Test Supabase JS client (REST API)
  const supabase = createClient(supabaseUrl, supabaseKey);
  const startRest = Date.now();
  try {
    const { data, error } = await supabase.from('users').select('*');
    const elapsedRest = Date.now() - startRest;
    console.log(`REST API (supabase-js) took: ${elapsedRest}ms | Count: ${data?.length || 0} | Error: ${error?.message || 'None'}`);
  } catch (err) {
    console.error("REST API threw exception:", err);
  }

  // 2. Test Direct DB connection (Port 6543)
  const client = new Client({
    user: 'postgres.quqcfbairoevddjcxiyi',
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    database: 'postgres',
    password: 'MZZ+6GY4bznXSpj',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  });
  
  const startDb = Date.now();
  try {
    await client.connect();
    const connectTime = Date.now() - startDb;
    const queryStart = Date.now();
    const res = await client.query('SELECT * FROM public.users');
    const queryTime = Date.now() - queryStart;
    console.log(`Direct DB took: ${connectTime + queryTime}ms (Connect: ${connectTime}ms, Query: ${queryTime}ms) | Count: ${res.rows.length}`);
  } catch (err) {
    console.error("Direct DB threw exception:", err);
  } finally {
    await client.end();
  }
}

testPerformance();
