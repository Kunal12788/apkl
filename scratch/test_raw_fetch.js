import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('app/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testRawFetch() {
  console.log("Supabase URL:", supabaseUrl);
  console.log("Supabase Key (first 15 chars):", supabaseKey ? supabaseKey.substring(0, 15) : "undefined");

  const endpoints = [
    { name: 'Root API Health', url: `${supabaseUrl}/rest/v1/` },
    { name: 'Users Table', url: `${supabaseUrl}/rest/v1/users?select=*` },
    { name: 'Auth Settings', url: `${supabaseUrl}/auth/v1/settings` }
  ];

  for (const ep of endpoints) {
    const start = Date.now();
    console.log(`\nFetching ${ep.name} from: ${ep.url}`);
    try {
      const res = await fetch(ep.url, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const elapsed = Date.now() - start;
      const text = await res.text();
      console.log(`Response status: ${res.status} ${res.statusText}`);
      console.log(`Time taken: ${elapsed}ms`);
      console.log(`Response preview: ${text.substring(0, 300)}`);
    } catch (err) {
      console.error(`Failed to fetch ${ep.name}:`, err);
    }
  }
}

testRawFetch();
