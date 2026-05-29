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
  console.log("Querying home_feed with filter...");
  const { data, error } = await supabase
    .from("home_feed")
    .select("*")
    .eq("viewer_id", "yMW6kCQCIGVu5oBJERVuqYgdRM02");

  if (error) {
    console.error("❌ SQL Query Error details:", error);
  } else {
    console.log("✅ Success! Feed items returned:", data.length);
    console.log("Sample:", JSON.stringify(data, null, 2));
  }
}

run();
