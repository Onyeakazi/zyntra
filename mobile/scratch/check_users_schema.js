const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Checking users table...");
  const { data: users, error: usersErr } = await supabase.from('users').select('*').limit(1);
  if (usersErr) {
    console.error("Error reading users:", usersErr);
  } else {
    console.log("Users sample:", JSON.stringify(users, null, 2));
  }

  console.log("Checking connections table...");
  const { data: conn, error: connErr } = await supabase.from('connections').select('*').limit(1);
  if (connErr) {
    console.error("Error reading connections:", connErr);
  } else {
    console.log("Connections sample:", JSON.stringify(conn, null, 2));
  }
}

run();
