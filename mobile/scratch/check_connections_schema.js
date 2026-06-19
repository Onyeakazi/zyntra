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
  console.log("Checking columns of 'connections' table...");
  const { data: connData, error: connError } = await supabase.from("connections").select("*").limit(1);
  if (connError) {
    console.error("Error fetching connections:", connError);
  } else {
    console.log("connections table keys:", Object.keys(connData[0] || {}));
    console.log("connections row sample:", connData[0]);
  }

  console.log("\nChecking columns of 'users' table...");
  const { data: userData, error: userError } = await supabase.from("users").select("*").limit(1);
  if (userError) {
    console.error("Error fetching users:", userError);
  } else {
    console.log("users table keys:", Object.keys(userData[0] || {}));
    console.log("users row sample:", userData[0]);
  }
}

run();
