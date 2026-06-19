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
  console.log("=== USERS STATS IN DB ===");
  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("id, full_name, followers_count, following_count");
  if (uErr) console.error(uErr);
  else console.log(users);

  console.log("\n=== CONNECTIONS IN DB ===");
  const { data: conns, error: cErr } = await supabase
    .from("connections")
    .select("*");
  if (cErr) console.error(cErr);
  else console.log(conns);
}

run();
