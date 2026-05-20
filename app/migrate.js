import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const host = 'aws-1-ap-south-1.pooler.supabase.com';
  console.log(`Connecting to Supabase Database pooler at ${host}...`);

  const client = new Client({
    user: 'postgres.quqcfbairoevddjcxiyi',
    host: host,
    database: 'postgres',
    password: 'MZZ+6GY4bznXSpj',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to Supabase Database!");

    const sqlPath = path.join(__dirname, 'supabase-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing schema migration script...");
    await client.query(sql);
    console.log("Schema migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
