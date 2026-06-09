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
  console.log("Querying database view schema...");
  const { data, error } = await supabase.rpc('get_view_info', { view_name: 'home_feed' });

  // If RPC is not available, we can run a direct query to check columns
  const { data: cols, error: colError } = await supabase
    .from("home_feed")
    .select("*")
    .limit(1);

  if (colError) {
    console.error("Error querying view:", colError);
  } else {
    console.log("Columns returned from home_feed view:", Object.keys(cols[0] || {}));
    console.log("Sample row:", cols[0]);
  }
}

run();
