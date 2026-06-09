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
  // Query a non-existent table to trigger a PostgrestError
  console.log("Triggering error...");
  const { error } = await supabase
    .from("non_existent_table_xyz")
    .select("*");

  console.log("Error object exists:", !!error);
  console.log("typeof error:", typeof error);
  console.log("error.message:", error?.message);
  console.log("JSON.stringify(error):", JSON.stringify(error, null, 2));
}

run();
